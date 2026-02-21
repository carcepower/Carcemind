
import React from 'react';
import { Memory } from '../types';
import { Mic, FileText, Tag, Calendar, Trash2, AlertTriangle } from 'lucide-react';

interface MemoriesViewProps {
  memories: Memory[];
  onDeleteMemory: (id: string) => Promise<void>;
}

const MemoriesView: React.FC<MemoriesViewProps> = ({ memories, onDeleteMemory }) => {
  const confirmDelete = async (memory: Memory) => {
    const confirmation = window.confirm(
      `¿Estás seguro de que quieres borrar la memoria: "${memory.title}"?\n\n` +
      `ESTO ELIMINARÁ:\n` +
      `- La fila en Google Sheets (ENTRADAS).\n\n` +
      `IMPORTANTE:\n` +
      `Si esta memoria tiene tareas asociadas, deberás eliminarlas manualmente en la pestaña TAREAS.`
    );

    if (confirmation) {
      await onDeleteMemory(memory.id);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <header className="space-y-2 text-center">
        <p className="text-[#A0A6B1] text-sm uppercase tracking-widest font-medium">Archivo Cognitivo</p>
        <h2 className="text-4xl font-semibold tracking-tight">Cronología de Memorias</h2>
      </header>

      {memories.length > 0 ? (
        <div className="relative space-y-12 before:absolute before:left-[23px] before:top-2 before:bottom-2 before:w-px before:bg-gradient-to-b before:from-[#5E7BFF] before:via-[#1F2330] before:to-transparent">
          {memories.map((memory) => (
            <div key={memory.id} className="relative pl-16 group animate-in fade-in slide-in-from-left-2 duration-300">
              <div className="absolute left-0 top-1 w-12 h-12 rounded-2xl bg-[#151823] border border-[#1F2330] flex items-center justify-center z-10 group-hover:border-[#5E7BFF] transition-all">
                {memory.type === 'voice' ? <Mic className="w-5 h-5 text-[#5E7BFF]" /> : <FileText className="w-5 h-5 text-[#8A6CFF]" />}
              </div>

              <div className="glass border border-[#1F2330] p-8 rounded-[2rem] space-y-4 hover:shadow-2xl hover:shadow-black/50 transition-all relative overflow-hidden group/card">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[#646B7B] text-xs font-mono mb-2">
                      <Calendar className="w-3 h-3" />
                      <span>{memory.timestamp.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    </div>
                    <h3 className="text-2xl font-medium tracking-tight text-[#F5F7FA]">{memory.title}</h3>
                  </div>
                  <div className="flex items-center gap-3">
                    {memory.emotionalTag && (
                      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1F2330] text-[#A0A6B1] text-[10px] font-semibold uppercase tracking-widest border border-[#1F2330]">
                        <Tag className="w-3 h-3" />
                        {memory.emotionalTag}
                      </span>
                    )}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        confirmDelete(memory);
                      }}
                      className="p-2.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all duration-300 opacity-0 group-hover/card:opacity-100"
                      title="Borrar memoria"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <p className="text-[#A0A6B1] leading-relaxed line-clamp-2">
                  {memory.excerpt}
                </p>

                <div className="pt-4 flex items-center gap-6 text-[#646B7B] text-xs font-medium uppercase tracking-widest">
                  <button className="hover:text-[#5E7BFF] transition-colors">Ver Detalles</button>
                  <button className="hover:text-white transition-colors">Transcripción</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 space-y-6">
          <div className="w-20 h-20 rounded-[2rem] bg-[#151823] flex items-center justify-center">
            <Mic className="w-10 h-10 text-[#646B7B]" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-xl font-medium">No hay memorias almacenadas</h3>
            <p className="text-[#646B7B]">Tus pensamientos aparecerán aquí cronológicamente.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemoriesView;
