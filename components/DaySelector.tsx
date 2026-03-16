import React, { useRef, useEffect } from 'react';
import { Lock, EyeOff } from 'lucide-react';

interface DaySelectorProps {
    days: number[];
    currentDay: number;
    isEditMode: boolean;
    checkUnsaved: (day: number) => boolean;
    onSelect: (day: number) => void;
    unlockedDayLimit?: number; 
    activeDays?: number[]; // visibleDays
    closedDays?: number[]; // manuallyClosedDays
    openedDays?: number[]; // explicitlyOpenedDays
    labelPrefix?: string; // New prop for customization
}

export const DaySelector: React.FC<DaySelectorProps> = ({ 
    days, 
    currentDay, 
    isEditMode, 
    checkUnsaved,
    onSelect,
    activeDays,
    closedDays,
    openedDays,
    labelPrefix = "Jornada"
}) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Center selected day automatically
    useEffect(() => {
        if (scrollContainerRef.current) {
            const button = scrollContainerRef.current.children[currentDay - 1] as HTMLElement;
            if (button) {
                const scrollLeft = button.offsetLeft - (scrollContainerRef.current.clientWidth / 2) + (button.clientWidth / 2);
                scrollContainerRef.current.scrollTo({ left: scrollLeft, behavior: 'smooth' });
            }
        }
    }, [currentDay]);

    return (
        <div className="relative max-w-sm mx-auto">
            <div className={`absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r to-transparent z-10 pointer-events-none ${isEditMode ? 'from-red-950' : 'from-[#0a1428]'}`}></div>
            <div 
                ref={scrollContainerRef}
                className="flex overflow-x-auto gap-2 py-2 px-8 no-scrollbar scroll-smooth snap-x"
            >
                {days.map((day) => {
                    // Logic for display icons
                    const isVisible = activeDays ? activeDays.includes(day) : day === 1;
                    const isManuallyClosed = closedDays ? closedDays.includes(day) : false;
                    const isExplicitlyOpened = openedDays ? openedDays.includes(day) : false;
                    
                    // If Admin: See icons to know state.
                    // If User: If Hidden -> EyeOff (or dimmed), if Closed -> Lock.
                    
                    // Priority: Hidden > Closed > Open
                    const showHiddenIcon = !isVisible;
                    const showLockIcon = isVisible && isManuallyClosed && !isExplicitlyOpened;
                    
                    // User view specifics
                    const isHiddenForUser = !isEditMode && !isVisible;
                    
                    const hasUnsaved = checkUnsaved(day);
                    
                    return (
                        <button
                            key={day}
                            onClick={() => onSelect(day)}
                            className={`
                                flex-shrink-0 w-12 h-12 rounded-lg flex flex-col items-center justify-center border snap-center transition-all duration-300 relative group
                                ${currentDay === day 
                                    ? 'bg-[#c8aa6e] border-[#c8aa6e] text-[#0a1428] shadow-[0_0_15px_rgba(200,170,110,0.4)] scale-110 z-10' 
                                    : isHiddenForUser
                                        ? 'bg-[#050a14] border-gray-800 text-gray-700 opacity-60' 
                                        : 'bg-[#0f1d36] border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200'
                                }
                            `}
                        >
                            {showHiddenIcon ? (
                                <EyeOff className={`w-5 h-5 ${currentDay === day ? 'text-[#0a1428]' : 'text-gray-600'}`} />
                            ) : showLockIcon ? (
                                <Lock className={`w-5 h-5 ${currentDay === day ? 'text-[#0a1428]' : 'text-gray-600'}`} />
                            ) : (
                                <>
                                    <span className="text-[8px] uppercase font-bold tracking-tighter opacity-70 leading-tight">{labelPrefix}</span>
                                    <span className="text-lg font-bold leading-none">{day}</span>
                                    
                                    {/* Hextech Style Indicator for Unsaved Changes */}
                                    {hasUnsaved && (
                                        <div className="absolute -top-1 -right-1 z-20">
                                            <div className="relative">
                                                <div className="w-3 h-3 bg-[#c8aa6e] rotate-45 shadow-[0_0_8px_#c8aa6e] border border-white"></div>
                                                <div className="absolute inset-0 bg-[#c8aa6e] rotate-45 animate-ping opacity-75"></div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </button>
                    );
                })}
            </div>
            <div className={`absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l to-transparent z-10 pointer-events-none ${isEditMode ? 'from-red-950' : 'from-[#0a1428]'}`}></div>
        </div>
    );
};