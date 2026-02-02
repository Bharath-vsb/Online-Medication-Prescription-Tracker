const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const db = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Middleware for authentication
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Role-based access control
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.userRole)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    next();
  };
};

// ==================== AUTH ROUTES ====================

// Signup
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { fullName, email, mobile, password, role, medicalLicenseNumber, secretCode } = req.body;

    // Validation
    if (!fullName || !email || !mobile || !password || !role) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if user exists
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Admin secret code validation
    if (role === 'admin' && secretCode !== '0000') {
      return res.status(400).json({ error: 'Invalid admin secret code' });
    }

    // Doctor validation
    if (role === 'doctor' && !medicalLicenseNumber) {
      return res.status(400).json({ error: 'Medical license number is required for doctors' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Determine status
    let status = 'approved';
    if (role === 'doctor' || role === 'pharmacist') {
      status = 'pending';
    }

    // Insert user
    const [result] = await db.query(
      'INSERT INTO users (full_name, email, mobile, password, role, medical_license_number, status, enabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [fullName, email, mobile, hashedPassword, role, role === 'doctor' ? medicalLicenseNumber : null, status, true]
    );

    // Create notification for admin if pending
    if (status === 'pending') {
      await db.query(
        'INSERT INTO notifications (user_id, message, type, is_read) VALUES (?, ?, ?, ?)',
        [1, `New ${role} registration pending approval: ${fullName}`, 'approval', false]
      );
    }

    res.status(201).json({
      message: status === 'pending'
        ? 'Registration successful. Waiting for admin approval.'
        : 'Registration successful',
      status
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    const [users] = await db.query('SELECT * FROM users WHERE email = ? AND role = ?', [email, role]);
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];

    // Check if account is approved
    if (user.status === 'pending') {
      return res.status(403).json({ error: 'Account pending approval' });
    }

    if (user.status === 'rejected') {
      return res.status(403).json({ error: 'Account has been rejected' });
    }

    if (!user.enabled) {
      return res.status(403).json({ error: 'Account has been disabled' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '24h' });

    res.json({
      token,
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current user
app.get('/api/auth/me', authenticate, async (req, res) => {
  try {
    const [users] = await db.query('SELECT * FROM users WHERE id = ?', [req.userId]);
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });

    const user = users[0];
    res.json({
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      medicalLicenseNumber: user.medical_license_number
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== DOCTOR ROUTES ====================

// Get all medicines for dropdown
app.get('/api/medicines', authenticate, async (req, res) => {
  try {
    const [medicines] = await db.query('SELECT id, name FROM medicines ORDER BY name');
    res.json(medicines);
  } catch (error) {
    console.error('Get medicines error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create prescription
app.post('/api/prescriptions', authenticate, authorize('doctor'), async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { patientId, medicines } = req.body;

    if (!patientId || !medicines || medicines.length === 0) {
      return res.status(400).json({ error: 'Patient and medicines are required' });
    }

    await connection.beginTransaction();

    // Get next prescription group ID
    const [maxGroup] = await connection.query('SELECT COALESCE(MAX(prescription_group_id), 0) + 1 as nextId FROM prescriptions');
    const prescriptionGroupId = maxGroup[0].nextId;

    const createdPrescriptions = [];

    for (const med of medicines) {
      const { medicineId, medicineName, startDate, duration, frequency } = med;

      // Calculate doses per day
      const dosesPerDay = {
        'once-per-day': 1,
        'twice-per-day': 2,
        'three-times-per-day': 3,
        'four-times-per-day': 4,
        'every-6-hours': 4,
        'every-8-hours': 3
      }[frequency] || 1;

      // Calculate end date
      const start = new Date(startDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      start.setHours(0, 0, 0, 0);

      // Validate start date is not in the past
      if (start < today) {
        await connection.rollback();
        return res.status(400).json({ error: 'Start date cannot be in the past. Please select today or a future date.' });
      }

      const endDate = new Date(start);
      endDate.setDate(endDate.getDate() + parseInt(duration));

      let finalMedicineId = medicineId;
      let finalMedicineName = medicineName;

      // If medicine doesn't exist, create it
      if (!medicineId && medicineName) {
        const [result] = await connection.query(
          'INSERT INTO medicines (name) VALUES (?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)',
          [medicineName]
        );
        finalMedicineId = result.insertId;

        // Alert pharmacist
        const [pharmacists] = await connection.query('SELECT id FROM users WHERE role = ? LIMIT 1', ['pharmacist']);
        if (pharmacists.length > 0) {
          await connection.query(
            'INSERT INTO notifications (user_id, message, type, is_read) VALUES (?, ?, ?, ?)',
            [pharmacists[0].id, `New medicine "${medicineName}" prescribed but not in inventory`, 'alert', false]
          );
        }
      } else if (medicineId) {
        const [meds] = await connection.query('SELECT name FROM medicines WHERE id = ?', [medicineId]);
        if (meds.length > 0) finalMedicineName = meds[0].name;
      }

      const [result] = await connection.query(
        `INSERT INTO prescriptions (prescription_group_id, doctor_id, patient_id, medicine_id, start_date, end_date, duration, frequency, doses_per_day, total_quantity, status, bought)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [prescriptionGroupId, req.userId, patientId, finalMedicineId, start, endDate, parseInt(duration), frequency, dosesPerDay, parseInt(duration) * dosesPerDay, 'active', false]
      );

      createdPrescriptions.push({
        id: result.insertId,
        prescriptionGroupId,
        medicineName: finalMedicineName,
        startDate: start,
        endDate,
        duration: parseInt(duration),
        frequency,
        dosesPerDay,
        totalQuantity: parseInt(duration) * dosesPerDay
      });
    }

    await connection.commit();
    res.status(201).json({
      message: 'Prescription created successfully',
      prescriptions: createdPrescriptions
    });
  } catch (error) {
    await connection.rollback();
    console.error('Create prescription error:', error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    connection.release();
  }
});

// Get doctor's prescriptions
app.get('/api/doctor/prescriptions', authenticate, authorize('doctor'), async (req, res) => {
  try {
    const { status } = req.query;

    let query = `
      SELECT p.*, m.name as medicine_name, u.full_name as patient_name, u.email as patient_email, u.mobile as patient_mobile
      FROM prescriptions p
      JOIN medicines m ON p.medicine_id = m.id
      JOIN users u ON p.patient_id = u.id
      WHERE p.doctor_id = ?
    `;
    const params = [req.userId];

    // Auto-complete expired prescriptions
    await db.query(`UPDATE prescriptions SET status = 'completed' WHERE status = 'active' AND end_date < CURDATE()`);

    if (status) {
      query += ' AND p.status = ?';
      params.push(status);
    }

    query += ' ORDER BY p.created_at DESC';

    const [prescriptions] = await db.query(query, params);

    // Format response
    const formatted = prescriptions.map(p => ({
      ...p,
      medicineName: p.medicine_name,
      startDate: p.start_date,
      endDate: p.end_date,
      totalQuantity: p.total_quantity,
      patient: {
        id: p.patient_id,
        fullName: p.patient_name,
        email: p.patient_email,
        mobile: p.patient_mobile
      }
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Get prescriptions error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Doctor analytics
app.get('/api/doctor/analytics', authenticate, authorize('doctor'), async (req, res) => {
  try {
    const [stats] = await db.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
      FROM prescriptions
      WHERE doctor_id = ?
    `, [req.userId]);

    // Calculate average adherence
    const [adherenceData] = await db.query(`
      SELECT 
        COUNT(DISTINCT dc.id) as taken_doses,
        COUNT(DISTINCT r.id) as total_reminders
      FROM prescriptions p
      LEFT JOIN reminders r ON p.id = r.prescription_id
      LEFT JOIN dose_confirmations dc ON r.id = dc.reminder_id AND dc.status = 'taken'
      WHERE p.doctor_id = ?
    `, [req.userId]);

    const avgAdherence = adherenceData[0].total_reminders > 0
      ? ((adherenceData[0].taken_doses / adherenceData[0].total_reminders) * 100).toFixed(1)
      : '0.0';

    res.json({
      totalPrescriptions: stats[0].total,
      activePrescriptions: stats[0].active,
      completedPrescriptions: stats[0].completed,
      avgPatientAdherence: avgAdherence
    });
  } catch (error) {
    console.error('Doctor analytics error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get patients list
app.get('/api/patients', authenticate, authorize('doctor'), async (req, res) => {
  try {
    const [patients] = await db.query(
      'SELECT id, full_name as fullName, email, mobile FROM users WHERE role = ? ORDER BY full_name',
      ['patient']
    );
    res.json(patients);
  } catch (error) {
    console.error('Get patients error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== PHARMACIST ROUTES ====================

// Inventory CRUD
app.post('/api/inventory', authenticate, authorize('pharmacist'), async (req, res) => {
  try {
    const { medicineId, medicineName, batchNumber, expiryDate, stockQuantity } = req.body;

    let finalMedicineId = medicineId;

    // If medicine doesn't exist, create it
    if (!medicineId && medicineName) {
      const [result] = await db.query(
        'INSERT INTO medicines (name) VALUES (?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)',
        [medicineName]
      );
      finalMedicineId = result.insertId;
    }

    const [result] = await db.query(
      'INSERT INTO inventory (medicine_id, batch_number, expiry_date, stock_quantity) VALUES (?, ?, ?, ?)',
      [finalMedicineId, batchNumber, expiryDate, parseInt(stockQuantity)]
    );

    const [inventory] = await db.query(`
      SELECT i.*, m.name as medicine_name
      FROM inventory i
      JOIN medicines m ON i.medicine_id = m.id
      WHERE i.id = ?
    `, [result.insertId]);

    res.status(201).json(inventory[0]);
  } catch (error) {
    console.error('Add inventory error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/inventory', authenticate, authorize('pharmacist', 'admin'), async (req, res) => {
  try {
    const [inventory] = await db.query(`
      SELECT i.*, m.name as medicine_name,
        (i.expiry_date < CURDATE()) as is_expired,
        (i.stock_quantity <= 100) as is_low_stock
      FROM inventory i
      JOIN medicines m ON i.medicine_id = m.id
      ORDER BY i.created_at DESC
    `);

    res.json(inventory);
  } catch (error) {
    console.error('Get inventory error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/inventory/:id', authenticate, authorize('pharmacist'), async (req, res) => {
  try {
    const { id } = req.params;
    const { batchNumber, expiryDate, stockQuantity } = req.body;

    const updates = [];
    const values = [];

    if (batchNumber) {
      updates.push('batch_number = ?');
      values.push(batchNumber);
    }
    if (expiryDate) {
      updates.push('expiry_date = ?');
      values.push(expiryDate);
    }
    if (stockQuantity !== undefined) {
      updates.push('stock_quantity = ?');
      values.push(parseInt(stockQuantity));
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(parseInt(id));
    await db.query(`UPDATE inventory SET ${updates.join(', ')} WHERE id = ?`, values);

    const [inventory] = await db.query(`
      SELECT i.*, m.name as medicine_name
      FROM inventory i
      JOIN medicines m ON i.medicine_id = m.id
      WHERE i.id = ?
    `, [id]);

    res.json(inventory[0]);
  } catch (error) {
    console.error('Update inventory error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/inventory/:id', authenticate, authorize('pharmacist'), async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM inventory WHERE id = ?', [parseInt(id)]);
    res.json({ message: 'Item deleted' });
  } catch (error) {
    console.error('Delete inventory error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get prescriptions for selling
app.get('/api/pharmacist/prescriptions', authenticate, authorize('pharmacist'), async (req, res) => {
  try {
    const { status } = req.query;

    if (status === 'history') {
      const [sold] = await db.query(`
        SELECT p.*, m.name as medicine_name, 
          u1.full_name as doctor_name, u2.full_name as patient_name,
          sm.quantity as sold_quantity, sm.sold_at
        FROM sold_medicines sm
        JOIN prescriptions p ON sm.prescription_id = p.id
        JOIN medicines m ON p.medicine_id = m.id
        JOIN users u1 ON p.doctor_id = u1.id
        JOIN users u2 ON p.patient_id = u2.id
        ORDER BY sm.sold_at DESC
      `);

      // Format the response to match frontend expectations
      const formatted = sold.map(s => ({
        ...s,
        medicineName: s.medicine_name,
        soldQuantity: s.sold_quantity,
        soldAt: s.sold_at
      }));

      return res.json(formatted);
    }

    const [prescriptions] = await db.query(`
      SELECT p.*, m.name as medicine_name,
        u1.full_name as doctor_name, u1.email as doctor_email,
        u2.full_name as patient_name, u2.email as patient_email
      FROM prescriptions p
      JOIN medicines m ON p.medicine_id = m.id
      JOIN users u1 ON p.doctor_id = u1.id
      JOIN users u2 ON p.patient_id = u2.id
      WHERE p.status = 'active'
      ORDER BY p.created_at DESC
    `);

    const formatted = prescriptions.map(p => ({
      ...p,
      medicineName: p.medicine_name,
      startDate: p.start_date,
      endDate: p.end_date,
      totalQuantity: p.total_quantity,
      doctor: {
        id: p.doctor_id,
        fullName: p.doctor_name,
        email: p.doctor_email
      },
      patient: {
        id: p.patient_id,
        fullName: p.patient_name,
        email: p.patient_email
      }
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Get pharmacist prescriptions error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Sell medicine
app.post('/api/pharmacist/sell/:id', authenticate, authorize('pharmacist'), async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { id } = req.params;

    await connection.beginTransaction();

    const [prescriptions] = await connection.query('SELECT * FROM prescriptions WHERE id = ?', [parseInt(id)]);
    if (prescriptions.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Prescription not found' });
    }

    const prescription = prescriptions[0];

    if (prescription.bought) {
      await connection.rollback();
      return res.status(400).json({ error: 'Already sold' });
    }

    // Find inventory
    const [inventory] = await connection.query(
      'SELECT * FROM inventory WHERE medicine_id = ? AND stock_quantity >= ? LIMIT 1',
      [prescription.medicine_id, prescription.total_quantity]
    );

    if (inventory.length === 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'Insufficient stock' });
    }

    // Update inventory
    await connection.query(
      'UPDATE inventory SET stock_quantity = stock_quantity - ? WHERE id = ?',
      [prescription.total_quantity, inventory[0].id]
    );

    // Mark as bought
    await connection.query('UPDATE prescriptions SET bought = ? WHERE id = ?', [true, parseInt(id)]);

    // Record sale
    await connection.query(
      'INSERT INTO sold_medicines (prescription_id, medicine_id, quantity) VALUES (?, ?, ?)',
      [parseInt(id), prescription.medicine_id, prescription.total_quantity]
    );

    // Generate reminders
    await generateReminders(connection, prescription);

    await connection.commit();

    const [updated] = await connection.query('SELECT * FROM prescriptions WHERE id = ?', [parseInt(id)]);
    res.json({ message: 'Medicine sold successfully', prescription: updated[0] });
  } catch (error) {
    await connection.rollback();
    console.error('Sell medicine error:', error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    connection.release();
  }
});

// Generate reminders based on prescription
async function generateReminders(connection, prescription) {
  const { id, patient_id, start_date, end_date, frequency } = prescription;

  const reminderTimes = {
    'once-per-day': ['09:00'],
    'twice-per-day': ['09:00', '21:00'],
    'three-times-per-day': ['08:00', '14:00', '20:00'],
    'four-times-per-day': ['08:00', '12:00', '16:00', '20:00'],
    'every-6-hours': ['06:00', '12:00', '18:00', '00:00'],
    'every-8-hours': ['08:00', '16:00', '00:00']
  }[frequency] || ['09:00'];

  const start = new Date(start_date);
  const end = new Date(end_date);
  const currentDate = new Date(start);

  while (currentDate <= end) {
    for (const time of reminderTimes) {
      const [hours, minutes] = time.split(':');
      const reminderDateTime = new Date(currentDate);
      reminderDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      await connection.query(
        'INSERT INTO reminders (prescription_id, patient_id, reminder_time, status) VALUES (?, ?, ?, ?)',
        [id, patient_id, reminderDateTime, 'pending']
      );
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
}

// Pharmacist analytics
app.get('/api/pharmacist/analytics', authenticate, authorize('pharmacist'), async (req, res) => {
  try {
    const [stats] = await db.query(`
      SELECT 
        COUNT(*) as total_medicines,
        SUM(CASE WHEN stock_quantity <= 100 THEN 1 ELSE 0 END) as low_stock_count
      FROM inventory
    `);

    const [sales] = await db.query(`
      SELECT COUNT(*) as monthly_sales
      FROM sold_medicines
      WHERE sold_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `);

    res.json({
      totalMedicines: stats[0].total_medicines,
      lowStockCount: stats[0].low_stock_count,
      monthlySales: sales[0].monthly_sales
    });
  } catch (error) {
    console.error('Pharmacist analytics error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== PATIENT ROUTES ====================

// Get patient prescriptions
app.get('/api/patient/prescriptions', authenticate, authorize('patient'), async (req, res) => {
  try {
    const { status } = req.query;

    // Auto-complete expired prescriptions
    await db.query(`UPDATE prescriptions SET status = 'completed' WHERE status = 'active' AND end_date < CURDATE()`);

    let query = `
      SELECT p.*, m.name as medicine_name, u.full_name as doctor_name, u.email as doctor_email
      FROM prescriptions p
      JOIN medicines m ON p.medicine_id = m.id
      JOIN users u ON p.doctor_id = u.id
      WHERE p.patient_id = ?
    `;
    const params = [req.userId];

    if (status) {
      query += ' AND p.status = ?';
      params.push(status);
    }

    query += ' ORDER BY p.created_at DESC';

    const [prescriptions] = await db.query(query, params);

    const formatted = prescriptions.map(p => ({
      ...p,
      medicineName: p.medicine_name,
      startDate: p.start_date,
      endDate: p.end_date,
      totalQuantity: p.total_quantity,
      doctor: {
        id: p.doctor_id,
        fullName: p.doctor_name,
        email: p.doctor_email
      }
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Get patient prescriptions error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get reminders
app.get('/api/patient/reminders', authenticate, authorize('patient'), async (req, res) => {
  try {
    const GRACE_PERIOD_MINUTES = 30;

    // Auto-mark reminders as 'missed' only after grace period expires
    await db.query(`
      UPDATE reminders 
      SET status = 'missed' 
      WHERE status = 'pending' 
        AND reminder_time < DATE_SUB(NOW(), INTERVAL ? MINUTE)
        AND patient_id = ?
    `, [GRACE_PERIOD_MINUTES, req.userId]);

    // Get today's and tomorrow's reminders
    const [reminders] = await db.query(`
      SELECT r.*, p.medicine_id, m.name as medicine_name, p.frequency
      FROM reminders r
      JOIN prescriptions p ON r.prescription_id = p.id
      JOIN medicines m ON p.medicine_id = m.id
      WHERE r.patient_id = ? 
        AND p.status = 'active' 
        AND p.bought = true
        AND (DATE(r.reminder_time) = CURDATE() OR DATE(r.reminder_time) = DATE_ADD(CURDATE(), INTERVAL 1 DAY))
        AND r.status = 'pending'
      ORDER BY r.reminder_time ASC
    `, [req.userId]);

    const now = new Date();

    const formatted = reminders.map(r => {
      const reminderTime = new Date(r.reminder_time);
      const timeDiffMinutes = (now - reminderTime) / (1000 * 60);

      // Determine status
      let status = 'upcoming';
      if (timeDiffMinutes >= -5 && timeDiffMinutes <= 5) {
        status = 'due_now';
      } else if (timeDiffMinutes > 5 && timeDiffMinutes <= GRACE_PERIOD_MINUTES) {
        status = 'grace_period';
      }

      return {
        ...r,
        reminderTime: r.reminder_time,
        prescriptionId: r.prescription_id,
        reminderStatus: status,
        gracePeriodMinutes: GRACE_PERIOD_MINUTES,
        minutesUntilMissed: status === 'grace_period' ? Math.max(0, GRACE_PERIOD_MINUTES - timeDiffMinutes) : null,
        prescription: {
          id: r.prescription_id,
          medicineId: r.medicine_id,
          medicineName: r.medicine_name,
          frequency: r.frequency
        }
      };
    });

    res.json(formatted);
  } catch (error) {
    console.error('Get reminders error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update reminder time
app.put('/api/patient/reminders/:id', authenticate, authorize('patient'), async (req, res) => {
  try {
    const { id } = req.params;
    const { reminderTime } = req.body;

    await db.query('UPDATE reminders SET reminder_time = ? WHERE id = ?', [reminderTime, parseInt(id)]);

    const [reminders] = await db.query('SELECT * FROM reminders WHERE id = ?', [parseInt(id)]);
    res.json(reminders[0]);
  } catch (error) {
    console.error('Update reminder error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Confirm/Skip dose
app.post('/api/patient/reminders/:id/confirm', authenticate, authorize('patient'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'taken' or 'missed'

    const [reminders] = await db.query('SELECT * FROM reminders WHERE id = ?', [parseInt(id)]);
    if (reminders.length === 0) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    const reminder = reminders[0];

    // Validate: Cannot confirm before reminder time (only for 'taken' status)
    if (status === 'taken') {
      const now = new Date();
      const reminderTime = new Date(reminder.reminder_time);

      if (now < reminderTime) {
        return res.status(400).json({
          error: 'Cannot confirm medication before the scheduled reminder time',
          reminderTime: reminder.reminder_time
        });
      }
    }

    await db.query('UPDATE reminders SET status = ? WHERE id = ?', [status, parseInt(id)]);

    await db.query(
      'INSERT INTO dose_confirmations (reminder_id, prescription_id, patient_id, status) VALUES (?, ?, ?, ?)',
      [parseInt(id), reminder.prescription_id, req.userId, status]
    );

    const [updated] = await db.query('SELECT * FROM reminders WHERE id = ?', [parseInt(id)]);
    res.json({ message: 'Status updated', reminder: updated[0] });
  } catch (error) {
    console.error('Confirm dose error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Patient analytics
app.get('/api/patient/analytics', authenticate, authorize('patient'), async (req, res) => {
  try {
    const [stats] = await db.query(`
      SELECT 
        COUNT(DISTINCT r.id) as total_reminders,
        COUNT(DISTINCT dc.id) as taken_doses
      FROM prescriptions p
      LEFT JOIN reminders r ON p.id = r.prescription_id
      LEFT JOIN dose_confirmations dc ON r.id = dc.reminder_id AND dc.status = 'taken'
      WHERE p.patient_id = ?
    `, [req.userId]);

    const adherence = stats[0].total_reminders > 0
      ? ((stats[0].taken_doses / stats[0].total_reminders) * 100).toFixed(1)
      : '0.0';

    // Weekly adherence for line graph
    const [weeklyData] = await db.query(`
      SELECT 
        DATE(r.reminder_time) as reminder_date,
        COUNT(r.id) as total_reminders,
        COUNT(CASE WHEN dc.status = 'taken' THEN 1 END) as taken_doses
      FROM reminders r
      LEFT JOIN dose_confirmations dc ON r.id = dc.reminder_id
      WHERE r.patient_id = ? 
        AND r.reminder_time >= DATE_SUB(NOW(), INTERVAL 14 DAY)
      GROUP BY DATE(r.reminder_time)
      ORDER BY reminder_date ASC
    `, [req.userId]);

    const weeklyAdherence = weeklyData.map(d => ({
      date: d.reminder_date,
      adherence: d.total_reminders > 0 ? ((d.taken_doses / d.total_reminders) * 100).toFixed(1) : '0.0',
      totalReminders: d.total_reminders,
      takenDoses: d.taken_doses
    }));

    res.json({
      adherencePercentage: adherence,
      totalReminders: stats[0].total_reminders,
      takenDoses: stats[0].taken_doses,
      weeklyAdherence
    });
  } catch (error) {
    console.error('Patient analytics error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== ADMIN ROUTES ====================

// Get all users
app.get('/api/admin/users', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { status, role } = req.query;

    let query = 'SELECT * FROM users WHERE id != ?';
    const params = [req.userId];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    if (role) {
      query += ' AND role = ?';
      params.push(role);
    }

    query += ' ORDER BY created_at DESC';

    const [users] = await db.query(query, params);
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Approve/Reject user
app.put('/api/admin/users/:id/status', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'approved' or 'rejected'

    await db.query('UPDATE users SET status = ? WHERE id = ?', [status, parseInt(id)]);

    // Audit log
    await db.query(
      'INSERT INTO audit_logs (admin_id, action, target_user_id) VALUES (?, ?, ?)',
      [req.userId, `${status} user`, parseInt(id)]
    );

    // Notification
    await db.query(
      'INSERT INTO notifications (user_id, message, type, is_read) VALUES (?, ?, ?, ?)',
      [parseInt(id), `Your account has been ${status}`, 'status', false]
    );

    const [users] = await db.query('SELECT * FROM users WHERE id = ?', [parseInt(id)]);
    res.json({ message: 'Status updated', user: users[0] });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Enable/Disable user
app.put('/api/admin/users/:id/toggle', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const [users] = await db.query('SELECT enabled FROM users WHERE id = ?', [parseInt(id)]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const newEnabled = !users[0].enabled;
    await db.query('UPDATE users SET enabled = ? WHERE id = ?', [newEnabled, parseInt(id)]);

    await db.query(
      'INSERT INTO audit_logs (admin_id, action, target_user_id) VALUES (?, ?, ?)',
      [req.userId, newEnabled ? 'enabled user' : 'disabled user', parseInt(id)]
    );

    const [updated] = await db.query('SELECT * FROM users WHERE id = ?', [parseInt(id)]);
    res.json({ message: 'User toggled', user: updated[0] });
  } catch (error) {
    console.error('Toggle user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete user
app.delete('/api/admin/users/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    await db.query('DELETE FROM users WHERE id = ?', [parseInt(id)]);

    await db.query(
      'INSERT INTO audit_logs (admin_id, action, target_user_id) VALUES (?, ?, ?)',
      [req.userId, 'deleted user', parseInt(id)]
    );

    res.json({ message: 'User deleted' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all prescriptions (read-only)
app.get('/api/admin/prescriptions', authenticate, authorize('admin'), async (req, res) => {
  try {
    const [prescriptions] = await db.query(`
      SELECT p.*, m.name as medicine_name,
        u1.full_name as doctor_name, u2.full_name as patient_name
      FROM prescriptions p
      JOIN medicines m ON p.medicine_id = m.id
      JOIN users u1 ON p.doctor_id = u1.id
      JOIN users u2 ON p.patient_id = u2.id
      ORDER BY p.created_at DESC
    `);

    const formatted = prescriptions.map(p => ({
      ...p,
      medicineName: p.medicine_name,
      doctor: { id: p.doctor_id, fullName: p.doctor_name },
      patient: { id: p.patient_id, fullName: p.patient_name }
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Get admin prescriptions error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin analytics
app.get('/api/admin/analytics', authenticate, authorize('admin'), async (req, res) => {
  try {
    const [userStats] = await db.query(`
      SELECT 
        COUNT(*) as total_users,
        SUM(CASE WHEN role = 'doctor' THEN 1 ELSE 0 END) as total_doctors,
        SUM(CASE WHEN role = 'patient' THEN 1 ELSE 0 END) as total_patients,
        SUM(CASE WHEN role = 'pharmacist' THEN 1 ELSE 0 END) as total_pharmacists
      FROM users
    `);

    const [prescriptionCount] = await db.query('SELECT COUNT(*) as total FROM prescriptions');
    const [lowStock] = await db.query('SELECT COUNT(*) as count FROM inventory WHERE stock_quantity <= 100');

    res.json({
      totalUsers: userStats[0].total_users,
      totalDoctors: userStats[0].total_doctors,
      totalPatients: userStats[0].total_patients,
      totalPharmacists: userStats[0].total_pharmacists,
      totalPrescriptions: prescriptionCount[0].total,
      lowStockCount: lowStock[0].count
    });
  } catch (error) {
    console.error('Admin analytics error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get notifications
app.get('/api/notifications', authenticate, async (req, res) => {
  try {
    const [notifications] = await db.query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC',
      [req.userId]
    );
    res.json(notifications);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark notification as read
app.put('/api/notifications/:id/read', authenticate, async (req, res) => {
  try {
    await db.query('UPDATE notifications SET is_read = ? WHERE id = ?', [true, parseInt(req.params.id)]);
    const [notifications] = await db.query('SELECT * FROM notifications WHERE id = ?', [parseInt(req.params.id)]);
    res.json(notifications[0]);
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
