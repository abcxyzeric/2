import React, { useState } from 'react';
import { AppView, AppTheme } from './types';
import MainMenu from './components/MainMenu';
import Gameplay from './components/Gameplay';
import WorldCreation from './components/WorldCreation';
import Settings from './components/Settings';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.MAIN_MENU);
  const [currentTheme, setCurrentTheme] = useState<AppTheme>(AppTheme.DEFAULT);

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
        return (
          <Settings 
            onNavigate={setCurrentView} 
            currentTheme={currentTheme}
            onSetTheme={setCurrentTheme}
          />
        );
      default:
        return <MainMenu onNavigate={setCurrentView} />;
    }
  };

  const getThemeGradient = () => {
    switch (currentTheme) {
      case AppTheme.MIDNIGHT:
        return 'from-indigo-950 via-zinc-950 to-zinc-950';
      case AppTheme.FOREST:
        return 'from-emerald-950 via-zinc-950 to-zinc-950';
      case AppTheme.CRIMSON:
        return 'from-rose-950 via-zinc-950 to-zinc-950';
      case AppTheme.AMBER:
        return 'from-amber-950 via-zinc-950 to-zinc-950';
      case AppTheme.ROYAL:
        return 'from-violet-950 via-zinc-950 to-zinc-950';
      default:
        return 'from-zinc-900 via-zinc-950 to-zinc-950';
    }
  };

  return (
    <div className={`min-h-screen w-full bg-zinc-950 text-zinc-200 selection:bg-white/20 selection:text-white`}>
      {/* Dynamic Background Noise/Gradient Overlay */}
      <div 
        className={`fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] ${getThemeGradient()} pointer-events-none transition-colors duration-700 ease-in-out`} 
      />
      
      {/* Main Content Area */}
      <main className="relative z-10 w-full h-full">
        {renderView()}
      </main>
    </div>
  );
};

export default App;