import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Response interceptor to normalize errors
api.interceptors.response.use(
  res => res,
  err => {
    const message = err.response?.data?.message || err.message || 'Something went wrong. Please try again.';
    const status = err.response?.status;

    if (status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('sn_token');
      localStorage.removeItem('sn_user');
      delete api.defaults.headers.common['Authorization'];
      window.dispatchEvent(new Event('staynear:auth-invalid'));
    }

    const normalizedError = new Error(message);
    normalizedError.status = status;
    return Promise.reject(normalizedError);
  }
);

// Let the browser set the multipart boundary for file uploads.
api.interceptors.request.use(config => {
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    delete config.headers['Content-Type'];
    delete config.headers['content-type'];
  }
  return config;
});

export default api;
