import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, UserPlus, UserCheck, UserX, Users, X, Clock, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import api from '../services/api';
import toast from 'react-hot-toast';

interface UserResult {
    _id: string;
    username: string;
    avatar: string;
    bio: string;
    isOnline: boolean;
}

interface ContactRequest {
    _id: string;
    user: UserResult;
    status: string;
    createdAt: string;
}

export default function FriendsPage() {
    const { user } = useAuthStore();
    const { darkMode } = useUIStore();
    const [tab, setTab] = useState<'friends' | 'requests' | 'search'>('friends');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<UserResult[]>([]);
    const [suggested, setSuggested] = useState<UserResult[]>([]);
    const [friends, setFriends] = useState<any[]>([]);
    const [incomingRequests, setIncomingRequests] = useState<ContactRequest[]>([]);
    const [sentRequests, setSentRequests] = useState<ContactRequest[]>([]);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

    // IDs of users we've already sent requests to (for search UI)
    const sentUserIds = new Set(sentRequests.map((r) => r.user._id));
    const friendIds = new Set(friends.map((f: any) => f._id));

    // Fetch friends list
    useEffect(() => {
        const fetchData = async () => {
            try {
                const { data } = await api.get('/users/profile');
                setFriends(data.user?.friends || []);
            } catch {
                setFriends([]);
            }
        };
        fetchData();
    }, []);

    // Fetch contact requests
    const fetchRequests = useCallback(async () => {
        try {
            const { data } = await api.get('/contacts/requests');
            setIncomingRequests(data.incoming || []);
            setSentRequests(data.sent || []);
        } catch {
            setIncomingRequests([]);
            setSentRequests([]);
        }
    }, []);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    // Fetch suggested
    useEffect(() => {
        const fetchSuggested = async () => {
            try {
                const { data } = await api.get('/users/suggested');
                setSuggested(data.users || []);
            } catch {
                setSuggested([]);
            }
        };
        fetchSuggested();
    }, []);

    // Debounced search
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }
        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const { data } = await api.get(`/users/search?q=${encodeURIComponent(searchQuery)}`);
                setSearchResults(data.users || []);
            } catch {
                setSearchResults([]);
            }
            setLoading(false);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const setActionLoadingFor = (id: string, isLoading: boolean) => {
        setActionLoading((prev) => ({ ...prev, [id]: isLoading }));
    };

    const sendRequest = async (userId: string) => {
        setActionLoadingFor(userId, true);
        try {
            await api.post('/contacts/request', { userId });
            toast.success('Request sent! 🤝');
            await fetchRequests(); // Refresh to get the new sent request
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to send request');
        }
        setActionLoadingFor(userId, false);
    };

    const acceptRequest = async (requestId: string) => {
        setActionLoadingFor(requestId, true);
        try {
            await api.post('/contacts/accept', { requestId });
            toast.success('Contact added! 🎉');
            // Refresh both requests and friends
            await fetchRequests();
            const { data } = await api.get('/users/profile');
            setFriends(data.user?.friends || []);
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to accept');
        }
        setActionLoadingFor(requestId, false);
    };

    const rejectRequest = async (requestId: string) => {
        setActionLoadingFor(requestId, true);
        try {
            await api.post('/contacts/reject', { requestId });
            toast.success('Request declined');
            await fetchRequests();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to decline');
        }
        setActionLoadingFor(requestId, false);
    };

    const totalRequests = incomingRequests.length + sentRequests.length;

    const tabs = [
        { id: 'friends' as const, label: 'Friends', count: friends.length },
        { id: 'requests' as const, label: 'Requests', count: totalRequests },
        { id: 'search' as const, label: 'Discover', count: null },
    ];

    const getSearchUserStatus = (userId: string): 'friend' | 'pending' | 'none' => {
        if (friendIds.has(userId)) return 'friend';
        if (sentUserIds.has(userId)) return 'pending';
        // Also check if this user sent us a request
        if (incomingRequests.some((r) => r.user._id === userId)) return 'pending';
        return 'none';
    };

    const renderUserCard = (u: any, actions: React.ReactNode) => (
        <motion.div
            key={u._id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-center gap-3 p-3 rounded-2xl ${darkMode ? 'hover:bg-snap-card' : 'hover:bg-gray-50'
                } transition-colors`}
        >
            <div className="relative">
                <div className="w-12 h-12 rounded-full bg-gradient-snap flex items-center justify-center text-white font-bold text-lg">
                    {u.avatar ? (
                        <img src={u.avatar} alt="" className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                        u.username?.[0]?.toUpperCase() || '?'
                    )}
                </div>
                {u.isOnline && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-snap-darker" />
                )}
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{u.username}</p>
                <p className="text-xs text-gray-400 truncate">{u.bio || 'No bio yet'}</p>
            </div>
            {actions}
        </motion.div>
    );

    const renderSearchActions = (u: UserResult) => {
        const status = getSearchUserStatus(u._id);
        const isLoading = actionLoading[u._id];

        if (status === 'friend') {
            return (
                <span className="text-xs text-green-400 flex items-center gap-1 px-2 py-1">
                    <UserCheck size={14} /> Friends
                </span>
            );
        }

        if (status === 'pending') {
            return (
                <span className="text-xs text-snap-yellow flex items-center gap-1 px-2 py-1">
                    <Clock size={14} /> Pending
                </span>
            );
        }

        return (
            <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => sendRequest(u._id)}
                disabled={isLoading}
                className="p-2 rounded-xl bg-snap-purple text-white disabled:opacity-50"
            >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
            </motion.button>
        );
    };

    return (
        <div className="p-4">
            <h2 className="text-lg font-bold mb-4">Friends</h2>

            {/* Tabs */}
            <div className={`flex gap-1 p-1 rounded-2xl mb-4 ${darkMode ? 'bg-snap-card' : 'bg-gray-100'}`}>
                {tabs.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all relative ${tab === t.id
                            ? 'bg-gradient-snap text-white shadow-glow'
                            : darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        {t.label}
                        {t.count !== null && t.count > 0 && (
                            <span className={`ml-1 ${tab === t.id ? 'text-white/70' : 'text-snap-purple'}`}>
                                ({t.count})
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Search Bar (visible in search tab) */}
            {tab === 'search' && (
                <div className="relative mb-4">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by username or email..."
                        className={`w-full pl-10 pr-10 py-3 rounded-2xl text-sm focus:outline-none focus:ring-1 focus:ring-snap-purple/50 transition-all ${darkMode
                            ? 'bg-snap-card border border-snap-border text-white placeholder-gray-500'
                            : 'bg-gray-100 border border-gray-200 text-gray-900 placeholder-gray-400'
                            }`}
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                            <X size={16} />
                        </button>
                    )}
                </div>
            )}

            {/* Tab Content */}
            <AnimatePresence mode="wait">
                {/* ─── Friends Tab ─── */}
                {tab === 'friends' && (
                    <motion.div key="friends" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-1">
                        {friends.length === 0 ? (
                            <div className="text-center py-12">
                                <Users className="mx-auto mb-3 text-gray-500" size={40} />
                                <p className="text-gray-400">No friends yet</p>
                                <p className="text-sm text-gray-500">Search to find people!</p>
                            </div>
                        ) : (
                            friends.map((f: any) =>
                                renderUserCard(f, (
                                    <span className="text-xs text-green-400 flex items-center gap-1">
                                        <UserCheck size={14} /> Friends
                                    </span>
                                ))
                            )
                        )}
                    </motion.div>
                )}

                {/* ─── Requests Tab ─── */}
                {tab === 'requests' && (
                    <motion.div key="requests" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-1">
                        {/* Incoming Requests */}
                        {incomingRequests.length > 0 && (
                            <>
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1 mb-2">
                                    Received ({incomingRequests.length})
                                </p>
                                {incomingRequests.map((r) =>
                                    renderUserCard(r.user, (
                                        <div className="flex gap-2">
                                            <motion.button
                                                whileTap={{ scale: 0.9 }}
                                                onClick={() => acceptRequest(r._id)}
                                                disabled={actionLoading[r._id]}
                                                className="p-2 rounded-xl bg-green-500 text-white disabled:opacity-50"
                                            >
                                                {actionLoading[r._id] ? <Loader2 size={16} className="animate-spin" /> : <UserCheck size={16} />}
                                            </motion.button>
                                            <motion.button
                                                whileTap={{ scale: 0.9 }}
                                                onClick={() => rejectRequest(r._id)}
                                                disabled={actionLoading[r._id]}
                                                className="p-2 rounded-xl bg-red-500/20 text-red-400 disabled:opacity-50"
                                            >
                                                <UserX size={16} />
                                            </motion.button>
                                        </div>
                                    ))
                                )}
                            </>
                        )}

                        {/* Sent Requests */}
                        {sentRequests.length > 0 && (
                            <>
                                <p className={`text-xs font-semibold text-gray-400 uppercase tracking-wider px-1 mb-2 ${incomingRequests.length > 0 ? 'mt-6' : ''}`}>
                                    Sent ({sentRequests.length})
                                </p>
                                {sentRequests.map((r) =>
                                    renderUserCard(r.user, (
                                        <span className="text-xs text-snap-yellow flex items-center gap-1 px-2 py-1">
                                            <Clock size={14} /> Pending
                                        </span>
                                    ))
                                )}
                            </>
                        )}

                        {/* Empty State */}
                        {incomingRequests.length === 0 && sentRequests.length === 0 && (
                            <div className="text-center py-12">
                                <p className="text-gray-400">No pending requests</p>
                                <p className="text-sm text-gray-500 mt-1">Discover people in the search tab!</p>
                            </div>
                        )}
                    </motion.div>
                )}

                {/* ─── Search / Discover Tab ─── */}
                {tab === 'search' && (
                    <motion.div key="search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-1">
                        {searchQuery ? (
                            loading ? (
                                <div className="space-y-3">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="flex items-center gap-3 p-3">
                                            <div className="w-12 h-12 rounded-full skeleton" />
                                            <div className="flex-1 space-y-2">
                                                <div className="h-4 w-24 skeleton" />
                                                <div className="h-3 w-32 skeleton" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : searchResults.length === 0 ? (
                                <p className="text-center text-gray-400 py-8">No users found</p>
                            ) : (
                                searchResults.map((u) =>
                                    renderUserCard(u, renderSearchActions(u))
                                )
                            )
                        ) : (
                            <>
                                <p className="text-sm font-semibold text-gray-400 mb-3">Suggested</p>
                                {suggested.map((u) =>
                                    renderUserCard(u, renderSearchActions(u))
                                )}
                                {suggested.length === 0 && (
                                    <p className="text-center text-gray-400 py-8">No suggestions available</p>
                                )}
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
