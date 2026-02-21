
import React, { useState, useEffect } from 'react';
import { ViewType, GoogleConfig } from './types';
import Sidebar from './components/Sidebar';
import Dashboard from './views/Dashboard';
import SettingsView from './views/SettingsView';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewType>(ViewType.DASHBOARD);
  
  const [googleConfig, setGoogleConfig] = useState<GoogleConfig>(() => {
    const saved = localStorage.getItem('carcemind_base_config');
    return saved ? JSON.parse(saved) : { isConnected: false, email: null, accessToken: null };
  });

  useEffect(() => {
    localStorage.setItem('carcemind_base_config', JSON.stringify(googleConfig));
  }, [googleConfig]);

  const renderView = () => {
    switch (activeView) {
      case ViewType.DASHBOARD:
        return <Dashboard config={googleConfig} />;
      case ViewType.SETTINGS:
        return <SettingsView config={googleConfig} setConfig={setGoogleConfig} />;
      default:
        return <Dashboard config={googleConfig} />;
    }
  };

  return (
    <div className="flex h-screen bg-[#0B0D12] text-[#F5F7FA] overflow-hidden">
      <Sidebar 
        activeView={activeView} 
        onViewChange={setActiveView} 
      />
      <main className="flex-1 overflow-y-auto p-6 md:p-12">
        <div className="max-w-4xl mx-auto">
          {renderView()}
        </div>
      </main>
    </div>
  );
};

export default App;
