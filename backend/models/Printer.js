// backend/models/Printer.js
const mongoose = require('mongoose');

const printerSchema = new mongoose.Schema({
    printer_id: { type: String, required: true, unique: true },
    printer_name: { type: String, required: true }
});

module.exports = mongoose.model('Printer', printerSchema);