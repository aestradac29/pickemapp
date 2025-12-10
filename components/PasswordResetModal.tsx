import React, { useState } from 'react';
import { KeyRound, Loader2, Save } from 'lucide-react';
import { authService } from '../services/authService';

interface PasswordResetModalProps {
    onClose: () => void; // Used if we want to add a close button
    onSuccess: () => void;
}

export const PasswordResetModal: React.FC<PasswordResetModalProps> = ({ onSuccess }) => {
    const [newPassword, setNewPassword] = useState('');
    const [isSavingPassword, setIsSavingPassword] = useState(false);
    const [passwordError, setPasswordError] = useState<string | null>(null);

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
            setNewPassword('');
            onSuccess();
        } catch (error: any) {
            setPasswordError(error.message || "Error al actualizar la contraseña.");
        } finally {
            setIsSavingPassword(false);
        }
    };

    return (
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
    );
};