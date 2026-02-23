import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';
import axios from 'axios';

interface User {
    _id: string;
    username: string;
    email: string;
    avatar: string;
    bio: string;
    friends: any[];
    friendRequests: any[];
    isOnline: boolean;
}

interface AuthState {
    user: User | null;
    accessToken: string;
    refreshToken: string;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (username: string, email: string, password: string) => Promise<void>;
    logout: () => void;
    setTokens: (accessToken: string, refreshToken: string) => void;
    fetchMe: () => Promise<void>;
    updateUser: (data: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            accessToken: '',
            refreshToken: '',
            isAuthenticated: false,
            isLoading: false,

            login: async (email, password) => {
                set({ isLoading: true });
                try {
                    const { data } = await api.post('/auth/login', { email, password });
                    set({
                        user: data.user,
                        accessToken: data.accessToken,
                        refreshToken: data.refreshToken,
                        isAuthenticated: true,
                        isLoading: false,
                    });
                } catch (error: any) {
                    set({ isLoading: false });
                    throw new Error(error.response?.data?.message || 'Login failed');
                }
            },

            register: async (username, email, password) => {
                set({ isLoading: true });
                try {
                    const { data } = await api.post('/auth/register', { username, email, password });
                    set({
                        user: data.user,
                        accessToken: data.accessToken,
                        refreshToken: data.refreshToken,
                        isAuthenticated: true,
                        isLoading: false,
                    });
                } catch (error: any) {
                    set({ isLoading: false });
                    throw new Error(error.response?.data?.message || 'Registration failed');
                }
            },

            logout: () => {
                // Capture token before clearing state
                const token = get().accessToken;

                // Clear state immediately so UI redirects to login
                set({
                    user: null,
                    accessToken: '',
                    refreshToken: '',
                    isAuthenticated: false,
                });

                // Best-effort server-side cleanup using plain axios (not the interceptor-wrapped api)
                // This avoids triggering the response interceptor cycle
                if (token) {
                    axios.post('/api/auth/logout', {}, {
                        headers: { Authorization: `Bearer ${token}` },
                        withCredentials: true,
                    }).catch(() => {
                        // Ignore errors — token may already be expired
                    });
                }
            },

            setTokens: (accessToken, refreshToken) => {
                set({ accessToken, refreshToken });
            },

            fetchMe: async () => {
                try {
                    const { data } = await api.get('/auth/me');
                    set({ user: data.user, isAuthenticated: true });
                } catch {
                    // Token invalid or expired — clear everything
                    set({
                        user: null,
                        isAuthenticated: false,
                        accessToken: '',
                        refreshToken: '',
                    });
                }
            },

            updateUser: (data) => {
                const current = get().user;
                if (current) {
                    set({ user: { ...current, ...data } });
                }
            },
        }),
        {
            name: 'snapnova-auth',
            partialize: (state) => ({
                accessToken: state.accessToken,
                refreshToken: state.refreshToken,
                user: state.user,
                isAuthenticated: state.isAuthenticated,
            }),
        }
    )
);
