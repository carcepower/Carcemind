
import React, { useState, useEffect } from 'react';
import { GoogleConfig } from '../types';
import { googleApi } from '../lib/googleApi';
import { 
  Chrome, 
  FolderOpen, 
  RefreshCw, 
  AlertCircle,
  Database,
  LogOut,
  Brain,
  CheckCircle2,
  ExternalLink,
  Search,
  FileSpreadsheet,
  PlusCircle,
  Copy,
  Terminal
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
  const [fileFoundStatus, setFileFoundStatus] = useState<'searching' | 'found' | 'not_found' | 'idle'>('idle');
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    if (config.isConnected && config.accessToken) {
      loadFolders();
    }
  }, [config.isConnected, config.accessToken]);

  useEffect(() => {
    if (config.isConnected && config.accessToken && config.sheetFolderId) {
      checkForSpreadsheet();
    }
  }, [config.sheetFolderId]);

  const checkForSpreadsheet = async () => {
    if (!config.accessToken || !config.sheetFolderId) return;
    setFileFoundStatus('searching');
    try {
      const file = await googleApi.findFileInFolder(config.accessToken, 'CarceMind_Memory_Index', config.sheetFolderId);
      if (file) {
        setConfig(prev => ({ ...prev, spreadsheetId: file.id }));
        setFileFoundStatus('found');
        setError(null);
      } else {
        setConfig(prev => ({ ...prev, spreadsheetId: null }));
        setFileFoundStatus('not_found');
      }
    } catch (e: any) {
      setFileFoundStatus('idle');
    }
  };

  const handleSessionExpired = () => {
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
    setError("Tu sesión de Google ha expirado. Por favor, vuelve a conectar.");
  };

  const loadFolders = async () => {
    if (!config.accessToken) return;
    setLoadingFolders(true);
    setError(null);
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
        // Cambiamos a 'consent' para forzar que Google muestre la pantalla de aviso y permita el bypass de Test User
        prompt: 'consent select_account',
        callback: (response: any) => {
          if (response.error) {
            setError(`Error Google: ${response.error} - ${response.error_description || ''}`);
            return;
          }
          if (response.access_token) {
            fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
              headers: { Authorization: `Bearer ${response.access_token}` }
            })
            .then(res => res.json())
            .then(user => {
              setConfig({ ...config, isConnected: true, accessToken: response.access_token, email: user.email });
              setError(null);
            });
          }
        },
      });
      client.requestAccessToken();
    } catch (e) { setError("Error al iniciar Google Auth."); }
  };

  const handleDisconnect = () => {
    setConfig({
      isConnected: false, accessToken: null, email: null, audioFolderId: null, audioFolderName: null, 
      sheetFolderId: null, sheetFolderName: null, spreadsheetId: null
    });
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

  const ensureSpreadsheet = async () => {
    if (!config.accessToken || !config.sheetFolderId) return;
    setIsSyncing(true);
    try {
      const ssId = await googleApi.createSpreadsheet(config.accessToken, 'CarceMind_Memory_Index', config.sheetFolderId);
      setConfig(prev => ({ ...prev, spreadsheetId: ssId }));
      setFileFoundStatus('found');
    } catch (e: any) {
      setError(`Error al crear índice: ${e.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const copyClientId = () => {
    navigator.clipboard.writeText(CLIENT_ID);
    alert("Client ID copiado al portapapeles");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-32 animate-in fade-in duration-700">
      <header className="flex justify-between items-end">
        <div className="space-y-2">
          <p className="text-[#A0A6B1] text-sm uppercase tracking-widest font-bold">Configuración</p>
          <h2 className="text-4xl font-semibold tracking-tight">Estructura Cognitiva</h2>
        </div>
        <button 
          onClick={() => setShowDebug(!showDebug)}
          className={`p-3 rounded-xl border transition-colors ${showDebug ? 'bg-[#5E7BFF] border-[#5E7BFF] text-white' : 'bg-[#151823] border-[#1F2330] text-[#646B7B]'}`}
          title="Modo Depuración"
        >
          <Terminal size={18} />
        </button>
      </header>

      {showDebug && (
        <section className="p-8 rounded-[2rem] bg-[#151823] border border-[#5E7BFF]/30 space-y-4 animate-in slide-in-from-top-4">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#5E7BFF]">Debug: OAuth Client Check</h4>
            <button onClick={copyClientId} className="text-[10px] font-bold text-white/50 hover:text-white flex items-center gap-2">
              <Copy size={12} /> Copiar ID
            </button>
          </div>
          <p className="text-[10px] font-mono text-[#A0A6B1] break-all bg-black/40 p-4 rounded-xl border border-white/5">
            {CLIENT_ID}
          </p>
          <p className="text-[10px] text-[#646B7B] italic">
            * Comprueba que este ID exacto aparezca en tu sección "Clientes de OAuth" en la consola de Google.
          </p>
        </section>
      )}

      {/* Secciones de Configuración */}
      <div className="grid grid-cols-1 gap-8">
        {/* PASO 1: Google Account */}
        <section className="glass border border-[#1F2330] p-10 rounded-[3rem] space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-start gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#5E7BFF]/10 flex items-center justify-center border border-[#5E7BFF]/20">
                  <Chrome className="w-6 h-6 text-[#5E7BFF]" />
                </div>
                <div>
                  <h3 className="text-xl font-medium">Conexión con Google</h3>
                  <p className="text-[#646B7B] text-sm italic">Habilita el guardado externo de tus memorias.</p>
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
              <button onClick={handleConnect} className="w-full md:w-auto px-10 py-5 rounded-2xl bg-white text-black font-bold flex items-center justify-center gap-3 hover:scale-[1.02] transition-all shadow-xl">
                <Chrome size={20} /> Conectar Cuenta
              </button>
            ) : (
              <button onClick={handleDisconnect} className="w-full md:w-auto px-8 py-4 rounded-xl bg-red-500/10 text-red-500 text-[10px] font-bold uppercase tracking-widest border border-red-500/20">
                <LogOut size={16} className="inline mr-2" /> Desvincular
              </button>
            )}
          </div>
        </section>

        {/* PASO 2: Directorios */}
        {config.isConnected && (
          <section className="glass border border-[#1F2330] p-10 rounded-[3rem] space-y-10 animate-in slide-in-from-bottom-4">
            <div className="space-y-2">
              <h3 className="text-xl font-medium">Asignación de Directorios</h3>
              <p className="text-[#646B7B] text-sm">Selecciona las carpetas donde CarceMind gestionará tus datos.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#5E7BFF]">Archivos de Audio (.webm)</label>
                <button 
                  onClick={() => { loadFolders(); setActiveFolderSelector('audio'); }}
                  className={`w-full p-6 rounded-2xl border text-left transition-all flex justify-between items-center ${config.audioFolderId ? 'bg-[#10B981]/5 border-[#10B981]/30 text-white' : 'bg-[#151823] border-[#1F2330] text-[#646B7B]'}`}
                >
                  <div className="flex items-center gap-3">
                    <FolderOpen size={18} className={config.audioFolderId ? 'text-[#10B981]' : ''} />
                    <span className="truncate max-w-[150px]">{config.audioFolderName || 'Seleccionar...'}</span>
                  </div>
                  {config.audioFolderId && <CheckCircle2 size={16} className="text-[#10B981]" />}
                </button>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#10B981]">Base de Datos (Excel)</label>
                <button 
                  onClick={() => { loadFolders(); setActiveFolderSelector('sheet'); }}
                  className={`w-full p-6 rounded-2xl border text-left transition-all flex justify-between items-center ${config.sheetFolderId ? 'bg-[#10B981]/5 border-[#10B981]/30 text-white' : 'bg-[#151823] border-[#1F2330] text-[#646B7B]'}`}
                >
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet size={18} className={config.sheetFolderId ? 'text-[#10B981]' : ''} />
                    <span className="truncate max-w-[150px]">{config.sheetFolderName || 'Seleccionar...'}</span>
                  </div>
                  {config.sheetFolderId && <CheckCircle2 size={16} className="text-[#10B981]" />}
                </button>
              </div>
            </div>

            {/* PASO 3: Validación de Archivo */}
            {config.sheetFolderId && (
              <div className="p-8 rounded-[2rem] bg-[#0B0D12] border border-[#1F2330] space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Search className="text-[#5E7BFF]" size={20} />
                    <h4 className="font-medium">Validación del Índice de Memoria</h4>
                  </div>
                  {fileFoundStatus === 'searching' && <RefreshCw size={18} className="animate-spin text-[#5E7BFF]" />}
                </div>

                {fileFoundStatus === 'found' && (
                  <div className="flex items-center gap-4 text-[#10B981] bg-[#10B981]/5 p-4 rounded-xl border border-[#10B981]/20">
                    <CheckCircle2 size={20} />
                    <div className="text-xs">
                      <p className="font-bold">¡ARCHIVO DETECTADO!</p>
                      <p className="opacity-80">CarceMind_Memory_Index vinculado correctamente.</p>
                    </div>
                  </div>
                )}

                {fileFoundStatus === 'not_found' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 text-amber-500 bg-amber-500/5 p-4 rounded-xl border border-amber-500/20">
                      <AlertCircle size={20} />
                      <div className="text-xs">
                        <p className="font-bold uppercase tracking-widest">No se encuentra el archivo</p>
                        <p className="opacity-80">El índice no existe en la carpeta seleccionada.</p>
                      </div>
                    </div>
                    <button 
                      onClick={ensureSpreadsheet}
                      disabled={isSyncing}
                      className="w-full py-5 rounded-2xl bg-[#5E7BFF] text-white font-bold text-xs uppercase tracking-widest shadow-lg shadow-[#5E7BFF33] flex items-center justify-center gap-3 active:scale-95 transition-all"
                    >
                      {isSyncing ? <RefreshCw className="animate-spin" /> : <PlusCircle size={18} />}
                      Crear Archivo de Datos
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>
        )}
      </div>

      {/* Folder Selector Overlay */}
      {activeFolderSelector && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-xl p-6 md:p-20 flex items-center justify-center">
          <div className="bg-[#0B0D12] border border-[#1F2330] w-full max-w-2xl rounded-[3rem] p-10 flex flex-col h-3/4 shadow-3xl">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-semibold">Directorios de Drive</h2>
                <p className="text-[#646B7B] text-sm">Escoge una ubicación para {activeFolderSelector === 'audio' ? 'audios' : 'hojas de cálculo'}.</p>
              </div>
              <button onClick={() => setActiveFolderSelector(null)} className="p-3 bg-white/5 rounded-full text-[#646B7B] hover:text-white">Cerrar</button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-4 space-y-2">
              {loadingFolders ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-[#646B7B]">
                  <RefreshCw className="animate-spin" />
                  <span className="text-xs font-bold uppercase tracking-tighter">Leyendo Drive...</span>
                </div>
              ) : folders.length > 0 ? folders.map(f => (
                <button 
                  key={f.id} 
                  onClick={() => selectFolder(activeFolderSelector, f.id, f.name)}
                  className="w-full p-6 bg-[#151823] rounded-2xl border border-[#1F2330] text-left hover:border-[#5E7BFF] transition-all flex items-center gap-4 group"
                >
                  <FolderOpen className="text-[#646B7B] group-hover:text-[#5E7BFF] transition-colors" />
                  <span className="font-medium">{f.name}</span>
                </button>
              )) : (
                <div className="text-center py-20 text-[#646B7B]">No se encontraron carpetas.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="p-6 rounded-3xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-4 animate-in slide-in-from-top-2">
          <AlertCircle className="w-6 h-6 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}
    </div>
  );
};

export default SettingsView;
