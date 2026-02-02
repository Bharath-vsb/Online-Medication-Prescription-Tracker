-- Healthcare Management System Database Schema
-- Drop existing database and create fresh
DROP DATABASE IF EXISTS healthcare_management;
CREATE DATABASE healthcare_management;
USE healthcare_management;

-- =====================================================
-- TABLE: users
-- Stores all user accounts (admin, doctor, pharmacist, patient)
-- =====================================================
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  mobile VARCHAR(20) NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'doctor', 'pharmacist', 'patient') NOT NULL,
  medical_license_number VARCHAR(100),
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'approved',
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_role (role),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: medicines
-- Master list of all medicines
-- =====================================================
CREATE TABLE medicines (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: inventory
-- Pharmacist's stock management
-- =====================================================
CREATE TABLE inventory (
  id INT PRIMARY KEY AUTO_INCREMENT,
  medicine_id INT NOT NULL,
  batch_number VARCHAR(100) NOT NULL,
  expiry_date DATE NOT NULL,
  stock_quantity INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE CASCADE,
  INDEX idx_medicine_id (medicine_id),
  INDEX idx_expiry_date (expiry_date),
  INDEX idx_stock_quantity (stock_quantity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: prescriptions
-- Doctor-created prescriptions
-- =====================================================
CREATE TABLE prescriptions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  prescription_group_id INT NOT NULL,
  doctor_id INT NOT NULL,
  patient_id INT NOT NULL,
  medicine_id INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  duration INT NOT NULL,
  frequency VARCHAR(50) NOT NULL,
  doses_per_day INT NOT NULL,
  total_quantity INT NOT NULL,
  status ENUM('active', 'completed', 'cancelled') DEFAULT 'active',
  bought BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE CASCADE,
  INDEX idx_doctor_id (doctor_id),
  INDEX idx_patient_id (patient_id),
  INDEX idx_status (status),
  INDEX idx_bought (bought)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: sold_medicines
-- Sales history
-- =====================================================
CREATE TABLE sold_medicines (
  id INT PRIMARY KEY AUTO_INCREMENT,
  prescription_id INT NOT NULL,
  medicine_id INT NOT NULL,
  quantity INT NOT NULL,
  sold_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE CASCADE,
  FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE CASCADE,
  INDEX idx_prescription_id (prescription_id),
  INDEX idx_sold_at (sold_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: reminders
-- Patient medication reminders
-- =====================================================
CREATE TABLE reminders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  prescription_id INT NOT NULL,
  patient_id INT NOT NULL,
  reminder_time DATETIME NOT NULL,
  status ENUM('pending', 'taken', 'missed') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE CASCADE,
  FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_patient_id (patient_id),
  INDEX idx_reminder_time (reminder_time),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: dose_confirmations
-- Patient dose tracking
-- =====================================================
CREATE TABLE dose_confirmations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  reminder_id INT NOT NULL,
  prescription_id INT NOT NULL,
  patient_id INT NOT NULL,
  status ENUM('taken', 'missed') NOT NULL,
  confirmed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reminder_id) REFERENCES reminders(id) ON DELETE CASCADE,
  FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE CASCADE,
  FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_patient_id (patient_id),
  INDEX idx_prescription_id (prescription_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: notifications
-- User notifications
-- =====================================================
CREATE TABLE notifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_is_read (is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: audit_logs
-- Admin action tracking
-- =====================================================
CREATE TABLE audit_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  admin_id INT NOT NULL,
  action VARCHAR(255) NOT NULL,
  target_user_id INT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_admin_id (admin_id),
  INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- INSERT SAMPLE DATA
-- =====================================================

-- Insert default admin user (password: admin123)
INSERT INTO users (full_name, email, mobile, password, role, status, enabled) VALUES
('System Admin', 'admin@healthcare.com', '1234567890', '$2a$10$rZ5qK8qK8qK8qK8qK8qK8uYvYvYvYvYvYvYvYvYvYvYvYvYvYvYvY', 'admin', 'approved', TRUE);

-- Insert sample medicines
INSERT INTO medicines (name) VALUES
('Paracetamol 500mg'),
('Ibuprofen 400mg'),
('Amoxicillin 500mg'),
('Azithromycin 250mg'),
('Omeprazole 20mg'),
('Metformin 500mg'),
('Amlodipine 5mg'),
('Atorvastatin 10mg'),
('Cetirizine 10mg'),
('Aspirin 75mg'),
('Losartan 50mg'),
('Levothyroxine 100mcg'),
('Salbutamol Inhaler'),
('Insulin Glargine'),
('Vitamin D3 1000IU');

-- Insert sample inventory
INSERT INTO inventory (medicine_id, batch_number, expiry_date, stock_quantity) VALUES
(1, 'PAR2024001', '2025-12-31', 500),
(2, 'IBU2024002', '2025-11-30', 350),
(3, 'AMX2024003', '2025-10-31', 200),
(4, 'AZI2024004', '2026-03-31', 150),
(5, 'OME2024005', '2026-06-30', 400),
(6, 'MET2024006', '2026-08-31', 600),
(7, 'AML2024007', '2026-05-31', 250),
(9, 'CET2024008', '2025-09-30', 80),
(10, 'ASP2024009', '2026-02-28', 450),
(15, 'VIT2024010', '2026-12-31', 300);

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Show all tables
SHOW TABLES;

-- Show table structures
DESCRIBE users;
DESCRIBE medicines;
DESCRIBE inventory;
DESCRIBE prescriptions;

-- Show sample data counts
SELECT 'Users' as TableName, COUNT(*) as RecordCount FROM users
UNION ALL
SELECT 'Medicines', COUNT(*) FROM medicines
UNION ALL
SELECT 'Inventory', COUNT(*) FROM inventory;
