
export enum ViewType {
  DASHBOARD = 'DASHBOARD',
  SETTINGS = 'SETTINGS'
}

export interface GoogleConfig {
  isConnected: boolean;
  email: string | null;
  accessToken: string | null;
}
