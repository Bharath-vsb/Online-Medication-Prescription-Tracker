const db = require('./config/database');

async function checkAndCreateTomorrowReminders() {
    const connection = await db.getConnection();

    try {
        console.log('=== Checking Reminder Status ===\n');

        // Check all reminders with their status
        const [allReminders] = await connection.query(`
      SELECT r.id, r.prescription_id, r.patient_id, r.reminder_time, r.status,
             DATE(r.reminder_time) as date, TIME(r.reminder_time) as time
      FROM reminders r
      ORDER BY r.reminder_time
    `);

        console.log('All Reminders:');
        allReminders.forEach(r => {
            console.log(`  ID: ${r.id}, Date: ${r.date}, Time: ${r.time}, Status: ${r.status}`);
        });

        // Check if today's reminder was auto-marked as missed
        const [todayMissed] = await connection.query(`
      SELECT COUNT(*) as count
      FROM reminders
      WHERE DATE(reminder_time) = CURDATE() AND status = 'missed'
    `);
        console.log(`\nToday's missed reminders: ${todayMissed[0].count}`);

        // Check tomorrow's reminders
        const [tomorrowReminders] = await connection.query(`
      SELECT r.id, r.reminder_time, r.status
      FROM reminders r
      WHERE DATE(r.reminder_time) = DATE_ADD(CURDATE(), INTERVAL 1 DAY)
    `);

        console.log(`\nTomorrow's reminders: ${tomorrowReminders.length}`);
        tomorrowReminders.forEach(r => {
            console.log(`  Time: ${r.reminder_time}, Status: ${r.status}`);
        });

        // Create a test reminder for RIGHT NOW to test the system
        console.log('\n=== Creating Test Reminder for NOW ===');

        const [prescription] = await connection.query(`
      SELECT * FROM prescriptions 
      WHERE bought = true AND status = 'active'
      LIMIT 1
    `);

        if (prescription.length > 0) {
            const p = prescription[0];
            const now = new Date();

            // Create a reminder for 2 minutes from now
            const testTime = new Date(now.getTime() + 2 * 60 * 1000);

            await connection.query(`
        INSERT INTO reminders (prescription_id, patient_id, reminder_time, status)
        VALUES (?, ?, ?, 'pending')
      `, [p.id, p.patient_id, testTime]);

            console.log(`✅ Created test reminder for ${testTime.toLocaleTimeString()}`);
            console.log(`   (2 minutes from now - you can test the "DUE NOW" status)`);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        connection.release();
        process.exit(0);
    }
}

checkAndCreateTomorrowReminders();
