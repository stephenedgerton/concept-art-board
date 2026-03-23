import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  FiArrowLeft, FiPlus, FiMinus, 
  FiClock, FiBarChart2, FiHelpCircle, FiDollarSign 
} from 'react-icons/fi';
import { getAllArtworks } from './lib/db';
import { RosterCard } from './CharacterBoard';
import type { Character, CharacterCost } from './CharacterBoard';
import './LandingPage.css';

interface HistoricalCharacter extends Character {
  cost: CharacterCost;
}

interface EstimatorProps {
  onBackToLanding: () => void;
}

export default function Estimator({ onBackToLanding }: EstimatorProps) {
  const [historicalData, setHistoricalData] = useState<HistoricalCharacter[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [subtype, setSubtype] = useState('Hero');
  const [rarity, setRarity] = useState('Rare');
  const [faction, setFaction] = useState('Monarchy');
  const [element, setElement] = useState('Physical');
  const [abilities, setAbilities] = useState(3);
  const [animations, setAnimations] = useState(5);
  const [includeDevCost, setIncludeDevCost] = useState(false);

  // Filter Toggles
  const [filterSubtype, setFilterSubtype] = useState(true);
  const [filterRarity, setFilterRarity] = useState(true);
  const [filterFaction, setFilterFaction] = useState(false);
  const [filterElement, setFilterElement] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [charRes, costRes] = await Promise.all([
          fetch('/data/characters.csv'),
          fetch('/data/Character_Cost_Breakdowns.csv')
        ]);

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

        const charText = await charRes.text();
        const costText = await costRes.text();

        const charRows = parseCSV(charText);
        const costRows = parseCSV(costText);

        const costMap: Record<string, CharacterCost> = {};
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

          const parseCost = (val: string) => {
            if (!val) return 0;
            return parseFloat(val.replace(/[$,]/g, '')) || 0;
          };

          costRows.slice(1).forEach(row => {
            const name = row[idx.name];
            if (name) {
              const cleanName = name.toLowerCase().replace(/\./g, '').trim();
              const concept = parseFloat(row[idx.concept]) || 0;
              const modelling = parseFloat(row[idx.modelling]) || 0;
              const animations = parseFloat(row[idx.animations]) || 0;
              const vfx = parseFloat(row[idx.vfx]) || 0;
              const ui = parseFloat(row[idx.ui]) || 0;
              
              const artCost = parseCost(row[idx.artCost]);
              const devCost = parseCost(row[idx.devCost]);
              const totalCost = parseCost(row[idx.totalCost]);
              
              const data = { 
                concept, modelling, animations, vfx, ui, 
                total: concept + modelling + animations + vfx + ui,
                artCost, devCost, totalCost
              };
              costMap[cleanName] = data;
              
              // Aliases
              if (cleanName === 'sorceress') costMap['sorcerer'] = data;
              if (cleanName === 'arms dealer') costMap['arms collector'] = data;
              if (cleanName.includes('enchantress')) costMap['orb structure'] = data;
            }
          });
        }

        const charHeaders = charRows[0].map(h => h.toLowerCase());
        const findIdx = (names: string[]) => charHeaders.findIndex(h => names.includes(h));
        const charIdx = {
          name: findIdx(['name']),
          type: findIdx(['type']),
          subtype: findIdx(['unit type', 'unit-type']),
          rarity: findIdx(['rarity']),
          faction: findIdx(['faction']),
          element: findIdx(['element', 'element types']),
          gender: findIdx(['gender']),
          race: findIdx(['race']),
          visualPillar: findIdx(['visual pillar', 'pillar']),
          baseMesh: findIdx(['base mesh', 'mesh'])
        };

        const data: HistoricalCharacter[] = charRows.slice(1).map(row => {
          const name = row[charIdx.name];
          const type = row[charIdx.type];
          const subtype = row[charIdx.subtype] || (type === 'Hero' ? 'Hero' : '');
          
          const cleanName = name?.toLowerCase().trim();
          return { 
            name, 
            type, 
            subtype, 
            rarity: row[charIdx.rarity], 
            faction: row[charIdx.faction], 
            elements: row[charIdx.element] ? row[charIdx.element].split('|').map(e => e.trim()) : [],
            gender: row[charIdx.gender],
            race: row[charIdx.race],
            visualPillar: row[charIdx.visualPillar],
            baseMesh: row[charIdx.baseMesh],
            cost: costMap[cleanName] 
          } as HistoricalCharacter;
        }).filter(c => c.cost);

        setHistoricalData(data);
      } catch (e) {
        console.error("Failed to load historical data", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const estimate = useMemo(() => {
    // Start with all characters that have data
    let filtered = historicalData.filter(h => h.cost.total > 0);

    // Apply filters only if they are toggled ON
    if (filterSubtype) {
      filtered = filtered.filter(h => (h.subtype?.toLowerCase() || '') === subtype.toLowerCase());
    }
    if (filterRarity) {
      filtered = filtered.filter(h => (h.rarity?.toLowerCase() || '') === rarity.toLowerCase());
    }
    if (filterFaction) {
      filtered = filtered.filter(h => (h.faction?.toLowerCase() || '') === faction.toLowerCase());
    }
    if (filterElement) {
      filtered = filtered.filter(h => (h.elements && h.elements.some(e => e.toLowerCase().includes(element.toLowerCase()))));
    }

    const base = filtered.length > 0 ? filtered.reduce((acc, h) => ({
      concept: acc.concept + h.cost.concept,
      modelling: acc.modelling + h.cost.modelling,
      animations: acc.animations + h.cost.animations,
      vfx: acc.vfx + h.cost.vfx,
      ui: acc.ui + h.cost.ui,
      total: acc.total + h.cost.total,
      artCost: acc.artCost + (h.cost.artCost || 0),
      devCost: acc.devCost + (h.cost.devCost || 0)
    }), { concept: 0, modelling: 0, animations: 0, vfx: 0, ui: 0, total: 0, artCost: 0, devCost: 0 }) : null;

    if (base) {
      const count = filtered.length;
      const avg = {
        concept: base.concept / count,
        modelling: base.modelling / count,
        animations: base.animations / count,
        vfx: base.vfx / count,
        ui: base.ui / count,
        total: base.total / count,
        artCost: base.artCost / count,
        devCost: base.devCost / count,
        totalCost: 0
      };

      // Adjust for abilities and animations
      const abilityFactor = abilities / 3;
      const animationFactor = animations / 6;

      avg.animations *= animationFactor;
      avg.vfx *= (abilityFactor + animationFactor) / 2;
      avg.ui *= abilityFactor;
      
      avg.total = avg.concept + avg.modelling + avg.animations + avg.vfx + avg.ui;

      // Simple cost scaling
      const timeFactor = (avg.total / (base.total / count)) || 1;
      avg.artCost *= timeFactor;
      avg.devCost *= timeFactor;
      
      avg.totalCost = includeDevCost ? (avg.artCost + avg.devCost) : avg.artCost;

      return { avg, sampleSize: count, similar: filtered };
    }

    return { avg: { concept: 2, modelling: 4, animations: 3, vfx: 2, ui: 1, total: 12, totalCost: 5000 }, sampleSize: 0, similar: [] };
  }, [historicalData, subtype, rarity, faction, element, abilities, animations, includeDevCost, filterSubtype, filterRarity, filterFaction, filterElement]);

  const formatCurrency = (val?: number) => {
    if (val === undefined || val === 0) return '$0';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="roster-page-container">
      <aside className="sidebar">
        <div className="brand-container">
          <div className="brand">ArtNexus Estimator</div>
          <button className="back-home-btn" onClick={onBackToLanding}><FiArrowLeft /></button>
        </div>

        <div className="filter-section scroll-area">
          <div className="filter-group">
            <div className="filter-header">
              <h3>Include Dev Cost</h3>
              <label className="toggle-switch mini">
                <input 
                  type="checkbox" 
                  checked={includeDevCost} 
                  onChange={e => setIncludeDevCost(e.target.checked)} 
                />
                <span className="slider"></span>
              </label>
            </div>
          </div>

          <div className={`filter-group ${!filterSubtype ? 'disabled' : ''}`}>
            <div className="filter-header">
              <h3>Unit Type</h3>
              <label className="toggle-switch mini">
                <input 
                  type="checkbox" 
                  checked={filterSubtype} 
                  onChange={e => setFilterSubtype(e.target.checked)} 
                />
                <span className="slider"></span>
              </label>
            </div>
            <select 
              value={subtype} 
              onChange={e => setSubtype(e.target.value)} 
              className="estimator-select"
              disabled={!filterSubtype}
            >
              <option value="Hero">Hero</option>
              <option value="Vanguard">Vanguard</option>
              <option value="Elite">Elite</option>
              <option value="Imperial">Imperial</option>
              <option value="Worker">Worker</option>
            </select>
          </div>

          <div className={`filter-group ${!filterRarity ? 'disabled' : ''}`}>
            <div className="filter-header">
              <h3>Rarity</h3>
              <label className="toggle-switch mini">
                <input 
                  type="checkbox" 
                  checked={filterRarity} 
                  onChange={e => setFilterRarity(e.target.checked)} 
                />
                <span className="slider"></span>
              </label>
            </div>
            <select 
              value={rarity} 
              onChange={e => setRarity(e.target.value)} 
              className="estimator-select"
              disabled={!filterRarity}
            >
              <option value="Common">Common</option>
              <option value="Uncommon">Uncommon</option>
              <option value="Rare">Rare</option>
              <option value="Epic">Epic</option>
              <option value="Legendary">Legendary</option>
              <option value="Mythic">Mythic</option>
            </select>
          </div>

          <div className={`filter-group ${!filterFaction ? 'disabled' : ''}`}>
            <div className="filter-header">
              <h3>Faction</h3>
              <label className="toggle-switch mini">
                <input 
                  type="checkbox" 
                  checked={filterFaction} 
                  onChange={e => setFilterFaction(e.target.checked)} 
                />
                <span className="slider"></span>
              </label>
            </div>
            <select 
              value={faction} 
              onChange={e => setFaction(e.target.value)} 
              className="estimator-select"
              disabled={!filterFaction}
            >
              <option value="Monarchy">Monarchy</option>
              <option value="Constructs">Constructs</option>
              <option value="Elementals">Elementals</option>
              <option value="Clan Folk">Clan Folk</option>
              <option value="Dark Magic Followers">Dark Magic Followers</option>
              <option value="Artisans">Artisans</option>
            </select>
          </div>

          <div className={`filter-group ${!filterElement ? 'disabled' : ''}`}>
            <div className="filter-header">
              <h3>Element</h3>
              <label className="toggle-switch mini">
                <input 
                  type="checkbox" 
                  checked={filterElement} 
                  onChange={e => setFilterElement(e.target.checked)} 
                />
                <span className="slider"></span>
              </label>
            </div>
            <select 
              value={element} 
              onChange={e => setElement(e.target.value)} 
              className="estimator-select"
              disabled={!filterElement}
            >
              <option value="Physical">Physical</option>
              <option value="Arcane">Arcane</option>
              <option value="Water">Water</option>
              <option value="Fire">Fire</option>
              <option value="Air">Air</option>
              <option value="Celestial">Celestial</option>
              <option value="Dark Magic">Dark Magic</option>
            </select>
          </div>

          <div className="filter-group">
            <h3>Abilities & Icons</h3>
            <div className="counter-group">
              <button onClick={() => setAbilities(Math.max(0, abilities - 1))}><FiMinus /></button>
              <span>{abilities}</span>
              <button onClick={() => setAbilities(abilities + 1)}><FiPlus /></button>
            </div>
          </div>

          <div className="filter-group">
            <h3>Animations</h3>
            <div className="counter-group">
              <button onClick={() => setAnimations(Math.max(1, animations - 1))}><FiMinus /></button>
              <span>{animations}</span>
              <button onClick={() => setAnimations(animations + 1)}><FiPlus /></button>
            </div>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="header" style={{ height: 'auto', padding: '2rem 2.5rem' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.8rem' }}>Development Estimate</h1>
            <p style={{ color: 'rgba(255,255,255,0.4)', marginTop: '0.3rem' }}>
              Based on {estimate.sampleSize} historical {subtype}s with {rarity} rarity.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div className="estimate-total-badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'white', boxShadow: 'none', border: '1px solid rgba(255,255,255,0.1)' }}>
              <FiClock /> <span>{estimate.avg.total.toFixed(1)} Days</span>
            </div>
            <div className="estimate-total-badge">
              <FiDollarSign /> <span>{formatCurrency(estimate.avg.totalCost)}</span>
            </div>
          </div>
        </header>

        <div className="estimator-grid scroll-area" style={{ padding: '0 2.5rem 2.5rem' }}>
          <section className="estimate-cards">
            <EstimateCard label="Concept Art" value={estimate.avg.concept} color="#e25822" />
            <EstimateCard label="3D Modelling" value={estimate.avg.modelling} color="#1ca3ec" />
            <EstimateCard label="Animations" value={estimate.avg.animations} color="#8b00ff" />
            <EstimateCard label="VFX" value={estimate.avg.vfx} color="#fceea7" />
            <EstimateCard label="UI Elements" value={estimate.avg.ui} color="#b3b3b3" />
          </section>

          <section className="historical-context" style={{ marginTop: '3rem' }}>
            <div className="section-header">
              <FiBarChart2 /> <span>Reference Characters</span>
            </div>
            <div className="roster-grid">
              {estimate.similar.length > 0 ? estimate.similar.map((c, i) => (
                <RosterCard key={`${c.name}-${i}`} char={c} />
              )) : <div className="empty-ref">No exact matches found. Showing generic estimate.</div>}
            </div>
          </section>

          <section className="estimation-insights">
            <div className="insight-card">
              <FiHelpCircle className="insight-icon" />
              <div>
                <h4>Complexity Note</h4>
                <p>
                  {rarity === 'Legendary' || rarity === 'Mythic' ? 
                    "High rarity characters often require multiple design iterations and more complex VFX." : 
                    "Low rarity characters typically follow established pipelines and take less time."}
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>

      <style>{`
        .filter-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }
        .filter-header h3 { margin: 0; }
        
        .toggle-switch {
          position: relative;
          display: inline-block;
          width: 50px;
          height: 24px;
        }
        .toggle-switch.mini {
          width: 36px;
          height: 18px;
        }
        .toggle-switch input { opacity: 0; width: 0; height: 0; }
        .slider {
          position: absolute;
          cursor: pointer;
          top: 0; left: 0; right: 0; bottom: 0;
          background-color: rgba(255,255,255,0.1);
          transition: .4s;
          border-radius: 24px;
        }
        .toggle-switch.mini .slider:before {
          height: 12px;
          width: 12px;
          left: 3px;
          bottom: 3px;
        }
        .slider:before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: .4s;
          border-radius: 50%;
        }
        input:checked + .slider { background-color: hsl(var(--primary)); }
        input:checked + .slider:before { transform: translateX(26px); }
        .toggle-switch.mini input:checked + .slider:before { transform: translateX(18px); }

        .filter-group.disabled select,
        .filter-group.disabled .counter-group {
          opacity: 0.3;
          pointer-events: none;
          filter: grayscale(1);
        }
        
        .filter-group.disabled .filter-header h3 {
          opacity: 0.5;
        }

        .estimator-select {
          width: 100%;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          color: white;
          padding: 0.8rem;
          border-radius: 12px;
          outline: none;
          margin-top: 0.5rem;
          cursor: pointer;
        }
        .estimator-select option {
          background-color: #1a1a1a;
          color: white;
          padding: 10px;
        }
        .counter-group {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          margin-top: 0.5rem;
          background: rgba(255,255,255,0.05);
          padding: 0.5rem 1rem;
          border-radius: 12px;
          justify-content: space-between;
        }
        .counter-group button {
          background: rgba(255,255,255,0.1);
          border: none;
          color: white;
          width: 30px;
          height: 30px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .estimate-total-badge {
          background: hsl(var(--primary));
          color: white;
          padding: 0.8rem 1.5rem;
          border-radius: 16px;
          display: flex;
          align-items: center;
          gap: 0.8rem;
          font-weight: 800;
          font-size: 1.2rem;
          box-shadow: 0 10px 20px -5px hsla(var(--primary) / 0.5);
        }
        .estimate-cards {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 1.5rem;
          margin-top: 2rem;
        }
        .estimate-card {
          background: hsl(var(--surface));
          border: 1px solid hsl(var(--surface-hover));
          padding: 1.5rem;
          border-radius: 20px;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .est-label { font-size: 0.75rem; text-transform: uppercase; color: rgba(255,255,255,0.4); font-weight: 700; }
        .est-value { font-size: 1.8rem; font-weight: 800; color: white; }
        .est-bar { height: 4px; background: rgba(255,255,255,0.05); border-radius: 100px; overflow: hidden; }
        .est-fill { height: 100%; border-radius: 100px; }
        
        .historical-context { margin-top: 3rem; background: rgba(255,255,255,0.02); padding: 2rem; border-radius: 24px; border: 1px solid rgba(255,255,255,0.05); }
        .section-header { display: flex; align-items: center; gap: 0.8rem; font-weight: 800; text-transform: uppercase; font-size: 0.8rem; color: rgba(255,255,255,0.4); margin-bottom: 1.5rem; }
        .reference-list { display: flex; flex-wrap: wrap; gap: 1rem; }
        .reference-item { background: rgba(255,255,255,0.05); padding: 0.8rem 1.2rem; border-radius: 12px; display: flex; gap: 1rem; align-items: center; }
        .ref-name { font-weight: 600; font-size: 0.9rem; }
        .ref-total { color: hsl(var(--primary)); font-weight: 800; font-size: 0.85rem; }
        
        .estimation-insights { margin-top: 2rem; }
        .insight-card { background: hsla(var(--primary) / 0.1); border: 1px solid hsla(var(--primary) / 0.2); padding: 1.5rem; border-radius: 20px; display: flex; gap: 1.5rem; align-items: flex-start; }
        .insight-icon { font-size: 1.5rem; color: hsl(var(--primary)); margin-top: 0.2rem; }
        .insight-card h4 { margin: 0 0 0.4rem; font-size: 1rem; }
        .insight-card p { margin: 0; color: rgba(255,255,255,0.6); font-size: 0.9rem; line-height: 1.5; }
      `}</style>
    </div>
  );
}

function EstimateCard({ label, value, color }: { label: string, value: number, color: string }) {
  return (
    <div className="estimate-card">
      <span className="est-label">{label}</span>
      <span className="est-value">{value.toFixed(1)}d</span>
      <div className="est-bar">
        <motion.div 
          className="est-fill"
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, (value / 10) * 100)}%` }}
          style={{ backgroundColor: color }}
        />
      </div>
    </div>
  );
}
