
import React, { useState, useRef, useEffect } from 'react';
import { GoogleConfig } from '../types';
import { googleApi } from '../lib/googleApi';
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
      
      const prompt = `
        Analiza este audio y genera un JSON estrictamente válido:
        {
          "title": "título corto",
          "summary": "resumen ejecutivo",
          "emotionalState": "estado de ánimo",
          "tags": ["tag1", "tag2"],
          "snippets": ["frase clave 1"],
          "fullTranscript": "Transcripción íntegra palabra por palabra del audio",
          "tasks": [
            {"title": "descripción de la tarea", "priority": "low|medium|high", "daysToDeadline": 1}
          ]
        }
      `;

      const result = await googleApi.safeAiCall({
        prompt,
        isAudio: true,
        audioBlob: blob
      });

      const data = JSON.parse(result.text);
      setStatus('structuring');
      const entryId = crypto.randomUUID();
      
      await googleApi.appendRow(googleConfig.spreadsheetId!, 'ENTRADAS', [
        entryId, 
        new Date().toISOString(), 
        data.title, 
        data.summary, 
        data.emotionalState, 
        data.tags?.join(', '), 
        driveFile.id, 
        driveFile.webViewLink, 
        data.snippets?.join(' | '),
        data.fullTranscript
      ], googleConfig.accessToken!);

      if (data.tasks && data.tasks.length > 0) {
        for (const task of data.tasks) {
          const deadlineDate = new Date();
          deadlineDate.setDate(deadlineDate.getDate() + (task.daysToDeadline || 1));
          
          await googleApi.appendRow(googleConfig.spreadsheetId!, 'TAREAS', [
            crypto.randomUUID(),
            new Date().toISOString(),
            task.title,
            task.priority || 'medium',
            'pendiente', 
            entryId,
            deadlineDate.toISOString(),
            '' 
          ], googleConfig.accessToken!);
        }
      }

      setStatus('finished');
      onMemoryAdded({ 
        id: entryId, 
        title: data.title, 
        excerpt: data.summary, 
        timestamp: new Date(), 
        type: 'voice',
        content: data.fullTranscript 
      });
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      
      if (err.message?.includes('429')) {
        setErrorMessage("Límite de cuota excedido. Por favor, espera un minuto antes de volver a grabar.");
      } else if (err.message?.includes('403')) {
        setErrorMessage("Error de permisos (403). Verifica que la API de Google Cloud esté activa.");
      } else {
        setErrorMessage("Ha ocurrido un error al procesar el audio. Inténtalo de nuevo en unos instantes.");
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-full flex flex-col items-center justify-center space-y-12 animate-in fade-in duration-500">
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-semibold tracking-tight">Ingesta Cognitiva</h2>
        <p className="text-[#A0A6B1]">Tu voz se procesa y se extrae la transcripción completa.</p>
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
            {status === 'finished' ? '¡Memoria Guardada!' : status === 'error' ? 'Atención' : status + '...'}
          </p>
          {status === 'error' && (
            <div className="flex flex-col items-center gap-2 mt-2">
              <AlertCircle className="text-red-400 w-5 h-5" />
              <p className="text-[#A0A6B1] text-xs leading-relaxed">{errorMessage}</p>
              <button onClick={() => setStatus('idle')} className="mt-4 text-[10px] font-bold uppercase tracking-widest text-[#5E7BFF]">Entendido</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RecordMemory;