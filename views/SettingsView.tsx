
import React, { useState, useEffect } from 'react';
import { GoogleConfig } from '../types';
import { googleApi } from '../lib/googleApi';
import { 
  Chrome, 
  FolderOpen, 
  Table, 
  Unlink, 
  RefreshCw, 
  CheckCircle2, 
  ShieldCheck,
  AlertCircle,
  Database,
  Lock,
  Plus,
  Settings2,
  UserCircle2,
  ChevronRight,
  LogOut,
  FolderSync,
  Key,
  Info,
  ExternalLink,
  Sparkles,
  CreditCard
} from 'lucide-react';

interface SettingsViewProps {
  config: GoogleConfig;
  setConfig: React.Dispatch<React.SetStateAction<GoogleConfig>>;
}

const CLIENT_ID = "660418616677-8rbbg21t1ksej5vuso1ou9r7sue8ma3a.apps.googleusercontent.com"; 

const SettingsView: React.FC<SettingsViewProps> = ({ config, setConfig }) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [folders, setFolders] = useState<{id: string, name: string}[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFolderSelector, setActiveFolderSelector] = useState<'audio' | 'sheet' | null>(null);
  const [hasAiKey, setHasAiKey] = useState(false);

  useEffect(() => {
    if (config.isConnected && config.accessToken) {
      loadFolders();
    }
    checkAiKey();
  }, [config.isConnected, config.accessToken]);

  const checkAiKey = async () => {
    if ((window as any).aistudio?.hasSelectedApiKey) {
      const selected = await (window as any).aistudio.hasSelectedApiKey();
      setHasAiKey(selected);
    }
  };

  const handleSelectAiKey = async () => {
    if ((window as any).aistudio?.openSelectKey) {
      await (window as any).aistudio.openSelectKey();
      setHasAiKey(true);
    }
  };

  const loadFolders = async () => {
    if (!config.accessToken) return;
    setLoadingFolders(true);
    setError(null);
    try {
      const list = await googleApi.listFolders(config.accessToken);
      setFolders(list);
    } catch (e: any) {
      setError(e.message || "Error al listar carpetas.");
    } finally {
      setLoadingFolders(false);
    }
  };

  const handleConnect = (promptMode: string = 'select_account') => {
    setError(null);
    try {
      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: 'openid https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.metadata.readonly https://www.googleapis.com/auth/spreadsheets',
        prompt: promptMode,
        callback: (response: any) => {
          if (response.access_token) {
            fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
              headers: { Authorization: `Bearer ${response.access_token}` }
            })
            .then(res => res.json())
            .then(user => {
              setConfig({
                ...config,
                isConnected: true,
                accessToken: response.access_token,
                email: user.email
              });
              setError(null);
            })
            .catch(() => setError("Conexión exitosa, pero error al recuperar perfil."));
          } else if (response.error) {
            setError(`Error de Google Auth: ${response.error}`);
          }
        },
      });
      client.requestAccessToken();
    } catch (e: any) {
      setError(`Error al iniciar cliente de Google: ${e.message}`);
    }
  };

  const handleDisconnect = () => {
    if (config.accessToken) {
      try {
        (window as any).google.accounts.oauth2.revoke(config.accessToken, () => {});
      } catch (e) {}
    }
    setConfig({
      isConnected: false,
      accessToken: null,
      email: null,
      audioFolderId: null,
      audioFolderName: null,
      sheetFolderId: null,
      sheetFolderName: null,
      spreadsheetId: null
    });
    setFolders([]);
  };

  const selectFolder = (type: 'audio' | 'sheet', folderId: string, folderName: string) => {
    setConfig(prev => ({
      ...prev,
      [type === 'audio' ? 'audioFolderId' : 'sheetFolderId']: folderId,
      [type === 'audio' ? 'audioFolderName' : 'sheetFolderName']: folderName
    }));
    setActiveFolderSelector(null);
  };

  const createCarceMindFolder = async () => {
    if (!config.accessToken) return;
    setIsSyncing(true);
    try {
      const folder = await googleApi.createFolder(config.accessToken, 'CarceMind_Vault');
      selectFolder('audio', folder.id, 'CarceMind_Vault');
      selectFolder('sheet', folder.id, 'CarceMind_Vault');
      loadFolders();
    } catch (e: any) {
      setError(`Error al crear carpeta: ${e.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const ensureSpreadsheet = async () => {
    if (!config.accessToken || !config.sheetFolderId) return;
    setIsSyncing(true);
    try {
      const ssId = await googleApi.createSpreadsheet(config.accessToken, 'CarceMind_Memory_Index', config.sheetFolderId);
      setConfig(prev => ({ ...prev, spreadsheetId: ssId }));
    } catch (e: any) {
      setError(`Error al crear índice: ${e.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-32 animate-in fade-in duration-700">
      <header className="space-y-2">
        <p className="text-[#A0A6B1] text-sm uppercase tracking-widest font-bold">Configuración</p>
        <h2 className="text-4xl font-semibold tracking-tight">Arquitectura del Sistema</h2>
      </header>

      {/* AI Key Selection Card */}
      <section className="glass border border-[#1F2330] p-10 rounded-[3.5rem] shadow-2xl relative overflow-hidden bg-gradient-to-br from-[#5E7BFF]/5 to-transparent">
        <div className="flex flex-col md:flex-row justify-between items-start gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#5E7BFF]/10 flex items-center justify-center border border-[#5E7BFF]/20">
                <Sparkles className="w-7 h-7 text-[#5E7BFF]" />
              </div>
              <div>
                <h3 className="text-2xl font-medium">Capa de Inteligencia (Gemini)</h3>
                <p className="text-[#646B7B] text-sm max-w-sm">Para usar Gemini 3 Pro, Google requiere vincular una clave de API de un proyecto con facturación.</p>
              </div>
            </div>
            
            {hasAiKey ? (
              <div className="flex items-center gap-2 text-[#10B981] text-xs font-bold uppercase tracking-widest">
                <CheckCircle2 className="w-4 h-4" /> Inteligencia Activada
              </div>
            ) : (
              <div className="flex items-center gap-2 text-amber-500 text-xs font-bold uppercase tracking-widest">
                <AlertCircle className="w-4 h-4" /> Clave de API pendiente
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 w-full md:w-auto">
            <button 
              onClick={handleSelectAiKey}
              className={`w-full md:w-64 py-5 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all shadow-xl ${
                hasAiKey ? 'bg-[#151823] text-[#A0A6B1] border border-[#1F2330]' : 'bg-[#5E7BFF] text-white hover:scale-[1.02]'
              }`}
            >
              <Key className="w-5 h-5" />
              {hasAiKey ? 'Actualizar Clave AI' : 'Seleccionar Clave Gemini'}
            </button>
            <a 
              href="https://ai.google.dev/gemini-api/docs/billing" 
              target="_blank" 
              className="text-[10px] text-center text-[#646B7B] uppercase font-bold hover:text-[#5E7BFF] transition-colors"
            >
              Ver docs de facturación de Google <ExternalLink className="w-3 h-3 inline ml-1" />
            </a>
          </div>
        </div>
      </section>

      {/* Data Layer Card */}
      <section className="glass border border-[#1F2330] p-10 rounded-[3.5rem] shadow-2xl relative overflow-hidden space-y-10">
        <div className="flex flex-col md:flex-row justify-between items-start gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#10B981]/10 flex items-center justify-center border border-[#10B981]/20">
                <Database className="w-7 h-7 text-[#10B981]" />
              </div>
              <div>
                <h3 className="text-2xl font-medium">Capa de Datos (Drive/Sheets)</h3>
                <p className="text-[#646B7B] text-sm">Gestiona dónde se guardan tus audios y memorias.</p>
              </div>
            </div>

            {config.isConnected && (
              <div className="flex items-center gap-4 p-5 rounded-2xl bg-[#151823] border border-[#1F2330]">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#10B981] to-[#5E7BFF] flex items-center justify-center font-bold text-white shadow-lg">
                  {config.email?.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-[#646B7B] font-bold uppercase tracking-widest">Google Account</span>
                  <span className="text-sm font-medium">{config.email}</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 w-full md:w-auto">
            {!config.isConnected ? (
              <button 
                onClick={() => handleConnect('consent select_account')}
                className="w-full md:w-64 py-5 rounded-2xl bg-white text-black font-bold flex items-center justify-center gap-3 hover:scale-[1.02] transition-all"
              >
                <Chrome className="w-5 h-5" />
                Conectar Google
              </button>
            ) : (
              <button 
                onClick={handleDisconnect}
                className="w-full md:w-64 px-6 py-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 font-bold text-xs uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
              >
                <LogOut className="w-4 h-4" />
                Cerrar Sesión
              </button>
            )}
          </div>
        </div>

        {config.isConnected && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="h-px bg-[#1F2330]" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#5E7BFF]">Carpeta de Audios</label>
                <div 
                  onClick={() => { loadFolders(); setActiveFolderSelector('audio'); }}
                  className={`p-6 rounded-3xl border cursor-pointer transition-all ${config.audioFolderId ? 'bg-[#10B981]/5 border-[#10B981]/20' : 'bg-[#151823] border-[#1F2330]'}`}
                >
                  <span className="text-sm font-medium">{config.audioFolderName || 'No seleccionada...'}</span>
                </div>
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#10B981]">Carpeta de Datos</label>
                <div 
                  onClick={() => { loadFolders(); setActiveFolderSelector('sheet'); }}
                  className={`p-6 rounded-3xl border cursor-pointer transition-all ${config.sheetFolderId ? 'bg-[#10B981]/5 border-[#10B981]/20' : 'bg-[#151823] border-[#1F2330]'}`}
                >
                  <span className="text-sm font-medium">{config.sheetFolderName || 'No seleccionada...'}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
              <button 
                onClick={createCarceMindFolder}
                className="flex-1 py-5 rounded-2xl bg-[#5E7BFF]/10 text-[#5E7BFF] font-bold text-xs uppercase tracking-widest border border-[#5E7BFF]/20"
              >
                Auto-Configurar Carpetas
              </button>
              <button 
                disabled={!config.sheetFolderId || !!config.spreadsheetId}
                onClick={ensureSpreadsheet} 
                className="flex-1 py-5 rounded-2xl bg-[#10B981]/10 text-[#10B981] font-bold text-xs uppercase tracking-widest border border-[#10B981]/20 disabled:opacity-30"
              >
                {config.spreadsheetId ? 'Base de Datos Lista' : 'Crear Índice Sheets'}
              </button>
            </div>
          </div>
        )}

        {/* Folder Picker Overlay */}
        {activeFolderSelector && (
          <div className="absolute inset-0 bg-[#0B0D12] z-50 p-10 flex flex-col space-y-8">
            <div className="flex justify-between items-center">
              <h4 className="text-2xl font-medium">Mis Carpetas Drive</h4>
              <button onClick={() => setActiveFolderSelector(null)} className="text-[#646B7B] hover:text-white">Cerrar</button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2">
              {loadingFolders ? <RefreshCw className="animate-spin mx-auto mt-10" /> : folders.map(f => (
                <button 
                  key={f.id} 
                  onClick={() => selectFolder(activeFolderSelector, f.id, f.name)}
                  className="w-full p-6 bg-[#151823] rounded-3xl border border-[#1F2330] text-left hover:border-[#5E7BFF] transition-all flex items-center gap-4"
                >
                  <FolderOpen className="w-5 h-5 text-[#646B7B]" />
                  <span>{f.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {error && (
        <div className="p-6 rounded-3xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-4">
          <AlertCircle className="w-6 h-6 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}
    </div>
  );
};

export default SettingsView;
