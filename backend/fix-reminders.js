const db = require('./config/database');

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

    let count = 0;
    while (currentDate <= end) {
        for (const time of reminderTimes) {
            const [hours, minutes] = time.split(':');
            const reminderDateTime = new Date(currentDate);
            reminderDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

            await connection.query(
                'INSERT INTO reminders (prescription_id, patient_id, reminder_time, status) VALUES (?, ?, ?, ?)',
                [id, patient_id, reminderDateTime, 'pending']
            );
            count++;
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }

    return count;
}

async function fixReminders() {
    const connection = await db.getConnection();

    try {
        console.log('=== Fixing Reminders for Existing Prescriptions ===\n');

        // Get all bought prescriptions that don't have reminders
        const [prescriptions] = await connection.query(`
      SELECT p.* 
      FROM prescriptions p
      LEFT JOIN reminders r ON p.id = r.prescription_id
      WHERE p.bought = true 
        AND p.status = 'active'
        AND r.id IS NULL
    `);

        console.log(`Found ${prescriptions.length} prescriptions without reminders\n`);

        for (const prescription of prescriptions) {
            console.log(`Generating reminders for prescription ID ${prescription.id}...`);
            console.log(`  Medicine ID: ${prescription.medicine_id}`);
            console.log(`  Patient ID: ${prescription.patient_id}`);
            console.log(`  Frequency: ${prescription.frequency}`);
            console.log(`  Duration: ${prescription.start_date} to ${prescription.end_date}`);

            const count = await generateReminders(connection, prescription);
            console.log(`  ✅ Created ${count} reminders\n`);
        }

        console.log('=== Summary ===');
        const [total] = await connection.query('SELECT COUNT(*) as count FROM reminders');
        console.log(`Total reminders in database: ${total[0].count}`);

        const [today] = await connection.query(`
      SELECT COUNT(*) as count 
      FROM reminders 
      WHERE DATE(reminder_time) = CURDATE()
    `);
        console.log(`Reminders for today: ${today[0].count}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        connection.release();
        process.exit(0);
    }
}

fixReminders();
