import express from 'express';
import multer from 'multer';
import cors from 'cors';
import fs from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const UPLOADS_DIR = process.env.CONCEPT_UPLOADS_DIR || path.join(__dirname, 'public', 'uploads');
const DATA_DIR = process.env.CONCEPT_DATA_DIR || path.join(__dirname, 'data');
const BACKGROUNDS_DIR = process.env.CONCEPT_BACKGROUNDS_DIR || path.join(__dirname, 'public', 'backgrounds');
const PORTRAITS_DIR = process.env.CONCEPT_PORTRAITS_DIR || path.join(__dirname, 'public', 'portraits');
const ARTWORKS_FILE = path.join(DATA_DIR, 'artworks.json');
const CATEGORIES_FILE = path.join(DATA_DIR, 'categories.json');

let storageError = null;

const DEFAULT_CATEGORIES = {
    race: ['Human', 'Orc', 'Elf', 'Undead', 'Construct', 'Elemental'],
    gender: ['Male', 'Female', 'Other'],
    faction: ['Monarchy', 'Clan', 'Folk', 'Elementals', 'Constructs', 'Dark Magic Followers - artisans'],
    combatType: ['melee', 'ranged', 'magic', 'support'],
    baseMesh: ['human', 'thin human', 'mid human', 'stocky', 'great ape', 'mono boned'],
    element: ['fire', 'water', 'earth', 'Celestial', 'arcane', 'dark magic'],
    unitType: ['vanguards', 'Elites', 'Imperials', 'workers', 'Heroes'],
    rarity: ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythic'],
    animationType: ['stun animations', 'death animations', 'run', 'idle', 'level up abilities', 'melee abilities', 'ranged abilities', 'magic abilities'],
    abilityTags: ['sword', 'axe', 'slash', 'impact', 'projectile'],
    vfxType: ['Explosion', 'Aura', 'Projectile', 'Impact', 'Trail'],
    sfxType: ['explosions', 'status', 'charge', 'projectiles', 'on hit']
};

async function initData() {
    try {
        if (!existsSync(UPLOADS_DIR)) mkdirSync(UPLOADS_DIR, { recursive: true });
        if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

        if (!existsSync(ARTWORKS_FILE)) await fs.writeFile(ARTWORKS_FILE, JSON.stringify([]));
        if (!existsSync(CATEGORIES_FILE)) await fs.writeFile(CATEGORIES_FILE, JSON.stringify(DEFAULT_CATEGORIES, null, 2));
    } catch (err) {
        throw new Error(`Failed to initialize data files: ${err.message}`);
    }
}

async function checkStorage() {
    try {
        await initData();
        
        if (storageError) console.log('Storage connection restored.');
        storageError = null;
        return true;
    } catch (err) {
        storageError = `Unable to connect to Egnyte. Please start the Egnyte desktop app.`;
        return false;
    }
}

// Initial check
await checkStorage();

app.use('/uploads', express.static(UPLOADS_DIR));
app.use('/backgrounds', express.static(BACKGROUNDS_DIR));
app.use('/portraits', express.static(PORTRAITS_DIR));

// Setup Multer for handling file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = file.originalname.includes('.') ? path.extname(file.originalname) : (file.mimetype.includes('video') ? '.webm' : '.png');
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});
const upload = multer({ storage });

// Mutex to prevent concurrent writes/reads to artworks.json
let artworkLock = Promise.resolve();
async function withArtworkLock(fn) {
    const nextLock = artworkLock.then(async () => {
        try {
            return await fn();
        } catch (e) {
            console.error('Lock execution error:', e);
            throw e;
        }
    });
    artworkLock = nextLock.catch(() => {}); // Continue queue even on error
    return nextLock;
}

// Helper functions
async function getArtworks() {
    const data = await fs.readFile(ARTWORKS_FILE, 'utf-8');
    if (!data || data.trim() === '') return [];
    try {
        return JSON.parse(data);
    } catch (e) {
        console.error('JSON Parse Error in getArtworks:', e);
        return [];
    }
}
async function saveArtworks(artworks) {
    await fs.writeFile(ARTWORKS_FILE, JSON.stringify(artworks, null, 2));
}
async function getCategories() {
    const data = await fs.readFile(CATEGORIES_FILE, 'utf-8');
    if (!data || data.trim() === '') return DEFAULT_CATEGORIES;
    try {
        return JSON.parse(data);
    } catch (e) {
        console.error('JSON Parse Error in getCategories:', e);
        return DEFAULT_CATEGORIES;
    }
}
async function saveCategories(categories) {
    await fs.writeFile(CATEGORIES_FILE, JSON.stringify(categories, null, 2));
}

// Routes
app.get('/api/health', async (req, res) => {
    // Re-check storage status on every health check request
    await checkStorage();
    res.json({ 
        status: storageError ? 'error' : 'ok', 
        message: storageError,
        uploadsDir: UPLOADS_DIR,
        dataDir: DATA_DIR
    });
});

app.get('/api/artworks', async (req, res) => {
    if (storageError && !(await checkStorage())) return res.status(503).json({ error: storageError });
    res.json(await withArtworkLock(() => getArtworks()));
});

app.post('/api/artworks', upload.fields([{ name: 'original', maxCount: 1 }, { name: 'compressed', maxCount: 1 }]), async (req, res) => {
    try {
        if (storageError && !(await checkStorage())) return res.status(503).json({ error: storageError });
        
        const result = await withArtworkLock(async () => {
            const artworks = await getArtworks();
            const artData = JSON.parse(req.body.data);

            const newArt = {
                ...artData,
                originalUrl: req.files['original'] ? `/uploads/${req.files['original'][0].filename}` : null,
                compressedUrl: req.files['compressed'] ? `/uploads/${req.files['compressed'][0].filename}` : null,
            };

            artworks.push(newArt);
            await saveArtworks(artworks);
            return { id: newArt.id, success: true };
        });
        
        res.json(result);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to upload artwork' });
    }
});

app.put('/api/artworks/:id', async (req, res) => {
    try {
        if (storageError && !(await checkStorage())) return res.status(503).json({ error: storageError });
        
        const result = await withArtworkLock(async () => {
            const artworks = await getArtworks();
            const index = artworks.findIndex(a => a.id === req.params.id);
            if (index !== -1) {
                artworks[index] = { ...artworks[index], ...req.body };
                await saveArtworks(artworks);
                return artworks[index];
            }
            return null;
        });

        if (result) {
            res.json(result);
        } else {
            res.status(404).json({ error: 'Not found' });
        }
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to update artwork' });
    }
});

app.delete('/api/artworks/:id', async (req, res) => {
    try {
        if (storageError && !(await checkStorage())) return res.status(503).json({ error: storageError });
        
        await withArtworkLock(async () => {
            let artworks = await getArtworks();
            const index = artworks.findIndex(a => a.id === req.params.id);
            if (index !== -1) {
                const art = artworks[index];
                // Remove files
                if (art.originalUrl && art.originalUrl.startsWith('/uploads/')) {
                    const filename = path.basename(art.originalUrl);
                    const file = path.join(UPLOADS_DIR, filename);
                    if (existsSync(file)) await fs.unlink(file);
                }
                if (art.compressedUrl && art.compressedUrl.startsWith('/uploads/')) {
                    const filename = path.basename(art.compressedUrl);
                    const file = path.join(UPLOADS_DIR, filename);
                    if (existsSync(file)) await fs.unlink(file);
                }
                artworks.splice(index, 1);
                await saveArtworks(artworks);
            }
        });
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to delete artwork' });
    }
});


// Mutex for categories
let categoryLock = Promise.resolve();
async function withCategoryLock(fn) {
    const nextLock = categoryLock.then(async () => {
        try {
            return await fn();
        } catch (e) {
            console.error('Category lock execution error:', e);
            throw e;
        }
    });
    categoryLock = nextLock.catch(() => {});
    return nextLock;
}

app.get('/api/categories', async (req, res) => {
    if (storageError && !(await checkStorage())) return res.status(503).json({ error: storageError });
    res.json(await withCategoryLock(() => getCategories()));
});

app.put('/api/categories', async (req, res) => {
    if (storageError && !(await checkStorage())) return res.status(503).json({ error: storageError });
    await withCategoryLock(() => saveCategories(req.body));
    res.json({ success: true });
});

app.post('/api/artworks/:id/optimize', upload.fields([{ name: 'compressed', maxCount: 1 }]), async (req, res) => {
    // Allows sending the compressed version later as an update
    try {
        if (storageError && !(await checkStorage())) return res.status(503).json({ error: storageError });
        
        const result = await withArtworkLock(async () => {
            const artworks = await getArtworks();
            const index = artworks.findIndex(a => a.id === req.params.id);
            if (index !== -1 && req.files['compressed']) {
                artworks[index].compressedUrl = `/uploads/${req.files['compressed'][0].filename}`;
                await saveArtworks(artworks);
                return artworks[index];
            }
            return null;
        });

        if (result) {
            res.json(result);
        } else {
            res.status(404).json({ error: 'Not found or missing file' });
        }
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to optimize artwork' });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
});
