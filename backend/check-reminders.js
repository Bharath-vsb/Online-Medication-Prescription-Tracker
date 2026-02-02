const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkReminders() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '123456',
        database: 'online_medication_db'
    });

    console.log('=== Checking Prescriptions ===');
    const [prescriptions] = await connection.query(`
    SELECT id, patient_id, medicine_id, bought, status, start_date, end_date, frequency
    FROM prescriptions 
    WHERE bought = true AND status = 'active'
    LIMIT 5
  `);
    console.log('Active Bought Prescriptions:', prescriptions);

    console.log('\n=== Checking Reminders ===');
    const [reminders] = await connection.query(`
    SELECT id, prescription_id, patient_id, reminder_time, status
    FROM reminders
    WHERE DATE(reminder_time) = CURDATE()
    ORDER BY reminder_time
    LIMIT 10
  `);
    console.log('Today\'s Reminders:', reminders);

    console.log('\n=== Checking All Reminders Count ===');
    const [count] = await connection.query('SELECT COUNT(*) as total FROM reminders');
    console.log('Total Reminders in DB:', count[0].total);

    await connection.end();
}

checkReminders().catch(console.error);
