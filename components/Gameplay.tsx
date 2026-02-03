import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, SendHorizontal, Upload, FileText, Bot, User, Settings2, Trash2, RefreshCcw, GripVertical, ChevronDown, ChevronUp, CheckCircle2, CircleOff, Layers, Sliders } from 'lucide-react';
import Button from './Button';
import Toast from './Toast';
import ConfigSlider from './ConfigSlider';
import { AppView, GameSession, Message, AIConfig, Preset } from '../types';
import { callGemini } from '../services/ai';
import { constructDynamicPrompt } from '../services/gameplay-engine';

interface GameplayProps {
  onNavigate: (view: AppView) => void;
  gameSession: GameSession;
  setGameSession: React.Dispatch<React.SetStateAction<GameSession>>;
  aiConfig: AIConfig;
  onSetAiConfig?: (config: AIConfig) => void; // Optional to allow local updates if passed
}

// Helper to map technical identifiers to readable labels
const getPromptLabel = (identifier: string): string => {
  const map: Record<string, string> = {
    'main': 'Cốt truyện chính (Main)',
    'worldInfoBefore': 'Thông tin thế giới (Trước)',
    'worldInfoAfter': 'Thông tin thế giới (Sau)',
    'personaDescription': 'Hồ sơ người chơi (Persona)',
    'charDescription': 'Mô tả nhân vật (Char)',
    'charPersonality': 'Tính cách nhân vật',
    'scenario': 'Kịch bản (Scenario)',
    'enhanceDefinitions': 'Tăng cường định nghĩa',
    'dialogueExamples': 'Ví dụ đối thoại',
    'chatHistory': 'Lịch sử trò chuyện',
    'jailbreak': 'Vượt rào (Jailbreak)',
    'nsfw': 'NSFW / Adult Content',
    'authorNote': 'Ghi chú tác giả',
    'globalNote': 'Ghi chú toàn cục',
  };
  return map[identifier] || identifier; // Fallback to identifier if not found
};

const Gameplay: React.FC<GameplayProps> = ({ 
  onNavigate, 
  gameSession, 
  setGameSession, 
  aiConfig,
  onSetAiConfig // Assuming this is passed from App.tsx
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'CONFIG' | 'PRESET'>('CONFIG');
  const [expandedPrompts, setExpandedPrompts] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [gameSession.messages, isProcessing]);

  // --- Handlers ---

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isProcessing) return;

    const userMessage: Message = {
      role: 'user',
      content: inputValue,
      timestamp: Date.now(),
    };

    // Update state immediately with user message
    const updatedSession = {
      ...gameSession,
      messages: [...gameSession.messages, userMessage],
    };
    setGameSession(updatedSession);
    setInputValue('');
    setIsProcessing(true);

    try {
      // 1. Construct the prompt using the engine
      const prompt = constructDynamicPrompt(updatedSession, userMessage.content);
      
      // 2. Use Global AI Config (Source of Truth)
      // We pass undefined for presetSettings so ai.ts uses aiConfig
      // But if we want to respect preset ONLY if user didn't override, it's tricky.
      // Current Logic: Gameplay Settings (aiConfig) >> Preset Settings.
      // So we just rely on aiConfig passed to callGemini.

      // 3. Call AI
      const aiResponseText = await callGemini(prompt, aiConfig, 'text/plain');

      // 4. Add AI response to session
      const aiMessage: Message = {
        role: 'model',
        content: aiResponseText,
        timestamp: Date.now(),
      };

      setGameSession(prev => ({
        ...prev,
        messages: [...prev.messages, aiMessage]
      }));

    } catch (error) {
      setToast({ message: "Lỗi phản hồi từ AI. Vui lòng thử lại.", type: "error" });
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImportPreset = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        // Simple validation check
        if (json.prompts && json.prompt_order) {
          setGameSession(prev => ({ ...prev, activePreset: json }));
          setToast({ message: `Đã nạp Preset: ${json.name || "Custom"}`, type: "success" });
          // Don't close drawer, let user inspect
          setActiveTab('PRESET');
        } else {
          setToast({ message: "Cấu trúc file Preset không hợp lệ.", type: "error" });
        }
      } catch (err) {
        setToast({ message: "Lỗi đọc file JSON.", type: "error" });
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClearHistory = () => {
    if (confirm("Bạn có chắc chắn muốn xóa toàn bộ lịch sử trò chuyện?")) {
      setGameSession(prev => ({ ...prev, messages: [] }));
      setToast({ message: "Đã xóa lịch sử.", type: "info" });
    }
  };

  const togglePromptExpand = (id: string) => {
    setExpandedPrompts(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleConfigChange = (key: keyof AIConfig, value: number) => {
      if (onSetAiConfig) {
          onSetAiConfig({ ...aiConfig, [key]: value });
      }
  };

  // Helper to get order list safely
  const getPromptOrderList = () => {
    if (!gameSession.activePreset) return [];
    const orderRaw = gameSession.activePreset.prompt_order;
    if (Array.isArray(orderRaw)) {
        const firstItem = orderRaw[0] as any;
        if (firstItem && 'order' in firstItem && Array.isArray(firstItem.order)) {
            return firstItem.order;
        }
        return orderRaw;
    }
    return [];
  };

  const promptOrderList = getPromptOrderList();
  
  // Get all prompts (not just ordered ones) for Deep Inspector
  const allPrompts = gameSession.activePreset?.prompts || [];

  return (
    <div className="flex flex-col h-screen w-full animate-fade-in bg-zinc-950 relative overflow-hidden">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* --- Header --- */}
      <div className="h-16 border-b border-white/10 flex items-center justify-between px-4 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <Button 
            onClick={() => onNavigate(AppView.MAIN_MENU)} 
            variant="ghost" 
            icon={ArrowLeft}
            className="!px-2 text-zinc-400 hover:text-white"
          >
            {null}
          </Button>
          <div>
            <h2 className="font-serif font-bold text-zinc-100 text-lg tracking-wide">
              {gameSession.persona.name || "Khách"}
            </h2>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
              {gameSession.worldInfo.worldName || "Thế giới vô danh"}
            </p>
          </div>
        </div>
        
        <button 
          onClick={() => setIsDrawerOpen(true)}
          className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
        >
          <Settings2 size={20} />
        </button>
      </div>

      {/* --- Chat Area --- */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth">
        {gameSession.messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-[60vh] text-zinc-600 opacity-60">
            <Bot size={48} className="mb-4" />
            <p className="text-sm">Hãy bắt đầu câu chuyện...</p>
          </div>
        )}

        {gameSession.messages.map((msg, idx) => (
          <div 
            key={idx} 
            className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex max-w-[85%] md:max-w-[70%] gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center border ${msg.role === 'user' ? 'bg-indigo-900/30 border-indigo-500/30' : 'bg-emerald-900/30 border-emerald-500/30'}`}>
                {msg.role === 'user' ? <User size={14} className="text-indigo-400" /> : <Bot size={14} className="text-emerald-400" />}
              </div>

              {/* Bubble */}
              <div className={`
                p-3.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-md
                ${msg.role === 'user' 
                  ? 'bg-zinc-800 text-zinc-100 rounded-tr-none border border-white/5' 
                  : 'bg-zinc-900 text-zinc-300 rounded-tl-none border border-zinc-800'}
              `}>
                {msg.content}
              </div>
            </div>
          </div>
        ))}
        
        {/* Loading Indicator */}
        {isProcessing && (
          <div className="flex w-full justify-start animate-pulse">
             <div className="flex max-w-[80%] gap-3">
               <div className="w-8 h-8 rounded-full bg-emerald-900/30 border border-emerald-500/30 flex-shrink-0 flex items-center justify-center">
                 <Bot size={14} className="text-emerald-400" />
               </div>
               <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl rounded-tl-none flex gap-1 items-center h-10">
                 <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                 <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                 <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
               </div>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* --- Input Area --- */}
      <div className="p-4 bg-zinc-950 border-t border-white/10 relative z-20">
        <div className="relative max-w-4xl mx-auto flex items-end gap-2 bg-zinc-900/50 p-2 rounded-xl border border-white/10 focus-within:border-white/20 focus-within:ring-1 focus-within:ring-white/10 transition-all shadow-lg">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Nhập hành động hoặc lời thoại..."
            className="w-full bg-transparent border-none focus:ring-0 text-zinc-200 resize-none max-h-32 min-h-[44px] py-2.5 px-2 text-sm placeholder-zinc-600 scrollbar-hide"
            rows={1}
          />
          <button 
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isProcessing}
            className={`
              p-2.5 rounded-lg flex-shrink-0 transition-all duration-200
              ${inputValue.trim() && !isProcessing 
                ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/20' 
                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'}
            `}
          >
            <SendHorizontal size={20} />
          </button>
        </div>
        <div className="text-center mt-2">
           <p className="text-[10px] text-zinc-600">MythOS AI có thể mắc lỗi. Hãy kiểm tra thông tin quan trọng.</p>
        </div>
      </div>

      {/* --- Right Drawer (Settings & Presets) --- */}
      {isDrawerOpen && (
        <div className="absolute inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsDrawerOpen(false)} />
          <div className="w-[420px] h-full bg-zinc-900 border-l border-white/10 relative z-10 flex flex-col shadow-2xl animate-fade-in">
            
            {/* Drawer Header */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-zinc-950/50">
              <h3 className="font-semibold text-zinc-200 flex items-center gap-2">
                <Settings2 size={18} /> Cấu hình & Preset
              </h3>
              <button onClick={() => setIsDrawerOpen(false)} className="text-zinc-500 hover:text-zinc-300 p-1 rounded hover:bg-white/5">
                <ArrowLeft size={18} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/5 bg-zinc-900/50">
               <button 
                 onClick={() => setActiveTab('CONFIG')}
                 className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'CONFIG' ? 'text-indigo-400 border-b-2 border-indigo-500 bg-white/5' : 'text-zinc-500 hover:text-zinc-300'}`}
               >
                 Cấu hình AI
               </button>
               <button 
                 onClick={() => setActiveTab('PRESET')}
                 className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'PRESET' ? 'text-indigo-400 border-b-2 border-indigo-500 bg-white/5' : 'text-zinc-500 hover:text-zinc-300'}`}
               >
                 Preset Inspector
               </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              
              {/* === TAB: AI CONFIG === */}
              {activeTab === 'CONFIG' && (
                 <div className="space-y-6 animate-fade-in">
                    <div className="bg-zinc-950 rounded-xl border border-white/5 p-4 space-y-5">
                       <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                          <Sliders size={14} /> Tham số Sinh (Generation)
                       </h4>
                       
                       <ConfigSlider 
                          label="Temperature"
                          value={aiConfig.temperature}
                          onChange={(v) => handleConfigChange('temperature', v)}
                          min={0} max={2.0} step={0.01}
                       />
                       <ConfigSlider 
                          label="Top K"
                          value={aiConfig.topK}
                          onChange={(v) => handleConfigChange('topK', v)}
                          min={1} max={500} step={1}
                       />
                       <ConfigSlider 
                          label="Top P"
                          value={aiConfig.topP}
                          onChange={(v) => handleConfigChange('topP', v)}
                          min={0} max={1.0} step={0.01}
                       />
                       <ConfigSlider 
                          label="Context Size"
                          value={aiConfig.contextSize}
                          onChange={(v) => handleConfigChange('contextSize', v)}
                          min={1000} max={2000000} step={1000}
                       />
                       <ConfigSlider 
                          label="Max Response"
                          value={aiConfig.maxOutputTokens}
                          onChange={(v) => handleConfigChange('maxOutputTokens', v)}
                          min={100} max={65000} step={100}
                       />
                    </div>

                    <div className="pt-4 border-t border-white/5">
                        <button 
                        onClick={handleClearHistory}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500/5 text-red-400 hover:bg-red-500/15 border border-red-500/10 transition-all text-xs font-semibold uppercase tracking-wide hover:shadow-lg hover:shadow-red-900/10"
                        >
                        <Trash2 size={16} /> Xóa lịch sử Chat
                        </button>
                    </div>
                 </div>
              )}

              {/* === TAB: PRESET INSPECTOR === */}
              {activeTab === 'PRESET' && (
                <div className="space-y-6 animate-fade-in">
                    
                    {/* Active Preset Info */}
                    <div className="bg-zinc-950 rounded-xl border border-white/5 overflow-hidden">
                        <div className="bg-white/5 px-4 py-3 border-b border-white/5 flex justify-between items-center">
                            <div className="flex items-center gap-2 text-zinc-300 text-sm font-medium">
                                <FileText size={16} className="text-indigo-400" /> Active Preset
                            </div>
                            <button onClick={() => fileInputRef.current?.click()} className="text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-1 rounded border border-white/10 flex items-center gap-1 transition-colors">
                                <Upload size={10} /> Load New
                            </button>
                            <input type="file" ref={fileInputRef} onChange={handleImportPreset} accept=".json" className="hidden" />
                        </div>
                        <div className="p-4">
                            <div className="text-emerald-400 font-mono text-sm break-all font-semibold">
                                {gameSession.activePreset ? gameSession.activePreset.name || "Custom Preset" : "Mặc định (System)"}
                            </div>
                            <div className="text-[10px] text-zinc-600 mt-1">
                                {allPrompts.length} modules loaded
                            </div>
                        </div>
                    </div>

                    {/* Section A: Ordered Sequence */}
                    {gameSession.activePreset && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-zinc-500 text-xs font-semibold uppercase tracking-wider pl-1 border-t border-white/5 pt-4">
                                <Layers size={14} /> Trình tự kích hoạt (Active Order)
                            </div>
                            
                            <div className="space-y-1">
                                {promptOrderList.map((item: any, idx: number) => {
                                    const promptDef = allPrompts.find(p => p.identifier === item.identifier);
                                    const label = promptDef?.name || getPromptLabel(item.identifier);
                                    
                                    return (
                                        <div key={`order-${idx}`} className="flex items-center justify-between p-2 rounded bg-zinc-950/30 border border-white/5 text-xs">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <span className="text-zinc-600 font-mono w-4 text-center">{idx + 1}</span>
                                                <span className={`truncate ${item.enabled ? 'text-zinc-300' : 'text-zinc-600 line-through'}`}>{label}</span>
                                            </div>
                                            {item.enabled ? <CheckCircle2 size={12} className="text-emerald-500/50" /> : <CircleOff size={12} className="text-zinc-700" />}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Section B: Deep Inspector (All Modules) */}
                    {gameSession.activePreset && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-zinc-500 text-xs font-semibold uppercase tracking-wider pl-1 border-t border-white/5 pt-4">
                                <Bot size={14} /> Thư viện Prompt ({allPrompts.length})
                            </div>
                            
                            <div className="space-y-2">
                                {allPrompts.map((promptDef, idx) => {
                                    const isExpanded = expandedPrompts[promptDef.identifier];
                                    const label = promptDef.name || getPromptLabel(promptDef.identifier);
                                    
                                    return (
                                        <div key={`module-${idx}`} className={`rounded-lg border transition-all duration-200 ${isExpanded ? 'bg-zinc-900 border-white/10' : 'bg-zinc-950/30 border-white/5 hover:border-white/10'}`}>
                                            {/* Card Header */}
                                            <div 
                                                onClick={() => togglePromptExpand(promptDef.identifier)}
                                                className="flex items-center justify-between p-3 cursor-pointer select-none"
                                            >
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <GripVertical size={14} className="text-zinc-700 flex-shrink-0" />
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-sm font-medium text-zinc-300 truncate">{label}</span>
                                                        <span className="text-[10px] text-zinc-600 font-mono truncate">{promptDef.identifier}</span>
                                                    </div>
                                                </div>
                                                {isExpanded ? <ChevronUp size={16} className="text-zinc-500" /> : <ChevronDown size={16} className="text-zinc-600" />}
                                            </div>

                                            {/* Card Body */}
                                            {isExpanded && (
                                                <div className="px-3 pb-3 animate-fade-in">
                                                    <div className="bg-black/30 rounded-md p-3 border border-white/5">
                                                        <pre className="text-[10px] text-zinc-400 font-mono whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto scrollbar-thin">
                                                            {promptDef.content || "*(Nội dung rỗng)*"}
                                                        </pre>
                                                        <div className="mt-2 flex justify-between items-center pt-2 border-t border-white/5">
                                                            <span className="text-[9px] text-zinc-600 font-mono">Role: {promptDef.role}</span>
                                                            {promptDef.system_prompt && <span className="text-[9px] text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">System</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Gameplay;