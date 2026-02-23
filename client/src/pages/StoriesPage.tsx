import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Eye, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import api from '../services/api';

interface StoryItem {
    _id: string;
    mediaUrl: string;
    mediaType: string;
    caption: string;
    viewers: string[];
    createdAt: string;
}

interface StoryGroup {
    user: { _id: string; username: string; avatar: string };
    stories: StoryItem[];
}

export default function StoriesPage() {
    const { user } = useAuthStore();
    const { darkMode } = useUIStore();
    const [feed, setFeed] = useState<StoryGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewerOpen, setViewerOpen] = useState(false);
    const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
    const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const fetchStories = async () => {
            try {
                const { data } = await api.get('/stories/feed');
                setFeed(data.storiesFeed || []);
            } catch {
                // Mock stories
                setFeed([
                    {
                        user: { _id: '2', username: 'Team Snapnova', avatar: '' },
                        stories: [
                            {
                                _id: 's1',
                                mediaUrl: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80',
                                mediaType: 'image',
                                caption: 'Welcome to our community! 📸',
                                viewers: [],
                                createdAt: new Date().toISOString()
                            }
                        ]
                    },
                    {
                        user: { _id: '4', username: 'Alice', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice' },
                        stories: [
                            {
                                _id: 's2',
                                mediaUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&q=80',
                                mediaType: 'image',
                                caption: 'Weekend vibes 🌴',
                                viewers: [],
                                createdAt: new Date().toISOString()
                            }
                        ]
                    }
                ]);
            }
            setLoading(false);
        };
        fetchStories();
    }, []);

    // Story viewer progress timer
    useEffect(() => {
        if (!viewerOpen) return;
        setProgress(0);
        const interval = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 100) {
                    nextStory();
                    return 0;
                }
                return prev + 2;
            });
        }, 100);
        return () => clearInterval(interval);
    }, [viewerOpen, currentGroupIndex, currentStoryIndex]);

    const openStory = (groupIndex: number) => {
        setCurrentGroupIndex(groupIndex);
        setCurrentStoryIndex(0);
        setViewerOpen(true);
        // Mark as viewed
        const story = feed[groupIndex]?.stories[0];
        if (story) api.put(`/stories/${story._id}/view`);
    };

    const nextStory = () => {
        const group = feed[currentGroupIndex];
        if (currentStoryIndex < group.stories.length - 1) {
            setCurrentStoryIndex((p) => p + 1);
            const nextS = group.stories[currentStoryIndex + 1];
            if (nextS) api.put(`/stories/${nextS._id}/view`);
        } else if (currentGroupIndex < feed.length - 1) {
            setCurrentGroupIndex((p) => p + 1);
            setCurrentStoryIndex(0);
        } else {
            setViewerOpen(false);
        }
    };

    const prevStory = () => {
        if (currentStoryIndex > 0) {
            setCurrentStoryIndex((p) => p - 1);
        } else if (currentGroupIndex > 0) {
            setCurrentGroupIndex((p) => p - 1);
            setCurrentStoryIndex(feed[currentGroupIndex - 1].stories.length - 1);
        }
    };

    const currentGroup = feed[currentGroupIndex];
    const currentStory = currentGroup?.stories[currentStoryIndex];

    return (
        <div className="p-4">
            <h2 className="text-lg font-bold mb-4">Stories</h2>

            {/* Story Circles */}
            <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                {/* My Story (Add) */}
                <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => window.location.href = '/camera'}
                    className="flex flex-col items-center gap-1 flex-shrink-0"
                >
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center border-2 border-dashed ${darkMode ? 'border-snap-border' : 'border-gray-300'
                        }`}>
                        <Plus size={24} className="text-snap-purple" />
                    </div>
                    <span className="text-xs text-gray-400">Add</span>
                </motion.button>

                {loading
                    ? [1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex flex-col items-center gap-1 flex-shrink-0">
                            <div className="w-16 h-16 rounded-full skeleton" />
                            <div className="h-3 w-10 skeleton" />
                        </div>
                    ))
                    : feed.map((group, i) => (
                        <motion.button
                            key={group.user._id}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => openStory(i)}
                            className="flex flex-col items-center gap-1 flex-shrink-0"
                        >
                            <div className="p-0.5 rounded-full bg-gradient-snap">
                                <div className={`w-[60px] h-[60px] rounded-full border-2 ${darkMode ? 'border-snap-darker' : 'border-white'} overflow-hidden`}>
                                    {group.user.avatar ? (
                                        <img src={group.user.avatar} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-snap-card flex items-center justify-center text-white font-bold text-lg">
                                            {group.user.username[0].toUpperCase()}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <span className="text-xs text-gray-400 truncate max-w-16">{group.user.username}</span>
                        </motion.button>
                    ))}
            </div>

            {feed.length === 0 && !loading && (
                <div className="text-center py-16">
                    <p className="text-gray-400">No stories yet</p>
                    <p className="text-sm text-gray-500 mt-1">Add friends or post your own!</p>
                </div>
            )}

            {/* Fullscreen Story Viewer */}
            <AnimatePresence>
                {viewerOpen && currentStory && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black flex flex-col"
                    >
                        {/* Progress Bars */}
                        <div className="flex gap-1 px-3 pt-3">
                            {currentGroup.stories.map((_, i) => (
                                <div key={i} className="flex-1 h-0.5 bg-white/20 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-white rounded-full transition-all duration-100"
                                        style={{
                                            width: i < currentStoryIndex ? '100%' : i === currentStoryIndex ? `${progress}%` : '0%',
                                        }}
                                    />
                                </div>
                            ))}
                        </div>

                        {/* Header */}
                        <div className="flex items-center gap-3 px-4 py-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-snap flex items-center justify-center text-white text-sm font-bold">
                                {currentGroup.user.avatar ? (
                                    <img src={currentGroup.user.avatar} alt="" className="w-8 h-8 rounded-full" />
                                ) : (
                                    currentGroup.user.username[0].toUpperCase()
                                )}
                            </div>
                            <span className="text-white font-semibold text-sm">{currentGroup.user.username}</span>
                            <span className="text-white/50 text-xs">
                                {new Date(currentStory.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <button onClick={() => setViewerOpen(false)} className="ml-auto text-white">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Story Content */}
                        <div className="flex-1 relative flex items-center justify-center">
                            <img src={currentStory.mediaUrl} alt="" className="max-w-full max-h-full object-contain" />

                            {/* Tap areas */}
                            <button onClick={prevStory} className="absolute left-0 top-0 w-1/3 h-full" />
                            <button onClick={nextStory} className="absolute right-0 top-0 w-1/3 h-full" />

                            {/* Caption */}
                            {currentStory.caption && (
                                <div className="absolute bottom-8 left-4 right-4 text-center">
                                    <p className="text-white text-lg font-medium drop-shadow-lg">{currentStory.caption}</p>
                                </div>
                            )}
                        </div>

                        {/* Viewer count */}
                        {currentGroup.user._id === user?._id && (
                            <div className="px-4 py-3 flex items-center gap-2 text-white/50">
                                <Eye size={16} />
                                <span className="text-sm">{currentStory.viewers.length} views</span>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
