# 🏥 Online Medication and Prescription Tracker

A comprehensive, full-stack healthcare management system with role-based access control, dark UI theme, and complete medication tracking capabilities.

## 🌟 Features

### 🔐 Authentication & Authorization
- **Multi-role system**: Doctor, Patient, Pharmacist, Admin
- **Secure authentication**: JWT-based with bcrypt password hashing
- **Approval workflow**: Doctors and Pharmacists require admin approval
- **Admin secret code**: `0000` for admin registration

### 👨‍⚕️ Doctor Module
- Create prescriptions with multiple medicines
- Auto-calculate end dates and doses per day
- View active and completed prescriptions
- Track patient adherence rates
- Real-time analytics dashboard

### 👩‍⚕️ Pharmacist Module
- Complete inventory management (CRUD operations)
- Low stock alerts (≤100 units)
- Expired medicine tracking
- Prescription fulfillment system
- One-time selling per prescription
- Automatic stock reduction
- Sales history tracking
- Monthly sales analytics

### 🧑‍🦱 Patient Module
- View active and completed prescriptions
- Medication reminders based on prescription frequency
- Confirm doses taken or mark as missed
- Adherence tracking and analytics
- Weekly adherence visualization

### 🛡️ Admin Module
- User approval/rejection system
- Enable/disable user accounts
- Delete users
- View all prescriptions (read-only)
- View inventory details (read-only)
- System-wide analytics
- Audit logging

## 🎨 Design Features

### Dark Theme UI
- Modern dark color scheme
- Gradient accents (Blue/Green)
- Status-based color coding:
  - 🔵 Blue → Primary actions
  - 🟢 Green → Success states
  - 🟠 Orange → Warnings
  - 🔴 Red → Errors/Danger
- Dark-themed charts and analytics
- Smooth animations and transitions

## 🗄️ Database Schema

The system uses an in-memory database with the following tables:

1. **Users**
   - id, fullName, email, mobile, password, role
   - medicalLicenseNumber (for doctors)
   - status (pending/approved/rejected)
   - enabled (boolean)

2. **Medicines Master**
   - id, name, createdAt

3. **Inventory Stock**
   - id, medicineId, medicineName
   - batchNumber, expiryDate, stockQuantity

4. **Prescriptions**
   - id, prescriptionGroupId, doctorId, patientId
   - medicineId, medicineName
   - startDate, endDate, duration, frequency
   - dosesPerDay, totalQuantity, status, bought

5. **Sold Medicines**
   - id, prescriptionId, medicineId
   - quantity, soldAt

6. **Reminders**
   - id, prescriptionId, patientId
   - reminderTime, status

7. **Dose Confirmations**
   - id, reminderId, prescriptionId, patientId
   - status, confirmedAt

8. **Notifications**
   - id, userId, message, type, read

9. **Audit Logs**
   - id, adminId, action, targetUserId, timestamp

## 🚀 Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation Steps

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start the server**
   ```bash
   npm start
   ```

3. **Access the application**
   - Open browser: `http://localhost:3000`

### Development Mode
```bash
npm run dev
```

## 📝 Usage Guide

### First Time Setup

1. **Create Admin Account**
   - Click "Sign Up"
   - Fill in details
   - Select role: "Admin"
   - Enter secret code: `0000`
   - Login with admin credentials

2. **Register as Doctor**
   - Sign up with role "Doctor"
   - Provide Medical License Number
   - Wait for admin approval
   - Once approved, login to access dashboard

3. **Register as Pharmacist**
   - Sign up with role "Pharmacist"
   - Wait for admin approval
   - Once approved, login to manage inventory

4. **Register as Patient**
   - Sign up with role "Patient"
   - Auto-approved, can login immediately

### Doctor Workflow

1. **Create Prescription**
   - Select patient from list
   - Choose medicine (or add new)
   - Set start date and duration
   - Select frequency
   - System auto-calculates end date and total quantity

2. **View Prescriptions**
   - Active tab: Current prescriptions
   - History tab: Completed prescriptions

3. **Analytics**
   - Total prescriptions count
   - Active vs completed breakdown
   - Average patient adherence

### Pharmacist Workflow

1. **Manage Inventory**
   - Add new medicines with batch/expiry/stock
   - Update existing inventory
   - Delete items
   - Monitor low stock alerts
   - Track expired medicines

2. **Sell Prescriptions**
   - View active prescriptions
   - Check available stock
   - Click "Sell" to fulfill
   - Stock auto-reduces
   - Reminders auto-generated for patient

3. **View Sales History**
   - Track all sold medicines
   - View quantities and dates

### Patient Workflow

1. **View Prescriptions**
   - See active and completed prescriptions
   - Check if medicines are bought

2. **Medication Reminders**
   - Automatic reminders when medicine is bought
   - Based on prescription frequency
   - Edit reminder times
   - Confirm taken or mark missed

3. **Track Adherence**
   - View overall adherence percentage
   - Weekly adherence graph
   - Monitor compliance

### Admin Workflow

1. **Approve Users**
   - Review pending doctor/pharmacist registrations
   - Approve or reject
   - Users notified of status

2. **Manage Users**
   - Enable/disable accounts
   - Delete users
   - View all user details

3. **Monitor System**
   - View all prescriptions
   - Check inventory status
   - System-wide analytics

## 🔧 Configuration

### Change Admin Secret Code
Edit `server.js`:
```javascript
if (role === 'admin' && secretCode !== 'YOUR_NEW_CODE') {
  // ...
}
```

### Change JWT Secret
Edit `server.js`:
```javascript
const JWT_SECRET = 'your-secure-secret-key';
```

### Change Port
Edit `server.js`:
```javascript
const PORT = 3000; // Change to your preferred port
```

## 🔒 Security Features

- Password hashing with bcrypt
- JWT token authentication
- Role-based access control
- Approval workflow for sensitive roles
- Status checking at login
- Audit logging for admin actions
- Input validation
- XSS protection

## 🎯 Business Rules

### Prescription Rules
- Doctors cannot see inventory stock levels
- End date auto-calculated from start date + duration
- Frequency determines doses per day
- Alert sent to pharmacist if medicine not in inventory

### Selling Rules
- Can only sell once per prescription
- Requires sufficient stock
- Automatically reduces inventory
- Marks prescription as "bought"
- Generates patient reminders

### Reminder Rules
- Only shown for active prescriptions
- Only shown if medicine is bought
- Auto-generated based on frequency
- Patient can edit times but not count
- Stops after prescription completion

### Inventory Rules
- Low stock alert at ≤100 units
- Expired medicines clearly marked
- Batch tracking for safety

## 📊 Frequency Options

- **Once per day** → 1 dose/day
- **Twice per day** → 2 doses/day
- **Three times per day** → 3 doses/day
- **Four times per day** → 4 doses/day
- **Every 6 hours** → 4 doses/day
- **Every 8 hours** → 3 doses/day

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Doctor
- `GET /api/medicines` - Get all medicines
- `POST /api/prescriptions` - Create prescription
- `GET /api/doctor/prescriptions` - Get prescriptions
- `GET /api/doctor/analytics` - Get analytics
- `GET /api/patients` - Get patients list

### Pharmacist
- `POST /api/inventory` - Add inventory
- `GET /api/inventory` - Get inventory
- `PUT /api/inventory/:id` - Update inventory
- `DELETE /api/inventory/:id` - Delete inventory
- `GET /api/pharmacist/prescriptions` - Get prescriptions
- `POST /api/pharmacist/sell/:id` - Sell medicine
- `GET /api/pharmacist/analytics` - Get analytics

### Patient
- `GET /api/patient/prescriptions` - Get prescriptions
- `GET /api/patient/reminders` - Get reminders
- `PUT /api/patient/reminders/:id` - Update reminder
- `POST /api/patient/reminders/:id/confirm` - Confirm/skip dose
- `GET /api/patient/analytics` - Get analytics

### Admin
- `GET /api/admin/users` - Get all users
- `PUT /api/admin/users/:id/status` - Approve/reject user
- `PUT /api/admin/users/:id/toggle` - Enable/disable user
- `DELETE /api/admin/users/:id` - Delete user
- `GET /api/admin/prescriptions` - Get all prescriptions
- `GET /api/admin/analytics` - Get analytics

## 🔄 Automation Features

1. **Auto-completion**: Prescriptions auto-complete after end date
2. **Auto-calculation**: End dates and quantities calculated automatically
3. **Auto-reminders**: Generated when medicine is sold
4. **Auto-alerts**: Low stock and expired medicine notifications
5. **Auto-sync**: Medicine dropdowns update when new medicines added

## 📱 Responsive Design

- Mobile-friendly layouts
- Adaptive navigation
- Touch-optimized controls
- Responsive tables
- Flexible grid system

## 🛠️ Technology Stack

### Backend
- Node.js
- Express.js
- JWT for authentication
- bcrypt for password hashing

### Frontend
- Vanilla JavaScript (no framework)
- HTML5
- CSS3 with custom properties
- Chart.js for analytics
- Google Fonts (JetBrains Mono + Manrope)

### Storage
- In-memory database (for demonstration)
- Can be replaced with MongoDB/PostgreSQL

## 🔮 Future Enhancements

- Database integration (MongoDB/PostgreSQL)
- Email notifications
- SMS reminders
- Prescription PDF generation
- Advanced reporting
- Multi-language support
- Mobile app (React Native)
- Real-time notifications (Socket.io)
- Barcode scanning
- Insurance integration

## 📄 License

MIT License - feel free to use this project for learning or production.

## 🤝 Support

For issues, questions, or contributions, please open an issue on the repository.

---

**Default Admin Credentials:**
- Email: admin@healthcare.com
- Password: admin123
- Role: Admin

**Note**: In production, replace the in-memory database with a proper database system and update all security configurations.
