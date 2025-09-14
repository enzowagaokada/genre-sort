import mongoose from 'mongoose';
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
    throw new Error('Please define MONGODB_URI enviornment variable in .env.local');
}