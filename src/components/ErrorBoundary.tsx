// @ts-nocheck
import * as React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export const ErrorBoundary: any = class extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    const { children } = this.props;
    if (this.state.hasError) {
      let errorMessage = "Ha ocurrido un error inesperado.";
      let details = null;

      try {
        // Intentar parsear el error si es un JSON de FirestoreErrorInfo
        const parsedError = JSON.parse(this.state.error?.message || "");
        if (parsedError.error && parsedError.operationType) {
          errorMessage = `Error de base de datos: ${parsedError.operationType} en ${parsedError.path}`;
          details = (
            <div className="mt-4 p-4 bg-red-900/20 border border-red-500/50 rounded text-xs font-mono text-red-200 overflow-auto max-w-full">
              <p><strong>Mensaje:</strong> {parsedError.error}</p>
              <p><strong>Operación:</strong> {parsedError.operationType}</p>
              <p><strong>Ruta:</strong> {parsedError.path}</p>
              <p><strong>Usuario:</strong> {parsedError.authInfo.userId || 'No autenticado'}</p>
            </div>
          );
        }
      } catch (e) {
        // No es un JSON de Firestore, usar mensaje normal
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen bg-[#0a1428] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#050a14] border border-[#c8aa6e]/30 rounded-lg p-8 text-center shadow-2xl">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-[#c8aa6e] mb-4">¡Ups! Algo salió mal</h2>
            <p className="text-gray-400 mb-6">
              {errorMessage}
            </p>
            {details}
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-[#c8aa6e] hover:bg-[#d4b87e] text-[#0a1428] font-bold py-3 px-4 rounded transition-colors uppercase tracking-widest text-sm"
            >
              Recargar aplicación
            </button>
          </div>
        </div>
      );
    }

    return children;
  }
}
