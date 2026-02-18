
import React from 'react';
import { 
  BookOpen, 
  HelpCircle, 
  ExternalLink, 
  Settings, 
  Mic, 
  Database, 
  BrainCircuit, 
  ArrowRight,
  ShieldCheck,
  Zap,
  TestTube2,
  CheckCircle2
} from 'lucide-react';

const InstructionsView: React.FC = () => {
  const steps = [
    {
      icon: Settings,
      title: "Configuración Inicial",
      desc: "Ve a 'Ajustes' y conecta tu cuenta de Google. CarceMind requiere permisos de Drive y Sheets para funcionar.",
      color: "#5E7BFF"
    },
    {
      icon: Database,
      title: "Asignación de Directorios",
      desc: "Selecciona una carpeta para tus grabaciones (.webm) y otra para el índice de datos. El sistema buscará o creará el archivo CarceMind_Memory_Index automáticamente.",
      color: "#10B981"
    },
    {
      icon: Mic,
      title: "Ingesta Cognitiva",
      desc: "Usa la pestaña 'Grabar' para dictar tus pensamientos. Gemini procesará el audio, detectará tareas y extraerá la transcripción completa al Excel.",
      color: "#EF4444"
    },
    {
      icon: BrainCircuit,
      title: "Consultor Mental",
      desc: "En la pestaña 'Consultor', puedes chatear con tu propia historia. Pregúntale sobre eventos pasados o tareas que olvidaste anotar.",
      color: "#8A6CFF"
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-16 pb-32 animate-in fade-in duration-700">
      <header className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-[#A0A6B1]">
          <BookOpen size={12} /> Guía del Usuario v1.2
        </div>
        <h2 className="text-5xl font-semibold tracking-tight">Cómo dominar CarceMind</h2>
        <p className="text-[#646B7B] max-w-xl mx-auto">Tu cerebro externo, estructurado mediante inteligencia artificial y guardado de forma privada en tu propio Google Drive.</p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {steps.map((step, idx) => (
          <div key={idx} className="glass border border-[#1F2330] p-8 rounded-[2.5rem] relative group overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
              <step.icon size={120} style={{ color: step.color }} />
            </div>
            <div className="relative z-10 space-y-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${step.color}20` }}>
                <step.icon size={24} style={{ color: step.color }} />
              </div>
              <h3 className="text-xl font-semibold tracking-tight">{step.title}</h3>
              <p className="text-[#A0A6B1] text-sm leading-relaxed">{step.desc}</p>
            </div>
          </div>
        ))}
      </section>

      {/* SECCIÓN DE PRUEBAS */}
      <section className="p-10 rounded-[3rem] bg-gradient-to-br from-[#151823] to-[#0B0D12] border border-[#1F2330] space-y-8">
        <div className="flex items-center gap-4">
          <TestTube2 className="text-[#5E7BFF]" size={32} />
          <div>
            <h3 className="text-2xl font-semibold">Validación del Consultor</h3>
            <p className="text-[#646B7B] text-sm">Pruebas sugeridas para verificar que la IA lee bien tu historia.</p>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="p-6 rounded-2xl bg-white/5 border border-white/5 space-y-4">
            <h4 className="text-xs font-bold text-[#5E7BFF] uppercase tracking-widest">Prueba 1: Memoria Reciente</h4>
            <p className="text-sm italic text-[#A0A6B1]">"¿Cuáles son las 3 últimas memorias que he grabado y de qué tratan?"</p>
            <p className="text-[10px] text-[#646B7B]">Éxito: Si la IA lista los títulos y resúmenes exactos de tus últimas entradas.</p>
          </div>

          <div className="p-6 rounded-2xl bg-white/5 border border-white/5 space-y-4">
            <h4 className="text-xs font-bold text-[#10B981] uppercase tracking-widest">Prueba 2: Tareas Inferidas</h4>
            <p className="text-sm italic text-[#A0A6B1]">"Dime qué tareas tengo pendientes relacionadas con [un tema que hayas grabado]."</p>
            <p className="text-[10px] text-[#646B7B]">Éxito: Si la IA conecta la descripción de la tarea con el contexto de la memoria original.</p>
          </div>

          <div className="p-6 rounded-2xl bg-white/5 border border-white/5 space-y-4">
            <h4 className="text-xs font-bold text-[#EF4444] uppercase tracking-widest">Prueba 3: Razonamiento</h4>
            <p className="text-sm italic text-[#A0A6B1]">"Basándote en mis últimas grabaciones, ¿cómo ha sido mi estado emocional esta semana?"</p>
            <p className="text-[10px] text-[#646B7B]">Éxito: Si la IA analiza la columna 'Estado Emocional' y te da un resumen coherente.</p>
          </div>
        </div>
      </section>

      <section className="p-10 rounded-[3rem] bg-[#0B0D12] border border-[#1F2330] space-y-10">
        <div className="flex items-center gap-4">
          <ShieldCheck className="text-[#10B981]" size={32} />
          <h3 className="text-2xl font-semibold">Seguridad y Privacidad</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-2">
            <h4 className="font-bold text-xs uppercase tracking-widest text-white flex items-center gap-2">
              <Zap size={14} className="text-[#F59E0B]" /> Procesamiento
            </h4>
            <p className="text-[#646B7B] text-xs leading-relaxed">Gemini 3 Flash procesa tu audio efímeramente para extraer datos. Nada se almacena en servidores externos fuera de tu sesión activa.</p>
          </div>
          <div className="space-y-2">
            <h4 className="font-bold text-xs uppercase tracking-widest text-white flex items-center gap-2">
               Propiedad
            </h4>
            <p className="text-[#646B7B] text-xs leading-relaxed">Tus datos residen en TU Google Drive. CarceMind solo actúa como una interfaz para visualizar y enriquecer esos archivos.</p>
          </div>
          <div className="space-y-2">
            <h4 className="font-bold text-xs uppercase tracking-widest text-white flex items-center gap-2">
              Sincronización
            </h4>
            <p className="text-[#646B7B] text-xs leading-relaxed">Al cambiar el estado de una tarea, se actualiza el Excel automáticamente. Recuerda que al borrar memorias, las tareas asociadas deben borrarse a mano.</p>
          </div>
        </div>
      </section>

      <footer className="text-center pt-10">
        <a 
          href="https://ai.google.dev/gemini-api/docs" 
          target="_blank" 
          className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#5E7BFF] hover:underline"
        >
          Documentación del Motor Gemini <ExternalLink size={12} />
        </a>
      </footer>
    </div>
  );
};

export default InstructionsView;
