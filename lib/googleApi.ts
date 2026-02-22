
import { GoogleConfig, Memory, Task } from '../types';
import { GoogleGenAI, GenerateContentResponse } from '@google/genai';

export const googleApi = {
  /**
   * Obtiene la clave de API exclusivamente de process.env.API_KEY.
   */
  getApiKey() {
    return process.env.API_KEY;
  },

  /**
   * Llama a Gemini con gestión de modelos y reintentos.
   * Compatible con parámetros de audio y selección de modelo Pro/Flash.
   */
  async safeAiCall(params: { prompt: string, systemInstruction?: string, isAudio?: boolean, audioBlob?: Blob, usePro?: boolean }): Promise<GenerateContentResponse> {
    // Fixed: Exclusively use process.env.API_KEY string directly
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("API_KEY_MISSING");
    
    // Fixed: Always use a named parameter when initializing GoogleGenAI
    const ai = new GoogleGenAI({ apiKey });
    let retries = 0;
    const maxRetries = 2;

    const execute = async (): Promise<GenerateContentResponse> => {
      try {
        // Seleccionamos el modelo según la complejidad requerida (Gemini 3 series)
        const modelName = params.usePro ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';

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

        // Fixed: Use ai.models.generateContent directly with model, contents and config
        const response = await ai.models.generateContent({ 
          model: modelName,
          contents,
          config: { 
            temperature: 0.7,
            ...(params.systemInstruction ? { systemInstruction: params.systemInstruction } : {}),
            ...(params.isAudio ? { responseMimeType: 'application/json' } : {})
          }
        });
        
        return response; // Correctly access .text property later
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

  /**
   * Obtiene los metadatos de una hoja de cálculo para verificar pestañas.
   */
  async getSpreadsheetMetadata(spreadsheetId: string, token: string) {
    const response = await this.fetchWithAuth(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, token);
    return await response.json();
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
          { deleteSheet: { sheetId: 0 } }
        ] 
      }) 
    });

    await this.appendRow(spreadsheetId, 'ENTRADAS', ['ID', 'FECHA', 'TITULO', 'RESUMEN', 'EMOCION', 'TAGS', 'DRIVE_ID', 'DRIVE_LINK', 'SNIPPETS', 'TEXTO'], token);
    await this.appendRow(spreadsheetId, 'TAREAS', ['ID', 'FECHA', 'TITULO', 'PRIORIDAD', 'ESTADO', 'ORIGEN', 'DEADLINE', 'COMPLETED'], token);
    await this.appendRow(spreadsheetId, 'CHAT_LOG', ['ID', 'FECHA', 'ROLE', 'TEXTO'], token);
    await this.appendRow(spreadsheetId, 'MAIL_LOG', ['ID', 'FECHA', 'PROMPT', 'AI_ANSWER', 'RESULTS_JSON'], token);
    
    return spreadsheetId;
  },

  async appendRow(spreadsheetId: string, sheetName: string, values: any[], token: string) {
    await this.fetchWithAuth(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A1:append?valueInputOption=RAW`, token, { method: 'POST', body: JSON.stringify({ values: [values] }) });
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
