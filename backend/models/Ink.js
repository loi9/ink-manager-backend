// backend/models/Ink.js (Cập nhật)
const mongoose = require('mongoose');

const inkSchema = new mongoose.Schema({
    // Chỉ định ink_code là ID chính
    ink_code: { type: String, required: true, unique: true }, 
    ink_name: { type: String, required: true },
    ink_type: { type: String, required: true },
    color: { type: String },
});

// THÊM: Sử dụng ink_code thay vì _id khi tìm kiếm (Virtual Property)
inkSchema.virtual('id').get(function(){
    return this.ink_code;
});

module.exports = mongoose.model('Ink', inkSchema);