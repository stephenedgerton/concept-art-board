import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiUsers, FiSearch, FiRefreshCw, FiX, 
  FiHexagon, FiZap, FiBox, FiStar, FiHome, FiImage, FiVideo, FiPlay, FiMaximize2, FiShield, FiActivity
} from 'react-icons/fi';
import { getAllArtworks } from './lib/db';
import type { ConceptArt } from './lib/db';
import './LandingPage.css';

export interface CharacterCost {
  concept: number;
  modelling: number;
  animations: number;
  vfx: number;
  ui: number;
  total: number;
  artCost?: number;
  devCost?: number;
  totalCost?: number;
}

export interface Character {
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
  cost?: CharacterCost;
  abilityCount?: number;
  animationCount?: number;
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
  privacyMode: boolean;
  onTogglePrivacy: () => void;
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
export default function CharacterBoard({ onBackToLanding, privacyMode, onTogglePrivacy }: CharacterBoardProps) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [allAssets, setAllAssets] = useState<ConceptArt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('rarity-desc');
  const [includeDevCosts, setIncludeDevCosts] = useState(false);
  
  const [filters, setFilters] = useState<FilterState>({
    type: [], faction: [], race: [], gender: [],
    visualPillar: [], baseMesh: [], rarity: [], elements: []
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [csvResponse, costResponse, assets] = await Promise.all([
        fetch('/data/characters.csv'),
        fetch('/data/Character_Cost_Breakdowns.csv'),
        getAllArtworks()
      ]);

      if (!csvResponse.ok) throw new Error("Failed to load character data.");
      
      // Improved CSV parser to handle quoted values with commas
      const parseCSV = (text: string) => {
        const lines = text.split(/\r?\n/).filter(l => l.trim());
        return lines.map(line => {
          const result = [];
          let current = '';
          let inQuotes = false;
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') inQuotes = !inQuotes;
            else if (char === ',' && !inQuotes) {
              result.push(current.trim());
              current = '';
            } else current += char;
          }
          result.push(current.trim());
          return result;
        });
      };

      const charText = await csvResponse.text();
      const charRows = parseCSV(charText);

      const costData: Record<string, CharacterCost> = {};
      if (costResponse.ok) {
        const costText = await costResponse.text();
        const costRows = parseCSV(costText);
        if (costRows.length > 1) {
          const headers = costRows[0].map(h => h.toLowerCase());
          
          const findHeader = (keywords: string[]) => 
            headers.findIndex(h => keywords.every(k => h.includes(k)));

          const idx = {
            name: findHeader(['name']),
            concept: findHeader(['concept', 'actual']),
            modelling: findHeader(['model', 'actual']),
            animations: findHeader(['animations', 'actual']),
            vfx: findHeader(['vfx', 'actual']),
            ui: findHeader(['ui', 'actual']),
            artCost: findHeader(['art cost actual']),
            devCost: findHeader(['dev cost actual']),
            totalCost: findHeader(['total cost ($)'])
          };

          costRows.slice(1).forEach(row => {
            const name = row[idx.name];
            if (name) {
              // Fuzzy name mapping for common mismatches
              const cleanName = name.toLowerCase().replace(/\./g, '').trim();
              const concept = parseFloat(row[idx.concept]) || 0;
              const modelling = parseFloat(row[idx.modelling]) || 0;
              const animations = parseFloat(row[idx.animations]) || 0;
              const vfx = parseFloat(row[idx.vfx]) || 0;
              const ui = parseFloat(row[idx.ui]) || 0;
              
              const parseCost = (val: string) => {
                if (!val) return 0;
                return parseFloat(val.replace(/[$,]/g, '')) || 0;
              };

              const artCost = parseCost(row[idx.artCost]);
              const devCost = parseCost(row[idx.devCost]);
              const totalCost = parseCost(row[idx.totalCost]);
              
              const data = {
                concept, modelling, animations, vfx, ui,
                total: concept + modelling + animations + vfx + ui,
                artCost, devCost, totalCost
              };
              
              costData[cleanName] = data;
              
              // Map common aliases
              if (cleanName === 'sorceress') costData['sorcerer'] = data;
              if (cleanName === 'arms dealer') costData['arms collector'] = data;
              if (cleanName.includes('enchantress')) costData['orb structure'] = data;
            }
          });
        }
      }
      
      if (charRows.length < 2) {
        setCharacters([]);
      } else {
        const headers = charRows[0].map(h => h.toLowerCase());
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
        
        const data: Character[] = charRows.slice(1).map(row => {
          const getVal = (i: number) => (i !== -1 && row[i]) ? row[i] : '';
          const name = getVal(idx.name);
          const type = getVal(idx.type);
          
          const cleanName = name.toLowerCase().trim();
          
          // Count assets
          const charAssets = assets.filter(a => {
            const fileName = a.name.toLowerCase();
            return a.tags.characterName === name || fileName.includes(cleanName);
          });
          
          const abilityCount = charAssets.filter(a => a.type === 'ability-icons').length;
          const animationCount = charAssets.filter(a => a.type === 'animation').length;

          return {
            name,
            type,
            subtype: getVal(idx.subtype) || (type === 'Hero' ? 'Hero' : ''),
            visualPillar: getVal(idx.visualPillar),
            baseMesh: getVal(idx.baseMesh),
            rarity: getVal(idx.rarity),
            faction: getVal(idx.faction),
            race: getVal(idx.race),
            gender: getVal(idx.gender),
            elements: idx.elements !== -1 && row[idx.elements] ? row[idx.elements].split('|').map(e => e.trim()).filter(Boolean) : [],
            cost: costData[cleanName],
            abilityCount,
            animationCount
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
          <div className="brand">
            <img src="/backgrounds/logo_website_tab_32x32.png" alt="ArtNexus Logo" style={{ width: '24px', height: '24px', marginRight: '8px' }} /> ArtNexus
          </div>
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

        <div className="filter-group" style={{ padding: '0 1.5rem', marginBottom: '1.5rem' }}>
          <div className="prod-toggle-group" style={{ background: 'rgba(255,255,255,0.03)', padding: '0.8rem 1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>PRIVACY MODE</span>
            <button 
              className={`prod-toggle ${privacyMode ? 'active' : ''}`}
              onClick={onTogglePrivacy}
              style={{ width: '40px', height: '20px' }}
            >
              <div className="toggle-thumb" style={{ width: '14px', height: '14px' }} />
            </button>
          </div>

          <div className="prod-toggle-group" style={{ background: 'rgba(255,255,255,0.03)', padding: '0.8rem 1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>INCLUDE DEV</span>
            <button 
              className={`prod-toggle ${includeDevCosts ? 'active' : ''}`}
              onClick={() => setIncludeDevCosts(!includeDevCosts)}
              style={{ width: '40px', height: '20px' }}
            >
              <div className="toggle-thumb" style={{ width: '14px', height: '14px' }} />
            </button>
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
                  includeDev={includeDevCosts}
                  privacyMode={privacyMode}
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
            includeDev={includeDevCosts}
            privacyMode={privacyMode}
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

// Helper to get portrait URL from character name
const getPortraitUrl = (name: string) => {
  const cleanName = name.replace(/\s+/g, '');
  // Mapping for names that might be different
  const specialMappings: Record<string, string> = {
    'BlueOrbConjurer': 'BlueOrbConjurer',
    'DarkSorcerer': 'DarkSorcerer',
    'ArmsDealer': 'ArmsCollector',
    'ArmsCollector': 'ArmsCollector'
  };
  
  const finalName = specialMappings[cleanName] || cleanName;
  return `/portraits/Illustration_${finalName}_Portrait.png`;
};

// -------------------------------------------------------------------------------- //
// Development Time UI Component
// -------------------------------------------------------------------------------- //
function DevelopmentTimeUI({ cost, compact = false, includeDev = false, privacyMode = false }: { cost: CharacterCost, compact?: boolean, includeDev?: boolean, privacyMode?: boolean }) {
  const stages = [
    { label: 'Concept', key: 'concept', color: '#e25822' },
    { label: 'Modelling', key: 'modelling', color: '#1ca3ec' },
    { label: 'Animations', key: 'animations', color: '#8b00ff' },
    { label: 'VFX', key: 'vfx', color: '#fceea7' },
    { label: 'UI', key: 'ui', color: '#b3b3b3' }
  ];

  const formatCurrency = (val?: number) => {
    if (val === undefined || val === 0) return '';
    const formatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
    return <span className={privacyMode ? 'privacy-blur' : ''}>{formatted}</span>;
  };

  if (compact) {
    const displayCost = includeDev ? cost.totalCost : cost.artCost;
    const hasPhases = cost.concept > 0 || cost.modelling > 0 || cost.animations > 0 || cost.vfx > 0 || cost.ui > 0;
    
    return (
      <div className="development-mini" style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '0.6rem', position: 'relative', zIndex: 50 }}>
        {/* INLINE STYLE OVERRIDE FOR MAXIMUM VISIBILITY */}
        <div style={{ 
          display: 'flex', 
          height: '12px', 
          backgroundColor: 'rgba(255,255,255,0.15)', 
          borderRadius: '100px', 
          overflow: 'hidden', 
          width: '100%', 
          border: '1px solid rgba(255,255,255,0.2)',
          boxShadow: '0 2px 10px rgba(0,0,0,0.3)'
        }}>
          {hasPhases ? stages.map(stage => {
            const value = cost[stage.key as keyof CharacterCost] as number;
            if (value <= 0) return null;
            return (
              <div 
                key={stage.key}
                style={{ 
                  width: `${(value / Math.max(cost.total, 1)) * 100}%`,
                  backgroundColor: stage.color,
                  height: '100%',
                  minWidth: '2px',
                  boxShadow: 'inset 0 0 5px rgba(0,0,0,0.2)'
                }}
                title={`${stage.label}: ${value}d`}
              />
            );
          }) : (
            <div style={{ width: '100%', backgroundColor: 'rgba(255,255,255,0.2)', height: '100%' }} title="Bulk Cost Record" />
          )}
        </div>
        <div className="total-time-mini" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 800, opacity: 0.6, letterSpacing: '0.02em', color: 'white' }}>{cost.total > 0 ? `${cost.total.toFixed(1)}d Pipeline` : 'External Asset'}</span>
          {displayCost ? <span className="cost-mini" style={{ color: includeDev ? 'hsl(var(--primary))' : '#10b981', fontSize: '0.85rem', fontWeight: 800 }}>{formatCurrency(displayCost)}</span> : null}
        </div>
        {includeDev && cost.devCost ? (
          <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', textAlign: 'right', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '-0.3rem', fontWeight: 700 }}>
            + {formatCurrency(cost.devCost)} Dev Integration
          </div>
        ) : null}
      </div>
    );
  }

  const displayTotal = includeDev ? cost.totalCost : cost.artCost;

  return (
    <div className="development-detailed">
      {stages.map(stage => {
        const value = cost[stage.key as keyof CharacterCost] as number;
        return (
          <div key={stage.key} className="time-row">
            <div className="time-label-group">
              <span className="stage-label">{stage.label === 'Animations' ? 'Animations (Standard Set)' : stage.label}</span>
              <span className="stage-value">{value}d</span>
            </div>
            <div className="progress-bg">
              <motion.div 
                className="progress-fill"
                initial={{ width: 0 }}
                animate={{ width: `${(value / Math.max(cost.total, 1)) * 100}%` }}
                style={{ backgroundColor: stage.color }}
              />
            </div>
          </div>
        );
      })}
      
      <div className="total-time-row" style={{ marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
          <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', opacity: 0.4, fontWeight: 800 }}>{includeDev ? 'Total Production' : 'Art Production'}</span>
          <div className="total-val" style={{ fontSize: '1.4rem' }}>{formatCurrency(displayTotal)}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="total-cost-val" style={{ opacity: 0.5 }}>{cost.total.toFixed(1)} Days</div>
          {includeDev && cost.devCost ? (
            <div style={{ fontSize: '0.7rem', color: 'hsl(var(--primary))', fontWeight: 700 }}>
              {formatCurrency(cost.devCost)} Dev Integration
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------------------------- //
// Memoized Roster Card
// -------------------------------------------------------------------------------- //
export const RosterCard = React.memo(function RosterCard({ char, onClick, includeDev = false, privacyMode = false }: { char: Character, onClick?: () => void, includeDev?: boolean, privacyMode?: boolean }) {
  const [imgError, setImgError] = useState(false);
  const portraitUrl = getPortraitUrl(char.name);

  return (
    <motion.div 
      className={`roster-mini-card rarity-${char.rarity.toLowerCase().replace(/\s+/g, '-')}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
    >
      <div className="card-accent" />
      
      {!imgError && (
        <div className="card-portrait-bg">
          <img 
            src={portraitUrl} 
            alt="" 
            onError={() => setImgError(true)}
            className="portrait-img"
          />
          <div className="portrait-gradient" />
        </div>
      )}

      <div className="card-main">
        <div className="card-header-area">
          <h3 className="char-name-mini">{char.name}</h3>
          <div className="char-subtitle-mini">
            <span className="char-subtype-inline">
              {char.type === 'Hero' ? <FiStar size={10} /> : <FiHexagon size={10} />}
              {char.subtype}
            </span>
            <span className="separator">•</span>
            <span className="char-faction-inline">{char.faction}</span>
          </div>
        </div>

        <div className="traits-section">
          <h4 className="section-label">TRAITS</h4>
          <div className="mini-details">
            <div className="detail-tag"><FiUsers size={10} /> {char.race} ({char.gender})</div>
            {char.visualPillar && <div className="detail-tag"><FiZap size={10} /> {char.visualPillar}</div>}
            {char.baseMesh && <div className="detail-tag"><FiBox size={10} /> {char.baseMesh}</div>}
          </div>
        </div>

        {char.cost && (
          <div className="development-section-mini">
            <h4 className="section-label">PRODUCTION</h4>
            <DevelopmentTimeUI cost={char.cost} compact includeDev={includeDev} privacyMode={privacyMode} />
          </div>
        )}
      </div>
      
      <div className="card-bottom-mini">
        <div className="mini-elements-verbose">
          {char.elements.map(el => (
            <span key={el} className={`tag-badge element element-${el.toLowerCase().replace(/\s+/g, '-')}`}>
              {el}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
});

// -------------------------------------------------------------------------------- //
// Character Profile Modal
// -------------------------------------------------------------------------------- //
function CharacterDetailModal({ character, assets, onClose, includeDev = false, privacyMode = false }: { character: Character, assets: ConceptArt[], onClose: () => void, includeDev?: boolean, privacyMode?: boolean }) {
  const [activeTab, setActiveTab] = useState<'all' | 'concept' | 'animation' | 'vfx' | 'ability'>('all');
  
  const filteredAssets = useMemo(() => {
    if (activeTab === 'all') {
      // Custom ordering: 1. Concept art, 2. Animations, 3. Effects (VFX), 4. Ability icons
      return [...assets].sort((a, b) => {
        const order = { 'concept-art': 1, 'animation': 2, 'vfx': 3, 'ability-icons': 4, 'references': 5 };
        return (order[a.type] || 99) - (order[b.type] || 99);
      });
    }
    return assets.filter(a => {
      if (activeTab === 'concept') return a.type === 'concept-art';
      if (activeTab === 'animation') return a.type === 'animation';
      if (activeTab === 'vfx') return a.type === 'vfx';
      if (activeTab === 'ability') return a.type === 'ability-icons';
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
            
            {character.cost && (
              <div className="info-block">
                <label>Production Breakdown</label>
                <DevelopmentTimeUI cost={character.cost} includeDev={includeDev} privacyMode={privacyMode} />
              </div>
            )}
            
            <div className="info-block">
              <label>Asset Counts</label>
              <div className="val" style={{ fontSize: '0.85rem' }}>
                {character.abilityCount || 0} Ability Icons • {character.animationCount || 0} Animations
              </div>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}><FiX /> Close Profile</button>
        </div>

        <div className="modal-content-assets">
          <div className="asset-tabs">
            <button className={activeTab === 'all' ? 'active' : ''} onClick={() => setActiveTab('all')}>All ({assets.length})</button>
            <button className={activeTab === 'concept' ? 'active' : ''} onClick={() => setActiveTab('concept')}>Concept</button>
            <button className={activeTab === 'animation' ? 'active' : ''} onClick={() => setActiveTab('animation')}>Animations</button>
            <button className={activeTab === 'vfx' ? 'active' : ''} onClick={() => setActiveTab('vfx')}>VFX</button>
            <button className={activeTab === 'ability' ? 'active' : ''} onClick={() => setActiveTab('ability')}>Ability Icons</button>
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
