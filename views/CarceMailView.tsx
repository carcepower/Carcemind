import React, { useState } from 'react';
import { GmailConfig, GoogleConfig } from '../types';
import { googleApi } from '../lib/googleApi';
import { GoogleGenAI } from '@google/genai';
import { Mail, Search, Loader2, ExternalLink, AlertCircle, LogOut, Sparkles, ArrowRight, Circle } from 'lucide-react';

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
  const [results, setResults] = useState<any[]>([]);
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
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
    if (!prompt.trim() || isSearching) return;
    setIsSearching(true); setError(null); setAiAnswer(null); setResults([]);
    try {
      // Guidelines: Access process.env.API_KEY directly.
      if (!process.env.API_KEY) throw new Error("API_KEY_MISSING");
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const extraction = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: `Extract search query from: "${prompt}". Just the query.` });
      const messages = await googleApi.searchGmail(config.accessToken!, extraction.text.trim(), 5);
      
      if (messages.length === 0) { 
        setAiAnswer("No se encontraron correos relevantes."); 
        setIsSearching(false);
        return; 
      }

      const detailed = await Promise.all(messages.map((m: any) => googleApi.getGmailMessage(config.accessToken!, m.id)));
      const snippets = detailed.map(m => `Subj: ${m.payload.headers.find((h: any) => h.name === 'Subject')?.value} | Body: ${m.snippet}`).join('\n');
      
      const answerResponse = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: `Answer based on these emails:\n${snippets}\nUser asks: "${prompt}". BE FRIENDLY, USE PARAGRAPHS, REMOVE ASTERISKS.` });
      const answerText = answerResponse.text;
      
      setAiAnswer(answerText); 
      setResults(detailed);
      
      // Update local history
      const newEntry = { prompt, answer: answerText, results: detailed };
      setHistory(prev => [newEntry, ...prev.slice(0, 9)]);

      // Save to Cloud MAIL_LOG if possible
      if (googleConfig.isConnected && googleConfig.spreadsheetId && googleConfig.accessToken) {
        try {
          await googleApi.appendRow(googleConfig.spreadsheetId, 'MAIL_LOG', [
            Date.now().toString(),
            new Date().toISOString(),
            prompt,
            answerText,
            JSON.stringify(detailed.map(m => ({ id: m.id, snippet: m.snippet })))
          ], googleConfig.accessToken);
        } catch (e) { console.error("Cloud Mail Log Error:", e); }
      }

    } catch (err: any) { 
      setError(err.message || "Error IA."); 
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
          <p className="text-[#5E7BFF] text-xs font-bold uppercase tracking-widest">Consultor Inteligente</p>
          <h2 className="text-4xl font-semibold tracking-tight">CarceMail Inbox</h2>
        </div>
        <button onClick={() => setConfig({ isConnected: false, email: null, accessToken: null })} className="text-[#646B7B] text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:text-red-400"><LogOut size={14} /> Desconectar</button>
      </header>
      <div className="relative glass border border-[#1F2330] rounded-[2.5rem] p-8 flex items-center gap-6 shadow-2xl">
        <Search className="text-[#646B7B]" />
        <input type="text" value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} placeholder="Pregúntame sobre tus correos..." className="flex-1 bg-transparent outline-none text-xl placeholder:text-[#646B7B]" />
        <button onClick={handleSearch} disabled={isSearching || !prompt.trim()} className="p-5 bg-[#5E7BFF] text-white rounded-3xl hover:bg-[#4A63CC] transition-all disabled:opacity-50">{isSearching ? <Loader2 className="animate-spin" /> : <ArrowRight />}</button>
      </div>
      
      {aiAnswer && (
        <div className="p-12 rounded-[3rem] bg-[#151823] border border-[#1F2330] space-y-6 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-300">
          <div className="absolute top-0 right-0 p-8 opacity-10"><Sparkles size={100} className="text-[#5E7BFF]" /></div>
          <div className="flex items-center gap-3 text-[#5E7BFF]"><Sparkles size={20} /><h4 className="font-bold text-[10px] uppercase tracking-widest">Resumen Inteligente</h4></div>
          <FormattedResponse text={aiAnswer} />
        </div>
      )}

      {error && <div className="p-8 rounded-3xl bg-red-500/5 border border-red-500/20 text-red-400 flex items-center gap-4"><AlertCircle size={20} /> <p className="text-sm">{error}</p></div>}
      
      <div className="space-y-4">
        {results.length > 0 ? (
          <div className="space-y-4">
            <p className="text-[10px] font-bold text-[#646B7B] uppercase tracking-widest ml-4">Resultados de la búsqueda</p>
            {results.map((msg, idx) => (
              <div key={idx} className="glass border border-[#1F2330] p-8 rounded-[2rem] space-y-4 hover:border-[#5E7BFF]/30 transition-all group">
                <h6 className="font-semibold text-lg">{msg.payload.headers.find((h: any) => h.name === 'Subject')?.value}</h6>
                <p className="text-sm text-[#A0A6B1] italic leading-relaxed">"{msg.snippet}"</p>
                <button onClick={() => window.open(`https://mail.google.com/mail/u/0/#inbox/${msg.id}`, '_blank')} className="text-[10px] font-bold text-[#646B7B] uppercase tracking-widest flex items-center gap-2 group-hover:text-white transition-colors">Abrir en Gmail <ExternalLink size={12} /></button>
              </div>
            ))}
          </div>
        ) : history.length > 0 && !aiAnswer && (
          <div className="space-y-4">
            <p className="text-[10px] font-bold text-[#646B7B] uppercase tracking-widest ml-4">Consultas Recientes</p>
            {history.map((item, idx) => (
              <div key={idx} className="glass border border-[#1F2330] p-8 rounded-[2rem] space-y-4 opacity-70 hover:opacity-100 transition-opacity">
                <p className="text-xs font-bold text-[#5E7BFF]">{item.prompt}</p>
                <p className="text-sm text-[#A0A6B1] line-clamp-2">{item.answer}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CarceMailView;