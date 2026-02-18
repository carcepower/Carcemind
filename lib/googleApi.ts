
import { GoogleConfig, Memory, Task } from '../types';

export const googleApi = {
  async fetchWithAuth(url: string, token: string, options: RequestInit = {}) {
    if (!token) {
      throw new Error("TOKEN_MISSING: No hay un token de acceso válido.");
    }

    const headers = new Headers(options.headers || {});
    headers.set('Authorization', `Bearer ${token}`);
    
    if (options.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    let response;
    try {
      response = await fetch(url, { ...options, headers });
    } catch (e) {
      throw new Error("ERROR_RED: No se pudo contactar con los servidores de Google.");
    }
    
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const status = response.status;
      const detail = errData.error?.message || "Error desconocido";

      if (status === 401) {
        throw new Error("SESSION_EXPIRED: Tu sesión de Google ha caducado.");
      }
      
      throw new Error(`Error ${status}: ${detail}`);
    }
    
    return response;
  },

  // DRIVE & SHEETS
  async listFolders(token: string) {
    const query = encodeURIComponent("mimeType = 'application/vnd.google-apps.folder' and trashed = false");
    const response = await this.fetchWithAuth(
      `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id, name)&pageSize=100&spaces=drive`,
      token
    );
    const data = await response.json();
    return data.files || [];
  },

  async findFileInFolder(token: string, fileName: string, folderId: string) {
    const query = encodeURIComponent(`name = '${fileName}' and '${folderId}' in parents and trashed = false`);
    const response = await this.fetchWithAuth(
      `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id, name)`,
      token
    );
    const data = await response.json();
    return data.files && data.files.length > 0 ? data.files[0] : null;
  },

  async uploadFile(token: string, blob: Blob, fileName: string, folderId: string) {
    const metadata = { name: fileName, parents: [folderId] };
    const formData = new FormData();
    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    formData.append('file', blob);

    const response = await this.fetchWithAuth(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
      token,
      { method: 'POST', body: formData }
    );
    return await response.json();
  },

  async createSpreadsheet(token: string, name: string, folderId: string) {
    const response = await this.fetchWithAuth(
      'https://sheets.googleapis.com/v4/spreadsheets',
      token,
      {
        method: 'POST',
        body: JSON.stringify({ properties: { title: name } }),
      }
    );
    const ss = await response.json();
    const spreadsheetId = ss.spreadsheetId;

    await this.fetchWithAuth(
      `https://www.googleapis.com/drive/v3/files/${spreadsheetId}?addParents=${folderId}&removeParents=root`,
      token,
      { method: 'PATCH' }
    );

    await this.fetchWithAuth(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      token,
      {
        method: 'POST',
        body: JSON.stringify({
          requests: [
            { addSheet: { properties: { title: 'ENTRADAS' } } },
            { addSheet: { properties: { title: 'TAREAS' } } },
            { deleteSheet: { sheetId: 0 } },
          ],
        }),
      }
    );

    await this.appendRow(spreadsheetId, 'ENTRADAS', [
      'ID_ENTRADA', 'FECHA_CREACION', 'TITULO', 'RESUMEN', 'ESTADO_EMOCIONAL', 'TAGS', 'DRIVE_FILE_ID', 'DRIVE_WEBVIEW_LINK', 'SNIPPETS', 'TRANSCRIPCION_COMPLETA'
    ], token);
    await this.appendRow(spreadsheetId, 'TAREAS', [
      'ID_TAREA', 'FECHA_CREACION', 'DESCRIPCION', 'PRIORIDAD', 'ESTADO', 'ID_ENTRADA_ORIGEN', 'FECHA_LIMITE', 'FECHA_COMPLETADA'
    ], token);

    return spreadsheetId;
  },

  async appendRow(spreadsheetId: string, sheetName: string, values: any[], token: string) {
    await this.fetchWithAuth(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A1:append?valueInputOption=RAW`,
      token,
      {
        method: 'POST',
        body: JSON.stringify({ values: [values] }),
      }
    );
  },

  async getRows(spreadsheetId: string, sheetName: string, token: string) {
    const response = await this.fetchWithAuth(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A:Z`,
      token
    );
    const data = await response.json();
    return data.values || [];
  },

  async deleteRowById(spreadsheetId: string, sheetName: string, id: string, token: string) {
    const rows = await this.getRows(spreadsheetId, sheetName, token);
    const rowIndex = rows.findIndex(row => row[0] === id);
    if (rowIndex === -1) return;

    const ssMetadata = await this.fetchWithAuth(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, token);
    const ssData = await ssMetadata.json();
    const sheet = ssData.sheets.find((s: any) => s.properties.title === sheetName);
    const sheetId = sheet.properties.sheetId;

    await this.fetchWithAuth(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      token,
      {
        method: 'POST',
        body: JSON.stringify({
          requests: [{ deleteDimension: { range: { sheetId, dimension: 'ROWS', startIndex: rowIndex, endIndex: rowIndex + 1 } } }]
        }),
      }
    );
  },

  async updateTaskStatusAndDate(spreadsheetId: string, id: string, status: string, completionDate: string | null, token: string) {
    const rows = await this.getRows(spreadsheetId, 'TAREAS', token);
    const rowIndex = rows.findIndex(row => row[0] === id);
    if (rowIndex === -1) throw new Error(`Tarea con ID ${id} no encontrada.`);

    const rowNum = rowIndex + 1;
    await this.fetchWithAuth(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
      token,
      {
        method: 'POST',
        body: JSON.stringify({
          valueInputOption: 'RAW',
          data: [
            { range: `TAREAS!E${rowNum}`, values: [[status]] },
            { range: `TAREAS!H${rowNum}`, values: [[completionDate || '']] }
          ]
        })
      }
    );
  },

  // GMAIL API
  async searchGmail(token: string, query: string, maxResults: number = 5) {
    const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`;
    const response = await this.fetchWithAuth(url, token);
    const data = await response.json();
    return data.messages || [];
  },

  async getGmailMessage(token: string, id: string) {
    const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`;
    const response = await this.fetchWithAuth(url, token);
    return await response.json();
  }
};
