// backend/server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const apiRoutes = require('./routes/api');

const app = express();

// ================== Cấu hình CORS ==================
// Chỉ cho phép frontend chính truy cập, hoặc "*" để test
const corsOptions = {
    origin: process.env.FRONTEND_URL || "https://ink-manager-frontend.onrender.com", // ví dụ: https://ink-manager-frontend.onrender.com
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: false
};

app.use(cors(corsOptions)); // chỉ gọi 1 lần
app.use(express.json());    // parse JSON body

// ================== Kiểm tra biến môi trường ==================
if (!process.env.MONGO_URI) {
    console.error("Error: MONGO_URI is not defined in environment variables!");
    process.exit(1); // Dừng server nếu chưa cấu hình
}

// ================== Kết nối MongoDB ==================
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected successfully.'))
    .catch(err => {
        console.error('MongoDB connection error:', err);
        process.exit(1); // Dừng server nếu không kết nối được
    });

// ================== Routes ==================
app.use('/api', apiRoutes);

// ================== Start server ==================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Backend URL: ${process.env.FRONTEND_URL || "http://localhost:" + PORT}`);
});


