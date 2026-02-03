import React, { useState, useRef } from 'react';
import { ArrowLeft, Sliders, Palette, Shield, Check, Cpu, Server, ChevronDown, ChevronUp, Download, Upload, Wifi, WifiOff, Loader2 } from 'lucide-react';
import Button from './Button';
import Toast from './Toast';
import ConfigSlider from './ConfigSlider';
import { AppView, AppTheme, AIConfig, ThinkingLevel, AIModel } from '../types';

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
  const [isProxyExpanded, setIsProxyExpanded] = useState(false);
  const [proxyStatus, setProxyStatus] = useState<'idle' | 'checking' | 'connected' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const themes = [
    { id: AppTheme.DEFAULT, name: 'Mặc định (MythOS)', color: 'bg-slate-800' },
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

  const aiModels = [
    { value: AIModel.GEMINI_3_PRO_PREVIEW, label: 'Gemini 3.0 Pro Preview' },
    { value: AIModel.GEMINI_3_FLASH_PREVIEW, label: 'Gemini 3.0 Flash Preview' },
    { value: AIModel.GEMINI_2_5_PRO, label: 'Gemini 2.5 Pro (2.0 Pro Exp)' },
  ];

  const handleConfigChange = (key: keyof AIConfig, value: number | string) => {
    onSetAiConfig({
      ...aiConfig,
      [key]: value
    });
    // Reset connection status if Url or Password changes
    if (key === 'proxyUrl' || key === 'proxyPassword') {
        setProxyStatus('idle');
    }
  };

  const handleExportConfig = () => {
    const configStr = JSON.stringify({
      proxyName: aiConfig.proxyName,
      proxyUrl: aiConfig.proxyUrl,
      proxyPassword: aiConfig.proxyPassword
    }, null, 2);
    const blob = new Blob([configStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mythos_proxy_config.json';
    a.click();
    URL.revokeObjectURL(url);
    setToast({ message: "Đã xuất cấu hình Proxy!", type: "success" });
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.proxyUrl !== undefined) {
          onSetAiConfig({
            ...aiConfig,
            proxyName: json.proxyName || '',
            proxyUrl: json.proxyUrl || '',
            proxyPassword: json.proxyPassword || ''
          });
          setProxyStatus('idle');
          setToast({ message: "Đã nhập cấu hình thành công!", type: "success" });
        } else {
          setToast({ message: "File cấu hình không hợp lệ.", type: "error" });
        }
      } catch (err) {
        setToast({ message: "Lỗi đọc file.", type: "error" });
      }
    };
    reader.readAsText(file);
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCheckProxy = async () => {
    if (!aiConfig.proxyUrl) {
        setToast({ message: "Vui lòng nhập URL Proxy trước", type: "error" });
        return;
    }

    setProxyStatus('checking');
    try {
        // Construct a simple GET request to check models list
        // This is a standard endpoint for Gemini-compatible APIs
        const baseUrl = aiConfig.proxyUrl.replace(/\/$/, "");
        const url = `${baseUrl}/v1beta/models?key=${aiConfig.proxyPassword}`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (response.ok) {
            setProxyStatus('connected');
            setToast({ message: "Kết nối Proxy thành công!", type: "success" });
        } else {
            setProxyStatus('error');
            setToast({ message: `Lỗi Proxy: ${response.status} ${response.statusText}`, type: "error" });
        }
    } catch (error) {
        console.error(error);
        setProxyStatus('error');
        setToast({ message: "Không thể kết nối đến máy chủ Proxy", type: "error" });
    }
  };

  return (
    <div className="flex flex-col h-screen w-full animate-fade-in bg-transparent overflow-y-auto">
       {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
       
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
            
            {/* Model Selection */}
            <div className="space-y-2">
              <label className="text-sm text-zinc-300 font-medium">Chọn Model</label>
              <select
                value={aiConfig.model}
                onChange={(e) => handleConfigChange('model', e.target.value)}
                className="w-full bg-zinc-950 border border-white/10 rounded-lg px-4 py-3 text-sm focus:border-zinc-500 outline-none transition-colors text-zinc-200 font-mono"
              >
                {aiModels.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

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

            <ConfigSlider 
                label="Context Size (Tokens)"
                subLabel="Max: 2,000,000"
                value={aiConfig.contextSize}
                onChange={(val) => handleConfigChange('contextSize', val)}
                min={1000}
                max={2000000}
                step={1000}
            />

            <ConfigSlider 
                label="Temperature (Sáng tạo)"
                subLabel="Max: 2.0"
                value={aiConfig.temperature}
                onChange={(val) => handleConfigChange('temperature', val)}
                min={0}
                max={2.0}
                step={0.01}
            />

            <ConfigSlider 
                label="Top K"
                subLabel="Max: 500"
                value={aiConfig.topK}
                onChange={(val) => handleConfigChange('topK', val)}
                min={1}
                max={500}
                step={1}
            />

            <ConfigSlider 
                label="Top P"
                subLabel="Max: 1.0"
                value={aiConfig.topP}
                onChange={(val) => handleConfigChange('topP', val)}
                min={0}
                max={1.0}
                step={0.01}
            />

            <ConfigSlider 
                label="Max Response Length"
                subLabel="Max: 65,000"
                value={aiConfig.maxOutputTokens}
                onChange={(val) => handleConfigChange('maxOutputTokens', val)}
                min={100}
                max={65000}
                step={100}
            />

          </div>
        </section>

        {/* Reverse Proxy Section */}
        <section className="space-y-4">
           <div 
             className="flex items-center justify-between text-zinc-400 border-b border-white/5 pb-2 cursor-pointer hover:text-zinc-200 transition-colors"
             onClick={() => setIsProxyExpanded(!isProxyExpanded)}
           >
            <div className="flex items-center gap-2">
              <Server size={20} />
              <h2 className="text-sm font-semibold uppercase tracking-wider">Reverse Proxy</h2>
            </div>
             {isProxyExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>

           {isProxyExpanded && (
             <div className="bg-zinc-900/30 rounded-xl border border-white/5 p-6 space-y-6 animate-fade-in">
               
               {/* Import / Export Buttons */}
               <div className="flex gap-3 mb-4">
                 <input 
                   type="file" 
                   ref={fileInputRef} 
                   onChange={handleFileChange} 
                   accept=".json" 
                   className="hidden" 
                 />
                 <Button onClick={handleImportClick} variant="secondary" icon={Upload} className="flex-1 text-xs py-2">
                   Import Config
                 </Button>
                 <Button onClick={handleExportConfig} variant="secondary" icon={Download} className="flex-1 text-xs py-2">
                   Export Config
                 </Button>
               </div>

               <div className="space-y-2">
                  <label className="text-sm text-zinc-300 font-medium">Tên Proxy</label>
                  <input 
                    type="text" 
                    value={aiConfig.proxyName}
                    onChange={(e) => handleConfigChange('proxyName', e.target.value)}
                    placeholder="Ví dụ: My Custom Proxy"
                    className="w-full bg-zinc-950 border border-white/10 rounded-lg px-4 py-3 focus:border-zinc-500 outline-none transition-colors text-zinc-200"
                  />
               </div>

                <div className="space-y-2">
                  <label className="text-sm text-zinc-300 font-medium">Proxy Server URL</label>
                  <input 
                    type="text" 
                    value={aiConfig.proxyUrl}
                    onChange={(e) => handleConfigChange('proxyUrl', e.target.value)}
                    placeholder="https://my-proxy.com"
                    className="w-full bg-zinc-950 border border-white/10 rounded-lg px-4 py-3 focus:border-zinc-500 outline-none transition-colors text-zinc-200 font-mono text-sm"
                  />
               </div>

                <div className="space-y-2">
                  <label className="text-sm text-zinc-300 font-medium">Proxy Password (API Key)</label>
                  <input 
                    type="password" 
                    value={aiConfig.proxyPassword}
                    onChange={(e) => handleConfigChange('proxyPassword', e.target.value)}
                    placeholder="Nhập khóa API..."
                    className="w-full bg-zinc-950 border border-white/10 rounded-lg px-4 py-3 focus:border-zinc-500 outline-none transition-colors text-zinc-200 font-mono text-sm"
                  />
               </div>

               <p className="text-xs text-zinc-500 italic mt-2">
                 * Nếu URL và Password được điền, hệ thống sẽ ưu tiên sử dụng Proxy thay vì API Key mặc định của ứng dụng.
               </p>

                {/* Test Connection Button & Status */}
                <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                     <Button 
                        onClick={handleCheckProxy} 
                        variant="secondary" 
                        className="gap-2"
                        disabled={proxyStatus === 'checking'}
                     >
                        {proxyStatus === 'checking' ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <Wifi size={16} />
                        )}
                        Kiểm tra kết nối
                     </Button>

                     {/* Status Indicators */}
                     <div className="flex items-center gap-4">
                        {proxyStatus === 'connected' && (
                            <div className="flex items-center gap-2 text-emerald-400 bg-emerald-950/30 px-3 py-1.5 rounded-lg border border-emerald-500/20 animate-fade-in">
                                <Wifi size={16} strokeWidth={2.5} />
                                <span className="text-sm font-bold tracking-wide">Connected</span>
                            </div>
                        )}
                        {proxyStatus === 'error' && (
                            <div className="flex items-center gap-2 text-red-400 bg-red-950/30 px-3 py-1.5 rounded-lg border border-red-500/20 animate-fade-in">
                                <WifiOff size={16} strokeWidth={2.5} />
                                <span className="text-sm font-bold tracking-wide">Disconnected</span>
                            </div>
                        )}
                     </div>
                </div>

             </div>
           )}
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