import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const api = axios.create({
    baseURL: '/api',
    withCredentials: true,
});

// Request interceptor — attach access token
api.interceptors.request.use((config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Queue to hold requests while refreshing token
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

// Response interceptor — refresh token on 401
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Bail out immediately for auth endpoints to avoid infinite loops
        if (
            originalRequest.url?.includes('/auth/refresh') ||
            originalRequest.url?.includes('/auth/login') ||
            originalRequest.url?.includes('/auth/register') ||
            originalRequest.url?.includes('/auth/logout')
        ) {
            return Promise.reject(error);
        }

        // Handle 401 — attempt token refresh (only once per request)
        if (error.response?.status === 401 && !originalRequest._retry) {
            // If already refreshing, queue this request
            if (isRefreshing) {
                return new Promise(function (resolve, reject) {
                    failedQueue.push({ resolve, reject });
                })
                    .then((token) => {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        return api(originalRequest);
                    })
                    .catch((err) => {
                        return Promise.reject(err);
                    });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const refreshToken = useAuthStore.getState().refreshToken;

                // No refresh token available — logout immediately
                if (!refreshToken) {
                    useAuthStore.getState().logout();
                    processQueue(new Error('No refresh token'), null);
                    return Promise.reject(new Error('No refresh token available'));
                }

                // Call refresh endpoint directly using plain axios (not interceptor-wrapped api)
                const { data } = await axios.post('/api/auth/refresh', { refreshToken });

                useAuthStore.getState().setTokens(data.accessToken, data.refreshToken);

                processQueue(null, data.accessToken);
                originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
                return api(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError, null);
                // Refresh failed (403 or network error) — logout safely
                useAuthStore.getState().logout();
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        // Handle 403 — token is forbidden, logout
        if (error.response?.status === 403) {
            useAuthStore.getState().logout();
        }

        return Promise.reject(error);
    }
);

export default api;
