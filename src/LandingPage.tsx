import { motion } from 'framer-motion';
import { FiArrowRight, FiGithub, FiTwitter, FiUsers, FiBarChart2, FiActivity } from 'react-icons/fi';
import './LandingPage.css';

interface LandingPageProps {
  onEnterVault: () => void;
  onEnterRoster: () => void;
  onEnterEstimator: () => void;
  onEnterDashboard: () => void;
  onEnterReview: () => void;
  privacyMode: boolean;
  onTogglePrivacy: () => void;
}

export default function LandingPage({ 
  onEnterVault, onEnterRoster, onEnterEstimator, onEnterDashboard, onEnterReview,
  privacyMode, onTogglePrivacy 
}: LandingPageProps) {
  const backgroundImage = "/backgrounds/Frostbite_Background.jpg";

  return (
    <div className="landing-container">
      <div className="video-background-container">
        <img 
          src={backgroundImage} 
          className="video-background" 
          alt="Background" 
          style={{ objectFit: 'cover', width: '100%', height: '100%' }}
        />
        <div className="video-blur-overlay" />
        <div className="vignette-overlay" />
      </div>
      
      <header className="landing-header">
        <div className="landing-logo">
          <img src="/backgrounds/logo_website_tab_32x32.png" alt="ArtNexus Logo" style={{ width: '24px', height: '24px' }} /> <span>ArtNexus</span>
        </div>
        <nav className="landing-nav">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginRight: '1rem', padding: '0.4rem 1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '100px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: privacyMode ? 'hsl(var(--primary))' : 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Privacy</span>
            <button 
              className={`prod-toggle ${privacyMode ? 'active' : ''}`}
              onClick={onTogglePrivacy}
              style={{ width: '32px', height: '16px' }}
            >
              <div className="toggle-thumb" style={{ width: '10px', height: '10px', left: privacyMode ? 'calc(100% - 13px)' : '3px' }} />
            </button>
          </div>
          <button className="nav-link-btn" onClick={onEnterRoster}>Unit Roster</button>
          <button className="nav-btn" onClick={onEnterVault}>Launch App</button>
        </nav>
      </header>

      <main className="landing-main">
        <section className="hero-section">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="hero-content"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.2, delay: 0.2 }}
              style={{ marginBottom: '4rem' }}
            >
              <img 
                src="/backgrounds/Fableborne_logo_1080.png" 
                alt="Fableborne Logo" 
                style={{ width: '100%', maxWidth: '600px', height: 'auto' }} 
              />
            </motion.div>
            
            <motion.div 
              className="hero-actions"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.8 }}
            >
              <button className="btn-vault" onClick={onEnterVault}>
                Enter The Vault <FiArrowRight />
              </button>
              <div className="future-links">
                <button className="future-link active" onClick={onEnterRoster}>
                  <FiUsers /> <span>Unit Roster</span>
                </button>
                <button className="future-link active" onClick={onEnterEstimator}>
                  <FiBarChart2 /> <span>Cost Estimator</span>
                </button>
                <button className="future-link active" onClick={onEnterDashboard}>
                  <FiActivity /> <span>Production Dashboard</span>
                </button>
                <button className="future-link active" onClick={onEnterReview}>
                  <FiUsers /> <span>Review Tool</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="footer-socials">
          <a href="https://github.com/stephenedgerton/concept-art-board" target="_blank" rel="noopener noreferrer" title="GitHub"><FiGithub /></a>
          <a href="#" title="Twitter"><FiTwitter /></a>
        </div>
        <div className="footer-copy">
          &copy; {new Date().getFullYear()} ArtNexus. Creative Intelligence.
        </div>
      </footer>
    </div>
  );
}
