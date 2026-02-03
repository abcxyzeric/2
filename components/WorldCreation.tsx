import React from 'react';
import { ArrowLeft, Globe } from 'lucide-react';
import Button from './Button';
import { AppView } from '../types';

interface WorldCreationProps {
  onNavigate: (view: AppView) => void;
}

const WorldCreation: React.FC<WorldCreationProps> = ({ onNavigate }) => {
  return (
    <div className="flex flex-col h-screen w-full animate-fade-in bg-zinc-950">
      {/* Top Bar */}
      <div className="h-16 border-b border-zinc-900 flex items-center px-4 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-20">
        <Button 
          onClick={() => onNavigate(AppView.MAIN_MENU)} 
          variant="ghost" 
          icon={ArrowLeft}
          className="mr-4 !px-3"
        >
          {null}
        </Button>
        <div className="font-medium text-zinc-200">Tạo thế giới</div>
      </div>

      {/* Content Placeholder */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-600">
         <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center mb-4 border border-zinc-800">
          <Globe className="text-zinc-500" />
        </div>
        <p className="text-sm">Chức năng đang được phát triển...</p>
      </div>
    </div>
  );
};

export default WorldCreation;