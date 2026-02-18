
export enum ViewType {
  DASHBOARD = 'DASHBOARD',
  RECORD = 'RECORD',
  CHAT = 'CHAT',
  TASKS = 'TASKS',
  MEMORIES = 'MEMORIES',
  REMINDERS = 'REMINDERS',
  SETTINGS = 'SETTINGS',
  INSTRUCTIONS = 'INSTRUCTIONS'
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

export type TaskStatus = 'pendiente' | 'en marcha' | 'terminada' | 'anulada';

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

export interface Task {
  id: string;
  date: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  status: TaskStatus;
  completed: boolean;
  originId: string;
  deadline: Date;
  completedAt?: Date | null;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}
