// API Client for Backend Communication
const API_BASE = window.location.hostname === 'localhost' 
    ? 'http://localhost:5000/api' 
    : 'http://backend:5000/api';

class APIClient {
    constructor() {
        this.baseURL = API_BASE;
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        
        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Request failed');
            }

            return await response.json();
        } catch (error) {
            console.error(`API Error [${endpoint}]:`, error);
            throw error;
        }
    }

    // ===== Guests =====
    async getGuests(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/guests?${query}`);
    }

    async getGuest(id) {
        return this.request(`/guests/${id}`);
    }

    async createGuest(data) {
        return this.request('/guests', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async updateGuest(id, data) {
        return this.request(`/guests/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async deleteGuest(id) {
        return this.request(`/guests/${id}`, {
            method: 'DELETE'
        });
    }

    async importGuests(file) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${this.baseURL}/guests/import`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Import failed');
        }

        return await response.json();
    }

    async exportGuests() {
        const response = await fetch(`${this.baseURL}/guests/export`);
        const blob = await response.blob();
        return blob;
    }

    // ===== Templates =====
    async getTemplates() {
        return this.request('/templates');
    }

    async getTemplate(id) {
        return this.request(`/templates/${id}`);
    }

    async createTemplate(data) {
        return this.request('/templates', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async updateTemplate(id, data) {
        return this.request(`/templates/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async deleteTemplate(id) {
        return this.request(`/templates/${id}`, {
            method: 'DELETE'
        });
    }

    // ===== Groups =====
    async getGroups() {
        return this.request('/groups');
    }

    async createGroup(data) {
        return this.request('/groups', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async updateGroup(id, data) {
        return this.request(`/groups/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async deleteGroup(id) {
        return this.request(`/groups/${id}`, {
            method: 'DELETE'
        });
    }

    // ===== Sending =====
    async sendDirect(data) {
        return this.request('/send/direct', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async scheduleSend(data) {
        return this.request('/send/schedule', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async getScheduledSends() {
        return this.request('/send/scheduled');
    }

    async cancelScheduledSend(id) {
        return this.request(`/send/scheduled/${id}`, {
            method: 'DELETE'
        });
    }

    // ===== Images =====
    async uploadImage(file) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${this.baseURL}/images/upload`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Upload failed');
        }

        return await response.json();
    }

    // ===== Settings =====
    async getSettings() {
        return this.request('/settings');
    }

    async updateSettings(data) {
        return this.request('/settings', {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    // ===== Utility =====
    async testConnection() {
        return this.request('/test-connection');
    }

    async getStats() {
        return this.request('/stats');
    }
}

// Create global API instance
const api = new APIClient();
