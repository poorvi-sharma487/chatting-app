import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, UserPlus, Sparkles } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

export default function RegisterPage() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const { register, isLoading } = useAuthStore();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await register(username, email, password);
            toast.success('Welcome to Snapnova! 🚀');
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 bg-snap-darker relative overflow-hidden">
            <div className="absolute top-[-20%] right-[-10%] w-96 h-96 bg-snap-blue/20 rounded-full blur-3xl" />
            <div className="absolute bottom-[-20%] left-[-10%] w-96 h-96 bg-snap-purple/20 rounded-full blur-3xl" />

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md relative z-10"
            >
                <div className="text-center mb-8">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', bounce: 0.5, delay: 0.2 }}
                        className="inline-flex items-center gap-2 mb-3"
                    >
                        <Sparkles className="text-snap-yellow" size={32} />
                        <h1 className="text-4xl font-extrabold gradient-text">Snapnova</h1>
                    </motion.div>
                    <p className="text-gray-400 text-sm">Join the future of social</p>
                </div>

                <div className="glass rounded-3xl p-8">
                    <h2 className="text-xl font-bold text-white mb-6">Create Account</h2>
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="text-sm font-medium text-gray-400 mb-1 block">Username</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="cooluser123"
                                required
                                minLength={3}
                                className="w-full px-4 py-3 rounded-xl bg-snap-darker border border-snap-border text-white placeholder-gray-500 focus:outline-none focus:border-snap-purple focus:ring-1 focus:ring-snap-purple/50 transition-all"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-400 mb-1 block">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@email.com"
                                required
                                className="w-full px-4 py-3 rounded-xl bg-snap-darker border border-snap-border text-white placeholder-gray-500 focus:outline-none focus:border-snap-purple focus:ring-1 focus:ring-snap-purple/50 transition-all"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-400 mb-1 block">Password</label>
                            <div className="relative">
                                <input
                                    type={showPw ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    minLength={6}
                                    className="w-full px-4 py-3 rounded-xl bg-snap-darker border border-snap-border text-white placeholder-gray-500 focus:outline-none focus:border-snap-purple focus:ring-1 focus:ring-snap-purple/50 transition-all pr-12"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPw(!showPw)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                                >
                                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3.5 rounded-xl font-bold text-white bg-gradient-snap shadow-glow hover:shadow-glow-pink transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <UserPlus size={18} />
                                    Create Account
                                </>
                            )}
                        </motion.button>
                    </form>
                    <p className="text-center text-gray-400 text-sm mt-6">
                        Already have an account?{' '}
                        <Link to="/login" className="text-snap-purple hover:text-snap-pink font-semibold transition-colors">
                            Sign In
                        </Link>
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
