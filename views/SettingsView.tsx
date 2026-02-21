
import React from 'react';
import { GoogleConfig } from '../types';
import { Chrome, LogOut, CheckCircle2, AlertCircle } from 'lucide-react';

interface SettingsViewProps {
  config: GoogleConfig;
  setConfig: React.Dispatch<React.SetStateAction<GoogleConfig>>;
}

const CLIENT_ID = "660418616677-8rbbg21t1ksej5vuso1ou9r7sue8ma3a.apps.googleusercontent.com"; 

const SettingsView: React.FC<SettingsViewProps> = ({ config, setConfig }) => {
  
  const handleConnect = () => {
    try {
      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: 'openid https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.metadata.readonly https://www.googleapis.com/auth/spreadsheets',
        callback: (response: any) => {
          if (response.access_token) {
            fetch('https://www.googleapis.com/oauth2/v2/userinfo', { headers: { Authorization: `Bearer ${response.access_token}` } })
            .then(res => res.json())
            .then(user => {
              setConfig({ isConnected: true, accessToken: response.access_token, email: user.email });
            });
          }
        },
      });
      client.requestAccessToken();
    } catch (e) {
      console.error("Error al iniciar Google Auth", e);
    }
  };

  const handleDisconnect = () => {
    setConfig({ isConnected: false, email: null, accessToken: null });
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <header>
        <h2 className="text-4xl font-semibold tracking-tight">Ajustes</h2>
        <p className="text-[#646B7B]">Configuración de la conexión base.</p>
      </header>

      <section className="glass border border-[#1F2330] p-10 rounded-[2.5rem] space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
              <Chrome className="text-[#5E7BFF]" />
            </div>
            <div>
              <h3 className="text-xl font-medium">Google Drive</h3>
              {config.isConnected ? (
                <div className="flex items-center gap-2 text-[#10B981] text-sm mt-1">
                  <CheckCircle2 size={14} />
                  <span>Conectado: {config.email}</span>
                </div>
              ) : (
                <p className="text-[#646B7B] text-sm mt-1">Requiere autenticación.</p>
              )}
            </div>
          </div>

          {!config.isConnected ? (
            <button 
              onClick={handleConnect}
              className="px-8 py-4 bg-white text-black font-bold rounded-2xl hover:scale-105 transition-all flex items-center gap-2"
            >
              <Chrome size={18} />
              Conectar Cuenta
            </button>
          ) : (
            <button 
              onClick={handleDisconnect}
              className="px-6 py-3 bg-red-500/10 text-red-500 font-bold rounded-xl border border-red-500/20 hover:bg-red-500 hover:text-white transition-all flex items-center gap-2"
            >
              <LogOut size={16} />
              Desconectar
            </button>
          )}
        </div>
      </section>
    </div>
  );
};

export default SettingsView;
