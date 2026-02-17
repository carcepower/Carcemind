
import React, { useState, useRef } from 'react';
import { GoogleConfig } from '../types';
import { googleApi } from '../lib/googleApi';
import { GoogleGenAI, Type } from '@google/genai';
import { Mic, Square, Loader2, CheckCircle2, AlertCircle, BrainCircuit, Chrome, FileText } from 'lucide-react';

interface RecordMemoryProps {
  onMemoryAdded: (memory: any) => void;
  googleConfig: GoogleConfig;
}

const RecordMemory: React.FC<RecordMemoryProps> = ({ onMemoryAdded, googleConfig }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState<'idle' | 'recording' | 'processing' | 'uploading' | 'structuring' | 'finished' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [resultData, setResultData] = useState<any>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        processAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setStatus('recording');
    } catch (err) {
      console.error(err);
      setStatus('error');
      setErrorMessage('No se pudo acceder al micrófono.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    }
    setIsRecording(false);
  };

  const processAudio = async (blob: Blob) => {
    if (!googleConfig.isConnected || !googleConfig.audioFolderId || !googleConfig.spreadsheetId) {
      setStatus('error');
      setErrorMessage('Configura Google Drive y Sheets en Ajustes primero.');
      return;
    }

    setStatus('uploading');
    const token = googleConfig.accessToken!;
    const fileName = `CarceMind_Memory_${new Date().toISOString()}.webm`;

    try {
      // 1. Upload to Drive
      const driveFile = await googleApi.uploadFile(token, blob, fileName, googleConfig.audioFolderId!);
      
      // 2. Transcribe and Structure with Gemini
      setStatus('processing');
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
      
      const base64Audio = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(blob);
      });

      const prompt = `Actúa como CarceMind, el cerebro externo de Pablo. 
      Analiza este audio y genera un JSON estructurado con estas claves:
      - title: Un título ejecutivo corto.
      - summary: Un resumen de máximo 5 líneas.
      - emotionalState: Un tag emocional (ej: enfocado, estresado, creativo).
      - tags: Lista de 3-8 tags.
      - tasks: Lista de objetos { description, priority (low/medium/high), deadline (ISO string o null) }.
      - snippets: Lista de 3-8 bullets cortos con hechos clave.`;

      const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        contents: [
          { parts: [{ inlineData: { data: base64Audio, mimeType: 'audio/webm' } }, { text: prompt }] }
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              summary: { type: Type.STRING },
              emotionalState: { type: Type.STRING },
              tags: { type: Type.ARRAY, items: { type: Type.STRING } },
              tasks: { 
                type: Type.ARRAY, 
                items: { 
                  type: Type.OBJECT, 
                  properties: {
                    description: { type: Type.STRING },
                    priority: { type: Type.STRING },
                    deadline: { type: Type.STRING }
                  }
                } 
              },
              snippets: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ['title', 'summary', 'emotionalState', 'tags', 'tasks', 'snippets']
          }
        }
      });

      const structuredData = JSON.parse(result.text);
      setResultData(structuredData);

      // 3. Update Sheets
      setStatus('structuring');
      const entryId = crypto.randomUUID();
      const timestamp = new Date().toISOString();

      await googleApi.appendRow(googleConfig.spreadsheetId, 'ENTRADAS', [
        entryId,
        timestamp,
        structuredData.title,
        structuredData.summary,
        structuredData.emotionalState,
        structuredData.tags.join(', '),
        driveFile.id,
        driveFile.webViewLink,
        structuredData.snippets.join(' | ')
      ], token);

      for (const task of structuredData.tasks) {
        await googleApi.appendRow(googleConfig.spreadsheetId, 'TAREAS', [
          crypto.randomUUID(),
          timestamp,
          task.description,
          task.priority || 'medium',
          'pending',
          entryId,
          task.deadline || ''
        ], token);
      }

      setStatus('finished');
      onMemoryAdded({
        id: entryId,
        title: structuredData.title,
        excerpt: structuredData.summary,
        content: structuredData.summary,
        timestamp: new Date(),
        emotionalTag: structuredData.emotionalState,
        type: 'voice'
      });
    } catch (err) {
      console.error(err);
      setStatus('error');
      setErrorMessage('Error en el procesamiento neuronal. Reintenta.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-full flex flex-col items-center justify-center space-y-12 animate-in fade-in zoom-in-95 duration-500">
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-semibold tracking-tight">Capa de Ingesta Cognitiva</h2>
        <p className="text-[#A0A6B1] max-w-md mx-auto leading-relaxed">
          Tu voz se almacena en <strong>Drive</strong> y se estructura en <strong>Sheets</strong> con Gemini 2.5.
        </p>
      </div>

      <div className="relative flex flex-col items-center gap-12 w-full">
        <div className="relative">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={['uploading', 'processing', 'structuring'].includes(status)}
            className={`w-40 h-40 rounded-full flex items-center justify-center transition-all duration-500 transform active:scale-95 shadow-2xl relative z-10 ${
              isRecording 
                ? 'bg-red-500/20 text-red-500 border-red-500/30 ring-[12px] ring-red-500/10' 
                : 'bg-gradient-to-tr from-[#5E7BFF] to-[#8A6CFF] text-white shadow-[#5E7BFF33] hover:shadow-[#5E7BFF55]'
            }`}
          >
            {isRecording ? <Square fill="currentColor" className="w-10 h-10" /> : <Mic className="w-16 h-16" />}
          </button>
          {isRecording && <div className="absolute inset-0 rounded-full bg-[#8A6CFF] animate-ping opacity-20 -z-10" />}
        </div>

        <div className="w-full max-w-2xl glass p-10 rounded-[3rem] border border-[#1F2330] min-h-[220px] flex flex-col items-center justify-center text-center shadow-2xl space-y-6">
          {status === 'recording' && (
            <div className="space-y-2">
              <p className="text-sm font-bold tracking-widest uppercase text-red-500 animate-pulse">Capturando Pensamiento...</p>
              <p className="text-[#646B7B] text-xs">Exprésate libremente, CarceMind estructura el caos.</p>
            </div>
          )}
          
          {['uploading', 'processing', 'structuring'].includes(status) && (
            <div className="space-y-6">
              <div className="flex justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-[#5E7BFF]" />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-bold uppercase tracking-widest text-[#5E7BFF]">
                  {status === 'uploading' && 'Subiendo a Google Drive...'}
                  {status === 'processing' && 'Transcribiendo con Gemini...'}
                  {status === 'structuring' && 'Actualizando Memoria Estructurada (Sheets)...'}
                </p>
                <div className="w-48 h-1 bg-[#1F2330] rounded-full mx-auto overflow-hidden">
                   <div className="h-full bg-[#5E7BFF] animate-progress" />
                </div>
              </div>
            </div>
          )}

          {status === 'finished' && resultData && (
            <div className="space-y-6 animate-in fade-in slide-in-from-top-4">
              <div className="flex flex-col items-center gap-2">
                <CheckCircle2 className="w-10 h-10 text-[#10B981]" />
                <h4 className="text-xl font-medium">{resultData.title}</h4>
              </div>
              <p className="text-[#A0A6B1] text-sm italic leading-relaxed">"{resultData.summary}"</p>
              <div className="flex flex-wrap justify-center gap-2">
                {resultData.tags.map((t: string) => (
                  <span key={t} className="px-3 py-1 rounded-full bg-[#1F2330] text-[#646B7B] text-[10px] font-bold uppercase tracking-widest">#{t}</span>
                ))}
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4 text-red-400">
              <AlertCircle className="w-10 h-10 mx-auto" />
              <p className="text-sm font-medium">{errorMessage}</p>
              <button onClick={() => setStatus('idle')} className="text-xs underline font-bold uppercase tracking-widest">Reintentar</button>
            </div>
          )}

          {status === 'idle' && (
             <div className="space-y-4 opacity-30">
               <BrainCircuit className="w-12 h-12 mx-auto" />
               <p className="text-xs uppercase tracking-widest font-bold">Esperando señal cognitiva</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecordMemory;
