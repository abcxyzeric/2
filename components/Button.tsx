import React from 'react';
import { LucideIcon } from 'lucide-react';

interface ButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  icon?: LucideIcon;
  variant?: 'primary' | 'secondary' | 'ghost';
  className?: string;
  fullWidth?: boolean;
}

const Button: React.FC<ButtonProps> = ({ 
  onClick, 
  children, 
  icon: Icon, 
  variant = 'primary', 
  className = '',
  fullWidth = false
}) => {
  const baseStyles = "flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl transition-all duration-300 font-medium text-sm tracking-wide focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98]";
  
  const variants = {
    primary: "bg-zinc-100 text-zinc-900 hover:bg-white hover:shadow-[0_0_20px_rgba(255,255,255,0.15)] border border-transparent shadow-lg shadow-black/20",
    secondary: "bg-zinc-900/40 text-zinc-300 border border-white/10 hover:bg-zinc-800 hover:text-white hover:border-white/20 backdrop-blur-md shadow-sm hover:shadow-md",
    ghost: "bg-transparent text-zinc-400 hover:text-zinc-100 hover:bg-white/5",
  };

  const widthStyle = fullWidth ? "w-full" : "";

  return (
    <button 
      onClick={onClick} 
      className={`${baseStyles} ${variants[variant]} ${widthStyle} ${className}`}
    >
      {Icon && <Icon size={18} strokeWidth={2} className="opacity-90" />}
      {children}
    </button>
  );
};

export default Button;