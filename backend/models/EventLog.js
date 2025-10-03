// backend/models/EventLog.js
const mongoose = require('mongoose');

const eventLogSchema = new mongoose.Schema({
    date: { type: Date, default: Date.now },
    
    // THAY ĐỔI: Theo dõi ID của Hộp mực riêng biệt
    unit_id: { type: String, required: true, ref: 'InkUnit' }, 
    
    printer_id: { type: String, required: true, ref: 'Printer' },
    event_type: { type: String, enum: ['INSTALL', 'REFILL', 'DRUM_REPLACE', 'DISPOSE'], required: true },
    status_detail: { type: String }
});

module.exports = mongoose.model('EventLog', eventLogSchema);