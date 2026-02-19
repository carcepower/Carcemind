
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
  ArrowRight
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

  const handleConnectGmail = () => {
    setError(null);
    try {
      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email openid',
        prompt: 'consent select_account',
        callback: (response: any) => {
          if (response.error) {
            setError(`Error Google Auth: ${response.error}`);
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
    } catch (e) { setError("No se pudo iniciar el proceso de login."); }
  };

  const handleSearch = async () => {
    if (!prompt.trim() || isSearching) return;
    setIsSearching(true);
    setError(null);
    setAiAnswer(null);
    setResults([]);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

      const extractionResult = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Convierte a consulta Gmail: "${prompt}". Responde solo la consulta.`
      });

      const gmailQuery = extractionResult.text.trim();
      const messages = await googleApi.searchGmail(config.accessToken!, gmailQuery, 5);
      
      if (!messages || messages.length === 0) {
        setAiAnswer(`No hay correos para: "${gmailQuery}"`);
        setIsSearching(false);
        return;
      }

      const detailedMessages = await Promise.all(
        messages.map((m: any) => googleApi.getGmailMessage(config.accessToken!, m.id))
      );

      const snippets = detailedMessages.map(m => `Asunto: ${m.payload.headers.find((h: any) => h.name === 'Subject')?.value} | Resumen: ${m.snippet}`).join('\n');

      const finalResult = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Basado en esto: ${snippets}, responde a: "${prompt}"`
      });

      setAiAnswer(finalResult.text);
      setResults(detailedMessages);

    } catch (err: any) {
      console.error(err);
      setError(err.message?.includes("API_KEY") ? "Falta la API_KEY en el entorno." : "Error al consultar la IA.");
    } finally {
      setIsSearching(false);
    }
  };

  if (!config.isConnected) {
    return (
      <div className="max-w-4xl mx-auto h-[75vh] flex flex-col items-center justify-center space-y-12 animate-in fade-in duration-700">
        <div className="w-24 h-24 rounded-[2.5rem] bg-gradient-to-tr from-[#5E7BFF] to-[#8A6CFF] flex items-center justify-center shadow-2xl">
          <Mail className="w-12 h-12 text-white" />
        </div>
        <div className="text-center space-y-4 max-w-md">
          <h2 className="text-4xl font-semibold tracking-tight">CarceMail</h2>
          <p className="text-[#A0A6B1] text-sm">Gestiona tu correo con inteligencia artificial.</p>
        </div>
        <button 
          onClick={handleConnectGmail}
          className="px-10 py-5 rounded-2xl bg-white text-black font-bold flex items-center gap-3 hover:scale-105 transition-all shadow-xl"
        >
          <Mail size={18} /> Conectar Gmail
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-500 pb-32">
      <header className="flex justify-between items-end">
        <div className="space-y-2">
          <p className="text-[#5E7BFF] text-sm uppercase tracking-widest font-bold">Consultor CarceMail</p>
          <h2 className="text-4xl font-semibold tracking-tight">Inteligencia de Correo</h2>
        </div>
        <button 
          onClick={() => setConfig({ isConnected: false, email: null, accessToken: null })}
          className="text-[#646B7B] hover:text-red-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2"
        >
          <LogOut size={14} /> Cerrar Sesión
        </button>
      </header>

      <div className="relative glass border border-[#1F2330] rounded-3xl p-6 flex items-center gap-4">
        <Search className="text-[#646B7B]" />
        <input 
          type="text" 
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Busca algo en tus correos..."
          className="flex-1 bg-transparent outline-none text-lg placeholder:text-[#646B7B]"
        />
        <button 
          onClick={handleSearch}
          disabled={isSearching || !prompt.trim()}
          className="p-4 bg-[#5E7BFF] text-white rounded-2xl hover:bg-[#4A63CC] transition-all disabled:opacity-50"
        >
          {isSearching ? <Loader2 className="animate-spin" /> : <ArrowRight />}
        </button>
      </div>

      {aiAnswer && (
        <div className="p-10 rounded-[2.5rem] bg-[#151823] border border-[#1F2330] space-y-4">
          <div className="flex items-center gap-3 text-[#5E7BFF]">
            <Sparkles size={18} />
            <h4 className="font-bold text-xs uppercase tracking-widest">IA CarceMail</h4>
          </div>
          <p className="text-lg leading-relaxed text-[#F5F7FA]">{aiAnswer}</p>
        </div>
      )}

      {error && (
        <div className="p-8 rounded-[2rem] bg-red-500/5 border border-red-500/20 text-red-400 flex items-center gap-4">
          <AlertCircle size={20} />
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        {results.map((msg, idx) => (
          <div key={idx} className="glass border border-[#1F2330] p-6 rounded-[2rem] space-y-3">
            <h6 className="font-semibold">{msg.payload.headers.find((h: any) => h.name === 'Subject')?.value}</h6>
            <p className="text-xs text-[#A0A6B1] italic">"{msg.snippet}"</p>
            <button 
              onClick={() => window.open(`https://mail.google.com/mail/u/0/#inbox/${msg.id}`, '_blank')}
              className="text-[9px] font-bold text-[#646B7B] uppercase tracking-widest hover:text-white"
            >
              Ver en Gmail <ExternalLink size={10} className="inline ml-1" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CarceMailView;
