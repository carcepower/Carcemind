
import { GoogleConfig, Memory, Task } from '../types';
import { GoogleGenAI } from '@google/genai';

export const googleApi = {
  /**
   * Ejecuta una llamada a Gemini.
   * Crea una instancia nueva en cada llamada para asegurar que captura la API KEY recién vinculada.
   */
  async safeAiCall(params: { 
    prompt: string, 
    systemInstruction?: string, 
    isAudio?: boolean, 
    audioBlob?: Blob, 
    usePro?: boolean 
  }) {
    // La clave debe obtenerse exclusivamente de process.env.API_KEY
    const apiKey = process.env.API_KEY;
    
    if (!apiKey) {
      console.error("CRÍTICO: process.env.API_KEY es null o undefined.");
      throw new Error("KEY_MISSING");
    }

    // Instancia fresca según requerimiento para evitar stale keys
    const ai = new GoogleGenAI({ apiKey });
    
    try {
      const modelName = params.usePro ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';
      
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
          systemInstruction: params.systemInstruction,
          temperature: 0.1
        }
      });
      
      return response;
    } catch (error: any) {
      console.error("Error técnico Gemini:", error);
      const msg = error.message || "";
      
      // Regla de negocio: Si la entidad no se encuentra, la llave es inválida o el proyecto no existe
      if (msg.includes('Requested entity was not found')) {
        throw new Error("KEY_INVALID_OR_MISSING");
      }
      
      if (msg.includes('429')) throw new Error("QUOTA_EXCEEDED");
      if (msg.includes('API key') || msg.includes('set when running')) throw new Error("KEY_MISSING");
      if (msg.includes('403')) throw new Error("PERMISSION_DENIED");
      throw error;
    }
  },

  async fetchWithAuth(url: string, token: string, options: RequestInit = {}) {
    if (!token) throw new Error("TOKEN_MISSING");
    const headers = new Headers(options.headers || {});
    headers.set('Authorization', `Bearer ${token}`);
    if (options.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
      if (response.status === 401) throw new Error("SESSION_EXPIRED");
      throw new Error(`Error API Google: ${response.status}`);
    }
    return response;
  },

  async getSpreadsheetMetadata(spreadsheetId: string, token: string) {
    const response = await this.fetchWithAuth(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title,sheets.properties.sheetId`, token);
    return await response.json();
  },

  async appendRow(spreadsheetId: string, sheetName: string, values: any[], token: string) {
    try {
      console.log(`Solicitando escritura en Sheets para: ${sheetName}`);
      const res = await this.fetchWithAuth(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A1:append?valueInputOption=USER_ENTERED`, token, { 
        method: 'POST', 
        body: JSON.stringify({ values: [values] }) 
      });
      if (res.ok) {
        console.log(`CONFIRMADO: Fila añadida en ${sheetName}. Pablo, revisa el FINAL de tu hoja.`);
      }
    } catch (e: any) {
      console.warn(`Fallo en appendRow (${sheetName}):`, e.message);
    }
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
    const response = await this.fetchWithAuth('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink', token, { 
      method: 'POST', 
      body: formData 
    });
    return await response.json();
  },

  async updateTaskStatusAndDate(spreadsheetId: string, id: string, status: string, completionDate: string | null, token: string) {
    const rows = await this.getRows(spreadsheetId, 'TAREAS', token);
    const rowIndex = rows.findIndex(row => row[0] === id);
    if (rowIndex === -1) return;
    const rowNum = rowIndex + 1;
    await this.fetchWithAuth(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, token, { 
      method: 'POST', 
      body: JSON.stringify({ 
        valueInputOption: 'RAW', 
        data: [
          { range: `TAREAS!E${rowNum}`, values: [[status]] }, 
          { range: `TAREAS!H${rowNum}`, values: [[completionDate || '']] }
        ] 
      }) 
    });
  },

  async updateTaskDetail(spreadsheetId: string, id: string, newTitle: string, token: string) {
    const rows = await this.getRows(spreadsheetId, 'TAREAS', token);
    const rowIndex = rows.findIndex(row => row[0] === id);
    if (rowIndex === -1) return;
    const rowNum = rowIndex + 1;
    await this.fetchWithAuth(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/TAREAS!C${rowNum}?valueInputOption=RAW`, token, { 
      method: 'PUT', 
      body: JSON.stringify({ values: [[newTitle]] }) 
    });
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
