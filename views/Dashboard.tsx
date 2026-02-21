
import React from 'react';
import { GoogleConfig } from '../types';

interface DashboardProps {
  config: GoogleConfig;
}

const Dashboard: React.FC<DashboardProps> = ({ config }) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <header>
        <h2 className="text-4xl font-semibold tracking-tight">Bienvenido a CarceMind</h2>
        <p className="text-[#646B7B] mt-2">
          {config.isConnected 
            ? `Conectado como ${config.email}. Listo para empezar.` 
            : "Por favor, configura tu cuenta en Ajustes para comenzar."}
        </p>
      </header>
      
      <div className="grid grid-cols-1 gap-6 mt-12">
        <div className="glass border border-[#1F2330] p-12 rounded-[2.5rem] text-center">
          <p className="text-[#646B7B] italic">El sistema está limpio y listo para el nuevo desarrollo.</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
