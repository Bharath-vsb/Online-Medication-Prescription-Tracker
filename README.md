<div align="center">

# 💊 Online Medication & Prescription Tracker

### A Comprehensive Healthcare Management Platform for Patients, Doctors, Pharmacists, and Administrators

<p align="center">
A modern, secure, AI-powered healthcare management system that simplifies prescription management, medication tracking, pharmacy inventory, appointment workflows, and intelligent healthcare assistance through role-based access control.
</p>

<p align="center">

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-Backend-black?style=for-the-badge&logo=express)
![MySQL](https://img.shields.io/badge/MySQL-Database-4479A1?style=for-the-badge&logo=mysql&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-Authentication-orange?style=for-the-badge&logo=jsonwebtokens)
![AI](https://img.shields.io/badge/AI-Groq%20%7C%20Gemini-blueviolet?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

</p>

---

### 🚀 Built to Digitalize Healthcare Management

**Online Medication & Prescription Tracker** is a full-stack healthcare management platform designed to bridge the communication gap between patients, doctors, pharmacists, and administrators.

The system enables secure prescription generation, medication reminders, pharmacy inventory management, AI-powered healthcare assistance, analytics dashboards, and role-based workflows through an intuitive web application.

Designed using modern web technologies, the platform enhances healthcare accessibility while maintaining security, scalability, and operational efficiency.

</div>

---

# 📑 Table of Contents

- Project Overview
- Key Features
- System Highlights
- Technology Stack
- Software Architecture
- Application Workflow
- User Roles
- Project Architecture
- AI Architecture
- Core Modules
- Screenshots
- Installation Guide
- API Documentation
- Database Design
- Security
- Deployment
- Future Enhancements
- Contributors
- License

---

# 🌟 Project Overview

Healthcare organizations often struggle with fragmented communication between patients, doctors, and pharmacies. Traditional prescription systems rely heavily on paperwork, making medication tracking difficult while increasing the chances of prescription errors.

The **Online Medication & Prescription Tracker** digitizes the entire medication lifecycle by allowing doctors to prescribe medicines electronically, pharmacists to manage inventory efficiently, patients to receive medication reminders, and administrators to oversee the entire healthcare ecosystem.

The platform also integrates an AI-powered assistant capable of answering user queries, retrieving healthcare insights, and assisting administrators with system analytics.

---

# ✨ Key Features

## 👨‍⚕️ Doctor Module

- Secure authentication
- Doctor approval workflow
- Dashboard analytics
- Patient search
- Electronic prescription creation
- Medicine selection
- Prescription history
- AI Assistant support
- Profile management

---

## 🧑 Patient Module

- Registration
- Login
- Active prescriptions
- Prescription history
- Medication reminders
- Reminder customization
- Dashboard analytics
- AI Healthcare Assistant
- Profile management

---

## 💊 Pharmacist Module

- Inventory Dashboard
- Medicine CRUD
- Low Stock Alerts
- Dispense Medicines
- Prescription Verification
- Sales Tracking
- Stock Analytics
- AI Assistant
- Inventory Reports

---

## 🛡 Administrator Module

- Manage Doctors
- Manage Pharmacists
- User Approval
- System Analytics
- Audit Logs
- Dashboard
- AI Administration Assistant
- Database Monitoring
- User Management
- System Reports

---

# 🚀 System Highlights

✅ Multi-Role Authentication

✅ JWT Security

✅ Role-Based Authorization

✅ AI Powered Healthcare Assistant

✅ RESTful APIs

✅ Smart Prescription Management

✅ Inventory Tracking

✅ Medication Reminder System

✅ Dashboard Analytics

✅ PDF Prescription Support

✅ Secure Password Hashing (bcrypt)

✅ Audit Logging

✅ Responsive Interface

✅ Modern UI

---

# 🛠 Technology Stack

## Frontend

| Technology | Purpose |
|------------|---------|
| HTML5 | Structure |
| CSS3 | Styling |
| JavaScript | Client-side Logic |
| Bootstrap | Responsive Design |

---

## Backend

| Technology | Purpose |
|------------|---------|
| Node.js | Runtime |
| Express.js | REST APIs |
| JWT | Authentication |
| bcrypt | Password Encryption |
| Multer | File Uploads |
| PDFKit | PDF Generation |

---

## Database

| Technology | Purpose |
|------------|---------|
| MySQL | Relational Database |

---

## Artificial Intelligence

| Technology | Purpose |
|------------|---------|
| Groq API | AI Chat Assistant |
| Gemini API | AI Integration |
| Function Calling | Intelligent Tool Execution |

---

# 🏗 Software Architecture

```text
                Users

 ┌────────┬────────┬──────────────┬────────┐
 │ Patient│ Doctor │ Pharmacist  │ Admin  │
 └────────┴────────┴──────────────┴────────┘
                  │
                  ▼
         Web Browser Interface
                  │
                  ▼
          Frontend Application
                  │
                  ▼
         Express REST API Server
                  │
      ┌───────────┴────────────┐
      │ Authentication Layer   │
      │ JWT Middleware          │
      │ Role Validation         │
      └───────────┬────────────┘
                  │
        ┌─────────┼───────────┐
        │         │           │
        ▼         ▼           ▼
 Prescription  Inventory   AI Assistant
    Module      Module       Module
        │         │           │
        └─────────┼───────────┘
                  ▼
           MySQL Database
```

---

# 🔄 High-Level System Workflow

```text
User Login
     │
     ▼
JWT Authentication
     │
     ▼
Role Verification
     │
     ▼
Dashboard
     │
     ▼
Role Specific Modules
     │
     ├── Doctor
     ├── Patient
     ├── Pharmacist
     └── Admin
     │
     ▼
Database Operations
     │
     ▼
Response
```

---

# 👥 User Roles

| Role | Responsibilities |
|------|------------------|
| 👨‍⚕️ Doctor | Manage patients, create prescriptions, view history |
| 🧑 Patient | View prescriptions, reminders, profile |
| 💊 Pharmacist | Inventory management, medicine dispensing |
| 🛡 Admin | Manage users, analytics, approvals, reports |

---

# 📊 System Modules

```
Authentication
│
├── Login
├── Register
├── JWT
└── Authorization

Doctor
│
├── Dashboard
├── Prescriptions
├── Patients
└── AI Assistant

Patient
│
├── Dashboard
├── Prescriptions
├── Reminders
└── History

Pharmacist
│
├── Inventory
├── Medicine Sales
├── Reports
└── Alerts

Admin
│
├── User Management
├── Analytics
├── Audit Logs
└── Reports

AI
│
├── Chat
├── Tool Calling
├── Analytics
└── Healthcare Assistance
```

---

# ⭐ Why This Project?

This platform demonstrates the implementation of modern full-stack software engineering principles in the healthcare domain. It combines secure authentication, RESTful architecture, role-based access control, AI integration, database management, and responsive user experience into a single scalable solution.

It serves as an excellent academic project while also showcasing practical skills in backend development, frontend integration, database design, authentication, and AI-powered application development.

---

---

# 📂 Project Structure

```
Online-Medication-Prescription-Tracker
│
├── 📁 backend
│   ├── 📁 config                # Database and application configuration
│   ├── 📁 controllers           # Business logic for API requests
│   ├── 📁 middleware            # JWT authentication & role verification
│   ├── 📁 models                # Database models
│   ├── 📁 routes                # REST API endpoints
│   ├── 📁 services              # Core business services
│   ├── 📁 ai                    # AI Assistant & Tool Calling
│   ├── 📁 utils                 # Utility/helper functions
│   ├── server.js                # Express server entry point
│   └── package.json
│
├── 📁 frontend
│   ├── 📁 css
│   ├── 📁 js
│   ├── 📁 assets
│   ├── 📁 images
│   ├── index.html
│   └── dashboard.html
│
├── 📁 database
│   ├── schema.sql
│   ├── seed_data.sql
│   └── db-init.js
│
├── 📁 docs
│   ├── API_DOCS.md
│   ├── ARCHITECTURE.md
│   ├── DATABASE_SETUP.md
│   └── DEPLOYMENT.md
│
├── .env.example
├── package.json
└── README.md
```

---

# ⚙️ System Requirements

Before running the application, ensure the following software is installed:

| Software | Version |
|----------|----------|
| Node.js | 18.x or above |
| npm | Latest |
| MySQL | 8.x |
| Git | Latest |
| VS Code | Recommended |

---

# 🚀 Installation Guide

## 1️⃣ Clone the Repository

```bash
git clone https://github.com/Bharath-vsb/Online-Medication-Prescription-Tracker.git
```

Move into the project directory:

```bash
cd Online-Medication-Prescription-Tracker
```

---

## 2️⃣ Install Dependencies

Backend:

```bash
cd backend
npm install
```

Frontend (if applicable):

```bash
cd frontend
npm install
```

---

## 3️⃣ Configure Environment Variables

Create a `.env` file inside the backend directory.

Example:

```env
PORT=5000

DB_HOST=localhost
DB_PORT=3306
DB_NAME=medication_tracker
DB_USER=root
DB_PASSWORD=your_password

JWT_SECRET=your_jwt_secret

GROQ_API_KEY=your_groq_api_key
GEMINI_API_KEY=your_gemini_api_key
```

> **Important:** Never commit your `.env` file or API keys to GitHub.

---

## 4️⃣ Database Setup

Create the database:

```sql
CREATE DATABASE medication_tracker;
```

Run the schema:

```bash
mysql -u root -p medication_tracker < database/schema.sql
```

(Optional) Load sample data:

```bash
mysql -u root -p medication_tracker < database/seed_data.sql
```

---

## 5️⃣ Start the Backend Server

```bash
npm start
```

For development:

```bash
npm run dev
```

The server will run at:

```
http://localhost:5000
```

---

## 6️⃣ Launch the Frontend

Open the frontend in your browser or start the frontend development server if configured.

```
http://localhost:3000
```

---

# 📡 API Overview

The backend exposes RESTful APIs for all system operations.

## Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Authenticate user |
| POST | `/api/auth/logout` | Logout current user |

---

## Doctor APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/doctor/dashboard` | Doctor dashboard |
| POST | `/api/prescriptions` | Create prescription |
| GET | `/api/prescriptions` | View prescriptions |
| GET | `/api/patients` | Search patients |

---

## Patient APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/patient/dashboard` | Dashboard |
| GET | `/api/prescriptions/active` | Active prescriptions |
| GET | `/api/reminders` | Medication reminders |
| PUT | `/api/profile` | Update profile |

---

## Pharmacist APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/inventory` | View medicines |
| POST | `/api/inventory` | Add medicine |
| PUT | `/api/inventory/:id` | Update stock |
| DELETE | `/api/inventory/:id` | Delete medicine |
| POST | `/api/dispense` | Dispense prescription |

---

## Administrator APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/dashboard` | Dashboard |
| GET | `/api/users` | Manage users |
| PUT | `/api/users/:id/status` | Approve or reject users |
| GET | `/api/analytics` | System analytics |
| GET | `/api/audit-logs` | Audit trail |

---

# 🔐 Authentication Flow

```
User Login
     │
     ▼
Email & Password
     │
     ▼
Password Verification (bcrypt)
     │
     ▼
JWT Token Generated
     │
     ▼
Token Sent to Client
     │
     ▼
Protected API Access
     │
     ▼
Role Authorization
```

---

# 🔒 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Role-Based Access Control (RBAC)
- Secure API endpoints
- Input validation
- Error handling
- Audit logging
- Environment-based configuration
- Protected routes
- API authorization middleware

---

# 📊 Database Overview

The system stores information for:

- Users
- Patients
- Doctors
- Pharmacists
- Administrators
- Prescriptions
- Medicines
- Inventory
- Medication Reminders
- AI Conversations
- Audit Logs
- Notifications

---

# 🧩 Core Functional Modules

### Authentication Module
- Secure registration
- Login
- JWT authentication
- Password encryption

### Prescription Module
- Create prescriptions
- View prescription history
- Prescription validation
- PDF generation

### Inventory Module
- Medicine CRUD
- Stock updates
- Low stock alerts
- Dispensing workflow

### Reminder Module
- Medication scheduling
- Daily reminders
- Completion tracking

### Analytics Module
- User statistics
- Prescription analytics
- Inventory insights
- Dashboard metrics

### AI Module
- Healthcare assistant
- Tool calling
- Intelligent query processing
- Analytics assistance

---

# 🖼️ Application Screenshots

> Add screenshots of your application in the `docs/screenshots` folder.

Suggested images:

```
docs/
└── screenshots/
    ├── login.png
    ├── admin-dashboard.png
    ├── doctor-dashboard.png
    ├── patient-dashboard.png
    ├── pharmacist-dashboard.png
    ├── prescription-page.png
    ├── inventory.png
    ├── ai-assistant.png
    └── analytics.png
```

Then reference them like this:

```markdown
## Login Page

![Login](docs/screenshots/login.png)

## Admin Dashboard

![Admin](docs/screenshots/admin-dashboard.png)
```

---

# 🧪 Testing

To verify the application:

1. Register users for each role.
2. Approve doctors and pharmacists through the admin panel.
3. Log in with each role.
4. Create and manage prescriptions.
5. Dispense medicines and observe inventory updates.
6. Configure medication reminders.
7. Interact with the AI assistant.
8. Review analytics and audit logs.

---

---

# 🤖 AI Assistant Architecture

The application integrates an intelligent AI Assistant that enhances the healthcare experience for every user role.

The AI assistant is capable of:

- 💬 Answering healthcare-related questions
- 📋 Retrieving prescription information
- 📊 Generating system analytics
- 💊 Providing medicine information
- 📦 Checking inventory status
- 👥 Assisting administrators with management tasks
- 🔍 Intelligent database querying through tool calling

---

## AI Request Flow

```text
                 User
                   │
                   ▼
        Natural Language Query
                   │
                   ▼
           AI Assistant Service
                   │
          Intent Recognition
                   │
         ┌─────────┴─────────┐
         │                   │
         ▼                   ▼
 General Response      Tool Calling
         │                   │
         ▼                   ▼
                     Backend Services
                           │
         ┌─────────────────┼──────────────────┐
         ▼                 ▼                  ▼
   Prescription      Inventory          Analytics
       Service          Service            Service
         │                 │                  │
         └─────────────────┼──────────────────┘
                           ▼
                      MySQL Database
                           │
                           ▼
                     AI Response
                           │
                           ▼
                         User
```

---

# 🏗 Complete System Architecture

```text
                        Internet
                            │
                            ▼
                    Web Browser Client
                            │
        ┌───────────────────┼────────────────────┐
        ▼                   ▼                    ▼
     Patient             Doctor            Pharmacist
                                            │
                                            ▼
                                          Admin
                            │
                            ▼
                     Frontend Application
                            │
                            ▼
                    Express.js REST Server
                            │
         ┌──────────────────┼──────────────────┐
         ▼                  ▼                  ▼
 Authentication       Business Logic      AI Services
         │                  │                  │
         ▼                  ▼                  ▼
 JWT Middleware      Controllers        Groq / Gemini
         │                  │                  │
         └──────────────────┼──────────────────┘
                            ▼
                    MySQL Relational Database
```

---

# 📈 Application Workflow

```text
User Registration
        │
        ▼
Admin Approval
        │
        ▼
User Login
        │
        ▼
JWT Authentication
        │
        ▼
Dashboard
        │
        ├───────────────┬──────────────────┬──────────────┐
        ▼               ▼                  ▼              ▼
   Doctor          Patient          Pharmacist        Admin
        │               │                  │              │
        └───────────────┴──────────────────┴──────────────┘
                        │
                        ▼
                  Database Operations
                        │
                        ▼
                   AI Assistance
                        │
                        ▼
                  Real-time Response
```

---

# 💊 Prescription Workflow

```text
Doctor Login
      │
      ▼
Select Patient
      │
      ▼
Choose Medicines
      │
      ▼
Create Prescription
      │
      ▼
Store in Database
      │
      ▼
Patient Notification
      │
      ▼
Pharmacist Verification
      │
      ▼
Medicine Dispensed
      │
      ▼
Inventory Updated
```

---

# 📦 Inventory Management Workflow

```text
Medicine Added
       │
       ▼
Inventory Database
       │
       ▼
Stock Monitoring
       │
       ▼
Low Stock Detection
       │
       ▼
Alert Pharmacist
       │
       ▼
Inventory Refilled
```

---

# 🔐 Authentication Architecture

```text
Login Request
      │
      ▼
Validate Credentials
      │
      ▼
bcrypt Password Check
      │
      ▼
JWT Token Creation
      │
      ▼
Client Storage
      │
      ▼
Protected API Access
      │
      ▼
Role Authorization
```

---

# ☁️ Deployment Architecture

```text
                 GitHub Repository
                         │
                         ▼
                 CI/CD Deployment
                         │
        ┌────────────────┴────────────────┐
        ▼                                 ▼
Frontend Hosting                    Backend Hosting
(Vercel/Netlify)                    (Railway/Render)
        │                                 │
        └───────────────┬─────────────────┘
                        ▼
                  MySQL Database
                        │
                        ▼
               Groq / Gemini AI APIs
```

---

# 🚀 Deployment Guide

## Backend

1. Configure environment variables.
2. Install dependencies.
3. Connect MySQL database.
4. Deploy on Railway or Render.
5. Verify API endpoints.

---

## Frontend

1. Build the frontend.
2. Configure API base URL.
3. Deploy using Vercel or Netlify.
4. Verify communication with the backend.

---

# 🌍 Future Enhancements

- 📱 Mobile Application (Android & iOS)
- ⌚ Smartwatch Medication Notifications
- 📅 Doctor Appointment Scheduling
- 📞 Video Consultation
- 💳 Online Pharmacy Payments
- 📈 Advanced Health Analytics
- 🩺 Electronic Health Records (EHR)
- 🌐 Multi-language Support
- 🔔 Push Notifications
- ☁️ Cloud Storage Integration
- 🧠 AI-based Medicine Recommendation
- 📊 Predictive Healthcare Analytics
- 🏥 Hospital Integration
- 📡 IoT-enabled Smart Pill Box
- 📷 OCR Prescription Scanner
- 🔐 Two-Factor Authentication (2FA)

---

# 📊 Project Statistics

| Category | Details |
|----------|---------|
| Architecture | Full Stack |
| Backend | Node.js + Express.js |
| Frontend | HTML, CSS, JavaScript |
| Database | MySQL |
| Authentication | JWT |
| AI Integration | Groq + Gemini |
| Roles | 4 |
| REST APIs | ✔ |
| Role-Based Access | ✔ |
| AI Tool Calling | ✔ |
| Responsive UI | ✔ |

---

# 🤝 Contributing

Contributions are welcome!

1. Fork the repository.
2. Create a feature branch.
3. Commit your changes.
4. Push the branch.
5. Open a Pull Request.

---

# 👨‍💻 Development Team

| Role | Responsibility |
|------|----------------|
| Developers | Full Stack Development |
| AI Integration | Conversational AI & Tool Calling |
| Database Design | MySQL Schema |
| Backend Development | REST APIs |
| Frontend Development | Responsive User Interface |

---

# 📝 License

This project is licensed under the **MIT License**.

You are free to use, modify, and distribute this project under the terms of the MIT License.

---

# 🙏 Acknowledgements

Special thanks to the open-source community and the technologies that made this project possible:

- Node.js
- Express.js
- MySQL
- JWT
- Bootstrap
- Groq API
- Google Gemini
- GitHub
- Railway
- Vercel

---

# ⭐ Support

If you found this project helpful:

- ⭐ Star this repository
- 🍴 Fork the project
- 🐛 Report issues
- 💡 Suggest improvements

Your support helps improve the project and encourages future development.

---

<div align="center">

# 💊 Online Medication & Prescription Tracker

### Empowering Healthcare Through Technology

**Developed with ❤️ using Node.js, Express.js, MySQL, and AI**

⭐ **If you like this project, don't forget to star the repository!** ⭐

</div>
