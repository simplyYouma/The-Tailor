import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DropdownOption {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface DropdownProps {
  label: string;
  options: DropdownOption[];
  onSelect: (option: DropdownOption) => void;
  selectedId?: string;
  className?: string;
  triggerClassName?: string;
  icon?: React.ReactNode;
  align?: 'left' | 'right';
}

export function Dropdown({ 
  label, 
  options, 
  onSelect, 
  selectedId, 
  className,
  triggerClassName,
  icon,
  align = 'left' 
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.id === selectedId);

  return (
    <div className={cn("relative inline-block text-left", className)} ref={dropdownRef}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "h-10 px-4 rounded-full flex items-center gap-3 transition-all duration-300 font-bold text-[10px] uppercase tracking-widest border",
          !triggerClassName && (isOpen || selectedId) 
            ? "bg-[#1C1917] text-white border-[#1C1917] shadow-lg shadow-black/10" 
            : "bg-[#FAF9F6] text-[#78716C] border-[#E7E5E4] hover:border-[#1C1917]/30 hover:bg-white",
          triggerClassName
        )}
      >
        {icon || (selectedOption?.icon)}
        <span>{selectedOption?.label || label}</span>
        <ChevronDown className={cn("w-3 h-3 transition-transform duration-300", isOpen ? "rotate-180 text-[#B68D40]" : "opacity-40")} />
      </button>

      {/* Menu Backdrop-Blur (Glassmorphism) */}
      {isOpen && (
        <div 
          className={cn(
            "absolute z-[999] mt-2 min-w-[200px] max-h-[280px] overflow-y-auto bg-white/95 backdrop-blur-xl border border-[#E7E5E4] rounded-2xl p-2 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-300",
            "scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]",
            align === 'right' ? 'right-0' : 'left-0'
          )}
        >
          <div className="space-y-1">
            {options.map((option) => (
              <button
                key={option.id}
                onClick={() => {
                  onSelect(option);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full px-4 py-2.5 rounded-xl flex items-center gap-3 transition-all text-left group",
                  selectedId === option.id 
                    ? "bg-[#1C1917] text-white" 
                    : "text-[#78716C] hover:bg-[#FAF9F6] hover:text-[#1C1917]"
                )}
              >
                {option.icon && (
                  <span className={cn(
                    "w-4 h-4 flex items-center justify-center transition-colors",
                    selectedId === option.id ? "text-[#B68D40]" : "text-[#A8A29E] group-hover:text-[#B68D40]"
                  )}>
                    {option.icon}
                  </span>
                )}
                <span className="text-[10px] font-black uppercase tracking-widest flex-1">
                  {option.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
