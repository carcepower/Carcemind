
import React, { useState, useEffect } from 'react';
import { GoogleConfig } from '../types';
import { googleApi } from '../lib/googleApi';
import { 
  Chrome, FolderOpen, RefreshCw, AlertCircle, LogOut, CheckCircle2, FileSpreadsheet, Activity, Database, Wallet
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
  
  const [indexStatus, setIndexStatus] = useState<'searching' | 'found' | 'not_found' | 'idle'>('idle');
  const [financeStatus, setFinanceStatus] = useState<'searching' | 'found' | 'tabs_missing' | 'not_found' | 'idle'>('idle');
  const [missingTabs, setMissingTabs] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    if (config.isConnected && config.accessToken) loadFolders();
  }, [config.isConnected, config.accessToken]);

  useEffect(() => {
    if (config.isConnected && config.accessToken && config.sheetFolderId) checkForIndexAndFinance();
  }, [config.sheetFolderId, config.accessToken]);

  const checkForIndexAndFinance = async () => {
    if (!config.accessToken || !config.sheetFolderId) return;
    setIndexStatus('searching');
    setFinanceStatus('searching');
    setMissingTabs([]);
    
    try {
      const file = await googleApi.findFileInFolder(config.accessToken, 'CarceMind_Memory_Index', config.sheetFolderId);
      if (file) {
        setConfig(prev => ({ ...prev, spreadsheetId: file.id }));
        setIndexStatus('found');

        // Validar estructura interna del archivo unificado
        const metadata = await googleApi.getSpreadsheetMetadata(file.id, config.accessToken);
        const existingTabs = metadata.sheets.map((s: any) => s.properties.title);
        
        // Pestañas de finanzas requeridas
        const requiredFinanceTabs = ['TA_CORRIENTE', 'TA_AHORRO', 'PERSONAL_CORRIENTE', 'PERSONAL_AHORRO'];
        const missing = requiredFinanceTabs.filter(tab => !existingTabs.includes(tab));

        if (missing.length === 0) {
          setFinanceStatus('found');
        } else {
          setMissingTabs(missing);
          setFinanceStatus('tabs_missing');
        }
      } else {
        setIndexStatus('not_found');
        setFinanceStatus('not_found');
      }
    } catch (e: any) {
      if (e.message.includes("SESSION_EXPIRED")) handleSessionExpired();
      setIndexStatus('idle');
      setFinanceStatus('idle');
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
    setConfig(prev => ({ ...prev, isConnected: false, accessToken: null, email: null }));
    setFolders([]);
    setIndexStatus('idle');
    setFinanceStatus('idle');
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
          <p className="text-[#A0A6B1] text-sm uppercase tracking-widest font-bold">Arquitectura Unificada</p>
          <h2 className="text-4xl font-semibold tracking-tight">Vincular Directorios</h2>
        </div>
        <button onClick={() => setShowDebug(!showDebug)} className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${showDebug ? 'bg-[#5E7BFF] border-[#5E7BFF] text-white' : 'bg-[#151823] border-[#1F2330] text-[#646B7B]'}`}>
          <Activity size={16} />
          <span className="text-[10px] font-bold uppercase tracking-widest tracking-tighter">Diagnóstico</span>
        </button>
      </header>

      <section className="glass border border-[#1F2330] p-10 rounded-[3rem] space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#5E7BFF]/10 flex items-center justify-center border border-[#5E7BFF]/20">
                <Chrome className="w-6 h-6 text-[#5E7BFF]" />
              </div>
              <div>
                <h3 className="text-xl font-medium">Cuenta de Google Drive</h3>
                <p className="text-[#646B7B] text-sm italic">Gestión centralizada de memorias y finanzas.</p>
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
        <section className="glass border border-[#1F2330] p-10 rounded-[3rem] space-y-10">
          <div className="space-y-2">
            <h3 className="text-xl font-medium">Asignación de Rutas</h3>
            <p className="text-[#646B7B] text-sm italic">CarceMind validará la integridad del archivo índice único.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#5E7BFF]">Ruta de Audios</label>
              <button onClick={() => { loadFolders(); setActiveFolderSelector('audio'); }} className={`w-full p-6 rounded-2xl border text-left flex justify-between items-center transition-all ${config.audioFolderId ? 'bg-[#10B981]/5 border-[#10B981]/30' : 'bg-[#151823] border-[#1F2330]'}`}>
                <div className="flex items-center gap-3">
                  <FolderOpen size={18} className={config.audioFolderId ? 'text-[#10B981]' : ''} />
                  <span className="truncate max-w-[150px]">{config.audioFolderName || 'Seleccionar...'}</span>
                </div>
              </button>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#8A6CFF]">Ruta de Índice Único</label>
              <button onClick={() => { loadFolders(); setActiveFolderSelector('sheet'); }} className={`w-full p-6 rounded-2xl border text-left flex justify-between items-center transition-all ${config.sheetFolderId ? 'bg-[#10B981]/5 border-[#10B981]/30' : 'bg-[#151823] border-[#1F2330]'}`}>
                <div className="flex items-center gap-3">
                  <FileSpreadsheet size={18} className={config.sheetFolderId ? 'text-[#10B981]' : ''} />
                  <span className="truncate max-w-[150px]">{config.sheetFolderName || 'Seleccionar...'}</span>
                </div>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-8 rounded-[2rem] bg-[#0B0D12] border border-[#1F2330] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest">
                  <Database size={16} className="text-[#8A6CFF]" />
                  <h4>CarceMind_Memory_Index</h4>
                </div>
                {indexStatus === 'searching' && <RefreshCw size={14} className="animate-spin text-[#8A6CFF]" />}
              </div>
              {indexStatus === 'found' ? (
                <div className="text-[#10B981] text-[10px] font-bold uppercase flex items-center gap-2">
                  <CheckCircle2 size={14} /> Archivo validado
                </div>
              ) : indexStatus === 'not_found' ? (
                <div className="text-red-400 text-[10px] font-bold uppercase flex items-center gap-2">
                  <AlertCircle size={14} /> No detectado
                </div>
              ) : null}
            </div>

            <div className="p-8 rounded-[2rem] bg-[#0B0D12] border border-[#1F2330] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest">
                  <Wallet size={16} className="text-[#10B981]" />
                  <h4>Integridad de Finanzas</h4>
                </div>
                {financeStatus === 'searching' && <RefreshCw size={14} className="animate-spin text-[#10B981]" />}
              </div>
              {financeStatus === 'found' ? (
                <div className="text-[#10B981] text-[10px] font-bold uppercase flex items-center gap-2">
                  <CheckCircle2 size={14} /> 4 Pestañas Detectadas OK
                </div>
              ) : financeStatus === 'tabs_missing' ? (
                <div className="space-y-2">
                  <div className="text-amber-400 text-[10px] font-bold uppercase flex items-center gap-2">
                    <AlertCircle size={14} /> Faltan hojas en el archivo
                  </div>
                  <p className="text-[9px] text-[#646B7B]">Requeridas: {missingTabs.join(', ')}</p>
                </div>
              ) : financeStatus === 'not_found' ? (
                <div className="text-red-400 text-[10px] font-bold uppercase flex items-center gap-2">
                  <AlertCircle size={14} /> Archivo no encontrado
                </div>
              ) : null}
            </div>
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
              {loadingFolders ? <RefreshCw className="animate-spin mx-auto text-[#5E7BFF]" /> : folders.map(f => (
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
