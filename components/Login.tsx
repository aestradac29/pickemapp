import React, { useState, useEffect } from 'react';
import { Shield, User, Mail, Lock, AlertCircle, Eye, EyeOff, Loader2, CheckCircle2, ArrowLeft, KeyRound } from 'lucide-react';
import { authService } from '../services/authService';

interface LoginProps {
  onLogin: (username: string) => void;
}

// Partículas flotantes de fondo — generadas una vez, estáticas en posición
const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  x: (i * 37 + 11) % 97,   // % de ancho
  y: (i * 53 + 7)  % 95,   // % de alto
  size: (i % 3) + 2,        // 2–4px
  delay: (i * 0.4) % 4,     // s de delay en animación
  duration: 4 + (i % 4),    // 4–7s
}));

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering]     = useState(false);
  const [isResetting,   setIsResetting]       = useState(false);
  const [isLoading,     setIsLoading]         = useState(false);

  // Login State
  const [identifier,     setIdentifier]     = useState('');
  const [registerEmail,  setRegisterEmail]  = useState('');

  // Register State
  const [username,         setUsername]         = useState('');
  const [confirmPassword,  setConfirmPassword]  = useState('');

  // Shared
  const [password, setPassword] = useState('');

  // Visibility
  const [showPassword,        setShowPassword]        = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Feedback
  const [error,          setError]          = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Animar líneas de energía cada N segundos
  const [energyPulse, setEnergyPulse] = useState(false);
  useEffect(() => {
    const t = setInterval(() => {
      setEnergyPulse(p => !p);
    }, 3000);
    return () => clearInterval(t);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      if (isResetting) {
        if (!identifier) throw new Error('Por favor introduce tu correo electrónico.');
        await authService.resetPasswordForEmail(identifier);
        setSuccessMessage(`Si existe una cuenta con ${identifier}, se ha enviado un enlace.`);
        setIsLoading(false);
        return;
      }

      if (isRegistering) {
        if (!username || !registerEmail || !password || !confirmPassword)
          throw new Error('Por favor completa todos los campos.');
        if (password !== confirmPassword)
          throw new Error('Las contraseñas no coinciden.');
        if (password.length < 6)
          throw new Error('La contraseña debe tener al menos 6 caracteres.');

        const data = await authService.signUp(registerEmail, password, username);
        if (data.user) {
          setSuccessMessage('¡Cuenta creada con éxito! Entrando...');
          setTimeout(() => onLogin(username), 1000);
        }
      } else {
        if (!identifier || !password)
          throw new Error('Por favor introduce tu usuario/correo y contraseña.');

        const result = await authService.signIn(identifier, password);
        const safeUsername =
          result.user.displayName ||
          (result.user.email ? result.user.email.split('@')[0] : 'Invocador');
        onLogin(safeUsername);
      }
    } catch (err: any) {
      console.error(err);
      let msg = err.message;
      if (msg.includes('auth/invalid-credential') || msg.includes('auth/wrong-password'))
        msg = 'Credenciales incorrectas.';
      if (msg.includes('auth/user-not-found'))  msg = 'Usuario no encontrado.';
      if (msg.includes('auth/email-already-in-use')) msg = 'El correo ya está registrado.';
      setError(msg || 'Ocurrió un error inesperado.');
    } finally {
      if (!isResetting && !successMessage) setIsLoading(false);
    }
  };

  const toggleMode = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsRegistering(!isRegistering);
    setIsResetting(false);
    setError(null);
    setSuccessMessage(null);
    setIdentifier('');
    setRegisterEmail('');
    setUsername('');
    setPassword('');
    setConfirmPassword('');
  };

  const toggleResetMode = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResetting(!isResetting);
    setIsRegistering(false);
    setError(null);
    setSuccessMessage(null);
  };

  const inputClass =
    'w-full bg-[#050d1a] border border-[#1e3a5f] text-[#f0e6d2] p-3 pl-10 rounded-lg ' +
    'focus:outline-none focus:border-[#c8aa6e] focus:shadow-[0_0_12px_rgba(200,170,110,0.25)] ' +
    'transition-all placeholder-[#3d5a7a]';

  return (
    <div className="relative flex flex-col items-center justify-center min-h-[90vh] px-4 overflow-hidden">

      {/* ── Fondo: gradiente de capas ── */}
      <div className="absolute inset-0 bg-[#020a15]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(200,170,110,0.08),transparent)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_50%_110%,rgba(10,200,185,0.06),transparent)]" />

      {/* ── Líneas de cuadrícula hextech ── */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(200,170,110,0.8) 1px, transparent 1px),' +
            'linear-gradient(90deg, rgba(200,170,110,0.8) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* ── Partículas flotantes ── */}
      {PARTICLES.map(p => (
        <div
          key={p.id}
          className="absolute rounded-full bg-[#c8aa6e]"
          style={{
            left:   `${p.x}%`,
            top:    `${p.y}%`,
            width:  `${p.size}px`,
            height: `${p.size}px`,
            opacity: 0.15 + (p.id % 3) * 0.08,
            animation: `floatParticle ${p.duration}s ease-in-out ${p.delay}s infinite alternate`,
          }}
        />
      ))}

      {/* ── Líneas de energía laterales ── */}
      <div
        className="absolute left-0 top-1/4 bottom-1/4 w-px transition-opacity duration-1000"
        style={{
          background: 'linear-gradient(to bottom, transparent, rgba(200,170,110,0.4), transparent)',
          opacity: energyPulse ? 0.8 : 0.2,
        }}
      />
      <div
        className="absolute right-0 top-1/4 bottom-1/4 w-px transition-opacity duration-1000"
        style={{
          background: 'linear-gradient(to bottom, transparent, rgba(10,200,185,0.4), transparent)',
          opacity: energyPulse ? 0.8 : 0.2,
        }}
      />

      {/* ── Orbe de luz central (detrás de la card) ── */}
      <div
        className="absolute w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(200,170,110,0.06) 0%, transparent 70%)',
          transform: 'translate(-50%, -50%)',
          left: '50%',
          top: '50%',
        }}
      />

      {/* ── CARD ── */}
      <div
        className="relative w-full max-w-md animate-in fade-in slide-in-from-bottom-6 duration-700"
        style={{ zIndex: 10 }}
      >
        {/* Brillo exterior de la card */}
        <div
          className="absolute -inset-px rounded-xl pointer-events-none"
          style={{
            background:
              'linear-gradient(135deg, rgba(200,170,110,0.3) 0%, transparent 40%, transparent 60%, rgba(10,200,185,0.15) 100%)',
          }}
        />

        <div className="bg-[#060f1e]/95 backdrop-blur-xl border border-[#1e3a5f] rounded-xl p-8 shadow-[0_25px_60px_rgba(0,0,0,0.7)] relative overflow-hidden">

          {/* Esquinas decorativas hextech */}
          {[
            'top-0 left-0 border-t-2 border-l-2 rounded-tl-xl',
            'top-0 right-0 border-t-2 border-r-2 rounded-tr-xl',
            'bottom-0 left-0 border-b-2 border-l-2 rounded-bl-xl',
            'bottom-0 right-0 border-b-2 border-r-2 rounded-br-xl',
          ].map((cls, i) => (
            <div key={i} className={`absolute w-5 h-5 border-[#c8aa6e] ${cls}`} />
          ))}

          {/* Scan line animada */}
          <div
            className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-[#c8aa6e]/30 to-transparent pointer-events-none"
            style={{ animation: 'scanLine 4s ease-in-out infinite', top: '30%' }}
          />

          {/* ── Cabecera ── */}
          <div className="flex flex-col items-center mb-7">
            {/* Logo animado */}
            <div className="relative mb-5">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{
                  background: 'radial-gradient(circle at 35% 35%, #1a3a5c, #050d1a)',
                  border: '1px solid rgba(200,170,110,0.5)',
                  boxShadow: '0 0 30px rgba(200,170,110,0.2), inset 0 0 20px rgba(200,170,110,0.05)',
                  animation: 'logoPulse 3s ease-in-out infinite',
                }}
              >
                {isResetting
                  ? <KeyRound className="w-9 h-9 text-[#c8aa6e]" />
                  : <Shield className="w-9 h-9 text-[#c8aa6e]" />
                }
              </div>
              {/* Anillo giratorio */}
              <div
                className="absolute inset-0 rounded-full border border-dashed border-[#c8aa6e]/20"
                style={{ animation: 'spin 12s linear infinite' }}
              />
            </div>

            <h1 className="text-3xl font-bold text-[#f0e6d2] tracking-[0.15em] uppercase">
              Pick'em <span className="text-[#c8aa6e]">Pro</span>
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <div className="h-px w-8 bg-gradient-to-r from-transparent to-[#c8aa6e]/50" />
              <p className="text-[#6a8aaa] text-xs uppercase tracking-widest">
                {isResetting
                  ? 'Recuperar acceso'
                  : isRegistering
                  ? 'Registro de invocador'
                  : 'Identificación'}
              </p>
              <div className="h-px w-8 bg-gradient-to-l from-transparent to-[#c8aa6e]/50" />
            </div>
          </div>

          {/* ── Mensajes ── */}
          {successMessage && (
            <div className="mb-5 p-3 bg-green-900/30 border border-green-500/40 rounded-lg flex items-start gap-2 text-green-200 text-sm animate-in fade-in slide-in-from-top-2">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-green-400" />
              <span className="leading-snug">{successMessage}</span>
            </div>
          )}
          {error && (
            <div className="mb-5 p-3 bg-red-900/30 border border-red-500/40 rounded-lg flex items-start gap-2 text-red-200 text-sm animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* ── Formulario ── */}
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Reset mode */}
            {isResetting ? (
              <div className="space-y-1 animate-in fade-in slide-in-from-right-4 duration-300">
                <label className="text-[10px] font-bold text-[#c8aa6e] uppercase tracking-widest ml-1">
                  Correo Electrónico
                </label>
                <div className="relative group">
                  <input type="email" value={identifier} onChange={e => setIdentifier(e.target.value)}
                    placeholder="tucorreo@ejemplo.com" className={inputClass} />
                  <Mail className="w-4 h-4 text-[#3d5a7a] absolute left-3 top-3.5 group-focus-within:text-[#c8aa6e] transition-colors" />
                </div>
              </div>

            ) : isRegistering ? (
              <>
                <div className="space-y-1 animate-in fade-in slide-in-from-right-4 duration-300">
                  <label className="text-[10px] font-bold text-[#c8aa6e] uppercase tracking-widest ml-1">
                    Nombre de Usuario
                  </label>
                  <div className="relative group">
                    <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                      placeholder="FakerFan23" className={inputClass} />
                    <User className="w-4 h-4 text-[#3d5a7a] absolute left-3 top-3.5 group-focus-within:text-[#c8aa6e] transition-colors" />
                  </div>
                </div>
                <div className="space-y-1 animate-in fade-in slide-in-from-left-4 duration-300">
                  <label className="text-[10px] font-bold text-[#c8aa6e] uppercase tracking-widest ml-1">
                    Correo Electrónico
                  </label>
                  <div className="relative group">
                    <input type="email" value={registerEmail} onChange={e => setRegisterEmail(e.target.value)}
                      placeholder="invocador@ejemplo.com" className={`${inputClass}`} />
                    <Mail className="w-4 h-4 text-[#3d5a7a] absolute left-3 top-3.5 group-focus-within:text-[#c8aa6e] transition-colors" />
                  </div>
                </div>
              </>

            ) : (
              <div className="space-y-1 animate-in fade-in slide-in-from-left-4 duration-300">
                <label className="text-[10px] font-bold text-[#c8aa6e] uppercase tracking-widest ml-1">
                  Usuario o Correo
                </label>
                <div className="relative group">
                  <input type="text" value={identifier} onChange={e => setIdentifier(e.target.value)}
                    placeholder="Usuario o email" className={inputClass} />
                  <User className="w-4 h-4 text-[#3d5a7a] absolute left-3 top-3.5 group-focus-within:text-[#c8aa6e] transition-colors" />
                </div>
              </div>
            )}

            {/* Contraseña */}
            {!isResetting && (
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-[#c8aa6e] uppercase tracking-widest ml-1">
                    Contraseña
                  </label>
                  {!isRegistering && (
                    <button type="button" onClick={toggleResetMode}
                      className="text-[10px] text-[#3d5a7a] hover:text-[#c8aa6e] transition-colors">
                      ¿Olvidaste la contraseña?
                    </button>
                  )}
                </div>
                <div className="relative group">
                  <input type={showPassword ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                    className={`${inputClass} pr-10`} />
                  <Lock className="w-4 h-4 text-[#3d5a7a] absolute left-3 top-3.5 group-focus-within:text-[#c8aa6e] transition-colors" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3.5 text-[#3d5a7a] hover:text-[#c8aa6e] transition-colors focus:outline-none">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Confirmar contraseña */}
            {isRegistering && (
              <div className="space-y-1 animate-in fade-in slide-in-from-right-4 duration-300">
                <label className="text-[10px] font-bold text-[#c8aa6e] uppercase tracking-widest ml-1">
                  Confirmar Contraseña
                </label>
                <div className="relative group">
                  <input type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••"
                    className={`${inputClass} pr-10`} />
                  <Shield className="w-4 h-4 text-[#3d5a7a] absolute left-3 top-3.5 group-focus-within:text-[#c8aa6e] transition-colors" />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3.5 text-[#3d5a7a] hover:text-[#c8aa6e] transition-colors focus:outline-none">
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Botón de acción */}
            <button
              type="submit"
              disabled={isLoading}
              className="relative w-full mt-6 py-3 px-4 rounded-lg font-bold uppercase tracking-widest
                         text-[#050d1a] transition-all duration-200 overflow-hidden
                         disabled:opacity-50 disabled:cursor-not-allowed
                         hover:scale-[1.02] active:scale-[0.98]
                         flex justify-center items-center gap-2"
              style={{
                background: 'linear-gradient(135deg, #c8aa6e 0%, #917640 50%, #c8aa6e 100%)',
                backgroundSize: '200% 100%',
                boxShadow: '0 4px 20px rgba(200,170,110,0.3)',
                animation: isLoading ? 'none' : 'shimmerBtn 3s ease infinite',
              }}
            >
              {isLoading
                ? <Loader2 className="w-5 h-5 animate-spin" />
                : isResetting ? 'Enviar enlace'
                : isRegistering ? 'Crear Cuenta'
                : 'Acceder'}
            </button>
          </form>

          {/* ── Toggle modo ── */}
          <div className="mt-6 text-center">
            {isResetting ? (
              <button onClick={toggleResetMode}
                className="flex items-center justify-center gap-2 mx-auto text-xs text-[#6a8aaa] hover:text-[#c8aa6e] transition-colors">
                <ArrowLeft className="w-3 h-3" /> Volver al inicio de sesión
              </button>
            ) : (
              <button onClick={toggleMode}
                className="text-xs text-[#6a8aaa] hover:text-[#c8aa6e] transition-colors">
                {isRegistering
                  ? '¿Ya tienes cuenta? Inicia sesión aquí'
                  : '¿No tienes cuenta? Regístrate gratis'}
              </button>
            )}
          </div>

        </div>
      </div>

      {/* ── Keyframes inyectados en el DOM ── */}
      <style>{`
        @keyframes floatParticle {
          from { transform: translateY(0px) scale(1);   opacity: 0.12; }
          to   { transform: translateY(-18px) scale(1.3); opacity: 0.28; }
        }
        @keyframes scanLine {
          0%   { top: 10%; opacity: 0; }
          20%  { opacity: 1; }
          80%  { opacity: 1; }
          100% { top: 90%; opacity: 0; }
        }
        @keyframes logoPulse {
          0%, 100% { box-shadow: 0 0 30px rgba(200,170,110,0.2), inset 0 0 20px rgba(200,170,110,0.05); }
          50%       { box-shadow: 0 0 45px rgba(200,170,110,0.35), inset 0 0 25px rgba(200,170,110,0.1); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes shimmerBtn {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  );
};
