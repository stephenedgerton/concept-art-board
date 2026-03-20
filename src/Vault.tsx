import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUpload, FiSearch, FiTrash2, FiX, FiImage, FiFilter, FiVideo, FiPlus, FiEdit2, FiCheckSquare, FiBookOpen, FiLink, FiHome, FiLayers } from 'react-icons/fi';
import { clsx } from 'clsx';
import {
  addArtwork, getAllArtworks, deleteArtwork,
  getTags, addTagToCategory, updateArtwork, renameCategoryTag
} from './lib/db';
import type { ConceptArt, AssetType } from './lib/db';
import { createLowResVideo } from './lib/ffmpeg';
import './App.css';

export const cleanName = (name: string) => name.replace(/_/g, ' ').replace(/\s*v\d+\s*$/i, '').trim();

interface VaultProps {
  onBackToLanding: () => void;
}

export default function Vault({ onBackToLanding }: VaultProps) {
  const [activeTab, setActiveTab] = useState<AssetType>('concept-art');
  const [artworks, setArtworks] = useState<ConceptArt[]>([]);
  const [loading, setLoading] = useState(true);
  const [healthError, setHealthError] = useState<string | null>(null);

  const [isUploadModalOpen, setUploadModalOpen] = useState(false);
  const [draggedFiles, setDraggedFiles] = useState<File[]>([]);
  const [viewerArt, setViewerArt] = useState<ConceptArt | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'name-asc' | 'name-desc'>('name-asc');

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkEditModalOpen, setBulkEditModalOpen] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const [playOnHover, setPlayOnHover] = useState(true);
  const [showTags, setShowTags] = useState(true);

  // Custom Tag Categories state
  const [categoryTags, setCategoryTags] = useState<Record<string, string[]>>({});

  // Create object mapping categories to selected tags for filtering
  const [filters, setFilters] = useState<Record<string, string[]>>({
    race: [],
    faction: [],
    combatType: [],
    baseMesh: [],
    element: [],
    unitType: [],
    rarity: [],
    animationType: [],
    vfxType: [],
    abilityAction: []
  });

  const [zoom, setZoom] = useState(1);
  const [selectionBox, setSelectionBox] = useState<{ start: { x: number, y: number }, end: { x: number, y: number } } | null>(null);
  const galleryRef = useRef<HTMLDivElement>(null);

  const tagCounts = useMemo(() => {
    const counts: Record<string, Record<string, number>> = {};
    const relevantArtworks = artworks.filter(art => art.type === activeTab);
    relevantArtworks.forEach(art => {
      Object.entries(art.tags).forEach(([category, value]) => {
        if (!counts[category]) counts[category] = {};
        if (Array.isArray(value)) {
          value.forEach(v => {
            counts[category][v] = (counts[category][v] || 0) + 1;
          });
        } else if (value) {
          counts[category][value] = (counts[category][value] || 0) + 1;
        }
      });
    });
    return counts;
  }, [artworks, activeTab]);

  const loadData = async () => {
    try {
      const healthRes = await fetch('/api/health').catch(() => { throw new Error("Connection failed"); });
      const health = await healthRes.json();
      if (health.status === 'error') {
        setHealthError(health.message);
      } else {
        setHealthError(null);
      }

      const [data, tagsData] = await Promise.all([
        getAllArtworks(),
        getTags()
      ]);
      setArtworks(data);
      setCategoryTags(tagsData as unknown as Record<string, string[]>);
    } catch (error) {
      console.error('Failed to load art:', error);
      setHealthError("Unable to connect to Egnyte. Please start the Egnyte desktop app.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!selectionBox) return;

    const handleMouseMove = (e: MouseEvent) => {
      setSelectionBox(prev => prev ? { ...prev, end: { x: e.clientX, y: e.clientY } } : null);

      // Calculate intersection
      const x1 = Math.min(selectionBox.start.x, e.clientX);
      const y1 = Math.min(selectionBox.start.y, e.clientY);
      const x2 = Math.max(selectionBox.start.x, e.clientX);
      const y2 = Math.max(selectionBox.start.y, e.clientY);

      const cards = document.querySelectorAll('.static-card');
      const newSelected = new Set(selectedIds);
      let changed = false;
      
      cards.forEach((card: any) => {
        const rect = card.getBoundingClientRect();
        const id = card.getAttribute('data-id');
        if (!id) return;

        const isIntersecting = !(rect.left > x2 || rect.right < x1 || rect.top > y2 || rect.bottom < y1);
        
        if (isIntersecting && !newSelected.has(id)) {
          newSelected.add(id);
          changed = true;
        }
      });

      if (changed) {
        setSelectedIds(newSelected);
      }
    };

    const handleMouseUp = () => {
      setSelectionBox(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [selectionBox, isSelectionMode, selectedIds]);

  const toggleFilter = (category: string, value: string) => {
    setFilters(prev => {
      const current = prev[category] || [];
      const updated = current.includes(value)
        ? current.filter(item => item !== value)
        : [...current, value];
      return { ...prev, [category]: updated };
    });
  };

  const clearFilters = () => {
    setFilters({
      race: [], faction: [], combatType: [], baseMesh: [],
      element: [], unitType: [], rarity: [], animationType: [], vfxType: []
    });
    setSearchQuery('');
  };

  // Define which tag categories are active for the active tab
  const getActiveCategories = useCallback(() => {
    switch (activeTab) {
      case 'concept-art':
        return ['race', 'faction', 'combatType', 'baseMesh', 'element', 'unitType', 'rarity'];
      case 'animation':
        return ['baseMesh', 'animationType', 'abilityTags'];
      case 'vfx':
        return ['element', 'vfxType'];
      case 'ability-icons':
        return ['element', 'characterName', 'abilityAction'];
      case 'references':
        return ['referenceType'];
      default:
        return [];
    }
  }, [activeTab]);

  const activeCategories = getActiveCategories();

  const filteredArtworks = useMemo(() => {
    const result = artworks.filter(art => {
      if (art.type !== activeTab) return false;

      // Name Search
      if (searchQuery && !art.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Tag Filters
      for (const [cat, selectedValues] of Object.entries(filters)) {
        if (selectedValues.length === 0) continue;

        const artValue = art.tags[cat as keyof typeof art.tags];
        if (!artValue) return false;
        // Array-valued tags (e.g. vfxType) — asset must contain at least one selected value
        if (Array.isArray(artValue)) {
          if (!selectedValues.some(sv => artValue.includes(sv))) return false;
        } else {
          if (!selectedValues.includes(artValue as string)) return false;
        }
      }

      return true;
    });

    return result.sort((a, b) => {
      if (sortBy === 'date-desc') return b.createdAt - a.createdAt;
      if (sortBy === 'date-asc') return a.createdAt - b.createdAt;
      if (sortBy === 'name-asc') return cleanName(a.name).localeCompare(cleanName(b.name));
      if (sortBy === 'name-desc') return cleanName(b.name).localeCompare(cleanName(a.name));
      return 0;
    });
  }, [artworks, filters, searchQuery, activeTab, sortBy, activeCategories]);

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this asset?')) {
      await deleteArtwork(id);
      loadData();
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkUpdate = async (newTags: Record<string, string | string[]>) => {
    try {
      // Process updates sequentially to avoid race conditions and overwhelming the server
      for (const id of Array.from(selectedIds)) {
        const art = artworks.find(a => a.id === id);
        if (art) {
          const mergedTags = { ...art.tags };
          for (const [k, v] of Object.entries(newTags)) {
            if (v === 'CLEAR_TAG') {
              delete mergedTags[k as keyof typeof mergedTags];
            } else if (Array.isArray(v)) {
              (mergedTags as any)[k] = v.length > 0 ? v : undefined;
            } else if (v) {
              (mergedTags as any)[k] = v;
            }
          }
          await updateArtwork(id, { tags: mergedTags });
        }
      }
      setSelectedIds(new Set());
      loadData();
      setBulkEditModalOpen(false);
    } catch (e) {
      console.error(e);
      alert('Failed to bulk update');
    }
  };


  const handleGlobalDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setDraggedFiles(Array.from(e.dataTransfer.files));
      setUploadModalOpen(true);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isSelectionMode || e.button !== 0) return;

    // Only start if clicking on the gallery container itself or the grid
    const target = e.target as HTMLElement;
    if (!target.closest('.gallery-container') || target.closest('button') || target.closest('select') || target.closest('input')) return;

    e.preventDefault(); // Prevent native selection/marquee

    setSelectionBox({
      start: { x: e.clientX, y: e.clientY },
      end: { x: e.clientX, y: e.clientY }
    });
  };

  return (
    <div
      className="app-container"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleGlobalDrop}
      onMouseDown={handleMouseDown}
    >
      {healthError && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          backgroundColor: 'hsl(0 80% 50%)',
          color: 'white',
          padding: '0.8rem 1.5rem',
          zIndex: 10000,
          textAlign: 'center',
          fontWeight: 600,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem'
        }}>
          <FiX size={20} />
          <span>{healthError}</span>
          <button 
            onClick={() => loadData()} 
            style={{ 
              backgroundColor: 'white', 
              color: 'black', 
              border: 'none', 
              padding: '0.3rem 0.8rem', 
              borderRadius: '4px', 
              cursor: 'pointer',
              fontSize: '0.8rem'
            }}
          >
            Retry Connection
          </button>
        </div>
      )}
      {/* Sidebar Filters */}
      <aside className="sidebar">
        <div className="brand-container">
          <div className="brand">
            <img src="/backgrounds/logo_website_tab_32x32.png" alt="ArtNexus Logo" style={{ width: '24px', height: '24px', marginRight: '8px' }} /> ArtNexus
          </div>
          <button 
            className="back-home-btn" 
            onClick={onBackToLanding}
            title="Back to Landing"
          >
            <FiHome size={18} />
          </button>
        </div>

        <button className="upload-button" onClick={() => setUploadModalOpen(true)}>
          <FiUpload /> Upload Assets
        </button>

        <div className="tabs">
          <button
            className={clsx('tab', activeTab === 'concept-art' && 'active')}
            onClick={() => { setActiveTab('concept-art'); clearFilters(); setSelectedIds(new Set()); setIsSelectionMode(false); setSortBy('name-asc'); setZoom(1); }}
          >
            <FiImage /> Concept Art
          </button>
          <button
            className={clsx('tab', activeTab === 'animation' && 'active')}
            onClick={() => { setActiveTab('animation'); clearFilters(); setSelectedIds(new Set()); setIsSelectionMode(false); setSortBy('name-asc'); setZoom(1); }}
          >
            <FiVideo /> Animations
          </button>
          <button
            className={clsx('tab', activeTab === 'vfx' && 'active')}
            onClick={() => { setActiveTab('vfx'); clearFilters(); setSelectedIds(new Set()); setIsSelectionMode(false); setSortBy('name-asc'); setZoom(1); }}
          >
            <FiVideo /> VFX
          </button>
          <button
            className={clsx('tab', activeTab === 'ability-icons' && 'active')}
            onClick={() => { setActiveTab('ability-icons'); clearFilters(); setSelectedIds(new Set()); setIsSelectionMode(false); setSortBy('name-asc'); setZoom(1.25); }}
          >
            <FiImage /> Ability Icons
          </button>
          <button
            className={clsx('tab', activeTab === 'references' && 'active')}
            onClick={() => { setActiveTab('references'); clearFilters(); setSelectedIds(new Set()); setIsSelectionMode(false); setSortBy('name-asc'); setZoom(1); }}
          >
            <FiBookOpen /> References
          </button>
        </div>

        <div className="filter-section">
          {activeCategories.map(category => (
            <FilterGroup
              key={category}
              category={category}
              options={categoryTags[category] || []}
              selected={filters[category] || []}
              counts={tagCounts[category] || {}}
              onToggle={val => toggleFilter(category, val)}
              onAddTag={async (newTag) => {
                await addTagToCategory(category as any, newTag);
                loadData();
              }}
              onRenameTag={async (oldTag, newTag) => {
                await renameCategoryTag(category as any, oldTag, newTag);
                loadData();
              }}
            />
          ))}
        </div>
      </aside>

      {/* Main Content (Infinite Canvas) */}
      <main className="main-content">
        <header className="header">
          <div className="search-bar">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginRight: '1rem', color: 'hsl(var(--text-dim))' }}>
              <FiSearch size={14} />
              <input
                type="range"
                min={activeTab === 'ability-icons' ? 80 : 200}
                max={activeTab === 'ability-icons' ? 240 : 600}
                step={activeTab === 'ability-icons' ? 10 : 20}
                value={activeTab === 'ability-icons' ? zoom * 120 : zoom * 280}
                onChange={(e) => setZoom(parseInt(e.target.value) / (activeTab === 'ability-icons' ? 120 : 280))}
                style={{ width: '100px', cursor: 'pointer' }}
                title="Adjust Size"
              />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.9rem', color: 'hsl(var(--text-dim))' }}>
              <input
                type="checkbox"
                checked={playOnHover}
                onChange={e => setPlayOnHover(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              Play on Hover
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.9rem', color: 'hsl(var(--text-dim))' }}>
              <input
                type="checkbox"
                checked={showTags}
                onChange={e => setShowTags(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              Show Tags
            </label>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="form-control"
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', width: 'auto', backgroundColor: 'transparent' }}
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
            </select>
            <button
              className="clear-filters"
              onClick={() => {
                setIsSelectionMode(!isSelectionMode);
                if (isSelectionMode) setSelectedIds(new Set());
              }}
              style={isSelectionMode ? { backgroundColor: 'hsl(var(--surface-hover))', display: 'flex', alignItems: 'center', gap: '0.4rem' } : { display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <FiCheckSquare /> {isSelectionMode ? 'Cancel Selection' : 'Select Multiple'}
            </button>
            {selectedIds.size > 0 && isSelectionMode && (
              <button
                className="clear-filters"
                onClick={() => setBulkEditModalOpen(true)}
                style={{ backgroundColor: 'hsl(var(--primary))', color: 'white', borderColor: 'hsl(var(--primary))' }}
              >
                Bulk Edit Tags ({selectedIds.size})
              </button>
            )}
            <button className="clear-filters" onClick={clearFilters}>
              Clear Filters
            </button>
          </div>
        </header>

        <section className="gallery-container">
          {loading ? (
            <div className="empty-state">
              <div className="spinner" />
              <p>Loading library...</p>
            </div>
          ) : filteredArtworks.length === 0 ? (
            <div className="empty-state">
              <FiFilter size={48} />
              <h2>No assets found</h2>
              <p>Upload some awesome {activeTab.replace('-', ' ')} or adjust your filters.</p>
            </div>
          ) : (
            <div
              className="gallery-grid"
              style={{ gridTemplateColumns: activeTab === 'ability-icons'
                ? `repeat(auto-fill, minmax(${Math.max(80, Math.min(zoom * 120, 200))}px, 1fr))`
                : `repeat(auto-fill, minmax(${Math.max(200, Math.min(zoom * 280, 600))}px, 1fr))` }}
            >
              <AnimatePresence mode="popLayout">
                {filteredArtworks.map(art => (
                  <div key={art.id} className="static-card" data-id={art.id}>
                    <StaticArtwork
                      art={art}
                      onDelete={() => handleDelete(art.id)}
                      onClick={() => {
                        if (isSelectionMode) toggleSelection(art.id);
                        else setViewerArt(art);
                      }}
                      selected={selectedIds.has(art.id)}
                      isSelectionMode={isSelectionMode}
                      playOnHover={playOnHover}
                      showTags={showTags}
                    />
                  </div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </section>
      </main>

      {/* Selection Marquee */}
      {selectionBox && (
        <div 
          className="selection-marquee"
          style={{
            left: Math.min(selectionBox.start.x, selectionBox.end.x),
            top: Math.min(selectionBox.start.y, selectionBox.end.y),
            width: Math.abs(selectionBox.start.x - selectionBox.end.x),
            height: Math.abs(selectionBox.start.y - selectionBox.end.y),
          }}
        />
      )}

      {/* Modals */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <UploadModal
            onClose={() => { setUploadModalOpen(false); setDraggedFiles([]); }}
            onUploadSuccess={loadData}
            categoryTags={categoryTags}
            activeTab={activeTab}
            preloadedFiles={draggedFiles}
          />
        )}
        {viewerArt && (
          <ViewerModal
            art={viewerArt}
            categoryTags={categoryTags}
            onUpdateSuccess={(art) => { setViewerArt(art); loadData(); }}
            onClose={() => setViewerArt(null)}
          />
        )}
        {isBulkEditModalOpen && (
          <BulkEditModal
            onClose={() => setBulkEditModalOpen(false)}
            onSave={handleBulkUpdate}
            activeCategories={activeCategories}
            categoryTags={categoryTags}
            selectedString={`Editing ${selectedIds.size} assets`}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// -------------------------------------------------------------------------------- //

function FilterGroup({
  category, options, selected, counts, onToggle, onAddTag, onRenameTag
}: {
  category: string;
  options: string[];
  selected: string[];
  counts: Record<string, number>;
  onToggle: (val: string) => void;
  onAddTag: (val: string) => void;
  onRenameTag: (oldTag: string, newTag: string) => void;
}) {
  const [newTag, setNewTag] = useState('');
  const [adding, setAdding] = useState(false);
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  return (
    <div className="filter-group">
      <h3>{category.replace(/([A-Z])/g, ' $1').trim()}</h3>
      {options.map(option => (
        <div key={option} className="filter-option-row">
          {editingTag === option ? (
            <input
              type="text"
              autoFocus
              className="form-control"
              style={{ padding: '0.2rem', fontSize: '0.85rem', flex: 1 }}
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              onBlur={() => {
                if (editValue !== option) onRenameTag(option, editValue);
                setEditingTag(null);
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (editValue !== option) onRenameTag(option, editValue);
                  setEditingTag(null);
                } else if (e.key === 'Escape') {
                  setEditingTag(null);
                }
              }}
            />
          ) : (
            <>
              <label className="filter-option" style={{ flex: 1 }}>
                <input
                  type="checkbox"
                  checked={selected.includes(option)}
                  onChange={() => onToggle(option)}
                />
                <span style={{ fontSize: '0.85rem' }}>{option}</span>
              </label>
              {counts[option] > 0 && (
                <span className="tag-count">{counts[option]}</span>
              )}
              <div className="tag-actions">
                <button
                  className="add-tag-btn"
                  style={{ padding: '0.2rem', margin: 0, opacity: 0.5 }}
                  onClick={() => { setEditingTag(option); setEditValue(option); }}
                  title="Edit tag"
                >
                  <FiEdit2 size={12} />
                </button>
                <button
                  className="add-tag-btn"
                  style={{ padding: '0.2rem', margin: 0, opacity: 0.5, color: 'var(--danger)' }}
                  onClick={() => { if (window.confirm(`Delete tag "${option}"?`)) onRenameTag(option, ''); }}
                  title="Delete tag"
                >
                  <FiX size={12} />
                </button>
              </div>
            </>
          )}
        </div>
      ))}

      {adding ? (
        <form onSubmit={e => {
          e.preventDefault();
          if (newTag) {
            onAddTag(newTag);
            setNewTag('');
            setAdding(false);
          }
        }} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
          <input
            type="text"
            autoFocus
            className="form-control"
            style={{ padding: '0.4rem', fontSize: '0.8rem' }}
            value={newTag}
            onChange={e => setNewTag(e.target.value)}
            placeholder="New tag..."
          />
        </form>
      ) : (
        <button className="add-tag-btn" onClick={() => setAdding(true)}>
          <FiPlus /> Add custom tag...
        </button>
      )}
    </div>
  );
}

// -------------------------------------------------------------------------------- //

function useVisibility(rootMargin = '400px') {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { rootMargin, threshold: 0 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [rootMargin]);

  return { ref, isVisible };
}

// -------------------------------------------------------------------------------- //

function UploadModal({
  onClose, onUploadSuccess, categoryTags, activeTab, preloadedFiles
}: {
  onClose: () => void; onUploadSuccess: () => void; categoryTags: Record<string, string[]>;
  activeTab: AssetType;
  preloadedFiles?: File[];
}) {
  const [files, setFiles] = useState<File[]>(preloadedFiles && preloadedFiles.length > 0 ? preloadedFiles : []);

  // Try to intelligently guess type initially based on first preloaded file
  const initialType = (preloadedFiles && preloadedFiles.length > 0 && preloadedFiles[0].type.includes('video'))
    ? (activeTab === 'concept-art' || activeTab === 'ability-icons' || activeTab === 'references' ? 'animation' : activeTab)
    : activeTab;

  const [targetType, setTargetType] = useState<AssetType>(initialType);

  const [tags, setTags] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const activeCategories = useMemo(() => {
    switch (targetType) {
      case 'concept-art': return ['race', 'faction', 'combatType', 'baseMesh', 'element', 'unitType', 'rarity'];
      case 'animation': return ['baseMesh', 'animationType', 'abilityTags'];
      case 'vfx': return ['element', 'vfxType'];
      case 'ability-icons': return ['element', 'characterName'];
      case 'references': return ['referenceType'];
      default: return [];
    }
  }, [targetType]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) return alert('Files are required');

    setSaving(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        let compressedBlob: Blob | undefined;

        // Generate low res format if it is an animation or vfx
        if (targetType === 'animation' || targetType === 'vfx') {
          // Provide feedback to UI that we are compressing...
          console.log(`Compressing ${file.name}...`);
          try {
            compressedBlob = await createLowResVideo(file);
          } catch (err) {
            console.error(`Failed to compress ${file.name}, using original`, err);
          }
        }

        await addArtwork({
          name: cleanName(file.name.split('.')[0]),
          blob: file,
          compressedBlob,
          type: targetType,
          tags,
        });
      }
      onUploadSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to save batch');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="modal-content"
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 50, opacity: 0 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>Upload Assets to Vault</h2>
          <button className="close-button" onClick={onClose}><FiX /></button>
        </div>

        <form onSubmit={handleSave}>
          <div className="form-group">
            <label>Select Assets *</label>
            <div
              className={clsx("file-drop-area", files.length > 0 && "has-files")}
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('drag-active'); }}
              onDragLeave={(e) => { e.currentTarget.classList.remove('drag-active'); }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('drag-active');
                if (e.dataTransfer.files) setFiles(Array.from(e.dataTransfer.files));
              }}
            >
              <input
                type="file"
                accept="image/*,video/mp4,video/webm,video/quicktime,.mov"
                multiple
                onChange={handleFile}
                style={{ display: 'none' }}
                id="file-upload"
              />
              <label htmlFor="file-upload" className="file-drop-content" style={{ cursor: 'pointer', display: 'flex' }}>
                <FiUpload size={32} />
                <span>Click to browse for images/videos (Batch upload supported)</span>
              </label>
            </div>

            {files.length > 0 && (
              <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'hsl(var(--primary))' }}>
                {files.length} file(s) selected ready for upload.
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Asset Type</label>
            <div className="tabs" style={{ marginBottom: 0 }}>
              <button type="button" className={clsx('tab', targetType === 'concept-art' && 'active')} onClick={() => setTargetType('concept-art')}>Concept Art</button>
              <button type="button" className={clsx('tab', targetType === 'animation' && 'active')} onClick={() => setTargetType('animation')}>Animations</button>
              <button type="button" className={clsx('tab', targetType === 'vfx' && 'active')} onClick={() => setTargetType('vfx')}>VFX</button>
              <button type="button" className={clsx('tab', targetType === 'ability-icons' && 'active')} onClick={() => setTargetType('ability-icons')}>Ability Icons</button>
              <button type="button" className={clsx('tab', targetType === 'references' && 'active')} onClick={() => setTargetType('references')}>References</button>
              </div>          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.5rem' }}>
            {activeCategories.map((category) => {
              const isMultiSelect = category === 'vfxType';
              if (isMultiSelect) {
                const selectedVals: string[] = (tags[category] as any) || [];
                const toggleVal = (opt: string) => {
                  const arr = Array.isArray(selectedVals) ? selectedVals : [];
                  const next = arr.includes(opt) ? arr.filter(v => v !== opt) : [...arr, opt];
                  setTags({ ...tags, [category]: next as any });
                };
                return (
                  <div key={category} className="form-group" style={{ marginBottom: 0, gridColumn: '1 / -1' }}>
                    <label>{category.replace(/([A-Z])/g, ' $1').trim()}</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.4rem' }}>
                      {(categoryTags[category] || []).map(opt => (
                        <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer', fontSize: '0.85rem', padding: '0.3rem 0.7rem', borderRadius: '6px', background: selectedVals.includes(opt) ? 'hsl(var(--primary) / 0.25)' : 'hsl(var(--surface-hover))', border: selectedVals.includes(opt) ? '1px solid hsl(var(--primary))' : '1px solid var(--border)', color: selectedVals.includes(opt) ? 'hsl(var(--primary))' : 'var(--text)', userSelect: 'none' }}>
                          <input type="checkbox" checked={selectedVals.includes(opt)} onChange={() => toggleVal(opt)} style={{ display: 'none' }} />
                          {opt}
                        </label>
                      ))}
                    </div>
                  </div>
                );
              }
              return (
                <div key={category} className="form-group" style={{ marginBottom: 0 }}>
                  <label>{category.replace(/([A-Z])/g, ' $1').trim()}</label>
                  <select
                    className="form-control"
                    value={(tags[category] as string) || ''}
                    onChange={e => setTags({ ...tags, [category]: e.target.value as any })}
                  >
                    <option value="">None</option>
                    {(categoryTags[category] || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
              );
            })}
          </div>

          <button type="submit" className="submit-button" disabled={saving || files.length === 0}>
            {saving ? 'Saving...' : `Save ${files.length} Asset(s)`}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

function ViewerModal({ art, categoryTags, onClose, onUpdateSuccess }: {
  art: ConceptArt;
  categoryTags: Record<string, string[]>;
  onClose: () => void;
  onUpdateSuccess: (art: ConceptArt) => void;
}) {
  const [url, setUrl] = useState<string>('');

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(art.name);
  const [editTags, setEditTags] = useState(art.tags);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setUrl(art.compressedUrl || art.originalUrl);
  }, [art.originalUrl, art.compressedUrl]);

  useEffect(() => {
    setEditName(art.name);
    setEditTags(art.tags);
  }, [art]);

  const activeCategories = useMemo(() => {
    switch (art.type) {
      case 'concept-art': return ['race', 'faction', 'combatType', 'baseMesh', 'element', 'unitType', 'rarity'];
      case 'animation': return ['baseMesh', 'animationType', 'abilityTags'];
      case 'vfx': return ['element', 'vfxType'];
      case 'ability-icons': return ['element', 'characterName'];
      case 'references': return ['referenceType'];
      default: return [];
    }
  }, [art.type]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateArtwork(art.id, { name: editName, tags: editTags });
      onUpdateSuccess({ ...art, name: editName, tags: editTags });
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      alert('Failed to save details');
    } finally {
      setSaving(false);
    }
  };

  const isVideo = art.type === 'animation' || art.type === 'vfx' || (url || art.originalUrl).toLowerCase().endsWith('.mp4') || (url || art.originalUrl).toLowerCase().endsWith('.mov') || (url || art.originalUrl).toLowerCase().endsWith('.webm');

  return (
    <motion.div
      className="viewer-modal"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="viewer-header">
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            className="copy-link-btn" 
            onClick={() => {
              const fullUrl = window.location.origin + art.originalUrl;
              navigator.clipboard.writeText(fullUrl);
              alert('Link copied to clipboard!');
            }}
            title="Copy link to asset"
          >
            <FiLink /> Copy Link
          </button>
        </div>
        <button className="close-button" onClick={onClose}><FiX size={32} /></button>
      </div>

      <div className="viewer-layout">
        <div className="viewer-content">
          <motion.div
            className="viewer-image-container"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            {isVideo ? (
              <video src={url} controls autoPlay loop className="viewer-image" />
            ) : (
              <img src={url} alt={art.name} className="viewer-image" />
            )}
          </motion.div>
        </div>

        <aside className="viewer-sidebar" style={{ display: 'flex', flexDirection: 'column' }}>
          {isEditing ? (
            <input
              className="form-control"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              style={{ marginBottom: '2rem', fontSize: '1.2rem', fontWeight: 600 }}
            />
          ) : (
            <h2 className="viewer-title" style={{ marginBottom: '2rem' }}>{cleanName(art.name)}</h2>
          )}

          <div className="metadata-group">
            <div className="metadata-label">Asset Type</div>
            <div className="metadata-value" style={{ textTransform: 'capitalize' }}>
              {art.type.replace('-', ' ')}
            </div>
          </div>

          {activeCategories.map(category => {
            // Multi-select categories (vfxType supports multiple values)
            const isMultiSelect = category === 'vfxType';

            if (isEditing) {
              if (isMultiSelect) {
                const selectedVals: string[] = (editTags[category as keyof typeof editTags] as any) || [];
                const toggleVal = (opt: string) => {
                  const arr = Array.isArray(selectedVals) ? selectedVals : [];
                  const next = arr.includes(opt) ? arr.filter(v => v !== opt) : [...arr, opt];
                  setEditTags({ ...editTags, [category]: next as any });
                };
                return (
                  <div key={category} className="metadata-group">
                    <div className="metadata-label">{category.replace(/([A-Z])/g, ' $1').trim()}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.4rem' }}>
                      {(categoryTags[category] || []).map(opt => (
                        <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer', fontSize: '0.85rem', padding: '0.2rem 0.5rem', borderRadius: '6px', background: selectedVals.includes(opt) ? 'hsl(var(--primary) / 0.25)' : 'hsl(var(--surface-hover))', border: selectedVals.includes(opt) ? '1px solid hsl(var(--primary))' : '1px solid var(--border)', color: selectedVals.includes(opt) ? 'hsl(var(--primary))' : 'var(--text)' }}>
                          <input type="checkbox" checked={selectedVals.includes(opt)} onChange={() => toggleVal(opt)} style={{ display: 'none' }} />
                          {opt}
                        </label>
                      ))}
                    </div>
                  </div>
                );
              }
              return (
                <div key={category} className="metadata-group">
                  <div className="metadata-label">{category.replace(/([A-Z])/g, ' $1').trim()}</div>
                  <select
                    className="form-control"
                    value={editTags[category as keyof typeof editTags] as string || ''}
                    onChange={e => setEditTags({ ...editTags, [category]: e.target.value as any })}
                  >
                    <option value="">None</option>
                    {(categoryTags[category] || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
              );
            }

            const value = art.tags[category as keyof typeof art.tags];
            if (!value || (Array.isArray(value) && value.length === 0)) return null;
            return (
              <div key={category} className="metadata-group">
                <div className="metadata-label">{category.replace(/([A-Z])/g, ' $1').trim()}</div>
                <div className="metadata-value" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {Array.isArray(value)
                    ? value.map(v => <span key={v} className="tag-badge vfxType">{v}</span>)
                    : value
                  }
                </div>
              </div>
            );
          })}

          <div className="metadata-group" style={{ marginTop: '2rem' }}>
            <div className="metadata-label">Added On</div>
            <div className="metadata-value">
              {new Date(art.createdAt).toLocaleDateString()} at {new Date(art.createdAt).toLocaleTimeString()}
            </div>
          </div>

          <div style={{ marginTop: 'auto', paddingTop: '2rem' }}>
            {isEditing ? (
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button className="submit-button" onClick={handleSave} disabled={saving} style={{ marginTop: 0, flex: 2 }}>{saving ? 'Saving...' : 'Save Changes'}</button>
                <button className="clear-filters" onClick={() => setIsEditing(false)} style={{ flex: 1, textAlign: 'center' }}>Cancel</button>
              </div>
            ) : (
              <button className="submit-button" onClick={() => setIsEditing(true)} style={{ marginTop: 0 }}>Edit Properties</button>
            )}
          </div>
        </aside>
      </div>
    </motion.div>
  );
}

// -------------------------------------------------------------------------------- //

function StaticArtwork({ art, onDelete, onClick, selected, isSelectionMode, playOnHover, showTags }: {
  art: ConceptArt; onDelete: () => void; onClick: () => void;
  selected: boolean; isSelectionMode: boolean; playOnHover: boolean;
  showTags: boolean;
}) {
  const [url, setUrl] = useState<string>('');
  const [isHovered, setIsHovered] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const isVideo = art.type === 'animation' || art.type === 'vfx' || (url || art.originalUrl).toLowerCase().endsWith('.mp4') || (url || art.originalUrl).toLowerCase().endsWith('.mov') || (url || art.originalUrl).toLowerCase().endsWith('.webm');

  const { ref, isVisible } = useVisibility();

  useEffect(() => {
    if (isVisible && !url) {
      setUrl(art.compressedUrl || art.originalUrl);
    }
  }, [art.originalUrl, art.compressedUrl, isVisible, url]);

  useEffect(() => {
    if (isVideo && videoRef.current) {
      const shouldPlay = isVisible && (!playOnHover || isHovered);
      if (shouldPlay) {
        videoRef.current.play().catch(() => { });
      } else {
        videoRef.current.pause();
      }
    }
  }, [playOnHover, isHovered, isVideo, isVisible]);

  return (
    <motion.div
      ref={ref}
      className="static-card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div
        className="art-card"
        onClick={onClick}
        style={selected && isSelectionMode ? { boxShadow: '0 0 0 3px hsl(var(--primary))' } : {}}
      >
        <button
          className="delete-btn"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          title="Delete"
        >
          <FiTrash2 />
        </button>

        <div
          className={clsx("art-card-img-wrapper", art.type === 'vfx' && "aspect-video")}
          style={{
            minHeight: art.type === 'vfx' ? 'auto' : art.type === 'ability-icons' ? 'auto' : '300px',
            backgroundColor: 'var(--surface-hover)',
            position: 'relative'
          }}
        >
          {isSelectionMode && (
            <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 10 }}>
              <input
                type="checkbox"
                checked={selected}
                readOnly
                style={{ transform: 'scale(1.5)', cursor: 'pointer', pointerEvents: 'none' }}
              />
            </div>
          )}
          {url ? (
            <>
              {isVideo ? (
                <video
                  ref={videoRef}
                  src={url}
                  loop
                  muted
                  playsInline
                  preload="metadata"
                  disablePictureInPicture
                  disableRemotePlayback
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain'
                  }}
                  onLoadedData={(e) => {
                    e.currentTarget.playbackRate = 1.0;
                    if (!playOnHover || isHovered) {
                      e.currentTarget.play().catch(() => { });
                    }
                  }}
                />
              ) : (
                <img
                  src={url}
                  alt={art.name}
                  loading="lazy"
                  draggable={false}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain'
                  }}
                />
              )}
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-dim)' }}>
              Loading...
            </div>
          )}
        </div>

        <div className="art-card-content" style={art.type === 'ability-icons'
          ? { padding: '0.3rem 0.4rem', gap: '0' }
          : {}}>
          <h4 className="art-card-title" style={{
            margin: 0,
            fontSize: art.type === 'ability-icons' ? '0.62rem' : '0.9rem',
            color: 'var(--text)',
            lineHeight: art.type === 'ability-icons' ? 1.2 : undefined,
          }}>
            {cleanName(art.name)}
          </h4>
          {art.type !== 'ability-icons' && showTags && (
            <div className="art-card-tags">
              {Object.entries(art.tags).flatMap(([key, value]) => {
                if (!value) return [];
                if (Array.isArray(value)) {
                  return value.map(v => (
                    <span key={`${key}-${v}`} className={clsx("tag-badge", key)} title={key}>{v}</span>
                  ));
                }
                return [
                  <span key={key} className={clsx("tag-badge", key, key === 'element' && `element-${(value as string).toLowerCase().replace(/\s+/g, '-')}`)} title={key}>
                    {value}
                  </span>
                ];
              })}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// -------------------------------------------------------------------------------- //

function BulkEditModal({
  onClose, onSave, activeCategories, categoryTags, selectedString
}: {
  onClose: () => void;
  onSave: (tags: Record<string, string | string[]>) => void;
  activeCategories: string[];
  categoryTags: Record<string, string[]>;
  selectedString: string;
}) {
  const [tags, setTags] = useState<Record<string, string | string[]>>({});

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    onSave(tags);
  };

  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="modal-content"
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 50, opacity: 0 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{selectedString}</h2>
          <button className="close-button" onClick={onClose}><FiX size={24} /></button>
        </div>

        <form onSubmit={handleSave} className="modal-body">
          <p style={{ color: 'var(--text-dim)', marginBottom: '1rem', fontSize: '0.9rem' }}>
            Note: Choosing a tag will overwrite that category for all selected items. Leaving it as "-- Keep Existing --" will preserve current tags. Choosing "-- Clear Tag --" will remove it.
          </p>
          <div className="metadata-grid" style={{ marginBottom: '2rem' }}>
            {activeCategories.map(cat => {
              const isMultiSelect = cat === 'vfxType';
              if (isMultiSelect) {
                const selectedVals: string[] = Array.isArray(tags[cat]) ? (tags[cat] as string[]) : [];
                const isClearing = tags[cat] === 'CLEAR_TAG';
                const isKeeping = !tags[cat] || tags[cat] === '';
                const toggleVal = (opt: string) => {
                  const arr = [...selectedVals];
                  const next = arr.includes(opt) ? arr.filter(v => v !== opt) : [...arr, opt];
                  setTags({ ...tags, [cat]: next });
                };
                return (
                  <div key={cat} className="form-group">
                    <label>{cat.replace(/([A-Z])/g, ' $1').trim()}</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.4rem', marginBottom: '0.4rem' }}>
                      {(categoryTags[cat] || []).map(opt => (
                        <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer', fontSize: '0.85rem', padding: '0.3rem 0.7rem', borderRadius: '6px', background: (!isClearing && !isKeeping && selectedVals.includes(opt)) ? 'hsl(var(--primary) / 0.25)' : 'hsl(var(--surface-hover))', border: (!isClearing && !isKeeping && selectedVals.includes(opt)) ? '1px solid hsl(var(--primary))' : '1px solid var(--border)', color: (!isClearing && !isKeeping && selectedVals.includes(opt)) ? 'hsl(var(--primary))' : 'var(--text)', userSelect: 'none', opacity: isClearing ? 0.4 : 1 }}>
                          <input type="checkbox" checked={!isClearing && !isKeeping && selectedVals.includes(opt)} onChange={() => { if (!isClearing) toggleVal(opt); }} style={{ display: 'none' }} />
                          {opt}
                        </label>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.8rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer', color: isKeeping ? 'hsl(var(--primary))' : 'var(--text-dim)' }}>
                        <input type="radio" name={`bulk-${cat}`} checked={isKeeping} onChange={() => setTags({ ...tags, [cat]: '' })} /> Keep existing
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer', color: isClearing ? 'hsl(var(--danger, 0 80% 60%))' : 'var(--text-dim)' }}>
                        <input type="radio" name={`bulk-${cat}`} checked={isClearing} onChange={() => setTags({ ...tags, [cat]: 'CLEAR_TAG' })} /> Clear all
                      </label>
                    </div>
                  </div>
                );
              }
              return (
                <div key={cat} className="form-group">
                  <label>{cat.replace(/([A-Z])/g, ' $1').trim()}</label>
                  <select
                    className="form-control"
                    style={{ textTransform: 'capitalize' }}
                    value={(tags[cat] as string) || ''}
                    onChange={e => setTags({ ...tags, [cat]: e.target.value })}
                  >
                    <option value="">-- Keep Existing --</option>
                    <option value="CLEAR_TAG">-- Clear Tag --</option>
                    {categoryTags[cat]?.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">
              <FiUpload style={{ marginRight: '0.4rem' }} /> Update Tags
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
