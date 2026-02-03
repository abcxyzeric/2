import React, { useState } from 'react';
import { AppView, AppTheme, AIConfig, DEFAULT_AI_CONFIG, GameSession, INITIAL_PERSONA, INITIAL_WORLD_INFO } from './types';
import MainMenu from './components/MainMenu';
import Gameplay from './components/Gameplay';
import WorldCreation from './components/WorldCreation';
import Settings from './components/Settings';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.MAIN_MENU);
  const [currentTheme, setCurrentTheme] = useState<AppTheme>(AppTheme.DEFAULT);
  const [aiConfig, setAiConfig] = useState<AIConfig>(DEFAULT_AI_CONFIG);
  
  // Game Session State (Lifted)
  const [gameSession, setGameSession] = useState<GameSession>({
    messages: [],
    activePreset: null,
    persona: INITIAL_PERSONA,
    worldInfo: INITIAL_WORLD_INFO,
    isProcessing: false,
  });

  // Handler to update game data from World Creation
  const handleSetGameData = (data: { persona: any, worldInfo: any }) => {
    setGameSession(prev => ({
        ...prev,
        persona: data.persona,
        worldInfo: data.worldInfo,
        // Optional: Clear messages when starting new world, or keep them?
        // Let's keep messages empty for a new game.
        messages: []
    }));
  };

  // Render the current view based on state
  const renderView = () => {
    switch (currentView) {
      case AppView.MAIN_MENU:
        return <MainMenu onNavigate={setCurrentView} />;
      case AppView.GAMEPLAY:
        return (
          <Gameplay 
            onNavigate={setCurrentView} 
            gameSession={gameSession}
            setGameSession={setGameSession}
            aiConfig={aiConfig}
            onSetAiConfig={setAiConfig}
          />
        );
      case AppView.WORLD_CREATION:
        return (
          <WorldCreation 
            onNavigate={setCurrentView} 
            aiConfig={aiConfig} 
            setGameData={handleSetGameData}
          />
        );
      case AppView.SETTINGS:
        return (
          <Settings 
            onNavigate={setCurrentView} 
            currentTheme={currentTheme}
            onSetTheme={setCurrentTheme}
            aiConfig={aiConfig}
            onSetAiConfig={setAiConfig}
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
        // Updated Default to Slate for a cooler, deeper aesthetic instead of plain Zinc
        return 'from-slate-900 via-zinc-950 to-black';
    }
  };

  return (
    <div className={`min-h-screen w-full bg-zinc-950 text-zinc-200 selection:bg-white/20 selection:text-white`}>
      {/* Dynamic Background Noise/Gradient Overlay */}
      <div 
        className={`fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] ${getThemeGradient()} pointer-events-none transition-colors duration-1000 ease-in-out`} 
      />
      
      {/* Main Content Area */}
      <main className="relative z-10 w-full h-full">
        {renderView()}
      </main>
    </div>
  );
};

export default App;