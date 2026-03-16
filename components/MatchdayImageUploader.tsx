import React, { useState } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { Upload, Loader2, Sparkles } from 'lucide-react';
import { dataService } from '../services/dataService';
import { Stage } from '../types';
import { MatchConfirmationModal } from './MatchConfirmationModal';

interface MatchdayImageUploaderProps {
    currentDay: number;
    onMatchesCreated: () => void;
}

export const MatchdayImageUploader: React.FC<MatchdayImageUploaderProps> = ({ currentDay, onMatchesCreated }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pendingMatches, setPendingMatches] = useState<{ teamAId: string; teamBId: string; startTime: string }[]>([]);
    const [showModal, setShowModal] = useState(false);

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsProcessing(true);
        setError(null);

        try {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onloadend = async () => {
                const base64Image = (reader.result as string).split(',')[1];
                
                const apiKey = process.env.GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY;
                console.log('GEMINI_API_KEY:', apiKey);
                const ai = apiKey ? new GoogleGenAI({ apiKey }) : new GoogleGenAI();

                const response = await ai.models.generateContent({
                    model: "gemini-3-flash-preview",
                    contents: {
                        parts: [
                            {
                                inlineData: {
                                    mimeType: file.type,
                                    data: base64Image,
                                },
                            },
                            {
                                text: `Extract ALL matches from this image. Return a JSON array of objects, each with: "teamAId" (string, e.g., 'fnc', 'g2', 'nvi', 'shf'), "teamBId" (string), "startTime" (ISO string). Assume the matches are for day ${currentDay}. 
                                
                                IMPORTANT: Be extremely accurate with team identification. 
                                - Use 'nvi' for Natus Vincere.
                                - Use 'shf' for Shifters.
                                - Ensure you extract every single match visible in the image.`,
                            },
                        ],
                    },
                    config: {
                        responseMimeType: "application/json",
                        responseSchema: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    teamAId: { type: Type.STRING },
                                    teamBId: { type: Type.STRING },
                                    startTime: { type: Type.STRING },
                                },
                                required: ["teamAId", "teamBId", "startTime"],
                            },
                        },
                    },
                });

                const matches = JSON.parse(response.text || '[]');
                setPendingMatches(matches.filter(Boolean));
                setShowModal(true);
                setIsProcessing(false);
            };
        } catch (err) {
            console.error(err);
            setError("Error procesando la imagen.");
            setIsProcessing(false);
        }
    };

    const handleConfirmMatches = async (matches: { teamAId: string; teamBId: string; startTime: string; bestOf?: number }[]) => {
        setIsProcessing(true);
        try {
            for (const match of matches) {
                await dataService.createMatch({
                    split_id: dataService._getCurrentSplitId(),
                    team_a_id: match.teamAId,
                    team_b_id: match.teamBId,
                    start_time: match.startTime,
                    stage: Stage.GROUPS,
                    status: 'scheduled',
                    day: currentDay,
                    bestOf: match.bestOf || 1
                });
            }
            onMatchesCreated();
            setShowModal(false);
            setPendingMatches([]);
        } catch (err) {
            console.error(err);
            setError("Error creando los partidos.");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase border bg-purple-900/50 border-purple-500 text-purple-300 hover:bg-purple-900 cursor-pointer transition-all">
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {isProcessing ? 'Procesando...' : 'IA: Crear Jornada desde Imagen'}
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
            {error && <p className="text-red-500 text-xs">{error}</p>}
            {showModal && (
                <MatchConfirmationModal 
                    matches={pendingMatches} 
                    onConfirm={handleConfirmMatches} 
                    onCancel={() => setShowModal(false)} 
                />
            )}
        </div>
    );
};
