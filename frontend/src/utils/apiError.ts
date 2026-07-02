interface ApiErrorData {
  error?: string;
  message?: string;
  details?: string;
}

interface ApiError {
  response?: {
    data?: ApiErrorData;
    status?: number;
  };
}

export function getApiError(err: unknown, fallback = 'Une erreur est survenue'): string {
  const data = (err as ApiError)?.response?.data;
  return data?.error || data?.message || data?.details || fallback;
}
