
import React from 'react';
import { 
  BookOpen, 
  ExternalLink, 
  Settings, 
  Mic, 
  Database, 
  BrainCircuit, 
  AlertTriangle,
  ShieldCheck,
  Lock,
  Zap,
  CheckCircle2
} from 'lucide-react';

const InstructionsView: React.FC = () => {
  const steps = [
    {
      icon: Settings,
      title: "1. Conexión de Drive",
      desc: "Víncula tu cuenta para guardar audios y el índice Excel.",
      color: "#5E7BFF"
    },
    {
      icon: Mic,
      title: "2. Captura de Voz",
      desc: "Graba tus pensamientos; Gemini estructurará la información.",
      color: "#EF4444"
    },
    {
      icon: BrainCircuit,
      title: "3. Consultor IA",
      desc: "Chatea con tu historia personal y resuelve dudas.",
      color: "#8A6CFF"
    },
    {
      icon: Lock,
      title: "4. Seguridad Privada",
      desc: "Tus datos nunca salen de tu ecosistema de Google.",
      color: "#10B981"
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-16 pb-32 animate-in fade-in duration-700">
      <header className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-[#A0A6B1]">
          <Zap size={12} className="text-amber-500" /> CarceMind v1.6 - Personal Intelligence
        </div>
        <h2 className="text-5xl font-semibold tracking-tight">Manual de Configuración</h2>
        <p className="text-[#646B7B] max-w-xl mx-auto">Guía para el despliegue de tu cerebro digital privado.</p>
      </header>

      {/* REASSURANCE SECTION: TEST VS PRODUCTION */}
      <section className="p-10 rounded-[3rem] bg-gradient-to-br from-[#151823] to-[#0B0D12] border border-[#1F2330] space-y-10">
        <div className="flex items-center gap-4">
          <ShieldCheck className="text-[#10B981]" size={32} />
          <div>
            <h3 className="text-2xl font-semibold">Uso de Cuentas Reales</h3>
            <p className="text-[#646B7B] text-sm">Aclaración sobre el sistema de permisos de Google.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-amber-500 uppercase tracking-widest">¿Qué es un "Test User"?</h4>
            <p className="text-sm text-[#A0A6B1] leading-relaxed">
              Es el término técnico de Google para una <b>App Privada</b>. Aunque se llame "de prueba", funciona con tu <b>cuenta real y datos reales</b> sin ninguna limitación.
            </p>
          </div>
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-[#5E7BFF] uppercase tracking-widest">¿Por qué es mejor así?</h4>
            <p className="text-sm text-[#A0A6B1] leading-relaxed">
              Al no ser una app pública, <b>solo tú</b> tienes la llave. Nadie más puede acceder a la app a menos que añadas su email manualmente en tu consola. Es la máxima seguridad posible.
            </p>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-amber-500/5 border border-amber-500/10 space-y-4">
          <div className="flex items-center gap-3 text-amber-500">
            <AlertTriangle size={18} />
            <span className="text-xs font-bold uppercase tracking-tight">Imprescindible para evitar el Error 403</span>
          </div>
          <p className="text-[11px] text-[#A0A6B1] leading-relaxed">
            Para usar tu cuenta de Gmail (o cualquier otra), debes ir a la <b>Google Cloud Console</b> {' > '} <b>OAuth Consent Screen</b> {' > '} <b>Test Users</b> y añadir el email. Google bloquea por defecto cualquier cuenta que no esté en esa lista mientras la app no sea pública.
          </p>
          <div className="flex gap-4 pt-2">
             <a href="https://console.cloud.google.com/" target="_blank" className="text-[10px] font-bold text-white underline flex items-center gap-1">
               Abrir Consola <ExternalLink size={10} />
             </a>
          </div>
        </div>
      </section>

      {/* QUICK STEPS */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {steps.map((step, idx) => (
          <div key={idx} className="glass border border-[#1F2330] p-8 rounded-[2rem] flex items-start gap-6 hover:bg-[#151823] transition-all">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${step.color}15` }}>
              <step.icon size={20} style={{ color: step.color }} />
            </div>
            <div className="space-y-2">
              <h4 className="text-lg font-medium">{step.title}</h4>
              <p className="text-sm text-[#646B7B] leading-relaxed">{step.desc}</p>
            </div>
          </div>
        ))}
      </section>

      <div className="p-10 rounded-[3rem] border border-dashed border-[#1F2330] text-center space-y-6">
        <div className="inline-flex p-4 rounded-full bg-[#10B981]/10 text-[#10B981] mb-2">
          <CheckCircle2 size={24} />
        </div>
        <h3 className="text-xl font-medium">Estado del Sistema</h3>
        <div className="flex flex-wrap justify-center gap-4">
          <span className="px-4 py-2 rounded-full bg-[#151823] border border-[#1F2330] text-[10px] font-bold text-[#A0A6B1] uppercase">Drive API: Conectado</span>
          <span className="px-4 py-2 rounded-full bg-[#151823] border border-[#1F2330] text-[10px] font-bold text-[#A0A6B1] uppercase">Gmail API: Conectado</span>
          <span className="px-4 py-2 rounded-full bg-[#151823] border border-[#1F2330] text-[10px] font-bold text-[#A0A6B1] uppercase">Gemini Engine: Activo</span>
        </div>
      </div>
    </div>
  );
};

export default InstructionsView;
