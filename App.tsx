
import React, { useState, useEffect } from 'react';
import { ViewType, Memory, Task, Message, GoogleConfig, GmailConfig } from './types.ts';
import Sidebar from './components/Sidebar.tsx';
import Dashboard from './views/Dashboard.tsx';
import RecordMemory from './views/RecordMemory.tsx';
import ChatView from './views/ChatView.tsx';
import TasksView from './views/TasksView.tsx';
import MemoriesView from './views/MemoriesView.tsx';
import RemindersView from './views/RemindersView.tsx';
import SettingsView from './views/SettingsView.tsx';
import InstructionsView from './views/InstructionsView.tsx';
import CarceMailView from './views/CarceMailView.tsx';
import BankView from './views/BankView.tsx';
import { googleApi } from './lib/googleApi.ts';
import { Menu, X, RefreshCw, AlertCircle, Info } from 'lucide-react';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewType>(ViewType.DASHBOARD);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [sessionError, setSessionError] = useState(false);
  const [diagnosticMsg, setDiagnosticMsg] = useState<string | null>(null);
  
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
      { id: '1', role: 'assistant', text: 'Hola Pablo. Todo listo para analizar tu memoria personal y finanzas.', timestamp: new Date() }
    ];
  });

  const [mailHistory, setMailHistory] = useState<{ prompt: string, answer: string, results: any[] }[]>(() => {
    const saved = localStorage.getItem('carcemind_mail_history');
    return saved ? JSON.parse(saved) : [];
  });

  // Función para parsear fechas de forma segura (maneja DD/MM/YYYY y ISO)
  const safeParseDate = (dateStr: any): Date => {
    if (!dateStr) return new Date();
    // Si ya es un objeto Date
    if (dateStr instanceof Date) return isNaN(dateStr.getTime()) ? new Date() : dateStr;
    
    // Si viene como string DD/MM/YYYY
    if (typeof dateStr === 'string' && dateStr.includes('/')) {
      const [d, m, y] = dateStr.split('/').map(Number);
      if (d && m && y) return new Date(y, m - 1, d);
    }
    
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? new Date() : d;
  };

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
      
      console.group("🔍 DIAGNÓSTICO CARCEMIND");

      const safeLoad = async (tabName: string) => {
        try {
          const rows = await googleApi.getRows(googleConfig.spreadsheetId!, tabName, googleConfig.accessToken!);
          console.log(`📊 LECTURA: ${tabName} -> Filas encontradas: ${rows.length}`);
          return rows;
        } catch (e: any) {
          if (e.message.includes("SESSION_EXPIRED")) throw e;
          console.warn(`Pestaña ${tabName} no accesible:`, e.message);
          return [];
        }
      };

      try {
        const [memRows, taskRows, taCorr, taAho, perCorr, perAho] = await Promise.all([
          safeLoad('ENTRADAS'),
          safeLoad('TAREAS'),
          safeLoad('TA_CORRIENTE'),
          safeLoad('TA_AHORRO'),
          safeLoad('PERSONAL_CORRIENTE'),
          safeLoad('PERSONAL_AHORRO')
        ]);

        // Procesamiento Memorias
        if (memRows.length > 1) {
          const loadedMemories: Memory[] = memRows.slice(1).filter((r: any) => r[0]).map((r: any) => ({
            id: String(r[0]), 
            timestamp: safeParseDate(r[1]), 
            title: r[2] || "Sin título", 
            excerpt: r[3] || "", 
            emotionalTag: r[4] || "", 
            tags: r[5] ? r[5].split(', ') : [], 
            driveFileId: r[6] || "", 
            driveViewLink: r[7] || "", 
            snippets: r[8] ? r[8].split(' | ') : [], 
            type: 'voice'
          })).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
          setMemories(loadedMemories);
          console.log("✅ Memorias mapeadas:", loadedMemories.length);
        }

        // Procesamiento Tareas
        if (taskRows.length > 1) {
          const loadedTasks: Task[] = taskRows.slice(1).filter((r: any) => r[0]).map((r: any) => ({
            id: String(r[0]), 
            date: r[1], 
            title: r[2] || "Tarea sin título", 
            priority: (r[3] || 'medium').toLowerCase() as any, 
            status: (r[4] || 'pendiente') as any, 
            completed: r[4] === 'terminada', 
            originId: r[5] || "", 
            deadline: safeParseDate(r[6]), 
            completedAt: r[7] ? safeParseDate(r[7]) : null
          }));
          setTasks(loadedTasks);
          console.log("✅ Tareas mapeadas:", loadedTasks.length);
        }

        // Procesamiento Finanzas
        const combinedFinance = [
          ...taCorr.slice(1).map(r => ({ date: r[0], concept: r[1], amount: r[3], type: 'TA_Empresa_Corriente' })),
          ...taAho.slice(1).map(r => ({ date: r[0], concept: r[1], amount: r[3], type: 'TA_Empresa_Ahorro' })),
          ...perCorr.slice(1).map(r => ({ date: r[0], concept: r[2], amount: r[4], type: 'Personal_Caixa_Corriente' })),
          ...perAho.slice(1).map(r => ({ date: r[0], concept: r[2], amount: r[4], type: 'Personal_Caixa_Ahorro' }))
        ].filter(t => t.date && t.concept);
        setBankTrans(combinedFinance);
        console.log("✅ Finanzas mapeadas:", combinedFinance.length);

      } catch (error: any) {
        if (error.message === "SESSION_EXPIRED") setSessionError(true);
        console.error("Fallo crítico en loadData:", error);
      } finally {
        setIsInitialLoading(false);
        console.groupEnd();
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
              <span className="text-sm">Sesión caducada.</span>
            </div>
            <button onClick={() => { setSessionError(false); setActiveView(ViewType.SETTINGS); }} className="bg-black text-white px-4 py-2 rounded-xl text-xs">Reconectar</button>
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
          {renderView()}
        </div>
      </main>
    </div>
  );
};

export default App;
