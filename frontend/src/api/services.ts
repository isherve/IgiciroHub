import { api } from './api';
import {
  AnalyticsOverview,
  CoffeePrice,
  Conversation,
  Cooperative,
  CropListing,
  Message,
  Notification,
  Paginated,
  PredictionResult,
  PriceAlert,
  TrendingPrice,
} from './types';

// ---- Auth ----------------------------------------------------------------
export const AuthApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login/', { email, password }).then((r) => r.data),
  register: (payload: Record<string, unknown>) =>
    api.post('/auth/register/', payload).then((r) => r.data),
  me: () => api.get('/auth/me/').then((r) => r.data),
  updateMe: (payload: Record<string, unknown>) =>
    api.patch('/auth/me/', payload).then((r) => r.data),
  logout: (refresh: string) => api.post('/auth/logout/', { refresh }),
  requestReset: (email: string) => api.post('/auth/password-reset/', { email }),
};

// ---- Prices --------------------------------------------------------------
export const PricesApi = {
  trending: () => api.get<TrendingPrice[]>('/prices/trending/').then((r) => r.data),
  history: (params: { coffee_type: string; price_type: string; months?: number }) =>
    api.get<CoffeePrice[]>('/prices/history/', { params }).then((r) => r.data),
  list: (params?: Record<string, unknown>) =>
    api.get<Paginated<CoffeePrice>>('/prices/', { params }).then((r) => r.data),
  seasonal: (params: { coffee_type: string; price_type: string }) =>
    api.get('/prices/seasonal/', { params }).then((r) => r.data),
};

// ---- Predictions ---------------------------------------------------------
export const PredictApi = {
  predict: (payload: {
    coffee_type: string;
    price_type: string;
    historical_period: number;
    prediction_horizon: number;
  }) => api.post<PredictionResult>('/predictions/predict/', payload).then((r) => r.data),
  history: () =>
    api.get<Paginated<PredictionResult>>('/predictions/history/').then((r) => r.data),
  featureImportance: () => api.get('/predictions/feature-importance/').then((r) => r.data),
};

// ---- Crops / Marketplace -------------------------------------------------
export const CropsApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<Paginated<CropListing>>('/crops/', { params }).then((r) => r.data),
  get: (id: number) => api.get<CropListing>(`/crops/${id}/`).then((r) => r.data),
  create: (payload: Record<string, unknown>) =>
    api.post<CropListing>('/crops/', payload).then((r) => r.data),
  update: (id: number, payload: Record<string, unknown>) =>
    api.patch<CropListing>(`/crops/${id}/`, payload).then((r) => r.data),
  remove: (id: number) => api.delete(`/crops/${id}/`),
};

// ---- Cooperatives --------------------------------------------------------
export const CoopApi = {
  list: (params?: Record<string, unknown>) =>
    api.get('/cooperatives/', { params }).then((r) => r.data),
  me: () => api.get<Cooperative>('/cooperatives/me/').then((r) => r.data),
  updateMe: (payload: Record<string, unknown>) =>
    api.patch<Cooperative>('/cooperatives/me/', payload).then((r) => r.data),
};

// ---- Chat ----------------------------------------------------------------
export const ChatApi = {
  conversations: () =>
    api.get<Paginated<Conversation>>('/chat/conversations/').then((r) => r.data),
  messages: (id: number) =>
    api.get<Message[]>(`/chat/conversations/${id}/messages/`).then((r) => r.data),
  send: (id: number, message: string) =>
    api.post<Message>(`/chat/conversations/${id}/send/`, { message }).then((r) => r.data),
  start: (cooperative: number, message: string) =>
    api.post<Conversation>('/chat/conversations/', { cooperative, message }).then((r) => r.data),
  unreadCount: () =>
    api.get<{ unread: number }>('/chat/conversations/unread-count/').then((r) => r.data),
};

// ---- Alerts + Notifications ---------------------------------------------
export const AlertsApi = {
  list: () => api.get<Paginated<PriceAlert>>('/alerts/subscriptions/').then((r) => r.data),
  create: (payload: Record<string, unknown>) =>
    api.post<PriceAlert>('/alerts/subscriptions/', payload).then((r) => r.data),
  update: (id: number, payload: Record<string, unknown>) =>
    api.patch<PriceAlert>(`/alerts/subscriptions/${id}/`, payload).then((r) => r.data),
  remove: (id: number) => api.delete(`/alerts/subscriptions/${id}/`),
  notifications: () =>
    api.get<Paginated<Notification>>('/alerts/notifications/').then((r) => r.data),
  markAllRead: () => api.post('/alerts/notifications/mark-all-read/'),
  unreadCount: () =>
    api.get<{ unread: number }>('/alerts/notifications/unread-count/').then((r) => r.data),
};

// ---- Analytics -----------------------------------------------------------
export const AnalyticsApi = {
  overview: () => api.get<AnalyticsOverview>('/analytics/overview/').then((r) => r.data),
};

// ---- Assistant -----------------------------------------------------------
export const AssistantApi = {
  chat: (message: string, locale?: string) =>
    api
      .post<{ reply: string; source: string }>('/assistant/chat/', { message, locale })
      .then((r) => r.data),
  status: () =>
    api
      .get<{ configured: boolean; available: boolean; mode: string; message?: string; model?: string }>(
        '/assistant/status/',
      )
      .then((r) => r.data),
};

export const COFFEE_TYPES = [
  { value: 'red_bourbon', label: 'Red Bourbon' },
  { value: 'arabica', label: 'Arabica' },
  { value: 'bourbon_mayaguez', label: 'Bourbon Mayaguez' },
  { value: 'jackson', label: 'Jackson' },
  { value: 'robusta', label: 'Robusta' },
];

export const PRICE_TYPES = [
  { value: 'farmgate', label: 'Farm Gate' },
  { value: 'cooperative', label: 'Cooperative' },
  { value: 'export', label: 'Export (USD)' },
];

export const COFFEE_GRADES = [
  { value: 'AA', label: 'Grade AA' },
  { value: 'A', label: 'Grade A' },
  { value: 'B', label: 'Grade B' },
  { value: 'C', label: 'Grade C' },
];
