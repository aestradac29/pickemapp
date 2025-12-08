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
import { SplitSelection } from './components/SplitSelection';
import { ViewState, UserPrediction } from './types';
import { Menu, X, Share2, LogOut, ChevronLeft, KeyRound, Loader2, Save } from 'lucide-react';
import { authService } from './services/authService';
import { dataService } from './services/dataService';
import { supabase } from './lib/supabase';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>(ViewState.LOGIN);
  const [predictions, setPredictions] = useState<UserPrediction[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Auth State
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedSplit, setSelectedSplit] = useState<string | null>(null);

  // Recovery State
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // --- SUPABASE SESSION HANDLER ---
  useEffect(() => {
    const checkUser = async () => {
      try {
        const user = await authService.getCurrentUser();
        if (user) {
           setCurrentUser(user.profile?.username || user.email?.split('@')[0] || 'Invocador');
           setCurrentUserId(user.id);
           
           // Load User Data
           loadUserData(user.id);

           if (view === ViewState.LOGIN) {
              setView(ViewState.SPLIT_SELECTION);
           }
        }
      } catch (error) {
        console.error("No active session", error);
      }
    };
    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
        // Detectar si el usuario llega por recuperación de contraseña
        if (event === 'PASSWORD_RECOVERY') {
            setShowPasswordResetModal(true);
        }

        if (event === 'SIGNED_IN' && session) {
            const username = session.user.user_metadata?.username || session.user.email?.split('@')[0];
            setCurrentUser(username);
            setCurrentUserId(session.user.id);
            loadUserData(session.user.id);
            // Solo cambiamos la vista si no estamos recuperando contraseña
            if (!showPasswordResetModal) {
                 setView(ViewState.SPLIT_SELECTION);
            }
        } else if (event === 'SIGNED_OUT') {
            setCurrentUser(null);
            setCurrentUserId(null);
            setPredictions([]);
            setView(ViewState.LOGIN);
        }
    });

    return () => {
        authListener.subscription.unsubscribe();
    };
  }, [showPasswordResetModal]);

  const loadUserData = async (userId: string) => {
      const preds = await dataService.getUserPredictions(userId);
      setPredictions(preds);
  };

  const handleLogin = (username: string) => {
    setCurrentUser(username);
    setView(ViewState.SPLIT_SELECTION);
  };

  const handleSplitSelect = (splitName: string) => {
    setSelectedSplit(splitName);
    setView(ViewState.DASHBOARD);
  };

  const handleLogout = async () => {
    await authService.signOut();
    setCurrentUser(null);
    setCurrentUserId(null);
    setSelectedSplit(null);
    setView(ViewState.LOGIN);
    setIsMenuOpen(false);
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSavingPassword(true);
      setPasswordError(null);

      if (newPassword.length < 6) {
          setPasswordError("La contraseña debe tener al menos 6 caracteres.");
          setIsSavingPassword(false);
          return;
      }

      try {
          await authService.updateUserPassword(newPassword);
          setShowPasswordResetModal(false);
          setNewPassword('');
          // Force view refresh just in case
          setView(ViewState.SPLIT_SELECTION);
      } catch (error: any) {
          setPasswordError(error.message || "Error al actualizar la contraseña.");
      } finally {
          setIsSavingPassword(false);
      }
  };

  const handleSelectWinner = async (matchId: string, teamId: string) => {
    // Optimistic UI Update
    setPredictions(prev => {
      const existing = prev.find(p => p.matchId === matchId);
      if (existing) {
        return prev.map(p => p.matchId === matchId ? { ...p, predictedWinnerId: teamId } : p);
      }
      return [...prev, { matchId, predictedWinnerId: teamId }];
    });

    // Save to DB
    if (currentUserId) {
        await dataService.savePrediction(currentUserId, matchId, teamId);
    }
  };

  // Render content based on current view
  const renderContent = () => {
    switch (view) {
      case ViewState.LOGIN:
        return <Login onLogin={handleLogin} />;
      
      case ViewState.SPLIT_SELECTION:
        return <SplitSelection onSelect={handleSplitSelect} />;

      case ViewState.DASHBOARD:
        return <Dashboard onChangeView={setView} />;

      case ViewState.RANKING:
        return <RankingView />;

      case ViewState.CRYSTAL_BALL:
        return <CrystalBall />;

      case ViewState.FANTASY:
        // Pass currentUserId to FantasyView so it can save/load
        return <FantasyView currentUserId={currentUserId} />;

      case ViewState.MATCHDAY:
        return <MatchdayView currentUserId={currentUserId} initialPredictions={predictions} />;

      case ViewState.PLAYOFFS:
        return (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-2xl font-bold text-[#c8aa6e] mb-6 text-center uppercase">Playoffs {selectedSplit || 'Winter 2026'}</h2>
            <div className="space-y-4">
              {MATCHES.map(match => (
                <MatchCard 
                  key={match.id} 
                  match={match}
                  selectedWinnerId={predictions.find(p => p.matchId === match.id)?.predictedWinnerId}
                  onSelectWinner={handleSelectWinner}
                />
              ))}
            </div>
             <div className="fixed bottom-8 left-0 right-0 px-4 flex justify-center pointer-events-none">
              {predictions.length > 0 && (
                <div className="pointer-events-auto bg-hextech-900 border border-hextech-500 text-hextech-500 px-6 py-3 rounded-full font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(200,170,110,0.3)] animate-in slide-in-from-bottom-2">
                  <Share2 className="w-4 h-4" />
                  <span>Predicciones guardadas</span>
                </div>
              )}
            </div>
          </div>
        );

      case ViewState.RESULTS:
        return (
           <div className="animate-in fade-in slide-in-from-bottom-4">
             <h2 className="text-2xl font-bold text-[#c8aa6e] mb-6 text-center uppercase">Resultados y Ranking</h2>
             <Leaderboard users={USERS} />
           </div>
        );

      default:
        return <Dashboard onChangeView={setView} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0a1428] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1a2c4e] via-[#0a1428] to-[#0a1428] text-[#f0e6d2] font-sans">
      
      {/* Navbar */}
      {currentUser && !showPasswordResetModal && (
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
                <span className="text-sm text-gray-500 font-bold text-hextech-300">{currentUser}</span>
                <button 
                    onClick={handleLogout}
                    className="p-2 text-gray-400 hover:text-red-400 transition-colors"
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

      {/* PASSWORD RESET MODAL */}
      {showPasswordResetModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="w-full max-w-md bg-[#091428] border-2 border-[#c8aa6e] rounded-xl p-8 shadow-[0_0_50px_rgba(200,170,110,0.2)] animate-in zoom-in-95">
                  <div className="text-center mb-6">
                      <div className="w-16 h-16 bg-gradient-to-br from-[#c8aa6e] to-[#091428] rounded-full p-0.5 mb-4 border border-[#c8aa6e] flex items-center justify-center shadow-lg mx-auto">
                          <KeyRound className="w-8 h-8 text-[#f0e6d2]" />
                      </div>
                      <h2 className="text-2xl font-bold text-white uppercase">Nueva Contraseña</h2>
                      <p className="text-gray-400 text-sm mt-2">Introduce tu nueva contraseña para recuperar el acceso.</p>
                  </div>

                  {passwordError && (
                      <div className="mb-4 p-3 bg-red-900/50 border border-red-500/50 rounded text-red-200 text-sm text-center">
                          {passwordError}
                      </div>
                  )}

                  <form onSubmit={handlePasswordUpdate}>
                      <div className="space-y-4 mb-6">
                          <div>
                            <label className="text-xs font-bold text-[#c8aa6e] uppercase tracking-wider ml-1">Nueva Contraseña</label>
                            <input 
                                type="password" 
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full bg-[#0a1428] border border-[#463714] text-[#f0e6d2] p-3 rounded focus:outline-none focus:border-[#c8aa6e] focus:shadow-[0_0_10px_rgba(200,170,110,0.2)] transition-all mt-1"
                            />
                          </div>
                      </div>
                      <button 
                        type="submit"
                        disabled={isSavingPassword}
                        className="w-full bg-gradient-to-r from-[#c8aa6e] to-[#917640] hover:from-[#e6cf9b] hover:to-[#a88a4d] text-[#0a1428] font-bold py-3 px-4 rounded transform transition-all shadow-lg uppercase tracking-widest flex justify-center items-center gap-2"
                      >
                        {isSavingPassword ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        Guardar Contraseña
                      </button>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default App;