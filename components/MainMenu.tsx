import React from 'react';
import { Play, Globe, Settings } from 'lucide-react';
import Button from './Button';
import { AppView } from '../types';

interface MainMenuProps {
  onNavigate: (view: AppView) => void;
}

const MainMenu: React.FC<MainMenuProps> = ({ onNavigate }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full relative z-10 animate-fade-in px-4">
      {/* Decorative background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-900/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Header Section */}
      <div className="mb-12 text-center">
        <h1 className="text-5xl md:text-7xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-b from-zinc-100 to-zinc-500 mb-4 tracking-tight">
          MythOS remake
        </h1>
        <p className="text-zinc-500 tracking-[0.2em] text-xs md:text-sm uppercase opacity-80">
          Khởi nguyên thế giới ảo
        </p>
      </div>

      {/* Navigation Buttons */}
      <div className="w-full max-w-xs flex flex-col gap-4">
        <Button 
          onClick={() => onNavigate(AppView.GAMEPLAY)} 
          icon={Play}
          variant="primary"
          fullWidth
        >
          Bắt đầu chơi
        </Button>

        <Button 
          onClick={() => onNavigate(AppView.WORLD_CREATION)} 
          icon={Globe}
          variant="secondary"
          fullWidth
        >
          Tạo thế giới
        </Button>

        <Button 
          onClick={() => onNavigate(AppView.SETTINGS)} 
          icon={Settings}
          variant="secondary"
          fullWidth
        >
          Cài đặt
        </Button>
      </div>

      {/* Footer / Version */}
      <div className="absolute bottom-6 text-zinc-700 text-xs tracking-widest">
        V 1.0.0
      </div>
    </div>
  );
};

export default MainMenu;