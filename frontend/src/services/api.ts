import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface Breach {
  id: number;
  name: string;
  domain: string;
  breach_date: string;
  added_date: string;
  description: string;
  compromised_data: string[];
  domains: string[];
}

export interface CheckExposureResponse {
  email: string;
  is_exposed: boolean;
  breaches: Breach[];
  risk_score: number;
  recommendations: string[];
}

export interface DomainCheckResponse {
  domain: string;
  exposed_emails: {
    email: string;
    breaches: string[];
  }[];
}

export interface PasswordSuffixResponse {
  suffix: string;
  count: number;
}

export interface PasswordCheckResponse {
  prefix: string;
  suffixes: PasswordSuffixResponse[];
}

export const checkHealth = async () => {
  const response = await apiClient.get('/health');
  return response.data;
};

export const checkExposure = async (email: string): Promise<CheckExposureResponse> => {
  const response = await apiClient.post<CheckExposureResponse>('/check', { email });
  return response.data;
};

export const checkDomain = async (domain: string): Promise<DomainCheckResponse> => {
  const response = await apiClient.post<DomainCheckResponse>('/check/domain', { domain });
  return response.data;
};

export const checkPassword = async (hashPrefix: string): Promise<PasswordCheckResponse> => {
  const response = await apiClient.get<PasswordCheckResponse>(`/check/password/${hashPrefix}`);
  return response.data;
};

export const getBreaches = async (): Promise<Breach[]> => {
  const response = await apiClient.get<Breach[]>('/breaches');
  return response.data;
};

export const getBreachSamples = async (id: number): Promise<string[]> => {
  const response = await apiClient.get<string[]>(`/breaches/${id}/samples`);
  return response.data;
};

export interface GlobalStats {
  total_breaches: number;
  total_exposures: number;
  unique_emails: number;
}

export const getStats = async (): Promise<GlobalStats> => {
  const response = await apiClient.get<GlobalStats>('/stats');
  return response.data;
};
