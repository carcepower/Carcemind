
import React, { useState, useRef, useEffect } from 'react';
import { Memory, Message, GoogleConfig } from '../types';
import { googleApi } from '../lib/googleApi';
import { GoogleGenAI } from '@google/genai';
import { Send, Sparkles, User, BrainCircuit, Loader2 } from 'lucide-react';

interface ChatViewProps {
  memories: Memory[];
  googleConfig: GoogleConfig;
}

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
      const apiKey = (process.env as any).VITE_API_KEY || process.env.API_KEY;
      const ai = new GoogleGenAI({ apiKey });
      const result = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Contexto memorias: ${JSON.stringify(memories.slice(0, 5))}\n\nPregunta: ${input}`
      });

      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', text: result.text, timestamp: new Date() }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { id: 'err', role: 'assistant', text: 'Error de conexión con el motor Gemini. Verifica tu clave VITE_API_KEY.', timestamp: new Date() }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-160px)] flex flex-col">
      <header className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#5E7BFF] to-[#8A6CFF] flex items-center justify-center">
          <BrainCircuit className="text-white" />
        </div>
        <h2 className="text-2xl font-semibold tracking-tight">Consultor Cognitivo</h2>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-8 pr-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-[#151823]' : 'bg-[#5E7BFF]'}`}>
              {msg.role === 'user' ? <User size={16} /> : <Sparkles size={16} />}
            </div>
            <div className={`p-4 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-[#151823] text-right' : 'bg-white/5'}`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isTyping && <Loader2 className="animate-spin text-[#5E7BFF]" />}
      </div>

      <div className="mt-8 relative">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Consulta tu cerebro..."
          className="w-full glass border border-[#1F2330] rounded-2xl py-5 px-6 outline-none focus:border-[#5E7BFF] transition-all"
        />
        <button onClick={handleSend} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white text-black rounded-xl">
          <Send size={18} />
        </button>
      </div>
    </div>
  );
};

export default ChatView;
