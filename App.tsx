
import React, { useState, useEffect } from 'react';
import { ViewType, Memory, Task, Message, GoogleConfig, GmailConfig } from './types';
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
import BankView from './views/BankView';
import { googleApi } from './lib/googleApi';
import { Menu, X, RefreshCw, AlertCircle } from 'lucide-react';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewType>(ViewType.DASHBOARD);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [sessionError, setSessionError] = useState(false);
  
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

  const [memories, setMemories] = useState<Memory[]>([]); 
  const [tasks, setTasks] = useState<Task[]>([]);
  const [bankTrans, setBankTrans] = useState<any[]>([]);
  
  const [chatHistory, setChatHistory] = useState<Message[]>(() => {
    const saved = localStorage.getItem('carcemind_chat_history');
    return saved ? JSON.parse(saved) : [
      { id: '1', role: 'assistant', text: 'Hola Pablo. He analizado tus memorias estructuradas y finanzas. ¿En qué avanzamos?', timestamp: new Date() }
    ];
  });

  const [mailHistory, setMailHistory] = useState<{ prompt: string, answer: string, results: any[] }[]>(() => {
    const saved = localStorage.getItem('carcemind_mail_history');
    return saved ? JSON.parse(saved) : [];
  });

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

  const loadData = async () => {
    if (googleConfig.isConnected && googleConfig.accessToken && googleConfig.spreadsheetId) {
      setIsInitialLoading(true);
      setSessionError(false);
      try {
        const [memRows, taskRows, taCorr, taAho, perCorr, perAho] = await Promise.all([
          googleApi.getRows(googleConfig.spreadsheetId, 'ENTRADAS', googleConfig.accessToken),
          googleApi.getRows(googleConfig.spreadsheetId, 'TAREAS', googleConfig.accessToken),
          googleApi.getRows(googleConfig.spreadsheetId, 'TA_CORRIENTE', googleConfig.accessToken).catch(() => []),
          googleApi.getRows(googleConfig.spreadsheetId, 'TA_AHORRO', googleConfig.accessToken).catch(() => []),
          googleApi.getRows(googleConfig.spreadsheetId, 'PERSONAL_CORRIENTE', googleConfig.accessToken).catch(() => []),
          googleApi.getRows(googleConfig.spreadsheetId, 'PERSONAL_AHORRO', googleConfig.accessToken).catch(() => [])
        ]);

        if (memRows.length > 1) {
          const loadedMemories: Memory[] = memRows.slice(1).filter((r: any) => r[0]).map((r: any) => ({
            id: r[0], timestamp: new Date(r[1]), title: r[2], excerpt: r[3], emotionalTag: r[4], tags: r[5] ? r[5].split(', ') : [], driveFileId: r[6], driveViewLink: r[7], snippets: r[8] ? r[8].split(' | ') : [], content: r[9] || "", type: 'voice'
          })).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
          setMemories(loadedMemories);
        }

        if (taskRows.length > 1) {
          const loadedTasks: Task[] = taskRows.slice(1).filter((r: any) => r[0]).map((r: any) => ({
            id: r[0], date: r[1], title: r[2] || "Tarea sin título", priority: (r[3] || 'medium').toLowerCase() as any, status: (r[4] || 'pendiente') as any, completed: r[4] === 'terminada', originId: r[5], deadline: r[6] ? new Date(r[6]) : new Date(), completedAt: r[7] ? new Date(r[7]) : null
          }));
          setTasks(loadedTasks);
        }

        const combinedFinance = [
          ...taCorr.slice(1).map(r => ({ date: r[0], concept: r[1], amount: r[3], type: 'TA_Empresa_Corriente' })),
          ...taAho.slice(1).map(r => ({ date: r[0], concept: r[1], amount: r[3], type: 'TA_Empresa_Ahorro' })),
          ...perCorr.slice(1).map(r => ({ date: r[0], concept: r[2], amount: r[4], type: 'Personal_Caixa_Corriente' })),
          ...perAho.slice(1).map(r => ({ date: r[0], concept: r[2], amount: r[4], type: 'Personal_Caixa_Ahorro' }))
        ].filter(t => t.date);
        setBankTrans(combinedFinance);

      } catch (error: any) {
        if (error.message === "SESSION_EXPIRED") {
          setSessionError(true);
        }
        console.error("Error cargando datos:", error);
      } finally {
        setIsInitialLoading(false);
      }
    }
  };

  useEffect(() => { loadData(); }, [googleConfig.isConnected, googleConfig.spreadsheetId, googleConfig.accessToken]);

  const renderView = () => {
    switch (activeView) {
      case ViewType.DASHBOARD: return <Dashboard memories={memories} tasks={tasks} onRefresh={loadData} isLoading={isInitialLoading} />;
      case ViewType.RECORD: return <RecordMemory onMemoryAdded={() => { loadData(); setActiveView(ViewType.MEMORIES); }} googleConfig={googleConfig} />;
      case ViewType.CHAT: return <ChatView memories={memories} googleConfig={googleConfig} messages={chatHistory} setMessages={setChatHistory} bankData={bankTrans} />;
      case ViewType.MAIL: return <CarceMailView config={gmailConfig} setConfig={setGmailConfig} history={mailHistory} setHistory={setMailHistory} googleConfig={googleConfig} />;
      case ViewType.BANK: return <BankView googleConfig={googleConfig} onDataUpdate={loadData} />;
      case ViewType.TASKS: return <TasksView tasks={tasks} setTasks={setTasks} googleConfig={googleConfig} onDeleteTask={handleDeleteTask} onRefresh={loadData} isLoading={isInitialLoading} />;
      case ViewType.MEMORIES: return <MemoriesView memories={memories} onDeleteMemory={handleDeleteMemory} />;
      case ViewType.SETTINGS: return <SettingsView config={googleConfig} setConfig={setGoogleConfig} />;
      case ViewType.INSTRUCTIONS: return <InstructionsView />;
      default: return <Dashboard memories={memories} tasks={tasks} onRefresh={loadData} isLoading={isInitialLoading} />;
    }
  };

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

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#0B0D12] text-[#F5F7FA] overflow-hidden">
      {sessionError && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] w-full max-w-lg px-4 animate-in slide-in-from-top-4">
          <div className="bg-amber-500 text-black p-4 rounded-2xl flex items-center justify-between shadow-2xl font-bold">
            <div className="flex items-center gap-3">
              <AlertCircle size={20} />
              <span className="text-sm">Pablo, tu sesión de Google ha caducado.</span>
            </div>
            <button 
              onClick={() => { setSessionError(false); setActiveView(ViewType.SETTINGS); }}
              className="bg-black text-white px-4 py-2 rounded-xl text-xs"
            >
              Reconectar
            </button>
          </div>
        </div>
      )}
      
      <div className="md:hidden flex items-center justify-between p-6 glass border-b border-[#1F2330] z-[60] safe-area-top">
        <h1 className="text-xl font-bold tracking-tighter bg-gradient-to-r from-[#5E7BFF] to-[#8A6CFF] bg-clip-text text-transparent">CarceMind</h1>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-[#A0A6B1]">{isMobileMenuOpen ? <X /> : <Menu />}</button>
      </div>
      <Sidebar activeView={activeView} onViewChange={(v) => { setActiveView(v); setIsMobileMenuOpen(false); }} isMobileMenuOpen={isMobileMenuOpen} />
      <main className="flex-1 overflow-y-auto relative p-6 md:p-12 pb-32 md:pb-12">
        <div className="max-w-7xl mx-auto">
          {isInitialLoading && (
            <div className="fixed top-8 right-8 hidden md:flex items-center gap-3 bg-[#151823] border border-[#1F2330] px-4 py-2 rounded-full z-[100] animate-in fade-in shadow-2xl">
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

