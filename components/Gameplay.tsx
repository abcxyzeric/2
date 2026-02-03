import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, SendHorizontal, Upload, FileText, Bot, User, Settings2, Trash2, RefreshCcw } from 'lucide-react';
import Button from './Button';
import Toast from './Toast';
import { AppView, GameSession, Message, AIConfig, Preset } from '../types';
import { callGemini } from '../services/ai';
import { constructDynamicPrompt } from '../services/gameplay-engine';

interface GameplayProps {
  onNavigate: (view: AppView) => void;
  gameSession: GameSession;
  setGameSession: React.Dispatch<React.SetStateAction<GameSession>>;
  aiConfig: AIConfig;
}

const Gameplay: React.FC<GameplayProps> = ({ 
  onNavigate, 
  gameSession, 
  setGameSession, 
  aiConfig 
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
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
      
      // 2. Determine generation settings from preset
      const presetSettings = gameSession.activePreset ? {
        temperature: gameSession.activePreset.temperature,
        topP: gameSession.activePreset.top_p,
        topK: gameSession.activePreset.top_k,
      } : undefined;

      // 3. Call AI
      const aiResponseText = await callGemini(prompt, aiConfig, 'text/plain', presetSettings);

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
        // Simple validation
        if (json.prompts && json.prompt_order) {
          setGameSession(prev => ({ ...prev, activePreset: json }));
          setToast({ message: `Đã nạp Preset: ${json.name || "Custom"}`, type: "success" });
          setIsDrawerOpen(false);
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
          <div className="w-80 h-full bg-zinc-900 border-l border-white/10 relative z-10 flex flex-col shadow-2xl animate-fade-in">
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <h3 className="font-semibold text-zinc-200">Cấu hình Màn chơi</h3>
              <button onClick={() => setIsDrawerOpen(false)} className="text-zinc-500 hover:text-zinc-300"><ArrowLeft size={18} /></button>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto space-y-6">
              
              {/* Preset Info */}
              <div className="bg-zinc-950/50 p-4 rounded-xl border border-white/5 space-y-3">
                <div className="flex items-center gap-2 text-zinc-400 text-sm font-medium">
                  <FileText size={16} /> Preset Hiện tại
                </div>
                <div className="text-emerald-400 font-mono text-xs break-all">
                  {gameSession.activePreset ? gameSession.activePreset.name || "Unnamed Preset" : "Mặc định (Basic)"}
                </div>
                {gameSession.activePreset && (
                   <div className="text-[10px] text-zinc-600">
                      Prompts: {gameSession.activePreset.prompts.length} | Temp: {gameSession.activePreset.temperature}
                   </div>
                )}
              </div>

              {/* Import Button */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Nạp Preset (JSON)</label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border border-dashed border-zinc-700 bg-zinc-800/30 hover:bg-zinc-800/60 rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors group"
                >
                  <Upload size={24} className="text-zinc-500 group-hover:text-indigo-400 transition-colors" />
                  <span className="text-xs text-zinc-400 group-hover:text-zinc-200">Chọn file Tawa...json</span>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImportPreset} 
                  accept=".json" 
                  className="hidden" 
                />
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-white/5">
                <button 
                  onClick={handleClearHistory}
                  className="w-full flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors text-sm font-medium"
                >
                  <Trash2 size={16} /> Xóa lịch sử Chat
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Gameplay;