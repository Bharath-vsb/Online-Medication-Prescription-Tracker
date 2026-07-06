const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const medicinesData = [
  { name: 'Paracetamol 500mg', batch: 'PAR2024001', stock: 500, expiry: '2025-12-31' },
  { name: 'Ibuprofen 400mg', batch: 'IBU2024002', stock: 350, expiry: '2025-11-30' },
  { name: 'Amoxicillin 500mg', batch: 'AMX2024003', stock: 200, expiry: '2025-10-31' },
  { name: 'Azithromycin 250mg', batch: 'AZI2024004', stock: 150, expiry: '2026-03-31' },
  { name: 'Omeprazole 20mg', batch: 'OME2024005', stock: 400, expiry: '2026-06-30' },
  { name: 'Metformin 500mg', batch: 'MET2024006', stock: 600, expiry: '2026-08-31' },
  { name: 'Amlodipine 5mg', batch: 'AML2024007', stock: 250, expiry: '2026-05-31' },
  { name: 'Atorvastatin 10mg', batch: 'ATO2024008', stock: 300, expiry: '2026-07-31' },
  { name: 'Cetirizine 10mg', batch: 'CET2024009', stock: 80, expiry: '2025-09-30' },
  { name: 'Aspirin 75mg', batch: 'ASP2024010', stock: 450, expiry: '2026-02-28' },
  { name: 'Losartan 50mg', batch: 'LOS2024011', stock: 200, expiry: '2026-04-30' },
  { name: 'Levothyroxine 100mcg', batch: 'LEV2024012', stock: 150, expiry: '2025-08-31' },
  { name: 'Salbutamol Inhaler', batch: 'SAL2024013', stock: 100, expiry: '2026-10-31' },
  { name: 'Insulin Glargine', batch: 'INS2024014', stock: 50, expiry: '2025-05-31' },
  { name: 'Vitamin D3 1000IU', batch: 'VIT2024015', stock: 300, expiry: '2026-12-31' },
  { name: 'Lisinopril 10mg', batch: 'LIS2024016', stock: 250, expiry: '2026-01-31' },
  { name: 'Gabapentin 300mg', batch: 'GAB2024017', stock: 180, expiry: '2025-07-31' },
  { name: 'Sertraline 50mg', batch: 'SER2024018', stock: 220, expiry: '2026-09-30' },
  { name: 'Furosemide 40mg', batch: 'FUR2024019', stock: 140, expiry: '2025-11-30' },
  { name: 'Pantoprazole 40mg', batch: 'PAN2024020', stock: 350, expiry: '2026-06-30' }
];

const adminData = {
    full_name: 'System Admin',
    email: 'admin@healthcare.com',
    mobile: '1234567890',
    password: 'adminpassword123',
    role: 'admin',
    status: 'approved',
    enabled: 1
};

async function seedData() {
    console.log('🌱 Starting database seeding...');
    const config = {
        host:     process.env.DB_HOST     || 'localhost',
        user:     process.env.DB_USER     || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME     || 'healthcare_management',
    };
    
    let connection;
    try {
        connection = await mysql.createConnection(config);
        console.log('✅ Connected to database.');

        // 1. Seed Admin User
        console.log('\n--- Seeding Admin User ---');
        const [existingAdmin] = await connection.query(
            'SELECT id FROM users WHERE email = ?',
            [adminData.email]
        );

        if (existingAdmin.length > 0) {
            console.log(`   Admin user "${adminData.email}" already exists. Skipping.`);
        } else {
            const hashedPassword = await bcrypt.hash(adminData.password, 10);
            await connection.query(
                'INSERT INTO users (full_name, email, mobile, password, role, status, enabled) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [adminData.full_name, adminData.email, adminData.mobile, hashedPassword, adminData.role, adminData.status, adminData.enabled]
            );
            console.log(`   ✅ Created admin user "${adminData.email}" with password "${adminData.password}".`);
        }

        // 2. Seed Medicines and Inventory
        console.log('\n--- Seeding Medicines and Inventory ---');
        let addedMedicinesCount = 0;
        let addedInventoryCount = 0;

        for (const item of medicinesData) {
            // Check if medicine already exists
            const [existing] = await connection.query(
                'SELECT id FROM medicines WHERE name = ?', 
                [item.name]
            );

            let medicineId;
            if (existing.length > 0) {
                medicineId = existing[0].id;
                console.log(`   Medicine "${item.name}" already exists (ID: ${medicineId}).`);
            } else {
                const [result] = await connection.query(
                    'INSERT INTO medicines (name) VALUES (?)', 
                    [item.name]
                );
                medicineId = result.insertId;
                addedMedicinesCount++;
            }

            // Check if inventory for this batch already exists
            const [existingInventory] = await connection.query(
                'SELECT id FROM inventory WHERE batch_number = ?', 
                [item.batch]
            );

            if (existingInventory.length > 0) {
                console.log(`   Inventory batch "${item.batch}" already exists.`);
            } else {
                await connection.query(
                    'INSERT INTO inventory (medicine_id, batch_number, expiry_date, stock_quantity) VALUES (?, ?, ?, ?)',
                    [medicineId, item.batch, item.expiry, item.stock]
                );
                addedInventoryCount++;
            }
        }
        console.log(`\n🎉 Seeding complete! Added ${addedMedicinesCount} new medicines and ${addedInventoryCount} inventory batches.`);
    } catch (error) {
        console.error('❌ Error during seeding:', error);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

seedData();
