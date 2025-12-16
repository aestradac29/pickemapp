
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';

export interface Option {
  id: string;
  label: string;
  subLabel?: string;
  image?: string;
  color?: string;
  imageClassName?: string; // New prop for styling images (e.g. inversion)
}

// Helper component to handle image fallback safely
const SafeImage = ({ src, alt, className, fallbackColor, fallbackLabel }: any) => {
  const [error, setError] = useState(false);
  
  // Reset error state if the source URL changes (important for reused components)
  useEffect(() => {
    setError(false);
  }, [src]);

  if (error || !src) {
      // Fallback generator (UI Avatars)
      const bg = fallbackColor ? fallbackColor.replace('#', '') : '333';
      const initial = fallbackLabel ? fallbackLabel[0] : '?';
      const fallbackSrc = `https://ui-avatars.com/api/?name=${initial}&background=${bg}&color=fff&size=64&bold=true`;
      
      return <img src={fallbackSrc} alt={alt} className={className} />;
  }

  return <img src={src} alt={alt} className={className} onError={() => setError(true)} />;
};

interface SearchableSelectProps {
  label: string;
  options: Option[];
  placeholder?: string;
  value?: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({ 
  label, 
  options, 
  placeholder = "Seleccionar...", 
  value, 
  onChange,
  className,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.id === value);

  const filteredOptions = options.filter(o => 
    o.label.toLowerCase().includes(search.toLowerCase()) || 
    (o.subLabel && o.subLabel.toLowerCase().includes(search.toLowerCase()))
  );

  const handleSelect = (optionId: string) => {
    onChange(optionId);
    setIsOpen(false);
    setSearch("");
  };

  return (
    <div className={`relative group ${className}`} ref={dropdownRef}>
      {label && (
        <label className="block text-xs font-bold text-[#ac88d6] uppercase mb-2 tracking-wider flex items-center gap-2">
            {label}
            {selectedOption && <Check className="w-3 h-3 text-green-400" />}
        </label>
      )}
      
      {/* Trigger Button */}
      <button 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full bg-[#0a1428] min-h-[56px] px-4 py-2 rounded-lg border text-left flex items-center gap-3 transition-all duration-300
          ${isOpen ? 'border-[#ac88d6] ring-1 ring-[#ac88d6]' : 'border-gray-700 hover:border-gray-500'}
          ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-900 grayscale' : ''}
        `}
      >
        {selectedOption ? (
          <>
            {/* Image Section */}
            {selectedOption.image ? (
               <div className="w-10 h-10 rounded bg-[#1a2c4e] flex items-center justify-center overflow-hidden border border-gray-600 shadow-inner flex-shrink-0">
                  <SafeImage 
                      src={selectedOption.image} 
                      alt="" 
                      className={`w-full h-full object-contain ${selectedOption.imageClassName || ''}`} 
                      fallbackColor={selectedOption.color}
                      fallbackLabel={selectedOption.label}
                  />
               </div>
            ) : selectedOption.color ? (
                <div className="w-8 h-8 rounded flex items-center justify-center font-bold text-xs flex-shrink-0" style={{ backgroundColor: selectedOption.color }}>
                    {selectedOption.label[0]}
                </div>
            ) : (
                <div className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center font-bold text-xs text-gray-400 flex-shrink-0">
                    {selectedOption.label[0]}
                </div>
            )}
            
            {/* Text Section - Replaced w-full with flex-1 min-w-0 for proper flex behavior */}
            <div className="flex flex-col text-left flex-1 min-w-0 overflow-hidden">
                <div className="font-bold text-gray-200 leading-tight truncate">{selectedOption.label}</div>
                {selectedOption.subLabel && <div className="text-[10px] text-gray-500 uppercase truncate">{selectedOption.subLabel}</div>}
            </div>
          </>
        ) : (
          <span className="text-gray-500 italic text-sm flex-1">{placeholder}</span>
        )}
        
        {/* Chevron - Always flex-shrink-0 */}
        {!disabled && <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180 text-[#ac88d6]' : ''}`} />}
      </button>

      {/* Dropdown Menu */}
      {isOpen && !disabled && (
        <div className="absolute z-[100] mt-2 min-w-[300px] w-full max-w-[90vw] -left-2 sm:left-0 bg-[#0f1923] border border-gray-600 rounded-lg shadow-[0_10px_40px_rgba(0,0,0,0.5)] overflow-hidden animate-in fade-in zoom-in-95 origin-top">
          {/* Search Input */}
          <div className="p-3 border-b border-gray-700 bg-[#0f1d36]">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar..."
                className="w-full bg-[#050a14] text-white text-sm rounded pl-9 pr-3 py-2.5 border border-gray-700 focus:border-[#ac88d6] outline-none placeholder-gray-600"
              />
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-80 overflow-y-auto custom-scrollbar">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleSelect(option.id)}
                  className={`
                    w-full px-4 py-3 flex items-center gap-4 hover:bg-gray-800 transition-colors border-l-4 border-transparent text-left
                    ${value === option.id ? 'bg-[#ac88d6]/10 border-l-[#ac88d6]' : ''}
                  `}
                >
                  {option.image ? (
                     <div className="w-12 h-12 rounded-lg bg-[#0f1923] flex items-center justify-center overflow-hidden shadow-md border border-gray-700 flex-shrink-0">
                        <SafeImage 
                            src={option.image} 
                            alt="" 
                            className={`w-full h-full object-contain ${option.imageClassName || ''}`} 
                            fallbackColor={option.color}
                            fallbackLabel={option.label}
                        />
                     </div>
                  ) : option.color ? (
                     <div className="w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg text-white shadow-md border border-white/10 flex-shrink-0" style={{ backgroundColor: option.color }}>
                        {option.label[0]}
                     </div>
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-gray-700 flex items-center justify-center font-bold text-lg text-gray-400 border border-gray-600 flex-shrink-0">
                        {option.label[0]}
                    </div>
                  )}
                  
                  <div className="flex flex-col items-start gap-0.5 overflow-hidden flex-1">
                    <div className={`text-base font-bold leading-none truncate w-full ${value === option.id ? 'text-[#ac88d6]' : 'text-gray-200'}`}>
                        {option.label}
                    </div>
                    {option.subLabel && <div className="text-xs text-gray-500 uppercase tracking-wide font-medium bg-black/20 px-1.5 py-0.5 rounded truncate max-w-full">{option.subLabel}</div>}
                  </div>

                  {value === option.id && <Check className="w-5 h-5 text-[#ac88d6] ml-auto flex-shrink-0" />}
                </button>
              ))
            ) : (
                <div className="p-8 text-center text-gray-500 text-sm flex flex-col items-center">
                    <Search className="w-8 h-8 mb-2 opacity-20" />
                    No se encontraron resultados
                </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
