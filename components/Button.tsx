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
  const baseStyles = "flex items-center justify-center gap-3 px-6 py-3 rounded-lg transition-all duration-300 font-medium text-sm tracking-wide focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-zinc-100 text-zinc-900 hover:bg-white hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] focus:ring-zinc-100 border border-transparent",
    secondary: "bg-zinc-900/50 text-zinc-300 border border-zinc-800 hover:bg-zinc-800/80 hover:text-white hover:border-zinc-700 focus:ring-zinc-600 backdrop-blur-sm",
    ghost: "bg-transparent text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/30",
  };

  const widthStyle = fullWidth ? "w-full" : "";

  return (
    <button 
      onClick={onClick} 
      className={`${baseStyles} ${variants[variant]} ${widthStyle} ${className}`}
    >
      {Icon && <Icon size={18} strokeWidth={2} />}
      {children}
    </button>
  );
};

export default Button;