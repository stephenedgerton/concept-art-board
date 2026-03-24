import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { FiX, FiLink } from 'react-icons/fi';
import { updateArtwork } from './lib/db';
import type { ConceptArt } from './lib/db';

export const cleanName = (name: string) => name.replace(/_/g, ' ').replace(/\s*v\d+\s*$/i, '').trim();

interface ViewerModalProps {
  art: ConceptArt;
  categoryTags?: Record<string, string[]>;
  onClose: () => void;
  onUpdateSuccess?: (art: ConceptArt) => void;
  readOnly?: boolean;
}

export default function ViewerModal({ art, categoryTags = {}, onClose, onUpdateSuccess, readOnly = false }: ViewerModalProps) {
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

  const isVideo = art.type === 'animation' || art.type === 'vfx' || (url || art.originalUrl).toLowerCase().endsWith('.mp4') || (url || art.originalUrl).toLowerCase().endsWith('.mov') || (url || art.originalUrl).toLowerCase().endsWith('.webm');

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
                const fullUrl = window.location.origin + art.originalUrl;
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
              {isVideo ? (
                <video src={url} controls autoPlay loop className="viewer-image" />
              ) : (
                <img src={url} alt={art.name} className="viewer-image" />
              )}
            </div>
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
              const isMultiSelect = category === 'vfxType';
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
