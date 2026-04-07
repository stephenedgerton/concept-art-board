import { useState } from 'react';
import LandingPage from './LandingPage';
import Vault from './Vault';
import ReviewPage from './ReviewPage';
import CharacterBoard from './CharacterBoard';
import Estimator from './Estimator';
import ProductionDashboard from './ProductionDashboard';
import './App.css';

export type ViewState = 'landing' | 'vault' | 'roster' | 'estimator' | 'dashboard' | 'review';

export default function App() {
  const [view, setView] = useState<ViewState>('landing');
  const [privacyMode, setPrivacyMode] = useState(false);

  console.log('App Rendering. Current view:', view);

  const onBackToLanding = () => setView('landing');

  return (
    <div className="app-main-wrapper" style={{ width: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {view === 'landing' && (
        <LandingPage 
          onEnterVault={() => setView('vault')} 
          onEnterRoster={() => setView('roster')} 
          onEnterEstimator={() => setView('estimator')}
          onEnterDashboard={() => setView('dashboard')}
          onEnterReview={() => setView('review')}
          privacyMode={privacyMode}
          onTogglePrivacy={() => setPrivacyMode(!privacyMode)}
        />
      )}
      {view === 'vault' && <Vault onBackToLanding={onBackToLanding} />}
      {view === 'review' && <ReviewPage onBackToLanding={onBackToLanding} />}
      {view === 'roster' && <CharacterBoard onBackToLanding={onBackToLanding} privacyMode={privacyMode} onTogglePrivacy={() => setPrivacyMode(!privacyMode)} />}
      {view === 'estimator' && <Estimator onBackToLanding={onBackToLanding} privacyMode={privacyMode} onTogglePrivacy={() => setPrivacyMode(!privacyMode)} />}
      {view === 'dashboard' && <ProductionDashboard onBackToLanding={onBackToLanding} privacyMode={privacyMode} onTogglePrivacy={() => setPrivacyMode(!privacyMode)} />}
    </div>
  );
}
