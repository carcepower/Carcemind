
import React, { useState, useEffect } from 'react';
import { ViewType, Memory, Task, Message, GoogleConfig, GmailConfig, TaskStatus } from './types';
import Sidebar from './components/Sidebar';
import Dashboard from './views/Dashboard';
import RecordMemory from './views/RecordMemory';
import ChatView from './views/ChatView';
import TasksView from './views/TasksView';
import MemoriesView from './views/MemoriesView';
import RemindersView from './views/RemindersView';
import SettingsView from './views/SettingsView';
import InstructionsView from './views/InstructionsView';
import CarceMailView from './views/CarceMailView';
import { googleApi } from './lib/googleApi';
import { Menu, X, RefreshCw } from 'lucide-react';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewType>(ViewType.DASHBOARD);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  
  const [googleConfig, setGoogleConfig] = useState<GoogleConfig>(() => {
    const saved = localStorage.getItem('carcemind_google_config');
    return saved ? JSON.parse(saved) : {
      isConnected: false, email: null, accessToken: null, audioFolderId: null, audioFolderName: null, sheetFolderId: null, sheetFolderName: null, spreadsheetId: null
    };
  });

  const [gmailConfig, setGmailConfig] = useState<GmailConfig>(() => {
    const saved = localStorage.getItem('carcemind_gmail_config');
    return saved ? JSON.parse(saved) : { isConnected: false, email: null, accessToken: null };
  });

  // HISTORIAL CON CARGA INICIAL DESDE LOCALSTORAGE PARA VELOCIDAD INSTANTÁNEA
  const [memories, setMemories] = useState<Memory[]>([]); 
  const [tasks, setTasks] = useState<Task[]>([]);
  
  const [chatHistory, setChatHistory] = useState<Message[]>(() => {
    const saved = localStorage.getItem('carcemind_chat_history');
    return saved ? JSON.parse(saved) : [
      { id: '1', role: 'assistant', text: 'Hola Pablo. He analizado tus memorias estructuradas. ¿En qué avanzamos?', timestamp: new Date() }
    ];
  });

  const [mailHistory, setMailHistory] = useState<{ prompt: string, answer: string, results: any[] }[]>(() => {
    const saved = localStorage.getItem('carcemind_mail_history');
    return saved ? JSON.parse(saved) : [];
  });

  // PERSISTENCIA EN LOCALSTORAGE CUANDO CAMBIAN LOS DATOS
  useEffect(() => {
    localStorage.setItem('carcemind_google_config', JSON.stringify(googleConfig));
  }, [googleConfig]);

  useEffect(() => {
    localStorage.setItem('carcemind_gmail_config', JSON.stringify(gmailConfig));
  }, [gmailConfig]);

  useEffect(() => {
    localStorage.setItem('carcemind_chat_history', JSON.stringify(chatHistory));
  }, [chatHistory]);

  useEffect(() => {
    localStorage.setItem('carcemind_mail_history', JSON.stringify(mailHistory));
  }, [mailHistory]);

  const fetchRowsSafe = async (sheetName: string) => {
    try {
      if (!googleConfig.spreadsheetId || !googleConfig.accessToken) return [];
      return await googleApi.getRows(googleConfig.spreadsheetId, sheetName, googleConfig.accessToken);
    } catch (e) {
      console.warn(`La pestaña ${sheetName} no pudo ser cargada.`);
      return [];
    }
  };

  const loadData = async () => {
    if (googleConfig.isConnected && googleConfig.accessToken && googleConfig.spreadsheetId) {
      setIsInitialLoading(true);
      try {
        const [memRows, taskRows, chatRows, mailRows] = await Promise.all([
          fetchRowsSafe('ENTRADAS'),
          fetchRowsSafe('TAREAS'),
          fetchRowsSafe('CHAT_LOG'),
          fetchRowsSafe('MAIL_LOG')
        ]);

        // Procesar Memorias
        if (memRows.length > 1) {
          const loadedMemories: Memory[] = memRows.slice(1).filter((r: any) => r[0]).map((r: any) => ({
            id: r[0], timestamp: new Date(r[1]), title: r[2], excerpt: r[3], emotionalTag: r[4], tags: r[5] ? r[5].split(', ') : [], driveFileId: r[6], driveViewLink: r[7], snippets: r[8] ? r[8].split(' | ') : [], content: r[9] || "", type: 'voice'
          })).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
          setMemories(loadedMemories);
        }

        // Procesar Tareas
        if (taskRows.length > 1) {
          const loadedTasks: Task[] = taskRows.slice(1).filter((r: any) => r[0]).map((r: any) => ({
            id: r[0], date: r[1], title: r[2] || "Tarea sin título", priority: (r[3] || 'medium').toLowerCase() as any, status: (r[4] || 'pendiente') as any, completed: r[4] === 'terminada', originId: r[5], deadline: r[6] ? new Date(r[6]) : new Date(), completedAt: r[7] ? new Date(r[7]) : null
          }));
          setTasks(loadedTasks);
        }

        // Sincronizar Historial de Chat (Solo si hay cambios)
        if (chatRows.length > 1) {
          const loadedChat = chatRows.slice(1).filter((r: any) => r[0]).map((r: any) => ({
            id: r[0], timestamp: new Date(r[1]), role: r[2] as 'user' | 'assistant', text: r[3]
          }));
          // Evitamos sobreescribir si el local ya tiene lo mismo
          if (loadedChat.length !== chatHistory.length) {
            setChatHistory(loadedChat);
          }
        }

        // Sincronizar Historial de Mail
        if (mailRows.length > 1) {
          const loadedMail = mailRows.slice(1).filter((r: any) => r[2]).map((r: any) => ({
            prompt: r[2], answer: r[3], results: JSON.parse(r[4] || '[]')
          }));
          if (loadedMail.length !== mailHistory.length) {
            setMailHistory(loadedMail);
          }
        }

      } catch (error) {
        console.error("Error crítico cargando datos:", error);
      } finally {
        setIsInitialLoading(false);
      }
    }
  };

  useEffect(() => { loadData(); }, [googleConfig.isConnected, googleConfig.spreadsheetId, googleConfig.accessToken]);

  const handleDeleteMemory = async (id: string) => {
    if (!googleConfig.accessToken || !googleConfig.spreadsheetId) return;
    try {
      await googleApi.deleteRowById(googleConfig.spreadsheetId, 'ENTRADAS', id, googleConfig.accessToken);
      setMemories(prev => prev.filter(m => m.id !== id));
    } catch (e) { console.error(e); }
  };

  const handleDeleteTask = async (id: string) => {
    if (!googleConfig.accessToken || !googleConfig.spreadsheetId) return;
    try {
      await googleApi.deleteRowById(googleConfig.spreadsheetId, 'TAREAS', id, googleConfig.accessToken);
      setTasks(prev => prev.filter(t => t.id !== id));
    } catch (e) { console.error(e); }
  };

  const renderView = () => {
    switch (activeView) {
      case ViewType.DASHBOARD: return <Dashboard memories={memories} tasks={tasks} onRefresh={loadData} isLoading={isInitialLoading} />;
      case ViewType.RECORD: return <RecordMemory onMemoryAdded={() => { loadData(); setActiveView(ViewType.MEMORIES); }} googleConfig={googleConfig} />;
      case ViewType.CHAT: return <ChatView memories={memories} googleConfig={googleConfig} messages={chatHistory} setMessages={setChatHistory} />;
      case ViewType.MAIL: return <CarceMailView config={gmailConfig} setConfig={setGmailConfig} history={mailHistory} setHistory={setMailHistory} googleConfig={googleConfig} />;
      case ViewType.TASKS: return <TasksView tasks={tasks} setTasks={setTasks} googleConfig={googleConfig} onDeleteTask={handleDeleteTask} onRefresh={loadData} isLoading={isInitialLoading} />;
      case ViewType.MEMORIES: return <MemoriesView memories={memories} onDeleteMemory={handleDeleteMemory} />;
      case ViewType.SETTINGS: return <SettingsView config={googleConfig} setConfig={setGoogleConfig} />;
      case ViewType.INSTRUCTIONS: return <InstructionsView />;
      default: return <Dashboard memories={memories} tasks={tasks} onRefresh={loadData} isLoading={isInitialLoading} />;
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#0B0D12] text-[#F5F7FA] overflow-hidden">
      <div className="md:hidden flex items-center justify-between p-6 glass border-b border-[#1F2330] z-[60] safe-area-top">
        <h1 className="text-xl font-bold tracking-tighter bg-gradient-to-r from-[#5E7BFF] to-[#8A6CFF] bg-clip-text text-transparent">CarceMind</h1>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-[#A0A6B1]">{isMobileMenuOpen ? <X /> : <Menu />}</button>
      </div>
      <Sidebar activeView={activeView} onViewChange={(v) => { setActiveView(v); setIsMobileMenuOpen(false); }} isMobileMenuOpen={isMobileMenuOpen} />
      <main className="flex-1 overflow-y-auto relative p-6 md:p-12 pb-32 md:pb-12">
        <div className="max-w-7xl mx-auto">
          {isInitialLoading && (
            <div className="fixed top-8 right-8 hidden md:flex items-center gap-3 bg-[#151823] border border-[#1F2330] px-4 py-2 rounded-full z-[100] animate-in fade-in slide-in-from-top-4 shadow-2xl">
              <RefreshCw className="w-4 h-4 animate-spin text-[#5E7BFF]" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#A0A6B1]">Sincronizando...</span>
            </div>
          )}
          {renderView()}
        </div>
      </main>
    </div>
  );
};

export default App;
