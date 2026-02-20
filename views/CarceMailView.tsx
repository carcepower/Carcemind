
import { GmailConfig, GoogleConfig } from '../types';
import { googleApi } from '../lib/googleApi';
import { Mail, Search, Loader2, ExternalLink, AlertCircle, LogOut, Sparkles, ArrowRight, Circle } from 'lucide-react';
import React, { useState } from 'react';

interface CarceMailViewProps { 
  config: GmailConfig; 
  setConfig: React.Dispatch<React.SetStateAction<GmailConfig>>;
  history: { prompt: string, answer: string, results: any[] }[];
  setHistory: React.Dispatch<React.SetStateAction<{ prompt: string, answer: string, results: any[] }[]>>;
  googleConfig: GoogleConfig;
}

const CLIENT_ID = "660418616677-8rbbg21t1ksej5vuso1ou9r7sue8ma3a.apps.googleusercontent.com"; 

const FormattedResponse: React.FC<{ text: string }> = ({ text }) => {
  const lines = text.split('\n');
  return (
    <div className="space-y-4">
      {lines.map((line, i) => {
        let content = line.trim();
        if (!content) return null;
        const isListItem = content.startsWith('*') || content.startsWith('-') || /^\d+\./.test(content);
        if (isListItem) {
          content = content.replace(/^[*-\d.]+\s*/, '');
          return (
            <div key={i} className="flex gap-4 pl-2 items-start">
              <div className="mt-2 shrink-0"><Circle size={6} fill="#5E7BFF" className="text-[#5E7BFF]" /></div>
              <p className="text-[15px] leading-relaxed text-[#F5F7FA]" dangerouslySetInnerHTML={{ __html: content.replace(/\*\*(.*?)\*\*/g, '<b class="text-white">$1</b>') }} />
            </div>
          );
        }
        return <p key={i} className="text-[15px] leading-relaxed text-[#A0A6B1]" dangerouslySetInnerHTML={{ __html: content.replace(/\*\*(.*?)\*\*/g, '<b class="text-white">$1</b>') }} />;
      })}
    </div>
  );
};

const CarceMailView: React.FC<CarceMailViewProps> = ({ config, setConfig, history, setHistory, googleConfig }) => {
  const [prompt, setPrompt] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnectGmail = () => {
    try {
      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email openid',
        callback: (response: any) => {
          if (response.access_token) {
            fetch('https://www.googleapis.com/oauth2/v2/userinfo', { headers: { Authorization: `Bearer ${response.access_token}` } })
            .then(res => res.json()).then(user => setConfig({ isConnected: true, accessToken: response.access_token, email: user.email }));
          }
        },
      }); client.requestAccessToken();
    } catch (e) { setError("Fallo al conectar Gmail."); }
  };

  const handleSearch = async () => {
    const currentPrompt = prompt.trim();
    if (!currentPrompt || isSearching) return;
    
    setIsSearching(true); 
    setError(null);
    setPrompt(''); // Limpiamos la UI inmediatamente para dar sensación de velocidad

    try {
      // 1. GUARDAR CONSULTA DEL USUARIO EN LOG INMEDIATAMENTE
      if (googleConfig.isConnected && googleConfig.spreadsheetId && googleConfig.accessToken) {
        await googleApi.appendRow(
          googleConfig.spreadsheetId, 
          'MAIL_LOG', 
          [Date.now().toString(), new Date().toISOString(), "USER", currentPrompt, ""], 
          googleConfig.accessToken
        );
      }

      // 2. Extraer términos de búsqueda con Gemini
      const extraction = await googleApi.safeAiCall({
        prompt: `Analiza esta petición y devuelve únicamente los términos de búsqueda ideales para Gmail: "${currentPrompt}"`,
        systemInstruction: "Eres un experto en búsqueda de Gmail. Devuelve solo los términos clave, sin explicaciones."
      });

      const searchTerms = extraction.text?.trim() || currentPrompt;

      // 3. Buscar en Gmail
      const messages = await googleApi.searchGmail(config.accessToken!, searchTerms, 5);
      
      if (!messages || messages.length === 0) {
        const noResultsText = "Pablo, no he encontrado correos que coincidan con esa búsqueda en tu bandeja de entrada.";
        setHistory(prev => [{ prompt: currentPrompt, answer: noResultsText, results: [] }, ...prev]);
        
        // Log de respuesta vacía
        if (googleConfig.isConnected && googleConfig.spreadsheetId && googleConfig.accessToken) {
          await googleApi.appendRow(googleConfig.spreadsheetId, 'MAIL_LOG', [Date.now().toString(), new Date().toISOString(), "AI", noResultsText, searchTerms], googleConfig.accessToken);
        }
        return;
      }

      // 4. Obtener detalles de correos
      const detailed = await Promise.all(messages.map((m: any) => googleApi.getGmailMessage(config.accessToken!, m.id)));
      const snippets = detailed.map(m => {
        const subject = m.payload.headers.find((h: any) => h.name === 'Subject')?.value || 'Sin asunto';
        return `Asunto: ${subject} | Resumen: ${m.snippet}`;
      }).join('\n');
      
      // 5. Generar respuesta final con Gemini
      const response = await googleApi.safeAiCall({
        prompt: `Basado en estos correos:\n${snippets}\n\nResponde a la consulta de Pablo: "${currentPrompt}"`,
        systemInstruction: "Eres el analista de CarceMail. Responde de forma ejecutiva, impecable y directa. Si hay fechas o datos clave, destácalos.",
        usePro: true
      });
      
      const answerText = response.text || "No he podido extraer una conclusión clara.";
      
      // 6. Actualizar UI
      setHistory(prev => [{ prompt: currentPrompt, answer: answerText, results: detailed }, ...prev]);
      
      // 7. GUARDAR RESPUESTA DE LA IA EN LOG
      if (googleConfig.isConnected && googleConfig.spreadsheetId && googleConfig.accessToken) {
        await googleApi.appendRow(
          googleConfig.spreadsheetId, 
          'MAIL_LOG', 
          [Date.now().toString(), new Date().toISOString(), "AI", answerText, searchTerms], 
          googleConfig.accessToken
        );
      }

    } catch (err: any) { 
      console.error("Gmail Analysis Error:", err);
      let userMsg = "He tenido un problema al analizar tus correos.";
      if (err.message === "KEY_MISSING") {
        userMsg = "Error: La API KEY de Gemini no está configurada correctamente en el entorno.";
      }
      setError(userMsg); 
    } finally { 
      setIsSearching(false); 
    }
  };

  if (!config.isConnected) return (
    <div className="max-w-4xl mx-auto h-[75vh] flex flex-col items-center justify-center space-y-12 animate-in fade-in">
      <div className="w-24 h-24 rounded-[2.5rem] bg-gradient-to-tr from-[#5E7BFF] to-[#8A6CFF] flex items-center justify-center shadow-2xl animate-pulse-soft"><Mail className="w-12 h-12 text-white" /></div>
      <button onClick={handleConnectGmail} className="px-10 py-5 rounded-2xl bg-white text-black font-bold flex items-center gap-3 hover:scale-105 transition-all shadow-xl">Conectar CarceMail</button>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in pb-32">
      <header className="flex justify-between items-end">
        <div className="space-y-2">
          <p className="text-[#5E7BFF] text-xs font-bold uppercase tracking-widest">Consultor de Emails</p>
          <h2 className="text-4xl font-semibold tracking-tight">CarceMail Inbox</h2>
        </div>
        <button onClick={() => setConfig({ isConnected: false, email: null, accessToken: null })} className="text-[#646B7B] text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:text-red-400"><LogOut size={14} /> Desconectar</button>
      </header>

      <div className="relative glass border border-[#1F2330] rounded-[2.5rem] p-8 flex items-center gap-6 shadow-2xl">
        <Search className="text-[#646B7B]" />
        <input 
          type="text" 
          value={prompt} 
          onChange={(e) => setPrompt(e.target.value)} 
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()} 
          placeholder="Busca en tus correos..." 
          className="flex-1 bg-transparent outline-none text-xl placeholder:text-[#646B7B]" 
        />
        <button onClick={handleSearch} disabled={isSearching || !prompt.trim()} className="p-5 bg-[#5E7BFF] text-white rounded-3xl hover:bg-[#4A63CC] transition-all disabled:opacity-50">
          {isSearching ? <Loader2 className="animate-spin" /> : <ArrowRight />}
        </button>
      </div>

      {error && (
        <div className="p-8 rounded-3xl bg-red-500/5 border border-red-500/20 text-red-400 flex flex-col gap-2">
          <div className="flex items-center gap-4">
            <AlertCircle size={20} /> <p className="text-sm font-bold uppercase tracking-widest">Atención</p>
          </div>
          <p className="text-xs pl-9 opacity-80">{error}</p>
        </div>
      )}

      <div className="space-y-16">
        {history.map((interaction, i) => (
          <div key={i} className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-end">
              <div className="bg-[#151823] border border-[#1F2330] p-6 rounded-[2rem] max-w-[80%] text-right italic text-[#A0A6B1]">"{interaction.prompt}"</div>
            </div>
            
            <div className="p-12 rounded-[3rem] bg-[#151823] border border-[#1F2330] space-y-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10"><Sparkles size={100} className="text-[#5E7BFF]" /></div>
              <div className="flex items-center gap-3 text-[#5E7BFF]"><Sparkles size={20} /><h4 className="font-bold text-[10px] uppercase tracking-widest">Análisis de CarceMail</h4></div>
              <FormattedResponse text={interaction.answer} />
              
              {interaction.results.length > 0 && (
                <div className="pt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {interaction.results.slice(0, 2).map((msg, idx) => (
                    <div key={idx} className="bg-black/20 border border-white/5 p-6 rounded-2xl space-y-2">
                      <h6 className="font-semibold text-sm truncate">{msg.payload.headers.find((h: any) => h.name === 'Subject')?.value}</h6>
                      <p className="text-[10px] text-[#646B7B] line-clamp-2 leading-relaxed">{msg.snippet}</p>
                      <button onClick={() => window.open(`https://mail.google.com/mail/u/0/#inbox/${msg.id}`, '_blank')} className="text-[9px] font-bold text-[#5E7BFF] uppercase tracking-widest pt-2 flex items-center gap-1">Ver en Gmail <ExternalLink size={10} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CarceMailView;
