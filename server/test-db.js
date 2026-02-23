require('dotenv').config();
const mongoose = require('mongoose');

const uri = process.env.MONGO_URI;
console.log('Testing connection to:', uri.replace(/:([^:@]{1,})@/, ':****@')); // Mask password

mongoose.connect(uri)
    .then(() => {
        console.log('✅ MongoDB connected successfully!');
        process.exit(0);
    })
    .catch((err) => {
        console.error('❌ MongoDB connection error:', err);
        process.exit(1);
    });
