
import React, { useState } from 'react';
import { Task, GoogleConfig } from '../types';
import { Plus, Check, Clock, AlertCircle, RefreshCw, Table, ExternalLink } from 'lucide-react';

interface TasksViewProps {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  googleConfig: GoogleConfig;
}

const TasksView: React.FC<TasksViewProps> = ({ tasks, setTasks, googleConfig }) => {
  const [isSyncing, setIsSyncing] = useState(false);

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed, status: t.completed ? 'pending' : 'completed' } : t));
    if (googleConfig.isConnected) {
      triggerSync();
    }
  };

  const triggerSync = () => {
    setIsSyncing(true);
    setTimeout(() => setIsSyncing(false), 1200);
  };

  const openSpreadsheet = () => {
    if (googleConfig.spreadsheetId) {
      window.open(`https://docs.google.com/spreadsheets/d/${googleConfig.spreadsheetId}/edit`, '_blank');
    }
  };

  const priorityColors = {
    high: '#EF4444',
    medium: '#F59E0B',
    low: '#10B981'
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-left-4 duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-2">
          <p className="text-[#A0A6B1] text-sm uppercase tracking-widest font-medium">Cognición Activa</p>
          <div className="flex items-center gap-4">
            <h2 className="text-4xl font-semibold tracking-tight">Tareas Futuras</h2>
            {googleConfig.isConnected && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#10B981]/10 border border-[#10B981]/20 text-[#10B981] text-[10px] font-bold uppercase tracking-tighter">
                {isSyncing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Table className="w-3 h-3" />}
                {isSyncing ? 'Sincronizando...' : 'Live Sync'}
              </div>
            )}
          </div>
        </div>
        <button className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#151823] border border-[#1F2330] hover:border-[#5E7BFF] transition-all text-sm font-medium">
          <Plus className="w-4 h-4" /> Nueva Tarea
        </button>
      </header>

      <div className="space-y-4">
        {tasks.length > 0 ? tasks.map((task) => (
          <div 
            key={task.id} 
            className={`group flex items-center gap-6 p-6 rounded-3xl transition-all border border-[#1F2330] ${
              task.completed ? 'opacity-50 grayscale' : 'hover:bg-[#151823] glass'
            }`}
          >
            <button
              onClick={() => toggleTask(task.id)}
              className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all ${
                task.completed 
                  ? 'bg-[#5E7BFF] border-[#5E7BFF] text-white' 
                  : 'border-[#1F2330] group-hover:border-[#5E7BFF]'
              }`}
            >
              {task.completed && <Check className="w-4 h-4 stroke-[3]" />}
            </button>
            
            <div className="flex-1 space-y-1">
              <h4 className={`text-lg font-medium transition-all ${task.completed ? 'line-through text-[#646B7B]' : ''}`}>
                {task.title}
              </h4>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-[#646B7B] text-xs">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(task.deadline).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-tighter" style={{ color: priorityColors[task.priority as keyof typeof priorityColors] || '#A0A6B1' }}>
                  <AlertCircle className="w-3 h-3" />
                  <span>{task.priority}</span>
                </div>
              </div>
            </div>
          </div>
        )) : (
          <div className="py-20 text-center border border-dashed border-[#1F2330] rounded-[2.5rem]">
            <p className="text-[#646B7B] italic">No hay tareas pendientes en tu cerebro.</p>
          </div>
        )}
      </div>
      
      {googleConfig.isConnected && (
        <div className="p-6 rounded-3xl border border-dashed border-[#1F2330] flex flex-col md:flex-row items-center justify-between text-[#646B7B] gap-4">
          <div className="flex items-center gap-3">
            <Table className="w-5 h-5 text-[#10B981]" />
            <span className="text-xs">Índice activo: <span className="text-white font-medium">CarceMind_Memory_Index</span></span>
          </div>
          <button 
            onClick={openSpreadsheet}
            className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest hover:text-[#5E7BFF] transition-colors"
          >
            Abrir en Google Sheets <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
};

export default TasksView;
