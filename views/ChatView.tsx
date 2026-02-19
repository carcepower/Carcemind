
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
      // Inicia la IA usando la variable de entorno obligatoria
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      
      const memoryContext = memories.map(m => `- ${m.timestamp.toLocaleDateString()}: [${m.title}] ${m.excerpt}`).join('\n');
      
      const systemInstruction = `
        Eres el "Consultor Cognitivo" de CarceMind. Ayuda a Pablo a navegar por sus recuerdos.
        Contexto de memorias recientes:
        ${memoryContext}
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: input,
        config: {
          systemInstruction,
          temperature: 0.7
        }
      });

      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', text: response.text || 'No he podido procesar esa consulta.', timestamp: new Date() }]);
    } catch (err: any) {
      console.error("Chat Error:", err);
      const errorText = err.message?.includes("API_KEY") 
        ? "Error: No se detecta la clave API. Configura la variable API_KEY en Vercel."
        : "Error de conexión con Gemini. Revisa tu conexión o la validez de la clave.";
      setMessages(prev => [...prev, { id: 'err', role: 'assistant', text: errorText, timestamp: new Date() }]);
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
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Consultor Cognitivo</h2>
          <p className="text-[#646B7B] text-xs">Analizando {memories.length} bloques de memoria.</p>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-8 pr-4 scrollbar-hide">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-[#151823]' : 'bg-[#5E7BFF]'}`}>
              {msg.role === 'user' ? <User size={16} /> : <Sparkles size={16} />}
            </div>
            <div className={`p-4 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-[#151823] text-right border border-[#1F2330]' : 'bg-white/5 border border-white/5'}`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex gap-4 animate-pulse">
            <div className="w-8 h-8 rounded-lg bg-[#5E7BFF] flex items-center justify-center shrink-0">
              <Sparkles size={16} className="animate-spin" />
            </div>
            <div className="p-4 rounded-2xl bg-white/5 text-xs text-[#646B7B]">
              Consultando red neuronal...
            </div>
          </div>
        )}
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
        <button 
          onClick={handleSend} 
          disabled={isTyping}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white text-black rounded-xl disabled:opacity-50"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
};

export default ChatView;
