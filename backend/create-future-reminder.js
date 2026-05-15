const db = require('./config/database');

async function createTomorrowTestReminder() {
    const connection = await db.getConnection();

    try {
        console.log('=== Creating Test Reminder for Tomorrow ===\n');

        // Get an active prescription
        const [prescription] = await connection.query(`
      SELECT * FROM prescriptions 
      WHERE bought = true AND status = 'active'
      LIMIT 1
    `);

        if (prescription.length > 0) {
            const p = prescription[0];

            // Calculate tomorrow at 10:00 AM
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(10, 0, 0, 0);

            // Check if reminder already exists for tomorrow at 10 AM
            const [existing] = await connection.query(`
        SELECT * FROM reminders 
        WHERE prescription_id = ? 
          AND reminder_time = ?
      `, [p.id, tomorrow]);

            if (existing.length === 0) {
                await connection.query(`
          INSERT INTO reminders (prescription_id, patient_id, reminder_time, status)
          VALUES (?, ?, ?, 'pending')
        `, [p.id, p.patient_id, tomorrow]);

                console.log(`✅ Created test reminder for tomorrow at ${tomorrow.toLocaleString()}`);
                console.log('   (Patient ID: ' + p.patient_id + ')');
            } else {
                console.log('⚠️ Reminder for tomorrow at 10:00 AM already exists');
            }

            // Also ensure we have a reminder for today (pending) for testing
            const today = new Date();
            today.setMinutes(today.getMinutes() + 10); // 10 mins from now

            await connection.query(`
          INSERT INTO reminders (prescription_id, patient_id, reminder_time, status)
          VALUES (?, ?, ?, 'pending')
        `, [p.id, p.patient_id, today]);

            console.log(`✅ Created test reminder for today at ${today.toLocaleTimeString()}`);

        } else {
            console.log('❌ No active prescriptions found to create reminders for');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        connection.release();
        process.exit(0);
    }
}

createTomorrowTestReminder();
