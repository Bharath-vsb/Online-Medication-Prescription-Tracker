const db = require('./config/database');

async function debugReminders() {
    const connection = await db.getConnection();

    try {
        console.log('=== Debugging Reminders ===\n');

        // Check if patient exists
        const [patients] = await connection.query(`
      SELECT id, email, full_name 
      FROM users 
      WHERE role = 'patient'
      LIMIT 5
    `);
        console.log('Patients in database:', patients);

        // Check all reminders
        const [allReminders] = await connection.query(`
      SELECT r.*, u.email as patient_email, p.medicine_id
      FROM reminders r
      JOIN users u ON r.patient_id = u.id
      JOIN prescriptions p ON r.prescription_id = p.id
      ORDER BY r.reminder_time
    `);
        console.log('\nAll Reminders:', allReminders);

        // Check today's reminders
        const [todayReminders] = await connection.query(`
      SELECT r.*, u.email as patient_email, p.medicine_id,
             DATE(r.reminder_time) as reminder_date,
             TIME(r.reminder_time) as reminder_time_only
      FROM reminders r
      JOIN users u ON r.patient_id = u.id
      JOIN prescriptions p ON r.prescription_id = p.id
      WHERE DATE(r.reminder_time) = CURDATE()
    `);
        console.log('\nToday\'s Reminders:', todayReminders);

        // Check prescriptions
        const [prescriptions] = await connection.query(`
      SELECT p.*, u.email as patient_email, m.name as medicine_name
      FROM prescriptions p
      JOIN users u ON p.patient_id = u.id
      JOIN medicines m ON p.medicine_id = m.id
      WHERE p.bought = true AND p.status = 'active'
    `);
        console.log('\nActive Bought Prescriptions:', prescriptions);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        connection.release();
        process.exit(0);
    }
}

debugReminders();
