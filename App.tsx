import React, { useState } from 'react';
import { AppView } from './types';
import MainMenu from './components/MainMenu';
import Gameplay from './components/Gameplay';
import WorldCreation from './components/WorldCreation';
import Settings from './components/Settings';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.MAIN_MENU);

  // Render the current view based on state
  const renderView = () => {
    switch (currentView) {
      case AppView.MAIN_MENU:
        return <MainMenu onNavigate={setCurrentView} />;
      case AppView.GAMEPLAY:
        return <Gameplay onNavigate={setCurrentView} />;
      case AppView.WORLD_CREATION:
        return <WorldCreation onNavigate={setCurrentView} />;
      case AppView.SETTINGS:
        return <Settings onNavigate={setCurrentView} />;
      default:
        return <MainMenu onNavigate={setCurrentView} />;
    }
  };

  return (
    <div className="min-h-screen w-full bg-zinc-950 text-zinc-200 selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Background Noise/Gradient Overlay */}
      <div className="fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-zinc-950 pointer-events-none" />
      
      {/* Main Content Area */}
      <main className="relative z-10 w-full h-full">
        {renderView()}
      </main>
    </div>
  );
};

export default App;