
import React from 'react';
import { GoogleConfig } from '../types';
import { 
  CheckCircle2, 
  ExternalLink, 
  Database,
  Search,
  ArrowRight
} from 'lucide-react';

interface BankViewProps {
  googleConfig: GoogleConfig;
  onDataUpdate: () => void;
}

const BankView: React.FC<BankViewProps> = ({ googleConfig }) => {
  const financeSheets = [
    { label: 'Sabadell Corriente (TA)', tab: 'TA_CORRIENTE', category: 'Empresa' },
    { label: 'Sabadell Ahorro (TA)', tab: 'TA_AHORRO', category: 'Empresa' },
    { label: 'Caixabank Corriente (Personal)', tab: 'PERSONAL_CORRIENTE', category: 'Personal' },
    { label: 'Caixabank Ahorro (Personal)', tab: 'PERSONAL_AHORRO', category: 'Personal' }
  ];

  const handleOpenFile = () => {
    if (googleConfig.spreadsheetId) {
      window.open(`https://docs.google.com/spreadsheets/d/${googleConfig.spreadsheetId}/edit`, '_blank');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-32 animate-in fade-in duration-700">
      <header className="space-y-2">
        <p className="text-[#5E7BFF] text-xs font-bold uppercase tracking-widest">CarceFinance v3.0 - Unified</p>
        <h2 className="text-4xl font-semibold tracking-tight">Finanzas Integradas</h2>
        <p className="text-[#646B7B] italic leading-relaxed max-w-2xl">
          Tus datos bancarios residen ahora en el archivo principal <b className="text-white">CarceMind_Memory_Index</b> para un análisis más rápido.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section className="glass border border-[#1F2330] p-10 rounded-[3rem] space-y-6 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#5E7BFF]/10 flex items-center justify-center border border-[#5E7BFF]/20">
                <Database className="text-[#5E7BFF]" size={28} />
              </div>
              <div>
                <h3 className="text-xl font-bold">Estado del Índice</h3>
                <p className="text-[#646B7B] text-[10px] uppercase font-bold tracking-widest">Sincronización Total</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20">
                <CheckCircle2 size={18} />
                <span className="text-xs font-bold uppercase tracking-widest">Sistema Operativo</span>
              </div>
              <p className="text-[#646B7B] text-xs leading-relaxed">
                El Consultor Cognitivo está procesando las 4 pestañas bancarias directamente desde tu archivo de Google Sheets.
              </p>
            </div>
          </div>

          <button 
            onClick={handleOpenFile}
            className="w-full py-5 rounded-2xl bg-white text-black font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-xl mt-4"
          >
            <ExternalLink size={16} /> Abrir Archivo Maestro
          </button>
        </section>

        <section className="glass border border-[#1F2330] p-10 rounded-[3rem] space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#8A6CFF]/10 flex items-center justify-center border border-[#8A6CFF]/20">
              <Search className="text-[#8A6CFF]" size={28} />
            </div>
            <div>
              <h3 className="text-xl font-bold">Arquitectura de Datos</h3>
              <p className="text-[#646B7B] text-[10px] uppercase font-bold tracking-widest">Estructura Requerida</p>
            </div>
          </div>
          
          <div className="space-y-3 pt-2 max-h-[250px] overflow-y-auto scrollbar-hide">
            {financeSheets.map((item, i) => (
              <div key={i} className="p-5 bg-black/20 border border-white/5 rounded-2xl flex items-center justify-between group hover:border-white/10 transition-colors">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-[#5E7BFF] uppercase tracking-widest">{item.category}</p>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-[9px] text-[#646B7B] font-mono">Hoja: {item.tab}</p>
                </div>
                <ArrowRight size={14} className="text-[#1F2330] group-hover:text-white transition-colors" />
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="glass border border-[#1F2330] p-10 rounded-[3rem] space-y-8">
        <div className="space-y-2">
          <h4 className="text-xl font-medium tracking-tight">Cómo cargar tus datos</h4>
          <p className="text-[#646B7B] text-sm italic">Sin subidas manuales, directo a la fuente.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-xs font-bold text-white">01</div>
            <p className="text-xs text-[#A0A6B1] leading-relaxed">Abre el <b className="text-white">Archivo Maestro</b> pulsando el botón de arriba.</p>
          </div>
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-xs font-bold text-white">02</div>
            <p className="text-xs text-[#A0A6B1] leading-relaxed">Navega hasta la pestaña correspondiente (ej. <b className="text-white">TA_CORRIENTE</b>).</p>
          </div>
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-xs font-bold text-white">03</div>
            <p className="text-xs text-[#A0A6B1] leading-relaxed">Pega tus movimientos. El Consultor los leerá en la próxima consulta.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BankView;
