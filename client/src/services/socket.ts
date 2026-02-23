import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const connectSocket = (userId: string): Socket => {
    if (socket?.connected) return socket;

    socket = io('/', {
        withCredentials: true,
        transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
        console.log('⚡ Socket connected');
        socket?.emit('userOnline', userId);
    });

    socket.on('disconnect', () => {
        console.log('🔌 Socket disconnected');
    });

    return socket;
};

export const getSocket = (): Socket | null => socket;

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};
