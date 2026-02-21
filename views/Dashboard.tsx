
import React from 'react';
import { Memory, Task } from '../types';
import { TrendingUp, CheckCircle, Database, Calendar, RefreshCw } from 'lucide-react';

interface DashboardProps {
  memories: Memory[];
  tasks: Task[];
  onRefresh: () => Promise<void>;
  isLoading: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ memories, tasks, onRefresh, isLoading }) => {
  const pendingTasks = tasks.filter(t => t.status !== 'terminada' && t.status !== 'anulada').length;
  const nextTask = tasks
    .filter(t => t.status !== 'terminada' && t.status !== 'anulada')
    .sort((a,b) => a.deadline.getTime() - b.deadline.getTime())[0];

  const stats = [
    { label: 'Memorias Totales', value: memories.length, icon: Database, color: '#5E7BFF' },
    { label: 'Tareas Pendientes', value: pendingTasks, icon: CheckCircle, color: '#8A6CFF' },
    { label: 'Ritmo Mental', value: 'Óptimo', icon: TrendingUp, color: '#10B981' }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-2">
          <p className="text-[#A0A6B1] text-sm uppercase tracking-widest font-medium">Resumen de Hoy</p>
          <h2 className="text-4xl font-semibold tracking-tight">Bienvenido, CarceMind está listo.</h2>
        </div>
        <button 
          onClick={onRefresh}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#151823] border border-[#1F2330] text-[#A0A6B1] hover:text-white transition-all active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#5E7BFF]' : ''}`} />
          <span className="text-[10px] font-bold uppercase tracking-widest">Sincronizar Cloud</span>
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="glass border border-[#1F2330] p-8 rounded-[2rem] flex flex-col gap-6 hover:bg-[#151823] transition-all cursor-default">
            <div className="p-3 rounded-2xl w-fit" style={{ backgroundColor: `${stat.color}15` }}>
              <stat.icon className="w-6 h-6" style={{ color: stat.color }} />
            </div>
            <div>
              <p className="text-[#A0A6B1] text-sm mb-1">{stat.label}</p>
              <h3 className="text-3xl font-semibold">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="glass border border-[#1F2330] p-10 rounded-[2.5rem] space-y-6">
          <div className="flex justify-between items-center">
            <h4 className="text-xl font-medium tracking-tight">Actividad Reciente</h4>
            <span className="text-[#A0A6B1] text-xs">Últimos 7 días</span>
          </div>
          <div className="space-y-6">
            {memories.length > 0 ? memories.slice(0, 3).map(memory => (
              <div key={memory.id} className="flex gap-6 group cursor-pointer">
                <div className="w-1.5 h-1.5 rounded-full bg-[#5E7BFF] mt-2 group-hover:scale-150 transition-transform" />
                <div className="flex-1 space-y-1">
                  <p className="font-medium text-[15px]">{memory.title}</p>
                  <p className="text-[#A0A6B1] text-sm line-clamp-1 leading-relaxed">{memory.excerpt}</p>
                </div>
                <span className="text-[#646B7B] text-xs font-mono">{new Date(memory.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            )) : (
              <p className="text-[#646B7B] text-sm italic py-4">Sin actividad reciente.</p>
            )}
          </div>
        </section>

        <section className="glass border border-[#1F2330] p-10 rounded-[2.5rem] space-y-6 flex flex-col">
          <h4 className="text-xl font-medium tracking-tight">Próxima Tarea</h4>
          {nextTask ? (
            <div className="flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-[#8A6CFF]" />
                  <span className="text-[#A0A6B1] text-sm">{new Date(nextTask.deadline).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                </div>
                <h5 className="text-2xl font-medium leading-tight">{nextTask.title}</h5>
              </div>
              <div className="mt-8 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#151823] border border-[#1F2330] w-fit">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#646B7B]">Estado:</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#5E7BFF]">{nextTask.status}</span>
              </div>
            </div>
          ) : (
            <p className="text-[#A0A6B1] italic">No hay tareas pendientes.</p>
          )}
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
