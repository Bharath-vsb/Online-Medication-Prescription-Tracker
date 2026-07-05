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
('System Admin', 'admin@healthcare.com', '1234567890', '$2a$10$O7kRZOG8eBWtR9Sut0khH.4u7c.KPIK0OX.YGay9Xa4uJicnHOeNm', 'admin', 'approved', 1),
('Test Admin', 'testadmin@test.com', '9999999999', '$2a$10$26hjMTx2jqZ1W1yD3BsOWO7GLNhQbN3JoWgM.s0MED4tUPyBMvply', 'admin', 'approved', 1),
('Test Patient', 'testpatient@test.com', '8888888888', '$2a$10$mlteauKc7YBkMfxSPfq6v.BYmLWk7oeP8SBqwmnVaZhpvvmvX8ZGO', 'patient', 'approved', 1),
('tony', 'vbharathvsb@gmail.com', '1234567890', '$2a$10$fgZtA7i15N9D2t1JDNfAWO0vXLUiZjGT2Edf5P6lfHF0u3xOy4rmi', 'patient', 'approved', 1),
('doctor', 'doctor@gmail.com', '1234567891', '$2a$10$qHlxnTR9R/4/sqqDYC1hhuCzwmyNio.giyOeLFrXUdHtdzm.Pw8ly', 'doctor', 'approved', 1),
('pharmacist', 'pharmacist@gmail.com', '1234567892', '$2a$10$vUwxSR5NXBLnh5GlW38KuOQxOCSpakN15gB45g8b92ebX9j6Pk8I2', 'pharmacist', 'approved', 1),
('Verification Doctor 1', 'verifdoc1@test.com', '1112223334', 'password', 'doctor', 'approved', 1),
('Verification Doctor 2', 'verifdoc2@test.com', '5556667778', 'password', 'doctor', 'approved', 1),
('Test Admin', 'admin1783236017250@test.com', '1111111111', '$2a$10$0UEX01TsvuQEjZXLG2IJXuCDLaLvPicz82knjITSqUzjydk99WADy', 'admin', 'approved', 1),
('Test Doctor', 'doc1783236017250@test.com', '2222222222', '$2a$10$Y5/Uu7NlRMT6Hd7fpLVXr.9PokIYENqVrTMAId5ChD96XPjVJnCN6', 'doctor', 'approved', 1),
('Test Pharmacist', 'pharm1783236017250@test.com', '3333333333', '$2a$10$skI8InJLfAyUGZvBMlN/0Oc6kg/fGdWP4ibmABxfIpLsnUjzkAQiW', 'pharmacist', 'approved', 1),
('Test Patient', 'pat1783236017250@test.com', '4444444444', '$2a$10$ONKc4218g3IllFXWohZytuDpHO5E2tzuVEMqdM8Ftx6DDTe9Y3RkG', 'patient', 'approved', 1),
('Test Admin', 'admin1783236119159@test.com', '1111111111', '$2a$10$t9JkElLM8vTltY2XFuLg5O03FQG73vtJg6dAQUs0BD/Rz/VAoj8Aa', 'admin', 'approved', 1),
('Test Doctor', 'doc1783236119159@test.com', '2222222222', '$2a$10$4q19cqVCY2OzuTl3./wHHuCkUHPu5jBcDNGHz5p9PbPImLPK2g90C', 'doctor', 'approved', 1),
('Test Pharmacist', 'pharm1783236119159@test.com', '3333333333', '$2a$10$CNHR5J0MfvA6v.dMZVIqgeW5lvwQ1umNk5DgpYcjssBXvEt/t.6dO', 'pharmacist', 'approved', 1),
('Test Patient', 'pat1783236119159@test.com', '4444444444', '$2a$10$5SluVoqmCjptjfmfNaAns.p1W93ZNQpAtdXbkqbwvjFv77OgWVvUW', 'patient', 'approved', 1),
('Test Admin', 'admin1783236193203@test.com', '1111111111', '$2a$10$uMpzEhOFl139koG5HA4EXus3BxCzcVW4kGJ.YSdtmMyp96nhEFIO2', 'admin', 'approved', 1),
('Test Doctor', 'doc1783236193203@test.com', '2222222222', '$2a$10$zle/6xXBHhfzIeIvfeZNC.cUyQQGt7WGKooPhD6g6nwp8QyyZmOly', 'doctor', 'approved', 1),
('Test Pharmacist', 'pharm1783236193203@test.com', '3333333333', '$2a$10$eWNht2iSM6GklvLb9ZPqruAX7XJFtxy.anirmK3rtBRpeaW2.OCLG', 'pharmacist', 'approved', 1),
('Test Patient', 'pat1783236193203@test.com', '4444444444', '$2a$10$RSfBlDu5y1KDLe8SLCS1Zu8pkRCp2OMXBqurkiUsYa8EukiepP46.', 'patient', 'approved', 1),
('Test Admin', 'admin1783236287349@test.com', '1111111111', '$2a$10$sv8QP/qyaDkdN./g9hONxeDPh996a9HBqgS3E7DD1gfvdQhHtXA.S', 'admin', 'approved', 1),
('Test Doctor', 'doc1783236287349@test.com', '2222222222', '$2a$10$qleQkeZkELCBUlmxiKkiq.2ne/iaE9ThcyHJXTHGox4GAAFM/fl4e', 'doctor', 'approved', 1),
('Test Pharmacist', 'pharm1783236287349@test.com', '3333333333', '$2a$10$ae/ASA3QNsqF1u.b11S5xO0qwcoo9hSjV2H.V1B89pFFHHvIAPs0W', 'pharmacist', 'approved', 1),
('Test Patient', 'pat1783236287349@test.com', '4444444444', '$2a$10$EVadZCC1cQWXL1S.CYtvFODXuJRJd4.RWnZn.OeBWpm86V6Tu8qQG', 'patient', 'approved', 1),
('Test Admin', 'admin1783236364185@test.com', '1111111111', '$2a$10$w0J1pPqwcTui0oZyWKc2xuLS/aJ8.f4/wIsn2QL2YBW9ZAXs5A/NC', 'admin', 'approved', 1),
('Test Doctor', 'doc1783236364185@test.com', '2222222222', '$2a$10$rODb93UWcVO57..dx58Fz.Fuzl1dCV65T2tU4bNj5Ob8BiWUmdp3O', 'doctor', 'approved', 1),
('Test Pharmacist', 'pharm1783236364185@test.com', '3333333333', '$2a$10$1Z9qGQZ3pl7Hpk.amKG/LegPe66Rv9NTPd7uChp1SLBTefcmlTXM6', 'pharmacist', 'approved', 1),
('Test Patient', 'pat1783236364185@test.com', '4444444444', '$2a$10$AZJWe493BEHzmEmTpvMJNuqPc4KzDLcZk.c1eEvkUvczKelRMxTNe', 'patient', 'approved', 1);

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
