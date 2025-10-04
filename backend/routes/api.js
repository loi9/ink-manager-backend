const express = require('express');
const router = express.Router();
const Ink = require('../models/Ink');
const InkUnit = require('../models/InkUnit');
const EventLog = require('../models/EventLog');
const Printer = require('../models/Printer');


// --- 1. HÀM KHỞI TẠO DỮ LIỆU MẪU ---
router.post('/init', async (req, res) => {
    try {
        await Ink.deleteMany({});
        await Printer.deleteMany({});
        await EventLog.deleteMany({});
        await InkUnit.deleteMany({});

        // 1. Danh mục loại mực
        await Ink.insertMany([
            { ink_code: 'TNR-HP80A', ink_name: 'HP Black Toner 80A', ink_type: 'Toner', color: 'Black' },
            { ink_code: 'INK-C746', ink_name: 'Canon Color Cartridge 746', ink_type: 'Cartridge', color: 'Multi' }
        ]);
        
        // 2. Máy in
        await Printer.insertMany([
            { printer_id: 'VP-HANOI-01', printer_name: 'Máy in Laser P2055dn (Hà Nội)' },
            { printer_id: 'VP-HCM-03', printer_name: 'Máy in Phun IP2870S (TP.HCM)' }
        ]);

        // 3. Hộp mực riêng biệt ban đầu
        await InkUnit.insertMany([
            { unit_id: 'HP80A-STOCK-001', custom_name: 'Hộp mực HP 80A mới 1', ink_code: 'TNR-HP80A', status: 'IN_STOCK' },
            { unit_id: 'HP80A-STOCK-002', custom_name: 'Hộp mực HP 80A mới 2', ink_code: 'TNR-HP80A', status: 'IN_STOCK' },
            { unit_id: 'C746-STOCK-001', custom_name: 'Hộp mực Canon C746 mới 1', ink_code: 'INK-C746', status: 'IN_STOCK' },
            { unit_id: 'HP80A-INSTALLED-001', custom_name: 'Hộp mực đang dùng Hà Nội', ink_code: 'TNR-HP80A', status: 'INSTALLED', current_printer_id: 'VP-HANOI-01' }
        ]);

        res.json({ message: 'Dữ liệu mẫu đã được khởi tạo thành công!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi khi khởi tạo dữ liệu mẫu' });
    }
});


// --- 2. API Lấy danh sách INK ---
router.get('/inks', async (req, res) => {
    try {
        const inks = await Ink.find();
        res.json(inks);
    } catch (err) { res.status(500).json({ error: 'Server Error' }); }
});


// --- 3. API Lấy danh sách PRINTERS ---
router.get('/printers', async (req, res) => {
    try {
        const printers = await Printer.find();
        res.json(printers);
    } catch (err) { res.status(500).json({ error: 'Server Error' }); }
});


// --- 4. API Lấy danh sách HỘP MỰC ---
router.get('/inkunits', async (req, res) => {
    try {
        const inkUnits = await InkUnit.find({ status: { $in: ['IN_STOCK', 'INSTALLED'] } });
        res.json(inkUnits);
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});


// --- 5. Ghi EVENT LOG + Cập nhật thống kê hộp mực ---
router.post('/events', async (req, res) => {
    try {
        const { unit_id, printer_id, event_type, status_detail } = req.body;

        // Ghi log
        const newLog = new EventLog({ unit_id, printer_id, event_type, status_detail });
        await newLog.save();

        // Lấy InkUnit
        const unit = await InkUnit.findOne({ unit_id });
        if (!unit) return res.status(404).json({ error: 'Không tìm thấy hộp mực' });

        let updateData = {};

        if (event_type === 'INSTALL') {
            updateData.status = 'INSTALLED';
            updateData.current_printer_id = printer_id;
        } 
        else if (event_type === 'DISPOSE') {
            updateData.status = 'DISPOSED';
            updateData.current_printer_id = null;
        } 
        else if (event_type === 'REFILL') {
            updateData.total_refill_count = (unit.total_refill_count || 0) + 1;
            updateData.latest_refill_date = new Date();
            updateData.refills_after_drum = (unit.refills_after_drum || 0) + 1;

            if (unit.latest_refill_date) {
                const diffDays = Math.ceil((new Date() - unit.latest_refill_date) / (1000 * 60 * 60 * 24));
                if (unit.total_refill_count > 0) {
                    let prevAvg = parseFloat(unit.avg_refill_cycle) || 0;
                    let newAvg = ((prevAvg * (unit.total_refill_count - 1)) + diffDays) / (unit.total_refill_count);
                    updateData.avg_refill_cycle = newAvg.toFixed(1) + " ngày";
                } else {
                    updateData.avg_refill_cycle = diffDays + " ngày";
                }
            }
        } 
        else if (event_type === 'DRUM_REPLACE') {
            updateData.total_drum_count = (unit.total_drum_count || 0) + 1;
            updateData.latest_drum_date = new Date();
            updateData.refills_after_drum = 0;
        }

        await InkUnit.updateOne({ unit_id }, { $set: updateData });

        res.status(201).json(newLog);
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: err.message });
    }
});


// --- 6. API LOGS ---
router.get('/logs', async (req, res) => {
    try {
        const logs = await EventLog.find().sort({ date: -1 });
        res.json(logs);
    } catch (err) {
        res.status(500).json({ error: 'Failed to retrieve logs' });
    }
});

router.delete('/logs/:id', async (req, res) => {
    try {
        const result = await EventLog.findByIdAndDelete(req.params.id);
        if (!result) return res.status(404).json({ error: 'Log not found' });
        res.json({ message: 'Log deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete log' });
    }
});


// --- 7. CRUD InkUnit ---
router.post('/inkunits', async (req, res) => {
    try {
        const { unit_id, custom_name, ink_code, status } = req.body;

        const existingUnit = await InkUnit.findOne({ unit_id: unit_id });
        if (existingUnit) return res.status(409).json({ error: 'Mã Unit ID đã tồn tại.' });

        const newUnit = new InkUnit({ unit_id, custom_name, ink_code, status: status || 'IN_STOCK' });
        await newUnit.save();
        
        res.status(201).json(newUnit);
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: err.message });
    }
});

router.put('/inkunits/:id', async (req, res) => {
    try {
        const unitId = req.params.id;
        const { custom_name, status, current_printer_id } = req.body;

        const updateData = { custom_name, status, current_printer_id };
        Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

        const updatedUnit = await InkUnit.findOneAndUpdate(
            { unit_id: unitId },
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!updatedUnit) return res.status(404).json({ error: 'Hộp mực không tồn tại.' });
        res.json(updatedUnit);
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: err.message });
    }
});

router.delete('/inkunits/:id', async (req, res) => {
    try {
        const unitId = req.params.id;
        await EventLog.deleteMany({ unit_id: unitId });
        const result = await InkUnit.findOneAndDelete({ unit_id: unitId });
        if (!result) return res.status(404).json({ error: 'Hộp mực không tồn tại.' });
        res.json({ message: 'Đã xóa hộp mực và tất cả Logs liên quan.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi khi xóa hộp mực.' });
    }
});


// --- 8. API DASHBOARD (lấy trực tiếp từ InkUnit) ---
router.get('/dashboard', async (req, res) => {
    try {
        const activeUnits = await InkUnit.find({ status: { $in: ['IN_STOCK', 'INSTALLED'] } });
        res.json(activeUnits);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to load dashboard' });
    }
});


module.exports = router;
