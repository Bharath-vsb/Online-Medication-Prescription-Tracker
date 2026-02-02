const API_URL = 'http://localhost:3000/api';
let currentUser = null;
let authToken = null;

// Page elements
const loginPage = document.getElementById('loginPage');
const signupPage = document.getElementById('signupPage');
const dashboardPage = document.getElementById('dashboardPage');

// Auth forms
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const signupRole = document.getElementById('signupRole');

// Toggle between login and signup
document.getElementById('showSignup').addEventListener('click', () => {
    loginPage.classList.add('hidden');
    signupPage.classList.remove('hidden');
});

document.getElementById('showLogin').addEventListener('click', () => {
    signupPage.classList.add('hidden');
    loginPage.classList.remove('hidden');
});

// Show/hide conditional fields on signup
signupRole.addEventListener('change', (e) => {
    const role = e.target.value;
    const licenseGroup = document.getElementById('licenseGroup');
    const secretCodeGroup = document.getElementById('secretCodeGroup');
    const licenseInput = document.getElementById('signupLicense');
    const secretCodeInput = document.getElementById('signupSecretCode');

    if (role === 'doctor') {
        licenseGroup.classList.remove('hidden');
        licenseInput.required = true;
        secretCodeGroup.classList.add('hidden');
        secretCodeInput.required = false;
    } else if (role === 'admin') {
        secretCodeGroup.classList.remove('hidden');
        secretCodeInput.required = true;
        licenseGroup.classList.add('hidden');
        licenseInput.required = false;
    } else {
        licenseGroup.classList.add('hidden');
        secretCodeGroup.classList.add('hidden');
        licenseInput.required = false;
        secretCodeInput.required = false;
    }
});

// Login handler
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const role = document.getElementById('loginRole').value;

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, role })
        });

        const data = await response.json();

        if (response.ok) {
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            showDashboard();
        } else {
            showAlert('loginAlert', data.error, 'error');
        }
    } catch (error) {
        showAlert('loginAlert', 'Connection error. Please try again.', 'error');
    }
});

// Signup handler
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fullName = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const mobile = document.getElementById('signupMobile').value;
    const role = document.getElementById('signupRole').value;
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupConfirmPassword').value;
    const medicalLicenseNumber = document.getElementById('signupLicense').value;
    const secretCode = document.getElementById('signupSecretCode').value;

    if (password !== confirmPassword) {
        showAlert('signupAlert', 'Passwords do not match', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fullName, email, mobile, role, password, medicalLicenseNumber, secretCode })
        });

        const data = await response.json();

        if (response.ok) {
            showAlert('signupAlert', data.message, 'success');
            setTimeout(() => {
                signupPage.classList.add('hidden');
                loginPage.classList.remove('hidden');
            }, 2000);
        } else {
            showAlert('signupAlert', data.error, 'error');
        }
    } catch (error) {
        showAlert('signupAlert', 'Connection error. Please try again.', 'error');
    }
});

// Check for existing session
window.addEventListener('load', () => {
    const savedToken = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('currentUser');

    if (savedToken && savedUser) {
        authToken = savedToken;
        currentUser = JSON.parse(savedUser);
        showDashboard();
    }
});

// Show alert
function showAlert(elementId, message, type) {
    const alertDiv = document.getElementById(elementId);
    alertDiv.innerHTML = `
        <div class="alert alert-${type === 'error' ? 'error' : 'success'}">
            ${message}
        </div>
    `;

    setTimeout(() => {
        alertDiv.innerHTML = '';
    }, 5000);
}

// API call helper
async function apiCall(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        }
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_URL}${endpoint}`, options);
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'Request failed');
    }

    return data;
}

// Logout
function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    dashboardPage.classList.add('hidden');
    loginPage.classList.remove('hidden');
    dashboardPage.innerHTML = '';
}

// Show dashboard based on role
function showDashboard() {
    loginPage.classList.add('hidden');
    signupPage.classList.add('hidden');
    dashboardPage.classList.remove('hidden');

    switch (currentUser.role) {
        case 'doctor':
            renderDoctorDashboard();
            break;
        case 'patient':
            renderPatientDashboard();
            break;
        case 'pharmacist':
            renderPharmacistDashboard();
            break;
        case 'admin':
            renderAdminDashboard();
            break;
    }
}

// ==================== DOCTOR DASHBOARD ====================
async function renderDoctorDashboard() {
    dashboardPage.innerHTML = `
        <div class="dashboard">
            <div class="sidebar">
                <div class="sidebar-header">
                    <h2>Online Medication & Prescription Tracking</h2>
                </div>
                
                <div class="user-info">
                    <div class="user-avatar">${currentUser.fullName.charAt(0)}</div>
                    <div class="user-details">
                        <h3>${currentUser.fullName}</h3>
                        <p>${currentUser.role}</p>
                    </div>
                </div>
                
                <div class="nav-menu">
                    <div class="nav-item active" data-view="prescriptions">
                        📋 Prescriptions
                    </div>
                    <div class="nav-item" data-view="analytics">
                        📊 Analytics
                    </div>
                </div>
                
                <button class="logout-btn" onclick="logout()">
                    🚪 Logout
                </button>
            </div>
            
            <div class="main-content">
                <div id="doctorContent"></div>
            </div>
        </div>
    `;

    // Nav menu handlers
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            const view = item.dataset.view;
            if (view === 'prescriptions') loadDoctorPrescriptions();
            if (view === 'analytics') loadDoctorAnalytics();
        });
    });

    loadDoctorPrescriptions();
}

async function loadDoctorPrescriptions() {
    const content = document.getElementById('doctorContent');
    content.innerHTML = `
        <div class="page-header">
            <h1>Prescriptions</h1>
            <p>Manage patient prescriptions</p>
        </div>
        
        <div class="card">
            <div class="card-header">
                <h3>Create New Prescription</h3>
                <button class="btn btn-primary" onclick="openCreatePrescriptionModal()">
                    ➕ New Prescription
                </button>
            </div>
        </div>
        
        <div class="tabs">
            <div class="tab active" data-status="active">Active Prescriptions</div>
            <div class="tab" data-status="completed">Prescription History</div>
        </div>
        
        <div id="prescriptionsList"></div>
    `;

    // Tab handlers
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            loadPrescriptionsByStatus(tab.dataset.status);
        });
    });

    loadPrescriptionsByStatus('active');
}

async function loadPrescriptionsByStatus(status) {
    try {
        const prescriptions = await apiCall(`/doctor/prescriptions?status=${status}`);
        const listDiv = document.getElementById('prescriptionsList');

        if (prescriptions.length === 0) {
            listDiv.innerHTML = `
                <div class="empty-state">
                    <h3>No ${status} prescriptions</h3>
                    <p>Prescriptions will appear here</p>
                </div>
            `;
            return;
        }

        listDiv.innerHTML = `
            <div class="card">
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Patient</th>
                                <th>Medicine</th>
                                <th>Duration</th>
                                <th>Frequency</th>
                                <th>Total Qty</th>
                                <th>Start Date</th>
                                <th>End Date</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${prescriptions.map(p => `
                                <tr>
                                    <td>${p.patient?.full_name || p.patient_name || 'Unknown'}</td>
                                    <td>${p.medicine_name || p.medicineName}</td>
                                    <td>${p.duration} days</td>
                                    <td>${p.frequency.replace(/-/g, ' ')}</td>
                                    <td>${p.total_quantity || p.totalQuantity}</td>
                                    <td>${new Date(p.start_date || p.startDate).toLocaleDateString()}</td>
                                    <td>${new Date(p.end_date || p.endDate).toLocaleDateString()}</td>
                                    <td>
                                        <span class="badge badge-${p.status === 'active' ? 'success' : 'secondary'}">
                                            ${p.status}
                                        </span>
                                        ${p.bought ? '<span class="badge badge-info">Bought</span>' : ''}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error loading prescriptions:', error);
    }
}

async function openCreatePrescriptionModal() {
    try {
        const [patients, medicines] = await Promise.all([
            apiCall('/patients'),
            apiCall('/medicines')
        ]);

        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Create Prescription</h3>
                    <button class="close-modal">×</button>
                </div>
                
                <form id="createPrescriptionForm">
                    <div class="form-group">
                        <label>Select Patient</label>
                        <select id="prescriptionPatient" required>
                            <option value="">Choose patient...</option>
                            ${patients.map(p => `
                                <option value="${p.id}">${p.fullName} (${p.email})</option>
                            `).join('')}
                        </select>
                    </div>
                    
                    <div id="medicinesContainer">
                        <div class="medicine-entry">
                            <h4 style="margin-bottom: 1rem;">Medicine #1</h4>
                            <div class="form-group">
                                <label>Medicine</label>
                                <select class="medicine-select" required>
                                    <option value="">Choose medicine...</option>
                                    ${medicines.map(m => `
                                        <option value="${m.id}">${m.name}</option>
                                    `).join('')}
                                    <option value="new">➕ Add New Medicine</option>
                                </select>
                            </div>
                            
                            <div class="form-group hidden new-medicine-name">
                                <label>New Medicine Name</label>
                                <input type="text" class="medicine-name" placeholder="Enter medicine name">
                            </div>
                            
                            <div class="form-group">
                                <label>Start Date</label>
                                <input type="date" class="start-date" min="${new Date().toISOString().split('T')[0]}" required>
                            </div>
                            
                            <div class="form-group">
                                <label>Duration (Days)</label>
                                <input type="number" class="duration" min="1" required>
                            </div>
                            
                            <div class="form-group">
                                <label>Frequency</label>
                                <select class="frequency" required>
                                    <option value="once-per-day">Once per day</option>
                                    <option value="twice-per-day">Twice per day</option>
                                    <option value="three-times-per-day">Three times per day</option>
                                    <option value="four-times-per-day">Four times per day</option>
                                    <option value="every-6-hours">Every 6 hours</option>
                                    <option value="every-8-hours">Every 8 hours</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <button type="button" class="btn btn-secondary" onclick="addMedicineEntry()">
                        ➕ Add Another Medicine
                    </button>
                    
                    <div class="btn-group">
                        <button type="button" class="btn btn-secondary close-modal">Cancel</button>
                        <button type="submit" class="btn btn-primary">Create Prescription</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        // Close modal handlers
        modal.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => {
                modal.remove();
            });
        });

        // Medicine select change handler
        modal.addEventListener('change', (e) => {
            if (e.target.classList.contains('medicine-select')) {
                const parent = e.target.closest('.medicine-entry');
                const nameGroup = parent.querySelector('.new-medicine-name');
                const nameInput = parent.querySelector('.medicine-name');

                if (e.target.value === 'new') {
                    nameGroup.classList.remove('hidden');
                    nameInput.required = true;
                } else {
                    nameGroup.classList.add('hidden');
                    nameInput.required = false;
                }
            }
        });

        // Form submit
        document.getElementById('createPrescriptionForm').addEventListener('submit', async (e) => {
            e.preventDefault();

            const patientId = document.getElementById('prescriptionPatient').value;
            const entries = modal.querySelectorAll('.medicine-entry');
            const medicines = [];

            entries.forEach(entry => {
                const medicineSelect = entry.querySelector('.medicine-select');
                const medicineId = medicineSelect.value !== 'new' ? medicineSelect.value : null;
                const medicineName = medicineSelect.value === 'new'
                    ? entry.querySelector('.medicine-name').value
                    : medicineSelect.options[medicineSelect.selectedIndex].text;
                const startDate = entry.querySelector('.start-date').value;
                const duration = entry.querySelector('.duration').value;
                const frequency = entry.querySelector('.frequency').value;

                medicines.push({
                    medicineId: medicineId ? parseInt(medicineId) : null,
                    medicineName,
                    startDate,
                    duration,
                    frequency
                });
            });

            try {
                await apiCall('/prescriptions', 'POST', {
                    patientId: parseInt(patientId),
                    medicines
                });

                modal.remove();
                loadDoctorPrescriptions();
            } catch (error) {
                alert('Error creating prescription: ' + error.message);
            }
        });
    } catch (error) {
        alert('Error loading data: ' + error.message);
    }
}

window.addMedicineEntry = function () {
    const container = document.getElementById('medicinesContainer');
    const count = container.querySelectorAll('.medicine-entry').length + 1;

    const firstEntry = container.querySelector('.medicine-entry');
    const newEntry = firstEntry.cloneNode(true);

    newEntry.querySelector('h4').textContent = `Medicine #${count}`;
    newEntry.querySelectorAll('input').forEach(input => input.value = '');
    newEntry.querySelectorAll('select').forEach(select => select.selectedIndex = 0);
    newEntry.querySelector('.new-medicine-name').classList.add('hidden');

    container.appendChild(newEntry);
};

async function loadDoctorAnalytics() {
    try {
        const analytics = await apiCall('/doctor/analytics');

        const content = document.getElementById('doctorContent');
        content.innerHTML = `
            <div class="page-header">
                <h1>Analytics</h1>
                <p>Performance metrics and insights</p>
            </div>
            
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-label">Total Prescriptions</div>
                    <div class="stat-value">${analytics.totalPrescriptions}</div>
                    <div class="stat-description">All time</div>
                </div>
                
                <div class="stat-card green">
                    <div class="stat-label">Active Prescriptions</div>
                    <div class="stat-value">${analytics.activePrescriptions}</div>
                    <div class="stat-description">Currently active</div>
                </div>
                
                <div class="stat-card orange">
                    <div class="stat-label">Completed</div>
                    <div class="stat-value">${analytics.completedPrescriptions}</div>
                    <div class="stat-description">Finished treatments</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-label">Avg Patient Adherence</div>
                    <div class="stat-value">${analytics.avgPatientAdherence}%</div>
                    <div class="stat-description">Medication compliance</div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error loading analytics:', error);
    }
}

// ==================== PATIENT DASHBOARD ====================
async function renderPatientDashboard() {
    dashboardPage.innerHTML = `
        <div class="dashboard">
            <div class="sidebar">
                <div class="sidebar-header">
                    <h2>Online Medication & Prescription Tracking</h2>
                </div>
                
                <div class="user-info">
                    <div class="user-avatar">${currentUser.fullName.charAt(0)}</div>
                    <div class="user-details">
                        <h3>${currentUser.fullName}</h3>
                        <p>${currentUser.role}</p>
                    </div>
                </div>
                
                <div class="nav-menu">
                    <div class="nav-item active" data-view="prescriptions">
                        💊 My Prescriptions
                    </div>
                    <div class="nav-item" data-view="reminders">
                        ⏰ Reminders
                    </div>
                    <div class="nav-item" data-view="analytics">
                        📊 Analytics
                    </div>
                </div>
                
                <button class="logout-btn" onclick="logout()">
                    🚪 Logout
                </button>
            </div>
            
            <div class="main-content">
                <div id="patientContent"></div>
            </div>
        </div>
    `;

    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            const view = item.dataset.view;
            if (view === 'prescriptions') loadPatientPrescriptions();
            if (view === 'reminders') loadPatientReminders();
            if (view === 'analytics') loadPatientAnalytics();
        });
    });

    loadPatientPrescriptions();
}

async function loadPatientPrescriptions() {
    const content = document.getElementById('patientContent');
    content.innerHTML = `
        <div class="page-header">
            <h1>My Prescriptions</h1>
            <p>View your medication prescriptions</p>
        </div>
        
        <div class="tabs">
            <div class="tab active" data-status="active">Active</div>
            <div class="tab" data-status="completed">Completed</div>
        </div>
        
        <div id="patientPrescriptionsList"></div>
    `;

    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            loadPatientPrescriptionsByStatus(tab.dataset.status);
        });
    });

    loadPatientPrescriptionsByStatus('active');
}

async function loadPatientPrescriptionsByStatus(status) {
    try {
        const prescriptions = await apiCall(`/patient/prescriptions?status=${status}`);
        const listDiv = document.getElementById('patientPrescriptionsList');

        if (prescriptions.length === 0) {
            listDiv.innerHTML = `
                <div class="empty-state">
                    <h3>No ${status} prescriptions</h3>
                    <p>Your prescriptions will appear here</p>
                </div>
            `;
            return;
        }

        listDiv.innerHTML = `
            <div class="card">
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Medicine</th>
                                <th>Doctor</th>
                                <th>Duration</th>
                                <th>Frequency</th>
                                <th>Total Qty</th>
                                <th>Start Date</th>
                                <th>End Date</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${prescriptions.map(p => `
                                <tr>
                                    <td>${p.medicineName}</td>
                                    <td>${p.doctor?.fullName || 'Unknown'}</td>
                                    <td>${p.duration} days</td>
                                    <td>${p.frequency.replace(/-/g, ' ')}</td>
                                    <td>${p.totalQuantity}</td>
                                    <td>${new Date(p.startDate).toLocaleDateString()}</td>
                                    <td>${new Date(p.endDate).toLocaleDateString()}</td>
                                    <td>
                                        <span class="badge badge-${p.bought ? 'success' : 'warning'}">
                                            ${p.bought ? 'Bought' : 'Not Bought'}
                                        </span>
                                    </td>
                                    <td>
                                        <button class="btn btn-primary" style="padding: 0.5rem 1rem; font-size: 0.875rem;" 
                                            onclick='downloadPrescriptionPDF(${JSON.stringify(p)})'>
                                            📄 Download PDF
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error loading prescriptions:', error);
    }
}

async function loadPatientReminders() {
    try {
        // Request notification permission if not already granted
        if ('Notification' in window && Notification.permission === 'default') {
            await Notification.requestPermission();
        }

        const reminders = await apiCall('/patient/reminders');

        const content = document.getElementById('patientContent');
        content.innerHTML = `
            <div class="page-header">
                <h1>Medication Reminders</h1>
                <p>Manage your medication schedule</p>
            </div>
            
            <div id="remindersList"></div>
        `;

        const listDiv = document.getElementById('remindersList');

        if (reminders.length === 0) {
            listDiv.innerHTML = `
                <div class="empty-state">
                    <h3>No active reminders for today</h3>
                    <p>Reminders will appear when you have active prescriptions that have been purchased</p>
                </div>
            `;
            return;
        }

        // Group by Date (Today/Tomorrow) and Prescription
        const groupedByDate = { 'Today': {}, 'Tomorrow': {} };
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        reminders.forEach(r => {
            const rDate = new Date(r.reminderTime);
            rDate.setHours(0, 0, 0, 0);

            // simple check for today vs tomorrow based on date timestamp
            const isToday = rDate.getTime() === today.getTime();
            const groupName = isToday ? 'Today' : 'Tomorrow';

            if (groupedByDate[groupName]) {
                if (!groupedByDate[groupName][r.prescriptionId]) {
                    groupedByDate[groupName][r.prescriptionId] = {
                        prescription: r.prescription,
                        reminders: []
                    };
                }
                groupedByDate[groupName][r.prescriptionId].reminders.push(r);
            }
        });

        // Helper function to get status badge
        const getStatusBadge = (reminderStatus) => {
            const badges = {
                'due_now': '<span class="badge" style="background: #ef4444; animation: pulse 2s infinite;">🔔 DUE NOW</span>',
                'grace_period': '<span class="badge" style="background: #f59e0b;">⏰ GRACE PERIOD</span>',
                'upcoming': '<span class="badge" style="background: #3b82f6;">📅 Upcoming</span>'
            };
            return badges[reminderStatus] || '<span class="badge badge-secondary">Pending</span>';
        };

        // Helper function to format countdown
        const formatCountdown = (minutes) => {
            if (!minutes) return '';
            const mins = Math.floor(minutes);
            const secs = Math.floor((minutes - mins) * 60);
            return `${mins}m ${secs}s remaining`;
        };

        let html = '';

        // Render sections
        ['Today', 'Tomorrow'].forEach(day => {
            const dayGroups = groupedByDate[day];
            const hasReminders = Object.keys(dayGroups).length > 0;

            if (hasReminders) {
                html += `
                    <h2 style="margin: 2rem 0 1rem; color: #3b82f6; display: flex; align-items: center; gap: 0.5rem;">
                        ${day === 'Today' ? '📅' : '🌅'} ${day}'s Schedule
                    </h2>
                `;

                html += Object.values(dayGroups).map(group => `
                    <div class="card">
                        <div class="card-header">
                            <h3>💊 ${group.prescription.medicineName}</h3>
                            <p style="margin: 0.5rem 0 0 0; color: #9ca3af; font-size: 0.875rem;">
                                Frequency: ${group.prescription.frequency.replace(/-/g, ' ')}
                            </p>
                        </div>
                        
                        <div class="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Time</th>
                                        <th>Status</th>
                                        <th>Countdown</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${group.reminders.map(r => {
                    const time = new Date(r.reminderTime);
                    const timeStr = time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

                    return `
                                        <tr class="reminder-row" data-reminder-id="${r.id}" data-status="${r.reminderStatus}">
                                            <td>
                                                <div style="display: flex; align-items: center; gap: 0.5rem;">
                                                    <strong>${timeStr}</strong>
                                                    ${r.reminderStatus === 'upcoming' || r.reminderStatus === 'due_now' || r.reminderStatus === 'grace_period' ? `
                                                        <button class="btn btn-secondary" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" 
                                                            onclick="editReminderTime(${r.id}, '${r.reminderTime}')" title="Edit Time">
                                                            ✏️
                                                        </button>
                                                    ` : ''}
                                                </div>
                                            </td>
                                            <td>
                                                ${getStatusBadge(r.reminderStatus)}
                                            </td>
                                            <td>
                                                <span class="countdown-timer" data-minutes="${r.minutesUntilMissed || 0}">
                                                    ${r.reminderStatus === 'grace_period' ? formatCountdown(r.minutesUntilMissed) : '-'}
                                                </span>
                                            </td>
                                            <td>
                                                <button class="btn btn-success" style="padding: 0.5rem 1rem; font-size: 0.875rem;" 
                                                    onclick="confirmDose(${r.id}, 'taken')">
                                                    ✓ Taken
                                                </button>
                                                <button class="btn btn-secondary" style="padding: 0.5rem 1rem; font-size: 0.875rem;" 
                                                    onclick="confirmDose(${r.id}, 'missed')">
                                                    ✗ Skip
                                                </button>
                                            </td>
                                        </tr>
                                    `}).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                `).join('');
            }
        });

        listDiv.innerHTML = html || `
            <div class="empty-state">
                <h3>No active reminders for today or tomorrow</h3>
                <p>Reminders will appear when you have active prescriptions that have been purchased</p>
            </div>
        `;

        // Show browser notifications for "due now" reminders
        if ('Notification' in window && Notification.permission === 'granted') {
            reminders.filter(r => r.reminderStatus === 'due_now').forEach(r => {
                new Notification('💊 Medication Reminder', {
                    body: `Time to take ${r.prescription.medicineName}`,
                    icon: '/favicon.ico',
                    tag: `reminder-${r.id}`,
                    requireInteraction: true
                });
            });
        }

        // Start countdown timers and auto-refresh
        startReminderUpdates();

    } catch (error) {
        console.error('Error loading reminders:', error);
    }
}

// Auto-refresh reminders and update countdowns
let reminderUpdateInterval;
function startReminderUpdates() {
    // Clear existing interval
    if (reminderUpdateInterval) {
        clearInterval(reminderUpdateInterval);
    }

    // Update countdowns every second
    reminderUpdateInterval = setInterval(() => {
        const countdowns = document.querySelectorAll('.countdown-timer');
        countdowns.forEach(countdown => {
            const minutes = parseFloat(countdown.dataset.minutes);
            if (minutes > 0) {
                const newMinutes = minutes - (1 / 60); // Subtract 1 second
                countdown.dataset.minutes = newMinutes;
                const mins = Math.floor(newMinutes);
                const secs = Math.floor((newMinutes - mins) * 60);
                countdown.textContent = `${mins}m ${secs}s remaining`;
            }
        });
    }, 1000);

    // Refresh reminder list every minute
    setTimeout(() => {
        if (document.getElementById('remindersList')) {
            loadPatientReminders();
        }
    }, 60000);
}

window.confirmDose = async function (reminderId, status) {
    try {
        await apiCall(`/patient/reminders/${reminderId}/confirm`, 'POST', { status });
        loadPatientReminders();
    } catch (error) {
        alert('Error updating reminder: ' + error.message);
    }
};

// Edit reminder time - allows patients to adjust reminder times for their comfort
window.editReminderTime = function (reminderId, currentTime) {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    const dateObj = new Date(currentTime);
    const formattedDateTime = dateObj.toISOString().slice(0, 16);

    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Edit Reminder Time</h3>
                <button class="close-modal">×</button>
            </div>
            <form id="editReminderForm">
                <div class="form-group">
                    <label>New Reminder Time</label>
                    <input type="datetime-local" id="newReminderTime" value="${formattedDateTime}" required>
                    <p style="color: var(--text-muted); font-size: 0.875rem; margin-top: 0.5rem;">
                        💡 Adjust the reminder time to fit your daily schedule
                    </p>
                </div>
                <div class="btn-group">
                    <button type="button" class="btn btn-secondary close-modal">Cancel</button>
                    <button type="submit" class="btn btn-primary">Save Time</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);
    modal.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => modal.remove());
    });

    document.getElementById('editReminderForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const newTime = document.getElementById('newReminderTime').value;
        try {
            await apiCall(`/patient/reminders/${reminderId}`, 'PUT', {
                reminderTime: new Date(newTime).toISOString()
            });
            modal.remove();
            loadPatientReminders();
        } catch (error) {
            alert('Error updating reminder time: ' + error.message);
        }
    });
};

async function loadPatientAnalytics() {
    try {
        const analytics = await apiCall('/patient/analytics');

        const content = document.getElementById('patientContent');
        content.innerHTML = `
            <div class="page-header">
                <h1>My Analytics</h1>
                <p>Track your medication adherence</p>
            </div>
            
            <div class="stats-grid">
                <div class="stat-card green">
                    <div class="stat-label">Adherence Rate</div>
                    <div class="stat-value">${analytics.adherencePercentage}%</div>
                    <div class="stat-description">Overall compliance</div>
                </div>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <h3>Weekly Adherence</h3>
                </div>
                <div class="chart-container">
                    <canvas id="adherenceChart"></canvas>
                </div>
            </div>
        `;

        // Create chart
        const ctx = document.getElementById('adherenceChart');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: analytics.weeklyAdherence.map(d => d.date),
                datasets: [{
                    label: 'Adherence %',
                    data: analytics.weeklyAdherence.map(d => d.adherence),
                    backgroundColor: 'rgba(16, 185, 129, 0.6)',
                    borderColor: 'rgba(16, 185, 129, 1)',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: '#e4e6eb' }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: { color: '#b0b3ba' },
                        grid: { color: '#2d3139' }
                    },
                    x: {
                        ticks: { color: '#b0b3ba' },
                        grid: { color: '#2d3139' }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error loading analytics:', error);
    }
}

// ==================== PHARMACIST DASHBOARD ====================
async function renderPharmacistDashboard() {
    dashboardPage.innerHTML = `
        <div class="dashboard">
            <div class="sidebar">
                <div class="sidebar-header">
                    <h2>Online Medication & Prescription Tracking</h2>
                </div>
                
                <div class="user-info">
                    <div class="user-avatar">${currentUser.fullName.charAt(0)}</div>
                    <div class="user-details">
                        <h3>${currentUser.fullName}</h3>
                        <p>${currentUser.role}</p>
                    </div>
                </div>
                
                <div class="nav-menu">
                    <div class="nav-item active" data-view="inventory">
                        📦 Inventory
                    </div>
                    <div class="nav-item" data-view="prescriptions">
                        💊 Prescriptions
                    </div>
                    <div class="nav-item" data-view="analytics">
                        📊 Analytics
                    </div>
                </div>
                
                <button class="logout-btn" onclick="logout()">
                    🚪 Logout
                </button>
            </div>
            
            <div class="main-content">
                <div id="pharmacistContent"></div>
            </div>
        </div>
    `;

    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            const view = item.dataset.view;
            if (view === 'inventory') loadPharmacistInventory();
            if (view === 'prescriptions') loadPharmacistPrescriptions();
            if (view === 'analytics') loadPharmacistAnalytics();
        });
    });

    loadPharmacistInventory();
}

async function loadPharmacistInventory() {
    try {
        const [inventory, medicines] = await Promise.all([
            apiCall('/inventory'),
            apiCall('/medicines')
        ]);

        const content = document.getElementById('pharmacistContent');
        content.innerHTML = `
            <div class="page-header">
                <h1>Inventory Management</h1>
                <p>Manage medicine stock</p>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <h3>Add New Stock</h3>
                    <button class="btn btn-primary" onclick="openAddInventoryModal()">
                        ➕ Add Stock
                    </button>
                </div>
            </div>
            
            <div class="card">
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Medicine</th>
                                <th>Batch Number</th>
                                <th>Expiry Date</th>
                                <th>Stock</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${inventory.map(item => `
                                <tr>
                                    <td>${item.medicine_name}</td>
                                    <td>${item.batch_number}</td>
                                    <td>${new Date(item.expiry_date).toLocaleDateString()}</td>
                                    <td>${item.stock_quantity}</td>
                                    <td>
                                        ${item.is_expired ? '<span class="badge badge-danger">Expired</span>' : ''}
                                        ${item.is_low_stock && !item.is_expired ? '<span class="badge badge-warning">Low Stock</span>' : ''}
                                        ${!item.is_expired && !item.is_low_stock ? '<span class="badge badge-success">OK</span>' : ''}
                                    </td>
                                    <td>
                                        <button class="btn btn-secondary" style="padding: 0.5rem 1rem; font-size: 0.875rem;" 
                                            onclick="editInventory(${item.id})">Edit</button>
                                        <button class="btn btn-danger" style="padding: 0.5rem 1rem; font-size: 0.875rem;" 
                                            onclick="deleteInventory(${item.id})">Delete</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        window.currentMedicines = medicines;
    } catch (error) {
        console.error('Error loading inventory:', error);
    }
}

window.openAddInventoryModal = async function () {
    const medicines = window.currentMedicines || await apiCall('/medicines');

    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Add Inventory Stock</h3>
                <button class="close-modal">×</button>
            </div>
            
            <form id="addInventoryForm">
                <div class="form-group">
                    <label>Medicine</label>
                    <select id="inventoryMedicine" required>
                        <option value="">Choose medicine...</option>
                        ${medicines.map(m => `
                            <option value="${m.id}">${m.name}</option>
                        `).join('')}
                        <option value="new">➕ Add New Medicine</option>
                    </select>
                </div>
                
                <div class="form-group hidden" id="newMedicineNameGroup">
                    <label>New Medicine Name</label>
                    <input type="text" id="newMedicineName" placeholder="Enter medicine name">
                </div>
                
                <div class="form-group">
                    <label>Batch Number</label>
                    <input type="text" id="batchNumber" required>
                </div>
                
                <div class="form-group">
                    <label>Expiry Date</label>
                    <input type="date" id="expiryDate" required>
                </div>
                
                <div class="form-group">
                    <label>Stock Quantity</label>
                    <input type="number" id="stockQuantity" min="1" required>
                </div>
                
                <div class="btn-group">
                    <button type="button" class="btn btn-secondary close-modal">Cancel</button>
                    <button type="submit" class="btn btn-primary">Add Stock</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    modal.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => modal.remove());
    });

    document.getElementById('inventoryMedicine').addEventListener('change', (e) => {
        const nameGroup = document.getElementById('newMedicineNameGroup');
        const nameInput = document.getElementById('newMedicineName');

        if (e.target.value === 'new') {
            nameGroup.classList.remove('hidden');
            nameInput.required = true;
        } else {
            nameGroup.classList.add('hidden');
            nameInput.required = false;
        }
    });

    document.getElementById('addInventoryForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const medicineSelect = document.getElementById('inventoryMedicine');
        const medicineId = medicineSelect.value !== 'new' ? medicineSelect.value : null;
        const medicineName = medicineSelect.value === 'new'
            ? document.getElementById('newMedicineName').value
            : null;
        const batchNumber = document.getElementById('batchNumber').value;
        const expiryDate = document.getElementById('expiryDate').value;
        const stockQuantity = document.getElementById('stockQuantity').value;

        try {
            await apiCall('/inventory', 'POST', {
                medicineId: medicineId ? parseInt(medicineId) : null,
                medicineName,
                batchNumber,
                expiryDate,
                stockQuantity
            });

            modal.remove();
            loadPharmacistInventory();
        } catch (error) {
            alert('Error adding inventory: ' + error.message);
        }
    });
};

window.deleteInventory = async function (id) {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
        await apiCall(`/inventory/${id}`, 'DELETE');
        loadPharmacistInventory();
    } catch (error) {
        alert('Error deleting item: ' + error.message);
    }
};

async function loadPharmacistPrescriptions() {
    const content = document.getElementById('pharmacistContent');
    content.innerHTML = `
        <div class="page-header">
            <h1>Patient Prescriptions</h1>
            <p>Manage prescription sales</p>
        </div>
        
        <div class="tabs">
            <div class="tab active" data-status="active">To Sell</div>
            <div class="tab" data-status="history">Selling History</div>
        </div>
        
        <div id="pharmacistPrescriptionsList"></div>
    `;

    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            loadPharmacistPrescriptionsByStatus(tab.dataset.status);
        });
    });

    loadPharmacistPrescriptionsByStatus('active');
}

async function loadPharmacistPrescriptionsByStatus(status) {
    try {
        const prescriptions = await apiCall(`/pharmacist/prescriptions?status=${status}`);
        const listDiv = document.getElementById('pharmacistPrescriptionsList');

        if (prescriptions.length === 0) {
            listDiv.innerHTML = `
                <div class="empty-state">
                    <h3>No prescriptions</h3>
                    <p>Prescriptions will appear here</p>
                </div>
            `;
            return;
        }

        if (status === 'active') {
            listDiv.innerHTML = `
                <div class="card">
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Patient</th>
                                    <th>Doctor</th>
                                    <th>Medicine</th>
                                    <th>Frequency</th>
                                    <th>Duration</th>
                                    <th>Total Qty</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${prescriptions.map(p => `
                                    <tr>
                                        <td>${p.patient?.fullName || 'Unknown'}</td>
                                        <td>${p.doctor?.fullName || 'Unknown'}</td>
                                        <td>${p.medicineName}</td>
                                        <td>${p.frequency.replace(/-/g, ' ')}</td>
                                        <td>${p.duration} days</td>
                                        <td>${p.totalQuantity}</td>
                                        <td>
                                            ${p.bought
                    ? '<span class="badge badge-success">Sold</span>'
                    : '<span class="badge badge-warning">Not Sold</span>'
                }
                                        </td>
                                        <td>
                                            ${!p.bought
                    ? `<button class="btn btn-success" style="padding: 0.5rem 1rem; font-size: 0.875rem;" 
                                                    onclick="sellMedicine(${p.id})">Sell</button>`
                    : '-'
                }
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        } else {
            listDiv.innerHTML = `
                <div class="card">
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Medicine</th>
                                    <th>Quantity</th>
                                    <th>Sold Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${prescriptions.map(p => `
                                    <tr>
                                        <td>${p.medicineName}</td>
                                        <td>${p.soldQuantity || p.totalQuantity}</td>
                                        <td>${new Date(p.soldAt).toLocaleString()}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading prescriptions:', error);
    }
}

window.sellMedicine = async function (prescriptionId) {
    if (!confirm('Confirm medicine sale?')) return;

    try {
        await apiCall(`/pharmacist/sell/${prescriptionId}`, 'POST');
        loadPharmacistPrescriptions();
    } catch (error) {
        alert('Error selling medicine: ' + error.message);
    }
};

async function loadPharmacistAnalytics() {
    try {
        const analytics = await apiCall('/pharmacist/analytics');

        const content = document.getElementById('pharmacistContent');
        content.innerHTML = `
            <div class="page-header">
                <h1>Analytics</h1>
                <p>Inventory and sales insights</p>
            </div>
            
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-label">Total Medicines</div>
                    <div class="stat-value">${analytics.totalMedicines}</div>
                    <div class="stat-description">In inventory</div>
                </div>
                
                <div class="stat-card orange">
                    <div class="stat-label">Low Stock Items</div>
                    <div class="stat-value">${analytics.lowStockCount}</div>
                    <div class="stat-description">Need restock</div>
                </div>
                
                <div class="stat-card green">
                    <div class="stat-label">Monthly Sales</div>
                    <div class="stat-value">${analytics.monthlySales}</div>
                    <div class="stat-description">Last 30 days</div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error loading analytics:', error);
    }
}

// ==================== ADMIN DASHBOARD ====================
async function renderAdminDashboard() {
    dashboardPage.innerHTML = `
        <div class="dashboard">
            <div class="sidebar">
                <div class="sidebar-header">
                    <h2>Online Medication & Prescription Tracking</h2>
                </div>
                
                <div class="user-info">
                    <div class="user-avatar">${currentUser.fullName.charAt(0)}</div>
                    <div class="user-details">
                        <h3>${currentUser.fullName}</h3>
                        <p>${currentUser.role}</p>
                    </div>
                </div>
                
                <div class="nav-menu">
                    <div class="nav-item active" data-view="approvals">
                        ✅ Pending Approvals
                    </div>
                    <div class="nav-item" data-view="users">
                        👥 Users Management
                    </div>
                    <div class="nav-item" data-view="prescriptions">
                        📋 Prescriptions
                    </div>
                    <div class="nav-item" data-view="inventory">
                        📦 Inventory
                    </div>
                    <div class="nav-item" data-view="analytics">
                        📊 Analytics
                    </div>
                </div>
                
                <button class="logout-btn" onclick="logout()">
                    🚪 Logout
                </button>
            </div>
            
            <div class="main-content">
                <div id="adminContent"></div>
            </div>
        </div>
    `;

    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            const view = item.dataset.view;
            if (view === 'approvals') loadAdminApprovals();
            if (view === 'users') loadAdminUsers();
            if (view === 'prescriptions') loadAdminPrescriptions();
            if (view === 'inventory') loadAdminInventory();
            if (view === 'analytics') loadAdminAnalytics();
        });
    });

    loadAdminApprovals();
}

async function loadAdminApprovals() {
    try {
        const pendingUsers = await apiCall('/admin/users?status=pending');

        const content = document.getElementById('adminContent');
        content.innerHTML = `
            <div class="page-header">
                <h1>Pending Approvals</h1>
                <p>Review and approve user registrations</p>
            </div>
            
            ${pendingUsers.length === 0 ? `
                <div class="empty-state">
                    <h3>No pending approvals</h3>
                    <p>All users have been reviewed</p>
                </div>
            ` : `
                <div class="card">
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Mobile</th>
                                    <th>License #</th>
                                    <th>Registered</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${pendingUsers.map(user => `
                                    <tr>
                                        <td>${user.fullName}</td>
                                        <td>${user.email}</td>
                                        <td><span class="badge badge-info">${user.role}</span></td>
                                        <td>${user.mobile}</td>
                                        <td>${user.medicalLicenseNumber || '-'}</td>
                                        <td>${new Date(user.createdAt).toLocaleDateString()}</td>
                                        <td>
                                            <button class="btn btn-success" style="padding: 0.5rem 1rem; font-size: 0.875rem;" 
                                                onclick="updateUserStatus(${user.id}, 'approved')">Approve</button>
                                            <button class="btn btn-danger" style="padding: 0.5rem 1rem; font-size: 0.875rem;" 
                                                onclick="updateUserStatus(${user.id}, 'rejected')">Reject</button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `}
        `;
    } catch (error) {
        console.error('Error loading approvals:', error);
    }
}

window.updateUserStatus = async function (userId, status) {
    try {
        await apiCall(`/admin/users/${userId}/status`, 'PUT', { status });
        loadAdminApprovals();
    } catch (error) {
        alert('Error updating status: ' + error.message);
    }
};

async function loadAdminUsers() {
    try {
        const users = await apiCall('/admin/users');

        const content = document.getElementById('adminContent');
        content.innerHTML = `
            <div class="page-header">
                <h1>Users Management</h1>
                <p>Manage all system users</p>
            </div>
            
            <div class="card">
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Status</th>
                                <th>Enabled</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${users.map(user => `
                                <tr>
                                    <td>${user.fullName}</td>
                                    <td>${user.email}</td>
                                    <td><span class="badge badge-info">${user.role}</span></td>
                                    <td>
                                        <span class="badge badge-${user.status === 'approved' ? 'success' :
                user.status === 'pending' ? 'warning' : 'danger'
            }">
                                            ${user.status}
                                        </span>
                                    </td>
                                    <td>
                                        <span class="badge badge-${user.enabled ? 'success' : 'danger'}">
                                            ${user.enabled ? 'Yes' : 'No'}
                                        </span>
                                    </td>
                                    <td>
                                        <button class="btn btn-secondary" style="padding: 0.5rem 1rem; font-size: 0.875rem;" 
                                            onclick="toggleUser(${user.id})">
                                            ${user.enabled ? 'Disable' : 'Enable'}
                                        </button>
                                        <button class="btn btn-danger" style="padding: 0.5rem 1rem; font-size: 0.875rem;" 
                                            onclick="deleteUser(${user.id})">Delete</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

window.toggleUser = async function (userId) {
    try {
        await apiCall(`/admin/users/${userId}/toggle`, 'PUT');
        loadAdminUsers();
    } catch (error) {
        alert('Error toggling user: ' + error.message);
    }
};

window.deleteUser = async function (userId) {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
        await apiCall(`/admin/users/${userId}`, 'DELETE');
        loadAdminUsers();
    } catch (error) {
        alert('Error deleting user: ' + error.message);
    }
};

async function loadAdminPrescriptions() {
    try {
        const prescriptions = await apiCall('/admin/prescriptions');

        const content = document.getElementById('adminContent');
        content.innerHTML = `
            <div class="page-header">
                <h1>All Prescriptions</h1>
                <p>View all system prescriptions (read-only)</p>
            </div>
            
            <div class="card">
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Patient</th>
                                <th>Doctor</th>
                                <th>Medicine</th>
                                <th>Duration</th>
                                <th>Status</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${prescriptions.map(p => `
                                <tr>
                                    <td>${p.patient?.fullName || 'Unknown'}</td>
                                    <td>${p.doctor?.fullName || 'Unknown'}</td>
                                    <td>${p.medicineName}</td>
                                    <td>${p.duration} days</td>
                                    <td>
                                        <span class="badge badge-${p.status === 'active' ? 'success' : 'secondary'}">
                                            ${p.status}
                                        </span>
                                    </td>
                                    <td>${new Date(p.createdAt).toLocaleDateString()}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error loading prescriptions:', error);
    }
}

async function loadAdminInventory() {
    try {
        const inventory = await apiCall('/inventory');

        const content = document.getElementById('adminContent');
        content.innerHTML = `
            <div class="page-header">
                <h1>Inventory Details</h1>
                <p>View all inventory (read-only)</p>
            </div>
            
            <div class="card">
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Medicine</th>
                                <th>Batch</th>
                                <th>Expiry</th>
                                <th>Stock</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${inventory.map(item => `
                                <tr>
                                    <td>${item.medicine_name}</td>
                                    <td>${item.batch_number}</td>
                                    <td>${new Date(item.expiry_date).toLocaleDateString()}</td>
                                    <td>${item.stock_quantity}</td>
                                    <td>
                                        ${item.is_expired ? '<span class="badge badge-danger">Expired</span>' : ''}
                                        ${item.is_low_stock && !item.is_expired ? '<span class="badge badge-warning">Low Stock</span>' : ''}
                                        ${!item.is_expired && !item.is_low_stock ? '<span class="badge badge-success">OK</span>' : ''}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error loading inventory:', error);
    }
}

async function loadAdminAnalytics() {
    try {
        const analytics = await apiCall('/admin/analytics');

        const content = document.getElementById('adminContent');
        content.innerHTML = `
            <div class="page-header">
                <h1>System Analytics</h1>
                <p>Overview of system metrics</p>
            </div>
            
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-label">Total Users</div>
                    <div class="stat-value">${analytics.totalUsers}</div>
                    <div class="stat-description">All registered users</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-label">Doctors</div>
                    <div class="stat-value">${analytics.totalDoctors}</div>
                    <div class="stat-description">Registered doctors</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-label">Patients</div>
                    <div class="stat-value">${analytics.totalPatients}</div>
                    <div class="stat-description">Registered patients</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-label">Pharmacists</div>
                    <div class="stat-value">${analytics.totalPharmacists}</div>
                    <div class="stat-description">Registered pharmacists</div>
                </div>
                
                <div class="stat-card green">
                    <div class="stat-label">Total Prescriptions</div>
                    <div class="stat-value">${analytics.totalPrescriptions}</div>
                    <div class="stat-description">All time</div>
                </div>
                
                <div class="stat-card orange">
                    <div class="stat-label">Low Stock Alert</div>
                    <div class="stat-value">${analytics.lowStockCount}</div>
                    <div class="stat-description">Items need restock</div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error loading analytics:', error);
    }
}
