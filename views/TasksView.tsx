
import React, { useState } from 'react';
import { Task, GoogleConfig, TaskStatus } from '../types';
import { googleApi } from '../lib/googleApi';
import { Plus, Trash2, Clock, AlertCircle, RefreshCw, Table, ExternalLink, ChevronDown, CheckCircle2, Edit3, Check } from 'lucide-react';

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
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const updateStatus = async (id: string, newStatus: TaskStatus) => {
    setIsSyncing(true);
    const completionDate = newStatus === 'terminada' ? new Date().toISOString() : null;
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus, completedAt: completionDate ? new Date(completionDate) : null, completed: newStatus === 'terminada' } : t));
    // Corrected: using spreadsheetId from GoogleConfig and methods from googleApi
    if (googleConfig.isConnected && googleConfig.spreadsheetId && googleConfig.accessToken) {
      try {
        await googleApi.updateTaskStatusAndDate(googleConfig.spreadsheetId, id, newStatus, completionDate, googleConfig.accessToken);
      } catch (e) { console.error(e); }
    }
    setIsSyncing(false);
  };

  const startEdit = (task: Task) => {
    setEditingTaskId(task.id);
    setEditValue(task.title);
  };

  const saveEdit = async (id: string) => {
    if (!editValue.trim()) return;
    setIsSyncing(true);
    setTasks(prev => prev.map(t => t.id === id ? { ...t, title: editValue } : t));
    // Corrected: using spreadsheetId from GoogleConfig and methods from googleApi
    if (googleConfig.isConnected && googleConfig.spreadsheetId && googleConfig.accessToken) {
      try {
        await googleApi.updateTaskDetail(googleConfig.spreadsheetId, id, editValue, googleConfig.accessToken);
      } catch (e) { console.error(e); }
    }
    setEditingTaskId(null);
    setIsSyncing(false);
  };

  const statusLabels: Record<TaskStatus, string> = { 'pendiente': 'PENDIENTE', 'en marcha': 'EN MARCHA', 'terminada': 'HECHA', 'anulada': 'ANULADA' };
  const priorityColors = { high: '#EF4444', medium: '#F59E0B', low: '#10B981' };
  const filteredTasks = filter === 'all' ? tasks : tasks.filter(t => t.status === filter);

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-left-4 duration-500 pb-32">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-2">
          <p className="text-[#A0A6B1] text-sm uppercase tracking-widest font-bold">Gestión Cognitiva</p>
          <div className="flex items-center gap-4">
            <h2 className="text-4xl font-semibold tracking-tight">Tareas Activas</h2>
            <button onClick={onRefresh} disabled={isLoading || isSyncing} className="p-2 rounded-full bg-[#151823] border border-[#1F2330] transition-all active:scale-95 disabled:opacity-50">
              <RefreshCw className={`w-3 h-3 ${isLoading || isSyncing ? 'animate-spin text-[#5E7BFF]' : 'text-[#A0A6B1]'}`} />
            </button>
          </div>
        </div>
      </header>

      <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
        <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${filter === 'all' ? 'bg-white text-black shadow-xl shadow-white/10' : 'bg-[#151823] text-[#646B7B]'}`}>TODAS</button>
        {Object.entries(statusLabels).map(([key, label]) => (
          <button key={key} onClick={() => setFilter(key as TaskStatus)} className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${filter === key ? 'bg-[#5E7BFF] text-white shadow-xl shadow-[#5E7BFF33]' : 'bg-[#151823] text-[#646B7B]'}`}>{label}</button>
        ))}
      </div>

      <div className="space-y-4">
        {filteredTasks.length > 0 ? filteredTasks.map((task) => (
          <div key={task.id} className={`group flex items-center gap-6 p-6 rounded-[2rem] transition-all border border-[#1F2330] glass ${task.status === 'terminada' ? 'opacity-50 grayscale' : 'hover:bg-[#151823]'}`}>
            <div className="flex-1 space-y-3">
              <div className="flex items-center justify-between">
                {editingTaskId === task.id ? (
                  <div className="flex items-center gap-2 flex-1 mr-4">
                    <input 
                      type="text" 
                      value={editValue} 
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && saveEdit(task.id)}
                      autoFocus
                      className="bg-[#0B0D12] border border-[#5E7BFF] text-lg rounded-xl px-4 py-2 outline-none w-full font-medium" 
                    />
                    <button onClick={() => saveEdit(task.id)} className="p-2 bg-[#5E7BFF] rounded-xl"><Check size={20} /></button>
                  </div>
                ) : (
                  <h4 onClick={() => startEdit(task)} className="text-xl font-medium leading-tight cursor-pointer hover:text-[#5E7BFF] transition-colors flex items-center gap-2 group/title">
                    {task.title} <Edit3 size={14} className="opacity-0 group-hover/title:opacity-100 text-[#646B7B]" />
                  </h4>
                )}
                
                <div className="flex items-center gap-3 shrink-0">
                  <div className="relative">
                    <select value={task.status} onChange={(e) => updateStatus(task.id, e.target.value as TaskStatus)} className="appearance-none bg-[#151823] border border-[#1F2330] rounded-xl px-4 py-2 text-[9px] font-bold uppercase tracking-widest outline-none pr-8">
                      {Object.entries(statusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                    </select>
                    <ChevronDown size={10} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#646B7B]" />
                  </div>
                  <button onClick={() => onDeleteTask(task.id)} className="p-2 rounded-xl text-[#1F2330] group-hover:text-red-400 transition-colors"><Trash2 size={16} /></button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-6 text-[10px] font-bold uppercase tracking-widest">
                <div className="flex items-center gap-2 text-[#646B7B]"><Clock size={12} /> Vence {new Date(task.deadline).toLocaleDateString()}</div>
                <div className="flex items-center gap-2" style={{ color: priorityColors[task.priority as keyof typeof priorityColors] }}><AlertCircle size={12} /> {task.priority}</div>
                {task.completedAt && <div className="text-[#10B981] flex items-center gap-2"><CheckCircle2 size={12} /> Hecha el {new Date(task.completedAt).toLocaleDateString()}</div>}
              </div>
            </div>
          </div>
        )) : <div className="py-20 text-center border border-dashed border-[#1F2330] rounded-[2.5rem] text-[#646B7B] italic">No hay tareas en esta sección.</div>}
      </div>
    </div>
  );
};

export default TasksView;
