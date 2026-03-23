import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiArrowLeft, FiBarChart2, FiDollarSign, FiUsers, 
  FiTrendingUp, FiTrendingDown, FiPieChart, FiActivity, FiSettings, FiCalendar, FiCamera, FiInfo
} from 'react-icons/fi';
import html2canvas from 'html2canvas';
import './ProductionDashboard.css';

const DashboardTooltip = ({ title, content }: { title: string, content: string }) => {
  const [show, setShow] = React.useState(false);
  return (
    <div className="info-trigger" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <FiInfo size={14} />
      <AnimatePresence>
        {show && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            className="info-popup"
          >
            <strong>{title}</strong>
            <p>{content}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface CostRecord {
  name: string;
  type: string;
  subtype: string;
  rarity: string;
  faction: string;
  totalCost: number;
  artCost: number;
  artEstimate: number;
  devCost: number;
  // Phase Days
  conceptEst: number; conceptAct: number;
  uiEst: number; uiAct: number;
  modelEst: number; modelAct: number;
  animEst: number; animAct: number;
  vfxEst: number; vfxAct: number;
  dateCompleted: Date | null;
  year: number | null;
}

interface ProductionDashboardProps {
  onBackToLanding: () => void;
}

export default function ProductionDashboard({ onBackToLanding }: ProductionDashboardProps) {
  const [data, setData] = useState<CostRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [budget, setBudget] = useState<number>(108000); // 12 * 9000
  const [targetCount, setTargetCount] = useState<number>(50);
  const [showSettings, setShowSettings] = useState(false);
  const [hoveredMonth, setHoveredMonth] = useState<string | null>(null);
  const dashboardRef = React.useRef<HTMLDivElement>(null);

  const handleSnapshot = async () => {
    if (!dashboardRef.current) return;
    try {
      const canvas = await html2canvas(dashboardRef.current, {
        backgroundColor: '#0a0a0b',
        scale: 2, // Higher quality
        logging: false,
        useCORS: true,
        ignoreElements: (el) => el.classList.contains('prod-sidebar') || el.classList.contains('prod-back-btn')
      });
      
      const link = document.createElement('a');
      link.download = `Production_Report_${selectedYear}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Failed to capture snapshot', err);
    }
  };
  
  // Global Filters
  const [selectedFaction, setSelectedFaction] = useState<string>('All');
  const [selectedRarity, setSelectedRarity] = useState<string>('All');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [includeDevCosts, setIncludeDevCosts] = useState<boolean>(false);

  useEffect(() => {
    // ... (fetch logic remains same)
    const fetchData = async () => {
      try {
        const res = await fetch('/data/Character_Cost_Breakdowns.csv');
        const text = await res.text();
        
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

        const rows = parseCSV(text);
        if (rows.length <= 1) return;

        const headers = rows[0].map(h => h.toLowerCase().trim());
        const findHeader = (keywords: string[]) => 
          headers.findIndex(h => keywords.every(k => h.includes(k)));

        const idx = {
          name: findHeader(['name']),
          type: findHeader(['content type']),
          subtype: findHeader(['unit type']),
          rarity: findHeader(['rarity']),
          faction: findHeader(['faction']),
          totalCost: findHeader(['total cost ($)']),
          artCost: findHeader(['art cost actual']),
          artEstimate: findHeader(['art cost estimate']),
          devCost: findHeader(['dev cost actual']),
          conceptEst: findHeader(['concept estimate']),
          conceptAct: findHeader(['concept actual']),
          uiEst: findHeader(['ui estimate']),
          uiAct: findHeader(['ui actual']),
          modelEst: findHeader(['model estimate']),
          modelAct: findHeader(['model actual']),
          animEst: findHeader(['animations estimate']),
          animAct: findHeader(['animations actual']),
          vfxEst: findHeader(['vfx estimate']),
          vfxAct: findHeader(['vfx actual']),
          date: findHeader(['art date completed'])
        };

        const parsePrice = (val: string) => {
          if (!val) return 0;
          let clean = val.replace(/[$,\s]/g, '');
          // Handle accounting negative format: ($500) -> -500
          if (clean.startsWith('(') && clean.endsWith(')')) {
            clean = '-' + clean.slice(1, -1);
          }
          return parseFloat(clean) || 0;
        };

        const parseDate = (val: string) => {
          if (!val || val === '-') return null;
          // Handle both "24 Jan 25" and "24-Jan-25"
          const parts = val.replace(/-/g, ' ').split(' ');
          if (parts.length === 3) {
            const day = parseInt(parts[0]);
            const monthStr = parts[1].toLowerCase();
            const year = parseInt(parts[2]) + 2000;
            const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
            const month = months.indexOf(monthStr);
            if (month !== -1) return new Date(year, month, day);
          }
          return null;
        };

        const processed: CostRecord[] = rows.slice(1).map(row => {
          const date = parseDate(row[idx.date]);
          return {
            name: row[idx.name],
            type: row[idx.type],
            subtype: row[idx.subtype],
            rarity: row[idx.rarity],
            faction: row[idx.faction],
            totalCost: parsePrice(row[idx.totalCost]),
            artCost: parsePrice(row[idx.artCost]),
            artEstimate: parsePrice(row[idx.artEstimate]),
            devCost: parsePrice(row[idx.devCost]),
            conceptEst: parsePrice(row[idx.conceptEst]),
            conceptAct: parsePrice(row[idx.conceptAct]),
            uiEst: parsePrice(row[idx.uiEst]),
            uiAct: parsePrice(row[idx.uiAct]),
            modelEst: parsePrice(row[idx.modelEst]),
            modelAct: parsePrice(row[idx.modelAct]),
            animEst: parsePrice(row[idx.animEst]),
            animAct: parsePrice(row[idx.animAct]),
            vfxEst: parsePrice(row[idx.vfxEst]),
            vfxAct: parsePrice(row[idx.vfxAct]),
            dateCompleted: date,
            year: date ? date.getFullYear() : null
          };
        }).filter(r => r.name);

        setData(processed);
      } catch (e) {
        console.error("Failed to fetch dashboard data", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filterOptions = useMemo(() => {
    const years = Array.from(new Set(data.map(d => d.year))).filter(Boolean).sort((a, b) => (b as number) - (a as number)) as number[];
    // Ensure current year is always an option even if no data yet
    const currentYear = new Date().getFullYear();
    if (!years.includes(currentYear)) years.unshift(currentYear);

    return {
      factions: ['All', ...Array.from(new Set(data.map(d => d.faction))).filter(Boolean).sort()],
      rarities: ['All', ...Array.from(new Set(data.map(d => d.rarity))).filter(Boolean).sort()],
      years
    };
  }, [data]);

  const insights = useMemo(() => {
    const lastYear = selectedYear - 1;

    // Apply global filters (excluding year for the base set to allow trend comparison)
    const filteredBase = data.filter(r => {
      const factionMatch = selectedFaction === 'All' || r.faction === selectedFaction;
      const rarityMatch = selectedRarity === 'All' || r.rarity === selectedRarity;
      return factionMatch && rarityMatch;
    });

    const currentYearData = filteredBase.filter(r => r.year === selectedYear);
    const lastYearData = filteredBase.filter(r => r.year === lastYear);

    // Cost Selection Logic
    const getCost = (r: CostRecord) => includeDevCosts ? r.totalCost : r.artCost;

    // YTD Logic for current year
    const now = new Date();
    const isCurrentYear = selectedYear === now.getFullYear();
    
    const lastYearDataYTD = isCurrentYear 
      ? lastYearData.filter(r => {
          if (!r.dateCompleted) return false;
          const m = r.dateCompleted.getMonth();
          const d = r.dateCompleted.getDate();
          return (m < now.getMonth()) || (m === now.getMonth() && d <= now.getDate());
        })
      : lastYearData;

    // Production Velocity
    const currentYearCount = currentYearData.length;
    const targetProgress = (currentYearCount / targetCount) * 100;
    
    // Last year stats (for trends - using YTD if current year)
    const lastYearCount = lastYearData.length;
    const lastYearCountYTD = lastYearDataYTD.length;
    const countTrend = lastYearCountYTD === 0 ? 0 : (((currentYearCount - lastYearCountYTD) / lastYearCountYTD) * 100);

    // Spend
    const currentYearSpend = currentYearData.reduce((sum, r) => sum + getCost(r), 0);
    const currentYearEstimate = currentYearData.reduce((sum, r) => sum + (includeDevCosts ? (r.artEstimate + r.devCost) : r.artEstimate), 0);
    const estimationAccuracy = currentYearEstimate > 0 ? (currentYearSpend / currentYearEstimate) * 100 : 100;
    const estimationDelta = currentYearSpend - currentYearEstimate;

    // Estimation Status Logic
    const variance = estimationAccuracy - 100;
    let estStatus: 'on-target' | 'under' | 'over' = 'on-target';
    let estLabel = 'On Target';
    if (variance > 20) { estStatus = 'over'; estLabel = 'Over Budget'; }
    else if (variance < -10) { estStatus = 'under'; estLabel = 'Under Estimated'; }
    else { estStatus = 'on-target'; estLabel = 'High Precision'; }

    const lastYearSpendYTD = lastYearDataYTD.reduce((sum, r) => sum + getCost(r), 0);
    const spendTrend = lastYearSpendYTD === 0 ? 0 : (((currentYearSpend - lastYearSpendYTD) / lastYearSpendYTD) * 100);
    const lastYearTotalSpend = lastYearData.reduce((sum, r) => sum + getCost(r), 0);

    // Rarity Balance & ROI (Calculated against current selected year)
    const rarityStats: Record<string, { count: number, totalSpend: number, avgCost: number, lyAvgCost: number }> = {};
    currentYearData.forEach(r => {
      if (!r.rarity) return;
      if (!rarityStats[r.rarity]) rarityStats[r.rarity] = { count: 0, totalSpend: 0, avgCost: 0, lyAvgCost: 0 };
      rarityStats[r.rarity].count += 1;
      rarityStats[r.rarity].totalSpend += getCost(r);
    });

    // Last Year Rarity Stats for comparison
    const lyRarityGroups: Record<string, { total: number, count: number }> = {};
    lastYearData.forEach(r => {
      if (!r.rarity) return;
      if (!lyRarityGroups[r.rarity]) lyRarityGroups[r.rarity] = { total: 0, count: 0 };
      lyRarityGroups[r.rarity].total += getCost(r);
      lyRarityGroups[r.rarity].count += 1;
    });
    
    Object.keys(rarityStats).forEach(k => {
      rarityStats[k].avgCost = rarityStats[k].totalSpend / rarityStats[k].count;
      if (lyRarityGroups[k]) {
        rarityStats[k].lyAvgCost = lyRarityGroups[k].total / lyRarityGroups[k].count;
      }
    });

    // Unit Type Stats (Subtype)
    const unitTypeStats: Record<string, { count: number, totalSpend: number, avgCost: number, lyAvgCost: number }> = {};
    currentYearData.forEach(r => {
      if (!r.subtype) return;
      if (!unitTypeStats[r.subtype]) unitTypeStats[r.subtype] = { count: 0, totalSpend: 0, avgCost: 0, lyAvgCost: 0 };
      unitTypeStats[r.subtype].count += 1;
      unitTypeStats[r.subtype].totalSpend += getCost(r);
    });

    const lyUnitTypeGroups: Record<string, { total: number, count: number }> = {};
    lastYearData.forEach(r => {
      if (!r.subtype) return;
      if (!lyUnitTypeGroups[r.subtype]) lyUnitTypeGroups[r.subtype] = { total: 0, count: 0 };
      lyUnitTypeGroups[r.subtype].total += getCost(r);
      lyUnitTypeGroups[r.subtype].count += 1;
    });

    Object.keys(unitTypeStats).forEach(k => {
      unitTypeStats[k].avgCost = unitTypeStats[k].totalSpend / unitTypeStats[k].count;
      if (lyUnitTypeGroups[k]) {
        unitTypeStats[k].lyAvgCost = lyUnitTypeGroups[k].total / lyUnitTypeGroups[k].count;
      }
    });

    const budgetPercent = (currentYearSpend / budget) * 100;

    // Monthly Spend & Units
    const monthlySpend: Record<string, number> = {};
    const monthlyUnits: Record<string, CostRecord[]> = {};
    currentYearData.forEach(r => {
      if (r.dateCompleted) {
        const key = `${r.dateCompleted.getFullYear()}-${r.dateCompleted.getMonth() + 1}`;
        monthlySpend[key] = (monthlySpend[key] || 0) + getCost(r);
        if (!monthlyUnits[key]) monthlyUnits[key] = [];
        monthlyUnits[key].push(r);
      }
    });

    // Efficiency Metrics (Scoped to Selected Year for accuracy)
    const factionStats: Record<string, { total: number, count: number }> = {};
    currentYearData.forEach(r => {
      if (!r.faction) return;
      if (!factionStats[r.faction]) factionStats[r.faction] = { total: 0, count: 0 };
      factionStats[r.faction].total += getCost(r);
      factionStats[r.faction].count += 1;
    });

    let mostExpensiveFactionName = 'N/A';
    let mostExpensiveFactionCost = 0;
    
    Object.entries(factionStats).forEach(([name, stats]) => {
      const avg = stats.total / stats.count;
      if (avg > mostExpensiveFactionCost) {
        mostExpensiveFactionCost = avg;
        mostExpensiveFactionName = name;
      }
    });
    
    // Average Monthly Spend
    const monthsWithData = Object.keys(monthlySpend).length || 1;
    const avgMonthlySpend = currentYearSpend / monthsWithData;
    
    // Last Year Avg Monthly Spend (for trend)
    const lastYearMonths = Array.from(new Set(lastYearData.filter(r => r.dateCompleted).map(r => r.dateCompleted!.getMonth()))).length || 1;
    const lastYearAvgMonthlySpend = lastYearTotalSpend / lastYearMonths;
    const monthlySpendTrend = lastYearAvgMonthlySpend > 0 ? ((avgMonthlySpend - lastYearAvgMonthlySpend) / lastYearAvgMonthlySpend) * 100 : 0;

    // Release Cadence & Trends
    const currentCadence = currentYearCount > 0 ? (30 / (currentYearCount / monthsWithData)) : 0;
    const lastYearCadence = lastYearCount > 0 ? (30 / (lastYearCount / lastYearMonths)) : 0;
    const cadenceTrend = (lastYearCadence > 0 && currentCadence > 0) ? ((lastYearCadence - currentCadence) / lastYearCadence) * 100 : 0; // Positive means faster

    // Projected Year End
    const projectedYearEndSpend = avgMonthlySpend * 12;
    const projectedYearEndUnits = Math.round((currentYearCount / monthsWithData) * 12);

    // COST OF QUALITY (Tier-based comparison)
    const getTierAvg = (statsMap: Record<string, { totalSpend: number, count: number }>, tiers: string[]) => {
      let total = 0;
      let count = 0;
      tiers.forEach(t => {
        if (statsMap[t]) {
          total += statsMap[t].totalSpend;
          count += statsMap[t].count;
        }
      });
      return count > 0 ? total / count : 0;
    };

    const highTierAvg = getTierAvg(rarityStats, ['Legendary', 'Epic']);
    const lowTierAvg = getTierAvg(rarityStats, ['Common', 'Uncommon']);
    const efficiencyMultiplier = (highTierAvg > 0 && lowTierAvg > 0) ? (highTierAvg / lowTierAvg) : 0;

    // Last Year Multiplier (for trend)
    const lyHighTierAvg = getTierAvg(lyRarityGroups, ['Legendary', 'Epic']);
    const lyLowTierAvg = getTierAvg(lyRarityGroups, ['Common', 'Uncommon']);
    const lyEfficiencyMultiplier = (lyHighTierAvg > 0 && lyLowTierAvg > 0) ? (lyHighTierAvg / lyLowTierAvg) : 0;
    
    const multiplierTrend = lyEfficiencyMultiplier > 0 ? ((efficiencyMultiplier - lyEfficiencyMultiplier) / lyEfficiencyMultiplier) * 100 : 0;

    // Phase-Level Precision Tracking
    const getPhaseStats = (keyEst: keyof CostRecord, keyAct: keyof CostRecord) => {
      const totalEst = currentYearData.reduce((sum, r) => sum + (r[keyEst] as number || 0), 0);
      const totalAct = currentYearData.reduce((sum, r) => sum + (r[keyAct] as number || 0), 0);
      const accuracy = totalEst > 0 ? (totalAct / totalEst) * 100 : 100;
      return { totalEst, totalAct, accuracy, delta: totalAct - totalEst };
    };

    const phaseAnalysis = {
      concept: getPhaseStats('conceptEst', 'conceptAct'),
      ui: getPhaseStats('uiEst', 'uiAct'),
      model: getPhaseStats('modelEst', 'modelAct'),
      anim: getPhaseStats('animEst', 'animAct'),
      vfx: getPhaseStats('vfxEst', 'vfxAct'),
    };

    // Find most volatile phase
    const mostVolatilePhase = Object.entries(phaseAnalysis).reduce((prev, curr) => 
      (curr[1].accuracy > prev[1].accuracy) ? curr : prev
    );

    // Strategic Insights Logic
    let recommendation = "Pipeline stable. Maintain current production standards.";
    let recommendationType: 'stable' | 'action' | 'warning' = 'stable';

    if (mostVolatilePhase[1].accuracy > 125) {
      recommendation = `${mostVolatilePhase[0].toUpperCase()} production is exceeding estimates by ${(mostVolatilePhase[1].accuracy - 100).toFixed(1)}%. Review scope or increase time allocation.`;
      recommendationType = 'warning';
    } else if (multiplierTrend > 15) {
      recommendation = `Rarity premium is rising (${multiplierTrend.toFixed(1)}%). Consider standardizing Legendary visual scopes to stabilize costs.`;
      recommendationType = 'action';
    } else if (currentYearSpend > (budget * 1.1)) {
      recommendation = "Total spend has exceeded annual budget limits. Urgent audit of remaining pipeline required.";
      recommendationType = 'warning';
    }

    return {
      currentYearCount,
      targetProgress,
      countTrend,
      currentYearSpend,
      currentYearEstimate,
      estimationAccuracy,
      estimationDelta,
      variance,
      estStatus,
      estLabel,
      spendTrend,
      rarityStats: Object.entries(rarityStats).sort((a, b) => b[1].count - a[1].count),
      unitTypeStats: Object.entries(unitTypeStats).sort((a, b) => b[1].count - a[1].count),
      budgetPercent,
      monthlySpend,
      monthlyUnits,
      avgMonthlySpend,
      monthlySpendTrend,
      currentCadence,
      cadenceTrend,
      projectedYearEndSpend,
      projectedYearEndUnits,
      mostExpensiveFactionName,
      mostExpensiveFactionCost,
      efficiencyMultiplier,
      multiplierTrend,
      phaseAnalysis,
      recommendation,
      recommendationType
    };
  }, [data, budget, targetCount, selectedFaction, selectedRarity, selectedYear, includeDevCosts]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
  };

  if (loading) return <div className="prod-dashboard-loading"><div className="spinner" /></div>;

  return (
    <div className="prod-dashboard-container" ref={dashboardRef}>
      <aside className="prod-sidebar">
        <div className="prod-brand">
          <FiActivity className="prod-logo" />
          <span>PRODUCTION</span>
          <button className="prod-back-btn" onClick={onBackToLanding}><FiArrowLeft /></button>
        </div>
        
        <div className="prod-nav">
          <div className="prod-nav-item active">
            <FiBarChart2 /> Overview
          </div>
          <div className="prod-nav-item" onClick={() => setShowSettings(!showSettings)}>
            <FiSettings /> Configuration
          </div>
          <div className="prod-nav-item" onClick={handleSnapshot}>
            <FiCamera /> Take Snapshot
          </div>
        </div>

        {showSettings && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="budget-config-panel">
            <div className="config-group">
              <label>Annual Budget ($)</label>
              <input type="number" value={budget} onChange={e => setBudget(parseInt(e.target.value) || 0)} className="budget-input" />
            </div>
            <div className="config-group" style={{ marginTop: '1rem' }}>
              <label>Character Target</label>
              <input type="number" value={targetCount} onChange={e => setTargetCount(parseInt(e.target.value) || 1)} className="budget-input" />
            </div>
          </motion.div>
        )}

        <div className="prod-sidebar-filters">
          <div className="prod-toggle-group">
            <label>Include Dev Costs</label>
            <button 
              className={`prod-toggle ${includeDevCosts ? 'active' : ''}`}
              onClick={() => setIncludeDevCosts(!includeDevCosts)}
            >
              <div className="toggle-thumb" />
            </button>
          </div>

          <label style={{ marginTop: '1.5rem', display: 'block' }}>Fiscal Year</label>
          <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="prod-filter-select">
            {filterOptions.years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          <label style={{ marginTop: '1rem', display: 'block' }}>Filter Faction</label>
          <select value={selectedFaction} onChange={e => setSelectedFaction(e.target.value)} className="prod-filter-select">
            {filterOptions.factions.map(f => <option key={f} value={f}>{f}</option>)}
          </select>

          <label style={{ marginTop: '1rem', display: 'block' }}>Filter Rarity</label>
          <select value={selectedRarity} onChange={e => setSelectedRarity(e.target.value)} className="prod-filter-select">
            {filterOptions.rarities.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </aside>

      <main className="prod-main">
        <header className="prod-header">
          <div>
            <h1>{includeDevCosts ? 'Production Intelligence' : 'Creative Intelligence'}</h1>
            <p style={{ color: 'rgba(255,255,255,0.4)', margin: '0.5rem 0 0' }}>Strategic {includeDevCosts ? 'combined' : 'art-focused'} production dashboard</p>
          </div>
          <div className="prod-date-badge">
            <FiCalendar /> FY {selectedYear}
          </div>
        </header>

        <div className="prod-baseline-note">
          <FiActivity size={14} /> 
          <span>Baseline: All comparisons based on {includeDevCosts ? 'Total Production' : 'Art-Only'} costs vs. previous FY.</span>
        </div>

        <div className="prod-grid">
          {/* NEW: High-Visibility Strategic Projection Section */}
          <section className="prod-section-card full-width projection-hero">
            <div className="section-header" style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <h2>Strategic Projection</h2>
                <DashboardTooltip 
                  title="Run-Rate Forecasting" 
                  content="This section uses your current monthly average spend and production speed to estimate where you will finish the fiscal year. It flags if your current 'pace' is sustainable within the defined budget." 
                />
              </div>
            </div>
            <div className="projection-content">
              <div className="projection-main">
                <div className="projection-group">
                  <span className="label">Projected {includeDevCosts ? 'Total' : 'Art'} Spend</span>
                  <span className="value">{formatCurrency(insights.projectedYearEndSpend)}</span>
                  <div className={`projection-badge ${insights.projectedYearEndSpend > budget ? 'danger' : 'success'}`}>
                    <FiActivity /> {insights.projectedYearEndSpend > budget ? 'Exceeds Budget' : 'Under Budget'}
                  </div>
                </div>
                <div className="projection-divider" />
                <div className="projection-group">
                  <span className="label">Projected FY {selectedYear} Inventory</span>
                  <span className="value">{insights.projectedYearEndUnits} Units</span>
                  <div className={`projection-badge ${insights.projectedYearEndUnits >= targetCount ? 'success' : 'warning'}`}>
                    <FiUsers /> {insights.projectedYearEndUnits >= targetCount ? 'Target Met' : 'Below Target'}
                  </div>
                </div>
              </div>
              <div className="projection-footer">
                <p>
                  <FiTrendingUp style={{ marginRight: '0.5rem' }} />
                  Run-rate Analysis: At your current pace of <strong>{formatCurrency(insights.avgMonthlySpend)}/mo</strong>, 
                  you are trending towards <strong>{((insights.projectedYearEndSpend / budget) * 100).toFixed(1)}%</strong> budget utilization.
                </p>
              </div>
            </div>
          </section>

          {/* Top Row: Primary KPIs */}
          <section className="prod-stats-row">
            <div className="prod-stat-card">
              <div className="prod-stat-icon"><FiUsers /></div>
              <div className="prod-stat-info">
                <span className="prod-stat-label">Production Target</span>
                <span className="prod-stat-value">{insights.currentYearCount} / {targetCount}</span>
                <div className="prod-mini-progress">
                  <div className="bar"><motion.div className="fill" initial={{ width: 0 }} animate={{ width: `${Math.min(100, insights.targetProgress)}%` }} /></div>
                  <span className="pct">{insights.targetProgress.toFixed(0)}%</span>
                </div>
                <span className={`prod-stat-trend ${insights.countTrend >= 0 ? 'up' : 'down'}`} style={{ fontSize: '0.7rem', marginTop: '0.4rem' }}>
                  {insights.countTrend >= 0 ? <FiTrendingUp /> : <FiTrendingDown />}
                  {Math.abs(insights.countTrend).toFixed(1)}% 
                </span>
              </div>
            </div>

            <div className="prod-stat-card">
              <div className="prod-stat-icon"><FiDollarSign /></div>
              <div className="prod-stat-info">
                <span className="prod-stat-label">{includeDevCosts ? 'Total Production' : 'Total Art'} Spend</span>
                <span className="prod-stat-value">{formatCurrency(insights.currentYearSpend)}</span>
                <span className={`prod-stat-trend ${insights.spendTrend >= 0 ? 'down' : 'up'}`}>
                  {insights.spendTrend >= 0 ? <FiTrendingUp /> : <FiTrendingDown />}
                  {Math.abs(insights.spendTrend).toFixed(1)}% 
                  <span style={{ opacity: 0.5, marginLeft: '0.3rem', fontSize: '0.65rem' }}>YTD</span>
                </span>
              </div>
            </div>

            <div className="prod-stat-card budget">
              <div className="prod-stat-icon"><FiPieChart /></div>
              <div className="prod-stat-info">
                <span className="prod-stat-label">Budget Consumption</span>
                <span className="prod-stat-value">{insights.budgetPercent.toFixed(1)}%</span>
                <div className="prod-budget-progress">
                  <div className="progress-bar"><motion.div className="progress-fill" initial={{ width: 0 }} animate={{ width: `${Math.min(100, insights.budgetPercent)}%` }} /></div>
                </div>
                <span className="prod-budget-remaining" style={{ marginTop: '0.4rem', display: 'block' }}>{formatCurrency(budget - insights.currentYearSpend)} remaining of {formatCurrency(budget)}</span>
              </div>
            </div>
          </section>

          {/* Middle Row: Rarity Balance & ROI */}
          <section className="prod-section-card full-width">
            <div className="section-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <h2><FiPieChart /> Portfolio Health & Distribution</h2>
                <DashboardTooltip 
                  title="Roster Balance" 
                  content="Tracks how your characters are distributed across Quality (Rarity) and Function (Type). The average costs show the financial 'weight' of each tier compared to last year's performance." 
                />
              </div>
            </div>
            <div className="portfolio-distribution-grid">
              <div className="distribution-column">
                <h3 className="distribution-title">Rarity Breakdown</h3>
                <div className="prod-rarity-grid">
                  {insights.rarityStats.map(([rarity, stats]) => (
                    <div key={rarity} className="rarity-stat-item">
                      <div className="rarity-info">
                        <span className="rarity-name">{rarity}</span>
                        <span className="rarity-count">{stats.count} Units</span>
                      </div>
                      <div className="rarity-cost-bar-group">
                        <div className="rarity-bar-bg">
                          <motion.div 
                            className="rarity-bar-fill" 
                            initial={{ width: 0 }} 
                            animate={{ width: `${(stats.count / insights.currentYearCount) * 100}%` }} 
                            style={{ backgroundColor: rarity.toLowerCase().includes('legend') ? '#ffac00' : rarity.toLowerCase().includes('epic') ? '#a335ee' : '#1ca3ec' }}
                          />
                        </div>
                        <div className="rarity-cost-details">
                          <span className="rarity-avg-cost">{formatCurrency(stats.avgCost)}</span>
                          {stats.lyAvgCost > 0 && (
                            <span className={`prod-stat-trend ${stats.avgCost > stats.lyAvgCost ? 'down' : 'up'}`} style={{ fontSize: '0.7rem' }}>
                              {stats.avgCost > stats.lyAvgCost ? <FiTrendingUp /> : <FiTrendingDown />}
                              {stats.avgCost > stats.lyAvgCost ? '+' : '-'}{formatCurrency(Math.abs(stats.avgCost - stats.lyAvgCost))}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="distribution-divider-v" />

              <div className="distribution-column">
                <h3 className="distribution-title">Unit Type Breakdown</h3>
                <div className="prod-rarity-grid">
                  {insights.unitTypeStats.map(([type, stats]) => (
                    <div key={type} className="rarity-stat-item">
                      <div className="rarity-info">
                        <span className="rarity-name">{type}</span>
                        <span className="rarity-count">{stats.count} Units</span>
                      </div>
                      <div className="rarity-cost-bar-group">
                        <div className="rarity-bar-bg">
                          <motion.div 
                            className="rarity-bar-fill" 
                            initial={{ width: 0 }} 
                            animate={{ width: `${(stats.count / insights.currentYearCount) * 100}%` }} 
                            style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                          />
                        </div>
                        <div className="rarity-cost-details">
                          <span className="rarity-avg-cost">{formatCurrency(stats.avgCost)}</span>
                          {stats.lyAvgCost > 0 && (
                            <span className={`prod-stat-trend ${stats.avgCost > stats.lyAvgCost ? 'down' : 'up'}`} style={{ fontSize: '0.7rem' }}>
                              {stats.avgCost > stats.lyAvgCost ? <FiTrendingUp /> : <FiTrendingDown />}
                              {stats.avgCost > stats.lyAvgCost ? '+' : '-'}{formatCurrency(Math.abs(stats.avgCost - stats.lyAvgCost))}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* NEW: Detailed Pipeline Precision Section */}
          <section className="prod-section-card full-width">
            <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <h2><FiActivity /> Pipeline Estimation Precision (Days)</h2>
                <DashboardTooltip 
                  title="Planning Accuracy" 
                  content="Compares the number of days initially estimated for each department against the actual time spent. Values near 100% indicate highly predictable planning, while higher values flag departments that are over-extending." 
                />
              </div>
              <div className="precision-summary-badge">
                Overall Accuracy: <strong>{insights.estimationAccuracy.toFixed(1)}%</strong>
              </div>
            </div>
            <div className="pipeline-precision-grid">
              <div className="phase-stat-card summary">
                <div className="phase-header">
                  <span className="phase-name">Overall Budget</span>
                  <span className={`phase-acc-badge ${insights.estStatus}`}>
                    {insights.variance >= 0 ? '+' : ''}{insights.variance.toFixed(1)}% Variance
                  </span>
                </div>
                <div className="phase-bar-group">
                  <div className="phase-bar-bg">
                    <motion.div 
                      className="phase-bar-fill"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, insights.estimationAccuracy)}%` }}
                      style={{ backgroundColor: insights.variance > 20 ? '#ef4444' : insights.variance < -10 ? '#10b981' : '#f59e0b' }}
                    />
                  </div>
                </div>
                <div className="phase-footer">
                  <span className="phase-delta">{insights.estLabel}</span>
                  <span className="phase-totals">{formatCurrency(Math.abs(insights.estimationDelta))} {insights.estimationDelta > 0 ? 'Over' : 'Under'}</span>
                </div>
              </div>

              {Object.entries(insights.phaseAnalysis).map(([phase, stats]) => {
                const phaseVariance = stats.accuracy - 100;
                return (
                  <div key={phase} className="phase-stat-card">
                    <div className="phase-header">
                      <span className="phase-name">{phase}</span>
                      <span className={`phase-acc-badge ${phaseVariance > 20 ? 'bad' : phaseVariance < -10 ? 'good' : 'perfect'}`}>
                        {phaseVariance >= 0 ? '+' : ''}{phaseVariance.toFixed(0)}%
                      </span>
                    </div>
                    <div className="phase-bar-group">
                      <div className="phase-bar-bg">
                        <motion.div 
                          className="phase-bar-fill"
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, stats.accuracy)}%` }}
                          style={{ backgroundColor: phaseVariance > 20 ? '#ef4444' : phaseVariance < -10 ? '#10b981' : '#f59e0b' }}
                        />
                      </div>
                    </div>
                    <div className="phase-footer">
                      <span className="phase-delta">
                        {stats.delta === 0 ? 'On Target' : `${Math.abs(stats.delta).toFixed(1)} days ${stats.delta > 0 ? 'over' : 'under'}`}
                      </span>
                      <span className="phase-totals">{stats.totalAct.toFixed(0)} / {stats.totalEst.toFixed(0)}d</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Bottom Row: Productivity Analysis */}
          <section className="prod-section-card full-width">
            <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <h2><FiActivity /> Creation Efficiency Index</h2>
                <DashboardTooltip 
                  title="Unit Velocity & ROI" 
                  content="A collection of advanced metrics tracking production speed (Cadence) and the 'Cost of Quality' (the premium paid for high-rarity units). It measures the overall health of your production pipeline." 
                />
              </div>
            <div className="efficiency-legend">
                <span title="The cost ratio between (Legendary+Epic) and (Common+Uncommon) units">Cost of Quality: </span>
                <span className="multiplier">
                  {insights.efficiencyMultiplier.toFixed(1)}x
                </span>
                <span className={`prod-stat-trend ${insights.multiplierTrend <= 0 ? 'up' : 'down'}`} style={{ display: 'inline-flex', marginLeft: '0.5rem', fontSize: '0.75rem' }}>
                  {insights.multiplierTrend >= 0 ? <FiTrendingUp /> : <FiTrendingDown />}
                  {Math.abs(insights.multiplierTrend).toFixed(1)}% 
                </span>
                <p style={{ fontSize: '0.65rem', opacity: 0.4, margin: '0.2rem 0 0' }}>High-tier vs. Low-tier average ratio</p>
              </div>
            </div>
            <div className="efficiency-grid">
              <div className="efficiency-metric">
                <span className="label">Avg Monthly Spend</span>
                <span className="value">{formatCurrency(insights.avgMonthlySpend)}</span>
                <span className={`prod-stat-trend ${insights.monthlySpendTrend <= 0 ? 'up' : 'down'}`} style={{ fontSize: '0.75rem' }}>
                  {insights.monthlySpendTrend >= 0 ? <FiTrendingUp /> : <FiTrendingDown />}
                  {Math.abs(insights.monthlySpendTrend).toFixed(1)}% 
                </span>
              </div>
              <div className="efficiency-metric">
                <span className="label">Release Cadence</span>
                <span className="value">
                  {insights.currentYearCount > 0 
                    ? `Every ${insights.currentCadence.toFixed(1)} days` 
                    : '0 units'}
                </span>
                <span className={`prod-stat-trend ${insights.cadenceTrend >= 0 ? 'up' : 'down'}`} style={{ fontSize: '0.75rem' }}>
                  {insights.cadenceTrend >= 0 ? <FiTrendingUp /> : <FiTrendingDown />}
                  {Math.abs(insights.cadenceTrend).toFixed(1)}% {insights.cadenceTrend >= 0 ? 'faster' : 'slower'}
                </span>
              </div>
              <div className="efficiency-metric">
                <span className="label">Cost Stability</span>
                <span className="value" style={{ color: insights.multiplierTrend > 15 ? '#ef4444' : 'inherit' }}>
                  {insights.multiplierTrend > 15 ? 'Volatile' : 'Stable'}
                </span>
                <p style={{ marginTop: '0.5rem', color: 'rgba(255,255,255,0.4)' }}>
                  {insights.multiplierTrend > 15 ? 'Premium gap is widening' : 'Standardized rarity costs'}
                </p>
              </div>
            </div>
            </section>

            {/* NEW: Strategic Guidance Card */}
            <section className={`prod-section-card recommendation-card ${insights.recommendationType}`}>
              <div className="section-header">
                <h2><FiActivity /> Strategic Guidance</h2>
              </div>
              <div className="recommendation-content">
                <p className="recommendation-text">{insights.recommendation}</p>
                <div className="recommendation-status">
                  Status: <strong>{insights.recommendationType.toUpperCase()}</strong>
                </div>
              </div>
            </section>

            {/* New Detailed Faction Insight */}
            <section className="prod-section-card">
            <div className="section-header">
              <h2><FiActivity /> Most Expensive Faction</h2>
            </div>
            <div className="prod-stat-info">
              <span className="prod-stat-value" style={{ fontSize: '1.4rem' }}>{insights.mostExpensiveFactionName}</span>
              <span className="prod-stat-label" style={{ marginTop: '0.5rem' }}>Average Cost: {formatCurrency(insights.mostExpensiveFactionCost)}</span>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', marginTop: '1rem' }}>
                This faction currently requires the highest visual and development investment per unit in {selectedYear}.
              </p>
            </div>
            </section>

        </div>
      </main>
    </div>
  );
}
