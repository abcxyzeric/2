import React, { useState } from 'react';
import { ArrowLeft, Sparkles, Plus, Trash2, Save, Wand2 } from 'lucide-react';
import Button from './Button';
import Toast from './Toast';
import { AppView, Persona, INITIAL_PERSONA } from '../types';
import { generateFullPersonaFromIdea, generatePersonaField } from '../services/ai';

interface WorldCreationProps {
  onNavigate: (view: AppView) => void;
}

const WorldCreation: React.FC<WorldCreationProps> = ({ onNavigate }) => {
  const [persona, setPersona] = useState<Persona>(INITIAL_PERSONA);
  const [ideaInput, setIdeaInput] = useState('');
  const [loadingField, setLoadingField] = useState<string | null>(null);
  const [isGeneratingFull, setIsGeneratingFull] = useState(false);
  const [newSkill, setNewSkill] = useState('');
  
  // Toast State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
  };

  const handleChange = (field: keyof Persona, value: string) => {
    setPersona(prev => ({ ...prev, [field]: value }));
  };

  const handleAddSkill = () => {
    if (newSkill.trim()) {
      setPersona(prev => ({ ...prev, skills: [...prev.skills, newSkill.trim()] }));
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (index: number) => {
    setPersona(prev => ({
      ...prev,
      skills: prev.skills.filter((_, i) => i !== index)
    }));
  };

  // --- AI Logic ---

  const handleGenerateFromIdea = async () => {
    if (!ideaInput.trim()) {
      showToast("Vui lòng nhập ý tưởng trước!", "error");
      return;
    }
    
    setIsGeneratingFull(true);
    try {
      const result = await generateFullPersonaFromIdea(ideaInput);
      if (result) {
        setPersona(result);
        showToast("Đã tạo hồ sơ nhân vật thành công!", "success");
      } else {
        showToast("Không thể tạo nhân vật. Vui lòng thử lại.", "error");
      }
    } catch (error) {
      showToast("Lỗi kết nối AI.", "error");
    } finally {
      setIsGeneratingFull(false);
    }
  };

  const handleAiSuggest = async (field: keyof Persona) => {
    // Check Dependencies
    if (!persona.name || !persona.age || !persona.gender) {
      showToast("Vui lòng nhập Tên, Tuổi và Giới tính trước khi dùng gợi ý.", "error");
      return;
    }

    setLoadingField(field);
    try {
      // TypeScript trick to access dynamic property safely if it's a string
      const currentValue = typeof persona[field] === 'string' ? persona[field] as string : '';
      
      const result = await generatePersonaField(persona, field, currentValue);
      
      if (result) {
        handleChange(field, result);
        showToast(`Đã cập nhật ${getFieldLabel(field)}`, "success");
      }
    } catch (error) {
      showToast("Lỗi khi gọi AI.", "error");
    } finally {
      setLoadingField(null);
    }
  };

  const handleAiSkillSuggest = async () => {
     if (!persona.name || !persona.age || !persona.gender) {
      showToast("Vui lòng nhập Tên, Tuổi và Giới tính trước khi gợi ý kỹ năng.", "error");
      return;
    }
    setLoadingField('newSkill');
    try {
      const result = await generatePersonaField(persona, 'skills', newSkill);
      if (result) {
        setNewSkill(result);
      }
    } catch (error) {
       showToast("Lỗi khi gọi AI.", "error");
    } finally {
      setLoadingField(null);
    }
  };

  const getFieldLabel = (field: string) => {
    const labels: Record<string, string> = {
      name: 'Tên', age: 'Tuổi', gender: 'Giới tính',
      personality: 'Tính cách', background: 'Tiểu sử', appearance: 'Ngoại hình',
      goals: 'Mục tiêu', hobbies: 'Sở thích'
    };
    return labels[field] || field;
  };

  return (
    <div className="flex flex-col h-screen w-full animate-fade-in bg-zinc-950 text-zinc-200 overflow-y-auto">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Top Bar */}
      <div className="h-16 border-b border-zinc-900 flex items-center justify-between px-4 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center">
          <Button 
            onClick={() => onNavigate(AppView.MAIN_MENU)} 
            variant="ghost" 
            icon={ArrowLeft}
            className="mr-4 !px-3"
          >
            {null}
          </Button>
          <div className="font-serif font-bold text-lg text-zinc-100">Thiết lập Nhân vật</div>
        </div>
        <Button onClick={() => showToast("Chức năng Lưu đang phát triển", "info")} variant="primary" icon={Save}>
          Lưu
        </Button>
      </div>

      <div className="max-w-4xl w-full mx-auto p-6 pb-20 space-y-8">
        
        {/* Generate from Idea Section */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Sparkles size={100} />
          </div>
          <h3 className="text-indigo-400 font-medium mb-3 flex items-center gap-2">
            <Wand2 size={18} /> Tạo nhanh từ ý tưởng
          </h3>
          <div className="flex gap-3">
            <input
              type="text"
              value={ideaInput}
              onChange={(e) => setIdeaInput(e.target.value)}
              placeholder="Ví dụ: Một ninja không gian tên Luna, lạnh lùng nhưng trung thành..."
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all placeholder-zinc-600"
            />
            <Button 
              onClick={handleGenerateFromIdea} 
              variant="secondary"
              className={isGeneratingFull ? "opacity-70 cursor-wait" : ""}
            >
              {isGeneratingFull ? "Đang tạo..." : "Tự động điền"}
            </Button>
          </div>
        </div>

        {/* Basic Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Name */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Tên nhân vật</label>
            <input 
              type="text" 
              value={persona.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 focus:border-zinc-600 outline-none transition-colors"
            />
          </div>
          {/* Age */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Tuổi</label>
            <input 
              type="text" 
              value={persona.age}
              onChange={(e) => handleChange('age', e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 focus:border-zinc-600 outline-none transition-colors"
            />
          </div>
          {/* Gender */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Giới tính</label>
            <input 
              type="text" 
              value={persona.gender}
              onChange={(e) => handleChange('gender', e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 focus:border-zinc-600 outline-none transition-colors"
            />
          </div>
        </div>

        {/* Detailed Text Areas */}
        <div className="space-y-6">
          {/* Personality */}
          <div className="space-y-2 group">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Tính cách</label>
              <button 
                onClick={() => handleAiSuggest('personality')}
                disabled={loadingField === 'personality'}
                className="text-indigo-400 hover:text-indigo-300 transition-colors p-1 rounded hover:bg-indigo-500/10"
                title="AI Gợi ý / Mở rộng"
              >
                <Sparkles size={16} className={loadingField === 'personality' ? "animate-spin" : ""} />
              </button>
            </div>
            <textarea 
              rows={3}
              value={persona.personality}
              onChange={(e) => handleChange('personality', e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 focus:border-zinc-600 outline-none transition-colors resize-none leading-relaxed"
              placeholder="Mô tả tính cách..."
            />
          </div>

          {/* Background */}
          <div className="space-y-2 group">
             <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Tiểu sử / Xuất thân</label>
              <button 
                onClick={() => handleAiSuggest('background')}
                disabled={loadingField === 'background'}
                className="text-indigo-400 hover:text-indigo-300 transition-colors p-1 rounded hover:bg-indigo-500/10"
              >
                <Sparkles size={16} className={loadingField === 'background' ? "animate-spin" : ""} />
              </button>
            </div>
            <textarea 
              rows={4}
              value={persona.background}
              onChange={(e) => handleChange('background', e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 focus:border-zinc-600 outline-none transition-colors resize-none leading-relaxed"
              placeholder="Quá khứ và câu chuyện của nhân vật..."
            />
          </div>

          {/* Appearance */}
          <div className="space-y-2 group">
             <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Ngoại hình</label>
              <button 
                onClick={() => handleAiSuggest('appearance')}
                disabled={loadingField === 'appearance'}
                className="text-indigo-400 hover:text-indigo-300 transition-colors p-1 rounded hover:bg-indigo-500/10"
              >
                <Sparkles size={16} className={loadingField === 'appearance' ? "animate-spin" : ""} />
              </button>
            </div>
            <textarea 
              rows={3}
              value={persona.appearance}
              onChange={(e) => handleChange('appearance', e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 focus:border-zinc-600 outline-none transition-colors resize-none leading-relaxed"
              placeholder="Mô tả vẻ bề ngoài..."
            />
          </div>
        </div>

        {/* Dynamic Skills Section */}
        <div className="space-y-4">
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Kỹ năng & Khả năng</label>
          
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input 
                type="text" 
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddSkill()}
                placeholder="Thêm kỹ năng mới..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-4 pr-10 py-3 focus:border-zinc-600 outline-none transition-colors"
              />
              <button 
                onClick={handleAiSkillSuggest}
                disabled={loadingField === 'newSkill'}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-indigo-400 hover:text-indigo-300 p-1.5 rounded hover:bg-indigo-500/10 transition-colors"
              >
                <Sparkles size={16} className={loadingField === 'newSkill' ? "animate-spin" : ""} />
              </button>
            </div>
            <button 
              onClick={handleAddSkill}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-4 rounded-lg transition-colors border border-zinc-700"
            >
              <Plus size={20} />
            </button>
          </div>

          {persona.skills.length > 0 ? (
            <div className="flex flex-wrap gap-2 mt-2">
              {persona.skills.map((skill, idx) => (
                <div key={idx} className="group flex items-center gap-2 bg-zinc-900 border border-zinc-800 text-zinc-300 px-3 py-1.5 rounded-full text-sm hover:border-zinc-600 transition-colors">
                  <span>{skill}</span>
                  <button onClick={() => handleRemoveSkill(idx)} className="text-zinc-600 group-hover:text-red-400 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-zinc-600 text-sm italic py-2">Chưa có kỹ năng nào.</div>
          )}
        </div>

        {/* Optional Fields (Goals & Hobbies) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="space-y-2 group">
             <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Mục tiêu</label>
              <button 
                onClick={() => handleAiSuggest('goals')}
                disabled={loadingField === 'goals'}
                className="text-indigo-400 hover:text-indigo-300 transition-colors p-1 rounded hover:bg-indigo-500/10"
              >
                <Sparkles size={16} className={loadingField === 'goals' ? "animate-spin" : ""} />
              </button>
            </div>
            <textarea 
              rows={2}
              value={persona.goals}
              onChange={(e) => handleChange('goals', e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 focus:border-zinc-600 outline-none transition-colors resize-none leading-relaxed"
            />
          </div>

           <div className="space-y-2 group">
             <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Sở thích</label>
              <button 
                onClick={() => handleAiSuggest('hobbies')}
                disabled={loadingField === 'hobbies'}
                className="text-indigo-400 hover:text-indigo-300 transition-colors p-1 rounded hover:bg-indigo-500/10"
              >
                <Sparkles size={16} className={loadingField === 'hobbies' ? "animate-spin" : ""} />
              </button>
            </div>
            <textarea 
              rows={2}
              value={persona.hobbies}
              onChange={(e) => handleChange('hobbies', e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 focus:border-zinc-600 outline-none transition-colors resize-none leading-relaxed"
            />
          </div>
        </div>

      </div>
    </div>
  );
};

export default WorldCreation;