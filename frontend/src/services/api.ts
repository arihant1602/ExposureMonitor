import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface CheckExposureResponse {
  email: string;
  is_exposed: boolean;
  breaches: string[];
  risk_score: number;
}

export const checkHealth = async () => {
  const response = await apiClient.get('/health');
  return response.data;
};

export const checkExposure = async (email: string): Promise<CheckExposureResponse> => {
  const response = await apiClient.post<CheckExposureResponse>('/check', { email });
  return response.data;
};
