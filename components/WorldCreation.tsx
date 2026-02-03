import React, { useState } from 'react';
import { ArrowLeft, Sparkles, Plus, Trash2, Save, SendHorizontal, Wand2, Globe, User, Users, Map, RefreshCw, Zap } from 'lucide-react';
import Button from './Button';
import Toast from './Toast';
import { AppView, Persona, INITIAL_PERSONA, AIConfig, WorldInfo, INITIAL_WORLD_INFO, PREDEFINED_GENRES } from '../types';
import { 
  generateFullPersonaFromIdea, 
  generatePersonaField, 
  generateWorldFromIdea, 
  generateWorldField, 
  generateWorldList,
  generateUniverseFromIdea
} from '../services/ai';

interface WorldCreationProps {
  onNavigate: (view: AppView) => void;
  aiConfig: AIConfig;
}

type Tab = 'PERSONA' | 'WORLD';

const WorldCreation: React.FC<WorldCreationProps> = ({ onNavigate, aiConfig }) => {
  const [activeTab, setActiveTab] = useState<Tab>('PERSONA');
  
  // States
  const [persona, setPersona] = useState<Persona>(INITIAL_PERSONA);
  const [worldInfo, setWorldInfo] = useState<WorldInfo>(INITIAL_WORLD_INFO);
  
  // Inputs
  const [masterIdeaInput, setMasterIdeaInput] = useState('');
  const [customGenre, setCustomGenre] = useState(''); // For when user selects "Custom"
  
  // Loading States
  const [loadingField, setLoadingField] = useState<string | null>(null);
  const [isGeneratingFull, setIsGeneratingFull] = useState(false);
  
  // Toast State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
  };

  // --- Handlers: Persona ---
  const handlePersonaChange = (field: keyof Persona, value: string) => {
    setPersona(prev => ({ ...prev, [field]: value }));
  };

  const handleAddSkill = () => {
    setPersona(prev => ({ ...prev, skills: [...prev.skills, ''] }));
  };

  const handleEditSkill = (index: number, value: string) => {
    const updatedSkills = [...persona.skills];
    updatedSkills[index] = value;
    setPersona(prev => ({ ...prev, skills: updatedSkills }));
  };

  const handleRemoveSkill = (index: number) => {
    setPersona(prev => ({
      ...prev,
      skills: prev.skills.filter((_, i) => i !== index)
    }));
  };

  // --- Handlers: World ---
  const handleWorldChange = (field: keyof WorldInfo, value: any) => {
    setWorldInfo(prev => ({ ...prev, [field]: value }));
  };

  const handleGenreChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'Custom') {
      setCustomGenre('');
      handleWorldChange('genre', '');
    } else {
      handleWorldChange('genre', val);
    }
  };

  const handleAddWorldListItem = (listKey: 'npcs' | 'entities') => {
    setWorldInfo(prev => ({ ...prev, [listKey]: [...prev[listKey], ''] }));
  };

  const handleEditWorldListItem = (listKey: 'npcs' | 'entities', index: number, value: string) => {
    const updatedList = [...worldInfo[listKey]];
    updatedList[index] = value;
    setWorldInfo(prev => ({ ...prev, [listKey]: updatedList }));
  };

  const handleRemoveWorldListItem = (listKey: 'npcs' | 'entities', index: number) => {
    setWorldInfo(prev => ({
      ...prev,
      [listKey]: prev[listKey].filter((_, i) => i !== index)
    }));
  };

  // --- AI Logic: Unified Generation ---
  const handleMasterGeneration = async () => {
    if (!masterIdeaInput.trim()) {
      showToast("Vui lòng nhập ý tưởng khởi tạo!", "error");
      return;
    }

    setIsGeneratingFull(true);
    try {
      const result = await generateUniverseFromIdea(masterIdeaInput, aiConfig);
      if (result) {
        setPersona(result.persona);
        setWorldInfo(result.worldInfo);
        
        // Handle custom genre detection
        if (result.worldInfo.genre && !PREDEFINED_GENRES.includes(result.worldInfo.genre)) {
          setCustomGenre(result.worldInfo.genre);
        } else {
          setCustomGenre('');
        }

        showToast("Đã khởi tạo Vũ trụ thành công!", "success");
      } else {
        showToast("Không thể khởi tạo. Vui lòng thử lại.", "error");
      }
    } catch (error) {
      showToast("Lỗi kết nối AI.", "error");
    } finally {
      setIsGeneratingFull(false);
    }
  };


  // --- AI Logic: Persona Fields ---
  const handleAiSuggest = async (field: keyof Persona) => {
    if (!persona.name || !persona.age || !persona.gender) {
      showToast("Vui lòng nhập Tên, Tuổi và Giới tính trước khi dùng gợi ý.", "error");
      return;
    }

    setLoadingField(field);
    try {
      const currentValue = typeof persona[field] === 'string' ? persona[field] as string : '';
      const result = await generatePersonaField(persona, field, currentValue, aiConfig);
      if (result) {
        handlePersonaChange(field, result);
        showToast(`Đã cập nhật ${field}`, "success");
      }
    } catch (error) {
      showToast("Lỗi khi gọi AI.", "error");
    } finally {
      setLoadingField(null);
    }
  };

  const handleAiSkillSuggest = async (index: number) => {
     if (!persona.name || !persona.age || !persona.gender) {
      showToast("Vui lòng nhập Tên, Tuổi và Giới tính trước khi gợi ý kỹ năng.", "error");
      return;
    }
    
    const skillToImprove = persona.skills[index];
    const fieldId = `skill-${index}`;
    setLoadingField(fieldId);
    try {
      const result = await generatePersonaField(persona, 'skills', skillToImprove, aiConfig);
      if (result) {
        handleEditSkill(index, result);
        showToast("Đã cập nhật kỹ năng", "success");
      }
    } catch (error) {
       showToast("Lỗi khi gọi AI.", "error");
    } finally {
      setLoadingField(null);
    }
  };

  // --- AI Logic: World Fields ---
  const handleWorldFieldSuggest = async (field: 'worldName' | 'worldContext') => {
    const genreToUse = customGenre || worldInfo.genre;
    if (!genreToUse) {
      showToast("Vui lòng chọn hoặc nhập Thể loại trước.", "error");
      return;
    }

    setLoadingField(field);
    try {
      const result = await generateWorldField({ ...worldInfo, genre: genreToUse }, field, aiConfig);
      if (result) {
        handleWorldChange(field, result);
        showToast(`Đã cập nhật ${field === 'worldName' ? 'Tên thế giới' : 'Bối cảnh'}`, "success");
      }
    } catch (error) {
      showToast("Lỗi AI.", "error");
    } finally {
      setLoadingField(null);
    }
  };

  const handleGenerateWorldList = async (type: 'npcs' | 'entities') => {
    const genreToUse = customGenre || worldInfo.genre;
    const personaName = persona.name; // Get current persona name

     if (!genreToUse) {
      showToast("Vui lòng chọn Thể loại trước.", "error");
      return;
    }
    if (!worldInfo.worldContext) {
      showToast("Vui lòng tạo Bối cảnh (Context) trước để AI có dữ liệu.", "error");
      return;
    }
    if (type === 'npcs' && !personaName) {
        showToast("Vui lòng đặt Tên Nhân Vật trước để AI tạo mối quan hệ.", "error");
        return;
    }

    setLoadingField(type);
    try {
      // Pass personaName to service
      const items = await generateWorldList({ ...worldInfo, genre: genreToUse }, type, personaName, aiConfig);
      if (items && items.length > 0) {
        // Append to existing list
        setWorldInfo(prev => ({
            ...prev,
            [type]: [...prev[type], ...items]
        }));
        showToast(`Đã thêm 4 ${type === 'npcs' ? 'NPC' : 'Thực thể'} mới.`, "success");
      }
    } catch (error) {
       showToast("Lỗi AI.", "error");
    } finally {
      setLoadingField(null);
    }
  };


  return (
    <div className="flex flex-col h-screen w-full animate-fade-in bg-transparent text-zinc-200 overflow-y-auto">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Unified Header & Tab Container */}
      <div className="sticky top-0 z-40 w-full bg-zinc-950/95 backdrop-blur-md border-b border-white/5 flex flex-col shadow-md">
        
        {/* Row 1: Navigation & Title */}
        <div className="relative flex items-center justify-center h-14 px-4 w-full">
          <div className="absolute left-4">
             <Button 
                onClick={() => onNavigate(AppView.MAIN_MENU)} 
                variant="ghost" 
                icon={ArrowLeft}
                className="!px-3"
              >
                {null}
              </Button>
          </div>
          <div className="font-serif font-bold text-lg text-zinc-100">Thiết lập & Khởi tạo</div>
        </div>

        {/* Row 2: Tabs (Centered below title) */}
        <div className="flex justify-center pb-3 px-4 w-full">
            <div className="flex bg-zinc-900/50 p-1 rounded-lg border border-white/5 w-full max-w-sm">
                <button
                    onClick={() => setActiveTab('PERSONA')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'PERSONA' ? 'bg-zinc-700 text-white shadow ring-1 ring-white/10' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'}`}
                >
                    <User size={15} /> Nhân vật
                </button>
                <button
                    onClick={() => setActiveTab('WORLD')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'WORLD' ? 'bg-zinc-700 text-white shadow ring-1 ring-white/10' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'}`}
                >
                    <Globe size={15} /> Thế giới
                </button>
            </div>
        </div>

      </div>

      <div className="max-w-4xl w-full mx-auto p-6 pb-20 space-y-8">

        {/* ================= MASTER INPUT ================= */}
        {/* Unified generation input at the top */}
        <div className="bg-zinc-900/40 border border-white/10 rounded-xl p-6 relative overflow-hidden group shadow-lg backdrop-blur-sm ring-1 ring-indigo-500/20">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Zap size={100} />
          </div>
          <h3 className="text-indigo-400 font-medium mb-3 flex items-center gap-2">
            <Sparkles size={18} /> Khởi tạo Vũ trụ từ ý tưởng (Tạo Nhanh)
          </h3>
          <div className="flex gap-3">
            <input
              type="text"
              value={masterIdeaInput}
              onChange={(e) => setMasterIdeaInput(e.target.value)}
              placeholder="Ví dụ: Một thế giới tiên hiệp nơi Lạc Yên, một cô gái mang dòng máu Phượng Hoàng tìm cách trả thù..."
              className="flex-1 bg-zinc-950/50 border border-white/10 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all placeholder-zinc-600 text-zinc-200"
            />
            <Button 
              onClick={handleMasterGeneration} 
              variant="secondary"
              className={`!px-4 bg-indigo-500/10 hover:bg-indigo-500/20 border-indigo-500/30 ${isGeneratingFull ? "opacity-70 cursor-wait" : ""}`}
            >
              {isGeneratingFull ? (
                <Sparkles className="animate-spin text-indigo-400" size={20} />
              ) : (
                <SendHorizontal size={20} className="text-indigo-400" />
              )}
            </Button>
          </div>
          <p className="text-[10px] text-zinc-500 mt-2 italic">
            * AI sẽ tự động tạo Nhân vật, Bối cảnh, và các mối quan hệ dựa trên ý tưởng của bạn.
          </p>
        </div>
        
        {/* ================= PERSONA TAB ================= */}
        {activeTab === 'PERSONA' && (
          <div className="space-y-8 animate-fade-in">
             
            {/* Basic Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Tên nhân vật</label>
                <input 
                  type="text" 
                  value={persona.name}
                  onChange={(e) => handlePersonaChange('name', e.target.value)}
                  className="w-full bg-zinc-900/60 border border-white/10 rounded-lg px-4 py-3 focus:border-zinc-500 outline-none transition-colors text-zinc-200"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Tuổi</label>
                <input 
                  type="text" 
                  value={persona.age}
                  onChange={(e) => handlePersonaChange('age', e.target.value)}
                  className="w-full bg-zinc-900/60 border border-white/10 rounded-lg px-4 py-3 focus:border-zinc-500 outline-none transition-colors text-zinc-200"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Giới tính</label>
                <input 
                  type="text" 
                  value={persona.gender}
                  onChange={(e) => handlePersonaChange('gender', e.target.value)}
                  className="w-full bg-zinc-900/60 border border-white/10 rounded-lg px-4 py-3 focus:border-zinc-500 outline-none transition-colors text-zinc-200"
                />
              </div>
            </div>

            {/* Detailed Text Areas */}
            <div className="space-y-6">
              <div className="space-y-2 group">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Tính cách</label>
                  <button onClick={() => handleAiSuggest('personality')} disabled={loadingField === 'personality'} className="text-indigo-400 hover:text-indigo-300 p-1 rounded hover:bg-indigo-500/10">
                    <Sparkles size={16} className={loadingField === 'personality' ? "animate-spin" : ""} />
                  </button>
                </div>
                <textarea rows={3} value={persona.personality} onChange={(e) => handlePersonaChange('personality', e.target.value)} className="w-full bg-zinc-900/60 border border-white/10 rounded-lg px-4 py-3 focus:border-zinc-500 outline-none transition-colors resize-y leading-relaxed text-zinc-200" placeholder="Mô tả tính cách..." />
              </div>

              <div className="space-y-2 group">
                 <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Tiểu sử / Xuất thân</label>
                  <button onClick={() => handleAiSuggest('background')} disabled={loadingField === 'background'} className="text-indigo-400 hover:text-indigo-300 p-1 rounded hover:bg-indigo-500/10">
                    <Sparkles size={16} className={loadingField === 'background' ? "animate-spin" : ""} />
                  </button>
                </div>
                <textarea rows={4} value={persona.background} onChange={(e) => handlePersonaChange('background', e.target.value)} className="w-full bg-zinc-900/60 border border-white/10 rounded-lg px-4 py-3 focus:border-zinc-500 outline-none transition-colors resize-y leading-relaxed text-zinc-200" placeholder="Quá khứ và câu chuyện..." />
              </div>

              <div className="space-y-2 group">
                 <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Ngoại hình</label>
                  <button onClick={() => handleAiSuggest('appearance')} disabled={loadingField === 'appearance'} className="text-indigo-400 hover:text-indigo-300 p-1 rounded hover:bg-indigo-500/10">
                    <Sparkles size={16} className={loadingField === 'appearance' ? "animate-spin" : ""} />
                  </button>
                </div>
                <textarea rows={3} value={persona.appearance} onChange={(e) => handlePersonaChange('appearance', e.target.value)} className="w-full bg-zinc-900/60 border border-white/10 rounded-lg px-4 py-3 focus:border-zinc-500 outline-none transition-colors resize-y leading-relaxed text-zinc-200" placeholder="Mô tả vẻ bề ngoài..." />
              </div>
            </div>

             {/* Skills */}
             <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Kỹ năng & Khả năng</label>
                <button onClick={handleAddSkill} className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-sm font-medium"><Plus size={16} /> Thêm kỹ năng</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {persona.skills.map((skill, idx) => (
                  <div key={idx} className="relative group animate-fade-in">
                    <textarea value={skill} onChange={(e) => handleEditSkill(idx, e.target.value)} placeholder="Mô tả kỹ năng..." className="w-full bg-zinc-900/60 border border-white/10 rounded-lg pl-4 pr-10 py-3 text-sm focus:border-zinc-500 outline-none transition-colors resize-y min-h-[80px] text-zinc-200" />
                    <div className="absolute top-2 right-2 flex flex-col gap-1">
                      <button onClick={() => handleRemoveSkill(idx)} className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"><Trash2 size={14} /></button>
                      <button onClick={() => handleAiSkillSuggest(idx)} disabled={loadingField === `skill-${idx}`} className="p-1.5 text-zinc-600 hover:text-indigo-400 hover:bg-indigo-500/10 rounded transition-colors"><Sparkles size={14} className={loadingField === `skill-${idx}` ? "animate-spin" : ""} /></button>
                    </div>
                  </div>
                ))}
                {persona.skills.length === 0 && (
                  <div onClick={handleAddSkill} className="col-span-1 md:col-span-2 border-2 border-dashed border-zinc-800 rounded-lg p-8 flex flex-col items-center justify-center text-zinc-600 hover:text-zinc-400 hover:border-zinc-700 cursor-pointer transition-all">
                    <Plus size={24} className="mb-2" /><span className="text-sm">Nhấn để thêm kỹ năng đầu tiên</span>
                  </div>
                )}
              </div>
            </div>

            {/* Goals & Hobbies */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-2 group">
                 <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Mục tiêu</label>
                  <button onClick={() => handleAiSuggest('goals')} disabled={loadingField === 'goals'} className="text-indigo-400 hover:text-indigo-300 p-1 rounded hover:bg-indigo-500/10"><Sparkles size={16} className={loadingField === 'goals' ? "animate-spin" : ""} /></button>
                </div>
                <textarea rows={2} value={persona.goals} onChange={(e) => handlePersonaChange('goals', e.target.value)} className="w-full bg-zinc-900/60 border border-white/10 rounded-lg px-4 py-3 focus:border-zinc-500 outline-none transition-colors resize-y leading-relaxed text-zinc-200" />
              </div>
               <div className="space-y-2 group">
                 <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Sở thích</label>
                  <button onClick={() => handleAiSuggest('hobbies')} disabled={loadingField === 'hobbies'} className="text-indigo-400 hover:text-indigo-300 p-1 rounded hover:bg-indigo-500/10"><Sparkles size={16} className={loadingField === 'hobbies' ? "animate-spin" : ""} /></button>
                </div>
                <textarea rows={2} value={persona.hobbies} onChange={(e) => handlePersonaChange('hobbies', e.target.value)} className="w-full bg-zinc-900/60 border border-white/10 rounded-lg px-4 py-3 focus:border-zinc-500 outline-none transition-colors resize-y leading-relaxed text-zinc-200" />
              </div>
            </div>
          </div>
        )}

        {/* ================= WORLD TAB ================= */}
        {activeTab === 'WORLD' && (
           <div className="space-y-8 animate-fade-in">

              {/* Genre Selection */}
              <div className="space-y-2">
                 <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Thể loại (Genre)</label>
                 <div className="flex gap-4">
                    <select
                        value={PREDEFINED_GENRES.includes(worldInfo.genre) ? worldInfo.genre : 'Custom'}
                        onChange={handleGenreChange}
                        className="bg-zinc-900/60 border border-white/10 rounded-lg px-4 py-3 text-sm focus:border-zinc-500 outline-none text-zinc-200 min-w-[200px]"
                    >
                        <option value="" disabled>Chọn thể loại</option>
                        {PREDEFINED_GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                        <option value="Custom">Tùy chỉnh...</option>
                    </select>
                    {(customGenre !== '' || !PREDEFINED_GENRES.includes(worldInfo.genre) && worldInfo.genre !== '') && (
                         <input 
                         type="text" 
                         value={customGenre || worldInfo.genre}
                         onChange={(e) => {
                             setCustomGenre(e.target.value);
                             handleWorldChange('genre', e.target.value);
                         }}
                         placeholder="Nhập thể loại..."
                         className="flex-1 bg-zinc-900/60 border border-white/10 rounded-lg px-4 py-3 focus:border-zinc-500 outline-none transition-colors text-zinc-200"
                       />
                    )}
                 </div>
              </div>

              {/* World Name */}
              <div className="space-y-2 group">
                <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Tên Thế Giới</label>
                    <button onClick={() => handleWorldFieldSuggest('worldName')} disabled={loadingField === 'worldName'} className="text-indigo-400 hover:text-indigo-300 p-1 rounded hover:bg-indigo-500/10">
                        <Sparkles size={16} className={loadingField === 'worldName' ? "animate-spin" : ""} />
                    </button>
                </div>
                <input 
                    type="text" 
                    value={worldInfo.worldName}
                    onChange={(e) => handleWorldChange('worldName', e.target.value)}
                    className="w-full bg-zinc-900/60 border border-white/10 rounded-lg px-4 py-3 focus:border-zinc-500 outline-none transition-colors text-zinc-200 font-serif text-lg tracking-wide"
                />
              </div>

              {/* World Context */}
              <div className="space-y-2 group">
                <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Bối cảnh & Đặc điểm (World View)</label>
                    <button onClick={() => handleWorldFieldSuggest('worldContext')} disabled={loadingField === 'worldContext'} className="text-indigo-400 hover:text-indigo-300 p-1 rounded hover:bg-indigo-500/10">
                        <Sparkles size={16} className={loadingField === 'worldContext' ? "animate-spin" : ""} />
                    </button>
                </div>
                <textarea 
                    rows={8} 
                    value={worldInfo.worldContext} 
                    onChange={(e) => handleWorldChange('worldContext', e.target.value)}
                    className="w-full bg-zinc-900/60 border border-white/10 rounded-lg px-4 py-3 focus:border-zinc-500 outline-none transition-colors resize-y leading-relaxed text-zinc-200 font-mono text-sm"
                    placeholder="<worldview>...</worldview>"
                />
                <div className="text-[10px] text-zinc-600 text-right font-mono">Hỗ trợ thẻ XML: &lt;worldview&gt;</div>
              </div>

              {/* NPCs List */}
              <div className="space-y-4">
                 <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                        <Users size={14} /> Danh sách NPC
                    </label>
                    <div className="flex gap-2">
                        <button onClick={() => handleGenerateWorldList('npcs')} disabled={loadingField === 'npcs'} className="text-indigo-400 hover:text-indigo-300 text-xs font-medium flex items-center gap-1">
                             <RefreshCw size={12} className={loadingField === 'npcs' ? "animate-spin" : ""} /> AI Gợi ý 4 NPC
                        </button>
                        <div className="w-px h-4 bg-zinc-800"></div>
                        <button onClick={() => handleAddWorldListItem('npcs')} className="text-zinc-400 hover:text-zinc-200 text-xs font-medium flex items-center gap-1">
                             <Plus size={12} /> Thêm NPC
                        </button>
                    </div>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {worldInfo.npcs.map((npc, idx) => (
                         <div key={idx} className="relative group animate-fade-in">
                            <textarea
                                value={npc}
                                onChange={(e) => handleEditWorldListItem('npcs', idx, e.target.value)}
                                placeholder="<npc>...</npc>"
                                className="w-full bg-zinc-900/60 border border-white/10 rounded-lg pl-4 pr-10 py-3 text-sm focus:border-zinc-500 outline-none transition-colors resize-y min-h-[150px] text-zinc-200 font-mono"
                            />
                            <button onClick={() => handleRemoveWorldListItem('npcs', idx)} className="absolute top-2 right-2 p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors">
                                <Trash2 size={14} />
                            </button>
                         </div>
                    ))}
                    {worldInfo.npcs.length === 0 && (
                        <div className="col-span-1 md:col-span-2 py-8 text-center text-zinc-600 italic text-sm border border-dashed border-zinc-800 rounded-lg">
                            Chưa có NPC nào. Hãy thêm hoặc dùng AI để tạo.
                        </div>
                    )}
                 </div>
              </div>

              {/* Entities List */}
              <div className="space-y-4">
                 <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                        <Map size={14} /> Các Thực thể / Thế lực
                    </label>
                    <div className="flex gap-2">
                        <button onClick={() => handleGenerateWorldList('entities')} disabled={loadingField === 'entities'} className="text-indigo-400 hover:text-indigo-300 text-xs font-medium flex items-center gap-1">
                             <RefreshCw size={12} className={loadingField === 'entities' ? "animate-spin" : ""} /> AI Gợi ý 4 Thực thể
                        </button>
                        <div className="w-px h-4 bg-zinc-800"></div>
                        <button onClick={() => handleAddWorldListItem('entities')} className="text-zinc-400 hover:text-zinc-200 text-xs font-medium flex items-center gap-1">
                             <Plus size={12} /> Thêm Thực thể
                        </button>
                    </div>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {worldInfo.entities.map((entity, idx) => (
                         <div key={idx} className="relative group animate-fade-in">
                            <textarea
                                value={entity}
                                onChange={(e) => handleEditWorldListItem('entities', idx, e.target.value)}
                                placeholder="Mô tả thực thể..."
                                className="w-full bg-zinc-900/60 border border-white/10 rounded-lg pl-4 pr-10 py-3 text-sm focus:border-zinc-500 outline-none transition-colors resize-y min-h-[100px] text-zinc-200"
                            />
                            <button onClick={() => handleRemoveWorldListItem('entities', idx)} className="absolute top-2 right-2 p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors">
                                <Trash2 size={14} />
                            </button>
                         </div>
                    ))}
                     {worldInfo.entities.length === 0 && (
                        <div className="col-span-1 md:col-span-2 py-8 text-center text-zinc-600 italic text-sm border border-dashed border-zinc-800 rounded-lg">
                            Chưa có thực thể nào.
                        </div>
                    )}
                 </div>
              </div>

           </div>
        )}

      </div>
    </div>
  );
};

export default WorldCreation;