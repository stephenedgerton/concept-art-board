import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiLink, FiImage, FiUser } from 'react-icons/fi';
import { updateArtwork } from './lib/db';
import type { ConceptArt } from './lib/db';
import { clsx } from 'clsx';

export const cleanName = (name: string) => name.replace(/_/g, ' ').replace(/\s*v\d+\s*$/i, '').trim();

interface ViewerModalProps {
  art: ConceptArt;
  allArtworks?: ConceptArt[];
  categoryTags?: Record<string, string[]>;
  onClose: () => void;
  onUpdateSuccess?: (art: ConceptArt) => void;
  readOnly?: boolean;
  usePortrait?: boolean;
}

interface Variation {
  id: string;
  type: 'concept' | 'portrait' | 'other';
  url: string;
  name: string;
  asset?: ConceptArt;
}

export default function ViewerModal({ 
  art, 
  allArtworks = [],
  categoryTags = {}, 
  onClose, 
  onUpdateSuccess, 
  readOnly = false,
  usePortrait = false 
}: ViewerModalProps) {
  const [activeUrl, setActiveUrl] = useState<string>('');
  const [activeType, setActiveType] = useState<'video' | 'image' | 'audio'>('image');
  const [selectedVariationId, setSelectedVariationId] = useState<string>('main');

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(art.name);
  const [editTags, setEditTags] = useState(art.tags);
  const [saving, setSaving] = useState(false);

  const variations = useMemo(() => {
    const list: Variation[] = [];
    
    // 1. The main asset itself
    list.push({
      id: 'main',
      type: 'concept',
      url: art.compressedUrl || art.originalUrl,
      name: 'Concept Art',
      asset: art
    });

    // 2. The portrait if it exists (for concept-art)
    if (art.type === 'concept-art' && art.tags.characterName) {
      const cleanCharName = art.tags.characterName.replace(/\s+/g, '');
      const specialMappings: Record<string, string> = {
        'BlueOrbConjurer': 'BlueOrbConjurer',
        'DarkSorcerer': 'DarkSorcerer',
        'ArmsDealer': 'ArmsCollector',
        'ArmsCollector': 'ArmsCollector'
      };
      const finalName = specialMappings[cleanCharName] || cleanCharName;
      list.push({
        id: 'portrait',
        type: 'portrait',
        url: `/portraits/Illustration_${finalName}_Portrait.png`,
        name: 'Portrait'
      });
    }

    // 3. Other assets with the same character name
    if (art.tags.characterName) {
      const others = allArtworks.filter(a => 
        a.id !== art.id && 
        a.tags.characterName === art.tags.characterName
      );
      others.forEach(other => {
        list.push({
          id: other.id,
          type: 'other',
          url: other.compressedUrl || other.originalUrl,
          name: other.name,
          asset: other
        });
      });
    }

    return list;
  }, [art, allArtworks]);

  useEffect(() => {
    // Initial selection
    if (usePortrait && variations.some(v => v.id === 'portrait')) {
      const v = variations.find(v => v.id === 'portrait')!;
      setSelectedVariationId('portrait');
      setActiveUrl(v.url);
    } else {
      setSelectedVariationId('main');
      setActiveUrl(art.compressedUrl || art.originalUrl);
    }
  }, [art, usePortrait, variations]);

  useEffect(() => {
    const url = activeUrl.toLowerCase();
    if (url.endsWith('.mp4') || url.endsWith('.webm') || url.endsWith('.mov')) {
      setActiveType('video');
    } else if (url.endsWith('.mp3') || url.endsWith('.wav') || url.endsWith('.ogg')) {
      setActiveType('audio');
    } else {
      setActiveType('image');
    }
  }, [activeUrl]);

  useEffect(() => {
    setEditName(art.name);
    setEditTags(art.tags);
  }, [art]);

  const activeCategories = useMemo(() => {
    switch (art.type) {
      case 'concept-art': return ['gender', 'race', 'faction', 'combatType', 'baseMesh', 'element', 'unitType', 'rarity', 'characterName'];
      case 'animation': return ['baseMesh', 'animationType', 'abilityTags'];
      case 'vfx': return ['element', 'vfxType'];
      case 'sfx': return ['element', 'sfxType', 'characterName'];
      case 'ability-icons': return ['element', 'characterName', 'abilityAction'];
      case 'references': return ['referenceType'];
      default: return [];
    }
  }, [art.type]);

  const handleSave = async () => {
    if (!onUpdateSuccess) return;
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

  const handlePortraitError = () => {
    if (selectedVariationId === 'portrait') {
      // Fallback to main
      const main = variations.find(v => v.id === 'main')!;
      setSelectedVariationId('main');
      setActiveUrl(main.url);
    }
  };

  return (
    <motion.div
      className="viewer-modal"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div 
        className="viewer-container"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="viewer-header">
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              className="copy-link-btn" 
              onClick={() => {
                const fullUrl = window.location.origin + activeUrl;
                navigator.clipboard.writeText(fullUrl);
                alert('Link copied to clipboard!');
              }}
              title="Copy link to asset"
            >
              <FiLink /> Copy Link
            </button>
          </div>
          <button className="close-button" onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><FiX size={32} /></button>
        </div>

        <div className="viewer-layout">
          <div className="viewer-content">
            <div className="viewer-image-container">
              {activeType === 'video' ? (
                <video src={activeUrl} controls autoPlay loop className="viewer-image" />
              ) : activeType === 'audio' ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem', color: 'hsl(var(--primary))' }}>
                   <FiVideo size={120} />
                   <audio src={activeUrl} controls autoPlay />
                </div>
              ) : (
                <img 
                  src={activeUrl} 
                  alt={art.name} 
                  className="viewer-image" 
                  onError={handlePortraitError}
                />
              )}
            </div>

            {/* Variation Carousel */}
            {variations.length > 1 && (
              <div className="viewer-carousel">
                {variations.map(v => (
                  <button
                    key={v.id}
                    className={clsx("carousel-item", selectedVariationId === v.id && "active")}
                    onClick={() => {
                      setSelectedVariationId(v.id);
                      setActiveUrl(v.url);
                    }}
                  >
                    <div className="carousel-preview">
                      {v.type === 'portrait' ? (
                        <FiUser size={24} />
                      ) : v.url.toLowerCase().endsWith('.mp4') ? (
                        <FiVideo size={24} />
                      ) : (
                        <img src={v.url} alt={v.name} onError={(e) => {
                           // If small preview fails, hide or show icon
                           e.currentTarget.style.display = 'none';
                        }} />
                      )}
                    </div>
                    <span>{v.name}</span>
                  </button>
                ))}
              </div>
            )}
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
              <h2 className="viewer-title" style={{ marginBottom: '2rem' }}>{cleanName(editName)}</h2>
            )}

            <div className="metadata-group">
              <div className="metadata-label">Asset Type</div>
              <div className="metadata-value" style={{ textTransform: 'capitalize' }}>
                {art.type.replace('-', ' ')}
              </div>
            </div>

            {activeCategories.map(category => {
              const isMultiSelect = category === 'vfxType' || category === 'sfxType';
              const value = editTags[category as keyof typeof editTags];

              if (isEditing) {
                if (isMultiSelect) {
                  const selectedVals: string[] = (value as string[]) || [];
                  const toggleVal = (opt: string) => {
                    const arr = Array.isArray(selectedVals) ? selectedVals : [];
                    const next = arr.includes(opt) ? arr.filter(v => v !== opt) : [...arr, opt];
                    setEditTags({ ...editTags, [category]: next as string[] });
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
                      value={(value as string) || ''}
                      onChange={e => setEditTags({ ...editTags, [category]: e.target.value as any })}
                    >
                      <option value="">None</option>
                      {(categoryTags[category] || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                );
              }

              if (!value || (Array.isArray(value) && value.length === 0)) return null;
              return (
                <div key={category} className="metadata-group">
                  <div className="metadata-label">{category.replace(/([A-Z])/g, ' $1').trim()}</div>
                  <div className="metadata-value" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {Array.isArray(value)
                      ? value.map(v => <span key={v} className={clsx("tag-badge", category)}>{v}</span>)
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

            {!readOnly && onUpdateSuccess && (
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
            )}
          </aside>
        </div>
      </motion.div>
    </motion.div>
  );
}
