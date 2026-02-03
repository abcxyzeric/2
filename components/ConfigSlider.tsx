import React from 'react';

interface ConfigSliderProps {
  label: string;
  subLabel?: string;
  value: number;
  onChange: (val: number) => void;
  min: number;
  max: number;
  step: number;
  disabled?: boolean;
}

const ConfigSlider: React.FC<ConfigSliderProps> = ({ 
  label, 
  subLabel, 
  value, 
  onChange, 
  min, 
  max, 
  step,
  disabled = false
}) => {
  return (
    <div className={`space-y-2 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <div className="flex justify-between items-end">
        <label className="text-sm text-zinc-300 font-medium">{label}</label>
        <span className="text-[10px] text-zinc-500 font-mono">{subLabel || `Max: ${max}`}</span>
      </div>
      <div className="flex gap-3 items-center">
        <input 
          type="range" 
          min={min} 
          max={max} 
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 transition-all"
        />
        <input 
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-20 bg-zinc-950 border border-white/10 rounded-md px-2 py-1 text-xs font-mono text-right outline-none focus:border-indigo-500 text-zinc-300 focus:text-white transition-colors"
        />
      </div>
    </div>
  );
};

export default ConfigSlider;