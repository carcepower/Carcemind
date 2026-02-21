
export const googleApi = {
  getApiKey() {
    return process.env.API_KEY || null;
  },

  async fetchWithAuth(url: string, token: string, options: RequestInit = {}) {
    if (!token) throw new Error("TOKEN_MISSING");
    const headers = new Headers(options.headers || {});
    headers.set('Authorization', `Bearer ${token}`);
    
    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
      if (response.status === 401) throw new Error("SESSION_EXPIRED");
      throw new Error(`Error ${response.status}`);
    }
    return response;
  },

  async listFolders(token: string) {
    const q = encodeURIComponent("mimeType = 'application/vnd.google-apps.folder' and trashed = false");
    const response = await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id, name)`, token);
    const data = await response.json();
    return data.files || [];
  }
};
