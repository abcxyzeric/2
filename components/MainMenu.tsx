import React from 'react';
import { Play, Globe, Settings } from 'lucide-react';
import Button from './Button';
import { AppView } from '../types';

interface MainMenuProps {
  onNavigate: (view: AppView) => void;
}

const MainMenu: React.FC<MainMenuProps> = ({ onNavigate }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full relative z-10 animate-fade-in px-4 overflow-hidden">
      {/* Decorative background glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/4 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/3 w-[500px] h-[500px] bg-teal-900/10 rounded-full blur-[100px] pointer-events-none mix-blend-screen" />

      {/* Header Section */}
      <div className="mb-14 text-center relative">
        <h1 className="text-5xl md:text-8xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-b from-white via-zinc-200 to-zinc-500 mb-6 tracking-tight drop-shadow-sm">
          MythOS remake
        </h1>
        <div className="h-px w-24 bg-gradient-to-r from-transparent via-zinc-500 to-transparent mx-auto mb-6 opacity-50"></div>
        <p className="text-zinc-400 tracking-[0.3em] text-xs md:text-sm uppercase font-medium">
          Khởi nguyên thế giới ảo
        </p>
      </div>

      {/* Navigation Buttons */}
      <div className="w-full max-w-sm flex flex-col gap-5">
        <Button 
          onClick={() => onNavigate(AppView.GAMEPLAY)} 
          icon={Play}
          variant="primary"
          fullWidth
          className="shadow-xl shadow-indigo-500/5"
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
      <div className="absolute bottom-6 text-zinc-600 text-[10px] tracking-widest uppercase font-semibold">
        Phiên bản 1.0.0
      </div>
    </div>
  );
};

export default MainMenu;