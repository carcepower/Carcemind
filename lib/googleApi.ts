
import { GoogleConfig, Memory, Task } from '../types';
import { GoogleGenAI } from '@google/genai';

export const googleApi = {
  getApiKey() {
    const env = (import.meta as any).env;
    const proc = (process as any).env;
    const key = env?.VITE_API_KEY || proc?.VITE_API_KEY || proc?.API_KEY;
    if (!key || key === 'undefined') return null;
    return key;
  },

  async safeAiCall(params: { prompt: string, systemInstruction?: string, isAudio?: boolean, audioBlob?: Blob, fileData?: { data: string, mimeType: string } }) {
    const apiKey = this.getApiKey();
    if (!apiKey) throw new Error("API_KEY_MISSING");
    
    const ai = new GoogleGenAI({ apiKey });
    let retries = 0;
    const maxRetries = 2;

    const execute = async (): Promise<any> => {
      try {
        const config: any = { 
          model: 'gemini-3-flash-preview',
          config: { 
            temperature: 0.1, // Más bajo para mayor precisión en datos
            ...(params.systemInstruction ? { systemInstruction: params.systemInstruction } : {}),
            responseMimeType: 'application/json'
          }
        };

        let parts: any[] = [{ text: params.prompt }];
        
        if (params.isAudio && params.audioBlob) {
          const base64Audio = await new Promise<string>(r => {
            const reader = new FileReader();
            reader.onloadend = () => r((reader.result as string).split(',')[1]);
            reader.readAsDataURL(params.audioBlob!);
          });
          parts.unshift({ inlineData: { data: base64Audio, mimeType: 'audio/webm' } });
        }

        if (params.fileData) {
          parts.unshift({ inlineData: { data: params.fileData.data, mimeType: params.fileData.mimeType } });
        }

        const result = await ai.models.generateContent({ ...config, contents: { parts } });
        return result;
      } catch (error: any) {
        if (error.message?.includes('429') && retries < maxRetries) {
          retries++;
          await new Promise(resolve => setTimeout(resolve, 3000));
          return execute();
        }
        throw error;
      }
    };

    return execute();
  },

  async fetchWithAuth(url: string, token: string, options: RequestInit = {}) {
    if (!token) throw new Error("TOKEN_MISSING");
    const headers = new Headers(options.headers || {});
    headers.set('Authorization', `Bearer ${token}`);
    if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    let response = await fetch(url, { ...options, headers });
    if (!response.ok) {
      if (response.status === 401) throw new Error("SESSION_EXPIRED");
      throw new Error(`Error ${response.status}`);
    }
    return response;
  },

  async createSpreadsheet(token: string, name: string, folderId: string) {
    const response = await this.fetchWithAuth('https://sheets.googleapis.com/v4/spreadsheets', token, { method: 'POST', body: JSON.stringify({ properties: { title: name } }) });
    const ss = await response.json();
    const spreadsheetId = ss.spreadsheetId;
    await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files/${spreadsheetId}?addParents=${folderId}&removeParents=root`, token, { method: 'PATCH' });
    
    await this.fetchWithAuth(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, token, { 
      method: 'POST', 
      body: JSON.stringify({ 
        requests: [
          { addSheet: { properties: { title: 'ENTRADAS' } } }, 
          { addSheet: { properties: { title: 'TAREAS' } } }, 
          { addSheet: { properties: { title: 'CHAT_LOG' } } },
          { addSheet: { properties: { title: 'MAIL_LOG' } } },
          { addSheet: { properties: { title: 'BANK_LOG' } } },
          { deleteSheet: { sheetId: 0 } }
        ] 
      }) 
    });

    await this.appendRow(spreadsheetId, 'ENTRADAS', ['ID', 'FECHA', 'TITULO', 'RESUMEN', 'EMOCION', 'TAGS', 'DRIVE_ID', 'DRIVE_LINK', 'SNIPPETS', 'TEXTO'], token);
    await this.appendRow(spreadsheetId, 'TAREAS', ['ID', 'FECHA', 'TITULO', 'PRIORIDAD', 'ESTADO', 'ORIGEN', 'DEADLINE', 'COMPLETED'], token);
    await this.appendRow(spreadsheetId, 'CHAT_LOG', ['ID', 'FECHA', 'ROLE', 'TEXTO'], token);
    await this.appendRow(spreadsheetId, 'MAIL_LOG', ['ID', 'FECHA', 'PROMPT', 'AI_ANSWER', 'RESULTS_JSON'], token);
    await this.appendRow(spreadsheetId, 'BANK_LOG', ['ID', 'FECHA', 'CONCEPTO', 'IMPORTE', 'SALDO', 'ENTIDAD', 'CATEGORIA'], token);
    
    return spreadsheetId;
  },

  async appendRow(spreadsheetId: string, sheetName: string, values: any[], token: string) {
    await this.fetchWithAuth(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A1:append?valueInputOption=USER_ENTERED`, token, { method: 'POST', body: JSON.stringify({ values: [values] }) });
  },

  async batchAppendRows(spreadsheetId: string, sheetName: string, rows: any[][], token: string) {
    await this.fetchWithAuth(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A1:append?valueInputOption=USER_ENTERED`, token, { method: 'POST', body: JSON.stringify({ values: rows }) });
  },

  async getRows(spreadsheetId: string, sheetName: string, token: string) {
    const response = await this.fetchWithAuth(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A:Z`, token);
    const data = await response.json();
    return data.values || [];
  },

  async deleteRowById(spreadsheetId: string, sheetName: string, id: string, token: string) {
    const rows = await this.getRows(spreadsheetId, sheetName, token);
    const rowIndex = rows.findIndex(row => row[0] === id);
    if (rowIndex === -1) return;
    const ssMetadata = await (await this.fetchWithAuth(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, token)).json();
    const sheetId = ssMetadata.sheets.find((s: any) => s.properties.title === sheetName).properties.sheetId;
    await this.fetchWithAuth(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, token, { method: 'POST', body: JSON.stringify({ requests: [{ deleteDimension: { range: { sheetId, dimension: 'ROWS', startIndex: rowIndex, endIndex: rowIndex + 1 } } }] }) });
  },

  async listFolders(token: string) {
    const response = await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent("mimeType = 'application/vnd.google-apps.folder' and trashed = false")}&fields=files(id, name)`, token);
    const data = await response.json();
    return data.files || [];
  },

  async findFileInFolder(token: string, fileName: string, folderId: string) {
    const response = await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(`name = '${fileName}' and '${folderId}' in parents and trashed = false`)}&fields=files(id, name)`, token);
    const data = await response.json();
    return data.files?.[0] || null;
  },

  async uploadFile(token: string, blob: Blob, fileName: string, folderId: string) {
    const metadata = { name: fileName, parents: [folderId] };
    const formData = new FormData();
    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    formData.append('file', blob);
    const response = await this.fetchWithAuth('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink', token, { method: 'POST', body: formData });
    return await response.json();
  },

  async updateTaskStatusAndDate(spreadsheetId: string, id: string, status: string, completionDate: string | null, token: string) {
    const rows = await this.getRows(spreadsheetId, 'TAREAS', token);
    const rowIndex = rows.findIndex(row => row[0] === id);
    if (rowIndex === -1) return;
    const rowNum = rowIndex + 1;
    await this.fetchWithAuth(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, token, { method: 'POST', body: JSON.stringify({ valueInputOption: 'RAW', data: [{ range: `TAREAS!E${rowNum}`, values: [[status]] }, { range: `TAREAS!H${rowNum}`, values: [[completionDate || '']] }] }) });
  },

  async updateTaskDetail(spreadsheetId: string, id: string, newTitle: string, token: string) {
    const rows = await this.getRows(spreadsheetId, 'TAREAS', token);
    const rowIndex = rows.findIndex(row => row[0] === id);
    if (rowIndex === -1) return;
    const rowNum = rowIndex + 1;
    await this.fetchWithAuth(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/TAREAS!C${rowNum}?valueInputOption=RAW`, token, { method: 'PUT', body: JSON.stringify({ values: [[newTitle]] }) });
  },

  async searchGmail(token: string, query: string, maxResults: number = 5) {
    const response = await this.fetchWithAuth(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`, token);
    const data = await response.json();
    return data.messages || [];
  },

  async getGmailMessage(token: string, id: string) {
    const response = await this.fetchWithAuth(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`, token);
    return await response.json();
  }
};
