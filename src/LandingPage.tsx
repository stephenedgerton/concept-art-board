import { motion } from 'framer-motion';
import { FiArrowRight, FiGithub, FiTwitter, FiLayers, FiUsers } from 'react-icons/fi';
import './LandingPage.css';

interface LandingPageProps {
  onEnterVault: () => void;
  onEnterRoster: () => void;
}

export default function LandingPage({ onEnterVault, onEnterRoster }: LandingPageProps) {
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
          <FiLayers /> <span>ConceptVault</span>
        </div>
        <nav className="landing-nav">
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
            <motion.h1 
              className="hero-title"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.2, delay: 0.2 }}
            >
              Creative <span className="text-gradient">Vision</span> Realized.
            </motion.h1>
            <motion.p 
              className="hero-subtitle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.5 }}
            >
              Organize, showcase, and optimize your concept art, animations, and VFX in one high-performance vault.
            </motion.p>
            
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
                <div className="future-link disabled" title="Coming Soon">
                  <span>VFX Lab</span>
                  <span className="badge">Soon</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="footer-socials">
          <a href="#" title="GitHub"><FiGithub /></a>
          <a href="#" title="Twitter"><FiTwitter /></a>
        </div>
        <div className="footer-copy">
          &copy; {new Date().getFullYear()} ConceptVault. Modern Asset Management.
        </div>
      </footer>
    </div>
  );
}
