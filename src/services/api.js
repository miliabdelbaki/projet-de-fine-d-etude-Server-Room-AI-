import axios from 'axios';
// Default to the backend port used by the server (match backend default port 4000)
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';
// Ensure we target the server route prefix `/api` used by the backend without duplicating it
const API_ROOT = API_BASE_URL.replace(/\/$/, '');
const BASE = API_ROOT.endsWith('/api') ? API_ROOT : `${API_ROOT}/api`;
const api = axios.create({ baseURL: BASE, headers: { 'Content-Type': 'application/json' } });
// Helpful debug log when running in development
if (process.env.NODE_ENV !== 'production') {
	console.debug('API base URL:', BASE);
}
api.interceptors.request.use((config) => { const token = localStorage.getItem('token'); if (token) config.headers.Authorization = `Bearer ${token}`; return config; }, (error) => Promise.reject(error));

export const authAPI = { login: async (email, password) => { const response = await api.post('/auth/login', { email, password }); if (response.data.token) { localStorage.setItem('token', response.data.token); localStorage.setItem('user', JSON.stringify(response.data.user)); } return response.data; }, logout: () => { localStorage.removeItem('token'); localStorage.removeItem('user'); }, getCurrentUser: () => { const userStr = localStorage.getItem('user'); return userStr ? JSON.parse(userStr) : null; } };

// Global response handler for auth issues
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401 || status === 403) {
      // Clear stored auth and force login if token invalid/expired
      authAPI.logout();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
export const usersAPI = { getAll: async () => { const response = await api.get('/admin/users'); return response.data.map(user => ({ ...user, id: user._id, full_name: user.displayName, status: user.approved ? 'active' : 'pending' })); }, getPending: async () => { const response = await api.get('/admin/users'); return response.data.filter(user => user.approved === false).map(user => ({ ...user, id: user._id, full_name: user.displayName, status: 'pending' })); }, approve: async (id, approved = true) => { const response = await api.put(`/admin/users/${id}/approve`, { approved }); return response.data; }, delete: async (id) => { const response = await api.delete(`/admin/users/${id}`); return response.data; } };
export const roomsAPI = { getAll: async () => { const response = await api.get('/rooms'); return response.data.map(room => ({ ...room, id: room._id })); }, create: async (roomData) => { const response = await api.post('/rooms', roomData); return response.data; }, update: async (id, roomData) => { const response = await api.put(`/rooms/${id}`, roomData); return response.data; }, delete: async (id) => { const response = await api.delete(`/rooms/${id}`); return response.data; } };
export const checklistsAPI = { getAll: async () => { const response = await api.get('/checklists'); return response.data.map(c => ({ ...c, id: c._id })); }, create: async (data) => { const response = await api.post('/checklists', data); return response.data; }, delete: async (id) => { const response = await api.delete(`/checklists/${id}`); return response.data; } };
export const verificationsAPI = {
	getAll: async () => {
		const response = await api.get('/verifications');
		const data = response.data;
		if (!Array.isArray(data)) {
			console.warn('verificationsAPI.getAll: unexpected response', data);
			return [];
		}
		return data.map(v => ({ ...v, id: v._id }));
	}
,
	getByRoom: async (roomId) => {
		const response = await api.get(`/verifications/rooms/${roomId}/verifications`);
		const data = response.data;
		if (!Array.isArray(data)) {
			console.warn('verificationsAPI.getByRoom: unexpected response', data);
			return [];
		}
		return data.map(v => ({ ...v, id: v._id }));
	},
	startForRoom: async (roomId) => {
		const response = await api.post(`/rooms/${roomId}/start-verification`);
		return response.data;
	},
	complete: async (verificationId) => {
		const response = await api.put(`/verifications/${verificationId}/submit`);
		return response.data;
	}
};
export default api;
