import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://cfdrocket.onrender.com';

const api = axios.create({ baseURL: API_URL });

export function setAuthToken(token) {
  if (token) api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  else delete api.defaults.headers.common['Authorization'];
}

export default api;
