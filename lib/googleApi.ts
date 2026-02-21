import { GoogleGenAI } from '@google/genai';

export const googleApi = {
  // Limpia bloques de Markdown JSON
  cleanJsonResponse(text: string) {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      return jsonMatch ? jsonMatch[0] : text;
    } catch (e) {
      return text;
    }
  },

  /**
   * Llamada segura a Gemini que garantiza que la API KEY se lee en caliente.
   */
  async safeAiCall(params: { 
    prompt: string, 
    systemInstruction?: string, 
    isAudio?: boolean, 
    audioBlob?: Blob, 
    usePro?: boolean 
  }) {
    // IMPORTANTE: Obtenemos la clave justo antes de usarla
    const apiKey = process.env.API_KEY;
    
    if (!apiKey) {
      throw new Error("API_KEY_MISSING");
    }

    // Instanciamos el cliente JIT (Just-In-Time)
    const ai = new GoogleGenAI({ apiKey });
    const modelName = params.usePro ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';

    try {
      let contents: any;
      
      if (params.isAudio && params.audioBlob) {
        const base64Audio = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(params.audioBlob!);
        });
        
        contents = { 
          parts: [
            { inlineData: { data: base64Audio, mimeType: params.audioBlob.type || 'audio/webm' } }, 
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
      console.error("Error en la llamada de IA:", error);
      throw error;
    }
  },

  // --- Métodos de Google Sheets (sin cambios, funcionan bien) ---
  async getRows(spreadsheetId: string, range: string, accessToken: string) {
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (response.status === 401) throw new Error("SESSION_EXPIRED");
    const data = await response.json();
    return data.values || [];
  },

  async appendRow(spreadsheetId: string, sheetName: string, values: any[], accessToken: string) {
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}:append?valueInputOption=USER_ENTERED`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [values] })
    });
    return await response.json();
  },

  async updateTaskStatusAndDate(spreadsheetId: string, taskId: string, status: string, date: string | null, accessToken: string) {
    const rows = await this.getRows(spreadsheetId, 'TAREAS!A:A', accessToken);
    const rowIndex = rows.findIndex((r: any) => String(r[0]) === taskId);
    if (rowIndex === -1) return;
    await this.updateCell(spreadsheetId, `TAREAS!E${rowIndex + 1}`, status, accessToken);
    await this.updateCell(spreadsheetId, `TAREAS!H${rowIndex + 1}`, date || "", accessToken);
  },

  async updateTaskDetail(spreadsheetId: string, taskId: string, title: string, accessToken: string) {
    const rows = await this.getRows(spreadsheetId, 'TAREAS!A:A', accessToken);
    const rowIndex = rows.findIndex((r: any) => String(r[0]) === taskId);
    if (rowIndex === -1) return;
    await this.updateCell(spreadsheetId, `TAREAS!C${rowIndex + 1}`, title, accessToken);
  },

  async updateCell(spreadsheetId: string, range: string, value: any, accessToken: string) {
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [[value]] })
    });
  },

  async deleteRowById(spreadsheetId: string, sheetName: string, id: string, accessToken: string) {
    const rows = await this.getRows(spreadsheetId, `${sheetName}!A:A`, accessToken);
    const rowIndex = rows.findIndex((r: any) => String(r[0]) === id);
    if (rowIndex === -1) return;
    const meta = await this.getSpreadsheetMetadata(spreadsheetId, accessToken);
    const sheet = meta.sheets.find((s: any) => s.properties.title === sheetName);
    if (!sheet) return;

    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          deleteDimension: {
            range: { sheetId: sheet.properties.sheetId, dimension: 'ROWS', startIndex: rowIndex, endIndex: rowIndex + 1 }
          }
        }]
      })
    });
  },

  async getSpreadsheetMetadata(spreadsheetId: string, accessToken: string) {
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    return await response.json();
  },

  async createSheetTabs(spreadsheetId: string, tabNames: string[], accessToken: string) {
    const requests = tabNames.map(name => ({ addSheet: { properties: { title: name } } }));
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests })
    });
  },

  async uploadFile(accessToken: string, blob: Blob, name: string, folderId: string) {
    const metadata = { name, parents: [folderId] };
    const formData = new FormData();
    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    formData.append('file', blob);
    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: formData
    });
    return await response.json();
  },

  async findFileInFolder(accessToken: string, fileName: string, folderId: string) {
    const q = encodeURIComponent(`name = '${fileName}' and '${folderId}' in parents and trashed = false`);
    const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id, name)`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const data = await response.json();
    return data.files && data.files.length > 0 ? data.files[0] : null;
  },

  async listFolders(accessToken: string) {
    const q = encodeURIComponent("mimeType = 'application/vnd.google-apps.folder' and trashed = false");
    const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id, name)`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const data = await response.json();
    return data.files || [];
  },

  async searchGmail(accessToken: string, query: string, maxResults: number = 5) {
    const q = encodeURIComponent(query);
    const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${q}&maxResults=${maxResults}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const data = await response.json();
    return data.messages || [];
  },

  async getGmailMessage(accessToken: string, messageId: string) {
    const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    return await response.json();
  }
};