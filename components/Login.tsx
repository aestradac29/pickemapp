import React, { useState } from 'react';
import { Shield, User, Mail, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';

interface LoginProps {
  onLogin: (username: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  
  // Login State
  const [loginIdentifier, setLoginIdentifier] = useState(''); // Stores either username or email

  // Register State
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Shared State
  const [password, setPassword] = useState('');
  
  // Visibility State
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Error State
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isRegistering) {
      // REGISTRATION LOGIC
      if (!username || !email || !password || !confirmPassword) {
        setError('Por favor completa todos los campos.');
        return;
      }

      if (password !== confirmPassword) {
        setError('Las contraseñas no coinciden.');
        return;
      }
      if (password.length < 6) {
        setError('La contraseña debe tener al menos 6 caracteres.');
        return;
      }
      // Simulate Registration
      console.log("Registrando usuario:", { username, email });
      onLogin(username);
    } else {
      // LOGIN LOGIC
      if (!loginIdentifier || !password) {
        setError('Por favor introduce tu usuario o correo y contraseña.');
        return;
      }
      // Simulate Login
      console.log("Iniciando sesión:", { loginIdentifier });
      // Use the identifier as the display name for this mock
      onLogin(loginIdentifier);
    }
  };

  const toggleMode = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsRegistering(!isRegistering);
    setError(null);
    // Reset all fields to avoid confusion
    setLoginIdentifier('');
    setUsername('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 animate-in fade-in duration-700">
      <div className="w-full max-w-md bg-[#091428]/90 backdrop-blur-md border-2 border-[#c8aa6e] p-8 rounded-xl shadow-[0_0_50px_rgba(200,170,110,0.15)] relative overflow-hidden transition-all duration-500">
        
        {/* Decorative corners */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#c8aa6e] -mt-1 -ml-1"></div>
        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#c8aa6e] -mt-1 -mr-1"></div>
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#c8aa6e] -mb-1 -ml-1"></div>
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#c8aa6e] -mb-1 -mr-1"></div>

        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-[#c8aa6e] to-[#091428] rounded-full p-0.5 mb-4 border border-[#c8aa6e] flex items-center justify-center shadow-lg">
             <Shield className="w-8 h-8 text-[#f0e6d2]" />
          </div>
          <h1 className="text-3xl font-bold text-[#f0e6d2] tracking-wider uppercase text-center">
            Pick'em <span className="text-[#c8aa6e]">Pro</span>
          </h1>
          <p className="text-[#a09b8c] text-sm mt-2 text-center">
            {isRegistering ? 'Crea tu cuenta de invocador' : 'Identifícate para comenzar'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-500/50 rounded flex items-center gap-2 text-red-200 text-sm animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* LOGIN VIEW: Single User/Email Field */}
          {!isRegistering && (
            <div className="space-y-1 animate-in fade-in slide-in-from-left-4 duration-300">
              <label className="text-xs font-bold text-[#c8aa6e] uppercase tracking-wider ml-1">Usuario o Correo Electrónico</label>
              <div className="relative group">
                <input 
                  type="text" 
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder="FakerFan23 o ejemplo@correo.com"
                  className="w-full bg-[#0a1428] border border-[#463714] text-[#f0e6d2] p-3 pl-10 rounded focus:outline-none focus:border-[#c8aa6e] focus:shadow-[0_0_10px_rgba(200,170,110,0.2)] transition-all"
                />
                <User className="w-5 h-5 text-gray-500 absolute left-3 top-3.5 group-focus-within:text-[#c8aa6e] transition-colors" />
              </div>
            </div>
          )}

          {/* REGISTER VIEW: Separate Fields */}
          {isRegistering && (
            <>
              <div className="space-y-1 animate-in fade-in slide-in-from-right-4 duration-300">
                <label className="text-xs font-bold text-[#c8aa6e] uppercase tracking-wider ml-1">Nombre de Usuario</label>
                <div className="relative group">
                  <input 
                    type="text" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="FakerFan23"
                    className="w-full bg-[#0a1428] border border-[#463714] text-[#f0e6d2] p-3 pl-10 rounded focus:outline-none focus:border-[#c8aa6e] focus:shadow-[0_0_10px_rgba(200,170,110,0.2)] transition-all"
                  />
                  <User className="w-5 h-5 text-gray-500 absolute left-3 top-3.5 group-focus-within:text-[#c8aa6e] transition-colors" />
                </div>
              </div>

              <div className="space-y-1 animate-in fade-in slide-in-from-right-4 duration-300">
                <label className="text-xs font-bold text-[#c8aa6e] uppercase tracking-wider ml-1">Correo Electrónico</label>
                <div className="relative group">
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="invocador@ejemplo.com"
                    className="w-full bg-[#0a1428] border border-[#463714] text-[#f0e6d2] p-3 pl-10 rounded focus:outline-none focus:border-[#c8aa6e] focus:shadow-[0_0_10px_rgba(200,170,110,0.2)] transition-all"
                  />
                  <Mail className="w-5 h-5 text-gray-500 absolute left-3 top-3.5 group-focus-within:text-[#c8aa6e] transition-colors" />
                </div>
              </div>
            </>
          )}
          
          {/* PASSWORD FIELD (Common for both) */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#c8aa6e] uppercase tracking-wider ml-1">Contraseña</label>
            <div className="relative group">
              <input 
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#0a1428] border border-[#463714] text-[#f0e6d2] p-3 pl-10 pr-10 rounded focus:outline-none focus:border-[#c8aa6e] focus:shadow-[0_0_10px_rgba(200,170,110,0.2)] transition-all"
              />
              <Lock className="w-5 h-5 text-gray-500 absolute left-3 top-3.5 group-focus-within:text-[#c8aa6e] transition-colors" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3.5 text-gray-500 hover:text-[#c8aa6e] transition-colors focus:outline-none"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* CONFIRM PASSWORD (Register only) */}
          {isRegistering && (
            <div className="space-y-1 animate-in fade-in slide-in-from-right-4 duration-300">
              <label className="text-xs font-bold text-[#c8aa6e] uppercase tracking-wider ml-1">Confirmar Contraseña</label>
              <div className="relative group">
                <input 
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#0a1428] border border-[#463714] text-[#f0e6d2] p-3 pl-10 pr-10 rounded focus:outline-none focus:border-[#c8aa6e] focus:shadow-[0_0_10px_rgba(200,170,110,0.2)] transition-all"
                />
                <Shield className="w-5 h-5 text-gray-500 absolute left-3 top-3.5 group-focus-within:text-[#c8aa6e] transition-colors" />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3.5 text-gray-500 hover:text-[#c8aa6e] transition-colors focus:outline-none"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          )}

          <button 
            type="submit"
            className="w-full bg-gradient-to-r from-[#c8aa6e] to-[#917640] hover:from-[#e6cf9b] hover:to-[#a88a4d] text-[#0a1428] font-bold py-3 px-4 rounded transform transition-all duration-200 hover:scale-[1.02] shadow-lg mt-6 uppercase tracking-widest"
          >
            {isRegistering ? 'Crear Cuenta' : 'Acceder'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={toggleMode}
            className="text-xs text-[#c8aa6e] hover:text-[#f0e6d2] hover:underline transition-colors focus:outline-none"
          >
            {isRegistering 
              ? '¿Ya tienes cuenta? Inicia sesión aquí' 
              : '¿No tienes cuenta? Regístrate gratis'}
          </button>
        </div>
      </div>
    </div>
  );
};