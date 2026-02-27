
import React, { useState, useEffect } from 'react';
import { MATCHES, USERS } from './constants';
import { MatchCard } from './components/MatchCard';
import { Leaderboard } from './components/Leaderboard';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { RankingView } from './components/RankingView';
import { CrystalBall } from './components/CrystalBall';
import { FantasyView } from './components/FantasyView';
import { MatchdayView } from './components/MatchdayView';
import { PlayoffsView } from './components/PlayoffsView';
import { SplitSelection } from './components/SplitSelection';
import { PasswordResetModal } from './components/PasswordResetModal';
import { DatabaseManager } from './components/DatabaseManager'; 
import { ProfileView } from './components/ProfileView'; 
import { TeamsView } from './components/TeamsView';
import { OfficialStandings } from './components/OfficialStandings';
import { HallOfFame } from './components/HallOfFame'; // Import nuevo
import { ViewState, UserPrediction, User } from './types';
import { Menu, X, Share2, LogOut, ChevronLeft, Loader2, ShieldAlert, ArrowRightLeft, Download } from 'lucide-react';
import { authService } from './services/authService';
import { dataService } from './services/dataService';
import { notificationService } from './services/notificationService';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>(ViewState.LOGIN);
  const [predictions, setPredictions] = useState<UserPrediction[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Auth State
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserAvatar, setCurrentUserAvatar] = useState<string | null>(null); // New state for live avatar update
  const [userRole, setUserRole] = useState<string>('user'); // Nuevo estado para el rol
  
  // Navigation State
  const [viewingProfileId, setViewingProfileId] = useState<string | null>(null); // ID of the profile being viewed
  
  const [selectedSplit, setSelectedSplit] = useState<string | null>(() => {
    return localStorage.getItem('selectedSplit');
  });

  // Recovery State
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);

  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  // Leaderboard Data
  const [leaderboardUsers, setLeaderboardUsers] = useState<User[]>([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);

  // Admin Check - Dynamic based on Database Role
  const isAdmin = userRole === 'admin';

  // --- PWA INSTALL LISTENER ---
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Show the install prompt
      deferredPrompt.prompt();
      
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to the install prompt: ${outcome}`);
      
      // We've used the prompt, and can't use it again, throw it away
      setDeferredPrompt(null);
    } else {
      // Show manual install guide if native prompt is not available
      setShowInstallGuide(true);
    }
  };

  // --- AUTH INITIALIZATION & LISTENER ---
  useEffect(() => {
    // 1. Initial Check
    const checkUser = async () => {
        const user = await authService.getCurrentUser();
        if (user) {
            handleUserAuthenticated(user);
        } else {
            setView(ViewState.LOGIN);
        }
    };
    checkUser();

    // 2. Subscribe to Auth Changes (Login/Logout)
    const unsubscribe = authService.onAuthStateChange((user) => {
        if (user) {
            handleUserAuthenticated(user);
        } else {
            // Logout
            setCurrentUser(null);
            setCurrentUserId(null);
            setCurrentUserAvatar(null);
            setViewingProfileId(null);
            setUserRole('user');
            setPredictions([]);
            setView(ViewState.LOGIN);
        }
    });

    return () => unsubscribe();
  }, []);

  // --- LEADERBOARD DATA LOADER ---
  useEffect(() => {
    if (view === ViewState.RESULTS) {
        const fetchLeaderboard = async () => {
            setIsLoadingLeaderboard(true);
            try {
                const users = await dataService.getAllUsers();
                setLeaderboardUsers(users);
            } catch (e) {
                console.error("Error loading leaderboard", e);
            } finally {
                setIsLoadingLeaderboard(false);
            }
        }
        fetchLeaderboard();
    }
  }, [view]);

  const handleUserAuthenticated = (user: any) => {
      // Si ya tenemos un usuario seteado manualmente (por el registro), intentamos no sobrescribirlo con 'Invocador' si es posible
      // Pero el listener es la fuente de verdad para el ID
      setCurrentUser(prev => {
        const newName = user.profile?.username || 'Invocador';
        // Si el nuevo nombre es Invocador pero ya tenemos uno real, mantenemos el real
        if (newName === 'Invocador' && prev && prev !== 'Invocador') return prev;
        return newName;
      });
      setCurrentUserId(user.id);
      setCurrentUserAvatar(user.profile?.avatar_url);
      setUserRole(user.role || 'user'); // Set Role from DB
      loadUserData(user.id);

      // Smart Redirect
      if (view === ViewState.LOGIN) {
          if (selectedSplit) {
              setView(ViewState.DASHBOARD);
          } else {
              setView(ViewState.SPLIT_SELECTION);
          }
      }
  };

  const loadUserData = async (userId: string) => {
      try {
        const preds = await dataService.getUserPredictions(userId);
        setPredictions(preds);
      } catch (e) {
          console.error("Error loading predictions", e);
      }
  };

  const refreshPredictions = async () => {
    if (currentUserId) {
        const preds = await dataService.getUserPredictions(currentUserId);
        setPredictions(preds);
    }
  };

  const handleLogin = (username: string) => {
    // Actualizar nombre de usuario inmediatamente para evitar race conditions en registro
    setCurrentUser(username);
    
    // Forzar navegación si seguimos en Login
    if (view === ViewState.LOGIN) {
        if (selectedSplit) {
            setView(ViewState.DASHBOARD);
        } else {
            setView(ViewState.SPLIT_SELECTION);
        }
    }
  };

  const handleSplitSelect = (splitName: string) => {
    setSelectedSplit(splitName);
    localStorage.setItem('selectedSplit', splitName); 
    setView(ViewState.DASHBOARD);
  };

  const handleLogout = async () => {
    await authService.signOut();
    setIsMenuOpen(false);
  };

  const handlePasswordSuccess = () => {
      setShowPasswordResetModal(false);
  };

  const handleViewProfile = (userId: string) => {
      setViewingProfileId(userId);
      setView(ViewState.PROFILE);
  };

  const handleSelectWinner = async (matchId: string, teamId: string) => {
    setPredictions(prev => {
      const existing = prev.find(p => p.matchId === matchId);
      if (existing) {
        return prev.map(p => p.matchId === matchId ? { ...p, predictedWinnerId: teamId } : p);
      }
      return [...prev, { matchId, predictedWinnerId: teamId }];
    });
  };

  const renderContent = () => {
    switch (view) {
      case ViewState.LOGIN:
        return <Login onLogin={handleLogin} />;
      case ViewState.SPLIT_SELECTION:
        return <SplitSelection onSelect={handleSplitSelect} />;
      case ViewState.DASHBOARD:
        return <Dashboard onChangeView={setView} currentUser={currentUser} isAdmin={isAdmin} />;
      case ViewState.RANKING:
        return <RankingView currentUserId={currentUserId} isAdmin={isAdmin} />;
      case ViewState.CRYSTAL_BALL:
        return <CrystalBall currentUserId={currentUserId} isAdmin={isAdmin} />;
      case ViewState.FANTASY:
        return <FantasyView currentUserId={currentUserId} isAdmin={isAdmin} />;
      case ViewState.OFFICIAL_STANDINGS:
        return <OfficialStandings />;
      case ViewState.PROFILE:
        return (
            <ProfileView 
                viewingUserId={viewingProfileId || currentUserId} 
                sessionUserId={currentUserId}
            />
        );
      case ViewState.TEAMS:
        return <TeamsView />;
      case ViewState.HALL_OF_FAME: // Nuevo caso
        return <HallOfFame />;
      case ViewState.DB_MANAGER:
         // Protect route
         if (!isAdmin) return <Dashboard onChangeView={setView} currentUser={currentUser} isAdmin={isAdmin} />;
         return <DatabaseManager />;
      case ViewState.MATCHDAY:
        return (
            <MatchdayView 
                currentUserId={currentUserId} 
                initialPredictions={predictions} 
                isAdmin={isAdmin}
                onPredictionsSaved={refreshPredictions}
            />
        );
      case ViewState.PLAYOFFS:
        return (
            <PlayoffsView 
                currentUserId={currentUserId} 
                initialPredictions={predictions} 
                isAdmin={isAdmin}
                onPredictionsSaved={refreshPredictions}
            />
        );
      case ViewState.RESULTS:
        return (
           <div className="animate-in fade-in slide-in-from-bottom-4">
             <h2 className="text-2xl font-bold text-[#c8aa6e] mb-6 text-center uppercase">Resultados y Ranking</h2>
             {isLoadingLeaderboard ? (
                 <div className="flex justify-center py-20">
                     <Loader2 className="w-10 h-10 text-[#c8aa6e] animate-spin" />
                 </div>
             ) : (
                 <Leaderboard 
                    users={leaderboardUsers} 
                    onViewProfile={handleViewProfile}
                 />
             )}
           </div>
        );
      default:
        return <Dashboard onChangeView={setView} currentUser={currentUser} isAdmin={isAdmin} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0a1428] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1a2c4e] via-[#0a1428] to-[#0a1428] text-[#f0e6d2] font-sans flex flex-col">
      
      {/* Navbar */}
      {currentUser && !showPasswordResetModal && view !== ViewState.LOGIN && (
        <nav className="sticky top-0 z-50 bg-[#091428]/90 backdrop-blur-md border-b border-hextech-500/30 shadow-lg">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              
              {/* Logo & Branding - Clickable to Home */}
              <div 
                className={`flex items-center gap-3 cursor-pointer group`} 
                onClick={() => selectedSplit && setView(ViewState.DASHBOARD)}
              >
                <div className="w-9 h-9 bg-gradient-to-br from-hextech-500 to-hextech-900 rounded rotate-45 flex items-center justify-center border border-hextech-400 shadow-md group-hover:scale-105 transition-transform">
                  <span className="text-white -rotate-45 font-bold text-sm">P</span>
                </div>
                <div className="flex flex-col">
                    <h1 className="font-bold text-lg tracking-wide text-hextech-400 leading-none">
                        PICK'EM <span className="text-hextech-500">PRO</span>
                    </h1>
                    {selectedSplit && (
                        <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest group-hover:text-hextech-400 transition-colors">
                            {selectedSplit}
                        </span>
                    )}
                </div>
              </div>

              {/* Desktop Nav Actions */}
              <div className="hidden md:flex items-center gap-4">
                {view !== ViewState.DASHBOARD && view !== ViewState.SPLIT_SELECTION && (
                    <button 
                        onClick={() => setView(ViewState.DASHBOARD)}
                        className="text-gray-400 hover:text-[#c8aa6e] flex items-center gap-1 text-sm font-medium transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" /> Volver al Inicio
                    </button>
                )}
                
                {selectedSplit && view !== ViewState.SPLIT_SELECTION && (
                   <button 
                        onClick={() => setView(ViewState.SPLIT_SELECTION)}
                        className="text-xs border border-gray-700 bg-gray-800/50 rounded-full px-3 py-1.5 text-gray-300 hover:text-white hover:border-[#c8aa6e] hover:bg-[#0a1428] transition-all flex items-center gap-1.5"
                   >
                        <ArrowRightLeft className="w-3 h-3" />
                        Cambiar Split
                   </button>
                )}

                <button 
                    onClick={handleInstallClick}
                    className="text-xs border border-[#c8aa6e] bg-[#c8aa6e]/10 rounded-full px-3 py-1.5 text-[#c8aa6e] hover:bg-[#c8aa6e]/20 transition-all font-bold flex items-center gap-1.5"
                    title="Instalar App"
                >
                    <Download className="w-3 h-3" />
                    Instalar App
                </button>

                <div className="h-6 w-px bg-gray-700 mx-2"></div>
                
                {/* Profile Clickable Area */}
                <button 
                    onClick={() => { setViewingProfileId(currentUserId); setView(ViewState.PROFILE); }}
                    className="flex items-center gap-3 hover:bg-gray-800/50 p-1 pr-3 rounded-full transition-colors group"
                >
                    <img 
                        src={currentUserAvatar || `https://ui-avatars.com/api/?name=${currentUser}&background=random`} 
                        alt="Avatar" 
                        className={`w-9 h-9 rounded-full border-2 group-hover:border-[#c8aa6e] transition-colors ${isAdmin ? 'border-red-500' : 'border-gray-600'}`}
                    />
                    <div className="flex flex-col items-start justify-center">
                        <span className="text-sm font-bold text-hextech-300 leading-none group-hover:text-[#c8aa6e] transition-colors max-w-[100px] truncate">{currentUser}</span>
                        {isAdmin && (
                            <div className="flex items-center gap-1 mt-0.5 bg-red-900/30 px-1.5 py-0.5 rounded border border-red-500/30">
                                <ShieldAlert className="w-3 h-3 text-red-400" />
                                <span className="text-[9px] font-bold text-red-400 uppercase tracking-widest leading-none">Admin</span>
                            </div>
                        )}
                    </div>
                </button>

                <button 
                    onClick={handleLogout}
                    className="p-2 text-gray-400 hover:text-red-400 transition-colors ml-2 hover:bg-red-900/20 rounded-full"
                    title="Cerrar Sesión"
                >
                    <LogOut className="w-5 h-5" />
                </button>
              </div>

              {/* Mobile Menu Button */}
              <div className="md:hidden flex items-center gap-3">
                 <button 
                      onClick={handleInstallClick}
                      className="p-1.5 text-[#c8aa6e] bg-[#c8aa6e]/10 border border-[#c8aa6e]/30 rounded-lg hover:bg-[#c8aa6e]/20 transition-colors flex items-center gap-1"
                      title="Instalar App"
                 >
                      <Download className="w-4 h-4" />
                      <span className="text-[10px] font-bold uppercase">App</span>
                 </button>

                 {/* Quick Change Split for Mobile (Icon Only) */}
                 {selectedSplit && view !== ViewState.SPLIT_SELECTION && (
                    <button 
                        onClick={() => setView(ViewState.SPLIT_SELECTION)}
                        className="p-2 text-gray-400 hover:text-[#c8aa6e]"
                        title="Cambiar Split"
                    >
                        <ArrowRightLeft className="w-5 h-5" />
                    </button>
                 )}
                 <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-hextech-400 p-2 hover:bg-gray-800 rounded-lg transition-colors">
                   {isMenuOpen ? <X /> : <Menu />}
                 </button>
              </div>
            </div>
          </div>

          {/* Mobile Menu Dropdown */}
          {isMenuOpen && (
             <div className="md:hidden bg-[#091428] border-b border-gray-800 animate-in slide-in-from-top-2">
                <div className="px-4 py-2 space-y-1">
                    <button 
                        onClick={() => { setViewingProfileId(currentUserId); setView(ViewState.PROFILE); setIsMenuOpen(false); }}
                        className="w-full px-3 py-3 text-sm font-bold border-b border-gray-800 mb-2 flex items-center gap-3 hover:bg-gray-800 rounded transition-colors"
                    >
                        <img 
                            src={currentUserAvatar || `https://ui-avatars.com/api/?name=${currentUser}&background=random`} 
                            className="w-8 h-8 rounded-full border border-gray-600"
                        />
                        <div className="flex flex-col items-start">
                            <span className="text-hextech-300">{currentUser}</span>
                            {isAdmin && <span className="text-[10px] bg-red-900/50 text-red-300 px-1.5 rounded border border-red-500/50 uppercase">Admin</span>}
                        </div>
                    </button>
                    {selectedSplit && (
                        <>
                            <button onClick={() => { setView(ViewState.DASHBOARD); setIsMenuOpen(false); }} className="block w-full text-left py-3 px-3 text-gray-300 hover:bg-gray-800 rounded font-medium">Inicio</button>
                            <button onClick={() => { setView(ViewState.SPLIT_SELECTION); setIsMenuOpen(false); }} className="block w-full text-left py-3 px-3 text-gray-300 hover:bg-gray-800 rounded font-medium flex items-center gap-2">
                                <ArrowRightLeft className="w-4 h-4" /> Cambiar Split
                            </button>
                        </>
                    )}
                    <button onClick={handleLogout} className="block w-full text-left py-3 px-3 text-red-400 hover:bg-red-900/20 rounded font-medium flex items-center gap-2 mt-2 border-t border-gray-800">
                        <LogOut className="w-4 h-4" /> Cerrar Sesión
                    </button>
                </div>
             </div>
          )}
        </nav>
      )}

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 py-6 flex-1 w-full">
        {renderContent()}
      </main>

      {/* Footer */}
      <footer className="w-full bg-[#050a14] border-t border-white/5 py-8 mt-auto backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 text-center">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-medium">
                Pick’em Pro es una plataforma independiente de predicciones de esports.
            </p>
            <p className="text-[10px] text-gray-600 mt-1">
                No está afiliada, patrocinada ni respaldada por Riot Games ni por ninguna de sus competiciones o equipos.
            </p>
        </div>
      </footer>

      {/* Password Reset Modal */}
      {showPasswordResetModal && (
          <PasswordResetModal 
            onClose={() => setShowPasswordResetModal(false)}
            onSuccess={handlePasswordSuccess}
          />
      )}

      {/* Install Guide Modal */}
      {showInstallGuide && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0a1428] border border-hextech-500/30 rounded-xl p-6 max-w-sm w-full shadow-2xl relative">
            <button 
              onClick={() => setShowInstallGuide(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold text-[#c8aa6e] mb-4 flex items-center gap-2">
              <Download className="w-5 h-5" /> Instalar App
            </h3>
            <div className="space-y-4 text-sm text-gray-300">
              <p>Para instalar la aplicación manualmente en tu dispositivo:</p>
              <div className="bg-[#091428] p-3 rounded-lg border border-gray-800">
                <p className="font-bold text-white mb-1">📱 En iOS (Safari):</p>
                <ol className="list-decimal list-inside space-y-1 ml-1">
                  <li>Toca el botón <strong>Compartir</strong> <Share2 className="w-3 h-3 inline" /> en la barra inferior.</li>
                  <li>Selecciona <strong>Añadir a la pantalla de inicio</strong>.</li>
                </ol>
              </div>
              <div className="bg-[#091428] p-3 rounded-lg border border-gray-800">
                <p className="font-bold text-white mb-1">🤖 En Android (Chrome):</p>
                <ol className="list-decimal list-inside space-y-1 ml-1">
                  <li>Toca el menú de <strong>3 puntos</strong> arriba a la derecha.</li>
                  <li>Selecciona <strong>Instalar aplicación</strong> o <strong>Añadir a la pantalla de inicio</strong>.</li>
                </ol>
              </div>
              <div className="bg-[#091428] p-3 rounded-lg border border-gray-800">
                <p className="font-bold text-white mb-1">💻 En PC (Chrome/Edge):</p>
                <ol className="list-decimal list-inside space-y-1 ml-1">
                  <li>Haz clic en el icono de <strong>Instalar</strong> en la barra de direcciones (arriba a la derecha).</li>
                </ol>
              </div>
            </div>
            <button 
              onClick={() => setShowInstallGuide(false)}
              className="w-full mt-6 bg-[#c8aa6e] text-[#0a1428] font-bold py-2 rounded hover:bg-[#d4b87e] transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
