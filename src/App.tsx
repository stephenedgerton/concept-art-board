import React, { useState } from 'react';
import LandingPage from './LandingPage';
import Vault from './Vault';
import CharacterBoard from './CharacterBoard';
import Estimator from './Estimator';
import ProductionDashboard from './ProductionDashboard';
import './App.css';

export type ViewState = 'landing' | 'vault' | 'roster' | 'estimator' | 'dashboard';

export default function App() {
  const [view, setView] = useState<ViewState>('landing');

  return (
    <>
      {view === 'landing' && (
        <LandingPage 
          onEnterVault={() => setView('vault')} 
          onEnterRoster={() => setView('roster')} 
          onEnterEstimator={() => setView('estimator')}
          onEnterDashboard={() => setView('dashboard')}
        />
      )}
      {view === 'vault' && (
        <Vault onBackToLanding={() => setView('landing')} />
      )}
      {view === 'roster' && (
        <CharacterBoard onBackToLanding={() => setView('landing')} />
      )}
      {view === 'estimator' && (
        <Estimator onBackToLanding={() => setView('landing')} />
      )}
      {view === 'dashboard' && (
        <ProductionDashboard onBackToLanding={() => setView('landing')} />
      )}
    </>
  );
}
