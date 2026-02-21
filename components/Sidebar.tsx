
import React from 'react';
import { ViewType } from '../types';
import { 
  LayoutDashboard, 
  Mic, 
  MessageSquare, 
  CheckSquare, 
  History, 
  Settings,
  BrainCircuit,
  BookOpen,
  Mail
} from 'lucide-react';

interface SidebarProps {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
  isMobileMenuOpen: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, onViewChange, isMobileMenuOpen }) => {
  const navItems = [
    { id: ViewType.DASHBOARD, label: 'CUADRO DE MANDO', icon: LayoutDashboard },
    { id: ViewType.RECORD, label: 'GRABAR', icon: Mic },
    { id: ViewType.CHAT, label: 'CONSULTOR', icon: MessageSquare },
    { id: ViewType.MAIL, label: 'CARCEMAIL', icon: Mail },
    { id: ViewType.TASKS, label: 'TAREAS', icon: CheckSquare },
    { id: ViewType.MEMORIES, label: 'CRONOLOGÍA', icon: History },
    { id: ViewType.INSTRUCTIONS, label: 'INSTRUCCIONES', icon: BookOpen },
    { id: ViewType.SETTINGS, label: 'AJUSTES', icon: Settings },
  ];

  const mobileBottomItems = [
    { id: ViewType.DASHBOARD, icon: LayoutDashboard },
    { id: ViewType.RECORD, icon: Mic },
    { id: ViewType.MAIL, icon: Mail },
    { id: ViewType.TASKS, icon: CheckSquare },
    { id: ViewType.SETTINGS, icon: Settings },
  ];

  return (
    <>
      <aside className={`
        fixed md:static inset-y-0 left-0 w-[280px] bg-[#0B0D12] border-r border-[#1F2330] flex flex-col z-[100] transition-transform duration-500 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-8 flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#5E7BFF] to-[#8A6CFF] flex items-center justify-center shadow-lg shadow-[#5E7BFF33]">
            <BrainCircuit className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">CarceMind</h1>
        </div>

        <nav className="flex-1 px-4 mt-4 space-y-2 overflow-y-auto scrollbar-hide">
          {navItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`w-full group flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 relative ${
                  isActive 
                    ? 'bg-[#151823] text-white' 
                    : 'text-[#A0A6B1] hover:text-white hover:bg-[#151823]/50'
                }`}
              >
                <item.icon className={`w-5 h-5 transition-colors ${isActive ? 'text-[#5E7BFF]' : 'group-hover:text-[#5E7BFF]'}`} />
                <span className="text-sm font-medium tracking-wide">{item.label}</span>
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#5E7BFF] rounded-r-full shadow-[0_0_12px_rgba(94,123,255,0.6)]" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-6 border-t border-[#1F2330] mt-auto shrink-0 md:block hidden">
          <div className="flex items-center gap-3 px-4 py-2 text-[10px] font-bold text-[#646B7B] uppercase tracking-widest">
            Cognición v1.6
          </div>
        </div>
      </aside>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 glass border-t border-[#1F2330] px-2 py-3 pb-8 flex justify-around items-center z-[100] safe-area-bottom">
        {mobileBottomItems.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button 
              key={item.id} 
              onClick={() => onViewChange(item.id)} 
              className="flex flex-col items-center gap-1 flex-1"
            >
              <div className={`p-2.5 rounded-xl transition-all duration-300 ${isActive ? 'bg-[#5E7BFF] text-white shadow-lg shadow-[#5E7BFF44] scale-110' : 'text-[#646B7B] hover:text-[#A0A6B1]'}`}>
                <item.icon className="w-5 h-5" />
              </div>
            </button>
          );
        })}
      </nav>
    </>
  );
};

export default Sidebar;
