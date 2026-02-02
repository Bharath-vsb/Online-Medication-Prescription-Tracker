# 📡 API Documentation

Base URL: `http://localhost:3000/api`

## Authentication

All protected routes require JWT token in Authorization header:
```
Authorization: Bearer <token>
```

---

## 🔐 Auth Endpoints

### Register User
**POST** `/auth/signup`

**Body:**
```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "mobile": "1234567890",
  "password": "password123",
  "role": "doctor|patient|pharmacist|admin",
  "medicalLicenseNumber": "MD123456",  // Required for doctors
  "secretCode": "0000"  // Required for admin
}
```

**Response:**
```json
{
  "message": "Registration successful",
  "status": "pending|approved"
}
```

**Status Codes:**
- 201: Success
- 400: Validation error
- 400: Email already exists

---

### Login
**POST** `/auth/login`

**Body:**
```json
{
  "email": "john@example.com",
  "password": "password123",
  "role": "doctor"
}
```

**Response:**
```json
{
  "token": "eyJhbGc...",
  "user": {
    "id": 1,
    "fullName": "John Doe",
    "email": "john@example.com",
    "role": "doctor"
  }
}
```

**Status Codes:**
- 200: Success
- 401: Invalid credentials
- 403: Account pending/rejected/disabled

---

### Get Current User
**GET** `/auth/me`

**Headers:** Authorization required

**Response:**
```json
{
  "id": 1,
  "fullName": "John Doe",
  "email": "john@example.com",
  "mobile": "1234567890",
  "role": "doctor",
  "medicalLicenseNumber": "MD123456"
}
```

---

## 👨‍⚕️ Doctor Endpoints

### Get Medicines List
**GET** `/medicines`

**Headers:** Authorization required

**Response:**
```json
[
  {
    "id": 1,
    "name": "Paracetamol"
  },
  {
    "id": 2,
    "name": "Aspirin"
  }
]
```

---

### Create Prescription
**POST** `/prescriptions`

**Headers:** Authorization required  
**Role:** Doctor only

**Body:**
```json
{
  "patientId": 5,
  "medicines": [
    {
      "medicineId": 1,
      "medicineName": "Paracetamol",
      "startDate": "2024-01-29",
      "duration": 7,
      "frequency": "twice-per-day"
    },
    {
      "medicineId": null,
      "medicineName": "New Medicine Name",
      "startDate": "2024-01-29",
      "duration": 14,
      "frequency": "three-times-per-day"
    }
  ]
}
```

**Frequency Options:**
- `once-per-day`
- `twice-per-day`
- `three-times-per-day`
- `four-times-per-day`
- `every-6-hours`
- `every-8-hours`

**Response:**
```json
{
  "message": "Prescription created successfully",
  "prescriptions": [...]
}
```

**Auto-Calculations:**
- End Date = Start Date + Duration
- Doses Per Day based on frequency
- Total Quantity = Duration × Doses Per Day

---

### Get Doctor's Prescriptions
**GET** `/doctor/prescriptions?status=active`

**Headers:** Authorization required  
**Role:** Doctor only

**Query Parameters:**
- `status`: `active` or `completed` (optional)

**Response:**
```json
[
  {
    "id": 1,
    "prescriptionGroupId": 1,
    "doctorId": 2,
    "patientId": 5,
    "medicineId": 1,
    "medicineName": "Paracetamol",
    "startDate": "2024-01-29T00:00:00.000Z",
    "endDate": "2024-02-05T00:00:00.000Z",
    "duration": 7,
    "frequency": "twice-per-day",
    "dosesPerDay": 2,
    "totalQuantity": 14,
    "status": "active",
    "bought": false,
    "createdAt": "2024-01-29T10:30:00.000Z",
    "patient": {
      "id": 5,
      "fullName": "Patient Name",
      "email": "patient@example.com"
    }
  }
]
```

---

### Get Doctor Analytics
**GET** `/doctor/analytics`

**Headers:** Authorization required  
**Role:** Doctor only

**Response:**
```json
{
  "totalPrescriptions": 25,
  "activePrescriptions": 10,
  "completedPrescriptions": 15,
  "avgPatientAdherence": "78.5"
}
```

---

### Get Patients List
**GET** `/patients`

**Headers:** Authorization required  
**Role:** Doctor only

**Response:**
```json
[
  {
    "id": 5,
    "fullName": "Patient Name",
    "email": "patient@example.com",
    "mobile": "9876543210"
  }
]
```

---

## 👩‍⚕️ Pharmacist Endpoints

### Add Inventory
**POST** `/inventory`

**Headers:** Authorization required  
**Role:** Pharmacist only

**Body:**
```json
{
  "medicineId": 1,
  "medicineName": "Paracetamol",  // If medicineId is null
  "batchNumber": "BATCH001",
  "expiryDate": "2025-12-31",
  "stockQuantity": 500
}
```

**Response:**
```json
{
  "id": 1,
  "medicineId": 1,
  "medicineName": "Paracetamol",
  "batchNumber": "BATCH001",
  "expiryDate": "2025-12-31T00:00:00.000Z",
  "stockQuantity": 500,
  "createdAt": "2024-01-29T10:30:00.000Z"
}
```

---

### Get Inventory
**GET** `/inventory`

**Headers:** Authorization required  
**Role:** Pharmacist or Admin

**Response:**
```json
[
  {
    "id": 1,
    "medicineId": 1,
    "medicineName": "Paracetamol",
    "batchNumber": "BATCH001",
    "expiryDate": "2025-12-31T00:00:00.000Z",
    "stockQuantity": 500,
    "createdAt": "2024-01-29T10:30:00.000Z",
    "isExpired": false,
    "isLowStock": false
  }
]
```

**Alerts:**
- `isLowStock`: true when stockQuantity ≤ 100
- `isExpired`: true when expiryDate < current date

---

### Update Inventory
**PUT** `/inventory/:id`

**Headers:** Authorization required  
**Role:** Pharmacist only

**Body:**
```json
{
  "batchNumber": "BATCH002",
  "expiryDate": "2026-01-31",
  "stockQuantity": 300
}
```

**Response:**
```json
{
  "id": 1,
  "medicineId": 1,
  "medicineName": "Paracetamol",
  "batchNumber": "BATCH002",
  "expiryDate": "2026-01-31T00:00:00.000Z",
  "stockQuantity": 300,
  "createdAt": "2024-01-29T10:30:00.000Z"
}
```

---

### Delete Inventory
**DELETE** `/inventory/:id`

**Headers:** Authorization required  
**Role:** Pharmacist only

**Response:**
```json
{
  "message": "Item deleted"
}
```

---

### Get Prescriptions to Sell
**GET** `/pharmacist/prescriptions?status=active`

**Headers:** Authorization required  
**Role:** Pharmacist only

**Query Parameters:**
- `status`: `active` or `history`

**Response (active):**
```json
[
  {
    "id": 1,
    "medicineId": 1,
    "medicineName": "Paracetamol",
    "frequency": "twice-per-day",
    "duration": 7,
    "totalQuantity": 14,
    "bought": false,
    "doctor": {
      "fullName": "Dr. Smith"
    },
    "patient": {
      "fullName": "John Doe"
    }
  }
]
```

---

### Sell Medicine
**POST** `/pharmacist/sell/:id`

**Headers:** Authorization required  
**Role:** Pharmacist only

**Actions:**
1. Reduces inventory stock
2. Marks prescription as bought
3. Records sale
4. Generates patient reminders

**Response:**
```json
{
  "message": "Medicine sold successfully",
  "prescription": {
    "id": 1,
    "bought": true,
    ...
  }
}
```

**Errors:**
- 404: Prescription not found
- 400: Already sold
- 400: Insufficient stock

---

### Get Pharmacist Analytics
**GET** `/pharmacist/analytics`

**Headers:** Authorization required  
**Role:** Pharmacist only

**Response:**
```json
{
  "totalMedicines": 50,
  "lowStockCount": 5,
  "monthlySales": 120
}
```

---

## 🧑‍🦱 Patient Endpoints

### Get Patient Prescriptions
**GET** `/patient/prescriptions?status=active`

**Headers:** Authorization required  
**Role:** Patient only

**Query Parameters:**
- `status`: `active` or `completed` (optional)

**Response:**
```json
[
  {
    "id": 1,
    "medicineId": 1,
    "medicineName": "Paracetamol",
    "startDate": "2024-01-29T00:00:00.000Z",
    "endDate": "2024-02-05T00:00:00.000Z",
    "duration": 7,
    "frequency": "twice-per-day",
    "totalQuantity": 14,
    "status": "active",
    "bought": true,
    "doctor": {
      "fullName": "Dr. Smith"
    }
  }
]
```

---

### Get Reminders
**GET** `/patient/reminders`

**Headers:** Authorization required  
**Role:** Patient only

**Conditions:**
- Only for active prescriptions
- Only if medicine is bought

**Response:**
```json
[
  {
    "id": 1,
    "prescriptionId": 1,
    "patientId": 5,
    "reminderTime": "2024-01-29T09:00:00.000Z",
    "status": "pending",
    "createdAt": "2024-01-29T08:00:00.000Z",
    "prescription": {
      "medicineId": 1,
      "medicineName": "Paracetamol",
      "frequency": "twice-per-day"
    }
  }
]
```

**Status Values:**
- `pending`: Not yet taken
- `taken`: Confirmed taken
- `missed`: Marked as skipped

---

### Update Reminder Time
**PUT** `/patient/reminders/:id`

**Headers:** Authorization required  
**Role:** Patient only

**Body:**
```json
{
  "reminderTime": "2024-01-29T10:00:00.000Z"
}
```

**Response:**
```json
{
  "id": 1,
  "reminderTime": "2024-01-29T10:00:00.000Z",
  ...
}
```

---

### Confirm/Skip Dose
**POST** `/patient/reminders/:id/confirm`

**Headers:** Authorization required  
**Role:** Patient only

**Body:**
```json
{
  "status": "taken"
}
```

**Status Options:**
- `taken`: Dose was taken
- `missed`: Dose was skipped

**Response:**
```json
{
  "message": "Status updated",
  "reminder": {
    "id": 1,
    "status": "taken",
    ...
  }
}
```

---

### Get Patient Analytics
**GET** `/patient/analytics`

**Headers:** Authorization required  
**Role:** Patient only

**Response:**
```json
{
  "adherencePercentage": "85.5",
  "weeklyAdherence": [
    {
      "date": "Mon",
      "adherence": "80.0"
    },
    {
      "date": "Tue",
      "adherence": "90.0"
    },
    ...
  ]
}
```

---

## 🛡️ Admin Endpoints

### Get All Users
**GET** `/admin/users?status=pending&role=doctor`

**Headers:** Authorization required  
**Role:** Admin only

**Query Parameters:**
- `status`: `pending`, `approved`, `rejected` (optional)
- `role`: `doctor`, `patient`, `pharmacist` (optional)

**Response:**
```json
[
  {
    "id": 2,
    "fullName": "Dr. Smith",
    "email": "doctor@example.com",
    "mobile": "1234567890",
    "role": "doctor",
    "medicalLicenseNumber": "MD123456",
    "status": "pending",
    "enabled": true,
    "createdAt": "2024-01-29T10:00:00.000Z"
  }
]
```

---

### Approve/Reject User
**PUT** `/admin/users/:id/status`

**Headers:** Authorization required  
**Role:** Admin only

**Body:**
```json
{
  "status": "approved"
}
```

**Status Options:**
- `approved`: User can login
- `rejected`: User cannot login

**Response:**
```json
{
  "message": "Status updated",
  "user": {
    "id": 2,
    "status": "approved",
    ...
  }
}
```

**Side Effects:**
- Creates audit log
- Sends notification to user

---

### Enable/Disable User
**PUT** `/admin/users/:id/toggle`

**Headers:** Authorization required  
**Role:** Admin only

**Response:**
```json
{
  "message": "User toggled",
  "user": {
    "id": 2,
    "enabled": false,
    ...
  }
}
```

---

### Delete User
**DELETE** `/admin/users/:id`

**Headers:** Authorization required  
**Role:** Admin only

**Response:**
```json
{
  "message": "User deleted"
}
```

**Side Effects:**
- Creates audit log

---

### Get All Prescriptions (Read-Only)
**GET** `/admin/prescriptions`

**Headers:** Authorization required  
**Role:** Admin only

**Response:**
```json
[
  {
    "id": 1,
    "medicineId": 1,
    "medicineName": "Paracetamol",
    "duration": 7,
    "status": "active",
    "doctor": {
      "fullName": "Dr. Smith"
    },
    "patient": {
      "fullName": "John Doe"
    }
  }
]
```

---

### Get Admin Analytics
**GET** `/admin/analytics`

**Headers:** Authorization required  
**Role:** Admin only

**Response:**
```json
{
  "totalUsers": 25,
  "totalDoctors": 5,
  "totalPatients": 15,
  "totalPharmacists": 3,
  "totalPrescriptions": 100,
  "lowStockCount": 8
}
```

---

## 📬 Notifications

### Get Notifications
**GET** `/notifications`

**Headers:** Authorization required

**Response:**
```json
[
  {
    "id": 1,
    "userId": 2,
    "message": "New patient prescription created",
    "type": "alert",
    "read": false,
    "createdAt": "2024-01-29T10:00:00.000Z"
  }
]
```

**Notification Types:**
- `approval`: User approval status
- `alert`: System alerts
- `status`: Account status changes

---

### Mark Notification as Read
**PUT** `/notifications/:id/read`

**Headers:** Authorization required

**Response:**
```json
{
  "id": 1,
  "read": true,
  ...
}
```

---

## 🚨 Error Responses

### 400 Bad Request
```json
{
  "error": "Validation error message"
}
```

### 401 Unauthorized
```json
{
  "error": "No token provided"
}
```
```json
{
  "error": "Invalid token"
}
```

### 403 Forbidden
```json
{
  "error": "Access denied"
}
```
```json
{
  "error": "Account pending approval"
}
```

### 404 Not Found
```json
{
  "error": "Resource not found"
}
```

### 500 Server Error
```json
{
  "error": "Server error"
}
```

---

## 📝 Notes

### Auto-Completion
Prescriptions automatically change from `active` to `completed` when `endDate < current date`.

### Reminder Generation
Reminders are auto-generated when pharmacist sells medicine, based on:
- Prescription start/end dates
- Frequency (determines reminder times)
- Example: "twice-per-day" → reminders at 09:00 and 21:00

### Stock Management
- Stock reduces automatically when medicine is sold
- Quantity reduced = `totalQuantity` from prescription
- Sale can only happen once per prescription

### Security
- All passwords are hashed with bcrypt
- JWT tokens expire in 24 hours
- Role-based authorization on all protected routes

---

**Testing Tip:** Use tools like Postman or cURL to test API endpoints during development.
