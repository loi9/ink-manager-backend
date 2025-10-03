// backend/models/InkUnit.js (Đã sửa lỗi Ref)
const mongoose = require('mongoose');

const inkUnitSchema = new mongoose.Schema({
    unit_id: { type: String, required: true, unique: true }, 
    custom_name: { type: String }, 
    
    // SỬA LỖI: BỎ 'ref: Ink' để Mongoose không cố gắng cast thành ObjectId
    ink_code: { type: String, required: true /* ĐÃ BỎ , ref: 'Ink' */ }, 

    status: { type: String, enum: ['IN_STOCK', 'INSTALLED', 'DISPOSED'], default: 'IN_STOCK' },
    current_printer_id: { type: String, ref: 'Printer', default: null }
});

module.exports = mongoose.model('InkUnit', inkUnitSchema);