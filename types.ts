
export enum ViewType {
  DASHBOARD = 'DASHBOARD',
  RECORD = 'RECORD',
  CHAT = 'CHAT',
  TASKS = 'TASKS',
  MEMORIES = 'MEMORIES',
  REMINDERS = 'REMINDERS',
  SETTINGS = 'SETTINGS'
}

export interface GoogleConfig {
  isConnected: boolean;
  email: string | null;
  accessToken: string | null;
  audioFolderId: string | null;
  audioFolderName: string | null;
  sheetFolderId: string | null;
  sheetFolderName: string | null;
  spreadsheetId: string | null;
}

// Memory interface renamed from MemoryEntry and expanded to satisfy component and API needs
export interface Memory {
  id: string;
  date?: string;
  timestamp: Date;
  title: string;
  summary?: string;
  excerpt: string;
  emotionalState?: string;
  emotionalTag?: string;
  tags?: string[];
  driveFileId?: string;
  driveViewLink?: string;
  snippets?: string[];
  type: 'voice' | 'text';
  content?: string;
}

// Task interface renamed from TaskEntry and expanded to satisfy component and API needs
export interface Task {
  id: string;
  date: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'completed';
  completed: boolean;
  originId: string;
  deadline: Date;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}
