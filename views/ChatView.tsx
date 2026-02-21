
import React, { useState, useRef, useEffect } from 'react';
import { Memory, Message, GoogleConfig } from '../types';
import { googleApi } from '../lib/googleApi';
import { Send, Sparkles, User, BrainCircuit, Loader2, Trash2, AlertCircle } from 'lucide-react';

interface ChatViewProps {
  memories: Memory[];
  googleConfig: GoogleConfig;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  bankData?: any[];
}

const FormattedResponse: React.FC<{ text: string }> = ({ text }) => {
  const lines = text.split('\n');
  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {lines.map((line, i) => {
        let content = line.trim();
        if (!content) return null;
        const isListItem = content.startsWith('*') || content.startsWith('-') || /^\d+\./.test(content);
        if (isListItem) {
          content = content.replace(/^[*-\d.]+\s*/, '');
          return (
            <div key={i} className="flex gap-3 pl-2">
              <div className="mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full bg-[#5E7BFF] shadow-[0_0_8px_rgba(94,123,255,0.6)]" />
              <p className="text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: formatBold(content) }} />
            </div>
          );
        }
        return <p key={i} className="text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: formatBold(content) }} />;
      })}
    </div>
  );
};

const formatBold = (text: string) => text.replace(/\*\*(.*?)\*\*/g, '<b class="text-white font-semibold">$1</b>');

const ChatView: React.FC<ChatViewProps> = ({ memories, googleConfig, messages, setMessages, bankData = [] }) => {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages, isTyping]);

  const saveToCloud = async (msg: Message) => {
    if (googleConfig.isConnected && googleConfig.spreadsheetId && googleConfig.accessToken) {
      try {
        await googleApi.appendRow(googleConfig.spreadsheetId, 'CHAT_LOG', [msg.id, msg.timestamp.toISOString(), msg.role, msg.text], googleConfig.accessToken);
      } catch (e) { console.error("Cloud Chat Log Error:", e); }
    }
  };

  const handleReset = () => {
    if (window.confirm("¿Limpiar historial de la conversación?")) {
      setMessages([{ id: 'init', role: 'assistant', text: 'Historial visual reseteado. Sigo conectado a tu archivo maestro CarceMind_Memory_Index, Pablo.', timestamp: new Date() }]);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);
    
    saveToCloud(userMsg);

    try {
      const memoryContext = memories.slice(0, 50).map(m => `- [${new Date(m.timestamp).toLocaleDateString()}] ${m.title}: ${m.excerpt}`).join('\n');
      const bankContext = bankData.slice(-100).map(t => `- ${t.date}: ${t.concept} | ${t.amount}€ (${t.type})`).join('\n');
      
      const systemInstruction = `Eres el "Consultor Cognitivo" de Pablo Carcelén. Profesional e impecable. Responde basándote en su historial de memorias y finanzas.`;
      
      const response = await googleApi.safeAiCall({
        prompt: input,
        systemInstruction: systemInstruction + `\n\nMEMORIAS:\n${memoryContext}\n\nFINANZAS:\n${bankContext}`,
        usePro: true 
      });

      const aiMsg: Message = { 
        id: (Date.now() + 1).toString(), 
        role: 'assistant', 
        text: response.text || 'No he podido procesar esa consulta.', 
        timestamp: new Date() 
      };
      setMessages(prev => [...prev, aiMsg]);
      saveToCloud(aiMsg);
    } catch (err: any) {
      const errorText = err.message === "API_KEY_MISSING" 
        ? "Pablo, no detecto una clave de IA activa. Por favor, ve a la pestaña AJUSTES y pulsa 'Gestionar Clave de Google AI'."
        : "Lo siento Pablo, he tenido un problema al consultar tu archivo maestro.";
        
      setMessages(prev => [...prev, { id: 'err', role: 'assistant', text: errorText, timestamp: new Date() }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-160px)] flex flex-col">
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#5E7BFF] to-[#8A6CFF] flex items-center justify-center shadow-lg shadow-[#5E7BFF33]">
            <BrainCircuit className="text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Consultor Cognitivo</h2>
            <p className="text-[#646B7B] text-[10px] font-bold uppercase tracking-widest">Inteligencia de Memoria Pro</p>
          </div>
        </div>
        <button onClick={handleReset} className="p-3 rounded-xl bg-[#151823] border border-[#1F2330] text-[#646B7B] hover:text-white transition-all group">
          <Trash2 size={18} className="group-hover:scale-110" />
        </button>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-10 pr-4 scrollbar-hide">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all ${msg.role === 'user' ? 'bg-[#151823] border-[#1F2330]' : msg.id === 'err' ? 'bg-red-500/20 border-red-500/30' : 'bg-[#5E7BFF] border-[#5E7BFF] shadow-lg shadow-[#5E7BFF33]'}`}>
              {msg.role === 'user' ? <User size={18} /> : msg.id === 'err' ? <AlertCircle size={18} className="text-red-400" /> : <Sparkles size={18} />}
            </div>
            <div className={`p-6 rounded-[2rem] max-w-[85%] flex flex-col gap-4 ${msg.role === 'user' ? 'bg-[#151823] border border-[#1F2330]' : 'bg-white/5 border border-white/5'}`}>
              {msg.role === 'assistant' ? <FormattedResponse text={msg.text} /> : <p className="text-sm leading-relaxed">{msg.text}</p>}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex gap-5 animate-pulse">
            <div className="w-10 h-10 rounded-xl bg-[#5E7BFF] flex items-center justify-center shrink-0"><Sparkles size={18} className="animate-spin" /></div>
            <div className="p-6 rounded-[2rem] bg-white/5 flex gap-2 items-center">
              <div className="w-1.5 h-1.5 rounded-full bg-[#5E7BFF] animate-bounce" style={{ animationDelay: '0s' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-[#5E7BFF] animate-bounce" style={{ animationDelay: '0.2s' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-[#5E7BFF] animate-bounce" style={{ animationDelay: '0.4s' }} />
            </div>
          </div>
        )}
      </div>

      <div className="mt-10 relative">
        <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="Pablo, ¿en qué profundizamos hoy?" className="w-full glass border border-[#1F2330] rounded-3xl py-6 px-8 outline-none focus:border-[#5E7BFF] transition-all text-sm pr-16 shadow-2xl" />
        <button onClick={handleSend} disabled={isTyping || !input.trim()} className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white text-black rounded-2xl disabled:opacity-50 hover:scale-105 active:scale-95 transition-all shadow-xl"><Send size={20} /></button>
      </div>
    </div>
  );
};

export default ChatView;
