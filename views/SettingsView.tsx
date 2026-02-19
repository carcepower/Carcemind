
import React, { useState, useEffect } from 'react';
import { GoogleConfig } from '../types';
import { googleApi } from '../lib/googleApi';
import { 
  Chrome, FolderOpen, RefreshCw, AlertCircle, LogOut, CheckCircle2, Search, FileSpreadsheet, PlusCircle, Copy, Activity, ExternalLink, ChevronRight
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
  const [fileFoundStatus, setFileFoundStatus] = useState<'searching' | 'found' | 'not_found' | 'idle'>('idle');
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    if (config.isConnected && config.accessToken) loadFolders();
  }, [config.isConnected, config.accessToken]);

  useEffect(() => {
    if (config.isConnected && config.accessToken && config.sheetFolderId) checkForSpreadsheet();
  }, [config.sheetFolderId, config.accessToken]);

  const checkForSpreadsheet = async () => {
    if (!config.accessToken || !config.sheetFolderId) return;
    setFileFoundStatus('searching');
    try {
      const file = await googleApi.findFileInFolder(config.accessToken, 'CarceMind_Memory_Index', config.sheetFolderId);
      if (file) {
        setConfig(prev => ({ ...prev, spreadsheetId: file.id }));
        setFileFoundStatus('found');
      } else {
        setFileFoundStatus('not_found');
      }
    } catch (e: any) {
      if (e.message.includes("SESSION_EXPIRED")) handleSessionExpired();
      setFileFoundStatus('idle');
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
          if (response.error) {
            setError(`Error Google: ${response.error}`);
            return;
          }
          if (response.access_token) {
            fetch('https://www.googleapis.com/oauth2/v2/userinfo', { headers: { Authorization: `Bearer ${response.access_token}` } })
            .then(res => res.json())
            .then(user => {
              setConfig(prev => ({ ...prev, isConnected: true, accessToken: response.access_token, email: user.email }));
              setError(null);
            });
          }
        },
      });
      client.requestAccessToken();
    } catch (e) { setError("Error al iniciar Google Auth."); }
  };

  const handleDisconnect = () => {
    // PRESERVACIÓN: Solo borramos el acceso, no la configuración de carpetas
    setConfig(prev => ({ ...prev, isConnected: false, accessToken: null, email: null }));
    setFolders([]);
    setFileFoundStatus('idle');
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
      <header className="flex justify-between items-end">
        <div className="space-y-2">
          <p className="text-[#A0A6B1] text-sm uppercase tracking-widest font-bold">Panel Técnico</p>
          <h2 className="text-4xl font-semibold tracking-tight">Ajustes del Sistema</h2>
        </div>
        <button onClick={() => setShowDebug(!showDebug)} className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${showDebug ? 'bg-[#5E7BFF] border-[#5E7BFF] text-white' : 'bg-[#151823] border-[#1F2330] text-[#646B7B]'}`}>
          <Activity size={16} />
          <span className="text-[10px] font-bold uppercase tracking-widest tracking-tighter">Diagnóstico</span>
        </button>
      </header>

      <section className="glass border border-[#1F2330] p-10 rounded-[3rem] space-y-8 relative overflow-hidden">
        <div className="flex flex-col md:flex-row justify-between items-start gap-8 relative z-10">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#5E7BFF]/10 flex items-center justify-center border border-[#5E7BFF]/20">
                <Chrome className="w-6 h-6 text-[#5E7BFF]" />
              </div>
              <div>
                <h3 className="text-xl font-medium">Conexión con Google</h3>
                <p className="text-[#646B7B] text-sm italic">Persistencia activa de directorios.</p>
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
            <button onClick={handleConnect} className="w-full md:w-auto px-10 py-5 rounded-2xl bg-white text-black font-bold flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all">
              <Chrome size={20} /> Conectar Cuenta
            </button>
          ) : (
            <button onClick={handleDisconnect} className="w-full md:w-auto px-8 py-4 rounded-xl bg-red-500/10 text-red-500 text-[10px] font-bold uppercase tracking-widest border border-red-500/20">
              <LogOut size={16} className="inline mr-2" /> Cerrar Sesión
            </button>
          )}
        </div>
      </section>

      {config.isConnected && (
        <section className="glass border border-[#1F2330] p-10 rounded-[3rem] space-y-10 animate-in slide-in-from-bottom-4">
          <div className="space-y-2">
            <h3 className="text-xl font-medium">Asignación de Directorios</h3>
            <p className="text-[#646B7B] text-sm italic">Tus carpetas se mantienen guardadas localmente para tu comodidad.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#5E7BFF]">Archivos de Audio</label>
              <button onClick={() => { loadFolders(); setActiveFolderSelector('audio'); }} className={`w-full p-6 rounded-2xl border text-left flex justify-between items-center transition-all ${config.audioFolderId ? 'bg-[#10B981]/5 border-[#10B981]/30' : 'bg-[#151823] border-[#1F2330]'}`}>
                <div className="flex items-center gap-3">
                  <FolderOpen size={18} className={config.audioFolderId ? 'text-[#10B981]' : ''} />
                  <span className="truncate max-w-[150px]">{config.audioFolderName || 'Seleccionar...'}</span>
                </div>
                {config.audioFolderId && <CheckCircle2 size={16} className="text-[#10B981]" />}
              </button>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#10B981]">Carpeta del Índice</label>
              <button onClick={() => { loadFolders(); setActiveFolderSelector('sheet'); }} className={`w-full p-6 rounded-2xl border text-left flex justify-between items-center transition-all ${config.sheetFolderId ? 'bg-[#10B981]/5 border-[#10B981]/30' : 'bg-[#151823] border-[#1F2330]'}`}>
                <div className="flex items-center gap-3">
                  <FileSpreadsheet size={18} className={config.sheetFolderId ? 'text-[#10B981]' : ''} />
                  <span className="truncate max-w-[150px]">{config.sheetFolderName || 'Seleccionar...'}</span>
                </div>
                {config.sheetFolderId && <CheckCircle2 size={16} className="text-[#10B981]" />}
              </button>
            </div>
          </div>

          {config.sheetFolderId && (
            <div className="p-8 rounded-[2rem] bg-[#0B0D12] border border-[#1F2330] space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest">
                  <Search size={16} className="text-[#5E7BFF]" />
                  <h4>Estado del Índice</h4>
                </div>
                {fileFoundStatus === 'searching' && <RefreshCw size={14} className="animate-spin text-[#5E7BFF]" />}
              </div>
              {fileFoundStatus === 'found' && (
                <div className="flex items-center gap-4 text-[#10B981] bg-[#10B981]/5 p-4 rounded-xl border border-[#10B981]/20 text-[11px]">
                  <CheckCircle2 size={16} /> <span>Índice CarceMind vinculado y listo.</span>
                </div>
              )}
              {fileFoundStatus === 'not_found' && (
                <button onClick={() => googleApi.createSpreadsheet(config.accessToken!, 'CarceMind_Memory_Index', config.sheetFolderId!).then(id => { setConfig(p => ({...p, spreadsheetId: id})); setFileFoundStatus('found'); })} className="w-full py-4 rounded-xl bg-[#5E7BFF] text-white font-bold text-[10px] uppercase tracking-widest">Crear Índice de Datos</button>
              )}
            </div>
          )}
        </section>
      )}

      {activeFolderSelector && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-xl p-6 flex items-center justify-center">
          <div className="bg-[#0B0D12] border border-[#1F2330] w-full max-w-lg rounded-[2.5rem] p-8 flex flex-col h-3/4">
            <header className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">Directorios Google Drive</h3>
              <button onClick={() => setActiveFolderSelector(null)} className="text-[#646B7B] text-xs font-bold uppercase">Cerrar</button>
            </header>
            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
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

const Loader2 = ({ className }: { className?: string }) => <RefreshCw className={className} />;

export default SettingsView;
