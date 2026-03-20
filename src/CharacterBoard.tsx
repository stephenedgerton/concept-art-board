import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiUsers, FiFilter, FiSearch, FiRefreshCw, FiChevronDown, FiX, 
  FiHexagon, FiZap, FiTarget, FiBox, FiStar, FiHome, FiLayers, FiImage, FiVideo, FiPlay, FiMaximize2, FiShield, FiActivity, FiArrowUp, FiArrowDown
} from 'react-icons/fi';
import { getAllArtworks } from './lib/db';
import type { ConceptArt } from './lib/db';
import './LandingPage.css';

interface Character {
  name: string;
  faction: string;
  gender: string;
  race: string;
  elements: string[];
  type: string;
  subtype: string;
  visualPillar: string;
  baseMesh: string;
  rarity: string;
}

interface FilterState {
  type: string[];
  faction: string[];
  race: string[];
  gender: string[];
  visualPillar: string[];
  baseMesh: string[];
  rarity: string[];
  elements: string[];
}

type SortOption = 'name-asc' | 'name-desc' | 'rarity-desc' | 'faction-asc';

interface CharacterBoardProps {
  onBackToLanding: () => void;
}

const RARITY_ORDER: Record<string, number> = {
  'mythic': 6,
  'legendary': 5,
  'epic': 4,
  'rare': 3,
  'uncommon': 2,
  'common': 1
};

// -------------------------------------------------------------------------------- //
// Main Component
// -------------------------------------------------------------------------------- //
export default function CharacterBoard({ onBackToLanding }: CharacterBoardProps) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [allAssets, setAllAssets] = useState<ConceptArt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('name-asc');
  
  const [filters, setFilters] = useState<FilterState>({
    type: [], faction: [], race: [], gender: [],
    visualPillar: [], baseMesh: [], rarity: [], elements: []
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [csvResponse, assets] = await Promise.all([
        fetch('/data/characters.csv'),
        getAllArtworks()
      ]);

      if (!csvResponse.ok) throw new Error("Failed to load character data.");
      
      const text = await csvResponse.text();
      const rows = text.split('\n').filter(r => r.trim()).map(row => row.split(',').map(cell => cell.trim()));
      
      if (rows.length < 2) {
        setCharacters([]);
      } else {
        const headers = rows[0].map(h => h.toLowerCase());
        const findIdx = (names: string[]) => headers.findIndex(h => names.includes(h));
        const idx = {
          name: findIdx(['name']), type: findIdx(['type']),
          subtype: findIdx(['unit type', 'subtype', 'unit-type']),
          visualPillar: findIdx(['visual pillar', 'visual-pillar', 'pillar']),
          baseMesh: findIdx(['base mesh', 'base-mesh', 'mesh']),
          rarity: findIdx(['rarity']), faction: findIdx(['faction']),
          race: findIdx(['race']), gender: findIdx(['gender']),
          elements: findIdx(['elements', 'element types', 'element'])
        };
        
        const data: Character[] = rows.slice(1).map(row => {
          const getVal = (i: number) => (i !== -1 && row[i]) ? row[i] : '';
          const type = getVal(idx.type);
          return {
            name: getVal(idx.name),
            type,
            subtype: getVal(idx.subtype) || (type === 'Hero' ? 'Hero' : ''),
            visualPillar: getVal(idx.visualPillar),
            baseMesh: getVal(idx.baseMesh),
            rarity: getVal(idx.rarity),
            faction: getVal(idx.faction),
            race: getVal(idx.race),
            gender: getVal(idx.gender),
            elements: idx.elements !== -1 && row[idx.elements] ? row[idx.elements].split('|').map(e => e.trim()).filter(Boolean) : []
          };
        });
        setCharacters(data);
      }
      setAllAssets(assets);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred while fetching data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const uniqueValues = useMemo(() => {
    const vals = {
      type: new Set<string>(), faction: new Set<string>(),
      race: new Set<string>(), gender: new Set<string>(),
      visualPillar: new Set<string>(), baseMesh: new Set<string>(),
      rarity: new Set<string>(), elements: new Set<string>()
    };
    characters.forEach(char => {
      if (char.type) vals.type.add(char.type);
      if (char.faction) vals.faction.add(char.faction);
      if (char.race) vals.race.add(char.race);
      if (char.gender) vals.gender.add(char.gender);
      if (char.visualPillar) vals.visualPillar.add(char.visualPillar);
      if (char.baseMesh) vals.baseMesh.add(char.baseMesh);
      if (char.rarity) vals.rarity.add(char.rarity);
      char.elements.forEach(el => vals.elements.add(el));
    });
    return {
      type: Array.from(vals.type).filter(Boolean).sort(),
      faction: Array.from(vals.faction).filter(Boolean).sort(),
      race: Array.from(vals.race).filter(Boolean).sort(),
      gender: Array.from(vals.gender).filter(Boolean).sort(),
      visualPillar: Array.from(vals.visualPillar).filter(Boolean).sort(),
      baseMesh: Array.from(vals.baseMesh).filter(Boolean).sort(),
      rarity: Array.from(vals.rarity).filter(Boolean).sort(),
      elements: Array.from(vals.elements).filter(Boolean).sort()
    };
  }, [characters]);

  const filteredCharacters = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const filtered = characters.filter(char => {
      if (q && !char.name.toLowerCase().includes(q) && 
          !char.faction.toLowerCase().includes(q) && 
          !char.subtype.toLowerCase().includes(q)) return false;
      
      if (filters.type.length > 0 && !filters.type.includes(char.type)) return false;
      if (filters.faction.length > 0 && !filters.faction.includes(char.faction)) return false;
      if (filters.race.length > 0 && !filters.race.includes(char.race)) return false;
      if (filters.gender.length > 0 && !filters.gender.includes(char.gender)) return false;
      if (filters.visualPillar.length > 0 && !filters.visualPillar.includes(char.visualPillar)) return false;
      if (filters.baseMesh.length > 0 && !filters.baseMesh.includes(char.baseMesh)) return false;
      if (filters.rarity.length > 0 && !filters.rarity.includes(char.rarity)) return false;
      if (filters.elements.length > 0 && !char.elements.some(el => filters.elements.includes(el))) return false;

      return true;
    });

    return filtered.sort((a, b) => {
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
      if (sortBy === 'name-desc') return b.name.localeCompare(a.name);
      if (sortBy === 'rarity-desc') {
        const valA = RARITY_ORDER[a.rarity.toLowerCase()] || 0;
        const valB = RARITY_ORDER[b.rarity.toLowerCase()] || 0;
        if (valA !== valB) return valB - valA;
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'faction-asc') {
        const facComp = a.faction.localeCompare(b.faction);
        if (facComp !== 0) return facComp;
        return a.name.localeCompare(b.name);
      }
      return 0;
    });
  }, [characters, searchQuery, filters, sortBy]);

  // Aggregate stats for the dashboard header
  const analytics = useMemo(() => {
    const stats = {
      factions: {} as Record<string, number>,
      subtypes: {} as Record<string, number>,
      rarities: {} as Record<string, number>,
      elements: {} as Record<string, number>
    };

    filteredCharacters.forEach(c => {
      stats.factions[c.faction] = (stats.factions[c.faction] || 0) + 1;
      stats.subtypes[c.subtype] = (stats.subtypes[c.subtype] || 0) + 1;
      stats.rarities[c.rarity] = (stats.rarities[c.rarity] || 0) + 1;
      c.elements.forEach(el => {
        stats.elements[el] = (stats.elements[el] || 0) + 1;
      });
    });

    return stats;
  }, [filteredCharacters]);

  return (
    <div className="roster-page-container">
      <aside className="sidebar">
        <div className="brand-container">
          <div className="brand"><FiLayers /> RosterVault</div>
          <button className="back-home-btn" onClick={onBackToLanding} title="Back to Landing"><FiHome size={18} /></button>
        </div>

        <div className="sidebar-stats-mini">
          <div className="mini-stat">
            <span className="val">{filteredCharacters.length}</span>
            <span className="lbl">Filtered</span>
          </div>
          <div className="mini-stat">
            <span className="val">{filteredCharacters.filter(c => c.type === 'Hero').length}</span>
            <span className="lbl">Heroes</span>
          </div>
        </div>

        <div className="filter-section scroll-area">
          {Object.entries(uniqueValues).map(([cat, options]) => (
            <div key={cat} className="filter-group">
              <div className="filter-group-header">
                <h3>{cat.replace(/([A-Z])/g, ' $1').trim()}</h3>
                {filters[cat as keyof FilterState].length > 0 && (
                  <button onClick={() => setFilters(f => ({ ...f, [cat]: [] }))} className="clear-cat-btn"><FiX size={12} /></button>
                )}
              </div>
              <div className="filter-options">
                {options.map(opt => (
                  <label key={opt} className={`filter-option ${filters[cat as keyof FilterState].includes(opt) ? 'active' : ''}`}>
                    <input type="checkbox" checked={filters[cat as keyof FilterState].includes(opt)} onChange={() => setFilters(prev => {
                      const current = prev[cat as keyof FilterState];
                      const next = current.includes(opt) ? current.filter(v => v !== opt) : [...current, opt];
                      return { ...prev, [cat]: next };
                    })} />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        {Object.values(filters).some(f => f.length > 0) && (
          <button className="sidebar-clear-btn" onClick={() => setFilters({ type: [], faction: [], race: [], gender: [], visualPillar: [], baseMesh: [], rarity: [], elements: [] })}>
            Clear All Filters
          </button>
        )}
      </aside>

      <main className="main-content">
        <header className="header">
          <div className="search-bar">
            <FiSearch className="search-icon" />
            <input type="text" placeholder="Search by name, faction, or role..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          
          <div className="header-actions" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as SortOption)}
              className="form-control"
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', width: 'auto', backgroundColor: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', outline: 'none', cursor: 'pointer' }}
            >
              <option value="name-asc" style={{ background: '#111' }}>Name (A-Z)</option>
              <option value="name-desc" style={{ background: '#111' }}>Name (Z-A)</option>
              <option value="rarity-desc" style={{ background: '#111' }}>Rarity (High-Low)</option>
              <option value="faction-asc" style={{ background: '#111' }}>Faction (A-Z)</option>
            </select>
            <button className="refresh-btn-header" onClick={loadData} disabled={loading}><FiRefreshCw className={loading ? "spin" : ""} /></button>
          </div>
        </header>

        <section className="dashboard-analytics-bar">
          <AnalyticsGroup title="Subtypes" data={analytics.subtypes} icon={<FiShield />} />
          <AnalyticsGroup title="Factions" data={analytics.factions} icon={<FiActivity />} />
          <AnalyticsGroup title="Rarity" data={analytics.rarities} icon={<FiStar />} />
          <AnalyticsGroup title="Elements" data={analytics.elements} icon={<FiZap />} />
        </section>

        <section className="gallery-container">
          {loading ? (
            <div className="empty-state"><div className="spinner" /><p>Scanning data repositories...</p></div>
          ) : error ? (
            <div className="empty-state error"><FiX size={48} /><h2>Connection Error</h2><p>{error}</p><button className="btn-primary" onClick={loadData}>Retry</button></div>
          ) : (
            <div className="roster-grid">
              {filteredCharacters.map((char, i) => (
                <RosterCard 
                  key={`${char.name}-${i}`}
                  char={char}
                  onClick={() => setSelectedCharacter(char)}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      <AnimatePresence>
        {selectedCharacter && (
          <CharacterDetailModal 
            character={selectedCharacter}
            assets={allAssets.filter(a => {
              const charName = selectedCharacter.name.toLowerCase();
              const charNameNoSpaces = charName.replace(/\s+/g, '');
              const charNameUnderscores = charName.replace(/\s+/g, '_');
              const fileName = a.name.toLowerCase();
              
              return a.tags.characterName === selectedCharacter.name || 
                     fileName.includes(charName) ||
                     fileName.includes(charNameNoSpaces) ||
                     fileName.includes(charNameUnderscores);
            })}
            onClose={() => setSelectedCharacter(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// -------------------------------------------------------------------------------- //
// Analytics Group Component
// -------------------------------------------------------------------------------- //
function AnalyticsGroup({ title, data, icon }: { title: string, data: Record<string, number>, icon: React.ReactNode }) {
  const items = Object.entries(data).sort((a, b) => b[1] - a[1]);
  if (items.length === 0) return null;

  return (
    <div className="analytics-group">
      <div className="group-header">
        {icon} <span>{title}</span>
      </div>
      <div className="group-content">
        {items.map(([label, count]) => (
          <div key={label} className="analytics-pill">
            <span className="pill-label">{label}</span>
            <span className="pill-count">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// -------------------------------------------------------------------------------- //
// Memoized Roster Card
// -------------------------------------------------------------------------------- //
const RosterCard = React.memo(function RosterCard({ char, onClick }: { char: Character, onClick: () => void }) {
  return (
    <motion.div 
      className={`roster-mini-card rarity-${char.rarity.toLowerCase().replace(/\s+/g, '-')}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
    >
      <div className="card-accent" />
      <div className="card-main">
        <div className="card-row-top">
          <span className="char-type-badge">
            {char.type === 'Hero' ? <FiStar size={10} /> : <FiHexagon size={10} />}
            {char.subtype}
          </span>
          <span className="rarity-dot" />
        </div>
        <h3 className="char-name-mini">{char.name}</h3>
        <p className="char-faction-mini">{char.faction}</p>
        <div className="mini-details">
          <div className="detail-tag"><FiUsers size={10} /> {char.race}</div>
          <div className="detail-tag"><FiZap size={10} /> {char.visualPillar}</div>
          <div className="detail-tag"><FiBox size={10} /> {char.baseMesh}</div>
        </div>
      </div>
      
      <div className="card-bottom-mini">
        <div className="mini-elements">
          {char.elements.map(el => <span key={el} className={`el-dot ${el.toLowerCase()}`} title={el} />)}
        </div>
        <span className="rarity-text-mini">{char.rarity}</span>
      </div>
    </motion.div>
  );
});

// -------------------------------------------------------------------------------- //
// Character Profile Modal
// -------------------------------------------------------------------------------- //
function CharacterDetailModal({ character, assets, onClose }: { character: Character, assets: ConceptArt[], onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<'all' | 'concept' | 'animation' | 'vfx'>('all');
  
  const filteredAssets = useMemo(() => {
    if (activeTab === 'all') return assets;
    return assets.filter(a => {
      if (activeTab === 'concept') return a.type === 'concept-art';
      if (activeTab === 'animation') return a.type === 'animation';
      if (activeTab === 'vfx') return a.type === 'vfx';
      return true;
    });
  }, [assets, activeTab]);

  return (
    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="character-detail-modal" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={e => e.stopPropagation()}>
        <div className="modal-sidebar-char">
          <div className="modal-char-header">
            <span className={`rarity-badge rarity-${character.rarity.toLowerCase().replace(/\s+/g, '-')}`}>{character.rarity}</span>
            <h2 className="modal-char-name">{character.name}</h2>
            <p className="modal-char-faction">{character.faction}</p>
          </div>
          <div className="modal-char-info">
            <div className="info-block"><label>Role</label><div className="val">{character.type} • {character.subtype}</div></div>
            <div className="info-block"><label>Race & Gender</label><div className="val">{character.race} ({character.gender})</div></div>
            <div className="info-block"><label>Visual Pillar</label><div className="val">{character.visualPillar}</div></div>
            <div className="info-block"><label>Base Mesh</label><div className="val">{character.baseMesh}</div></div>
            <div className="info-block"><label>Elements</label><div className="elements-list">
              {character.elements.map(el => <span key={el} className={`el-badge ${el.toLowerCase()}`}>{el}</span>)}
            </div></div>
          </div>
          <button className="modal-close-btn" onClick={onClose}><FiX /> Close Profile</button>
        </div>

        <div className="modal-content-assets">
          <div className="asset-tabs">
            <button className={activeTab === 'all' ? 'active' : ''} onClick={() => setActiveTab('all')}>All ({assets.length})</button>
            <button className={activeTab === 'concept' ? 'active' : ''} onClick={() => setActiveTab('concept')}>Concept</button>
            <button className={activeTab === 'animation' ? 'active' : ''} onClick={() => setActiveTab('animation')}>Animations</button>
            <button className={activeTab === 'vfx' ? 'active' : ''} onClick={() => setActiveTab('vfx')}>VFX</button>
          </div>
          <div className="asset-display-grid scroll-area">
            {filteredAssets.length === 0 ? (
              <div className="empty-assets"><FiImage size={40} /><p>No assets linked yet.</p></div>
            ) : (
              filteredAssets.map(asset => <AssetPreviewCard key={asset.id} asset={asset} />)
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// -------------------------------------------------------------------------------- //
// Memoized Asset Preview
// -------------------------------------------------------------------------------- //
const AssetPreviewCard = React.memo(function AssetPreviewCard({ asset }: { asset: ConceptArt }) {
  const [isHovered, setIsHovered] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const url = asset.compressedUrl || asset.originalUrl;
  const isVideo = asset.type === 'animation' || asset.type === 'vfx';

  useEffect(() => {
    if (isVideo && videoRef.current) {
      if (isHovered) videoRef.current.play().catch(() => {});
      else { videoRef.current.pause(); videoRef.current.currentTime = 0; }
    }
  }, [isHovered, isVideo]);

  return (
    <div className="asset-preview-card" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      <div className="asset-thumb">
        {isVideo ? (
          <>
            <video ref={videoRef} src={url} muted loop playsInline preload="metadata" />
            <div className="video-indicator"><FiPlay /></div>
          </>
        ) : (
          <img src={url} alt={asset.name} loading="lazy" />
        )}
        <div className="asset-overlay">
          <button className="asset-action-btn" onClick={() => window.open(asset.originalUrl, '_blank')}><FiMaximize2 /></button>
        </div>
      </div>
      <div className="asset-info-mini">
        <span className="asset-type-icon">{isVideo ? <FiVideo size={10} /> : <FiImage size={10} />}</span>
        <span className="asset-name-mini">{asset.name}</span>
      </div>
    </div>
  );
});
