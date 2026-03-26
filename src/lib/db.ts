export type AssetType = 'concept-art' | 'animation' | 'vfx' | 'ability-icons' | 'references';

export interface ConceptArt {
    id: string;
    name: string;
    originalUrl: string;
    compressedUrl?: string;
    type: AssetType;
    tags: {
        race?: string;
        gender?: string;
        faction?: string;
        combatType?: string;
        baseMesh?: string;
        element?: string;
        unitType?: string;
        rarity?: string;
        animationType?: string;
        abilityTags?: string;
        abilityAction?: string;
        vfxType?: string[];
        characterName?: string;
    };
    createdAt: number;

    // For backwards compatibility in upload/updates
    blob?: Blob;
    compressedBlob?: Blob;
}

export interface CategoryDefinition {
    race: string[];
    gender: string[];
    faction: string[];
    combatType: string[];
    baseMesh: string[];
    element: string[];
    unitType: string[];
    rarity: string[];
    animationType: string[];
    abilityTags: string[];
    abilityAction: string[];
    vfxType: string[];
    characterName: string[];
}

const API_BASE = '/api';

export async function getTags(): Promise<CategoryDefinition> {
    const res = await fetch(`${API_BASE}/categories`);
    if (!res.ok) throw new Error('Failed to fetch categories');
    return res.json();
}

export async function addTagToCategory(category: keyof CategoryDefinition, newTag: string): Promise<CategoryDefinition> {
    const tags = await getTags();
    if (!tags[category]) tags[category] = [];
    if (!tags[category].includes(newTag)) {
        tags[category].push(newTag);
        await fetch(`${API_BASE}/categories`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(tags)
        });
    }
    return tags;
}

export async function renameCategoryTag(category: keyof CategoryDefinition, oldTag: string, newTag: string): Promise<CategoryDefinition> {
    const tags = await getTags();
    if (!tags[category]) tags[category] = [];
    const index = tags[category].indexOf(oldTag);
    if (index !== -1) {
        if (newTag) tags[category][index] = newTag;
        else tags[category].splice(index, 1);

        await fetch(`${API_BASE}/categories`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(tags)
        });

        // Update all artworks sequentially to simplify
        const artworks = await getAllArtworks();
        for (const art of artworks) {
            const artTagValue = art.tags[category as keyof typeof art.tags];
            // Handle array-valued tags (e.g. vfxType)
            if (Array.isArray(artTagValue)) {
                if (artTagValue.includes(oldTag)) {
                    const newTags = { ...art.tags };
                    const newArr = newTag
                        ? artTagValue.map((v: string) => v === oldTag ? newTag : v)
                        : artTagValue.filter((v: string) => v !== oldTag);
                    if (newArr.length > 0) (newTags as any)[category] = newArr;
                    else delete (newTags as any)[category];
                    await updateArtwork(art.id, { tags: newTags });
                }
            } else {
                if (artTagValue === oldTag) {
                    const newTags = { ...art.tags };
                    if (newTag) (newTags as any)[category] = newTag;
                    else delete (newTags as any)[category];
                    await updateArtwork(art.id, { tags: newTags });
                }
            }
        }
    }
    return tags;
}

export async function addArtwork(art: any): Promise<string> {
    const formData = new FormData();
    const { blob, compressedBlob, ...artData } = art;

    artData.createdAt = Date.now();
    artData.id = crypto.randomUUID();

    formData.append('data', JSON.stringify(artData));
    if (blob) formData.append('original', blob);
    if (compressedBlob) formData.append('compressed', compressedBlob);

    const res = await fetch(`${API_BASE}/artworks`, { method: 'POST', body: formData });
    if (!res.ok) throw new Error('Failed to upload artwork');
    const data = await res.json();
    return data.id;
}

export async function updateArtwork(id: string, updates: Partial<ConceptArt>): Promise<void> {
    if (updates.compressedBlob) {
        const formData = new FormData();
        formData.append('compressed', updates.compressedBlob);
        const { compressedBlob, ...otherUpdates } = updates;

        const optRes = await fetch(`${API_BASE}/artworks/${id}/optimize`, { method: 'POST', body: formData });
        if (!optRes.ok) throw new Error('Failed to upload optimized video');

        if (Object.keys(otherUpdates).length > 0) {
            const res = await fetch(`${API_BASE}/artworks/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(otherUpdates),
            });
            if (!res.ok) throw new Error('Update failed');
        }
        return;
    }

    const res = await fetch(`${API_BASE}/artworks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Update failed');
}

export async function getAllArtworks(): Promise<ConceptArt[]> {
    const res = await fetch(`${API_BASE}/artworks`);
    if (!res.ok) throw new Error('Failed to fetch artworks');
    return res.json();
}

export async function deleteArtwork(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/artworks/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete artwork');
}
