# Database Setup Guide

## Prerequisites

1. **MySQL Server** - Install MySQL 5.7+ or MariaDB 10.3+
   - Windows: Download from [mysql.com](https://dev.mysql.com/downloads/installer/)
   - Mac: `brew install mysql`
   - Linux: `sudo apt-get install mysql-server`

2. **Node.js Dependencies** - Already installed:
   - `mysql2` - MySQL client for Node.js
   - `dotenv` - Environment variable management

## Setup Instructions

### Step 1: Start MySQL Server

**Windows:**
```powershell
# Start MySQL service
net start MySQL80
```

**Mac/Linux:**
```bash
# Start MySQL service
sudo systemctl start mysql
# or
brew services start mysql
```

### Step 2: Create Database

Open MySQL command line:

```bash
mysql -u root -p
```

Run the schema file:

```sql
source C:/Users/ELCOT/Downloads/files (1)/files (1)/database/schema.sql
```

Or from command line:

```powershell
# Windows PowerShell
Get-Content "C:\Users\ELCOT\Downloads\files (1)\files (1)\database\schema.sql" | mysql -u root -p

# Or using mysql command directly
mysql -u root -p < "C:\Users\ELCOT\Downloads\files (1)\files (1)\database\schema.sql"
```

### Step 3: Configure Environment Variables

Edit the `.env` file in the project root:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=YOUR_MYSQL_PASSWORD_HERE
DB_NAME=healthcare_management
PORT=3000
JWT_SECRET=your-secret-key-change-in-production
```

**IMPORTANT**: Replace `YOUR_MYSQL_PASSWORD_HERE` with your actual MySQL root password.

### Step 4: Verify Database Setup

Login to MySQL and verify:

```sql
USE healthcare_management;

-- Check tables
SHOW TABLES;

-- Verify sample data
SELECT * FROM users;
SELECT * FROM medicines;
SELECT * FROM inventory;
```

You should see:
- 9 tables created
- 1 admin user
- 15 medicines
- 10 inventory items

### Step 5: Start the Application

```powershell
cd "C:\Users\ELCOT\Downloads\files (1)\files (1)"
npm start
```

You should see:
```
✅ Database connected successfully
✅ Server running on http://localhost:3000
```

## Troubleshooting

### Error: "Access denied for user 'root'@'localhost'"

**Solution**: Update `.env` file with correct MySQL password

```env
DB_PASSWORD=your_actual_password
```

### Error: "Database 'healthcare_management' doesn't exist"

**Solution**: Run the schema.sql file again:

```powershell
mysql -u root -p < "C:\Users\ELCOT\Downloads\files (1)\files (1)\database\schema.sql"
```

### Error: "Can't connect to MySQL server"

**Solution**: Ensure MySQL service is running:

```powershell
# Check MySQL service status
Get-Service MySQL80

# Start if not running
net start MySQL80
```

### Error: "ER_NOT_SUPPORTED_AUTH_MODE"

**Solution**: Update MySQL authentication method:

```sql
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'your_password';
FLUSH PRIVILEGES;
```

## Database Schema Overview

### Tables Created:

1. **users** - All user accounts (admin, doctor, pharmacist, patient)
2. **medicines** - Master list of medicines
3. **inventory** - Pharmacist stock management
4. **prescriptions** - Doctor prescriptions
5. **sold_medicines** - Sales history
6. **reminders** - Patient medication reminders
7. **dose_confirmations** - Dose tracking
8. **notifications** - User notifications
9. **audit_logs** - Admin action logs

### Sample Data Included:

- **1 Admin User**
  - Email: admin@healthcare.com
  - Password: admin123
  - Role: Admin

- **15 Medicines**
  - Paracetamol, Ibuprofen, Amoxicillin, etc.

- **10 Inventory Items**
  - With batch numbers, expiry dates, and stock quantities

## Testing the Database

### Test 1: Login

Visit `http://localhost:3000` and login with:
- Email: admin@healthcare.com
- Password: admin123
- Role: Admin

### Test 2: Create a User

Sign up as a new patient and verify the user appears in the database:

```sql
SELECT * FROM users ORDER BY created_at DESC LIMIT 1;
```

### Test 3: Check Medicines

Login as doctor and verify medicines appear in the dropdown:

```sql
SELECT id, name FROM medicines ORDER BY name;
```

## Backup and Restore

### Create Backup

```powershell
mysqldump -u root -p healthcare_management > backup.sql
```

### Restore from Backup

```powershell
mysql -u root -p healthcare_management < backup.sql
```

## Production Considerations

1. **Change Default Credentials**
   - Update JWT_SECRET in `.env`
   - Change admin password after first login

2. **Database User**
   - Create a dedicated MySQL user (don't use root)
   ```sql
   CREATE USER 'healthcare_app'@'localhost' IDENTIFIED BY 'strong_password';
   GRANT ALL PRIVILEGES ON healthcare_management.* TO 'healthcare_app'@'localhost';
   FLUSH PRIVILEGES;
   ```

3. **Regular Backups**
   - Set up automated daily backups
   - Store backups in secure location

4. **Connection Pooling**
   - Already configured in `backend/config/database.js`
   - Adjust `connectionLimit` based on load

## Next Steps

1. ✅ Database created and configured
2. ✅ Sample data loaded
3. ✅ Application connected to database
4. 🔄 Test all features (signup, login, prescriptions, etc.)
5. 🔄 Deploy to production (if needed)
