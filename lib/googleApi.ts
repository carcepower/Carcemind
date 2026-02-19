
import { GoogleConfig, Memory, Task } from '../types';

export const googleApi = {
  getApiKey() {
    const env = (import.meta as any).env;
    const proc = (process as any).env;
    const key = env?.VITE_API_KEY || proc?.VITE_API_KEY || proc?.API_KEY;
    if (!key || key === 'undefined') return null;
    return key;
  },

  async fetchWithAuth(url: string, token: string, options: RequestInit = {}) {
    if (!token) throw new Error("TOKEN_MISSING: No hay un token de acceso válido.");
    const headers = new Headers(options.headers || {});
    headers.set('Authorization', `Bearer ${token}`);
    if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    let response = await fetch(url, { ...options, headers });
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      if (response.status === 401) throw new Error("SESSION_EXPIRED");
      throw new Error(`Error ${response.status}: ${errData.error?.message || "Error desconocido"}`);
    }
    return response;
  },

  async listFolders(token: string) {
    const query = encodeURIComponent("mimeType = 'application/vnd.google-apps.folder' and trashed = false");
    const response = await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id, name)`, token);
    const data = await response.json();
    return data.files || [];
  },

  async findFileInFolder(token: string, fileName: string, folderId: string) {
    const query = encodeURIComponent(`name = '${fileName}' and '${folderId}' in parents and trashed = false`);
    const response = await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id, name)`, token);
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

  async createSpreadsheet(token: string, name: string, folderId: string) {
    const response = await this.fetchWithAuth('https://sheets.googleapis.com/v4/spreadsheets', token, { method: 'POST', body: JSON.stringify({ properties: { title: name } }) });
    const ss = await response.json();
    const spreadsheetId = ss.spreadsheetId;
    await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files/${spreadsheetId}?addParents=${folderId}&removeParents=root`, token, { method: 'PATCH' });
    await this.fetchWithAuth(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, token, { method: 'POST', body: JSON.stringify({ requests: [{ addSheet: { properties: { title: 'ENTRADAS' } } }, { addSheet: { properties: { title: 'TAREAS' } } }, { deleteSheet: { sheetId: 0 } }] }) });
    await this.appendRow(spreadsheetId, 'ENTRADAS', ['ID_ENTRADA', 'FECHA_CREACION', 'TITULO', 'RESUMEN', 'ESTADO_EMOCIONAL', 'TAGS', 'DRIVE_FILE_ID', 'DRIVE_WEBVIEW_LINK', 'SNIPPETS', 'TRANSCRIPCION_COMPLETA'], token);
    await this.appendRow(spreadsheetId, 'TAREAS', ['ID_TAREA', 'FECHA_CREACION', 'DESCRIPCION', 'PRIORIDAD', 'ESTADO', 'ID_ENTRADA_ORIGEN', 'FECHA_LIMITE', 'FECHA_COMPLETADA'], token);
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
