
import React, { useState } from 'react';
import { googleApi } from '../lib/googleApi';
import { FlaskConical, Send, Loader2, CheckCircle2, AlertCircle, Sparkles, Terminal } from 'lucide-react';

const TestView: React.FC = () => {
  const [prompt, setPrompt] = useState('Di "Conexión establecida, Pablo. CarceMind está en línea."');
  const [response, setResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  const runTest = async () => {
    if (!prompt.trim() || isLoading) return;
    
    setIsLoading(true);
    setStatus('idle');
    setResponse(null);
    setErrorDetails(null);

    try {
      const startTime = Date.now();
      const result = await googleApi.safeAiCall({
        prompt: prompt,
        systemInstruction: "Eres un sistema de diagnóstico para CarceMind. Responde de forma técnica y breve."
      });
      
      const duration = Date.now() - startTime;
      setResponse(`[${duration}ms] Gemini responde: ${result.text}`);
      setStatus('success');
    } catch (err: any) {
      console.error("Test Error:", err);
      setStatus('error');
      setErrorDetails(err.message === "API_KEY_MISSING" ? "La API KEY de Gemini no está configurada en el entorno." : err.message || "Error desconocido.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in duration-700 pb-32">
      <header className="space-y-4 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-[#5E7BFF]">
          <FlaskConical size={12} /> Laboratorio de Diagnóstico
        </div>
        <h2 className="text-5xl font-semibold tracking-tight">Prueba de Conectividad</h2>
        <p className="text-[#646B7B] max-w-xl mx-auto italic">
          Verifica que la API de Gemini está respondiendo correctamente.
        </p>
      </header>

      <section className="glass border border-[#1F2330] p-10 rounded-[3rem] space-y-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
          <Terminal size={150} className="text-[#5E7BFF]" />
        </div>

        <div className="space-y-4">
          <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#646B7B] ml-4">Prompt de Diagnóstico</label>
          <div className="relative">
            <input 
              type="text" 
              value={prompt} 
              onChange={(e) => setPrompt(e.target.value)} 
              onKeyDown={(e) => e.key === 'Enter' && runTest()}
              placeholder="Escribe algo para probar a Gemini..."
              className="w-full bg-black/40 border border-[#1F2330] rounded-3xl py-6 px-8 outline-none focus:border-[#5E7BFF] transition-all text-xl pr-20"
            />
            <button 
              onClick={runTest} 
              disabled={isLoading || !prompt.trim()}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-4 bg-[#5E7BFF] text-white rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
            </button>
          </div>
        </div>

        {status === 'success' && (
          <div className="p-8 rounded-[2rem] bg-[#10B981]/10 border border-[#10B981]/20 space-y-4 animate-in slide-in-from-bottom-2">
            <div className="flex items-center gap-3 text-[#10B981]">
              <CheckCircle2 size={20} />
              <span className="text-[10px] font-bold uppercase tracking-widest">IA en Línea</span>
            </div>
            <p className="text-sm font-medium leading-relaxed italic">
              {response}
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="p-8 rounded-[2rem] bg-red-500/10 border border-red-500/20 space-y-4 animate-in slide-in-from-bottom-2">
            <div className="flex items-center gap-3 text-red-400">
              <AlertCircle size={20} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Fallo de Comunicación</span>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-mono bg-black/30 p-4 rounded-xl text-red-300 overflow-x-auto">
                {errorDetails}
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default TestView;
