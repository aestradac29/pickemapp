import React, { useRef, useEffect } from 'react';
import { Lock, EyeOff } from 'lucide-react';

interface DaySelectorProps {
    days: number[];
    currentDay: number;
    isEditMode: boolean;
    checkUnsaved: (day: number) => boolean;
    onSelect: (day: number) => void;
    unlockedDayLimit?: number;
    activeDays?: number[];
    closedDays?: number[];
    openedDays?: number[];
    labelPrefix?: string;
    savedDays?: Set<number>;
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
    labelPrefix = 'J',
    savedDays,
}) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll al botón activo (centrado)
    useEffect(() => {
        if (!scrollRef.current) return;
        const idx = days.indexOf(currentDay);
        if (idx === -1) return;
        const btn = scrollRef.current.children[idx] as HTMLElement;
        if (btn) {
            const left = btn.offsetLeft - scrollRef.current.clientWidth / 2 + btn.clientWidth / 2;
            scrollRef.current.scrollTo({ left, behavior: 'smooth' });
        }
    }, [currentDay, days]);

    const fromColor = isEditMode ? 'from-red-950' : 'from-[#0a1428]';

    return (
        <div className="relative w-full">
            {/* Fade lateral izquierdo */}
            <div className={`absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r ${fromColor} to-transparent z-10 pointer-events-none`} />

            {/* Contenedor: centrado cuando caben, scroll cuando no */}
            <div
                ref={scrollRef}
                className="flex justify-center overflow-x-auto gap-2 py-1.5 px-8 no-scrollbar scroll-smooth"
            >
                {days.map(day => {
                    const isVisible          = activeDays ? activeDays.includes(day) : day === 1;
                    const isManuallyClosed   = closedDays?.includes(day) ?? false;
                    const isExplicitlyOpened = openedDays?.includes(day) ?? false;
                    const isHiddenForUser    = !isEditMode && !isVisible;
                    const showLock           = isVisible && isManuallyClosed && !isExplicitlyOpened;
                    const isActive           = currentDay === day;
                    const hasUnsaved         = checkUnsaved(day);
                    const isSaved            = savedDays?.has(day) ?? false;

                    return (
                        <button
                            key={day}
                            onClick={() => !isHiddenForUser && onSelect(day)}
                            disabled={isHiddenForUser}
                            className={`
                                relative flex-shrink-0 flex flex-col items-center justify-center
                                w-12 h-12 rounded-xl border transition-all duration-200
                                ${isActive
                                    ? 'bg-[#c8aa6e] border-[#c8aa6e] text-[#050d1a] scale-110 shadow-[0_0_16px_rgba(200,170,110,0.4)] z-10 font-black'
                                    : isHiddenForUser
                                    ? 'bg-[#050d1a] border-gray-800/40 text-gray-700 opacity-40 cursor-default'
                                    : 'bg-[#060f1e] border-gray-800 text-gray-400 hover:border-gray-600 hover:text-white hover:bg-[#0a1428] cursor-pointer'}
                            `}
                        >
                            {!isVisible && isEditMode ? (
                                <EyeOff className={`w-4 h-4 ${isActive ? 'text-[#050d1a]' : 'text-gray-600'}`} />
                            ) : showLock ? (
                                <Lock className={`w-4 h-4 ${isActive ? 'text-[#050d1a]' : 'text-gray-600'}`} />
                            ) : (
                                <>
                                    <span className={`text-[7px] uppercase font-bold tracking-tight leading-none mb-0.5 ${isActive ? 'opacity-60' : 'opacity-40'}`}>
                                        {labelPrefix}
                                    </span>
                                    <span className="text-sm font-bold leading-none">{day}</span>
                                </>
                            )}

                            {/* Indicador de estado de picks */}
                            {hasUnsaved && (
                                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#c8aa6e] rounded-full border-2 border-[#050d1a] animate-pulse" title="Cambios sin guardar" />
                            )}
                            {!hasUnsaved && isSaved && (
                                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-[#050d1a]" title="Picks guardados" />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Fade lateral derecho */}
            <div className={`absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l ${fromColor} to-transparent z-10 pointer-events-none`} />
        </div>
    );
};