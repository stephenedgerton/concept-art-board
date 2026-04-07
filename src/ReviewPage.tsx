import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUpload, FiX, FiHome, FiTrash2, FiPlus, FiVideo, FiImage, FiMinus, FiMaximize2, FiGrid, FiLayout, FiSearch, FiMonitor, FiColumns, FiLock, FiUnlock } from 'react-icons/fi';
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
  const [layout, setLayout] = useState<'grid' | 'focused' | 'stage' | 'compare'>('grid');
  const [zoom, setZoom] = useState(1);
  const [magnifierEnabled, setMagnifierEnabled] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeStageId, setActiveStageId] = useState<string | null>(null);
  
  // Comparison & Sync States
  const [compareIds, setCompareIds] = useState<[string | null, string | null]>([null, null]);
  const [isSynced, setIsSynced] = useState(true);
  const [sharedTransform, setSharedTransform] = useState({ x: 0, y: 0, scale: 1 });

  const loadData = useCallback(async () => {
    try {
      // Check health first to ensure backend is reachable
      const healthRes = await fetch('/api/health').catch(() => {
        throw new Error("Unable to connect to the backend server.");
      });
      
      if (!healthRes.ok) {
        throw new Error(`Server responded with ${healthRes.status}: ${healthRes.statusText}`);
      }

      const allArt = await getAllArtworks();
      setVaultArtworks(allArt);
      
      const storedIds = localStorage.getItem('review_vault_ids');
      if (storedIds) {
        setReviewIds(JSON.parse(storedIds));
      }
    } catch (err: any) {
      console.error('Failed to load review data:', err);
      alert(err.message || 'An error occurred while loading data.');
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
    if (layout === 'compare' && !compareIds[0] && reviewIds.length > 0) {
        setCompareIds([reviewIds[0], reviewIds[1] || null]);
    }
  }, [layout, reviewIds, activeStageId, compareIds]);

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
              <div 
                key={art.id} 
                className={clsx("review-item-sidebar", (layout === 'compare' && compareIds.includes(art.id)) && "active")}
                onClick={() => {
                    if (layout === 'compare') {
                        if (compareIds[0] === art.id) setCompareIds([null, compareIds[1]]);
                        else if (compareIds[1] === art.id) setCompareIds([compareIds[0], null]);
                        else if (!compareIds[0]) setCompareIds([art.id, compareIds[1]]);
                        else setCompareIds([compareIds[0], art.id]);
                    }
                }}
              >
                <span className="truncate" style={{ fontSize: '0.85rem' }}>{art.name}</span>
                <button onClick={(e) => { e.stopPropagation(); removeFromReview(art.id); }} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
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
              <button 
                className={clsx('toggle-btn', layout === 'compare' && 'active')} 
                onClick={() => setLayout('compare')}
                title="Compare Side-by-Side"
              >
                <FiColumns />
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {layout === 'compare' && (
                <button 
                  className={clsx('toggle-btn', isSynced && 'active')} 
                  onClick={() => setIsSynced(!isSynced)}
                  title={isSynced ? "Unlock Views" : "Sync Zoom/Pan"}
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', gap: '0.4rem', display: 'flex', alignItems: 'center', border: '1px solid hsla(var(--primary) / 0.3)' }}
                >
                  {isSynced ? <FiLock size={14} /> : <FiUnlock size={14} />} <span>{isSynced ? "Synced" : "Locked"}</span>
                </button>
            )}
            
            <button 
              className={clsx('toggle-btn', magnifierEnabled && 'active')} 
              onClick={() => setMagnifierEnabled(!magnifierEnabled)}
              title={magnifierEnabled ? "Disable Magnifier" : "Enable Magnifier"}
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', gap: '0.4rem', display: 'flex', alignItems: 'center' }}
            >
              <FiSearch size={14} /> <span>Magnifier</span>
            </button>
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
          ) : layout === 'compare' ? (
            <div className="compare-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', height: '100%' }}>
                <div className="compare-pane">
                    {compareIds[0] ? (
                        <ReviewCard 
                            art={vaultArtworks.find(a => a.id === compareIds[0])!} 
                            onRemove={() => setCompareIds([null, compareIds[1]])}
                            onExpand={() => setExpandedId(compareIds[0])}
                            magnifierEnabled={magnifierEnabled}
                            sharedTransform={isSynced ? sharedTransform : undefined}
                            onTransformChange={isSynced ? setSharedTransform : undefined}
                        />
                    ) : (
                        <div className="empty-compare-pane">Select an artwork from the sidebar to compare</div>
                    )}
                </div>
                <div className="compare-pane">
                    {compareIds[1] ? (
                        <ReviewCard 
                            art={vaultArtworks.find(a => a.id === compareIds[1])!} 
                            onRemove={() => setCompareIds([compareIds[0], null])}
                            onExpand={() => setExpandedId(compareIds[1])}
                            magnifierEnabled={magnifierEnabled}
                            sharedTransform={isSynced ? sharedTransform : undefined}
                            onTransformChange={isSynced ? setSharedTransform : undefined}
                        />
                    ) : (
                        <div className="empty-compare-pane">Select a second artwork to compare</div>
                    )}
                </div>
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
                    magnifierEnabled={magnifierEnabled}
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
                    magnifierEnabled={magnifierEnabled}
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

interface Transform { x: number; y: number; scale: number; }

function ReviewCard({ art, onRemove, onExpand, isExpanded, magnifierEnabled, sharedTransform, onTransformChange }: { 
    art: ConceptArt, 
    onRemove: () => void, 
    onExpand: () => void, 
    isExpanded?: boolean, 
    magnifierEnabled: boolean,
    sharedTransform?: Transform,
    onTransformChange?: (t: Transform) => void
}) {
  const mediaUrl = art.compressedUrl || art.originalUrl;
  const isVideo = art.type === 'animation' || art.type === 'vfx' || mediaUrl.toLowerCase().endsWith('.mp4') || mediaUrl.toLowerCase().endsWith('.mov') || mediaUrl.toLowerCase().endsWith('.webm');
  
  const [showMagnifier, setShowMagnifier] = useState(false);
  const [[x, y], setXY] = useState([0, 0]);
  const [[containerWidth, containerHeight], setSize] = useState([0, 0]);
  const [actualImgSize, setActualImgSize] = useState({ width: 0, height: 0, top: 0, left: 0 });
  const imgRef = useRef<HTMLImageElement>(null);
  
  // Internal Transform for Deep Zoom
  const [internalTransform, setInternalTransform] = useState<Transform>({ x: 0, y: 0, scale: 1 });
  const transform = sharedTransform || internalTransform;
  const setTransform = onTransformChange || setInternalTransform;
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const handleMouseEnter = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setSize([rect.width, rect.height]);
    
    if (imgRef.current) {
      const naturalRatio = imgRef.current.naturalWidth / imgRef.current.naturalHeight;
      const containerRatio = rect.width / rect.height;
      
      let actualWidth, actualHeight;
      if (containerRatio > naturalRatio) {
        actualHeight = rect.height;
        actualWidth = rect.height * naturalRatio;
      } else {
        actualWidth = rect.width;
        actualHeight = rect.width / naturalRatio;
      }
      
      const offsetX = (rect.width - actualWidth) / 2;
      const offsetY = (rect.height - actualHeight) / 2;
      
      setActualImgSize({ width: actualWidth, height: actualHeight, top: offsetY, left: offsetX });
    }

    if (magnifierEnabled) {
      setShowMagnifier(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const curX = e.pageX - rect.left - window.scrollX;
    const curY = e.pageY - rect.top - window.scrollY;
    setXY([curX, curY]);

    if (isDragging.current) {
        const dx = e.pageX - lastPos.current.x;
        const dy = e.pageY - lastPos.current.y;
        setTransform({ ...transform, x: transform.x + dx, y: transform.y + dy });
        lastPos.current = { x: e.pageX, y: e.pageY };
    }

    if (imgRef.current && !actualImgSize.width) {
      const naturalRatio = imgRef.current.naturalWidth / imgRef.current.naturalHeight;
      const containerRatio = rect.width / rect.height;
      let actualWidth, actualHeight;
      if (containerRatio > naturalRatio) {
        actualHeight = rect.height;
        actualWidth = rect.height * naturalRatio;
      } else {
        actualWidth = rect.width;
        actualHeight = rect.width / naturalRatio;
      }
      const offsetX = (rect.width - actualWidth) / 2;
      const offsetY = (rect.height - actualHeight) / 2;
      setActualImgSize({ width: actualWidth, height: actualHeight, top: offsetY, left: offsetX });
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (magnifierEnabled) return;
    e.preventDefault();
    const zoomSpeed = 0.001;
    const newScale = Math.max(1, Math.min(10, transform.scale - e.deltaY * zoomSpeed));
    setTransform({ ...transform, scale: newScale });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (magnifierEnabled) return;
    isDragging.current = true;
    lastPos.current = { x: e.pageX, y: e.pageY };
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const resetTransform = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTransform({ x: 0, y: 0, scale: 1 });
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
      style={{ display: 'flex', flexDirection: 'column' }}
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
          {(transform.scale !== 1 || transform.x !== 0 || transform.y !== 0) && (
              <button className="remove-btn" onClick={resetTransform} title="Reset Zoom" style={{ fontSize: '0.7rem', padding: '0 0.5rem' }}>Reset</button>
          )}
          <button className="remove-btn" onClick={onExpand} title="Full Screen"><FiMaximize2 /></button>
          <button className="remove-btn" onClick={onRemove} title="Remove"><FiX /></button>
        </div>
      </div>
      <div 
        className="review-card-media" 
        style={{ 
            cursor: magnifierEnabled ? 'crosshair' : (isDragging.current ? 'grabbing' : 'grab'), 
            position: 'relative', 
            overflow: 'hidden',
            flex: 1,
            backgroundColor: '#0a0a0a'
        }}
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => { setShowMagnifier(false); handleMouseUp(); }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
      >
        {isVideo ? (
          <video src={mediaUrl} controls autoPlay loop muted style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        ) : (
          <div style={{ 
              width: '100%', 
              height: '100%', 
              transform: magnifierEnabled ? 'none' : `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
              transition: isDragging.current ? 'none' : 'transform 0.1s ease-out',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
          }}>
            <img 
              ref={imgRef}
              src={mediaUrl} 
              alt={art.name} 
              draggable={false}
              style={{ width: '100%', height: '100%', objectFit: 'contain', userSelect: 'none' }} 
            />
            {showMagnifier && magnifierEnabled && (
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
                  backgroundSize: `${actualImgSize.width * ZOOM_LEVEL}px ${actualImgSize.height * ZOOM_LEVEL}px`,
                  backgroundPosition: `${-(x - actualImgSize.left) * ZOOM_LEVEL + MAGNIFIER_SIZE / 2}px ${-(y - actualImgSize.top) * ZOOM_LEVEL + MAGNIFIER_SIZE / 2}px`,
                  transform: `translate(${x - MAGNIFIER_SIZE / 2}px, ${y - MAGNIFIER_SIZE / 2}px)`,
                  boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
                  zIndex: 100,
                  willChange: 'transform, background-position'
                }}
              />
            )}
          </div>
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
