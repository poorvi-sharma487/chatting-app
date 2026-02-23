import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Camera, LogOut, Edit3, Check, X } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function ProfilePage() {
    const { user, logout, updateUser } = useAuthStore();
    const { darkMode } = useUIStore();
    const [editing, setEditing] = useState(false);
    const [bio, setBio] = useState(user?.bio || '');
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        const reader = new FileReader();
        reader.onloadend = async () => {
            try {
                const { data } = await api.put('/users/profile', { avatar: reader.result });
                updateUser({ avatar: data.user.avatar });
                toast.success('Avatar updated!');
            } catch {
                toast.error('Upload failed');
            }
            setUploading(false);
        };
        reader.readAsDataURL(file);
    };

    const saveBio = async () => {
        try {
            const { data } = await api.put('/users/profile', { bio });
            updateUser({ bio: data.user.bio });
            setEditing(false);
            toast.success('Bio updated!');
        } catch {
            toast.error('Update failed');
        }
    };

    return (
        <div className="p-4">
            {/* Profile Header */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-3xl p-6 text-center ${darkMode ? 'glass' : 'glass-light'}`}
            >
                {/* Avatar */}
                <div className="relative inline-block mb-4">
                    <div className="w-24 h-24 rounded-full bg-gradient-snap p-0.5">
                        <div className={`w-full h-full rounded-full overflow-hidden ${darkMode ? 'bg-snap-darker' : 'bg-white'} flex items-center justify-center`}>
                            {user?.avatar ? (
                                <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-3xl font-bold gradient-text">
                                    {user?.username?.[0]?.toUpperCase()}
                                </span>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute bottom-0 right-0 p-2 rounded-full bg-snap-purple text-white shadow-glow"
                    >
                        {uploading ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Camera size={14} />
                        )}
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="hidden"
                    />
                </div>

                <h2 className="text-xl font-bold">{user?.username}</h2>
                <p className="text-sm text-gray-400 mb-3">{user?.email}</p>

                {/* Bio */}
                {editing ? (
                    <div className="flex items-center gap-2 mt-2">
                        <input
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            maxLength={150}
                            className={`flex-1 px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-snap-purple/50 ${darkMode ? 'bg-snap-darker border border-snap-border text-white' : 'bg-gray-100 border border-gray-200'
                                }`}
                            placeholder="Write your bio..."
                        />
                        <button onClick={saveBio} className="p-2 rounded-lg bg-green-500 text-white">
                            <Check size={16} />
                        </button>
                        <button onClick={() => setEditing(false)} className="p-2 rounded-lg bg-red-500 text-white">
                            <X size={16} />
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => setEditing(true)}
                        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-snap-purple mt-2 transition-colors"
                    >
                        <Edit3 size={14} />
                        {user?.bio || 'Add a bio...'}
                    </button>
                )}
            </motion.div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mt-4">
                {[
                    { label: 'Friends', value: user?.friends?.length || 0 },
                    { label: 'Snaps', value: '—' },
                    { label: 'Stories', value: '—' },
                ].map((stat) => (
                    <motion.div
                        key={stat.label}
                        whileHover={{ scale: 1.03 }}
                        className={`rounded-2xl p-4 text-center ${darkMode ? 'bg-snap-card border border-snap-border' : 'bg-white border border-gray-100 shadow-sm'}`}
                    >
                        <p className="text-2xl font-bold gradient-text">{stat.value}</p>
                        <p className="text-xs text-gray-400 mt-1">{stat.label}</p>
                    </motion.div>
                ))}
            </div>

            {/* Logout */}
            <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                    logout();
                    toast.success('See you later! 👋');
                }}
                className="w-full mt-6 py-3.5 rounded-2xl font-semibold text-red-400 border border-red-400/30 hover:bg-red-400/10 transition-all flex items-center justify-center gap-2"
            >
                <LogOut size={18} />
                Sign Out
            </motion.button>
        </div>
    );
}
