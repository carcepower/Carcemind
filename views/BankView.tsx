
import React from 'react';
import { 
  Wallet, 
  Sparkles, 
  TrendingUp, 
  PieChart, 
  Calendar, 
  ArrowRightLeft, 
  AlertTriangle, 
  Bell, 
  CreditCard, 
  Repeat, 
  ArrowUpRight, 
  Layers,
  Utensils,
  ShoppingBag,
  Zap
} from 'lucide-react';
import { GoogleConfig } from '../types';

interface BankViewProps {
  googleConfig: GoogleConfig;
  onDataUpdate: () => Promise<void>;
}

const CarceButton: React.FC<{ icon: any, label: string, color?: string }> = ({ icon: Icon, label, color = "#10B981" }) => (
  <button className="group relative glass border border-[#1F2330] p-6 rounded-[2rem] flex flex-col items-start gap-4 hover:border-[#10B981]/50 transition-all text-left overflow-hidden">
    <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
      <Icon size={80} style={{ color }} />
    </div>
    <div className="p-3 rounded-2xl transition-colors" style={{ backgroundColor: `${color}15` }}>
      <Icon size={20} style={{ color }} />
    </div>
    <span className="text-sm font-medium leading-tight text-[#A0A6B1] group-hover:text-white transition-colors">{label}</span>
  </button>
);

const AlertItem: React.FC<{ icon: any, label: string, detail: string }> = ({ icon: Icon, label, detail }) => (
  <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#10B981]/5 border border-[#10B981]/10 group hover:border-[#10B981]/30 transition-all">
    <div className="w-10 h-10 rounded-xl bg-[#10B981]/10 flex items-center justify-center shrink-0">
      <Icon size={18} className="text-[#10B981]" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-widest text-[#10B981] mb-0.5">{label}</p>
      <p className="text-xs text-[#A0A6B1] truncate">{detail}</p>
    </div>
    <Zap size={14} className="text-[#10B981] opacity-0 group-hover:opacity-100 transition-opacity" />
  </div>
);

const BankView: React.FC<BankViewProps> = ({ googleConfig, onDataUpdate }) => {
  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-32 animate-in fade-in duration-700">
      
      {/* HEADER FINANCIERO */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#10B981]/10 border border-[#10B981]/20 text-[10px] font-bold uppercase tracking-widest text-[#10B981]">
            <Wallet size={12} /> Carcemoney Intelligence
          </div>
          <h2 className="text-5xl font-semibold tracking-tight">Tu Flujo de Caja</h2>
        </div>
        
        <div className="flex gap-4 w-full md:w-auto">
          <div className="glass border border-[#1F2330] p-4 px-6 rounded-3xl flex flex-col gap-1 min-w-[160px]">
            <span className="text-[10px] font-bold text-[#646B7B] uppercase tracking-widest">Balance Total</span>
            <span className="text-2xl font-semibold text-[#10B981]">--.--- €</span>
          </div>
          <div className="glass border border-[#1F2330] p-4 px-6 rounded-3xl flex flex-col gap-1 min-w-[160px]">
            <span className="text-[10px] font-bold text-[#646B7B] uppercase tracking-widest">Gasto Mes</span>
            <span className="text-2xl font-semibold">--.--- €</span>
          </div>
        </div>
      </header>

      {/* BLOQUE 3: ALERTAS (Automático al entrar) */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 ml-2">
          <Bell size={18} className="text-[#10B981]" />
          <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-[#646B7B]">Alertas del Sistema</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <AlertItem icon={AlertTriangle} label="Gasto Inusual" detail="Detectado pico en suscripciones" />
          <AlertItem icon={TrendingUp} label="Categoría Disparada" detail="Restaurantes +24% vs media" />
          <AlertItem icon={Repeat} label="Nuevo Recurrente" detail="Detectado cargo de 'OpenAI'" />
          <AlertItem icon={CreditCard} label="Cargo Grande" detail="Seguro anual Sabadell detectado" />
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        
        {/* BLOQUE 1: INFORMES */}
        <section className="lg:col-span-2 space-y-6">
          <div className="flex items-center gap-3 ml-2">
            <PieChart size={18} className="text-[#10B981]" />
            <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-[#646B7B]">Informes de Inteligencia</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <CarceButton icon={Calendar} label="Resumen del mes actual" />
            <CarceButton icon={ArrowUpRight} label="¿En qué se me fue el dinero?" />
            <CarceButton icon={Layers} label="Top gastos por categoría" />
            <CarceButton icon={Repeat} label="Suscripciones y cargos fijos" />
            <CarceButton icon={ArrowRightLeft} label="Ingresos vs Gastos (Cashflow)" />
          </div>
        </section>

        {/* BLOQUE 2: COMPARATIVAS */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 ml-2">
            <ArrowRightLeft size={18} className="text-[#8A6CFF]" />
            <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-[#646B7B]">Comparativas</h3>
          </div>
          <div className="flex flex-col gap-4">
            <CarceButton icon={Calendar} label="Este mes vs Mes pasado" color="#8A6CFF" />
            <CarceButton icon={Utensils} label="Restaurantes: Mes vs Mes" color="#8A6CFF" />
            <CarceButton icon={ShoppingBag} label="Compras grandes: Este mes" color="#8A6CFF" />
            <CarceButton icon={CreditCard} label="Empresa vs Personal" color="#8A6CFF" />
          </div>
        </section>

      </div>

      {/* FOOTER INFO */}
      <footer className="p-8 rounded-[2rem] bg-[#151823] border border-[#1F2330] flex flex-col md:flex-row items-center justify-between gap-6 opacity-60">
        <div className="flex items-center gap-4">
          <Sparkles className="text-[#10B981]" size={20} />
          <p className="text-xs text-[#A0A6B1] max-w-md">
            Carcemoney cruza los datos de tus 4 pestañas bancarias en el Archivo Maestro para generar estos informes en tiempo real.
          </p>
        </div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-[#646B7B]">
          CarceMind Engine v1.8
        </div>
      </footer>

    </div>
  );
};

export default BankView;
