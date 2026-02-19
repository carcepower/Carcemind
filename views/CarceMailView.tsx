
import React, { useState } from 'react';
import { GmailConfig } from '../types';
import { googleApi } from '../lib/googleApi';
import { GoogleGenAI } from '@google/genai';
import { 
  Mail, 
  Search, 
  Loader2, 
  ExternalLink, 
  AlertCircle, 
  LogOut,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Info
} from 'lucide-react';

interface CarceMailViewProps {
  config: GmailConfig;
  setConfig: React.Dispatch<React.SetStateAction<GmailConfig>>;
}

const CLIENT_ID = "660418616677-8rbbg21t1ksej5vuso1ou9r7sue8ma3a.apps.googleusercontent.com"; 

const CarceMailView: React.FC<CarceMailViewProps> = ({ config, setConfig }) => {
  const [prompt, setPrompt] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getApiKey = () => (process.env as any).API_KEY;

  const handleConnectGmail = () => {
    setError(null);
    try {
      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email openid',
        prompt: 'consent select_account',
        callback: (response: any) => {
          if (response.error) {
            setError(`Error Google: ${response.error} - ${response.error_description || ''}`);
            return;
          }
          if (response.access_token) {
            fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
              headers: { Authorization: `Bearer ${response.access_token}` }
            })
            .then(res => res.json())
            .then(user => {
              setConfig({ isConnected: true, accessToken: response.access_token, email: user.email });
            });
          }
        },
      });
      client.requestAccessToken();
    } catch (e) { setError("Error al iniciar conexión con Gmail."); }
  };

  const handleSearch = async () => {
    if (!prompt.trim() || isSearching) return;
    setIsSearching(true);
    setError(null);
    setAiAnswer(null);
    setResults([]);

    try {
      const apiKey = getApiKey();
      const ai = new GoogleGenAI({ apiKey });

      const extractionPrompt = `
        Convierte esta petición de usuario en una consulta técnica válida para la API de Gmail (operadores: from, subject, has:attachment, etc.).
        Petición: "${prompt}"
        Responde ÚNICAMENTE con la cadena de búsqueda. Ejemplo: "subject:factura Talent Academy"
      `;

      const extractionResult = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: extractionPrompt
      });

      const gmailQuery = extractionResult.text.trim().replace(/"/g, '');
      const messages = await googleApi.searchGmail(config.accessToken!, gmailQuery, 5);
      
      if (!messages || messages.length === 0) {
        setAiAnswer("No he encontrado nada en esta cuenta de Gmail con esa consulta específica.");
        setIsSearching(false);
        return;
      }

      const detailedMessages = await Promise.all(
        messages.map((m: any) => googleApi.getGmailMessage(config.accessToken!, m.id))
      );

      const snippets = detailedMessages.map(m => {
        const from = m.payload.headers.find((h: any) => h.name === 'From')?.value || 'Desconocido';
        const subject = m.payload.headers.find((h: any) => h.name === 'Subject')?.value || 'Sin asunto';
        return `DE: ${from} | ASUNTO: ${subject} | RESUMEN: ${m.snippet}`;
      }).join('\n---\n');

      const answerPrompt = `
        Basándote en estos correos:
        ${snippets}
        Responde a: "${prompt}". Sé conciso.
      `;

      const finalResult = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: answerPrompt
      });

      setAiAnswer(finalResult.text);
      setResults(detailedMessages);

    } catch (err: any) {
      setError("Error de búsqueda. Es posible que el token haya expirado.");
    } finally {
      setIsSearching(false);
    }
  };

  if (!config.isConnected) {
    return (
      <div className="max-w-4xl mx-auto h-[75vh] flex flex-col items-center justify-center space-y-12 animate-in fade-in duration-700">
        <div className="w-24 h-24 rounded-[2.5rem] bg-gradient-to-tr from-[#5E7BFF] to-[#8A6CFF] flex items-center justify-center shadow-2xl shadow-[#5E7BFF44]">
          <Mail className="w-12 h-12 text-white" />
        </div>
        
        <div className="text-center space-y-4 max-w-md">
          <h2 className="text-4xl font-semibold tracking-tight">CarceMail</h2>
          <p className="text-[#A0A6B1] text-sm leading-relaxed px-4">Busca información en tus correos sin salir de la app. Requiere autorización previa del email en tu Google Cloud Console.</p>
        </div>
        
        <div className="flex flex-col items-center gap-6 w-full max-w-sm">
          <button 
            onClick={handleConnectGmail}
            className="w-full py-5 rounded-2xl bg-white text-black font-bold flex items-center justify-center gap-3 hover:scale-105 transition-all shadow-2xl group"
          >
            <Mail size={18} /> Conectar Cuenta de Correo
          </button>

          <div className="w-full p-6 rounded-3xl bg-amber-500/5 border border-amber-500/10 space-y-4">
             <div className="flex items-start gap-3 text-amber-500">
               <Info size={16} className="shrink-0 mt-0.5" />
               <p className="text-[11px] leading-relaxed font-medium uppercase tracking-tight">Aviso importante para el Error 403</p>
             </div>
             <p className="text-[10px] text-[#646B7B] leading-relaxed">
               Si recibes un error de "Acceso Bloqueado", asegúrate de que el email esté en <b>Test Users</b> y usa el botón <b>Configuración Avanzada</b> si aparece.
             </p>
             <a href="https://console.cloud.google.com/" target="_blank" className="flex items-center gap-2 text-[10px] font-bold text-amber-500 hover:underline">
               Abrir Google Console <ExternalLink size={10} />
             </a>
          </div>
        </div>

        <div className="flex items-center gap-3 px-6 py-2 rounded-full bg-white/5 border border-white/5 text-[10px] font-bold text-[#646B7B] uppercase tracking-[0.2em]">
          <ShieldCheck size={14} className="text-[#10B981]" /> Seguridad de Solo Lectura
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-500 pb-32">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
             <p className="text-[#5E7BFF] text-sm uppercase tracking-widest font-bold">Consultor CarceMail</p>
             <div className="px-3 py-1 rounded-full bg-[#10B981]/10 border border-[#10B981]/20 text-[#10B981] text-[9px] font-bold tracking-tighter uppercase">
               {config.email}
             </div>
          </div>
          <h2 className="text-4xl font-semibold tracking-tight">Inteligencia de Correo</h2>
        </div>
        <button 
          onClick={() => setConfig({ isConnected: false, email: null, accessToken: null })}
          className="text-[#646B7B] hover:text-red-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 transition-colors"
        >
          <LogOut size={14} /> Cerrar Sesión
        </button>
      </header>

      <div className="relative group">
        <div className="absolute inset-0 bg-gradient-to-r from-[#5E7BFF] to-[#8A6CFF] rounded-3xl blur-xl opacity-10 group-focus-within:opacity-20 transition-opacity" />
        <div className="relative glass border border-[#1F2330] rounded-3xl p-6 flex items-center gap-4">
          <Search className="text-[#646B7B]" />
          <input 
            type="text" 
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Ej: ¿Qué facturas tengo de Talent Academy?"
            className="flex-1 bg-transparent outline-none text-lg placeholder:text-[#646B7B]"
          />
          <button 
            onClick={handleSearch}
            disabled={isSearching || !prompt.trim()}
            className="p-4 bg-[#5E7BFF] text-white rounded-2xl hover:bg-[#4A63CC] transition-all disabled:opacity-50 active:scale-95"
          >
            {isSearching ? <Loader2 className="animate-spin" /> : <ArrowRight />}
          </button>
        </div>
      </div>

      {aiAnswer && (
        <div className="animate-in slide-in-from-top-4 duration-500">
          <div className="p-10 rounded-[2.5rem] bg-gradient-to-br from-[#151823] to-[#0B0D12] border border-[#1F2330] space-y-6">
            <div className="flex items-center gap-3 text-[#5E7BFF]">
              <Sparkles size={20} className="animate-pulse-soft" />
              <h4 className="font-bold text-xs uppercase tracking-widest">Resumen de CarceMail</h4>
            </div>
            <p className="text-xl leading-relaxed text-[#F5F7FA]">{aiAnswer}</p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {results.length > 0 && (
          <h5 className="text-[10px] font-bold uppercase tracking-widest text-[#646B7B] px-4">Correos Consultados</h5>
        )}
        {results.map((msg, idx) => {
          const from = msg.payload.headers.find((h: any) => h.name === 'From')?.value || '';
          const subject = msg.payload.headers.find((h: any) => h.name === 'Subject')?.value || '';
          const date = new Date(msg.payload.headers.find((h: any) => h.name === 'Date')?.value || '').toLocaleDateString();
          
          return (
            <div key={idx} className="glass border border-[#1F2330] p-8 rounded-[2rem] space-y-4 hover:bg-[#151823] transition-all animate-in fade-in duration-300">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-[#5E7BFF] uppercase tracking-tighter truncate max-w-[300px]">{from}</p>
                  <h6 className="text-base font-semibold">{subject}</h6>
                </div>
                <span className="text-[10px] font-mono text-[#646B7B]">{date}</span>
              </div>
              <p className="text-xs text-[#A0A6B1] leading-relaxed line-clamp-2 italic">"{msg.snippet}"</p>
              <button 
                onClick={() => window.open(`https://mail.google.com/mail/u/0/#inbox/${msg.id}`, '_blank')}
                className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-[#646B7B] hover:text-white transition-colors"
              >
                Ver completo en Gmail <ExternalLink size={10} />
              </button>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-4">
          <AlertCircle className="shrink-0" />
          <p className="text-xs font-bold uppercase tracking-widest">{error}</p>
        </div>
      )}
    </div>
  );
};

export default CarceMailView;
