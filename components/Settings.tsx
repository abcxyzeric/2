import React from 'react';
import { ArrowLeft, Sliders, Palette, Shield, Check } from 'lucide-react';
import Button from './Button';
import { AppView, AppTheme } from '../types';

interface SettingsProps {
  onNavigate: (view: AppView) => void;
  currentTheme: AppTheme;
  onSetTheme: (theme: AppTheme) => void;
}

const Settings: React.FC<SettingsProps> = ({ onNavigate, currentTheme, onSetTheme }) => {
  
  const themes = [
    { id: AppTheme.DEFAULT, name: 'Mặc định (MythOS)', color: 'bg-zinc-800' },
    { id: AppTheme.MIDNIGHT, name: 'Đêm trường', color: 'bg-indigo-900' },
    { id: AppTheme.FOREST, name: 'Rừng thẳm', color: 'bg-emerald-900' },
    { id: AppTheme.CRIMSON, name: 'Huyết nguyệt', color: 'bg-rose-900' },
    { id: AppTheme.AMBER, name: 'Hổ phách', color: 'bg-amber-900' },
    { id: AppTheme.ROYAL, name: 'Hoàng gia', color: 'bg-violet-900' },
  ];

  const safetyConfig = [
    { label: 'Harassment', status: 'OFF' },
    { label: 'Hate Speech', status: 'OFF' },
    { label: 'Sexually Explicit', status: 'OFF' },
    { label: 'Dangerous Content', status: 'OFF' },
    { label: 'Civic Integrity', status: 'OFF' },
  ];

  return (
    <div className="flex flex-col h-screen w-full animate-fade-in bg-transparent overflow-y-auto">
       {/* Top Bar */}
      <div className="h-16 border-b border-white/5 flex items-center px-4 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-20">
        <Button 
          onClick={() => onNavigate(AppView.MAIN_MENU)} 
          variant="ghost" 
          icon={ArrowLeft}
          className="mr-4 !px-3"
        >
          {null}
        </Button>
        <div className="font-medium text-zinc-200">Cài đặt</div>
      </div>

      <div className="flex-1 max-w-3xl w-full mx-auto p-6 space-y-8">
        
        {/* Theme Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-zinc-400 border-b border-white/5 pb-2">
            <Palette size={20} />
            <h2 className="text-sm font-semibold uppercase tracking-wider">Giao diện (Themes)</h2>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {themes.map((theme) => (
              <button
                key={theme.id}
                onClick={() => onSetTheme(theme.id)}
                className={`relative flex items-center justify-between p-4 rounded-xl border transition-all duration-300 ${
                  currentTheme === theme.id 
                    ? 'border-white/40 bg-white/10 shadow-lg' 
                    : 'border-white/5 bg-zinc-900/50 hover:bg-zinc-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full ${theme.color} shadow-inner border border-white/10`}></div>
                  <span className={`text-sm font-medium ${currentTheme === theme.id ? 'text-white' : 'text-zinc-400'}`}>
                    {theme.name}
                  </span>
                </div>
                {currentTheme === theme.id && <Check size={16} className="text-white" />}
              </button>
            ))}
          </div>
        </section>

        {/* Safety Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-zinc-400 border-b border-white/5 pb-2">
            <Shield size={20} />
            <h2 className="text-sm font-semibold uppercase tracking-wider">Cấu hình An toàn AI</h2>
          </div>
          
          <div className="bg-zinc-900/30 rounded-xl border border-white/5 p-4 space-y-3">
            <div className="text-xs text-zinc-500 mb-2 italic">
              * Cài đặt này được áp dụng mặc định để đảm bảo trải nghiệm nhập vai không bị gián đoạn.
            </div>
            {safetyConfig.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <span className="text-zinc-300 text-sm">{item.label}</span>
                <span className="px-3 py-1 bg-red-500/10 text-red-400 text-xs font-bold rounded-full border border-red-500/20">
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
};

export default Settings;