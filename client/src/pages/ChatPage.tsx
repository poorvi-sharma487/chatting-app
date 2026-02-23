import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { getSocket } from '../services/socket';
import api from '../services/api';
import toast from 'react-hot-toast';

interface Conversation {
    _id: string;
    user: { _id: string; username: string; avatar: string; isOnline: boolean };
    lastMessage: { text: string; createdAt: string; mediaUrl: string };
}

interface Message {
    _id: string;
    senderId: string;
    receiverId: string;
    text: string;
    mediaUrl: string;
    mediaType: string;
    isSeen: boolean;
    isSnap: boolean;
    createdAt: string;
}

export default function ChatPage() {
    const { user } = useAuthStore();
    const { darkMode } = useUIStore();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedChat, setSelectedChat] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [typingUser, setTypingUser] = useState('');
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Fetch conversations
    useEffect(() => {
        const fetchConversations = async () => {
            try {
                const { data } = await api.get('/messages/conversations');
                setConversations(data.conversations || []);
            } catch {
                // Mock data fallback
                setConversations([
                    {
                        _id: '1',
                        user: { _id: '2', username: 'Team Snapnova', avatar: '', isOnline: true },
                        lastMessage: { text: 'Welcome to Snapnova! 👻', createdAt: new Date().toISOString(), mediaUrl: '' }
                    },
                    {
                        _id: '3',
                        user: { _id: '4', username: 'Alice', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice', isOnline: false },
                        lastMessage: { text: 'Check out my new story!', createdAt: new Date(Date.now() - 3600000).toISOString(), mediaUrl: '' }
                    }
                ]);
            }
            setLoading(false);
        };
        fetchConversations();
    }, []);

    // Fetch messages when selecting a chat
    useEffect(() => {
        if (!selectedChat) return;
        const fetchMessages = async () => {
            try {
                const { data } = await api.get(`/messages/${selectedChat.user._id}`);
                setMessages(data.messages || []);
                // Mark as seen
                api.put('/messages/seen', { senderId: selectedChat.user._id });
            } catch {
                // Mock messages
                setMessages([
                    {
                        _id: 'm1',
                        senderId: selectedChat.user._id,
                        receiverId: user?._id || '',
                        text: 'Hey! How are you?',
                        mediaUrl: '',
                        mediaType: 'text',
                        isSeen: true,
                        isSnap: false,
                        createdAt: new Date(Date.now() - 86400000).toISOString()
                    },
                    {
                        _id: 'm2',
                        senderId: user?._id || '',
                        receiverId: selectedChat.user._id,
                        text: 'I\'m good! Just testing the app.',
                        mediaUrl: '',
                        mediaType: 'text',
                        isSeen: true,
                        isSnap: false,
                        createdAt: new Date(Date.now() - 3600000).toISOString()
                    }
                ]);
            }
        };
        fetchMessages();
    }, [selectedChat]);

    // Socket listeners
    useEffect(() => {
        const socket = getSocket();
        if (!socket) return;

        const handleReceive = (msg: Message) => {
            if (selectedChat && (msg.senderId === selectedChat.user._id || msg.receiverId === selectedChat.user._id)) {
                setMessages((prev) => [...prev, msg]);
            }
        };

        const handleTyping = ({ senderId, isTyping: typing }: { senderId: string; isTyping: boolean }) => {
            if (selectedChat && senderId === selectedChat.user._id) {
                setTypingUser(typing ? selectedChat.user.username : '');
            }
        };

        socket.on('receiveMessage', handleReceive);
        socket.on('typing', handleTyping);

        return () => {
            socket.off('receiveMessage', handleReceive);
            socket.off('typing', handleTyping);
        };
    }, [selectedChat]);

    // Scroll to bottom on new message
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = async () => {
        if (!newMessage.trim() || !selectedChat) return;
        try {
            const { data } = await api.post('/messages', {
                receiverId: selectedChat.user._id,
                text: newMessage,
            });
            setMessages((prev) => [...prev, data.message]);
            setNewMessage('');
            const socket = getSocket();
            socket?.emit('sendMessage', data.message);
            socket?.emit('typing', { senderId: user?._id, receiverId: selectedChat.user._id, isTyping: false });
        } catch {
            toast.error('Failed to send message');
        }
    };

    const handleTypingEmit = () => {
        const socket = getSocket();
        if (!socket || !selectedChat) return;
        socket.emit('typing', { senderId: user?._id, receiverId: selectedChat.user._id, isTyping: true });
        if (typingTimeout.current) clearTimeout(typingTimeout.current);
        typingTimeout.current = setTimeout(() => {
            socket.emit('typing', { senderId: user?._id, receiverId: selectedChat.user._id, isTyping: false });
        }, 2000);
    };

    const formatTime = (date: string) => {
        return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // Conversation List View
    if (!selectedChat) {
        return (
            <div className="p-4 space-y-3">
                <h2 className="text-lg font-bold mb-4">Messages</h2>

                {loading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center gap-3 p-3">
                                <div className="w-12 h-12 rounded-full skeleton" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 w-24 skeleton" />
                                    <div className="h-3 w-40 skeleton" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : conversations.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-20"
                    >
                        <MessageCircleIcon className="mx-auto mb-4 text-gray-500" size={48} />
                        <p className="text-gray-400">No conversations yet</p>
                        <p className="text-sm text-gray-500 mt-1">Add friends to start chatting!</p>
                    </motion.div>
                ) : (
                    conversations.map((conv) => (
                        <motion.button
                            key={conv._id}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            onClick={() => setSelectedChat(conv)}
                            className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all ${darkMode ? 'hover:bg-snap-card' : 'hover:bg-gray-100'
                                }`}
                        >
                            <div className="relative">
                                <div className="w-12 h-12 rounded-full bg-gradient-snap flex items-center justify-center text-white font-bold text-lg">
                                    {conv.user.avatar ? (
                                        <img src={conv.user.avatar} alt="" className="w-12 h-12 rounded-full object-cover" />
                                    ) : (
                                        conv.user.username[0].toUpperCase()
                                    )}
                                </div>
                                {conv.user.isOnline && (
                                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-snap-darker" />
                                )}
                            </div>
                            <div className="flex-1 text-left">
                                <p className="font-semibold text-sm">{conv.user.username}</p>
                                <p className="text-xs text-gray-400 truncate">
                                    {conv.lastMessage.mediaUrl ? '📷 Photo' : conv.lastMessage.text}
                                </p>
                            </div>
                            <span className="text-xs text-gray-500">
                                {formatTime(conv.lastMessage.createdAt)}
                            </span>
                        </motion.button>
                    ))
                )}
            </div>
        );
    }

    // Chat View
    return (
        <div className="flex flex-col h-full">
            {/* Chat Header */}
            <div className={`flex items-center gap-3 px-4 py-3 border-b ${darkMode ? 'border-snap-border' : 'border-gray-200'
                }`}>
                <button
                    onClick={() => setSelectedChat(null)}
                    className="p-1.5 rounded-lg hover:bg-snap-card transition-colors"
                >
                    <ArrowLeft size={20} />
                </button>
                <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-gradient-snap flex items-center justify-center text-white font-bold">
                        {selectedChat.user.avatar ? (
                            <img src={selectedChat.user.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                            selectedChat.user.username[0].toUpperCase()
                        )}
                    </div>
                    {selectedChat.user.isOnline && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-snap-darker" />
                    )}
                </div>
                <div className="flex-1">
                    <p className="font-semibold text-sm">{selectedChat.user.username}</p>
                    <p className="text-xs text-gray-400">
                        {typingUser ? 'typing...' : selectedChat.user.isOnline ? 'Online' : 'Offline'}
                    </p>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                <AnimatePresence>
                    {messages.map((msg) => {
                        const isMine = msg.senderId === user?._id;
                        return (
                            <motion.div
                                key={msg._id}
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${isMine
                                        ? 'bg-gradient-snap text-white rounded-br-md'
                                        : darkMode
                                            ? 'bg-snap-card text-white rounded-bl-md'
                                            : 'bg-gray-100 text-gray-900 rounded-bl-md'
                                        }`}
                                >
                                    {msg.mediaUrl && (
                                        <img src={msg.mediaUrl} alt="" className="rounded-xl mb-2 max-w-full" />
                                    )}
                                    {msg.text && <p>{msg.text}</p>}
                                    <p className={`text-[10px] mt-1 ${isMine ? 'text-white/60' : 'text-gray-400'}`}>
                                        {formatTime(msg.createdAt)}
                                        {isMine && msg.isSeen && ' ✓✓'}
                                    </p>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className={`px-4 py-3 border-t ${darkMode ? 'border-snap-border' : 'border-gray-200'}`}>
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => {
                            setNewMessage(e.target.value);
                            handleTypingEmit();
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                        placeholder="Type a message..."
                        className={`flex-1 px-4 py-3 rounded-2xl text-sm focus:outline-none focus:ring-1 focus:ring-snap-purple/50 transition-all ${darkMode
                            ? 'bg-snap-card border border-snap-border text-white placeholder-gray-500'
                            : 'bg-gray-100 border border-gray-200 text-gray-900 placeholder-gray-400'
                            }`}
                    />
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={sendMessage}
                        disabled={!newMessage.trim()}
                        className="p-3 rounded-2xl bg-gradient-snap text-white shadow-glow disabled:opacity-30 transition-all"
                    >
                        <Send size={18} />
                    </motion.button>
                </div>
            </div>
        </div>
    );
}

function MessageCircleIcon({ className, size }: { className?: string; size?: number }) {
    return (
        <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
    );
}
