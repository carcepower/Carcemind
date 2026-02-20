
import { GoogleConfig, Memory, Task } from '../types';
import { GoogleGenAI } from '@google/genai';

export const googleApi = {
  getApiKey() {
    // Referencia exclusiva a la variable de entorno del sistema
    return process.env.API_KEY;
  },

  async safeAiCall(params: { prompt: string, systemInstruction?: string, isAudio?: boolean, audioBlob?: Blob, usePro?: boolean }) {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      console.error("Configuración de API KEY no detectada en el entorno.");
      throw new Error("API_KEY_MISSING");
    }
    
    const ai = new GoogleGenAI({ apiKey });
    let retries = 0;
    const maxRetries = 2;

    const execute = async (): Promise<any> => {
      try {
        // Usamos Gemini 3 Pro para análisis de datos masivos (Consultor/Mail) y Flash para audios
        const modelName = params.usePro ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';
        
        const config: any = { 
          model: modelName,
          config: { 
            temperature: 0.1, // Máxima precisión para evitar errores en importes bancarios
            ...(params.systemInstruction ? { systemInstruction: params.systemInstruction } : {}),
            ...(params.isAudio ? { responseMimeType: 'application/json' } : {})
          }
        };

        let contents: any;
        if (params.isAudio && params.audioBlob) {
          const base64Audio = await new Promise<string>(r => {
            const reader = new FileReader();
            reader.onloadend = () => r((reader.result as string).split(',')[1]);
            reader.readAsDataURL(params.audioBlob!);
          });
          contents = { parts: [{ inlineData: { data: base64Audio, mimeType: 'audio/webm' } }, { text: params.prompt }] };
        } else {
          contents = params.prompt;
        }

        const result = await ai.models.generateContent({ ...config, contents });
        return result;
      } catch (error: any) {
        // Gestión de saturación de cuota (429) con espera progresiva
        if ((error.message?.includes('429') || error.message?.toLowerCase().includes('quota')) && retries < maxRetries) {
          retries++;
          await new Promise(resolve => setTimeout(resolve, 2000 * Math.pow(2, retries)));
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

  async getSpreadsheetMetadata(spreadsheetId: string, token: string) {
    const response = await this.fetchWithAuth(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`, token);
    return await response.json();
  },

  async appendRow(spreadsheetId: string, sheetName: string, values: any[], token: string) {
    await this.fetchWithAuth(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A1:append?valueInputOption=USER_ENTERED`, token, { method: 'POST', body: JSON.stringify({ values: [values] }) });
  },

  async getRows(spreadsheetId: string, sheetName: string, token: string) {
    const response = await this.fetchWithAuth(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A:Z`, token);
    const data = await response.json();
    return data.values || [];
  },

  async findFileInFolder(token: string, fileName: string, folderId: string) {
    const response = await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(`name = '${fileName}' and '${folderId}' in parents and trashed = false`)}&fields=files(id, name, webViewLink)`, token);
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

  async listFolders(token: string) {
    const response = await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent("mimeType = 'application/vnd.google-apps.folder' and trashed = false")}&fields=files(id, name)`, token);
    const data = await response.json();
    return data.files || [];
  },

  async deleteRowById(spreadsheetId: string, sheetName: string, id: string, token: string) {
    const rows = await this.getRows(spreadsheetId, sheetName, token);
    const rowIndex = rows.findIndex(row => row[0] === id);
    if (rowIndex === -1) return;
    const ssMetadata = await (await this.fetchWithAuth(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, token)).json();
    const sheetId = ssMetadata.sheets.find((s: any) => s.properties.title === sheetName).properties.sheetId;
    await this.fetchWithAuth(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, token, { method: 'POST', body: JSON.stringify({ requests: [{ deleteDimension: { range: { sheetId, dimension: 'ROWS', startIndex: rowIndex, endIndex: rowIndex + 1 } } }] }) });
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
