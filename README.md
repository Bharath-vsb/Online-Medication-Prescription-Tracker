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

