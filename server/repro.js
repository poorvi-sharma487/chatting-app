const { io } = require('socket.io-client');

const socket = io('http://localhost:5000', {
    transports: ['websocket'],
});

socket.on('connect', () => {
    console.log('Connected to server');
    console.log('Sending invalid userId: Poorvi123');
    socket.emit('userOnline', 'Poorvi123');
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
    process.exit(0);
});

setTimeout(() => {
    console.log('Timeout reached. Closing.');
    process.exit(0);
}, 5000);
