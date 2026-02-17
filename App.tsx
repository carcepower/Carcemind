
import React, { useState, useEffect } from 'react';
import { ViewType, Memory, Task, Message, GoogleConfig } from './types';
import Sidebar from './components/Sidebar';
import Dashboard from './views/Dashboard';
import RecordMemory from './views/RecordMemory';
import ChatView from './views/ChatView';
import TasksView from './views/TasksView';
import MemoriesView from './views/MemoriesView';
import RemindersView from './views/RemindersView';
import SettingsView from './views/SettingsView';
import { googleApi } from './lib/googleApi';
import { Menu, X, RefreshCw } from 'lucide-react';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewType>(ViewType.DASHBOARD);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  
  const [googleConfig, setGoogleConfig] = useState<GoogleConfig>(() => {
    const saved = localStorage.getItem('carcemind_google_config');
    return saved ? JSON.parse(saved) : {
      isConnected: false,
      email: null,
      accessToken: null,
      audioFolderId: null,
      audioFolderName: null,
      sheetFolderId: null,
      sheetFolderName: null,
      spreadsheetId: null
    };
  });

  const [memories, setMemories] = useState<Memory[]>([]); 
  const [tasks, setTasks] = useState<Task[]>([]);

  // Guardar config en localStorage
  useEffect(() => {
    localStorage.setItem('carcemind_google_config', JSON.stringify(googleConfig));
  }, [googleConfig]);

  // Sincronización inicial de datos
  useEffect(() => {
    const loadData = async () => {
      if (googleConfig.isConnected && googleConfig.accessToken && googleConfig.spreadsheetId) {
        setIsInitialLoading(true);
        try {
          const [memRows, taskRows] = await Promise.all([
            googleApi.getRows(googleConfig.spreadsheetId, 'ENTRADAS', googleConfig.accessToken),
            googleApi.getRows(googleConfig.spreadsheetId, 'TAREAS', googleConfig.accessToken)
          ]);

          // Mapear Memorias (Saltando cabecera)
          const loadedMemories: Memory[] = memRows.slice(1).map((row: any) => ({
            id: row[0],
            timestamp: new Date(row[1]),
            title: row[2],
            excerpt: row[3],
            emotionalTag: row[4],
            tags: row[5] ? row[5].split(', ') : [],
            driveFileId: row[6],
            driveViewLink: row[7],
            snippets: row[8] ? row[8].split(' | ') : [],
            type: 'voice'
          })).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

          // Mapear Tareas (Saltando cabecera)
          const loadedTasks: Task[] = taskRows.slice(1).map((row: any) => ({
            id: row[0],
            date: row[1],
            title: row[2],
            priority: row[3] as any,
            status: row[4] as any,
            completed: row[4] === 'completed',
            originId: row[5],
            deadline: row[6] ? new Date(row[6]) : new Date()
          }));

          setMemories(loadedMemories);
          setTasks(loadedTasks);
        } catch (error) {
          console.error("Error cargando datos de Google:", error);
        } finally {
          setIsInitialLoading(false);
        }
      }
    };

    loadData();
  }, [googleConfig.isConnected, googleConfig.spreadsheetId]);

  const renderView = () => {
    switch (activeView) {
      case ViewType.DASHBOARD:
        return <Dashboard memories={memories} tasks={tasks} />;
      case ViewType.RECORD:
        return <RecordMemory onMemoryAdded={(m) => { setMemories([m, ...memories]); setActiveView(ViewType.MEMORIES); }} googleConfig={googleConfig} />;
      case ViewType.CHAT:
        return <ChatView memories={memories} googleConfig={googleConfig} />;
      case ViewType.TASKS:
        return <TasksView tasks={tasks} setTasks={setTasks} googleConfig={googleConfig} />;
      case ViewType.MEMORIES:
        return <MemoriesView memories={memories} onDeleteMemory={(id) => setMemories(prev => prev.filter(m => m.id !== id))} />;
      case ViewType.REMINDERS:
        return <RemindersView />;
      case ViewType.SETTINGS:
        return <SettingsView config={googleConfig} setConfig={setGoogleConfig} />;
      default:
        return <Dashboard memories={memories} tasks={tasks} />;
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#0B0D12] text-[#F5F7FA] overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-6 glass border-b border-[#1F2330] z-[60]">
        <h1 className="text-xl font-bold tracking-tighter bg-gradient-to-r from-[#5E7BFF] to-[#8A6CFF] bg-clip-text text-transparent">CarceMind</h1>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-[#A0A6B1]">
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      <Sidebar 
        activeView={activeView} 
        onViewChange={(v) => { setActiveView(v); setIsMobileMenuOpen(false); }} 
        isMobileMenuOpen={isMobileMenuOpen}
      />

      <main className="flex-1 overflow-y-auto relative p-6 md:p-12 pb-24 md:pb-12">
        <div className="max-w-7xl mx-auto">
          {isInitialLoading && (
            <div className="fixed top-8 right-8 flex items-center gap-3 bg-[#151823] border border-[#1F2330] px-4 py-2 rounded-full z-[100] animate-in fade-in slide-in-from-top-4">
              <RefreshCw className="w-4 h-4 animate-spin text-[#5E7BFF]" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#A0A6B1]">Sincronizando Cerebro...</span>
            </div>
          )}

          {!googleConfig.isConnected && activeView !== ViewType.SETTINGS && activeView !== ViewType.DASHBOARD && (
            <div className="mb-12 p-6 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-between">
              <p className="text-sm font-medium">Memoria Estructurada desactivada. Conecta Google en Ajustes.</p>
              <button onClick={() => setActiveView(ViewType.SETTINGS)} className="text-xs font-bold uppercase tracking-widest underline">Ir a Ajustes</button>
            </div>
          )}
          {renderView()}
        </div>
      </main>

      {/* Mobile Quick Record FAB */}
      {activeView !== ViewType.RECORD && (
        <button 
          onClick={() => setActiveView(ViewType.RECORD)}
          className="md:hidden fixed bottom-8 right-8 w-16 h-16 bg-gradient-to-tr from-[#5E7BFF] to-[#8A6CFF] rounded-full shadow-2xl flex items-center justify-center z-50 animate-bounce"
        >
          <div className="w-6 h-6 bg-white rounded-sm" />
        </button>
      )}
    </div>
  );
};

export default App;
