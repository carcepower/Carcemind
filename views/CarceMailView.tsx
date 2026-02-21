
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
              <p className="text-[15px] leading-relaxed text-[#F5F7FA]" dangerouslySetInnerHTML={{ __html: content.replace(/\*\*(.*?)\*\*/g, '<b class="text-white font-semibold">$1</b>') }} />
            </div>
          );
        }
        return <p key={i} className="text-[15px] leading-relaxed text-[#A0A6B1]" dangerouslySetInnerHTML={{ __html: content.replace(/\*\*(.*?)\*\*/g, '<b class="text-white font-semibold">$1</b>') }} />;
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
    setPrompt(''); 

    try {
      // 1. LOG DE USUARIO
      if (googleConfig.isConnected && googleConfig.spreadsheetId && googleConfig.accessToken) {
        await googleApi.appendRow(googleConfig.spreadsheetId, 'MAIL_LOG', [Date.now().toString(), new Date().toISOString(), "USER", currentPrompt, ""], googleConfig.accessToken);
      }

      // 2. Extraer términos de búsqueda optimizados
      const extraction = await googleApi.safeAiCall({
        prompt: `Genera una consulta de búsqueda para Gmail (puedes usar operadores como from:, subject:, etc.) para: "${currentPrompt}"`,
        systemInstruction: "Eres un experto en búsqueda de Gmail. Responde SOLO con los términos de búsqueda, sin texto adicional ni comillas."
      });

      const searchTerms = extraction.text?.trim().replace(/`/g, '') || currentPrompt;

      // 3. Buscar en Gmail (incrementado a 15 resultados)
      const messages = await googleApi.searchGmail(config.accessToken!, searchTerms, 15);
      
      if (!messages || messages.length === 0) {
        const noResultsText = `No he encontrado correos para la búsqueda: "${searchTerms}".`;
        setHistory(prev => [{ prompt: currentPrompt, answer: noResultsText, results: [] }, ...prev]);
        return;
      }

      // 4. Obtener detalles e INCLUIR REMITENTE
      const detailed = await Promise.all(messages.map((m: any) => googleApi.getGmailMessage(config.accessToken!, m.id)));
      const snippets = detailed.map(m => {
        const subject = m.payload.headers.find((h: any) => h.name === 'Subject')?.value || 'Sin asunto';
        const from = m.payload.headers.find((h: any) => h.name === 'From')?.value || 'Remitente desconocido';
        return `DE: ${from} | ASUNTO: ${subject} | RESUMEN: ${m.snippet}`;
      }).join('\n\n');
      
      // 5. Análisis Final con contexto completo
      const response = await googleApi.safeAiCall({
        prompt: `Basado en estos correos encontrados:\n${snippets}\n\nResponde a la consulta de Pablo: "${currentPrompt}"`,
        systemInstruction: "Eres el analista de CarceMail. Tu objetivo es encontrar la información exacta que pide Pablo. Si pide correos de una fuente específica (como NeuraNews), identifícalos por el campo 'DE:'. Responde de forma clara y profesional.",
        usePro: true
      });
      
      const answerText = response.text || "No he podido analizar los resultados correctamente.";
      
      // 6. UI e Historial
      setHistory(prev => [{ prompt: currentPrompt, answer: answerText, results: detailed }, ...prev]);
      
      // 7. LOG DE IA
      if (googleConfig.isConnected && googleConfig.spreadsheetId && googleConfig.accessToken) {
        await googleApi.appendRow(googleConfig.spreadsheetId, 'MAIL_LOG', [Date.now().toString(), new Date().toISOString(), "AI", answerText, searchTerms], googleConfig.accessToken);
      }

    } catch (err: any) { 
      console.error("Gmail Analysis Error:", err);
      setError("Ha ocurrido un error al consultar tu bandeja de entrada."); 
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
        <div className="p-10 rounded-[2.5rem] bg-red-500/5 border border-red-500/20 text-red-400 space-y-6 animate-in zoom-in-95">
          <div className="flex items-center gap-4">
            <AlertCircle size={24} /> 
            <div>
               <p className="text-sm font-bold uppercase tracking-widest">Atención</p>
               <p className="text-xs opacity-80 leading-relaxed">{error}</p>
            </div>
          </div>
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
                  {interaction.results.slice(0, 4).map((msg, idx) => (
                    <div key={idx} className="bg-black/20 border border-white/5 p-6 rounded-2xl space-y-2 group hover:border-[#5E7BFF]/30 transition-all">
                      <div className="text-[9px] font-bold text-[#5E7BFF] uppercase tracking-widest truncate">
                        {msg.payload.headers.find((h: any) => h.name === 'From')?.value.split('<')[0]}
                      </div>
                      <h6 className="font-semibold text-sm truncate">{msg.payload.headers.find((h: any) => h.name === 'Subject')?.value}</h6>
                      <p className="text-[10px] text-[#646B7B] line-clamp-2 leading-relaxed">{msg.snippet}</p>
                      <button onClick={() => window.open(`https://mail.google.com/mail/u/0/#inbox/${msg.id}`, '_blank')} className="text-[9px] font-bold text-white/40 group-hover:text-[#5E7BFF] uppercase tracking-widest pt-2 flex items-center gap-1 transition-colors">Abrir en Gmail <ExternalLink size={10} /></button>
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
