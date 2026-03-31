import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUpload, FiX, FiHome, FiTrash2, FiPlus, FiVideo, FiImage, FiMinus, FiMaximize2, FiGrid, FiLayout, FiSearch, FiMonitor } from 'react-icons/fi';
import { getAllArtworks, addArtwork } from './lib/db';
import { cleanName } from './ViewerModal';
import type { ConceptArt, AssetType } from './lib/db';
import { clsx } from 'clsx';
import './App.css'; 
import './ReviewPage.css';

interface ReviewPageProps {
  onBackToLanding: () => void;
}

export default function ReviewPage({ onBackToLanding }: ReviewPageProps) {
  const [vaultArtworks, setVaultArtworks] = useState<ConceptArt[]>([]);
  const [reviewIds, setReviewIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadType, setUploadType] = useState<'in-progress' | 'feedback'>('in-progress');
  
  const [layout, setLayout] = useState<'grid' | 'focused' | 'stage'>('grid');
  const [zoom, setZoom] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeStageId, setActiveStageId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const allArt = await getAllArtworks();
      setVaultArtworks(allArt);
      
      const storedIds = localStorage.getItem('review_vault_ids');
      if (storedIds) {
        setReviewIds(JSON.parse(storedIds));
      }
    } catch (err) {
      console.error('Failed to load review data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (layout === 'stage' && !activeStageId && reviewIds.length > 0) {
      setActiveStageId(reviewIds[0]);
    }
  }, [layout, reviewIds, activeStageId]);

  const selectedVaultArt = useMemo(() => {
    return vaultArtworks.filter(art => reviewIds.includes(art.id));
  }, [vaultArtworks, reviewIds]);

  const clearReview = () => {
    if (confirm('Clear the review screen? This will remove all items from the current view.')) {
      setReviewIds([]);
      localStorage.setItem('review_vault_ids', JSON.stringify([]));
    }
  };

  const removeFromReview = (id: string) => {
    const nextIds = reviewIds.filter(rid => rid !== id);
    setReviewIds(nextIds);
    localStorage.setItem('review_vault_ids', JSON.stringify(nextIds));
  };

  const handleUploadSuccess = (newArtId: string) => {
    const nextIds = [...reviewIds, newArtId];
    setReviewIds(nextIds);
    localStorage.setItem('review_vault_ids', JSON.stringify(nextIds));
    loadData();
  };

  return (
    <div className="app-container review-page">
      <aside className="sidebar">
        <div className="brand-container">
          <div className="brand">
            <img src="/backgrounds/logo_website_tab_32x32.png" alt="ArtNexus Logo" style={{ width: '24px', height: '24px', marginRight: '8px' }} /> Review Tool
          </div>
          <button 
            className="back-home-btn" 
            onClick={onBackToLanding}
            title="Back to Landing"
          >
            <FiHome size={18} />
          </button>
        </div>

        <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          <button className="upload-button" onClick={() => { setUploadType('in-progress'); setUploadModalOpen(true); }}>
            <FiPlus /> Add In-Progress Art
          </button>
          <button className="upload-button" style={{ backgroundColor: 'hsl(var(--secondary))' }} onClick={() => { setUploadType('feedback'); setUploadModalOpen(true); }}>
            <FiVideo /> Add Video Feedback
          </button>
          <button className="clear-filters" onClick={clearReview} style={{ width: '100%', marginTop: '1rem', color: 'var(--danger)' }}>
            <FiTrash2 /> Clear Review Board
          </button>
        </div>

        <div className="filter-section" style={{ padding: '1rem' }}>
          <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)', marginBottom: '1rem' }}>
            Current Session ({selectedVaultArt.length} items)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {selectedVaultArt.map(art => (
              <div key={art.id} className="review-item-sidebar">
                <span className="truncate" style={{ fontSize: '0.85rem' }}>{art.name}</span>
                <button onClick={() => removeFromReview(art.id)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
                  <FiMinus />
                </button>
              </div>
            ))}
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="header" style={{ justifyContent: 'space-between', padding: '0 2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <h1 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Review Board</h1>
            
            <div className="layout-toggle">
              <button 
                className={clsx('toggle-btn', layout === 'grid' && 'active')} 
                onClick={() => setLayout('grid')}
                title="Grid View"
              >
                <FiGrid />
              </button>
              <button 
                className={clsx('toggle-btn', layout === 'focused' && 'active')} 
                onClick={() => setLayout('focused')}
                title="Focused View"
              >
                <FiLayout />
              </button>
              <button 
                className={clsx('toggle-btn', layout === 'stage' && 'active')} 
                onClick={() => setLayout('stage')}
                title="Stage View"
              >
                <FiMonitor />
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--text-dim)' }}>
              <FiSearch size={14} />
              <input 
                type="range" 
                min="0.5" 
                max="2" 
                step="0.1" 
                value={zoom} 
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                style={{ width: '100px', cursor: 'pointer' }}
              />
            </div>
          </div>
        </header>

        <section className="gallery-container" style={{ padding: '2rem' }}>
          {loading ? (
            <div className="empty-state"><div className="spinner" /></div>
          ) : selectedVaultArt.length === 0 ? (
            <div className="empty-state">
              <FiImage size={48} />
              <h2>Review Board is Empty</h2>
              <p>Go to the Vault and select assets to send here, or upload new in-progress work.</p>
            </div>
          ) : layout === 'stage' ? (
            <div className="stage-layout">
              <div className="stage-sidebar">
                {selectedVaultArt.map(art => (
                  <div 
                    key={art.id} 
                    className={clsx("stage-thumb", activeStageId === art.id && "active")}
                    onClick={() => setActiveStageId(art.id)}
                  >
                    {art.originalUrl.toLowerCase().endsWith('.mp4') ? (
                      <video src={art.compressedUrl || art.originalUrl} muted />
                    ) : (
                      <img src={art.compressedUrl || art.originalUrl} alt={art.name} />
                    )}
                    <div className="thumb-label">{art.type === 'references' ? 'Reference' : art.tags.rarity || 'Art'}</div>
                  </div>
                ))}
              </div>
              <div className="stage-main">
                {activeStageId && (
                  <ReviewCard 
                    art={vaultArtworks.find(a => a.id === activeStageId)!} 
                    onRemove={() => removeFromReview(activeStageId)}
                    onExpand={() => setExpandedId(activeStageId)}
                    isExpanded={false}
                  />
                )}
              </div>
            </div>
          ) : (
            <div 
              className={clsx("review-grid", layout === 'focused' && 'focused-layout')}
              style={{ 
                gridTemplateColumns: layout === 'grid' 
                  ? `repeat(auto-fill, minmax(${400 * zoom}px, 1fr))` 
                  : '1fr'
              }}
            >
              <AnimatePresence mode="popLayout">
                {selectedVaultArt.map(art => (
                  <ReviewCard 
                    key={art.id} 
                    art={art} 
                    onRemove={() => removeFromReview(art.id)} 
                    onExpand={() => setExpandedId(art.id)}
                    isExpanded={expandedId === art.id}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </section>
      </main>

      <AnimatePresence>
        {expandedId && (
          <ExpandedView 
            art={vaultArtworks.find(a => a.id === expandedId)!} 
            onClose={() => setExpandedId(null)} 
          />
        )}
        {isUploadModalOpen && (
          <ReviewUploadModal 
            onClose={() => setUploadModalOpen(false)} 
            onSuccess={handleUploadSuccess}
            type={uploadType}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ReviewCard({ art, onRemove, onExpand, isExpanded }: { art: ConceptArt, onRemove: () => void, onExpand: () => void, isExpanded?: boolean }) {
  const mediaUrl = art.compressedUrl || art.originalUrl;
  const isVideo = art.type === 'animation' || art.type === 'vfx' || mediaUrl.toLowerCase().endsWith('.mp4') || mediaUrl.toLowerCase().endsWith('.mov') || mediaUrl.toLowerCase().endsWith('.webm');
  
  const [showMagnifier, setShowMagnifier] = useState(false);
  const [[x, y], setXY] = useState([0, 0]);
  const [[imgWidth, imgHeight], setSize] = useState([0, 0]);
  const imgRef = useRef<HTMLImageElement>(null);

  const handleMouseEnter = (e: React.MouseEvent) => {
    const { width, height } = e.currentTarget.getBoundingClientRect();
    setSize([width, height]);
    setShowMagnifier(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const { top, left } = e.currentTarget.getBoundingClientRect();
    const x = e.pageX - left - window.scrollX;
    const y = e.pageY - top - window.scrollY;
    setXY([x, y]);
  };

  const MAGNIFIER_SIZE = 250;
  const ZOOM_LEVEL = 2.5;

  return (
    <motion.div 
      className="review-card"
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
    >
      <div className="review-card-header">
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {art.type !== 'references' && (
            <span className="review-card-tag">{art.type.replace('-', ' ')}</span>
          )}
          {(art.tags.rarity || art.type === 'references') && (
            <span className="review-card-tag" style={{ background: 'hsl(var(--primary) / 0.2)', color: 'hsl(var(--primary))' }}>
              {art.type === 'references' ? 'Reference' : art.tags.rarity}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.2rem' }}>
          <button className="remove-btn" onClick={onExpand} title="Full Screen"><FiMaximize2 /></button>
          <button className="remove-btn" onClick={onRemove} title="Remove"><FiX /></button>
        </div>
      </div>
      <div 
        className="review-card-media" 
        onClick={onExpand} 
        style={{ cursor: 'crosshair', position: 'relative', overflow: 'hidden' }}
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setShowMagnifier(false)}
      >
        {isVideo ? (
          <video src={mediaUrl} controls autoPlay loop muted style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        ) : (
          <>
            <img 
              ref={imgRef}
              src={mediaUrl} 
              alt={art.name} 
              style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
            />
            {showMagnifier && (
              <div
                style={{
                  position: 'absolute',
                  pointerEvents: 'none',
                  height: `${MAGNIFIER_SIZE}px`,
                  width: `${MAGNIFIER_SIZE}px`,
                  top: 0,
                  left: 0,
                  borderRadius: '50%',
                  border: '3px solid white',
                  backgroundColor: 'black',
                  backgroundImage: `url('${art.originalUrl}')`,
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: `${imgWidth * ZOOM_LEVEL}px ${imgHeight * ZOOM_LEVEL}px`,
                  backgroundPosition: `${-x * ZOOM_LEVEL + MAGNIFIER_SIZE / 2}px ${-y * ZOOM_LEVEL + MAGNIFIER_SIZE / 2}px`,
                  transform: `translate(${x - MAGNIFIER_SIZE / 2}px, ${y - MAGNIFIER_SIZE / 2}px)`,
                  boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
                  zIndex: 100,
                  willChange: 'transform, background-position'
                }}
              />
            )}
          </>
        )}
      </div>
      <div className="review-card-footer">
        <h4>{art.name}</h4>
        <div className="review-card-meta">
          {Object.entries(art.tags).map(([k, v]) => v && k !== 'rarity' && (
            <span key={k} className="mini-tag">{Array.isArray(v) ? v[0] : v}</span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function ExpandedView({ art, onClose }: { art: ConceptArt, onClose: () => void }) {
  const mediaUrl = art.originalUrl; // Use original for full screen
  const isVideo = art.type === 'animation' || art.type === 'vfx' || mediaUrl.toLowerCase().endsWith('.mp4') || mediaUrl.toLowerCase().endsWith('.mov') || mediaUrl.toLowerCase().endsWith('.webm');

  return (
    <motion.div 
      className="expanded-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <button className="expanded-close" onClick={onClose}><FiX size={32} /></button>
      <motion.div 
        className="expanded-content"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={e => e.stopPropagation()}
      >
        {isVideo ? (
          <video src={mediaUrl} controls autoPlay loop className="expanded-media" />
        ) : (
          <img src={mediaUrl} alt={art.name} className="expanded-media" />
        )}
        <div className="expanded-info">
          <h3>{art.name}</h3>
          <p>{art.type.replace('-', ' ')}</p>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ReviewUploadModal({ onClose, onSuccess, type }: { onClose: () => void, onSuccess: (id: string) => void, type: 'in-progress' | 'feedback' }) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setSaving(true);
    try {
      const artType: AssetType = type === 'feedback' ? 'animation' : 'concept-art';
      const id = await addArtwork({
        name: name || cleanName(file.name.split('.')[0]),
        blob: file,
        type: artType,
        tags: {
          rarity: type === 'in-progress' ? 'In Progress' : 'Feedback'
        }
      });
      onSuccess(id);
      onClose();
    } catch (err) {
      console.error(err);
      alert('Upload failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="modal-content" initial={{ y: 50 }} animate={{ y: 0 }} exit={{ y: 50 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Upload {type === 'in-progress' ? 'In-Progress Art' : 'Video Feedback'}</h2>
          <button className="close-button" onClick={onClose}><FiX /></button>
        </div>
        <form onSubmit={handleSave} style={{ padding: '1rem' }}>
          <div className="form-group">
            <label>Select File</label>
            <input 
              type="file" 
              accept={type === 'feedback' ? 'video/*' : 'image/*,video/*'} 
              onChange={e => e.target.files && setFile(e.target.files[0])} 
              className="form-control"
            />
          </div>
          <div className="form-group">
            <label>Name (Optional)</label>
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="Give it a name..." 
              className="form-control"
            />
          </div>
          <button type="submit" className="submit-button" disabled={!file || saving}>
            {saving ? 'Uploading...' : 'Upload to Review'}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}
