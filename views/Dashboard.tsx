
import React from 'react';
import { Memory, Task } from '../types';
import { TrendingUp, CheckCircle, Database, Calendar } from 'lucide-react';

interface DashboardProps {
  memories: Memory[];
  tasks: Task[];
}

const Dashboard: React.FC<DashboardProps> = ({ memories, tasks }) => {
  const pendingTasks = tasks.filter(t => !t.completed).length;
  const nextTask = tasks.filter(t => !t.completed).sort((a,b) => a.deadline.getTime() - b.deadline.getTime())[0];

  const stats = [
    { label: 'Memorias Totales', value: memories.length, icon: Database, color: '#5E7BFF' },
    { label: 'Tareas Pendientes', value: pendingTasks, icon: CheckCircle, color: '#8A6CFF' },
    { label: 'Ritmo Mental', value: 'Óptimo', icon: TrendingUp, color: '#10B981' }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="space-y-2">
        <p className="text-[#A0A6B1] text-sm uppercase tracking-widest font-medium">Resumen de Hoy</p>
        <h2 className="text-4xl font-semibold tracking-tight">Bienvenido, CarceMind está listo.</h2>
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
            {memories.slice(0, 3).map(memory => (
              <div key={memory.id} className="flex gap-6 group cursor-pointer">
                <div className="w-1.5 h-1.5 rounded-full bg-[#5E7BFF] mt-2 group-hover:scale-150 transition-transform" />
                <div className="flex-1 space-y-1">
                  <p className="font-medium text-[15px]">{memory.title}</p>
                  <p className="text-[#A0A6B1] text-sm line-clamp-1 leading-relaxed">{memory.excerpt}</p>
                </div>
                <span className="text-[#646B7B] text-xs font-mono">{new Date(memory.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="glass border border-[#1F2330] p-10 rounded-[2.5rem] space-y-6 flex flex-col">
          <h4 className="text-xl font-medium tracking-tight">Próxima Tarea</h4>
          {nextTask ? (
            <div className="flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-[#8A6CFF]" />
                  <span className="text-[#A0A6B1] text-sm">{nextTask.deadline.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                </div>
                <h5 className="text-2xl font-medium leading-tight">{nextTask.title}</h5>
              </div>
              <button className="mt-8 px-6 py-4 rounded-2xl bg-[#151823] border border-[#1F2330] hover:bg-[#1F2330] text-sm font-medium transition-colors">
                Ver todas las tareas
              </button>
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
