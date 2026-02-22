
import React from 'react';
import { Wallet, Sparkles, Clock } from 'lucide-react';
import { GoogleConfig } from '../types';

interface BankViewProps {
  googleConfig: GoogleConfig;
  onDataUpdate: () => Promise<void>;
}

const BankView: React.FC<BankViewProps> = ({ googleConfig, onDataUpdate }) => {
  return (
    <div className="max-w-4xl mx-auto h-[70vh] flex flex-col items-center justify-center space-y-8 animate-in fade-in zoom-in-95 duration-700">
      <div className="relative">
        <div className="w-24 h-24 rounded-[2.5rem] bg-[#151823] border border-[#1F2330] flex items-center justify-center mb-4 relative z-10 shadow-2xl">
          <Wallet className="w-10 h-10 text-[#5E7BFF]" />
        </div>
        <div className="absolute -top-4 -right-4 w-12 h-12 bg-[#5E7BFF]/20 rounded-full blur-2xl animate-pulse" />
      </div>
      
      <div className="text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#5E7BFF]/10 border border-[#5E7BFF]/20 text-[10px] font-bold uppercase tracking-[0.2em] text-[#5E7BFF]">
          <Sparkles size={12} /> Carcemoney Dashboard
        </div>
        <h2 className="text-5xl font-semibold tracking-tight">PRÓXIMAMENTE</h2>
        <p className="text-[#646B7B] max-w-sm mx-auto leading-relaxed">
          Estamos integrando la visualización directa de tus balances y analítica predictiva. <br/><br/>
          <span className="text-white/60 italic text-xs flex items-center justify-center gap-2">
            <Clock size={12}/> Tu Carcemind sigue analizando el Archivo Maestro en segundo plano.
          </span>
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-2xl mt-12 opacity-10 grayscale pointer-events-none">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-32 rounded-3xl bg-[#151823] border border-[#1F2330]" />
        ))}
      </div>
    </div>
  );
};

export default BankView;
