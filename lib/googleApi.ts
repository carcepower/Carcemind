
import { GoogleConfig, Memory, Task } from '../types';

/**
 * Helper to interact with Google APIs using the access token.
 */
export const googleApi = {
  async fetchWithAuth(url: string, token: string, options: RequestInit = {}) {
    if (!token) {
      throw new Error("TOKEN_MISSING: No hay un token de acceso válido.");
    }

    const headers = new Headers(options.headers || {});
    headers.set('Authorization', `Bearer ${token}`);
    
    let response;
    try {
      response = await fetch(url, { ...options, headers });
    } catch (e) {
      throw new Error("ERROR_RED: No se pudo contactar con los servidores de Google. Revisa tu conexión.");
    }
    
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const status = response.status;
      const detail = errData.error?.message || "Error desconocido";

      if (status === 401) {
        throw new Error("SESSION_EXPIRED: Tu sesión de Google ha caducado. Por favor, ve a Ajustes y vuelve a Conectar.");
      }
      
      if (status === 403) {
        throw new Error(`PERMISO_DENEGADO: No tienes permiso para esta acción. Asegúrate de marcar todas las casillas (Drive y Sheets) al conectar tu cuenta.`);
      }
      
      throw new Error(`Error ${status}: ${detail}`);
    }
    
    return response;
  },

  async listFolders(token: string) {
    const query = encodeURIComponent("mimeType = 'application/vnd.google-apps.folder' and trashed = false");
    const response = await this.fetchWithAuth(
      `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id, name)&pageSize=100&spaces=drive`,
      token
    );
    const data = await response.json();
    return data.files || [];
  },

  async createFolder(token: string, name: string, parentId?: string) {
    const body: any = {
      name,
      mimeType: 'application/vnd.google-apps.folder',
    };
    if (parentId) body.parents = [parentId];

    const response = await this.fetchWithAuth(
      'https://www.googleapis.com/drive/v3/files',
      token,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );
    return await response.json();
  },

  async uploadFile(token: string, blob: Blob, fileName: string, folderId: string) {
    const metadata = {
      name: fileName,
      parents: [folderId],
    };

    const formData = new FormData();
    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    formData.append('file', blob);

    const response = await this.fetchWithAuth(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
      token,
      {
        method: 'POST',
        body: formData,
      }
    );
    return await response.json();
  },

  async createSpreadsheet(token: string, name: string, folderId: string) {
    const response = await this.fetchWithAuth(
      'https://sheets.googleapis.com/v4/spreadsheets',
      token,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
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
      'ID_ENTRADA', 'FECHA_CREACION', 'TITULO', 'RESUMEN', 'ESTADO_EMOCIONAL', 'TAGS', 'DRIVE_FILE_ID', 'DRIVE_WEBVIEW_LINK', 'SNIPPETS'
    ], token);
    await this.appendRow(spreadsheetId, 'TAREAS', [
      'ID_TAREA', 'FECHA_CREACION', 'DESCRIPCION', 'PRIORIDAD', 'ESTADO', 'ID_ENTRADA_ORIGEN', 'FECHA_LIMITE'
    ], token);

    return spreadsheetId;
  },

  async appendRow(spreadsheetId: string, sheetName: string, values: any[], token: string) {
    await this.fetchWithAuth(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A1:append?valueInputOption=RAW`,
      token,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  async updateTaskStatus(spreadsheetId: string, rowNumber: number, status: string, token: string) {
    await this.fetchWithAuth(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/TAREAS!E${rowNumber}?valueInputOption=RAW`,
      token,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: [[status]] }),
      }
    );
  }
};
