
import { GoogleConfig, Memory, Task } from '../types';
import { GoogleGenAI } from '@google/genai';

export const googleApi = {
  async safeAiCall(params: { 
    prompt: string, 
    systemInstruction?: string, 
    isAudio?: boolean, 
    audioBlob?: Blob, 
    usePro?: boolean 
  }) {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    const modelName = params.usePro ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';
    
    try {
      let contents: any;
      if (params.isAudio && params.audioBlob) {
        const base64Audio = await new Promise<string>(r => {
          const reader = new FileReader();
          reader.onloadend = () => r((reader.result as string).split(',')[1]);
          reader.readAsDataURL(params.audioBlob!);
        });
        contents = { 
          parts: [
            { inlineData: { data: base64Audio, mimeType: 'audio/webm' } }, 
            { text: params.prompt }
          ] 
        };
      } else {
        contents = { parts: [{ text: params.prompt }] };
      }

      const response = await ai.models.generateContent({
        model: modelName,
        contents: contents,
        config: {
          systemInstruction: params.systemInstruction || "Eres CarceMind, el asistente de memoria personal de Pablo.",
          temperature: 0.2
        }
      });
      
      return response;
    } catch (error: any) {
      console.error("Error en comunicación con Gemini:", error.message);
      throw error;
    }
  },

  async fetchWithAuth(url: string, token: string, options: RequestInit = {}) {
    const headers = new Headers(options.headers || {});
    headers.set('Authorization', `Bearer ${token}`);
    if (options.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    const response = await fetch(url, { ...options, headers });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message = errorData.error?.message || `Error ${response.status}`;
      
      if (response.status === 401) throw new Error("SESSION_EXPIRED");
      if (response.status === 400) throw new Error(`CONFIG_ERROR: ${message}`);
      
      throw new Error(message);
    }
    return response;
  },

  async getSpreadsheetMetadata(spreadsheetId: string, token: string) {
    const response = await this.fetchWithAuth(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`, token);
    return await response.json();
  },

  async createSheetTabs(spreadsheetId: string, titles: string[], token: string) {
    const requests = titles.map(title => ({
      addSheet: { properties: { title } }
    }));
    await this.fetchWithAuth(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, token, {
      method: 'POST',
      body: JSON.stringify({ requests })
    });
  },

  async appendRow(spreadsheetId: string, sheetName: string, values: any[], token: string) {
    // Rango escapado para evitar errores 400 si la pestaña no existe o tiene caracteres especiales
    const range = encodeURIComponent(`'${sheetName}'!A1`);
    await this.fetchWithAuth(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`, token, { 
      method: 'POST', 
      body: JSON.stringify({ values: [values] }) 
    });
  },

  async getRows(spreadsheetId: string, sheetName: string, token: string) {
    const range = encodeURIComponent(`'${sheetName}'!A:Z`);
    const response = await this.fetchWithAuth(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`, token);
    const data = await response.json();
    return data.values || [];
  },

  async updateTaskStatusAndDate(spreadsheetId: string, id: string, status: string, completionDate: string | null, token: string) {
    const rows = await this.getRows(spreadsheetId, 'TAREAS', token);
    const rowIndex = rows.findIndex(row => row[0] === id);
    if (rowIndex === -1) return;
    const rowNum = rowIndex + 1;
    // TAREAS: ID(A), FECHA_C(B), TITULO(C), PRIORIDAD(D), ESTADO(E), ORIGEN(F), LIMITE(G), CIERRE(H)
    await this.fetchWithAuth(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, token, { 
      method: 'POST', 
      body: JSON.stringify({ 
        valueInputOption: 'RAW', 
        data: [
          { range: `'TAREAS'!E${rowNum}`, values: [[status]] }, 
          { range: `'TAREAS'!H${rowNum}`, values: [[completionDate || '']] }
        ] 
      }) 
    });
  },

  async updateTaskDetail(spreadsheetId: string, id: string, newTitle: string, token: string) {
    const rows = await this.getRows(spreadsheetId, 'TAREAS', token);
    const rowIndex = rows.findIndex(row => row[0] === id);
    if (rowIndex === -1) return;
    const rowNum = rowIndex + 1;
    // Columna C (3) es la descripción/título
    const range = encodeURIComponent(`'TAREAS'!C${rowNum}`);
    await this.fetchWithAuth(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=RAW`, token, { 
      method: 'PUT', 
      body: JSON.stringify({ values: [[newTitle]] }) 
    });
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
    const response = await this.fetchWithAuth('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink', token, { 
      method: 'POST', 
      body: formData 
    });
    return await response.json();
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
    await this.fetchWithAuth(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, token, { 
      method: 'POST', 
      body: JSON.stringify({ 
        requests: [{ deleteDimension: { range: { sheetId, dimension: 'ROWS', startIndex: rowIndex, endIndex: rowIndex + 1 } } }] 
      }) 
    });
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
