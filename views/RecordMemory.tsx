
import React, { useState, useRef, useEffect } from 'react';
import { GoogleConfig } from '../types';
import { googleApi } from '../lib/googleApi';
import { GoogleGenAI, Type } from '@google/genai';
import { Mic, Square, Loader2, CheckCircle2, AlertCircle, BrainCircuit, Settings, ChevronDown } from 'lucide-react';

interface RecordMemoryProps {
  onMemoryAdded: (memory: any) => void;
  googleConfig: GoogleConfig;
}

const RecordMemory: React.FC<RecordMemoryProps> = ({ onMemoryAdded, googleConfig }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState<'idle' | 'recording' | 'processing' | 'uploading' | 'structuring' | 'finished' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [resultData, setResultData] = useState<any>(null);
  
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [showDeviceSelector, setShowDeviceSelector] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const getSupportedMimeType = () => {
    const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/aac'];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) return type;
    }
    return '';
  };

  useEffect(() => {
    const initDevices = async () => {
      try {
        const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = allDevices.filter(d => d.kind === 'audioinput');
        setDevices(audioInputs);
        if (audioInputs.length > 0) setSelectedDeviceId(audioInputs[0].deviceId);
        tempStream.getTracks().forEach(t => t.stop());
      } catch (err) {
        console.warn("No se pudieron listar los micrófonos:", err);
      }
    };
    initDevices();
  }, []);

  const startRecording = async () => {
    // Validación PREVIA
    if (!googleConfig.isConnected || !googleConfig.accessToken) {
      setStatus('error');
      setErrorMessage('Por favor, conecta tu cuenta de Google en Ajustes.');
      return;
    }
    if (!googleConfig.audioFolderId || !googleConfig.spreadsheetId) {
      setStatus('error');
      setErrorMessage('Falta configurar las carpetas o la base de datos en Ajustes.');
      return;
    }

    try {
      const mimeType = getSupportedMimeType();
      const constraints = { audio: selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : true };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const finalBlob = new Blob(audioChunksRef.current, { type: mimeType });
        processAudio(finalBlob, mimeType);
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setStatus('recording');
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err.message || 'No se pudo acceder al micrófono.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    setIsRecording(false);
  };

  const processAudio = async (blob: Blob, mimeType: string) => {
    setStatus('uploading');
    const token = googleConfig.accessToken!;
    const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
    const fileName = `CarceMind_Memory_${new Date().toISOString()}.${extension}`;

    try {
      const driveFile = await googleApi.uploadFile(token, blob, fileName, googleConfig.audioFolderId!);
      
      setStatus('processing');
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const base64Audio = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(blob);
      });

      const geminiMime = mimeType.split(';')[0];
      const result = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          { parts: [{ inlineData: { data: base64Audio, mimeType: geminiMime } }, { text: "Analiza este pensamiento. Responde solo en JSON con: title, summary, emotionalState, tags, tasks, snippets" }] }
        ],
        config: { responseMimeType: 'application/json' }
      });

      const structuredData = JSON.parse(result.text);
      setResultData(structuredData);

      setStatus('structuring');
      const entryId = crypto.randomUUID();
      const timestamp = new Date().toISOString();

      await googleApi.appendRow(googleConfig.spreadsheetId!, 'ENTRADAS', [
        entryId, timestamp, structuredData.title, structuredData.summary, 
        structuredData.emotionalState, structuredData.tags?.join(', ') || '', 
        driveFile.id, driveFile.webViewLink, structuredData.snippets?.join(' | ') || ''
      ], token);

      setStatus('finished');
      onMemoryAdded({
        id: entryId,
        title: structuredData.title,
        excerpt: structuredData.summary,
        timestamp: new Date(),
        emotionalTag: structuredData.emotionalState,
        type: 'voice'
      });
    } catch (err: any) {
      setStatus('error');
      if (err.message.includes("SESSION_EXPIRED")) {
        setErrorMessage("Tu sesión de Google ha expirado. Ve a Ajustes y reconecta.");
      } else if (err.message.includes("PERMISO_DENEGADO")) {
        setErrorMessage("Faltan permisos. Reconecta en Ajustes y MARCA TODAS las casillas de Google.");
      } else {
        setErrorMessage(`Error: ${err.message}`);
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-full flex flex-col items-center justify-center space-y-12 animate-in fade-in duration-500">
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-semibold tracking-tight">Capa de Ingesta Cognitiva</h2>
        <p className="text-[#A0A6B1]">Tu voz se procesa y se estructura en la nube.</p>
      </div>

      <div className="relative flex flex-col items-center gap-12 w-full">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={['uploading', 'processing', 'structuring'].includes(status)}
          className={`w-40 h-40 rounded-full flex items-center justify-center transition-all duration-500 transform active:scale-95 shadow-2xl ${
            isRecording 
              ? 'bg-red-500/20 text-red-500 border-red-500/30 ring-[12px] ring-red-500/10' 
              : 'bg-gradient-to-tr from-[#5E7BFF] to-[#8A6CFF] text-white'
          }`}
        >
          {isRecording ? <Square fill="currentColor" className="w-10 h-10" /> : <Mic className="w-16 h-16" />}
        </button>

        <div className="w-full max-w-2xl glass p-10 rounded-[3rem] border border-[#1F2330] min-h-[220px] flex flex-col items-center justify-center text-center">
          {['uploading', 'processing', 'structuring'].includes(status) && (
            <div className="space-y-6">
              <Loader2 className="w-10 h-10 animate-spin text-[#5E7BFF] mx-auto" />
              <p className="text-sm font-bold uppercase tracking-widest text-[#5E7BFF]">{status}...</p>
            </div>
          )}

          {status === 'finished' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
              <CheckCircle2 className="w-10 h-10 text-[#10B981] mx-auto" />
              <h4 className="text-xl font-medium">Memoria Estructurada</h4>
              <button onClick={() => setStatus('idle')} className="text-xs underline text-[#646B7B]">Grabar otra</button>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-6 text-red-400">
              <AlertCircle className="w-10 h-10 mx-auto" />
              <p className="text-sm font-medium">{errorMessage}</p>
              <button onClick={() => setStatus('idle')} className="text-xs underline font-bold uppercase tracking-widest">Reintentar</button>
            </div>
          )}

          {status === 'idle' && (
             <div className="space-y-4 opacity-30">
               <BrainCircuit className="w-12 h-12 mx-auto" />
               <p className="text-xs uppercase tracking-widest font-bold">Pulsa para grabar</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecordMemory;
