
import React, { useState, useRef, useEffect } from 'react';
import { Memory, Message, GoogleConfig } from '../types';
import { googleApi } from '../lib/googleApi';
import { GoogleGenAI } from '@google/genai';
import { Send, Sparkles, User, BrainCircuit, Loader2, ChevronRight, Check } from 'lucide-react';

interface ChatViewProps {
  memories: Memory[];
  googleConfig: GoogleConfig;
}

const FormattedResponse: React.FC<{ text: string }> = ({ text }) => {
  const lines = text.split('\n');
  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {lines.map((line, i) => {
        let content = line.trim();
        if (!content) return null;

        // Formato de Lista (puntos o números)
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

        return (
          <p key={i} className="text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: formatBold(content) }} />
        );
      })}
    </div>
  );
};

const formatBold = (text: string) => {
  return text.replace(/\*\*(.*?)\*\*/g, '<b class="text-white font-semibold">$1</b>');
};

const ChatView: React.FC<ChatViewProps> = ({ memories, googleConfig }) => {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'assistant', text: 'Hola Pablo. He analizado tus memorias estructuradas. ¿En qué avanzamos?', timestamp: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const apiKey = googleApi.getApiKey();
      if (!apiKey) throw new Error("API_KEY_MISSING");
      const ai = new GoogleGenAI({ apiKey });
      const memoryContext = memories.map(m => `- ${m.timestamp.toLocaleDateString()}: [${m.title}] ${m.excerpt}`).join('\n');
      const systemInstruction = `
        Eres el "Consultor Cognitivo" de CarceMind. Ayuda a Pablo a navegar por sus recuerdos de forma profesional, cálida y concisa.
        USA UN TONO AMIGABLE. ESTRUCTURA CON PÁRRAFOS.
        Contexto: ${memoryContext}
      `;
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: input,
        config: { systemInstruction, temperature: 0.7 }
      });
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', text: response.text || 'Sin respuesta.', timestamp: new Date() }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { id: 'err', role: 'assistant', text: "Error técnico detectado en la red neuronal.", timestamp: new Date() }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-160px)] flex flex-col">
      <header className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#5E7BFF] to-[#8A6CFF] flex items-center justify-center shadow-lg shadow-[#5E7BFF33]">
          <BrainCircuit className="text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Consultor Cognitivo</h2>
          <p className="text-[#646B7B] text-[10px] font-bold uppercase tracking-widest tracking-tighter">Índice Mental de {memories.length} bloques</p>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-10 pr-4 scrollbar-hide">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all ${msg.role === 'user' ? 'bg-[#151823] border-[#1F2330]' : 'bg-[#5E7BFF] border-[#5E7BFF] shadow-lg shadow-[#5E7BFF33]'}`}>
              {msg.role === 'user' ? <User size={18} /> : <Sparkles size={18} />}
            </div>
            <div className={`p-6 rounded-[2rem] max-w-[85%] ${msg.role === 'user' ? 'bg-[#151823] border border-[#1F2330]' : 'bg-white/5 border border-white/5'}`}>
              {msg.role === 'assistant' ? <FormattedResponse text={msg.text} /> : <p className="text-sm leading-relaxed">{msg.text}</p>}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex gap-5 animate-pulse">
            <div className="w-10 h-10 rounded-xl bg-[#5E7BFF] flex items-center justify-center shrink-0">
              <Sparkles size={18} className="animate-spin" />
            </div>
            <div className="p-6 rounded-[2rem] bg-white/5 flex gap-2 items-center">
              <div className="w-1.5 h-1.5 rounded-full bg-[#5E7BFF] animate-bounce" style={{ animationDelay: '0s' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-[#5E7BFF] animate-bounce" style={{ animationDelay: '0.2s' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-[#5E7BFF] animate-bounce" style={{ animationDelay: '0.4s' }} />
            </div>
          </div>
        )}
      </div>

      <div className="mt-10 relative">
        <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="Dime Pablo, ¿qué quieres recordar?" className="w-full glass border border-[#1F2330] rounded-3xl py-6 px-8 outline-none focus:border-[#5E7BFF] transition-all text-sm" />
        <button onClick={handleSend} disabled={isTyping || !input.trim()} className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white text-black rounded-2xl disabled:opacity-50 hover:scale-105 active:scale-95 transition-all"><Send size={20} /></button>
      </div>
    </div>
  );
};

export default ChatView;
