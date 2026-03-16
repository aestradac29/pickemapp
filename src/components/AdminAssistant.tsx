
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, Send, Loader2, ShieldAlert, AlertCircle, CheckCircle2, Terminal } from 'lucide-react';
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { dataService } from '../../services/dataService';
import { authService } from '../../services/authService';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  isError?: boolean;
  isSuccess?: boolean;
}

export const AdminAssistant: React.FC<{ isAdmin: boolean }> = ({ isAdmin }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hola Admin. Soy tu asistente de Pick\'em Pro. ¿En qué puedo ayudarte hoy? Puedo informarte sobre el estado de la web, corregir resultados de partidos, enviar notificaciones o ajustar la configuración global.' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (!isAdmin) return null;

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
      if (!apiKey) {
        throw new Error('API Key de Gemini no configurada');
      }

      const genAI = new GoogleGenAI({ apiKey });
      const model = genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          ...messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
          { role: 'user', parts: [{ text: userMessage }] }
        ],
        config: {
          systemInstruction: `
            Eres el Asistente de Administración de Pick'em Pro. 
            Tu objetivo es ayudar a los administradores a gestionar la plataforma.
            Tienes acceso a herramientas para consultar y modificar datos.
            
            Reglas:
            1. Sé conciso y profesional.
            2. Antes de realizar cambios críticos (como borrar datos), pide confirmación si el usuario no fue explícito.
            3. Si el usuario pregunta por "problemas", analiza el estado actual que obtengas de las herramientas.
            
            Contexto de la App:
            - Es una web de Pick'ems de League of Legends.
            - Gestiona usuarios, predicciones, fantasy, ranking y crystal ball.
            - El split actual suele ser 'winter_2026' o 'spring_2026'.
          `,
          tools: [
            {
              functionDeclarations: [
                {
                  name: "get_app_status",
                  description: "Obtiene un resumen del estado actual de la aplicación (partidos, configuración, usuarios).",
                  parameters: { type: Type.OBJECT, properties: {} }
                },
                {
                  name: "update_match_result",
                  description: "Actualiza el resultado de un partido.",
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      matchId: { type: Type.STRING, description: "ID del partido (ej: 'd1-m1')" },
                      winnerId: { type: Type.STRING, description: "ID del equipo ganador (ej: 'g2', 'fnc')" },
                      status: { type: Type.STRING, enum: ["finished", "scheduled"], description: "Estado del partido" }
                    },
                    required: ["matchId", "winnerId", "status"]
                  }
                },
                {
                  name: "send_notification",
                  description: "Envía una notificación global a todos los usuarios.",
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      message: { type: Type.STRING },
                      type: { type: Type.STRING, enum: ["info", "warning", "success", "error"] }
                    },
                    required: ["title", "message", "type"]
                  }
                },
                {
                  name: "recalculate_all_scores",
                  description: "Fuerza una recalculación de todos los puntos de los usuarios (Fantasy y Pick'ems).",
                  parameters: { type: Type.OBJECT, properties: {} }
                }
              ]
            }
          ]
        }
      });

      const result = await model;
      const response = result;
      
      if (response.functionCalls) {
        for (const call of response.functionCalls) {
          let functionResult;
          try {
            if (call.name === 'get_app_status') {
              const [matches, config, users] = await Promise.all([
                dataService.getMatches(),
                dataService.getDaysConfig(),
                dataService.getAllUsers()
              ]);
              functionResult = {
                totalMatches: matches.length,
                completedMatches: matches.filter(m => m.isCompleted).length,
                activeSplit: config.fantasyRound,
                totalUsers: users.length,
                recentMatches: matches.filter(m => !m.isCompleted).slice(0, 5).map(m => ({ id: m.id, teams: `${m.teamA.shortName} vs ${m.teamB.shortName}`, time: m.startTime }))
              };
            } else if (call.name === 'update_match_result') {
              await dataService.updateMatch(call.args.matchId as string, {
                winner_id: call.args.winnerId,
                status: call.args.status
              });
              functionResult = { success: true, message: `Partido ${call.args.matchId} actualizado con ganador ${call.args.winnerId}` };
            } else if (call.name === 'send_notification') {
              await dataService.createNotification({
                title: call.args.title as string,
                message: call.args.message as string,
                type: call.args.type as any,
                active: true
              });
              functionResult = { success: true, message: "Notificación enviada correctamente" };
            } else if (call.name === 'recalculate_all_scores') {
              await dataService.forceRecalculateAll();
              functionResult = { success: true, message: "Recalculación de puntos completada" };
            }

            // Send function result back to model
            const secondResult = await genAI.models.generateContent({
              model: "gemini-2.5-flash",
              contents: [
                ...messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
                { role: 'user', parts: [{ text: userMessage }] },
                {
                  role: 'function',
                  parts: [{
                    functionResponse: {
                      name: call.name,
                      response: functionResult
                    }
                  }]
                }
              ]
            });
            
            setMessages(prev => [...prev, { role: 'assistant', content: secondResult.text || 'He realizado la acción solicitada.' }]);
          } catch (err: any) {
            setMessages(prev => [...prev, { role: 'assistant', content: `Error al ejecutar ${call.name}: ${err.message}`, isError: true }]);
          }
        }
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: response.text || 'No he podido procesar tu solicitud.' }]);
      }

    } catch (error: any) {
      console.error("Error in AdminAssistant:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Lo siento, ha ocurrido un error al procesar tu solicitud. Revisa la consola para más detalles.', isError: true }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-[60] w-14 h-14 bg-gradient-to-br from-red-600 to-red-800 rounded-full shadow-2xl flex items-center justify-center border-2 border-red-400/50 text-white"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Bot className="w-7 h-7" />}
        {!isOpen && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 border border-white/20"></span>
          </span>
        )}
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 z-[60] w-[380px] h-[500px] bg-[#0a1428] border border-red-500/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden backdrop-blur-xl"
          >
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-red-900/40 to-transparent border-b border-red-500/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-600/20 rounded-lg border border-red-500/30">
                  <ShieldAlert className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm uppercase tracking-wider">Admin Assistant</h3>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                    <span className="text-[10px] text-gray-400 font-medium uppercase">AI Powered</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-red-900/50">
              {messages.map((msg, i) => (
                <div 
                  key={i} 
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`
                    max-w-[85%] p-3 rounded-2xl text-sm
                    ${msg.role === 'user' 
                      ? 'bg-red-600 text-white rounded-tr-none' 
                      : msg.isError 
                        ? 'bg-red-900/30 border border-red-500/50 text-red-200 rounded-tl-none'
                        : 'bg-gray-800/50 border border-gray-700 text-gray-200 rounded-tl-none'
                    }
                  `}>
                    {msg.role === 'assistant' && (
                      <div className="flex items-center gap-2 mb-1 opacity-50">
                        <Terminal className="w-3 h-3" />
                        <span className="text-[10px] font-bold uppercase">System</span>
                      </div>
                    )}
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-800/50 border border-gray-700 p-3 rounded-2xl rounded-tl-none flex items-center gap-3">
                    <Loader2 className="w-4 h-4 text-red-500 animate-spin" />
                    <span className="text-xs text-gray-400">Analizando sistema...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-800 bg-black/20">
              <div className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Pregunta sobre la web o pide un cambio..."
                  className="w-full bg-[#050a14] border border-gray-700 rounded-xl pl-4 pr-12 py-3 text-sm text-white focus:border-red-500 outline-none transition-all placeholder:text-gray-600"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="absolute right-2 top-2 p-2 bg-red-600 text-white rounded-lg hover:bg-red-500 disabled:opacity-50 disabled:hover:bg-red-600 transition-all"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[9px] text-gray-500 mt-2 text-center uppercase tracking-widest">
                Solo accesible para administradores
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
