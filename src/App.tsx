import React, { useState } from 'react';
import LandingPage from './LandingPage';
import Vault from './Vault';
import CharacterBoard from './CharacterBoard';
import './App.css';

export type ViewState = 'landing' | 'vault' | 'roster';

export default function App() {
  const [view, setView] = useState<ViewState>('landing');

  return (
    <>
      {view === 'landing' && (
        <LandingPage 
          onEnterVault={() => setView('vault')} 
          onEnterRoster={() => setView('roster')} 
        />
      )}
      {view === 'vault' && (
        <Vault onBackToLanding={() => setView('landing')} />
      )}
      {view === 'roster' && (
        <CharacterBoard onBackToLanding={() => setView('landing')} />
      )}
    </>
  );
}
