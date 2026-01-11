
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Menu, Shield, Zap, Target, Scroll, User, Download, Save, BrainCircuit, Globe, Brain, Loader2, ChevronLeft, ChevronRight, GitBranch, ChevronsDown, BookOpen, Plus, Trash2, Edit2, Check, X, GripHorizontal } from 'lucide-react';
import { NavigationProps, GameState, ChatMessage, AppSettings, SaveFile, WorldData, TawaPresetConfig } from '../../../types';
import { aiService } from '../../../services/ai/generationService';
import { dbService } from '../../../services/db/indexedDB';
import Button from '../../ui/Button';
import { TAWA_REGEX } from '../../../utils/regex';
import { DEFAULT_PRESET_CONFIG } from '../../../constants/tawa_modules'; // Import default
import TawaPresetManager from './components/TawaPresetManager'; // Import Manager Mới

// Constants for Pagination
const MESSAGES_PER_PAGE = 5;

const MotionDiv = motion.div as any;
const MotionButton = motion.button as any;

// Helper component to render Tawa's structured output
// UPDATED: Added Raw Context Editing Mode
interface TawaMessageRendererProps {
    text: string;
    onUpdate: (newText: string) => void;
}

const TawaMessageRenderer: React.FC<TawaMessageRendererProps> = ({ text, onUpdate }) => {
    const [showThinking, setShowThinking] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editedText, setEditedText] = useState(text);

    // Sync editedText when prop text changes
    useEffect(() => {
        setEditedText(text);
    }, [text]);

    // Regex to extract tags using centralized constants
    const thinkingMatch = text.match(TAWA_REGEX.THINKING);
    const contentMatch = text.match(TAWA_REGEX.CONTENT);

    const thinkingContent = thinkingMatch ? thinkingMatch[1].trim() : null;
    
    // If <content> exists, use it. If not, fallback to full text (for error messages or old format)
    let mainContent = contentMatch ? contentMatch[1].trim() : null;
    
    // Fallback logic
    if (!mainContent) {
        // If there is thinking but no content tag, strip thinking and show the rest
        if (thinkingContent) {
            mainContent = text.replace(TAWA_REGEX.STRIP_THINKING, '').trim();
        } else {
            mainContent = text;
        }
    }

    // IMPORTANT: Strip <branches> tag from mainContent (now wrapped in <details>)
    mainContent = mainContent ? mainContent.replace(TAWA_REGEX.STRIP_BRANCHES, '').trim() : "";

    // IMPORTANT: Strip inner <thinking> tags that might appear inside <content>
    // This handles cases where the AI puts meta-commentary inside the story block
    mainContent = mainContent ? mainContent.replace(TAWA_REGEX.GLOBAL_THINKING_STRIP, '').trim() : "";

    // --- DIALOGUE & FORMATTING LOGIC ---
    const formatContentWithHighlights = (rawContent: string) => {
        if (!rawContent) return "";
        let formatted = rawContent;

        // 0. Clean Artifacts (System text, status checks)
        // Lọc bỏ các đoạn text hệ thống bị rò rỉ
        if (TAWA_REGEX.ARTIFACTS_REMOVAL) {
             TAWA_REGEX.ARTIFACTS_REMOVAL.forEach(regex => {
                 formatted = formatted.replace(regex, '');
             });
        }

        // 1. Remove Asterisks (*) completely for novel style
        // Xóa sạch dấu sao để hiển thị như tiểu thuyết
        if (TAWA_REGEX.ASTERISK_REMOVAL) {
            formatted = formatted.replace(TAWA_REGEX.ASTERISK_REMOVAL, '');
        }

        // 2. Handle Newlines for raw text
        // If content doesn't contain block tags like <p>, <div, <br, assume it's raw text and replace \n with <br/>
        const hasHtmlTags = /<[a-z][\s\S]*>/i.test(formatted);
        if (!hasHtmlTags) {
            formatted = formatted.replace(/\n/g, '<br/>');
        }

        // 3. Highlight Dialogue (Quotes "..." or “...”)
        // Wrap text inside quotes with a colored span
        formatted = formatted.replace(
            /(["“][^"”]*["”])/g, 
            '<span class="text-amber-300 font-semibold drop-shadow-sm">$1</span>'
        );

        return formatted;
    };

    const handleSaveEdit = () => {
        onUpdate(editedText);
        setIsEditing(false);
    };

    const handleCancelEdit = () => {
        setEditedText(text);
        setIsEditing(false);
    };

    if (isEditing) {
        return (
            <div className="w-full flex flex-col gap-2 animate-in fade-in duration-200 border border-mystic-accent/30 p-2 rounded bg-slate-900/80">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-mystic-accent uppercase flex items-center gap-1">
                        <Edit2 size={12} /> Editing Raw Context
                    </span>
                    <button onClick={handleCancelEdit} className="text-slate-500 hover:text-white">
                        <X size={14} />
                    </button>
                </div>
                <textarea
                    value={editedText}
                    onChange={(e) => setEditedText(e.target.value)}
                    className="w-full h-96 bg-slate-900 border border-slate-600 rounded p-3 text-xs font-mono text-slate-300 focus:border-mystic-accent outline-none resize-y custom-scrollbar leading-relaxed"
                    placeholder="Nhập nội dung raw (bao gồm cả thẻ <thinking>, <content>...)"
                    spellCheck={false}
                />
                 <div className="flex justify-end gap-2 mt-1">
                    <button 
                        onClick={handleCancelEdit}
                        className="px-3 py-1.5 text-xs text-slate-400 hover:text-white bg-slate-800 rounded border border-slate-700 hover:bg-slate-700 font-medium"
                    >
                        Hủy bỏ
                    </button>
                    <button 
                        onClick={handleSaveEdit}
                        className="px-3 py-1.5 text-xs text-mystic-900 bg-mystic-accent hover:bg-sky-400 rounded font-bold shadow-[0_0_10px_rgba(56,189,248,0.3)] flex items-center gap-1"
                    >
                        <Save size={12} /> Lưu thay đổi
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2 w-full group">
            {/* Header Row: Thinking Toggle + Edit Button */}
            <div className="flex items-center gap-3 w-full min-h-[20px]">
                {thinkingContent ? (
                    <button 
                        onClick={() => setShowThinking(!showThinking)}
                        className="flex items-center gap-2 text-[10px] uppercase font-bold text-slate-500 hover:text-mystic-accent transition-colors"
                    >
                        <BrainCircuit size={12} />
                        {showThinking ? 'Ẩn dòng tư duy (Tawa Logic)' : 'Hiện dòng tư duy (Tawa Logic)'}
                    </button>
                ) : (
                    // Placeholder spacing if no thinking content, but we want the edit button align logic
                    <div className="flex-1"></div>
                )}
                
                {/* EDIT BUTTON - Visible on Hover or if no content */}
                <button
                    onClick={() => setIsEditing(true)}
                    className={`flex items-center gap-1 text-[10px] font-bold text-slate-600 hover:text-sky-400 uppercase transition-all ${thinkingContent ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}
                    title="Chỉnh sửa Context gốc (Raw)"
                >
                    <Edit2 size={10} /> Edit Raw
                </button>
            </div>
            
            {thinkingContent && (
                <AnimatePresence>
                    {showThinking && (
                        <MotionDiv 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-slate-900/50 border-l-2 border-slate-600 p-3 rounded-r text-xs text-slate-400 font-mono overflow-hidden mb-2"
                        >
                            <div className="whitespace-pre-wrap">{thinkingContent}</div>
                        </MotionDiv>
                    )}
                </AnimatePresence>
            )}
            
            <div 
              className="font-sans text-base md:text-lg text-slate-300 [&>p]:mb-3 last:[&>p]:mb-0 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: formatContentWithHighlights(mainContent || "") }} 
            />
        </div>
    );
};

// --- RULES MANAGER COMPONENT (UPDATED: POPUP MODAL) ---
const RulesManager: React.FC<{
    rules: string[];
    onUpdate: (newRules: string[]) => void;
}> = ({ rules, onUpdate }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [newRule, setNewRule] = useState("");
    const [editIdx, setEditIdx] = useState<number | null>(null);
    const [editValue, setEditValue] = useState("");

    const handleAdd = () => {
        if (!newRule.trim()) return;
        onUpdate([...rules, newRule.trim()]);
        setNewRule("");
    };

    const handleDelete = (idx: number) => {
        onUpdate(rules.filter((_, i) => i !== idx));
    };

    const startEdit = (idx: number, val: string) => {
        setEditIdx(idx);
        setEditValue(val);
    };

    const saveEdit = (idx: number) => {
        const updated = [...rules];
        updated[idx] = editValue;
        onUpdate(updated);
        setEditIdx(null);
    };

    return (
        <>
            <button 
                onClick={() => setIsOpen(true)}
                className="w-full p-3 flex justify-between items-center text-left hover:bg-slate-700/50 transition-colors bg-slate-800/30 rounded-lg border border-slate-700 mb-3"
            >
                <div className="flex items-center gap-2 text-sm font-bold text-red-400 uppercase">
                    <BookOpen size={16} />
                    Luật Lệ & Ràng Buộc
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400">{rules.length} Active</span>
                </div>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                        <MotionDiv 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-mystic-900 border border-slate-700 w-full max-w-2xl rounded-xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
                        >
                            {/* Modal Header */}
                            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 shrink-0">
                                <h2 className="text-lg font-bold text-red-400 flex items-center gap-2">
                                    <BookOpen size={20}/> Luật Bất Khả Kháng
                                </h2>
                                <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors">
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
                                <p className="text-xs text-slate-500 mb-4 italic border-l-2 border-red-900/50 pl-2">
                                    Các quy tắc này có quyền lực tối thượng, ép buộc AI phải tuân theo bất kể ngữ cảnh hay logic thông thường.
                                </p>

                                <div className="space-y-2 mb-4">
                                    {rules.length === 0 && <p className="text-xs text-center text-slate-600 py-8 border border-dashed border-slate-700 rounded-lg">Chưa có luật lệ nào.</p>}
                                    {rules.map((rule, idx) => (
                                        <div key={idx} className="flex gap-2 items-start bg-slate-800/50 p-3 rounded border border-slate-700/50 group hover:border-red-900/50 transition-colors">
                                            <span className="text-red-500 font-bold text-xs mt-0.5">{idx + 1}.</span>
                                            {editIdx === idx ? (
                                                <div className="flex-1 flex gap-2">
                                                    <input 
                                                        autoFocus
                                                        value={editValue}
                                                        onChange={(e) => setEditValue(e.target.value)}
                                                        className="flex-1 bg-slate-900 text-sm text-slate-200 border border-slate-600 rounded px-2 py-1 outline-none focus:border-red-400"
                                                    />
                                                    <button onClick={() => saveEdit(idx)} className="text-green-400 p-1 hover:bg-green-900/20 rounded"><Check size={16}/></button>
                                                </div>
                                            ) : (
                                                <p className="flex-1 text-sm text-slate-300 leading-relaxed">{rule}</p>
                                            )}
                                            
                                            {editIdx !== idx && (
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => startEdit(idx, rule)} className="p-1 text-slate-500 hover:text-mystic-accent hover:bg-slate-700 rounded"><Edit2 size={14}/></button>
                                                    <button onClick={() => handleDelete(idx)} className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-900/20 rounded"><Trash2 size={14}/></button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* Add New Rule Input */}
                                <div className="flex gap-2 pt-2 border-t border-slate-800">
                                    <input 
                                        value={newRule}
                                        onChange={(e) => setNewRule(e.target.value)}
                                        placeholder="Thêm luật mới (VD: Cấm giết NPC này, Tiền tệ là Vàng)..."
                                        className="flex-1 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-slate-200 focus:border-red-400 outline-none"
                                        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                                    />
                                    <button 
                                        onClick={handleAdd}
                                        className="px-4 bg-red-900/30 border border-red-900/50 text-red-400 rounded hover:bg-red-900/50 font-bold text-sm"
                                    >
                                        Thêm
                                    </button>
                                </div>
                            </div>
                        </MotionDiv>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
};


const GameplayScreen: React.FC<NavigationProps> = ({ onNavigate, activeWorld }) => {
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [turnCount, setTurnCount] = useState(0);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // UI States
  const [showActionChoices, setShowActionChoices] = useState(true);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);

  // Dynamic States (Rules & Tawa)
  const [tawaPresetConfig, setTawaPresetConfig] = useState<TawaPresetConfig>(DEFAULT_PRESET_CONFIG);
  const [dynamicRules, setDynamicRules] = useState<string[]>([]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // --- Initial Load ---
  useEffect(() => {
    const init = async () => {
      const s = await dbService.getSettings();
      setSettings(s);

      if (activeWorld) {
          // Sync initial rules from world config
          setDynamicRules(activeWorld.config.rules || []);

          // CHECK FOR SAVED STATE (LOAD GAME)
          const worldDataWithState = activeWorld as WorldData;
          
          if (worldDataWithState.savedState) {
              setHistory(worldDataWithState.savedState.history);
              setTurnCount(worldDataWithState.savedState.turnCount);
          } 
          // INITIALIZE NEW GAME
          else if (history.length === 0 && s) {
            setIsLoading(true);
            const opening = await aiService.generateStoryTurn(
              "Hãy bắt đầu câu chuyện.", 
              [], 
              activeWorld, 
              s,
              tawaPresetConfig 
            );
            
            // Extract choices/branches from opening if available
            // NEW LOGIC: Use BRANCHES instead of CHOICES
            const branchesMatch = opening.match(TAWA_REGEX.BRANCHES);
            const rawBranches = branchesMatch ? branchesMatch[1].trim() : null;
            const choicesList = rawBranches 
                ? rawBranches.split('\n').map(c => c.trim()).filter(c => c.length > 0) 
                : [];

            const newMsg: ChatMessage = { 
                role: 'model', 
                text: opening, 
                timestamp: Date.now(),
                choices: choicesList // Save choices here
            };
            setHistory([newMsg]);
            setIsLoading(false);
            setTurnCount(1);
          }
      }
    };
    init();
  }, []); // Run once on mount

  // --- Auto-Page Logic: Jump to last page on new message ---
  useEffect(() => {
    const totalPages = Math.ceil(history.length / MESSAGES_PER_PAGE) || 1;
    setCurrentPage(totalPages);
  }, [history.length]);

  // --- Auto-Scroll: Only scroll if on last page ---
  useEffect(() => {
    const totalPages = Math.ceil(history.length / MESSAGES_PER_PAGE) || 1;
    if (currentPage === totalPages) {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [history, isLoading, currentPage]);

  // --- Auto-Save Logic ---
  useEffect(() => {
    if (activeWorld && history.length > 0) {
        const autoSave = async () => {
            const saveId = `autosave-${activeWorld.world.worldName.replace(/\s+/g, '-').toLowerCase()}`;
            // Create updated world data with latest rules
            const currentWorldState: WorldData = {
                ...activeWorld,
                config: {
                    ...activeWorld.config,
                    rules: dynamicRules
                }
            };

            const saveData: SaveFile = {
                id: saveId,
                name: activeWorld.world.worldName,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                data: {
                    world: currentWorldState,
                    history, // This now includes choices in ChatMessage objects
                    turnCount
                }
            };
            await dbService.saveGameState(saveData);
            console.log("Auto-saved game state with rules and choices");
        };
        autoSave();
    }
  }, [history, turnCount, activeWorld, dynamicRules]);


  // --- Handlers ---
  const handleSend = async () => {
    if (!inputValue.trim() || isLoading || !activeWorld || !settings) return;

    const userMsg: ChatMessage = { role: 'user', text: inputValue, timestamp: Date.now() };
    setHistory(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    // Create a temporary WorldData object that includes the DYNAMIC RULES
    // This ensures the AI prompt builder receives the latest rules added in Sidebar
    const effectiveWorldData: WorldData = {
        ...activeWorld,
        config: {
            ...activeWorld.config,
            rules: dynamicRules // Use state rules instead of prop rules
        }
    };

    const responseText = await aiService.generateStoryTurn(
      userMsg.text,
      history, // Send context
      effectiveWorldData, // Pass the modified world data
      settings,
      tawaPresetConfig
    );

    // PARSE BRANCHES HERE FOR PERSISTENCE (REPLACED OLD CHOICES LOGIC)
    const branchesMatch = responseText.match(TAWA_REGEX.BRANCHES);
    const rawBranches = branchesMatch ? branchesMatch[1].trim() : null;
    const choicesList = rawBranches 
        ? rawBranches.split('\n').map(c => c.trim()).filter(c => c.length > 0) 
        : [];

    const modelMsg: ChatMessage = { 
        role: 'model', 
        text: responseText, 
        timestamp: Date.now(),
        choices: choicesList // Store choices in message history
    };
    
    setHistory(prev => [...prev, modelMsg]);
    setTurnCount(prev => prev + 1);
    setIsLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleMessageUpdate = (index: number, newText: string) => {
    setHistory(prev => {
        const newHistory = [...prev];
        // Ensure index exists
        if (newHistory[index]) {
            newHistory[index] = { ...newHistory[index], text: newText };
            
            // Re-parse choices if model message updated, to keep UI in sync
            if (newHistory[index].role === 'model') {
                const branchesMatch = newText.match(TAWA_REGEX.BRANCHES);
                const rawBranches = branchesMatch ? branchesMatch[1].trim() : null;
                const choicesList = rawBranches 
                    ? rawBranches.split('\n').map(c => c.trim()).filter(c => c.length > 0) 
                    : [];
                newHistory[index].choices = choicesList;
            }
        }
        return newHistory;
    });
  };

  const handleDownloadSave = () => {
    if (!activeWorld) return;
    
    const fileId = `export-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Ensure exported save includes latest rules
    const currentWorldState: WorldData = {
        ...activeWorld,
        config: {
            ...activeWorld.config,
            rules: dynamicRules
        }
    };

    const exportData = {
        id: fileId,
        saveVersion: "1.0",
        timestamp: Date.now(),
        world: currentWorldState,
        history: history,
        turnCount: turnCount
    };
    
    const fileName = `Save_${activeWorld.player.name}_Turn${turnCount}.json`;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", fileName);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleSaveAndExit = async () => {
      if (!activeWorld) return;
      setIsSaving(true);
      
      const timestamp = Date.now();
      const sanitizedName = activeWorld.world.worldName.replace(/\s+/g, '-').toLowerCase();
      const manualId = `manual-${sanitizedName}-${timestamp}`;

      // Ensure manual save includes latest rules
      const currentWorldState: WorldData = {
        ...activeWorld,
        config: {
            ...activeWorld.config,
            rules: dynamicRules
        }
      };

      const saveData: SaveFile = {
          id: manualId,
          name: `${activeWorld.world.worldName} (Manual)`,
          createdAt: timestamp,
          updatedAt: timestamp,
          data: {
              world: currentWorldState,
              history,
              turnCount
          }
      };

      await dbService.saveGameState(saveData);
      
      setIsSaving(false);
      onNavigate(GameState.MENU);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  if (!activeWorld) return null;

  // --- Pagination Calculations ---
  const totalPages = Math.ceil(history.length / MESSAGES_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * MESSAGES_PER_PAGE;
  const displayedMessages = history.slice(startIndex, startIndex + MESSAGES_PER_PAGE);

  // --- Get Latest Choices for Input Area ---
  // Find the last message from model that has choices
  const lastModelMessage = [...history].reverse().find(m => m.role === 'model' && m.choices && m.choices.length > 0);
  const activeChoices = lastModelMessage?.choices || [];

  // --- Sidebar Content (JSX Variable instead of inner Component to prevent remounts) ---
  const sidebarContent = (
      <div className="h-full flex flex-col bg-mystic-900 shadow-xl">
          {/* Sidebar Header */}
          <div className="p-5 border-b border-slate-800 bg-mystic-800/50 shrink-0">
             <div className="flex items-center gap-3">
                 <div className="w-12 h-12 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center shrink-0">
                     <User className="text-mystic-accent" size={24}/>
                 </div>
                 <div>
                     <h3 className="font-bold text-slate-200 font-sans truncate max-w-[150px]">{activeWorld.player.name}</h3>
                     <p className="text-xs text-slate-400">{activeWorld.player.gender} • {activeWorld.player.age}</p>
                 </div>
             </div>
          </div>

          {/* Sidebar Body - Scrollable */}
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 space-y-6">
              
              {/* Character Info Section */}
              <div className="space-y-3">
                 <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><Target size={12}/> Mục tiêu</label>
                    <p className="text-sm text-slate-300 bg-slate-800/50 p-2 rounded border border-slate-700/50">
                        {activeWorld.player.goal}
                    </p>
                 </div>

                 <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><Shield size={12}/> Tính cách</label>
                    <p className="text-sm text-slate-300 bg-slate-800/50 p-2 rounded border border-slate-700/50">
                        {activeWorld.player.personality}
                    </p>
                 </div>

                 <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><Zap size={12}/> Kỹ năng</label>
                    <p className="text-sm text-slate-300 bg-slate-800/50 p-2 rounded border border-slate-700/50">
                        {activeWorld.player.skills}
                    </p>
                 </div>

                 <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><Scroll size={12}/> Tiểu sử</label>
                    <p className="text-xs text-slate-400 bg-slate-800/50 p-2 rounded border border-slate-700/50 italic leading-relaxed">
                        {activeWorld.player.background}
                    </p>
                 </div>
              </div>

              {/* Dynamic Rules Manager */}
              <div className="border-t border-slate-800 pt-4">
                  <RulesManager 
                     rules={dynamicRules} 
                     onUpdate={setDynamicRules} 
                  />
                  
                  {/* Tawa Preset Manager */}
                  <TawaPresetManager 
                     onConfigChange={setTawaPresetConfig}
                  />
              </div>
          </div>

          {/* Sidebar Footer - Actions */}
          <div className="p-4 border-t border-slate-800 bg-mystic-900/95 space-y-2 mt-auto shrink-0">
              <Button 
                variant="outline" 
                className="w-full text-xs h-10 justify-start pl-4" 
                icon={<Download size={14}/>}
                onClick={handleDownloadSave}
              >
                  Tải file Save (.json)
              </Button>
              <Button 
                variant="danger" 
                className="w-full text-xs h-10 justify-start pl-4" 
                icon={<Save size={14}/>}
                onClick={handleSaveAndExit}
                isLoading={isSaving}
              >
                  Lưu & Thoát
              </Button>
          </div>
      </div>
  );

  return (
    <div className="flex h-full w-full bg-mystic-900 font-sans overflow-hidden">
        
        {/* === LEFT COLUMN: HEADER + CHAT + INPUT === */}
        <div className="flex-1 flex flex-col h-full relative z-10 min-w-0">
            
            {/* Header (Top of Left Column) */}
            <header className="h-16 shrink-0 bg-mystic-900 border-b border-slate-800 flex items-center justify-center relative px-4 z-30 shadow-sm">
                 {/* Mobile Menu Toggle */}
                 <button 
                    className="md:hidden absolute left-4 text-slate-400 hover:text-white"
                    onClick={() => setShowMobileSidebar(true)}
                 >
                     <Menu size={24} />
                 </button>
                 
                 {/* Center Info */}
                 <div className="flex flex-col items-center">
                     <h1 className="font-bold text-slate-200 text-lg md:text-xl tracking-wide leading-tight">
                         {activeWorld.world.worldName}
                     </h1>
                     <div className="mt-1">
                        <span className="text-xs font-mono font-bold text-mystic-accent bg-mystic-accent/10 px-3 py-0.5 rounded-full border border-mystic-accent/20">
                            Lượt: {turnCount} | Trang: {currentPage}/{totalPages}
                        </span>
                     </div>
                 </div>
            </header>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 pb-0 md:px-3 md:pb-0 space-y-4 w-full bg-mystic-900">
                    {displayedMessages.map((msg, idx) => (
                        <MotionDiv 
                            key={`${currentPage}-${idx}`} // Force re-render on page switch for animation
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`relative rounded-lg p-3 md:p-5 leading-relaxed shadow-md text-base ${
                                msg.role === 'user' 
                                    ? 'bg-slate-800 border border-slate-700 text-slate-200 rounded-tr-none max-w-[90%] md:max-w-[85%]' 
                                    : 'bg-transparent text-slate-300 pl-0 w-full'
                            }`}>
                                
                                {msg.role === 'user' ? (
                                    <span className="font-sans whitespace-pre-wrap">{msg.text}</span>
                                ) : (
                                    <TawaMessageRenderer 
                                        text={msg.text}
                                        onUpdate={(newText) => handleMessageUpdate(startIndex + idx, newText)}
                                    />
                                )}
                            </div>
                        </MotionDiv>
                    ))}

                    {/* Improved Loading UI */}
                    {isLoading && (
                        <div className="flex flex-col items-center justify-center p-6 space-y-3 animate-fade-in w-full border-t border-slate-800/30">
                            <Loader2 className="w-8 h-8 text-mystic-accent animate-spin" />
                            <span className="text-sm font-medium text-slate-400 animate-pulse">
                                {history.length === 0 
                                    ? "Đang kiến tạo câu chuyện mở đầu..." 
                                    : "Đang kiến tạo diễn biến tiếp theo..."}
                            </span>
                        </div>
                    )}
                    <div ref={chatEndRef} />
            </div>

            {/* Input Area (Containing Choices + Textarea) */}
            <div className="bg-mystic-900 border-t border-slate-800 z-20 shrink-0 flex flex-col shadow-[0_-5px_15px_rgba(0,0,0,0.2)]">
                
                {/* ACTION CHOICES PANEL (SLIDEABLE) */}
                <AnimatePresence>
                    {activeChoices.length > 0 && showActionChoices && !isLoading && (
                        <MotionDiv 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="bg-slate-900/95 backdrop-blur border-b border-slate-800 max-h-[50vh] overflow-y-auto custom-scrollbar"
                        >
                             <div className="p-3 flex flex-col gap-2 md:grid md:grid-cols-2 md:gap-3">
                                {activeChoices.map((choice, idx) => (
                                    <MotionButton
                                        key={idx}
                                        whileHover={{ scale: 1.01, backgroundColor: "rgba(56, 189, 248, 0.1)" }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => setInputValue(choice)}
                                        className="w-full text-left text-xs md:text-sm p-3 rounded bg-slate-800 border border-slate-700 hover:border-mystic-accent/50 text-slate-300 hover:text-white transition-all shadow-sm group h-auto whitespace-normal"
                                    >
                                        <div className="flex gap-2 items-start">
                                            <GitBranch size={14} className="mt-0.5 text-slate-500 group-hover:text-mystic-accent shrink-0" />
                                            <span className="line-clamp-3">{choice}</span>
                                        </div>
                                    </MotionButton>
                                ))}
                            </div>
                        </MotionDiv>
                    )}
                </AnimatePresence>

                {/* Main Input Bar */}
                <div className="p-3 md:p-5 flex flex-col gap-2">
                    {/* Choice Toggle Bar */}
                    {activeChoices.length > 0 && !isLoading && (
                        <div className="flex justify-center -mt-3 mb-1">
                             <button 
                                onClick={() => setShowActionChoices(!showActionChoices)}
                                className="bg-slate-800 border border-slate-700 border-t-0 rounded-b-lg px-4 py-0.5 text-[10px] text-slate-400 hover:text-mystic-accent hover:bg-slate-700 transition-colors flex items-center gap-1 shadow-sm"
                             >
                                 <GripHorizontal size={12} />
                                 {showActionChoices ? 'Thu gọn gợi ý' : 'Mở rộng gợi ý'}
                                 {showActionChoices ? <ChevronsDown size={12} className="rotate-180"/> : <ChevronsDown size={12}/>}
                             </button>
                        </div>
                    )}

                    <div className="w-full flex gap-2">
                        <textarea 
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Nhập hành động của bạn..."
                            className="flex-1 bg-slate-800/80 border border-slate-700 rounded-lg p-3 text-slate-200 outline-none focus:border-mystic-accent focus:bg-slate-800 transition-all resize-none h-14 md:h-16 custom-scrollbar font-sans text-sm md:text-base"
                        />
                        <Button 
                            variant="primary" 
                            onClick={handleSend} 
                            disabled={isLoading || !inputValue.trim()}
                            className="h-14 md:h-16 px-4 md:px-6"
                        >
                            <Send size={20} />
                        </Button>
                    </div>

                    {/* Pagination Controls */}
                    <div className="flex justify-center">
                        <div className="flex items-center gap-0.5 bg-slate-800/90 p-[2px] rounded-full border border-slate-700/50 backdrop-blur-sm shadow-sm scale-90 origin-bottom">
                            <button 
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-slate-700 text-slate-400 disabled:opacity-20 transition-colors"
                            >
                                <ChevronLeft size={10} />
                            </button>
                            
                            <div className="flex items-center gap-0.5 px-0.5 overflow-x-auto no-scrollbar max-w-[120px]">
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                                    <button
                                        key={pageNum}
                                        onClick={() => handlePageChange(pageNum)}
                                        className={`w-5 h-5 flex items-center justify-center rounded-full text-[9px] font-bold transition-all ${
                                            currentPage === pageNum 
                                                ? 'bg-mystic-accent text-mystic-900 shadow-sm' 
                                                : 'text-slate-500 hover:text-slate-200 hover:bg-slate-700'
                                        }`}
                                    >
                                        {pageNum}
                                    </button>
                                ))}
                            </div>

                            <button 
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-slate-700 text-slate-400 disabled:opacity-20 transition-colors"
                            >
                                <ChevronRight size={10} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* === RIGHT COLUMN: SIDEBAR (Desktop) === */}
        <div className="hidden md:block w-80 shrink-0 h-full relative z-20 border-l border-slate-800">
            {sidebarContent}
        </div>

        {/* 3. SIDEBAR (Mobile Overlay) */}
        <AnimatePresence>
            {showMobileSidebar && (
                <>
                    <MotionDiv 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 z-40 md:hidden backdrop-blur-sm"
                        onClick={() => setShowMobileSidebar(false)}
                    />
                    <MotionDiv 
                        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0 bottom-0 w-[85%] max-w-sm z-50 md:hidden shadow-2xl"
                    >
                        {sidebarContent}
                    </MotionDiv>
                </>
            )}
        </AnimatePresence>

    </div>
  );
};

export default GameplayScreen;
