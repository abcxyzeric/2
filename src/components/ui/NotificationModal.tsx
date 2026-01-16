import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';
import Button from './Button';

export type NotificationType = 'info' | 'error' | 'success' | 'warning';

export interface NotificationState {
    show: boolean;
    message: string;
    type: NotificationType;
}

interface NotificationModalProps {
  isOpen: boolean;
  message: string;
  onClose: () => void;
  type?: NotificationType;
}

const NotificationModal: React.FC<NotificationModalProps> = ({ isOpen, message, onClose, type = 'info' }) => {
  const MotionDiv = motion.div as any;
  
  const getIcon = () => {
    switch(type) {
        case 'error': return <AlertCircle className="text-red-400" size={40} />;
        case 'success': return <CheckCircle className="text-green-400" size={40} />;
        case 'warning': return <AlertTriangle className="text-yellow-400" size={40} />;
        default: return <Info className="text-blue-400" size={40} />;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-[2px] p-4">
          <MotionDiv 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-mystic-900 border border-slate-700 w-full max-w-sm rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.5)] overflow-hidden"
          >
            <div className="p-6 flex flex-col items-center text-center gap-4">
                <div className="p-3 bg-slate-800/50 rounded-full border border-slate-700">
                    {getIcon()}
                </div>
                <p className="text-slate-200 text-sm leading-relaxed font-medium">{message}</p>
                <Button onClick={onClose} variant="primary" className="w-full h-10 mt-2">
                    Đóng
                </Button>
            </div>
          </MotionDiv>
        </div>
      )}
    </AnimatePresence>
  );
};

export default NotificationModal;