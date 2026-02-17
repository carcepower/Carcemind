
import React from 'react';
import { Calendar as CalendarIcon, Bell, ToggleRight } from 'lucide-react';

const RemindersView: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto h-full flex flex-col items-center justify-center space-y-8 text-center animate-in fade-in zoom-in-95 duration-500">
      <div className="w-20 h-20 rounded-3xl bg-[#151823] border border-[#1F2330] flex items-center justify-center mb-4">
        <Bell className="w-10 h-10 text-[#5E7BFF] animate-bounce" />
      </div>
      <div className="space-y-3">
        <h2 className="text-3xl font-semibold">Alarmas y Recordatorios</h2>
        <p className="text-[#A0A6B1] max-w-sm mx-auto">Este módulo se encuentra actualmente en fase de calibración neuronal. Estará disponible muy pronto.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl mt-8">
        {[1, 2].map(i => (
          <div key={i} className="glass border border-[#1F2330] p-6 rounded-3xl opacity-40 blur-[2px] cursor-not-allowed">
            <div className="flex justify-between items-center mb-4">
              <span className="text-2xl font-mono font-bold">0{i + 7}:30</span>
              <ToggleRight className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-left">Recordatorio diario de meditación {i}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RemindersView;
