import React, { useState, useEffect } from 'react';
import { Notification } from '../types';
import { dataService } from '../services/dataService';
import { X, Info, CheckCircle2, AlertTriangle, AlertCircle, Bell, ChevronDown } from 'lucide-react';

export const NotificationSystem: React.FC = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [visibleNotifications, setVisibleNotifications] = useState<Notification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [hasUnread, setHasUnread] = useState(false);

    useEffect(() => {
        const loadNotifications = async () => {
            try {
                const all = await dataService.getNotifications();
                const dismissed = JSON.parse(localStorage.getItem('dismissed_notifications') || '[]');
                
                // Filter only active and not dismissed
                const active = all.filter(n => n.active && !dismissed.includes(n.id));
                
                setNotifications(all);
                setVisibleNotifications(active);
                
                if (active.length > 0) {
                    setHasUnread(true);
                    // Auto-open if there are unread notifications
                    setIsOpen(true);
                }
            } catch (e) {
                console.error("Failed to load notifications", e);
            }
        };

        loadNotifications();
        
        // Poll every 2 minutes
        const interval = setInterval(loadNotifications, 2 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const dismiss = (id: string) => {
        const dismissed = JSON.parse(localStorage.getItem('dismissed_notifications') || '[]');
        if (!dismissed.includes(id)) {
            dismissed.push(id);
            localStorage.setItem('dismissed_notifications', JSON.stringify(dismissed));
        }
        
        const updated = visibleNotifications.filter(n => n.id !== id);
        setVisibleNotifications(updated);
        
        if (updated.length === 0) {
            setHasUnread(false);
            setIsOpen(false);
        }
    };

    const toggleOpen = () => {
        setIsOpen(!isOpen);
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'success': return <CheckCircle2 className="w-5 h-5 text-green-400" />;
            case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
            case 'error': return <AlertCircle className="w-5 h-5 text-red-400" />;
            default: return <Info className="w-5 h-5 text-blue-400" />;
        }
    };

    const getBgColor = (type: string) => {
        switch (type) {
            case 'success': return 'bg-green-950/90 border-green-500/50 text-green-100';
            case 'warning': return 'bg-yellow-950/90 border-yellow-500/50 text-yellow-100';
            case 'error': return 'bg-red-950/90 border-red-500/50 text-red-100';
            default: return 'bg-blue-950/90 border-blue-500/50 text-blue-100';
        }
    };

    if (visibleNotifications.length === 0) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2 max-w-sm w-full pointer-events-none">
            
            {/* Floating Bell (Only visible when minimized) */}
            {!isOpen && hasUnread && (
                <button 
                    onClick={toggleOpen}
                    className="pointer-events-auto bg-red-600 text-white p-3 rounded-full shadow-lg hover:bg-red-500 transition-all animate-bounce flex items-center justify-center relative group"
                >
                    <Bell className="w-6 h-6" />
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-white text-red-600 text-xs font-bold rounded-full flex items-center justify-center border-2 border-red-600">
                        {visibleNotifications.length}
                    </span>
                    <span className="absolute right-full mr-2 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        Ver Notificaciones
                    </span>
                </button>
            )}

            {/* Notification List Container */}
            {isOpen && (
                <div className="pointer-events-auto w-full flex flex-col gap-2 animate-in slide-in-from-right-10 fade-in duration-300">
                    <div className="flex justify-between items-center bg-black/80 backdrop-blur-md p-2 rounded-t-lg border-b border-gray-700">
                        <span className="text-xs font-bold text-gray-400 uppercase ml-2">
                            {visibleNotifications.length} Notificaciones
                        </span>
                        <button 
                            onClick={toggleOpen}
                            className="text-gray-400 hover:text-white p-1 rounded hover:bg-white/10 transition-colors"
                            title="Minimizar"
                        >
                            <ChevronDown className="w-4 h-4" />
                        </button>
                    </div>
                    
                    <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto pr-1">
                        {visibleNotifications.map(n => (
                            <div 
                                key={n.id} 
                                className={`p-4 rounded-lg shadow-xl border backdrop-blur-md flex items-start gap-3 relative transition-all hover:scale-[1.02] ${getBgColor(n.type)}`}
                            >
                                <div className="mt-0.5 flex-shrink-0">
                                    {getIcon(n.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-sm mb-1 leading-tight">{n.title}</h4>
                                    <p className="text-xs opacity-90 leading-relaxed whitespace-pre-wrap">{n.message}</p>
                                    <span className="text-[10px] opacity-50 mt-2 block font-mono">
                                        {new Date(n.createdAt).toLocaleDateString()} {new Date(n.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </span>
                                </div>
                                <button 
                                    onClick={() => dismiss(n.id)}
                                    className="text-white/50 hover:text-white transition-colors p-1 hover:bg-white/10 rounded"
                                    title="Marcar como leída"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
