// backend/routes/api.js
const apiRoutes = require('./routes/api');
const express = require('express');
const router = express.Router();
const Ink = require('../models/Ink');
const InkUnit = require('../models/InkUnit'); // KHAI BÁO MÔ HÌNH MỚI
const EventLog = require('../models/EventLog');
const Printer = require('../models/Printer');

// --- 1. HÀM KHỞI TẠO DỮ LIỆU MẪU ---
router.post('/init', async (req, res) => {
    try {
        await Ink.deleteMany({});
        await Printer.deleteMany({});
        await EventLog.deleteMany({});
        await InkUnit.deleteMany({}); // XÓA BẢNG HỘP MỰC RIÊNG BIỆT

        // 1. Tạo Danh mục Loại Mực
        await Ink.insertMany([
            { ink_code: 'TNR-HP80A', ink_name: 'HP Black Toner 80A', ink_type: 'Toner', color: 'Black' },
            { ink_code: 'INK-C746', ink_name: 'Canon Color Cartridge 746', ink_type: 'Cartridge', color: 'Multi' }
        ]);
        
        // 2. Tạo Máy In
        await Printer.insertMany([
            { printer_id: 'VP-HANOI-01', printer_name: 'Máy in Laser P2055dn (Hà Nội)' },
            { printer_id: 'VP-HCM-03', printer_name: 'Máy in Phun IP2870S (TP.HCM)' }
        ]);

        // 3. Tạo các Hộp Mực Riêng biệt (Initial Stock)
        await InkUnit.insertMany([
            { unit_id: 'HP80A-STOCK-001', custom_name: 'Hộp mực HP 80A mới 1', ink_code: 'TNR-HP80A', status: 'IN_STOCK' },
            { unit_id: 'HP80A-STOCK-002', custom_name: 'Hộp mực HP 80A mới 2', ink_code: 'TNR-HP80A', status: 'IN_STOCK' },
            { unit_id: 'C746-STOCK-001', custom_name: 'Hộp mực Canon C746 mới 1', ink_code: 'INK-C746', status: 'IN_STOCK' },
            // Tạo sẵn một hộp mực đang lắp để test
            { unit_id: 'HP80A-INSTALLED-001', custom_name: 'Hộp mực đang dùng Hà Nội', ink_code: 'TNR-HP80A', status: 'INSTALLED', current_printer_id: 'VP-HANOI-01' }
        ]);


        res.json({ message: 'Dữ liệu mẫu đã được khởi tạo thành công!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi khi khởi tạo dữ liệu mẫu' });
    }
});
// Thêm API Lấy Logs
router.get('/logs', async (req, res) => {
    try {
        const logs = await EventLog.find().sort({ date: -1 });
        res.json(logs);
    } catch (err) {
        res.status(500).json({ error: 'Failed to retrieve logs' });
    }
});
// backend/routes/api.js
// API TẠO HỘP MỰC RIÊNG BIỆT MỚI (Unit)
router.post('/inkunits', async (req, res) => {
    try {
        const { unit_id, custom_name, ink_code, status } = req.body;

        // 1. Kiểm tra Unit ID đã tồn tại chưa
        const existingUnit = await InkUnit.findOne({ unit_id: unit_id });
        if (existingUnit) {
            return res.status(409).json({ error: 'Mã Unit ID đã tồn tại.' });
        }

        // 2. Tạo đối tượng InkUnit mới
        const newUnit = new InkUnit({
            unit_id,
            custom_name: custom_name || null,
            ink_code,
            status: status || 'IN_STOCK'
        });

        // 3. Lưu vào database
        await newUnit.save();
        
        // 4. Trả về thông báo thành công
        res.status(201).json(newUnit);
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: err.message });
    }
});
// CẬP NHẬT THÔNG TIN HỘP MỰC RIÊNG BIỆT (Unit)
router.put('/inkunits/:id', async (req, res) => {
    try {
        const unitId = req.params.id;
        const { custom_name, status, current_printer_id } = req.body;

        const updateData = { custom_name, status, current_printer_id };
        
        // Loại bỏ các trường undefined hoặc null nếu không muốn cập nhật
        Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

        const updatedUnit = await InkUnit.findOneAndUpdate(
            { unit_id: unitId },
            { $set: updateData },
            { new: true, runValidators: true } // Trả về bản ghi mới và chạy kiểm tra
        );

        if (!updatedUnit) {
            return res.status(404).json({ error: 'Hộp mực không tồn tại.' });
        }
        res.json(updatedUnit);
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: err.message });
    }
});
// Thêm API Xóa Log (Cần thận trọng khi sử dụng)
router.delete('/logs/:id', async (req, res) => {
    try {
        // CHÚ Ý: Xóa log KHÔNG tự động đảo ngược trạng thái InkUnit. 
        // Đây là API dành cho quản trị viên.
        const result = await EventLog.findByIdAndDelete(req.params.id);
        if (!result) return res.status(404).json({ error: 'Log not found' });
        res.json({ message: 'Log deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete log' });
    }
});
// backend/routes/api.js
// XÓA HỘP MỰC RIÊNG BIỆT (Unit)
router.delete('/inkunits/:id', async (req, res) => {
    try {
        const unitId = req.params.id;

        // CẢNH BÁO: PHẢI XÓA CẢ LOGS LIÊN QUAN ĐỂ TRÁNH LỖI TÍNH TOÁN
        await EventLog.deleteMany({ unit_id: unitId });
        
        const result = await InkUnit.findOneAndDelete({ unit_id: unitId });
        
        if (!result) {
            return res.status(404).json({ error: 'Hộp mực không tồn tại.' });
        }
        res.json({ message: 'Đã xóa hộp mực và tất cả Logs liên quan.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi khi xóa hộp mực.' });
    }
});
// ----------------------------------------------------

// 2. API Lấy danh sách INK (Danh mục)
router.get('/inks', async (req, res) => {
    try {
        const inks = await Ink.find();
        res.json(inks);
    } catch (err) { res.status(500).json({ error: 'Server Error' }); }
});

// 3. API Lấy danh sách PRINTERS
router.get('/printers', async (req, res) => {
    try {
        const printers = await Printer.find();
        res.json(printers);
    } catch (err) { res.status(500).json({ error: 'Server Error' }); }
});

// 4. API Lấy danh sách INK UNITS (Hộp mực riêng biệt để chọn trong Form)
router.get('/inkunits', async (req, res) => {
    try {
        // Lấy các hộp mực đang IN_STOCK, INSTALLED (không lấy DISPOSED)
        const inkUnits = await InkUnit.find({ status: { $in: ['IN_STOCK', 'INSTALLED'] } })
            .populate('ink_code', 'ink_name'); // Lấy tên loại mực từ Ink Model

        res.json(inkUnits);
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});


// 5. Ghi EVENT LOG VÀ CẬP NHẬT TRẠNG THÁI HỘP MỰC
router.post('/events', async (req, res) => {
    try {
        const { unit_id, printer_id, event_type, status_detail } = req.body;

        // B1: Ghi Log
        const newLog = new EventLog({ unit_id, printer_id, event_type, status_detail });
        await newLog.save();
        
        // B2: Cập nhật trạng thái và vị trí của InkUnit
        let updateData = {};
        
        if (event_type === 'INSTALL') {
            updateData = { 
                status: 'INSTALLED', 
                current_printer_id: printer_id 
            };
        } else if (event_type === 'DISPOSE') {
            updateData = { 
                status: 'DISPOSED', 
                current_printer_id: null 
            };
        } else if (event_type === 'REFILL' || event_type === 'DRUM_REPLACE') {
            // Các sự kiện này không làm thay đổi trạng thái INSTALLED hoặc vị trí.
        }

        if (Object.keys(updateData).length > 0) {
            await InkUnit.updateOne({ unit_id }, { $set: updateData });
        }

        res.status(201).json(newLog);
    } catch (err) { res.status(400).json({ error: err.message }); }
});


// 6. ROUTE DASHBOARD (Tính toán phức tạp trên từng InkUnit)
router.get('/dashboard', async (req, res) => {
    try {
        // Lấy tất cả hộp mực đang hoạt động và populate tên loại mực
        const activeUnits = await InkUnit.find({ status: { $in: ['IN_STOCK', 'INSTALLED'] } })
            .populate('ink_code', 'ink_name ink_type color'); 

        const logs = await EventLog.find().sort({ date: 1 }); // Sắp xếp theo ngày

        const dashboardData = activeUnits.map(unit => {
            const unitLogs = logs.filter(log => log.unit_id === unit.unit_id);
            
            // Tìm sự kiện DRUM_REPLACE gần nhất
            const drumEvents = unitLogs.filter(log => log.event_type === 'DRUM_REPLACE');
            const latestDrum = drumEvents.length > 0 ? drumEvents[drumEvents.length - 1] : null;

            // Tìm sự kiện REFILL gần nhất
            const refillEvents = unitLogs.filter(log => log.event_type === 'REFILL');
            const latestRefill = refillEvents.length > 0 ? refillEvents[refillEvents.length - 1] : null;

            // LOGIC CỐT LÕI: Số lần nạp mực sau Thay Drum gần nhất
            let refillsAfterDrum = 0;
            if (latestDrum) {
                const latestDrumTimestamp = latestDrum.date.getTime();
                refillsAfterDrum = refillEvents.filter(log => {
                    return log.date.getTime() > latestDrumTimestamp;
                }).length;
            }
            
            // Tính toán Chu kỳ nạp trung bình
            let avgRefillCycle = 'N/A';
            if (refillEvents.length >= 2) {
                let totalDays = 0;
                for (let i = 1; i < refillEvents.length; i++) {
                    const diffTime = Math.abs(refillEvents[i].date - refillEvents[i - 1].date);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    totalDays += diffDays;
                }
                avgRefillCycle = (totalDays / (refillEvents.length - 1)).toFixed(1) + ' ngày';
            }
            
            // Tính Tổng tồn kho theo Loại mực (ví dụ: có bao nhiêu hộp TNR-HP80A đang IN_STOCK)
            // (Được tính ở phía client hoặc làm một API riêng nếu muốn phức tạp hơn)

            return {
                unit_id: unit.unit_id,
                ink_code: unit.ink_code.ink_code,
                ink_name: unit.custom_name || unit.ink_code.ink_name, // Hiển thị tên tùy chỉnh hoặc tên loại mực
                status: unit.status,
                printer_using: unit.current_printer_id || 'KHO',
                latest_refill_date: latestRefill ? latestRefill.date.toISOString().split('T')[0] : 'N/A',
                total_refill_count: refillEvents.length,
                latest_drum_date: latestDrum ? latestDrum.date.toISOString().split('T')[0] : 'N/A',
                total_drum_count: drumEvents.length,
                avg_refill_cycle: avgRefillCycle,
                refills_after_drum: refillsAfterDrum
            };
        });

        res.json(dashboardData); // Trả về danh sách từng hộp mực riêng biệt
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to generate dashboard data' });
    }
});


module.exports = router;
