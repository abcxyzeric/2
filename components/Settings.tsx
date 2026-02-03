import React from 'react';
import { ArrowLeft, Sliders, Palette, Shield, Check, Cpu } from 'lucide-react';
import Button from './Button';
import { AppView, AppTheme, AIConfig, ThinkingLevel } from '../types';

interface SettingsProps {
  onNavigate: (view: AppView) => void;
  currentTheme: AppTheme;
  onSetTheme: (theme: AppTheme) => void;
  aiConfig: AIConfig;
  onSetAiConfig: (config: AIConfig) => void;
}

const Settings: React.FC<SettingsProps> = ({ 
  onNavigate, 
  currentTheme, 
  onSetTheme,
  aiConfig,
  onSetAiConfig
}) => {
  
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

  const thinkingLevels = [
    { value: ThinkingLevel.AUTO, label: 'Tự động (Auto)' },
    { value: ThinkingLevel.MINIMUM, label: 'Tối thiểu (Min)' },
    { value: ThinkingLevel.LOW, label: 'Thấp (Low)' },
    { value: ThinkingLevel.MEDIUM, label: 'Trung bình (Medium)' },
    { value: ThinkingLevel.HIGH, label: 'Cao (High)' },
    { value: ThinkingLevel.MAXIMUM, label: 'Tối đa (Max 32k)' },
  ];

  const handleConfigChange = (key: keyof AIConfig, value: number | string) => {
    onSetAiConfig({
      ...aiConfig,
      [key]: value
    });
  };

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

      <div className="flex-1 max-w-3xl w-full mx-auto p-6 space-y-8 pb-20">
        
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

        {/* Advanced AI Parameters */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-zinc-400 border-b border-white/5 pb-2">
            <Cpu size={20} />
            <h2 className="text-sm font-semibold uppercase tracking-wider">Tham số AI Nâng cao</h2>
          </div>

          <div className="bg-zinc-900/30 rounded-xl border border-white/5 p-6 space-y-6">
            
            {/* Thinking Budget */}
            <div className="space-y-2">
              <label className="text-sm text-zinc-300 font-medium">Ngân sách suy nghĩ (Thinking Budget)</label>
              <select
                value={aiConfig.thinkingLevel}
                onChange={(e) => handleConfigChange('thinkingLevel', e.target.value)}
                className="w-full bg-zinc-950 border border-white/10 rounded-lg px-4 py-3 text-sm focus:border-zinc-500 outline-none transition-colors text-zinc-200"
              >
                {thinkingLevels.map((level) => (
                  <option key={level.value} value={level.value}>{level.label}</option>
                ))}
              </select>
            </div>

            {/* Context Size */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-sm text-zinc-300">Context Size (Tokens)</label>
                <span className="text-xs text-zinc-500">Max: 2,000,000</span>
              </div>
              <div className="flex gap-4 items-center">
                <input 
                  type="range" 
                  min="1000" 
                  max="2000000" 
                  step="1000"
                  value={aiConfig.contextSize}
                  onChange={(e) => handleConfigChange('contextSize', Number(e.target.value))}
                  className="flex-1 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <input 
                  type="number"
                  value={aiConfig.contextSize}
                  onChange={(e) => handleConfigChange('contextSize', Number(e.target.value))}
                  className="w-24 bg-zinc-950 border border-white/10 rounded-md px-2 py-1 text-sm text-right outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Temperature */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-sm text-zinc-300">Temperature (Sáng tạo)</label>
                <span className="text-xs text-zinc-500">Max: 2.0</span>
              </div>
              <div className="flex gap-4 items-center">
                <input 
                  type="range" 
                  min="0" 
                  max="2.0" 
                  step="0.01"
                  value={aiConfig.temperature}
                  onChange={(e) => handleConfigChange('temperature', Number(e.target.value))}
                  className="flex-1 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <input 
                  type="number"
                  step="0.01"
                  max="2.0"
                  value={aiConfig.temperature}
                  onChange={(e) => handleConfigChange('temperature', Number(e.target.value))}
                  className="w-24 bg-zinc-950 border border-white/10 rounded-md px-2 py-1 text-sm text-right outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Top K */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-sm text-zinc-300">Top K</label>
                <span className="text-xs text-zinc-500">Max: 500</span>
              </div>
              <div className="flex gap-4 items-center">
                <input 
                  type="range" 
                  min="1" 
                  max="500" 
                  step="1"
                  value={aiConfig.topK}
                  onChange={(e) => handleConfigChange('topK', Number(e.target.value))}
                  className="flex-1 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <input 
                  type="number"
                  max="500"
                  value={aiConfig.topK}
                  onChange={(e) => handleConfigChange('topK', Number(e.target.value))}
                  className="w-24 bg-zinc-950 border border-white/10 rounded-md px-2 py-1 text-sm text-right outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Top P */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-sm text-zinc-300">Top P</label>
                <span className="text-xs text-zinc-500">Max: 1.0</span>
              </div>
              <div className="flex gap-4 items-center">
                <input 
                  type="range" 
                  min="0" 
                  max="1.0" 
                  step="0.01"
                  value={aiConfig.topP}
                  onChange={(e) => handleConfigChange('topP', Number(e.target.value))}
                  className="flex-1 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <input 
                  type="number"
                  step="0.01"
                  max="1.0"
                  value={aiConfig.topP}
                  onChange={(e) => handleConfigChange('topP', Number(e.target.value))}
                  className="w-24 bg-zinc-950 border border-white/10 rounded-md px-2 py-1 text-sm text-right outline-none focus:border-indigo-500"
                />
              </div>
            </div>

             {/* Max Output Length */}
             <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-sm text-zinc-300">Max Response Length</label>
                <span className="text-xs text-zinc-500">Max: 65,000</span>
              </div>
              <div className="flex gap-4 items-center">
                <input 
                  type="range" 
                  min="100" 
                  max="65000" 
                  step="100"
                  value={aiConfig.maxOutputTokens}
                  onChange={(e) => handleConfigChange('maxOutputTokens', Number(e.target.value))}
                  className="flex-1 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <input 
                  type="number"
                  max="65000"
                  value={aiConfig.maxOutputTokens}
                  onChange={(e) => handleConfigChange('maxOutputTokens', Number(e.target.value))}
                  className="w-24 bg-zinc-950 border border-white/10 rounded-md px-2 py-1 text-sm text-right outline-none focus:border-indigo-500"
                />
              </div>
            </div>

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