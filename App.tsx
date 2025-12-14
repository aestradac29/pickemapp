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
import { DatabaseManager } from './components/DatabaseManager'; // Import nuevo
import { ViewState, UserPrediction, User } from './types';
import { Menu, X, Share2, LogOut, ChevronLeft, Loader2, ShieldAlert } from 'lucide-react';
import { authService } from './services/authService';
import { dataService } from './services/dataService';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>(ViewState.LOGIN);
  const [predictions, setPredictions] = useState<UserPrediction[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Auth State
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('user'); // Nuevo estado para el rol
  
  const [selectedSplit, setSelectedSplit] = useState<string | null>(() => {
    return localStorage.getItem('selectedSplit');
  });

  // Recovery State
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);

  // Leaderboard Data
  const [leaderboardUsers, setLeaderboardUsers] = useState<User[]>([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);

  // Admin Check - Dynamic based on Database Role
  const isAdmin = userRole === 'admin';

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
                 <Leaderboard users={leaderboardUsers} />
             )}
           </div>
        );
      default:
        return <Dashboard onChangeView={setView} currentUser={currentUser} isAdmin={isAdmin} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0a1428] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1a2c4e] via-[#0a1428] to-[#0a1428] text-[#f0e6d2] font-sans">
      
      {/* Navbar */}
      {currentUser && !showPasswordResetModal && view !== ViewState.LOGIN && (
        <nav className="sticky top-0 z-50 bg-[#091428]/90 backdrop-blur-md border-b border-hextech-500/30">
          <div className="max-w-5xl mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              <div 
                className={`flex items-center gap-3 ${selectedSplit ? 'cursor-pointer' : ''}`} 
                onClick={() => selectedSplit && setView(ViewState.DASHBOARD)}
              >
                <div className="w-8 h-8 bg-gradient-to-br from-hextech-500 to-hextech-900 rounded rotate-45 flex items-center justify-center border border-hextech-400">
                  <span className="text-white -rotate-45 font-bold text-sm">L</span>
                </div>
                <div className="flex flex-col">
                    <h1 className="font-bold text-lg tracking-wide text-hextech-400 leading-none hidden sm:block">
                        PICK'EM <span className="text-hextech-500">PRO</span>
                    </h1>
                    {selectedSplit && (
                        <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">{selectedSplit}</span>
                    )}
                </div>
              </div>

              {/* Desktop Nav Actions */}
              <div className="hidden md:flex items-center gap-4">
                {view !== ViewState.DASHBOARD && view !== ViewState.SPLIT_SELECTION && (
                    <button 
                        onClick={() => setView(ViewState.DASHBOARD)}
                        className="text-gray-400 hover:text-[#c8aa6e] flex items-center gap-1 text-sm font-medium"
                    >
                        <ChevronLeft className="w-4 h-4" /> Volver al Inicio
                    </button>
                )}
                
                {selectedSplit && view !== ViewState.SPLIT_SELECTION && (
                   <button 
                        onClick={() => setView(ViewState.SPLIT_SELECTION)}
                        className="text-xs border border-gray-700 rounded px-2 py-1 text-gray-400 hover:text-white hover:border-gray-500 transition-colors"
                   >
                        Cambiar Split
                   </button>
                )}

                <div className="h-6 w-px bg-gray-700 mx-2"></div>
                <div className="flex items-center gap-3">
                    <img 
                        src={`https://ui-avatars.com/api/?name=${currentUser}&background=random`} 
                        alt="Avatar" 
                        className={`w-9 h-9 rounded-full border-2 ${isAdmin ? 'border-red-500' : 'border-gray-600'}`}
                    />
                    <div className="flex flex-col items-start justify-center">
                        <span className="text-sm font-bold text-hextech-300 leading-none">{currentUser}</span>
                        {isAdmin && (
                            <div className="flex items-center gap-1 mt-0.5 bg-red-900/30 px-1.5 py-0.5 rounded border border-red-500/30">
                                <ShieldAlert className="w-3 h-3 text-red-400" />
                                <span className="text-[9px] font-bold text-red-400 uppercase tracking-widest leading-none">Admin</span>
                            </div>
                        )}
                    </div>
                </div>
                <button 
                    onClick={handleLogout}
                    className="p-2 text-gray-400 hover:text-red-400 transition-colors ml-2"
                    title="Cerrar Sesión"
                >
                    <LogOut className="w-5 h-5" />
                </button>
              </div>

              {/* Mobile Menu Button */}
              <div className="md:hidden">
                <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-hextech-400 p-2">
                  {isMenuOpen ? <X /> : <Menu />}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Menu Dropdown */}
          {isMenuOpen && (
             <div className="md:hidden bg-[#091428] border-b border-gray-800">
                <div className="px-4 py-2 space-y-1">
                    <div className="px-3 py-2 text-sm font-bold border-b border-gray-800 mb-2 flex items-center gap-2">
                        <span className="text-gray-500">Sesión:</span> 
                        <span className="text-hextech-300">{currentUser}</span>
                        {isAdmin && <span className="text-[10px] bg-red-900/50 text-red-300 px-1.5 rounded border border-red-500/50">ADMIN</span>}
                    </div>
                    {selectedSplit && (
                        <>
                            <button onClick={() => { setView(ViewState.DASHBOARD); setIsMenuOpen(false); }} className="block w-full text-left py-2 px-3 text-gray-300 hover:bg-gray-800 rounded">Inicio</button>
                            <button onClick={() => { setView(ViewState.SPLIT_SELECTION); setIsMenuOpen(false); }} className="block w-full text-left py-2 px-3 text-gray-300 hover:bg-gray-800 rounded">Cambiar Split</button>
                        </>
                    )}
                    <button onClick={handleLogout} className="block w-full text-left py-2 px-3 text-red-400 hover:bg-gray-800 rounded">Cerrar Sesión</button>
                </div>
             </div>
          )}
        </nav>
      )}

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {renderContent()}
      </main>

      {/* Password Reset Modal */}
      {showPasswordResetModal && (
          <PasswordResetModal 
            onClose={() => setShowPasswordResetModal(false)}
            onSuccess={handlePasswordSuccess}
          />
      )}
    </div>
  );
};

export default App;