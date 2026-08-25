// backend/server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const apiRoutes = require('./routes/api');

const app = express();

// Middleware
app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: false
}));
app.use(express.json());    // parse JSON body

// ================== Kết nối MongoDB ==================
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected successfully.'))
    .catch(err => console.log('MongoDB connection error:', err));
//=========================================================

/* ======================================================
    Cho phép truy cập backend bằng browser
====================================================== */
app.get('/', (req, res) => {
    res.send('Ink Manager Backend is running');
});
/* ======================================================
   🔹 HEALTH CHECK
   - Đánh thức backend khi bị sleep
   - Frontend ping trước khi load dữ liệu
====================================================== */
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date()
    });
});

// ================== Routes ==================
app.use('/api', apiRoutes);

// ================== Start server ==================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
// ================== KEEP ALIVE ==================
app.get('/health', async (req, res) => {
    try {
        // ép Mongo phải active
        await mongoose.connection.db.admin().ping();
        res.status(200).send('Backend alive + Mongo active');
    } catch (err) {
        res.status(500).send('Mongo not ready');
    }
});




