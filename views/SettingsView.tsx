
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
  FolderSync
} from 'lucide-react';

interface SettingsViewProps {
  config: GoogleConfig;
  setConfig: React.Dispatch<React.SetStateAction<GoogleConfig>>;
}

/**
 * CLIENT ID CONFIRMADO PARA CARCEMIND
 */
const CLIENT_ID = "660418616677-8rbbg21t1ksej5vuso1ou9r7sue8ma3a.apps.googleusercontent.com"; 

const SettingsView: React.FC<SettingsViewProps> = ({ config, setConfig }) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [folders, setFolders] = useState<{id: string, name: string}[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFolderSelector, setActiveFolderSelector] = useState<'audio' | 'sheet' | null>(null);

  useEffect(() => {
    if (config.isConnected && config.accessToken) {
      loadFolders();
    }
  }, [config.isConnected, config.accessToken]);

  const loadFolders = async () => {
    if (!config.accessToken) return;
    setLoadingFolders(true);
    try {
      const list = await googleApi.listFolders(config.accessToken);
      setFolders(list);
    } catch (e) {
      console.error(e);
      setError("Error al sincronizar con Google Drive.");
    } finally {
      setLoadingFolders(false);
    }
  };

  const handleConnect = (promptMode: 'select_account' | 'consent' | '' = 'select_account') => {
    setError(null);
    try {
      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/userinfo.email',
        prompt: promptMode, // Ahora por defecto es 'select_account' para evitar interaction_required
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
            })
            .catch(err => setError("Conexión exitosa, pero error al recuperar perfil."));
          } else if (response.error) {
            setError(`Error de Google: ${response.error}`);
          }
        },
      });
      client.requestAccessToken();
    } catch (e: any) {
      setError(`Error al iniciar cliente de Google: ${e.message}`);
    }
  };

  const handleDisconnect = () => {
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
    } catch (e) {
      setError("No se pudo crear la carpeta automática.");
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
    } catch (e) {
      setError("Error al crear el índice en Sheets.");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-32 animate-in fade-in duration-700">
      <header className="space-y-2">
        <p className="text-[#A0A6B1] text-sm uppercase tracking-widest font-bold">Configuración</p>
        <h2 className="text-4xl font-semibold tracking-tight">Capa de Datos Google</h2>
      </header>

      {error && (
        <div className="p-6 rounded-3xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-4 animate-in slide-in-from-top-2">
          <AlertCircle className="w-6 h-6 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Connection Card */}
      <section className="glass border border-[#1F2330] p-10 rounded-[3.5rem] shadow-2xl relative overflow-hidden space-y-10">
        <div className="flex flex-col md:flex-row justify-between items-start gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#5E7BFF]/10 flex items-center justify-center border border-[#5E7BFF]/20">
                <Chrome className="w-7 h-7 text-[#5E7BFF]" />
              </div>
              <div>
                <h3 className="text-2xl font-medium">Estado de la Cuenta</h3>
                <p className="text-[#646B7B] text-sm">Gestiona tu vinculación con Google Drive y Sheets.</p>
              </div>
            </div>

            {config.isConnected && (
              <div className="flex items-center gap-4 p-5 rounded-2xl bg-[#151823] border border-[#1F2330] animate-in slide-in-from-left-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#5E7BFF] to-[#8A6CFF] flex items-center justify-center font-bold text-white shadow-lg">
                  {config.email?.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-[#646B7B] font-bold uppercase tracking-widest">Email Conectado</span>
                  <span className="text-sm font-medium">{config.email}</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 w-full md:w-auto">
            {!config.isConnected ? (
              <button 
                onClick={() => handleConnect()}
                className="w-full md:w-64 py-5 rounded-2xl bg-white text-black font-bold flex items-center justify-center gap-3 hover:scale-[1.02] transition-all active:scale-[0.98] shadow-xl"
              >
                <ShieldCheck className="w-5 h-5" />
                Conectar Google
              </button>
            ) : (
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => handleConnect('select_account')}
                  className="w-full md:w-64 px-6 py-4 rounded-2xl bg-[#151823] border border-[#1F2330] text-[#A0A6B1] font-bold text-xs uppercase tracking-widest hover:text-white hover:border-[#5E7BFF] transition-all flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Cambiar Cuenta
                </button>
                <button 
                  onClick={handleDisconnect}
                  className="w-full md:w-64 px-6 py-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 font-bold text-xs uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Desconectar
                </button>
              </div>
            )}
          </div>
        </div>

        {config.isConnected && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="h-px bg-gradient-to-r from-transparent via-[#1F2330] to-transparent" />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Audio Folder */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2 text-[#5E7BFF]">
                    <FolderOpen className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Carpeta de Audios</span>
                  </div>
                  <button 
                    onClick={() => { loadFolders(); setActiveFolderSelector('audio'); }}
                    className="text-[10px] font-bold uppercase tracking-widest text-[#646B7B] hover:text-[#5E7BFF] flex items-center gap-1"
                  >
                    Seleccionar <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
                <div 
                  onClick={() => setActiveFolderSelector('audio')}
                  className={`p-6 rounded-3xl border cursor-pointer transition-all hover:border-[#5E7BFF]/50 ${config.audioFolderId ? 'bg-[#10B981]/5 border-[#10B981]/20' : 'bg-[#151823] border-[#1F2330]'}`}
                >
                  {config.audioFolderId ? (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{config.audioFolderName}</span>
                      <CheckCircle2 className="w-5 h-5 text-[#10B981]" />
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#646B7B] italic">No seleccionada</span>
                      <FolderSync className="w-4 h-4 text-[#646B7B]" />
                    </div>
                  )}
                </div>
              </div>

              {/* Sheet Folder */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2 text-[#10B981]">
                    <Table className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Carpeta de Datos</span>
                  </div>
                  <button 
                    onClick={() => { loadFolders(); setActiveFolderSelector('sheet'); }}
                    className="text-[10px] font-bold uppercase tracking-widest text-[#646B7B] hover:text-[#10B981] flex items-center gap-1"
                  >
                    Seleccionar <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
                <div 
                  onClick={() => setActiveFolderSelector('sheet')}
                  className={`p-6 rounded-3xl border cursor-pointer transition-all hover:border-[#10B981]/50 ${config.sheetFolderId ? 'bg-[#10B981]/5 border-[#10B981]/20' : 'bg-[#151823] border-[#1F2330]'}`}
                >
                  {config.sheetFolderId ? (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{config.sheetFolderName}</span>
                      <CheckCircle2 className="w-5 h-5 text-[#10B981]" />
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#646B7B] italic">No seleccionada</span>
                      <FolderSync className="w-4 h-4 text-[#646B7B]" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Global Actions */}
            <div className="flex flex-col md:flex-row gap-4 pt-4">
              <button 
                onClick={createCarceMindFolder}
                className="flex-1 py-5 rounded-2xl bg-[#5E7BFF]/10 text-[#5E7BFF] font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-[#5E7BFF]/20 transition-all border border-[#5E7BFF]/20"
              >
                <Plus className="w-4 h-4" />
                Auto-Configurar Carpetas
              </button>
              
              <button 
                disabled={!config.sheetFolderId || isSyncing || !!config.spreadsheetId}
                onClick={ensureSpreadsheet} 
                className="flex-1 py-5 rounded-2xl bg-[#10B981]/10 text-[#10B981] font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-[#10B981]/20 transition-all border border-[#10B981]/20 disabled:opacity-30"
              >
                {isSyncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                {config.spreadsheetId ? 'Base de Datos Lista' : 'Crear Base de Datos Sheets'}
              </button>
            </div>
          </div>
        )}

        {/* Folder Overlay Selector */}
        {activeFolderSelector && (
          <div className="absolute inset-0 bg-[#0B0D12] z-50 p-10 flex flex-col space-y-8 animate-in slide-in-from-right-full duration-500">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-2xl font-medium">Seleccionar Carpeta</h4>
                <p className="text-xs text-[#646B7B] uppercase tracking-widest font-bold mt-1">Explorando tu Drive para {activeFolderSelector === 'audio' ? 'Audios' : 'Sheets'}</p>
              </div>
              <button 
                onClick={() => setActiveFolderSelector(null)}
                className="p-3 rounded-full hover:bg-white/5 text-[#646B7B] hover:text-white transition-all"
              >
                Cerrar
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-4 space-y-3 custom-scrollbar">
              {loadingFolders ? (
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                  <RefreshCw className="w-10 h-10 animate-spin text-[#5E7BFF]" />
                  <span className="text-xs font-bold uppercase tracking-widest text-[#646B7B]">Escaneando Google Drive...</span>
                </div>
              ) : folders.length > 0 ? (
                folders.map(f => (
                  <button 
                    key={f.id} 
                    onClick={() => selectFolder(activeFolderSelector, f.id, f.name)}
                    className="w-full p-6 bg-[#151823] rounded-3xl border border-[#1F2330] text-left hover:border-[#5E7BFF] transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-4">
                      <FolderOpen className="w-5 h-5 text-[#646B7B] group-hover:text-[#5E7BFF]" />
                      <span className="font-medium">{f.name}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1" />
                  </button>
                ))
              ) : (
                <div className="text-center py-20 text-[#646B7B]">
                   <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-20" />
                   <p className="text-sm">No se encontraron carpetas. Crea una nueva abajo.</p>
                </div>
              )}
            </div>

            <button 
              onClick={createCarceMindFolder}
              className="w-full py-6 rounded-3xl border border-dashed border-[#1F2330] text-xs font-bold uppercase tracking-widest text-[#646B7B] hover:text-white hover:border-[#5E7BFF] transition-all"
            >
              + Crear nueva "CarceMind_Vault"
            </button>
          </div>
        )}
      </section>

      {/* Security Info */}
      <footer className="grid grid-cols-1 md:grid-cols-3 gap-8 opacity-40">
        <div className="flex flex-col items-center text-center gap-3">
          <Database className="w-6 h-6" />
          <p className="text-[10px] font-bold uppercase tracking-widest">Drive Native Storage</p>
        </div>
        <div className="flex flex-col items-center text-center gap-3">
          <Lock className="w-6 h-6" />
          <p className="text-[10px] font-bold uppercase tracking-widest">Google Auth Protocol</p>
        </div>
        <div className="flex flex-col items-center text-center gap-3">
          <ShieldCheck className="w-6 h-6" />
          <p className="text-[10px] font-bold uppercase tracking-widest">Sincronización Segura</p>
        </div>
      </footer>
    </div>
  );
};

export default SettingsView;
