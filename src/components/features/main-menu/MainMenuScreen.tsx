
import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  RotateCcw, 
  Save, 
  Settings, 
  Upload,
  X,
  Clock,
  FileText,
  Trash2,
  CheckCircle,
  Download
} from 'lucide-react';
import Button from '../../ui/Button';
import StatusFooter from './StatusFooter';
import NotificationModal, { NotificationState, NotificationType } from '../../ui/NotificationModal';
import { useDatabaseStatus } from '../../../hooks/useDatabaseStatus';
import { NavigationProps, GameState, SaveFile, WorldData } from '../../../types';
import { dbService } from '../../../services/db/indexedDB';

const containerVariants: any = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.3
    }
  }
};

const itemVariants: any = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 50 } }
};

const MainMenuScreen: React.FC<NavigationProps> = ({ onNavigate, onGameStart, onImportSetup }) => {
  const { hasSaves } = useDatabaseStatus();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [saveList, setSaveList] = useState<SaveFile[]>([]);
  const [activeTab, setActiveTab] = useState<'auto' | 'manual'>('manual');
  
  // Notification State
  const [notification, setNotification] = useState<NotificationState>({ show: false, message: '', type: 'info' });
  
  // Delete Confirmation State
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  
  // Toast State (Auto Dismiss)
  const [toast, setToast] = useState<{show: boolean, message: string}>({show: false, message: ''});

  const MotionDiv = motion.div as any;

  // Helper to show notification
  const showNotify = (message: string, type: NotificationType = 'info') => {
      setNotification({ show: true, message, type });
  };

  // Toast Timer
  useEffect(() => {
    if (toast.show) {
        const timer = setTimeout(() => {
            setToast({ ...toast, show: false });
        }, 3000); // 3 seconds
        return () => clearTimeout(timer);
    }
  }, [toast.show]);

  // --- Import Logic ---
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsedData = JSON.parse(content);
        
        // CASE 1: File Save Gameplay (Standard WorldData structure with savedState)
        // Đây là cấu trúc chuẩn khi tải về từ menu hoặc gameplay
        if (parsedData.savedState && parsedData.world && parsedData.player) {
             console.log("Phát hiện file Save Gameplay (Standard)");
             if (onGameStart) {
                 onGameStart(parsedData as WorldData);
             }
             return;
        }

        // CASE 2: Legacy/Alternative Structure (Structure flattened)
        // Cấu trúc cũ hoặc biến thể: { id, world: WorldData, history: [], turnCount: 0, ... }
        else if (parsedData.history && parsedData.world && parsedData.world.player) {
             console.log("Phát hiện file Save Gameplay (Legacy/Flattened)");
             const worldData: WorldData = {
                ...parsedData.world, // Lấy WorldData gốc từ bên trong
                savedState: {
                    history: parsedData.history,
                    turnCount: parsedData.turnCount || 0
                }
            };
            
            if (onGameStart) {
                onGameStart(worldData);
            }
        }
        // CASE 3: File Export từ World Creation (Chỉ là setup, không có savedState)
        // Cấu trúc: { player, world, config, entities }
        else if (parsedData.player && parsedData.world && parsedData.config && !parsedData.savedState) {
             showNotify("⚠️ Đây là file Thiết lập Thế giới (Setup). Vui lòng vào mục 'Khởi tạo thế giới' -> Nút 'Nhập' (Import) ở góc dưới để sử dụng file này.", 'warning');
             return;
        } 
        else {
             throw new Error("Cấu trúc file không hợp lệ hoặc thiếu dữ liệu quan trọng.");
        }
        
      } catch (error) {
        showNotify("File không hợp lệ! Vui lòng kiểm tra lại.", 'error');
        console.error(error);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  // --- Load Game Logic ---
  const handleOpenLoadGame = async () => {
      const saves = await dbService.getAllSaves();
      // Sort by updated time desc
      saves.sort((a, b) => b.updatedAt - a.updatedAt);
      setSaveList(saves);
      setShowLoadModal(true);
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      setDeleteTargetId(id); // Trigger confirmation modal
  };

  const handleDownloadClick = (e: React.MouseEvent, save: SaveFile) => {
      e.stopPropagation();
      try {
          // Xuất toàn bộ dữ liệu WorldData (bao gồm savedState bên trong)
          const dataToExport = save.data; 
          
          // Tạo tên file an toàn
          const safeName = save.name.replace(/[^a-z0-9\u00C0-\u024F ]/gi, '_').toLowerCase();
          const fileName = `mythos_save_${safeName}_${save.id}.json`;
          
          const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataToExport, null, 2));
          const downloadAnchorNode = document.createElement('a');
          downloadAnchorNode.setAttribute("href", dataStr);
          downloadAnchorNode.setAttribute("download", fileName);
          document.body.appendChild(downloadAnchorNode);
          downloadAnchorNode.click();
          downloadAnchorNode.remove();

          setToast({ show: true, message: "Đã tải xuống file save!" });
      } catch (err) {
          console.error(err);
          showNotify("Lỗi khi tạo file tải xuống", 'error');
      }
  };

  const confirmDelete = async () => {
      if (!deleteTargetId) return;
      
      await dbService.deleteSave(deleteTargetId);
      
      // Update UI List
      const newSaves = await dbService.getAllSaves();
      newSaves.sort((a, b) => b.updatedAt - a.updatedAt);
      setSaveList(newSaves);
      
      // Cleanup Modal
      setDeleteTargetId(null);
      
      // Show Toast instead of Popup
      setToast({ show: true, message: "Đã xóa file save thành công!" });
  };

  const handleLoadSave = (save: SaveFile) => {
      if (!onGameStart) return;

      // save.data is fully compliant with WorldData structure including savedState
      const worldData = save.data as WorldData;
      
      // Safety check just in case savedState is missing in older saves (unlikely given new structure but safe)
      if (!worldData.savedState) {
          showNotify("File save bị hỏng: Thiếu trạng thái game.", 'error');
          return;
      }

      onGameStart(worldData);
  };

  const filteredSaves = saveList.filter(s => {
      if (activeTab === 'auto') return s.id.startsWith('autosave-');
      return s.id.startsWith('manual-');
  });

  return (
    <div className="flex flex-col h-full w-full relative">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept=".json" 
        className="hidden" 
      />

      <div className="flex-1 overflow-y-auto overflow-x-hidden relative">
        <div className="min-h-full flex flex-col items-center justify-center p-4 py-12 md:p-8 z-10">
          
          <MotionDiv 
            initial={{ opacity: 0, scale: 0.9, y: -30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="mb-10 md:mb-16 text-center px-4"
          >
            <h1 className="font-serif text-4xl sm:text-5xl md:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-slate-100 to-slate-500 tracking-wider drop-shadow-lg mb-4">
              MythOS
            </h1>
            <div className="h-[1px] w-16 md:w-24 mx-auto bg-mystic-accent/50 shadow-[0_0_10px_#38bdf8]" />
            <p className="mt-4 font-sans text-mystic-accent text-xs md:text-sm tracking-[0.2em] md:tracking-[0.3em] uppercase opacity-80">
              bản nhái đủ thứ trên đời
            </p>
          </MotionDiv>

          <MotionDiv 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col gap-3 md:gap-4 w-full max-w-xs sm:max-w-sm px-2"
          >
            <MotionDiv variants={itemVariants}>
              <Button 
                variant="primary" 
                className="w-full h-12 md:h-14 text-base md:text-lg border-mystic-accent/50"
                icon={<Play size={20} />}
                onClick={() => onNavigate(GameState.WORLD_CREATION)}
              >
                Khởi tạo thế giới
              </Button>
            </MotionDiv>

            <MotionDiv variants={itemVariants}>
              <Button 
                variant="ghost" 
                className="w-full h-10 md:h-12 justify-start pl-6 md:pl-8"
                icon={<Save size={18} />}
                onClick={handleOpenLoadGame}
                disabled={!hasSaves}
              >
                Tải lại Save
              </Button>
            </MotionDiv>

            <MotionDiv variants={itemVariants}>
              <Button 
                variant="ghost" 
                className="w-full h-10 md:h-12 justify-start pl-6 md:pl-8" 
                icon={<Upload size={18} />}
                onClick={handleImportClick}
              >
                  Nhập Save File
              </Button>
            </MotionDiv>

            <div className="w-full h-[1px] bg-slate-800 my-1 md:my-2" />

            <MotionDiv variants={itemVariants}>
              <Button 
                variant="ghost" 
                className="w-full h-10 md:h-12 justify-start pl-6 md:pl-8 text-slate-500 hover:text-slate-300"
                icon={<Settings size={16} />}
                onClick={() => onNavigate(GameState.SETTINGS)}
              >
                Cài đặt
              </Button>
            </MotionDiv>

          </MotionDiv>
        </div>
      </div>

      <StatusFooter />

      {/* LOAD GAME MODAL */}
      <AnimatePresence>
          {showLoadModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                  <MotionDiv 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-mystic-900 border border-slate-700 w-full max-w-2xl rounded-xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden"
                  >
                      {/* Header */}
                      <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                          <h2 className="text-xl font-bold text-slate-200 flex items-center gap-2">
                              <RotateCcw size={20} className="text-mystic-accent"/> Tải lại Game
                          </h2>
                          <button onClick={() => setShowLoadModal(false)} className="text-slate-400 hover:text-white p-1">
                              <X size={24} />
                          </button>
                      </div>

                      {/* Tabs */}
                      <div className="flex border-b border-slate-800 bg-slate-900/30">
                          <button 
                            className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'manual' ? 'text-mystic-accent border-b-2 border-mystic-accent bg-mystic-accent/5' : 'text-slate-400 hover:text-slate-200'}`}
                            onClick={() => setActiveTab('manual')}
                          >
                              Lưu Thủ Công
                          </button>
                          <button 
                            className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'auto' ? 'text-mystic-accent border-b-2 border-mystic-accent bg-mystic-accent/5' : 'text-slate-400 hover:text-slate-200'}`}
                            onClick={() => setActiveTab('auto')}
                          >
                              Lưu Tự Động
                          </button>
                      </div>

                      {/* List */}
                      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-mystic-900">
                          {filteredSaves.length === 0 ? (
                              <div className="text-center text-slate-500 py-10">
                                  Không có file save nào trong mục này.
                              </div>
                          ) : (
                              filteredSaves.map((save) => {
                                  // Safely access nested data with fallbacks
                                  const turnCount = save.data?.savedState?.turnCount || 0;
                                  const playerName = save.data?.player?.name;

                                  return (
                                    <div 
                                      key={save.id} 
                                      onClick={() => handleLoadSave(save)}
                                      className="group flex justify-between items-center bg-slate-800 border border-slate-700 p-4 rounded-lg cursor-pointer hover:border-mystic-accent hover:bg-slate-800/80 transition-all"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={`p-2 rounded-lg ${save.id.startsWith('auto') ? 'bg-orange-900/20 text-orange-400' : 'bg-blue-900/20 text-blue-400'}`}>
                                                <FileText size={20} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-200 group-hover:text-mystic-accent transition-colors">
                                                    {save.name}
                                                </h4>
                                                <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                                                    <span className="flex items-center gap-1"><Clock size={10}/> {new Date(save.updatedAt).toLocaleString()}</span>
                                                    <span>•</span>
                                                    <span>Lượt: {turnCount}</span>
                                                </div>
                                                {playerName && (
                                                    <div className="text-xs text-slate-500 mt-1">
                                                        Người chơi: {playerName}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                              onClick={(e) => handleDownloadClick(e, save)}
                                              className="p-2 text-slate-500 hover:text-mystic-accent hover:bg-mystic-accent/10 rounded-full transition-colors"
                                              title="Tải xuống"
                                            >
                                                <Download size={16} />
                                            </button>
                                            <button 
                                              onClick={(e) => handleDeleteClick(e, save.id)}
                                              className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-900/10 rounded-full transition-colors"
                                              title="Xóa save"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                  );
                              })
                          )}
                      </div>
                  </MotionDiv>
              </div>
          )}
      </AnimatePresence>

      {/* Confirmation Modal for Deletion */}
      <NotificationModal 
        isOpen={!!deleteTargetId}
        message="Bạn có chắc chắn muốn xóa file save này? Hành động này không thể hoàn tác."
        type="warning"
        onClose={() => setDeleteTargetId(null)}
        onConfirm={confirmDelete}
        confirmText="Xóa ngay"
        cancelText="Giữ lại"
      />

      {/* General Notification Modal (Errors/Info) */}
      <NotificationModal 
        isOpen={notification.show} 
        message={notification.message} 
        type={notification.type}
        onClose={() => setNotification(prev => ({ ...prev, show: false }))} 
      />

      {/* Success Toast Notification */}
      <AnimatePresence>
        {toast.show && (
            <motion.div 
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.9 }}
                className="fixed bottom-16 right-4 md:bottom-10 md:right-10 z-[100] bg-mystic-800 border border-green-500/50 text-green-400 px-6 py-3 rounded-lg shadow-[0_0_20px_rgba(34,197,94,0.2)] flex items-center gap-3 backdrop-blur-md"
            >
                <CheckCircle size={20} />
                <span className="font-bold text-sm">{toast.message}</span>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MainMenuScreen;