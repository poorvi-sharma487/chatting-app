import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, FlipHorizontal, Download, X, Send, Aperture, Palette } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import api from '../services/api';
import toast from 'react-hot-toast';

const CSS_FILTERS = [
    { name: 'Normal', value: 'none' },
    { name: 'Warm', value: 'sepia(0.3) saturate(1.4)' },
    { name: 'Cool', value: 'hue-rotate(30deg) saturate(1.2)' },
    { name: 'Vintage', value: 'sepia(0.6) contrast(1.1)' },
    { name: 'B&W', value: 'grayscale(1)' },
    { name: 'Vivid', value: 'saturate(2) contrast(1.1)' },
    { name: 'Pop', value: 'contrast(1.3) saturate(1.5) brightness(1.1)' },
    { name: 'Fade', value: 'brightness(1.1) contrast(0.9) saturate(0.8)' },
];

export default function CameraPage() {
    const { darkMode } = useUIStore();
    const { user } = useAuthStore();
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [activeFilter, setActiveFilter] = useState(0);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
    const [showFilters, setShowFilters] = useState(false);
    const [sending, setSending] = useState(false);

    const streamRef = useRef<MediaStream | null>(null);

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        }
        setStream(null);
    }, []);

    const startCamera = useCallback(async () => {
        stopCamera();
        try {
            const newStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: false,
            });
            if (videoRef.current) {
                videoRef.current.srcObject = newStream;
            }
            streamRef.current = newStream;
            setStream(newStream);
        } catch {
            toast.error('Camera access denied');
        }
    }, [facingMode, stopCamera]);

    useEffect(() => {
        startCamera();
        return () => {
            stopCamera();
        };
    }, [startCamera, stopCamera]);


    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d')!;
        ctx.filter = CSS_FILTERS[activeFilter].value;
        ctx.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL('image/jpeg', 0.9);
        setCapturedImage(imageData);
    };

    const toggleCamera = () => {
        setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
    };

    const uploadAsStory = async () => {
        if (!capturedImage) return;
        setSending(true);
        try {
            await api.post('/stories', { mediaData: capturedImage, mediaType: 'image' });
            toast.success('Story uploaded! ✨');
            setCapturedImage(null);
        } catch {
            toast.error('Failed to upload story');
        }
        setSending(false);
    };

    const downloadImage = () => {
        if (!capturedImage) return;
        const link = document.createElement('a');
        link.href = capturedImage;
        link.download = `snapnova-${Date.now()}.jpg`;
        link.click();
    };

    return (
        <div className="h-full flex flex-col relative overflow-hidden">
            <canvas ref={canvasRef} className="hidden" />

            <AnimatePresence mode="wait">
                {capturedImage ? (
                    <motion.div
                        key="preview"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex-1 relative"
                    >
                        <img
                            src={capturedImage}
                            alt="Captured"
                            className="w-full h-full object-cover"
                        />
                        {/* Preview Actions */}
                        <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-4 px-6">
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={() => setCapturedImage(null)}
                                className="p-3 rounded-full bg-red-500/80 text-white backdrop-blur-sm"
                            >
                                <X size={24} />
                            </motion.button>
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={downloadImage}
                                className="p-3 rounded-full bg-white/20 text-white backdrop-blur-sm"
                            >
                                <Download size={24} />
                            </motion.button>
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={uploadAsStory}
                                disabled={sending}
                                className="px-6 py-3 rounded-full bg-gradient-snap text-white font-semibold shadow-glow flex items-center gap-2"
                            >
                                {sending ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Send size={18} />
                                        Story
                                    </>
                                )}
                            </motion.button>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="camera"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex-1 relative bg-black"
                    >
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                            style={{ filter: CSS_FILTERS[activeFilter].value }}
                        />

                        {/* Top controls */}
                        <div className="absolute top-4 right-4 flex flex-col gap-3">
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={toggleCamera}
                                className="p-3 rounded-full bg-black/40 text-white backdrop-blur-sm"
                            >
                                <FlipHorizontal size={20} />
                            </motion.button>
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={() => setShowFilters(!showFilters)}
                                className={`p-3 rounded-full backdrop-blur-sm ${showFilters ? 'bg-snap-purple text-white' : 'bg-black/40 text-white'}`}
                            >
                                <Palette size={20} />
                            </motion.button>
                        </div>

                        {/* Filter Selector */}
                        <AnimatePresence>
                            {showFilters && (
                                <motion.div
                                    initial={{ y: 50, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    exit={{ y: 50, opacity: 0 }}
                                    className="absolute bottom-28 left-0 right-0 flex gap-3 overflow-x-auto px-4 pb-2 no-scrollbar"
                                >
                                    {CSS_FILTERS.map((filter, i) => (
                                        <button
                                            key={filter.name}
                                            onClick={() => setActiveFilter(i)}
                                            className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold backdrop-blur-sm transition-all ${i === activeFilter
                                                ? 'bg-snap-purple text-white shadow-glow'
                                                : 'bg-black/40 text-white/80'
                                                }`}
                                        >
                                            {filter.name}
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Capture Button */}
                        <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={capturePhoto}
                                className="w-20 h-20 rounded-full border-[5px] border-white flex items-center justify-center shadow-glow"
                            >
                                <div className="w-16 h-16 rounded-full bg-white/90" />
                            </motion.button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
