
import React, { useState, useRef, useEffect } from 'react';
import { Memory, Message, GoogleConfig } from '../types';
import { googleApi } from '../lib/googleApi';
import { GoogleGenAI, Type } from '@google/genai';
import { Send, Sparkles, User, BrainCircuit, Loader2, ListTodo, History, Search } from 'lucide-react';

interface ChatViewProps {
  memories: Memory[];
  googleConfig: GoogleConfig;
}

const ChatView: React.FC<ChatViewProps> = ({ memories, googleConfig }) => {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'assistant', text: 'Hola Pablo. He analizado tus memorias estructuradas. ¿En qué podemos avanzar hoy?', timestamp: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentProcess, setCurrentProcess] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    const currentInput = input;
    setInput('');
    setIsTyping(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
      const token = googleConfig.accessToken;

      // 1. INTENT CLASSIFICATION
      setCurrentProcess('Clasificando intención...');
      const intentResult = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analiza la intención de Pablo: "${currentInput}". Responde en JSON: { "intent": "tasks" | "recent_memories" | "search" | "general", "query": "string" }`,
        config: { responseMimeType: 'application/json' }
      });
      const { intent, query } = JSON.parse(intentResult.text);

      let context = "";

      // 2. STRUCTURED RETRIEVAL
      if (googleConfig.isConnected && googleConfig.spreadsheetId && token) {
        if (intent === 'tasks') {
          setCurrentProcess('Consultando hoja de TAREAS...');
          const tasksRows = await googleApi.getRows(googleConfig.spreadsheetId, 'TAREAS', token);
          const pending = tasksRows.slice(1).filter((r: any) => r[4] === 'pending');
          context = `TAREAS PENDIENTES:\n${pending.map((r: any) => `- ${r[2]} (Prioridad: ${r[3]}, Límite: ${r[6] || 'N/A'})`).join('\n')}`;
        } else if (intent === 'recent_memories' || intent === 'search') {
          setCurrentProcess('Recuperando fragmentos relevantes...');
          const entriesRows = await googleApi.getRows(googleConfig.spreadsheetId, 'ENTRADAS', token);
          // Simple retrieval: last 15 entries for "recent", or keyword search for "search"
          const entries = entriesRows.slice(1).reverse();
          const filtered = intent === 'search' 
            ? entries.filter((e: any) => e[2].toLowerCase().includes(query.toLowerCase()) || e[3].toLowerCase().includes(query.toLowerCase()) || e[8].toLowerCase().includes(query.toLowerCase())).slice(0, 5)
            : entries.slice(0, 8);
          
          context = `MEMORIAS RELEVANTES:\n${filtered.map((r: any) => `Fecha: ${r[1]}\nTítulo: ${r[2]}\nResumen: ${r[3]}\nHechos clave: ${r[8]}`).join('\n\n')}`;
        }
      } else {
        context = "No hay conexión con Google. Usando sólo memoria volátil local.";
      }

      // 3. FINAL RESPONSE GENERATION (TONO PABLO)
      setCurrentProcess('Generando respuesta estratégica...');
      const finalResult = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Eres CarceMind, el clon cognitivo y asistente ejecutivo de Pablo.
        TONO: Español de España, natural, directo, práctico, ejecutivo, con sutil humor si encaja. Sin relleno.
        CONTEXTO RECUPERADO DE MEMORIA ESTRUCTURADA:
        ---
        ${context}
        ---
        USUARIO PREGUNTA: "${currentInput}"
        
        Responde basándote en el contexto. Si no hay información suficiente, dilo con honestidad. Propón próximos pasos si aplica.`,
        config: { temperature: 0.7 }
      });

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: finalResult.text || 'Error en la respuesta neuronal.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { id: 'err', role: 'assistant', text: 'Error procesando tu petición neuronal.', timestamp: new Date() }]);
    } finally {
      setIsTyping(false);
      setCurrentProcess('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-160px)] flex flex-col relative animate-in fade-in slide-in-from-right-4 duration-500">
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#5E7BFF] to-[#8A6CFF] flex items-center justify-center shadow-lg shadow-[#5E7BFF22]">
            <BrainCircuit className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold">Consultor CarceMind</h2>
            <p className="text-sm text-[#A0A6B1]">Capa RAG activada • Memoria 2 Capas</p>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="p-2 rounded-xl bg-[#151823] border border-[#1F2330] text-[#646B7B]" title="Búsqueda Estructurada">
             <ListTodo className="w-4 h-4" />
          </div>
          <div className="p-2 rounded-xl bg-[#151823] border border-[#1F2330] text-[#646B7B]" title="Búsqueda Semántica">
             <History className="w-4 h-4" />
          </div>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-12 scroll-smooth pr-6">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-6 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all duration-500 ${
              msg.role === 'user' ? 'bg-[#151823] border border-[#1F2330]' : 'bg-gradient-to-b from-[#5E7BFF] to-[#8A6CFF] shadow-lg shadow-[#5E7BFF33]'
            }`}>
              {msg.role === 'user' ? <User className="w-5 h-5 text-[#A0A6B1]" /> : <Sparkles className="w-5 h-5 text-white" />}
            </div>
            <div className={`max-w-[85%] space-y-3 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
              <div className="inline-block px-1 py-1 text-[17px] leading-relaxed text-[#F5F7FA] font-light whitespace-pre-wrap">
                {msg.text}
              </div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#646B7B] font-mono font-bold">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex gap-6 items-center">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-b from-[#5E7BFF] to-[#8A6CFF] flex items-center justify-center animate-pulse shadow-lg shadow-[#5E7BFF22]">
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-widest text-[#5E7BFF] font-bold animate-pulse">Analizando Red Cognitiva...</p>
              <p className="text-[9px] text-[#646B7B] uppercase tracking-tighter italic">{currentProcess}</p>
            </div>
          </div>
        )}
      </div>

      <div className="pt-8 bg-[#0B0D12] sticky bottom-0">
        <div className="relative glass border border-[#1F2330] rounded-[2.5rem] p-3 focus-within:ring-2 ring-[#5E7BFF33] transition-all group shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="¿En qué piensas ahora, Pablo?"
            className="w-full bg-transparent border-none focus:ring-0 py-5 px-10 text-[#F5F7FA] placeholder-[#646B7B] outline-none text-lg"
          />
          <button
            onClick={handleSend}
            disabled={isTyping}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-14 h-14 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-2xl disabled:opacity-50"
          >
            <Send className="w-6 h-6" />
          </button>
        </div>
        <div className="flex justify-center gap-6 mt-5 opacity-40">
           <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-widest font-bold">
             <Search className="w-3 h-3" /> Búsqueda por intención
           </div>
           <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-widest font-bold">
             <BrainCircuit className="w-3 h-3" /> Recuperación Estructurada
           </div>
        </div>
      </div>
    </div>
  );
};

export default ChatView;
