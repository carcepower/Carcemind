import React, { useState, useEffect } from 'react';
import { GoogleConfig } from '../types';
import { googleApi } from '../lib/googleApi';
import { 
  Chrome, FolderOpen, RefreshCw, AlertCircle, LogOut, CheckCircle2, FileSpreadsheet, Database, Wallet, Sparkles, Wrench, Loader2, Key
} from 'lucide-react';

interface SettingsViewProps {
  config: GoogleConfig;
  setConfig: React.Dispatch<React.SetStateAction<GoogleConfig>>;
}

const CLIENT_ID = "660418616677-8rbbg21t1ksej5vuso1ou9r7sue8ma3a.apps.googleusercontent.com"; 

const SettingsView: React.FC<SettingsViewProps> = ({ config, setConfig }) => {
  const [folders, setFolders] = useState<{id: string, name: string}[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFolderSelector, setActiveFolderSelector] = useState<'audio' | 'sheet' | null>(null);
  const [isRepairing, setIsRepairing] = useState(false);

  const [indexStatus, setIndexStatus] = useState<'searching' | 'found' | 'not_found' | 'idle'>('idle');
  const [financeStatus, setFinanceStatus] = useState<'searching' | 'found' | 'tabs_missing' | 'idle'>('idle');
  const [logsStatus, setLogsStatus] = useState<'searching' | 'found' | 'tabs_missing' | 'idle'>('idle');
  const [missingTabs, setMissingTabs] = useState<string[]>([]);

  useEffect(() => {
    if (config.isConnected && config.accessToken) loadFolders();
  }, [config.isConnected, config.accessToken]);

  useEffect(() => {
    if (config.isConnected && config.accessToken && config.sheetFolderId) checkForIndexIntegrity();
  }, [config.sheetFolderId, config.accessToken]);

  const checkForIndexIntegrity = async () => {
    if (!config.accessToken || !config.sheetFolderId) return;
    setIndexStatus('searching');
    setFinanceStatus('searching');
    setLogsStatus('searching');
    
    try {
      const file = await googleApi.findFileInFolder(config.accessToken, 'CarceMind_Memory_Index', config.sheetFolderId);
      if (file) {
        setConfig(prev => ({ ...prev, spreadsheetId: file.id }));
        setIndexStatus('found');

        const metadata = await googleApi.getSpreadsheetMetadata(file.id, config.accessToken);
        const existingTabs = metadata.sheets.map((s: any) => s.properties.title);
        
        const financeTabs = ['TA_CORRIENTE', 'TA_AHORRO', 'PERSONAL_CORRIENTE', 'PERSONAL_AHORRO'];
        const mFinance = financeTabs.filter(tab => !existingTabs.includes(tab));
        setFinanceStatus(mFinance.length === 0 ? 'found' : 'tabs_missing');

        const logTabs = ['CHAT_LOG', 'MAIL_LOG', 'ENTRADAS', 'TAREAS'];
        const mLogs = logTabs.filter(tab => !existingTabs.includes(tab));
        setLogsStatus(mLogs.length === 0 ? 'found' : 'tabs_missing');
        
        setMissingTabs([...new Set([...mFinance, ...mLogs])]);
      } else {
        setIndexStatus('not_found');
      }
    } catch (e: any) {
      if (e.message.includes("SESSION_EXPIRED")) handleSessionExpired();
      setIndexStatus('idle');
    }
  };

  const handleOpenKeySelector = async () => {
    try {
      await (window as any).aistudio.openSelectKey();
      // Tras seleccionar la clave, notificamos al usuario
      alert("Clave de IA vinculada correctamente. Ya puedes usar el Chat y la Grabadora.");
    } catch (e) {
      setError("No se pudo abrir el selector de claves.");
    }
  };

  const handleRepair = async () => {
    if (!config.spreadsheetId || !config.accessToken || missingTabs.length === 0) return;
    setIsRepairing(true);
    try {
      await googleApi.createSheetTabs(config.spreadsheetId, missingTabs, config.accessToken);
      await checkForIndexIntegrity();
    } catch (e: any) {
      setError("Error al reparar: " + e.message);
    } finally {
      setIsRepairing(false);
    }
  };

  const handleSessionExpired = () => {
    setConfig(prev => ({ ...prev, isConnected: false, accessToken: null, email: null }));
    setError("Tu sesión de Google ha expirado. Por favor, vuelve a conectar.");
  };

  const loadFolders = async () => {
    if (!config.accessToken) return;
    setLoadingFolders(true);
    try {
      const list = await googleApi.listFolders(config.accessToken);
      setFolders(list);
    } catch (e: any) {
      if (e.message.includes("SESSION_EXPIRED")) handleSessionExpired();
      else setError(e.message || "Error al listar carpetas.");
    } finally {
      setLoadingFolders(false);
    }
  };

  const handleConnect = () => {
    setError(null);
    try {
      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: 'openid https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.metadata.readonly https://www.googleapis.com/auth/spreadsheets',
        prompt: 'consent select_account',
        callback: (response: any) => {
          if (response.access_token) {
            fetch('https://www.googleapis.com/oauth2/v2/userinfo', { headers: { Authorization: `Bearer ${response.access_token}` } })
            .then(res => res.json())
            .then(user => {
              setConfig(prev => ({ ...prev, isConnected: true, accessToken: response.access_token, email: user.email }));
            });
          }
        },
      });
      client.requestAccessToken();
    } catch (e) { setError("Error al iniciar Google Auth."); }
  };

  const handleDisconnect = () => {
    setConfig(prev => ({ ...prev, isConnected: false, accessToken: null, email: null, spreadsheetId: null }));
    setFolders([]);
    setIndexStatus('idle');
  };

  const selectFolder = (type: 'audio' | 'sheet', folderId: string, folderName: string) => {
    setConfig(prev => ({
      ...prev,
      [type === 'audio' ? 'audioFolderId' : 'sheetFolderId']: folderId,
      [type === 'audio' ? 'audioFolderName' : 'sheetFolderName']: folderName
    }));
    setActiveFolderSelector(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-32 animate-in fade-in duration-700">
      <header className="space-y-2">
        <p className="text-[#A0A6B1] text-sm uppercase tracking-widest font-bold">Configuración de Origen</p>
        <h2 className="text-4xl font-semibold tracking-tight">Ajustes del Sistema</h2>
      </header>

      {/* SECCIÓN DE LLAVE API DE GEMINI - CRÍTICA PARA EL ERROR 403/KEY MISSING */}
      <section className="p-10 rounded-[3rem] bg-[#5E7BFF]/10 border border-[#5E7BFF]/30 space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#5E7BFF] flex items-center justify-center shadow-lg shadow-[#5E7BFF33]">
            <Key className="text-white" size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold">Cerebro AI (Gemini)</h3>
            <p className="text-[#A0A6B1] text-sm leading-relaxed">Necesitas vincular tu clave para que el consultor y la grabadora funcionen.</p>
          </div>
        </div>
        <button 
          onClick={handleOpenKeySelector}
          className="w-full py-4 rounded-2xl bg-[#5E7BFF] text-white font-bold flex items-center justify-center gap-3 shadow-xl hover:scale-[1.02] transition-all"
        >
          <Sparkles size={18} /> Gestionar Clave de Google AI
        </button>
        <p className="text-[10px] text-[#646B7B] text-center">
          * Si el Chat o la Grabadora dan error de "API Key", pulsa este botón y selecciona una clave de un proyecto con facturación activa.
        </p>
      </section>

      <section className="glass border border-[#1F2330] p-10 rounded-[3rem] space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#151823] flex items-center justify-center border border-[#1F2330]">
                <Chrome className="w-6 h-6 text-[#5E7BFF]" />
              </div>
              <div>
                <h3 className="text-xl font-medium">Cuenta de Google Drive</h3>
                <p className="text-[#646B7B] text-sm italic">Gestión centralizada de memorias.</p>
              </div>
            </div>
            {config.isConnected && (
              <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20">
                <CheckCircle2 size={16} />
                <span className="text-xs font-bold uppercase tracking-widest">{config.email}</span>
              </div>
            )}
          </div>
          
          {!config.isConnected ? (
            <button onClick={handleConnect} className="w-full md:w-auto px-10 py-5 rounded-2xl bg-white text-black font-bold flex items-center justify-center gap-3 shadow-xl hover:scale-105 transition-all">
              <Chrome size={20} /> Conectar Google
            </button>
          ) : (
            <button onClick={handleDisconnect} className="w-full md:w-auto px-8 py-4 rounded-xl bg-red-500/10 text-red-500 text-[10px] font-bold uppercase tracking-widest border border-red-500/20">
              <LogOut size={16} className="inline mr-2" /> Desconectar
            </button>
          )}
        </div>
      </section>

      {config.isConnected && (
        <section className="glass border border-[#1F2330] p-10 rounded-[3rem] space-y-10">
          <div className="flex justify-between items-end">
            <div className="space-y-2">
              <h3 className="text-xl font-medium">Salud del Índice Digital</h3>
              <p className="text-[#646B7B] text-sm italic">Estado de tus archivos maestros en la nube.</p>
            </div>
            {missingTabs.length > 0 && (
              <button 
                onClick={handleRepair}
                disabled={isRepairing}
                className="px-6 py-3 rounded-xl bg-[#5E7BFF] text-white text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-[#5E7BFF33] hover:scale-105 transition-all disabled:opacity-50"
              >
                {isRepairing ? <Loader2 className="animate-spin w-3 h-3" /> : <Wrench size={14} />}
                Reparar Estructura
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="p-8 rounded-[2rem] bg-[#0B0D12] border border-[#1F2330] space-y-4">
                <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-[#8A6CFF]">
                  <Database size={16} /> <h4>Archivo</h4>
                </div>
                {indexStatus === 'found' ? <div className="text-[#10B981] text-[10px] font-bold flex items-center gap-2"><CheckCircle2 size={14} /> Detectado</div> : <div className="text-red-400 text-[10px] font-bold flex items-center gap-2"><AlertCircle size={14} /> No encontrado</div>}
             </div>

             <div className="p-8 rounded-[2rem] bg-[#0B0D12] border border-[#1F2330] space-y-4">
                <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-[#10B981]">
                  <Wallet size={16} /> <h4>Finanzas</h4>
                </div>
                {financeStatus === 'found' ? <div className="text-[#10B981] text-[10px] font-bold flex items-center gap-2"><CheckCircle2 size={14} /> OK</div> : <div className="text-amber-400 text-[10px] font-bold flex items-center gap-2"><AlertCircle size={14} /> Incompleto</div>}
             </div>

             <div className="p-8 rounded-[2rem] bg-[#0B0D12] border border-[#1F2330] space-y-4">
                <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-[#5E7BFF]">
                  <Sparkles size={16} /> <h4>Memorias</h4>
                </div>
                {logsStatus === 'found' ? <div className="text-[#10B981] text-[10px] font-bold flex items-center gap-2"><CheckCircle2 size={14} /> OK</div> : <div className="text-amber-400 text-[10px] font-bold flex items-center gap-2"><AlertCircle size={14} /> Incompleto</div>}
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-[#1F2330]">
             <button onClick={() => { loadFolders(); setActiveFolderSelector('audio'); }} className="p-6 rounded-2xl border bg-[#151823] border-[#1F2330] text-left flex justify-between items-center transition-all hover:border-[#5E7BFF]">
                <div className="flex items-center gap-3">
                  <FolderOpen size={18} className="text-[#646B7B]" />
                  <span className="truncate text-sm">{config.audioFolderName || 'Carpeta Audios'}</span>
                </div>
             </button>
             <button onClick={() => { loadFolders(); setActiveFolderSelector('sheet'); }} className="p-6 rounded-2xl border bg-[#151823] border-[#1F2330] text-left flex justify-between items-center transition-all hover:border-[#5E7BFF]">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet size={18} className="text-[#646B7B]" />
                  <span className="truncate text-sm">{config.sheetFolderName || 'Carpeta Índice'}</span>
                </div>
             </button>
          </div>
        </section>
      )}

      {activeFolderSelector && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-xl p-6 flex items-center justify-center">
          <div className="bg-[#0B0D12] border border-[#1F2330] w-full max-w-lg rounded-[2.5rem] p-8 flex flex-col h-3/4">
            <header className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">Directorios Google Drive</h3>
              <button onClick={() => setActiveFolderSelector(null)} className="text-[#646B7B] text-xs font-bold uppercase">Cerrar</button>
            </header>
            <div className="flex-1 overflow-y-auto space-y-2 pr-2 scrollbar-hide">
              {loadingFolders ? <Loader2 className="animate-spin mx-auto text-[#5E7BFF]" /> : folders.map(f => (
                <button key={f.id} onClick={() => selectFolder(activeFolderSelector, f.id, f.name)} className="w-full p-5 bg-[#151823] rounded-2xl border border-[#1F2330] text-left hover:border-[#5E7BFF] transition-all flex items-center gap-3">
                  <FolderOpen size={16} className="text-[#646B7B]" /> <span className="text-sm font-medium">{f.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {error && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-3"><AlertCircle size={16} /> {error}</div>}
    </div>
  );
};

export default SettingsView;