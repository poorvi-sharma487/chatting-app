import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useUIStore } from './store/uiStore';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ChatPage from './pages/ChatPage';
import CameraPage from './pages/CameraPage';
import StoriesPage from './pages/StoriesPage';
import ProfilePage from './pages/ProfilePage';
import FriendsPage from './pages/FriendsPage';
import MainLayout from './layouts/MainLayout';
import { connectSocket, disconnectSocket } from './services/socket';

function App() {
    const { isAuthenticated, user, accessToken } = useAuthStore();
    const { darkMode } = useUIStore();

    // On app load, validate the existing token by calling /auth/me
    useEffect(() => {
        if (isAuthenticated && accessToken) {
            useAuthStore.getState().fetchMe();
        } else if (!isAuthenticated) {
            // Ensure stale tokens are cleared if not authenticated
            const state = useAuthStore.getState();
            if (state.accessToken || state.refreshToken) {
                state.logout();
            }
        }
    }, []); // Run once on mount

    // Connect socket when authenticated
    useEffect(() => {
        if (isAuthenticated && user?._id) {
            connectSocket(user._id);
        }
        return () => {
            disconnectSocket();
        };
    }, [isAuthenticated, user?._id]);

    return (
        <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-snap-darker text-white' : 'bg-gray-50 text-gray-900'}`}>
            <Toaster
                position="top-center"
                toastOptions={{
                    style: {
                        background: darkMode ? '#1A1A2E' : '#fff',
                        color: darkMode ? '#fff' : '#1A1A2E',
                        border: `1px solid ${darkMode ? 'rgba(168,85,247,0.3)' : 'rgba(0,0,0,0.1)'}`,
                        borderRadius: '16px',
                    },
                }}
            />
            <Routes>
                <Route path="/login" element={!isAuthenticated ? <LoginPage /> : <Navigate to="/" />} />
                <Route path="/register" element={!isAuthenticated ? <RegisterPage /> : <Navigate to="/" />} />
                <Route path="/" element={isAuthenticated ? <MainLayout /> : <Navigate to="/login" />}>
                    <Route index element={<ChatPage />} />
                    <Route path="camera" element={<CameraPage />} />
                    <Route path="stories" element={<StoriesPage />} />
                    <Route path="profile" element={<ProfilePage />} />
                    <Route path="friends" element={<FriendsPage />} />
                </Route>
            </Routes>
        </div>
    );
}

export default App;
