
import React, { useState } from 'react';
import { GmailConfig } from '../types';
import { googleApi } from '../lib/googleApi';
import { GoogleGenAI } from '@google/genai';
import { 
  Mail, 
  Search, 
  Loader2, 
  User, 
  ExternalLink, 
  AlertCircle, 
  LogOut,
  Sparkles,
  ArrowRight,
  ShieldCheck
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
        prompt: 'select_account',
        callback: (response: any) => {
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

      // 1. Traducir lenguaje natural a query de Gmail
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
      console.log("Query generada:", gmailQuery);

      // 2. Buscar en Gmail
      const messages = await googleApi.searchGmail(config.accessToken!, gmailQuery, 5);
      
      if (!messages || messages.length === 0) {
        setAiAnswer("No he encontrado ningún correo que coincida con esa búsqueda en esta cuenta.");
        setIsSearching(false);
        return;
      }

      // 3. Obtener detalles de los primeros correos
      const detailedMessages = await Promise.all(
        messages.map((m: any) => googleApi.getGmailMessage(config.accessToken!, m.id))
      );

      const snippets = detailedMessages.map(m => {
        const from = m.payload.headers.find((h: any) => h.name === 'From')?.value || 'Desconocido';
        const subject = m.payload.headers.find((h: any) => h.name === 'Subject')?.value || 'Sin asunto';
        const date = m.payload.headers.find((h: any) => h.name === 'Date')?.value || '';
        return `DE: ${from} | ASUNTO: ${subject} | FECHA: ${date} | RESUMEN: ${m.snippet}`;
      }).join('\n---\n');

      // 4. Gemini analiza los resultados y responde
      const answerPrompt = `
        Basándote en estos correos encontrados en el Gmail del usuario:
        ${snippets}
        
        Responde a la pregunta original del usuario: "${prompt}".
        Si encuentras la información específica (ej. el importe de una factura), indícala claramente.
        Sé profesional y conciso.
      `;

      const finalResult = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: answerPrompt
      });

      setAiAnswer(finalResult.text);
      setResults(detailedMessages);

    } catch (err: any) {
      setError("Error en el procesamiento de CarceMail. Asegúrate de que la cuenta tenga permisos.");
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  if (!config.isConnected) {
    return (
      <div className="max-w-4xl mx-auto h-[70vh] flex flex-col items-center justify-center space-y-8 animate-in fade-in duration-700">
        <div className="w-20 h-20 rounded-[2rem] bg-gradient-to-tr from-[#5E7BFF] to-[#8A6CFF] flex items-center justify-center shadow-2xl shadow-[#5E7BFF33]">
          <Mail className="w-10 h-10 text-white" />
        </div>
        <div className="text-center space-y-4 max-w-sm">
          <h2 className="text-3xl font-semibold tracking-tight">CarceMail</h2>
          <p className="text-[#A0A6B1] text-sm leading-relaxed">Conecta una cuenta de Gmail diferente para buscar facturas, citas o información importante mediante IA.</p>
        </div>
        <button 
          onClick={handleConnectGmail}
          className="px-10 py-5 rounded-2xl bg-white text-black font-bold flex items-center gap-3 hover:scale-105 transition-all shadow-xl"
        >
          <Mail size={18} /> Conectar Gmail Independiente
        </button>
        <div className="flex items-center gap-2 text-[10px] font-bold text-[#646B7B] uppercase tracking-widest pt-4">
          <ShieldCheck size={12} className="text-[#10B981]" /> Solo lectura habilitada
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-500 pb-32">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
             <p className="text-[#5E7BFF] text-sm uppercase tracking-widest font-bold">Inteligencia de Correo</p>
             <div className="px-3 py-1 rounded-full bg-[#10B981]/10 border border-[#10B981]/20 text-[#10B981] text-[9px] font-bold tracking-tighter uppercase">
               {config.email}
             </div>
          </div>
          <h2 className="text-4xl font-semibold tracking-tight">Consultar CarceMail</h2>
        </div>
        <button 
          onClick={() => setConfig({ isConnected: false, email: null, accessToken: null })}
          className="text-[#646B7B] hover:text-red-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 transition-colors"
        >
          <LogOut size={14} /> Cambiar Cuenta
        </button>
      </header>

      {/* Search Input */}
      <div className="relative group">
        <div className="absolute inset-0 bg-gradient-to-r from-[#5E7BFF] to-[#8A6CFF] rounded-3xl blur-xl opacity-10 group-focus-within:opacity-20 transition-opacity" />
        <div className="relative glass border border-[#1F2330] rounded-3xl p-6 flex items-center gap-4">
          <Search className="text-[#646B7B]" />
          <input 
            type="text" 
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Ej: Búscame un email sobre una factura de luz de Talent Academy..."
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

      {/* AI Answer Section */}
      {aiAnswer && (
        <div className="animate-in slide-in-from-top-4 duration-500">
          <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-[#151823] to-[#0B0D12] border border-[#1F2330] space-y-6">
            <div className="flex items-center gap-3 text-[#5E7BFF]">
              <Sparkles size={20} className="animate-pulse-soft" />
              <h4 className="font-bold text-xs uppercase tracking-widest">Respuesta de CarceMail</h4>
            </div>
            <p className="text-lg leading-relaxed text-[#F5F7FA]">{aiAnswer}</p>
          </div>
        </div>
      )}

      {/* Results List */}
      <div className="space-y-4">
        {results.length > 0 && (
          <h5 className="text-[10px] font-bold uppercase tracking-widest text-[#646B7B] px-4">Evidencias encontradas</h5>
        )}
        {results.map((msg, idx) => {
          const from = msg.payload.headers.find((h: any) => h.name === 'From')?.value || '';
          const subject = msg.payload.headers.find((h: any) => h.name === 'Subject')?.value || '';
          const date = new Date(msg.payload.headers.find((h: any) => h.name === 'Date')?.value || '').toLocaleDateString();
          
          return (
            <div key={idx} className="glass border border-[#1F2330] p-6 rounded-3xl space-y-4 hover:bg-[#151823] transition-all animate-in fade-in duration-300">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-[#5E7BFF] uppercase tracking-tighter truncate max-w-[250px]">{from}</p>
                  <h6 className="text-sm font-semibold">{subject}</h6>
                </div>
                <span className="text-[10px] font-mono text-[#646B7B]">{date}</span>
              </div>
              <p className="text-xs text-[#A0A6B1] leading-relaxed line-clamp-2 italic">"{msg.snippet}"</p>
              <button 
                onClick={() => window.open(`https://mail.google.com/mail/u/0/#inbox/${msg.id}`, '_blank')}
                className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-[#646B7B] hover:text-white transition-colors"
              >
                Abrir en Gmail <ExternalLink size={10} />
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
