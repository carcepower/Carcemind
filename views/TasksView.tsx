
import React, { useState } from 'react';
import { Task, GoogleConfig, TaskStatus } from '../types';
import { googleApi } from '../lib/googleApi';
import { Plus, Trash2, Clock, AlertCircle, RefreshCw, Table, ExternalLink, Filter, ChevronDown, CheckCircle2 } from 'lucide-react';

interface TasksViewProps {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  googleConfig: GoogleConfig;
  onDeleteTask: (id: string) => Promise<void>;
  onRefresh: () => Promise<void>;
  isLoading: boolean;
}

const TasksView: React.FC<TasksViewProps> = ({ tasks, setTasks, googleConfig, onDeleteTask, onRefresh, isLoading }) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [filter, setFilter] = useState<TaskStatus | 'all'>('all');

  const updateStatus = async (id: string, newStatus: TaskStatus) => {
    setIsSyncing(true);
    const completionDate = newStatus === 'terminada' ? new Date().toISOString() : null;
    
    // Actualización local
    setTasks(prev => prev.map(t => 
      t.id === id 
        ? { ...t, status: newStatus, completedAt: completionDate ? new Date(completionDate) : null, completed: newStatus === 'terminada' } 
        : t
    ));

    // Sincronización remota
    if (googleConfig.isConnected && googleConfig.spreadsheetId && googleConfig.accessToken) {
      try {
        await googleApi.updateTaskStatusAndDate(
          googleConfig.spreadsheetId,
          id,
          newStatus,
          completionDate,
          googleConfig.accessToken
        );
      } catch (e) {
        console.error("Error al actualizar estado en Drive:", e);
      }
    }
    setIsSyncing(false);
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

  const statusLabels: Record<TaskStatus, string> = {
    'pendiente': 'PENDIENTE',
    'en marcha': 'EN MARCHA',
    'terminada': 'TERMINADA',
    'anulada': 'ANULADA'
  };

  const filteredTasks = filter === 'all' ? tasks : tasks.filter(t => t.status === filter);

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-left-4 duration-500 pb-32">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-2">
          <p className="text-[#A0A6B1] text-sm uppercase tracking-widest font-medium">Cognición Activa</p>
          <div className="flex items-center gap-4">
            <h2 className="text-4xl font-semibold tracking-tight">Gestión de Tareas</h2>
            {googleConfig.isConnected && (
              <button 
                onClick={onRefresh}
                disabled={isLoading}
                className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#151823] border border-[#1F2330] text-[#A0A6B1] text-[10px] font-bold uppercase tracking-tighter hover:text-white transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isLoading || isSyncing ? 'animate-spin text-[#5E7BFF]' : ''}`} />
                {isLoading || isSyncing ? 'Sincronizando...' : 'Live Sync'}
              </button>
            )}
          </div>
        </div>
        <button className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#5E7BFF] hover:bg-[#4A63CC] text-white shadow-lg shadow-[#5E7BFF33] transition-all text-sm font-bold uppercase tracking-widest">
          <Plus className="w-4 h-4" /> Nueva Tarea
        </button>
      </header>

      {/* Filtros */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
        <button 
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${filter === 'all' ? 'bg-white text-black' : 'bg-[#151823] text-[#646B7B]'}`}
        >
          TODAS
        </button>
        {Object.entries(statusLabels).map(([key, label]) => (
          <button 
            key={key}
            onClick={() => setFilter(key as TaskStatus)}
            className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${filter === key ? 'bg-[#5E7BFF] text-white' : 'bg-[#151823] text-[#646B7B]'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filteredTasks.length > 0 ? filteredTasks.map((task) => (
          <div 
            key={task.id} 
            className={`group flex items-center gap-6 p-6 rounded-3xl transition-all border border-[#1F2330] glass ${
              task.status === 'terminada' ? 'opacity-50 grayscale bg-[#0B0D12]' : 
              task.status === 'anulada' ? 'opacity-30 line-through' : 'hover:bg-[#151823]'
            }`}
          >
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-medium leading-tight">{task.title}</h4>
                <div className="flex items-center gap-4">
                  <div className="relative group/status">
                    <select 
                      value={task.status}
                      onChange={(e) => updateStatus(task.id, e.target.value as TaskStatus)}
                      className="appearance-none bg-[#151823] border border-[#1F2330] rounded-xl px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest outline-none hover:border-[#5E7BFF] transition-all cursor-pointer pr-10"
                    >
                      {Object.entries(statusLabels).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                    <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#646B7B]" />
                  </div>
                  
                  <button 
                    onClick={() => onDeleteTask(task.id)}
                    className="p-2 rounded-lg hover:bg-red-500/10 text-[#1F2330] group-hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-1.5 text-[#646B7B] text-xs">
                  <Clock className="w-3 h-3" />
                  <span>Vence: {new Date(task.deadline).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                </div>
                {task.completedAt && (
                  <div className="flex items-center gap-1.5 text-[#10B981] text-xs font-bold uppercase">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Hecha el {new Date(task.completedAt).toLocaleDateString()}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-tighter" style={{ color: priorityColors[task.priority as keyof typeof priorityColors] || '#A0A6B1' }}>
                  <AlertCircle className="w-3 h-3" />
                  <span>{task.priority}</span>
                </div>
              </div>
            </div>
          </div>
        )) : (
          <div className="py-20 text-center border border-dashed border-[#1F2330] rounded-[2.5rem]">
            <p className="text-[#646B7B] italic">No hay tareas con este filtro.</p>
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
