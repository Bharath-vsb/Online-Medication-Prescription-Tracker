# 🏥 Online Medication and Prescription Tracker

A comprehensive, full-stack healthcare management system with role-based access control, a dark UI theme, intelligent AI assistance, and complete medication tracking capabilities backed by a robust MySQL database.

## 🌟 Features

### 🤖 Intelligent AI Assistant
- **Context-Aware Chat**: Built-in AI chat interface (`/api/ai/chat`) utilizing advanced LLMs (Groq / Gemini) to assist users.
- **Role-Specific Tools**: The AI dynamically selects tools based on the logged-in user's role (Admin, Doctor, Pharmacist, Patient).
- **Automated Insights**: Ask the AI to generate analytics, check low-stock inventory, summarize patient adherence, or look up prescription histories directly via natural language.

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

The system uses a **MySQL** relational database with the following tables:

1. **users**: id, full_name, email, mobile, password, role, status, enabled, etc.
2. **medicines**: id, name, created_at
3. **inventory**: id, medicine_id, batch_number, expiry_date, stock_quantity
4. **prescriptions**: id, doctor_id, patient_id, medicine_id, start_date, end_date, doses_per_day, status, bought, etc.
5. **sold_medicines**: id, prescription_id, medicine_id, quantity, sold_at
6. **reminders**: id, prescription_id, patient_id, reminder_time, status
7. **dose_confirmations**: id, reminder_id, status, confirmed_at
8. **notifications**: id, user_id, message, type, is_read
9. **audit_logs**: id, admin_id, action, target_user_id
10. **ai_chat_history**: Stores conversation context for the AI assistant

## 🚀 Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- **MySQL Server** (running locally or remote)

### Installation Steps

1. **Clone and Install dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment Variables**
   - Copy `.env.example` to `.env`
   - Fill in your MySQL database credentials and AI API keys (e.g., `GROQ_API_KEY`, `GEMINI_API_KEY`).
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=healthcare_management
   JWT_SECRET=your_jwt_secret_key
   GROQ_API_KEY=your_groq_key_here
   ```

3. **Initialize the Database**
   This script creates the schema, runs migrations, and pre-loads sample data and all your approved accounts.
   ```bash
   npm run init-db
   ```

4. **Start the server**
   ```bash
   # Development Mode (auto-reload)
   npm run dev

   # Production Mode
   npm start
   ```

5. **Access the application**
   - Open browser: `http://localhost:3000`

## 📝 Usage Guide

### First Time Setup

1. **Create Admin Account**
   - Click "Sign Up", fill in details, select "Admin" role, and enter secret code `0000`.
   - *Note: Default admin accounts may already be provisioned if you ran `npm run init-db`.*

2. **Register as Doctor / Pharmacist**
   - Sign up with the respective role.
   - Wait for Admin approval.
   - Once approved, log in to access your dashboard.

3. **Register as Patient**
   - Sign up with role "Patient". Auto-approved.

### Leveraging the AI Assistant
Click the **AI Chat** button (bottom right) to open the smart assistant. Depending on your role, you can ask things like:
- **Admin**: "Show me the system analytics for this week." or "Are there any pending user approvals?"
- **Doctor**: "What is the adherence rate for patient John Doe?"
- **Pharmacist**: "Which medicines are low in stock?" or "List all expired inventory."
- **Patient**: "When is my next dose due?" or "Summarize my active prescriptions."

## 🔧 Configuration

### Change Admin Secret Code
Edit `server.js`:
```javascript
if (role === 'admin' && secretCode !== 'YOUR_NEW_CODE') {
  // ...
}
```

## 🔒 Security Features
- Password hashing with **bcrypt**
- **JWT token authentication** for API routes and AI chat endpoints
- Role-based access control (RBAC) enforced at the API level
- Approval workflow for sensitive roles (Doctors/Pharmacists)
- Status checking at login (pending/rejected/disabled accounts are blocked)
- Audit logging for admin actions
- Input validation and XSS protection

## 🎯 Business Rules

### Prescription & Selling Rules
- Doctors cannot see inventory stock levels.
- End date auto-calculated from start date + duration.
- Pharmacists can only sell once per prescription. Requires sufficient stock, which is automatically reduced.
- Selling triggers auto-generation of patient reminders.

### Reminder Rules
- Only shown for active prescriptions that have been bought.
- Auto-generated based on frequency.
- Patient can edit reminder times but not count.

### Inventory Rules
- Low stock alert triggers at ≤100 units.
- Expired medicines clearly marked.
- Batch tracking for safety.

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login

### AI Assistant (Modular)
- `POST /api/ai/chat` - Interact with the AI assistant (context-aware)
- `DELETE /api/ai/history` - Clear user chat history

### Core Modules
- **Doctor**: `/api/medicines`, `/api/prescriptions`, `/api/doctor/analytics`, `/api/patients`
- **Pharmacist**: `/api/inventory` (CRUD), `/api/pharmacist/prescriptions`, `/api/pharmacist/sell/:id`, `/api/pharmacist/analytics`
- **Patient**: `/api/patient/prescriptions`, `/api/patient/reminders` (CRUD/confirm)
- **Admin**: `/api/admin/users` (approve/toggle/delete), `/api/admin/prescriptions`, `/api/admin/analytics`

## 🛠️ Technology Stack

### Backend
- **Node.js** & **Express.js**
- **MySQL2** (Promise-based database driver)
- **JWT** (Authentication) & **bcrypt** (Security)
- Modular Architecture separating Core Business Logic and AI Integration

### Frontend
- Vanilla JavaScript (no framework)
- HTML5 & CSS3 with Custom Properties
- Chart.js for Analytics Visualizations
- Google Fonts (JetBrains Mono + Manrope)

### AI Integration
- **Groq API** / **Gemini API** for ultra-fast LLM responses
- Extensible Tool-Calling Architecture

## 📄 License

MIT License - feel free to use this project for learning or production.

---

**Default Admin Credentials (if seeded):**
- Email: admin@healthcare.com
- Password: (Your seeded password)
- Role: Admin
