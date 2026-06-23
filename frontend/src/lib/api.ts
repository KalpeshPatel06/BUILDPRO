import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('buildpro_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 — redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('buildpro_token');
      localStorage.removeItem('buildpro_user');
      if (window.location.pathname.startsWith('/admin')) {
        window.location.href = '/admin/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth
export const authAPI = {
  login: (data: { email: string; password: string }) => api.post('/auth/login', data),
  register: (data: any) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
  changePassword: (data: any) => api.put('/auth/change-password', data),
};

// Products
export const productsAPI = {
  getAll: () => api.get('/products'),
  getBySlug: (slug: string) => api.get(`/products/${slug}`),
  update: (id: number, data: any) => api.put(`/products/${id}`, data),
};

// Orders
export const ordersAPI = {
  create: (data: any) => api.post('/orders', data),
  getAll: (params?: any) => api.get('/orders', { params }),
  getById: (id: number) => api.get(`/orders/${id}`),
  updateStatus: (id: number, data: any) => api.patch(`/orders/${id}/status`, data),
};

// Appointments
export const appointmentsAPI = {
  create: (data: any) => api.post('/appointments', data),
  getAll: (params?: any) => api.get('/appointments', { params }),
  update: (id: number, data: any) => api.patch(`/appointments/${id}`, data),
};

// Inventory
export const inventoryAPI = {
  getAll: () => api.get('/inventory'),
  getAlerts: () => api.get('/inventory/alerts'),
  getForecast: () => api.get('/inventory/forecast'),
  updateStock: (productId: number, data: any) => api.patch(`/inventory/${productId}/stock`, data),
};

// Analytics
export const analyticsAPI = {
  getDashboard: () => api.get('/analytics/dashboard'),
  getRevenue: (params?: any) => api.get('/analytics/revenue', { params }),
  getProducts: () => api.get('/analytics/products'),
  getOrderBreakdown: () => api.get('/analytics/orders/breakdown'),
  getSalesByProduct: () => api.get('/analytics/sales-by-product'),
};

// Chatbot
export const chatbotAPI = {
  chat: (data: any) => api.post('/chatbot/chat', data),
  getKnowledge: () => api.get('/chatbot/knowledge'),
  addKnowledge: (data: any) => api.post('/chatbot/knowledge', data),
  updateKnowledge: (id: number, data: any) => api.put(`/chatbot/knowledge/${id}`, data),
  deleteKnowledge: (id: number) => api.delete(`/chatbot/knowledge/${id}`),
};

// Reports
export const reportsAPI = {
  downloadExcel: (params?: any) => api.get('/reports/excel', { params, responseType: 'blob' }),
};

// Notifications
export const notificationsAPI = {
  getAll: () => api.get('/notifications'),
  markRead: (id: number) => api.patch(`/notifications/${id}/read`),
};
