
import React from 'react';
import { ViewType } from '../types';
import { LayoutDashboard, Settings, BrainCircuit } from 'lucide-react';

interface SidebarProps {
  activeView: ViewType;
  onViewChange: (view: View