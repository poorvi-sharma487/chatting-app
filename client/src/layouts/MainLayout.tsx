import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MessageCircle, Camera, CircleDot, User, Users, Sun, Moon } from 'lucide-react';
import { useUIStore } from '../store/uiStore';

const navItems = [
    { icon: MessageCircle, label: 'Chat', path: '/' },
    { icon: Users, label: 'Friends', path: '/friends' },
    { icon: Camera, label: 'Camera', path: '/camera' },
    { icon: CircleDot, label: 'Stories', path: '/stories' },
    { icon: User, label: 'Profile', path: '/profile' },
];

export default function MainLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const { darkMode, toggleDarkMode } = useUIStore();

    return (
        <div className="flex flex-col h-screen max-w-lg mx-auto relative">
            {/* Header */}
            <header className={`flex items-center justify-between px-5 py-3 border-b ${darkMode ? 'border-snap-border bg-snap-darker/80' : 'border-snap-borderLight bg-white/80'
                } backdrop-blur-md sticky top-0 z-50`}>
                <h1 className="text-2xl font-extrabold gradient-text tracking-tight">Snapnova</h1>
                <button
                    onClick={toggleDarkMode}
                    className={`p-2 rounded-xl transition-all duration-300 ${darkMode
                            ? 'bg-snap-card hover:bg-snap-purple/20 text-snap-yellow'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        }`}
                >
                    {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                </button>
            </header>

            {/* Content */}
            <main className="flex-1 overflow-y-auto">
                <motion.div
                    key={location.pathname}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="h-full"
                >
                    <Outlet />
                </motion.div>
            </main>

            {/* Bottom Navigation */}
            <nav className={`flex items-center justify-around px-2 py-2 border-t ${darkMode ? 'border-snap-border bg-snap-darker/90' : 'border-snap-borderLight bg-white/90'
                } backdrop-blur-md sticky bottom-0 z-50`}>
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    const Icon = item.icon;
                    return (
                        <button
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            className={`relative flex flex-col items-center py-1.5 px-3 rounded-xl transition-all duration-300 ${isActive
                                    ? 'text-snap-purple'
                                    : darkMode
                                        ? 'text-gray-500 hover:text-gray-300'
                                        : 'text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="activeTab"
                                    className="absolute inset-0 bg-snap-purple/10 rounded-xl"
                                    transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                                />
                            )}
                            <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                            <span className="text-[10px] mt-0.5 font-medium">{item.label}</span>
                        </button>
                    );
                })}
            </nav>
        </div>
    );
}
