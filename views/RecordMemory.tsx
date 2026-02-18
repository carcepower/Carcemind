
import React, { useState, useRef, useEffect } from 'react';
import { GoogleConfig } from '../types';
import { googleApi } from '../lib/googleApi';
import { GoogleGenAI, Type } from '@google/genai';
import { Mic, Square, Loader2, CheckCircle2, AlertCircle, BrainCircuit } from 'lucide-react';

interface RecordMemoryProps {
  onMemoryAdded: (memory: any) => void;
  googleConfig: GoogleConfig;
}

const RecordMemory: React.FC<RecordMemoryProps> = ({ onMemoryAdded, googleConfig }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState<'idle' | 'recording' | 'processing' | 'uploading' | 'structuring' | 'finished' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const getApiKey = () => {
    return (import.meta as any).env?.VITE_API_KEY || 
           (process.env as any)?.VITE_API_KEY || 
           process.env.API_KEY;
  };

  const startRecording = async () => {
    if (!googleConfig.isConnected) {
      setStatus('error');
      setErrorMessage('Conecta tu cuenta de Google en Ajustes.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        processAudio(blob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setStatus('recording');
    } catch (err: any) {
      setStatus('error');
      setErrorMessage('No se pudo acceder al micrófono.');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach(t => t.stop());
    setIsRecording(false);
  };

  const processAudio = async (blob: Blob) => {
    setStatus('uploading');
    try {
      const driveFile = await googleApi.uploadFile(googleConfig.accessToken!, blob, `Memory_${Date.now()}.webm`, googleConfig.audioFolderId!);
      
      setStatus('processing');
      const apiKey = getApiKey();
      
      if (!apiKey) {
        throw new Error("VITE_API_KEY no encontrada.");
      }

      const ai = new GoogleGenAI({ apiKey });
      const base64Audio = await new Promise<string>(r => {
        const reader = new FileReader();
        reader.onloadend = () => r((reader.result as string).split(',')[1]);
        reader.readAsDataURL(blob);
      });

      const prompt = `
        Analiza este audio y genera un JSON con la siguiente estructura:
        {
          "title": "título corto",
          "summary": "resumen ejecutivo",
          "emotionalState": "estado de ánimo detectado",
          "tags": ["tag1", "tag2"],
          "snippets": ["frase clave 1", "frase clave 2"],
          "tasks": [
            {"title": "descripción de la tarea", "priority": "low|medium|high", "daysToDeadline": 1}
          ]
        }
        Si no hay tareas, el array "tasks" debe estar vacío.
      `;

      const result = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ inlineData: { data: base64Audio, mimeType: 'audio/webm' } }, { text: prompt }] }],
        config: { responseMimeType: 'application/json' }
      });

      const data = JSON.parse(result.text);
      setStatus('structuring');
      const entryId = crypto.randomUUID();
      
      // Guardar Memoria
      await googleApi.appendRow(googleConfig.spreadsheetId!, 'ENTRADAS', [
        entryId, 
        new Date().toISOString(), 
        data.title, 
        data.summary, 
        data.emotionalState, 
        data.tags?.join(', '), 
        driveFile.id, 
        driveFile.webViewLink, 
        data.snippets?.join(' | ')
      ], googleConfig.accessToken!);

      // Guardar Tareas detectadas (si existen)
      if (data.tasks && data.tasks.length > 0) {
        for (const task of data.tasks) {
          const deadlineDate = new Date();
          deadlineDate.setDate(deadlineDate.getDate() + (task.daysToDeadline || 1));
          
          await googleApi.appendRow(googleConfig.spreadsheetId!, 'TAREAS', [
            crypto.randomUUID(),
            new Date().toISOString(),
            task.title,
            task.priority || 'medium',
            'pending',
            entryId,
            deadlineDate.toISOString()
          ], googleConfig.accessToken!);
        }
      }

      setStatus('finished');
      onMemoryAdded({ id: entryId, title: data.title, excerpt: data.summary, timestamp: new Date(), type: 'voice' });
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setErrorMessage(err.message || 'Error en el procesamiento neuronal.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-full flex flex-col items-center justify-center space-y-12 animate-in fade-in duration-500">
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-semibold tracking-tight">Ingesta Cognitiva</h2>
        <p className="text-[#A0A6B1]">Tu voz se procesa y se extraen tareas automáticamente.</p>
      </div>

      <button
        onClick={isRecording ? stopRecording : startRecording}
        className={`w-40 h-40 rounded-full flex items-center justify-center transition-all duration-500 ${isRecording ? 'bg-red-500/20 text-red-500 ring-8 ring-red-500/10' : 'bg-[#5E7BFF] text-white shadow-xl shadow-[#5E7BFF44]'}`}
      >
        {isRecording ? <Square fill="currentColor" /> : <Mic className="w-16 h-16" />}
      </button>

      {status !== 'idle' && (
        <div className="glass p-8 rounded-3xl border border-[#1F2330] w-full max-w-md text-center">
          {['uploading', 'processing', 'structuring'].includes(status) && <Loader2 className="animate-spin mx-auto mb-4 text-[#5E7BFF]" />}
          <p className="font-bold uppercase tracking-widest text-sm">
            {status === 'finished' ? '¡Memoria y Tareas Guardadas!' : status === 'error' ? 'Error' : status + '...'}
          </p>
          {status === 'error' && <p className="text-red-400 mt-2 text-xs">{errorMessage}</p>}
        </div>
      )}
    </div>
  );
};

export default RecordMemory;
