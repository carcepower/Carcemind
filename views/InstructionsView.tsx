
import React from 'react';
import { 
  ExternalLink, 
  Settings, 
  Mic, 
  BrainCircuit, 
  AlertTriangle,
  Zap,
  CheckCircle2,
  Database,
  Mail,
  Wallet,
  ArrowRight,
  Info
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
      title: "3. Carcemind IA",
      desc: "Chatea con tu historia personal y resuelve dudas.",
      color: "#8A6CFF"
    },
    {
      icon: Wallet,
      title: "4. Carcemoney",
      desc: "Tus finanzas analizadas automáticamente desde el índice.",
      color: "#10B981"
    }
  ];

  const financeSheets = [
    { label: 'Sabadell Corriente (TA)', tab: 'TA_CORRIENTE', category: 'Empresa' },
    { label: 'Sabadell Ahorro (TA)', tab: 'TA_AHORRO', category: 'Empresa' },
    { label: 'Caixabank Corriente (Personal)', tab: 'PERSONAL_CORRIENTE', category: 'Personal' },
    { label: 'Caixabank Ahorro (Personal)', tab: 'PERSONAL_AHORRO', category: 'Personal' }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-16 pb-32 animate-in fade-in duration-700">
      <header className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-[#A0A6B1]">
          <Zap size={12} className="text-amber-500" /> CarceMind v1.7 - Personal Intelligence
        </div>
        <h2 className="text-5xl font-semibold tracking-tight">Manual de Despliegue</h2>
        <p className="text-[#646B7B] max-w-xl mx-auto">Configuración técnica para el acceso total a tu cerebro digital.</p>
      </header>

      {/* FINANCE DATA ARCHITECTURE - MOVED FROM BANKVIEW */}
      <section className="p-10 rounded-[3rem] bg-[#151823] border border-[#1F2330] space-y-8 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-20 -top-20 opacity-5">
           <Wallet size={300} className="text-[#10B981]" />
        </div>
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-[#10B981]/10 flex items-center justify-center border border-[#10B981]/20">
            <Wallet className="text-[#10B981]" size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-semibold">Arquitectura Financiera (Carcemoney)</h3>
            <p className="text-[#A0A6B1] text-sm">Estructura requerida en tu Archivo Maestro para el análisis IA.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
          <div className="space-y-3">
             {financeSheets.map((item, i) => (
                <div key={i} className="p-4 bg-black/30 border border-white/5 rounded-2xl flex items-center justify-between group hover:border-[#10B981]/30 transition-all">
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-[#10B981] uppercase tracking-widest">{item.category}</p>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-[8px] text-[#646B7B] font-mono">Hoja: {item.tab}</p>
                  </div>
                </div>
             ))}
          </div>
          <div className="p-8 rounded-[2rem] bg-black/20 border border-white/5 flex flex-col justify-center space-y-6">
            <h4 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2 text-[#F5F7FA]">
              <Info size={16} className="text-[#5E7BFF]" /> Instrucciones de Carga
            </h4>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-bold shrink-0">1</div>
                <p className="text-xs text-[#A0A6B1] leading-relaxed">Abre tu <b className="text-white">Archivo Maestro</b> desde la pestaña Ajustes.</p>
              </div>
              <div className="flex gap-4">
                <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-bold shrink-0">2</div>
                <p className="text-xs text-[#A0A6B1] leading-relaxed">Pega tus movimientos bancarios en la pestaña correspondiente.</p>
              </div>
              <div className="flex gap-4">
                <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-bold shrink-0">3</div>
                <p className="text-xs text-[#A0A6B1] leading-relaxed">El <b className="text-white">Carcemind</b> analizará automáticamente esos datos al preguntarle.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* APIS ACTIVATION SECTION */}
      <section className="p-10 rounded-[3rem] bg-[#151823] border border-[#1F2330] space-y-8 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#5E7BFF]/10 flex items-center justify-center border border-[#5E7BFF]/20">
            <CheckCircle2 className="text-[#5E7BFF]" size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-semibold">Servicios de Google Cloud</h3>
            <p className="text-[#A0A6B1] text-sm">Sin estos interruptores encendidos, las APIs darán Error 403.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a href="https://console.cloud.google.com/apis/library/drive.googleapis.com" target="_blank" className="p-6 rounded-2xl bg-black/20 border border-white/5 hover:border-[#5E7BFF] transition-all flex items-center justify-between group">
            <div className="flex items-center gap-4">
              <Database className="text-[#5E7BFF]" />
              <span className="text-sm font-bold uppercase tracking-tighter">Google Drive API</span>
            </div>
            <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
          </a>
          <a href="https://console.cloud.google.com/apis/library/gmail.googleapis.com" target="_blank" className="p-6 rounded-2xl bg-black/20 border border-white/5 hover:border-[#10B981] transition-all flex items-center justify-between group">
            <div className="flex items-center gap-4">
              <Mail className="text-[#10B981]" />
              <span className="text-sm font-bold uppercase tracking-tighter">Gmail API</span>
            </div>
            <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
          </a>
        </div>
      </section>

      {/* EMERGENCY TROUBLESHOOTING SECTION */}
      <section className="p-10 rounded-[3rem] bg-red-500/5 border border-red-500/20 space-y-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
            <AlertTriangle className="text-red-500" size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-semibold text-red-500">¿Sigue saliendo Acceso Denegado?</h3>
            <p className="text-[#A0A6B1] text-sm">Asegúrate de que el estado de la app sea el correcto.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-black/20 border border-white/5 space-y-3">
            <div className="text-[10px] font-bold text-red-400 uppercase">Paso A</div>
            <h4 className="text-sm font-bold">Publicar App</h4>
            <p className="text-[11px] text-[#646B7B] leading-relaxed">
              En Google Console, pulsa <b>"PUBLISH APP"</b>. Esto cambia de "Testing" a "Production".
            </p>
          </div>
          <div className="p-6 rounded-2xl bg-black/20 border border-white/5 space-y-3">
            <div className="text-[10px] font-bold text-red-400 uppercase">Paso B</div>
            <h4 className="text-sm font-bold">Saltar Aviso</h4>
            <p className="text-[11px] text-[#646B7B] leading-relaxed">
              Verás "App no verificada". Pulsa en <b>Configuración avanzada</b> y luego en <b>Ir a carcemind</b>.
            </p>
          </div>
          <div className="p-6 rounded-2xl bg-black/20 border border-white/5 space-y-3">
            <div className="text-[10px] font-bold text-red-400 uppercase">Paso C</div>
            <h4 className="text-sm font-bold">Orígenes JS</h4>
            <p className="text-[11px] text-[#646B7B] leading-relaxed">
              En Credenciales, revisa que <b>Orígenes de JavaScript</b> incluya la URL de esta app.
            </p>
          </div>
        </div>
      </section>

      {/* QUICK STEPS */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {steps.map((step, idx) => (
          <div key={idx} className="glass border border-[#1F2330] p-8 rounded-[2rem] flex items-start gap-6 hover:bg-[#151823] transition-all group">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110" style={{ backgroundColor: `${step.color}15` }}>
              <step.icon size={20} style={{ color: step.color }} />
            </div>
            <div className="space-y-2">
              <h4 className="text-lg font-medium">{step.title}</h4>
              <p className="text-sm text-[#646B7B] leading-relaxed">{step.desc}</p>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
};

export default InstructionsView;
