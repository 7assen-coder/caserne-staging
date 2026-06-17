import axios from 'axios';
import { getAccessToken } from '../utils/authStorage';
import { formatApiError } from '../utils/apiErrors';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    error.userMessage = formatApiError(error);
    return Promise.reject(error);
  },
);
