const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:') 
    ? 'https://online-medication-prescription-tracker-production.up.railway.app/api' 
    : `${window.location.origin}/api`;
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

    // Cleanup AI Chat state on logout
    if (window.cleanupAIChat) {
        window.cleanupAIChat();
    }
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

    // Initialize AI Chat Assistant when dashboard loads
    if (window.initAIChat) {
        window.initAIChat();
    }
}

// ==================== DOCTOR DASHBOARD ====================
async function renderDoctorDashboard() {
    dashboardPage.innerHTML = `
        <div class="dashboard">
            <button class="mobile-menu-toggle" onclick="document.querySelector('.sidebar').classList.toggle('active')">
                <i class="fas fa-bars"></i>
            </button>
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
                    
                    <div style="display:flex; gap:0.75rem; margin-top:1.5rem;">
                        <button type="button" class="btn btn-secondary close-modal" style="flex:1; padding:0.75rem;">Cancel</button>
                        <button type="submit" class="btn btn-primary" style="flex:2; padding:0.75rem;">Create Prescription</button>
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
        const [analytics, weeklyData] = await Promise.all([
            apiCall('/doctor/analytics'),
            apiCall('/doctor/analytics/weekly')
        ]);

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
            
            <div class="card">
                <div class="card-header">
                    <h3>Prescription Trend (Last 7 Days)</h3>
                </div>
                <div class="chart-container">
                    <canvas id="prescriptionTrendChart"></canvas>
                </div>
            </div>
        `;

        // Create line chart
        const ctx = document.getElementById('prescriptionTrendChart');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: weeklyData.prescriptions.map(d => {
                    const date = new Date(d.date);
                    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                }),
                datasets: [{
                    label: 'Prescriptions Created',
                    data: weeklyData.prescriptions.map(d => d.count),
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderColor: '#3b82f6',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#3b82f6',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 7
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: '#e4e6eb', font: { size: 14 } }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(30, 34, 41, 0.95)',
                        titleColor: '#e4e6eb',
                        bodyColor: '#b0b3ba',
                        borderColor: '#2d3139',
                        borderWidth: 1,
                        padding: 12
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: '#b0b3ba',
                            stepSize: 1
                        },
                        grid: { color: '#2d3139' },
                        title: {
                            display: true,
                            text: 'Prescriptions',
                            color: '#e4e6eb'
                        }
                    },
                    x: {
                        ticks: { color: '#b0b3ba' },
                        grid: { color: '#2d3139' },
                        title: {
                            display: true,
                            text: 'Date',
                            color: '#e4e6eb'
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error loading analytics:', error);
    }
}

// ==================== PATIENT DASHBOARD ====================
async function renderPatientDashboard() {
    dashboardPage.innerHTML = `
        <div class="dashboard">
            <button class="mobile-menu-toggle" onclick="document.querySelector('.sidebar').classList.toggle('active')">
                <i class="fas fa-bars"></i>
            </button>
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
        // Request notification permission
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

        const now = new Date();
        const today = new Date(); today.setHours(0,0,0,0);

        // Group by prescription, then collect all of today's + tomorrow's
        const grouped = {}; // keyed by prescriptionId
        reminders.forEach(r => {
            const pid = r.prescriptionId;
            if (!grouped[pid]) {
                grouped[pid] = { prescription: r.prescription, today: [], tomorrow: [] };
            }
            const rDay = new Date(r.reminderTime); rDay.setHours(0,0,0,0);
            if (rDay.getTime() === today.getTime()) {
                grouped[pid].today.push(r);
            } else {
                grouped[pid].tomorrow.push(r);
            }
        });

        const getStatusBadge = (s) => ({
            'due_now':     `<span class="badge" style="background:#ef4444;animation:pulse 1.5s infinite;">🔔 DUE NOW</span>`,
            'grace_period':`<span class="badge" style="background:#f59e0b;">⏰ Grace Period</span>`,
            'upcoming':    `<span class="badge" style="background:#3b82f6;">📅 Upcoming</span>`
        }[s] || `<span class="badge badge-secondary">Pending</span>`);

        const fmtTime = (t) => new Date(t).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        const fmtCountdown = (mins) => {
            if (!mins) return '-';
            const m = Math.floor(mins), s = Math.floor((mins - m) * 60);
            return `${m}m ${s}s left`;
        };

        // Find next upcoming reminder per prescription
        const getNextReminder = (list) => {
            const upcoming = list.filter(r => new Date(r.reminderTime) > now || r.reminderStatus === 'due_now' || r.reminderStatus === 'grace_period');
            if (upcoming.length) return upcoming[0];
            return list[list.length - 1]; // fallback last
        };

        const renderReminderRow = (r, showEdit = true) => `
            <tr class="reminder-row" data-reminder-id="${r.id}" data-status="${r.reminderStatus}">
                <td>
                    <div style="display:flex;align-items:center;gap:0.5rem;">
                        <strong>${fmtTime(r.reminderTime)}</strong>
                        ${showEdit ? `<button class="btn btn-secondary" style="padding:0.2rem 0.45rem;font-size:0.7rem;" 
                            onclick="editReminderTime(${r.id},'${r.reminderTime}')" title="Edit time">✏️</button>` : ''}
                    </div>
                </td>
                <td>${getStatusBadge(r.reminderStatus)}</td>
                <td><span class="countdown-timer" data-minutes="${r.minutesUntilMissed || 0}">
                    ${r.reminderStatus === 'grace_period' ? fmtCountdown(r.minutesUntilMissed) : '-'}
                </span></td>
                <td>
                    <button class="btn btn-success" style="padding:0.4rem 0.8rem;font-size:0.8rem;" onclick="confirmDose(${r.id},'taken')">✓ Taken</button>
                    <button class="btn btn-secondary" style="padding:0.4rem 0.8rem;font-size:0.8rem;" onclick="confirmDose(${r.id},'missed')">✗ Skip</button>
                </td>
            </tr>`;

        const renderExpandedTable = (list, prescriptionId) => `
            <div class="table-container" id="expanded-${prescriptionId}">
                <table>
                    <thead><tr><th>Time</th><th>Status</th><th>Countdown</th><th>Actions</th></tr></thead>
                    <tbody>${list.map(r => renderReminderRow(r)).join('')}</tbody>
                </table>
            </div>`;

        let html = '';

        // --- TODAY'S SECTION ---
        const todayGroups = Object.values(grouped).filter(g => g.today.length > 0);
        if (todayGroups.length > 0) {
            html += `<h2 style="margin:2rem 0 1rem;color:#3b82f6;display:flex;align-items:center;gap:0.5rem;">📅 Today's Schedule</h2>`;
            html += todayGroups.map(group => {
                const next = getNextReminder(group.today);
                const pid = group.prescription.id;
                const isDue = next.reminderStatus === 'due_now' || next.reminderStatus === 'grace_period';
                return `
                <div class="card" style="border-left: 3px solid ${isDue ? '#ef4444' : '#3b82f6'}; margin-bottom:1rem;">
                    <div class="card-header" style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:0.5rem;">
                        <div>
                            <h3>💊 ${group.prescription.medicineName}</h3>
                            <p style="color:#9ca3af;font-size:0.85rem;margin-top:0.25rem;">
                                ${group.prescription.frequency.replace(/-/g,' ')} &nbsp;·&nbsp; 
                                ${group.today.length} dose${group.today.length > 1 ? 's' : ''} today
                            </p>
                        </div>
                        <button onclick="toggleSchedule('${pid}', this)" 
                            style="background:var(--bg-tertiary);border:1px solid var(--border-color);color:var(--text-secondary);padding:0.4rem 0.85rem;border-radius:8px;cursor:pointer;font-size:0.8rem;white-space:nowrap;">
                            📋 View Full Schedule
                        </button>
                    </div>

                    <!-- NEXT REMINDER (default view) -->
                    <div id="next-${pid}">
                        <p style="color:var(--text-muted);font-size:0.8rem;padding:0 0 0.5rem 0;">Next reminder:</p>
                        <div class="table-container">
                            <table>
                                <thead><tr><th>Time</th><th>Status</th><th>Countdown</th><th>Actions</th></tr></thead>
                                <tbody>${renderReminderRow(next)}</tbody>
                            </table>
                        </div>
                    </div>

                    <!-- FULL SCHEDULE (hidden by default, shown on toggle) -->
                    <div id="full-${pid}" style="display:none;">
                        <p style="color:var(--text-muted);font-size:0.8rem;padding:0 0 0.5rem 0;">All reminders today — click ✏️ to edit a time:</p>
                        ${renderExpandedTable(group.today, pid)}
                    </div>
                </div>`;
            }).join('');
        }

        // --- TOMORROW'S SECTION ---
        const tomorrowGroups = Object.values(grouped).filter(g => g.tomorrow.length > 0);
        if (tomorrowGroups.length > 0) {
            html += `<h2 style="margin:2rem 0 1rem;color:#6b7280;display:flex;align-items:center;gap:0.5rem;">🌅 Tomorrow's Schedule</h2>`;
            html += tomorrowGroups.map(group => {
                const next = getNextReminder(group.tomorrow);
                const pid = 'tmr_' + group.prescription.id;
                return `
                <div class="card" style="opacity:0.8;margin-bottom:1rem;">
                    <div class="card-header" style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:0.5rem;">
                        <div>
                            <h3>💊 ${group.prescription.medicineName}</h3>
                            <p style="color:#9ca3af;font-size:0.85rem;margin-top:0.25rem;">
                                ${group.prescription.frequency.replace(/-/g,' ')} &nbsp;·&nbsp; 
                                ${group.tomorrow.length} dose${group.tomorrow.length > 1 ? 's' : ''} tomorrow
                            </p>
                        </div>
                        <button onclick="toggleSchedule('${pid}', this)"
                            style="background:var(--bg-tertiary);border:1px solid var(--border-color);color:var(--text-secondary);padding:0.4rem 0.85rem;border-radius:8px;cursor:pointer;font-size:0.8rem;white-space:nowrap;">
                            📋 View Full Schedule
                        </button>
                    </div>

                    <div id="next-${pid}">
                        <p style="color:var(--text-muted);font-size:0.8rem;padding:0 0 0.5rem 0;">First reminder tomorrow:</p>
                        <div class="table-container">
                            <table>
                                <thead><tr><th>Time</th><th>Status</th><th>Countdown</th><th>Actions</th></tr></thead>
                                <tbody>${renderReminderRow(next, false)}</tbody>
                            </table>
                        </div>
                    </div>

                    <div id="full-${pid}" style="display:none;">
                        <p style="color:var(--text-muted);font-size:0.8rem;padding:0 0 0.5rem 0;">All reminders tomorrow:</p>
                        ${renderExpandedTable(group.tomorrow, pid)}
                    </div>
                </div>`;
            }).join('');
        }

        listDiv.innerHTML = html || `
            <div class="empty-state">
                <h3>No active reminders for today or tomorrow</h3>
                <p>Reminders appear after you purchase an active prescription</p>
            </div>`;

        // Alarm + notification for DUE NOW reminders
        const dueNow = reminders.filter(r => r.reminderStatus === 'due_now');
        if (dueNow.length > 0) {
            playAlarmSound();
            if ('Notification' in window && Notification.permission === 'granted') {
                dueNow.forEach(r => {
                    new Notification('💊 Medication Due Now!', {
                        body: `Time to take ${r.prescription.medicineName}`,
                        icon: '/favicon.ico',
                        tag: `reminder-${r.id}`,
                        requireInteraction: true
                    });
                });
            }
        }

        startReminderUpdates();

    } catch (error) {
        console.error('Error loading reminders:', error);
    }
}

// Toggle full schedule expand/collapse
window.toggleSchedule = function(pid, btn) {
    const nextDiv = document.getElementById(`next-${pid}`);
    const fullDiv = document.getElementById(`full-${pid}`);
    const isExpanded = fullDiv.style.display !== 'none';
    if (isExpanded) {
        fullDiv.style.display = 'none';
        nextDiv.style.display = '';
        btn.textContent = '📋 View Full Schedule';
    } else {
        fullDiv.style.display = '';
        nextDiv.style.display = 'none';
        btn.textContent = '🔼 Hide Schedule';
    }
};

// Play a soft alarm beep using Web Audio API
function playAlarmSound() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const beepCount = 3;
        for (let i = 0; i < beepCount; i++) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.value = 880;
            gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.6);
            gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + i * 0.6 + 0.05);
            gain.gain.linearRampToValueAtTime(0, ctx.currentTime + i * 0.6 + 0.45);
            osc.start(ctx.currentTime + i * 0.6);
            osc.stop(ctx.currentTime + i * 0.6 + 0.5);
        }
    } catch(e) { /* audio not available */ }
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
        // Client-side validation: Check if confirming "taken" before reminder time
        if (status === 'taken') {
            const reminderRow = document.querySelector(`button[onclick="confirmDose(${reminderId}, 'taken')"]`)?.closest('tr');
            if (reminderRow) {
                const reminderTimeText = reminderRow.querySelector('td:first-child')?.textContent;
                // This is a basic check - the server will do the authoritative validation
            }
        }

        await apiCall(`/patient/reminders/${reminderId}/confirm`, 'POST', { status });
        loadPatientReminders();
    } catch (error) {
        alert('Error: ' + error.message);
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
                <div class="btn-group" style="display: flex; gap: 1rem; margin-top: 1.5rem;">
                    <button type="button" class="btn btn-secondary close-modal" style="flex: 1;">Cancel</button>
                    <button type="submit" class="btn btn-primary" style="flex: 1;">Save Time</button>
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
                
                <div class="stat-card">
                    <div class="stat-label">Total Reminders</div>
                    <div class="stat-value">${analytics.totalReminders || 0}</div>
                    <div class="stat-description">All time</div>
                </div>
                
                <div class="stat-card green">
                    <div class="stat-label">Doses Taken</div>
                    <div class="stat-value">${analytics.takenDoses || 0}</div>
                    <div class="stat-description">Completed doses</div>
                </div>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <h3>Adherence Trend (Last 14 Days)</h3>
                </div>
                <div class="chart-container">
                    <canvas id="adherenceChart"></canvas>
                </div>
            </div>
        `;

        // Create line chart
        const ctx = document.getElementById('adherenceChart');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: analytics.weeklyAdherence.map(d => {
                    const date = new Date(d.date);
                    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                }),
                datasets: [{
                    label: 'Adherence %',
                    data: analytics.weeklyAdherence.map(d => d.adherence),
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderColor: '#10b981',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#10b981',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 7
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: '#e4e6eb', font: { size: 14 } }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(30, 34, 41, 0.95)',
                        titleColor: '#e4e6eb',
                        bodyColor: '#b0b3ba',
                        borderColor: '#2d3139',
                        borderWidth: 1,
                        padding: 12,
                        displayColors: false,
                        callbacks: {
                            label: function (context) {
                                const index = context.dataIndex;
                                const data = analytics.weeklyAdherence[index];
                                return [
                                    `Adherence: ${data.adherence}%`,
                                    `Taken: ${data.takenDoses}/${data.totalReminders}`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            color: '#b0b3ba',
                            callback: function (value) {
                                return value + '%';
                            }
                        },
                        grid: { color: '#2d3139' },
                        title: {
                            display: true,
                            text: 'Adherence Percentage',
                            color: '#e4e6eb'
                        }
                    },
                    x: {
                        ticks: { color: '#b0b3ba' },
                        grid: { color: '#2d3139' },
                        title: {
                            display: true,
                            text: 'Date',
                            color: '#e4e6eb'
                        }
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
            <button class="mobile-menu-toggle" onclick="document.querySelector('.sidebar').classList.toggle('active')">
                <i class="fas fa-bars"></i>
            </button>
            <div class="sidebar">
                <div class="sidebar-header">
                    <h2>Online Medication &amp; Prescription Tracking</h2>
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
                <div style="display:flex; justify-content:flex-end; padding: 1rem 1.5rem 0; position: relative;">
                    <button id="pharmNotifBtn" onclick="togglePharmacistNotifications()" style="background:var(--bg-card); border:1px solid var(--border-color); color:var(--text-primary); border-radius:50%; width:44px; height:44px; cursor:pointer; position:relative; display:flex; align-items:center; justify-content:center; font-size:1.2rem; box-shadow:var(--shadow); transition: background 0.2s;" title="Notifications">
                        🔔
                        <span id="pharmNotifBadge" style="display:none; position:absolute; top:-4px; right:-4px; background:var(--accent-red); color:#fff; border-radius:50%; width:20px; height:20px; font-size:0.7rem; font-weight:700; align-items:center; justify-content:center;">0</span>
                    </button>
                    <div id="pharmNotifPanel" style="display:none; position:absolute; top:60px; right:1.5rem; width:420px; max-height:500px; overflow-y:auto; background:var(--bg-card); border:1px solid var(--border-color); border-radius:12px; box-shadow:var(--shadow-lg); z-index:999;">
                        <div style="padding:1rem 1.25rem; border-bottom:1px solid var(--border-color); display:flex; align-items:center; justify-content:space-between;">
                            <h3 style="font-size:1rem; font-weight:700;">🔔 Notifications</h3>
                            <button onclick="togglePharmacistNotifications()" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:1.2rem;">×</button>
                        </div>
                        <div id="pharmNotifList" style="padding:0.5rem 0;">
                            <div style="padding:1rem; text-align:center; color:var(--text-muted);">Loading...</div>
                        </div>
                    </div>
                </div>
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
    loadPharmacistNotificationCount();
}

async function loadPharmacistNotificationCount() {
    try {
        const notifications = await apiCall('/pharmacist/notifications');
        const badge = document.getElementById('pharmNotifBadge');
        if (badge) {
            if (notifications.length > 0) {
                badge.textContent = notifications.length;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    } catch (e) {
        console.error('Failed to load notification count', e);
    }
}

window.togglePharmacistNotifications = async function() {
    const panel = document.getElementById('pharmNotifPanel');
    if (!panel) return;
    const isOpen = panel.style.display !== 'none';
    if (isOpen) {
        panel.style.display = 'none';
        return;
    }
    panel.style.display = 'block';
    const listDiv = document.getElementById('pharmNotifList');
    listDiv.innerHTML = '<div style="padding:1rem; text-align:center; color:var(--text-muted);">Loading...</div>';
    try {
        const notifications = await apiCall('/pharmacist/notifications');
        if (notifications.length === 0) {
            listDiv.innerHTML = '<div style="padding:1.5rem; text-align:center; color:var(--text-muted);">✅ No notifications. All medicines are in order.</div>';
            return;
        }
        listDiv.innerHTML = notifications.map(n => {
            if (n.type === 'expired') {
                return `
                    <div style="padding:0.85rem 1.25rem; border-bottom:1px solid var(--border-color); background:rgba(239,68,68,0.05);">
                        <div style="display:flex; align-items:flex-start; gap:0.75rem;">
                            <span style="font-size:1.3rem; flex-shrink:0;">🚨</span>
                            <div style="flex:1; min-width:0;">
                                <div style="font-weight:700; color:var(--accent-red); font-size:0.85rem; margin-bottom:0.2rem;">${n.title}</div>
                                <div style="color:var(--text-secondary); font-size:0.8rem; margin-bottom:0.65rem;">${n.message}</div>
                                <div style="display:flex; gap:0.5rem;">
                                    <button onclick="pharmRestockModal(${n.inventory_id}, '${n.medicine_name.replace(/'/g, "\\'")}')"
                                        style="background:var(--accent-blue); color:#fff; border:none; border-radius:6px; padding:0.35rem 0.8rem; font-size:0.75rem; font-weight:600; cursor:pointer;">🔄 Restock</button>
                                    <button onclick="pharmRemoveExpired(${n.inventory_id})"
                                        style="background:var(--accent-red); color:#fff; border:none; border-radius:6px; padding:0.35rem 0.8rem; font-size:0.75rem; font-weight:600; cursor:pointer;">🗑️ Remove</button>
                                </div>
                            </div>
                        </div>
                    </div>`;
            } else {
                return `
                    <div style="padding:0.85rem 1.25rem; border-bottom:1px solid var(--border-color); background:rgba(245,158,11,0.05);">
                        <div style="display:flex; align-items:flex-start; gap:0.75rem;">
                            <span style="font-size:1.3rem; flex-shrink:0;">⚠️</span>
                            <div style="flex:1;">
                                <div style="font-weight:700; color:var(--accent-orange); font-size:0.85rem; margin-bottom:0.2rem;">${n.title}</div>
                                <div style="color:var(--text-secondary); font-size:0.8rem;">${n.message}</div>
                            </div>
                        </div>
                    </div>`;
            }
        }).join('');
    } catch(e) {
        listDiv.innerHTML = '<div style="padding:1rem; color:var(--accent-red);">Failed to load notifications.</div>';
    }
};

window.pharmRestockModal = function(inventoryId, medicineName) {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    // Compute tomorrow's date as the minimum selectable expiry date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minDate = tomorrow.toISOString().split('T')[0];

    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>\uD83D\uDD04 Restock: ${medicineName}</h3>
                <button class="close-modal">\u00d7</button>
            </div>
            <p style="color:var(--text-secondary); font-size:0.875rem; margin-bottom:1.25rem;">Enter new batch details to replace the expired stock.</p>
            <form id="restockForm">
                <div class="form-group">
                    <label>New Batch Number</label>
                    <input type="text" id="restockBatch" required placeholder="e.g. BATCH2027001">
                </div>
                <div class="form-group">
                    <label>New Expiry Date</label>
                    <input type="date" id="restockExpiry" required min="${minDate}">
                </div>
                <div class="form-group">
                    <label>Stock Quantity</label>
                    <input type="number" id="restockQty" min="1" required placeholder="Enter quantity">
                </div>
                <div style="display:flex; gap:0.75rem; margin-top:1.5rem;">
                    <button type="button" class="btn btn-secondary close-modal" style="flex:1; padding:0.75rem;">Cancel</button>
                    <button type="submit" class="btn btn-primary" style="flex:2; padding:0.75rem;">\u2705 Restock</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    modal.querySelectorAll('.close-modal').forEach(b => b.addEventListener('click', () => modal.remove()));
    modal.querySelector('#restockForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const batchNumber = document.getElementById('restockBatch').value;
        const expiryDate = document.getElementById('restockExpiry').value;
        const stockQuantity = document.getElementById('restockQty').value;
        try {
            await apiCall(`/inventory/${inventoryId}`, 'PUT', { batchNumber, expiryDate, stockQuantity });
            modal.remove();
            // Close notification panel and refresh
            const panel = document.getElementById('pharmNotifPanel');
            if (panel) panel.style.display = 'none';
            loadPharmacistInventory();
            loadPharmacistNotificationCount();
            alert('\u2705 Medicine restocked successfully!');
        } catch(err) {
            alert('Error restocking: ' + err.message);
        }
    });
};

window.pharmRemoveExpired = async function(inventoryId) {
    if (!confirm('Remove this expired medicine from inventory? This action cannot be undone.')) return;
    try {
        await apiCall(`/inventory/${inventoryId}`, 'DELETE');
        // Refresh notification panel
        const panel = document.getElementById('pharmNotifPanel');
        if (panel && panel.style.display !== 'none') {
            await window.togglePharmacistNotifications();
            await window.togglePharmacistNotifications();
        }
        loadPharmacistInventory();
        loadPharmacistNotificationCount();
        alert('✅ Expired medicine removed from inventory.');
    } catch(err) {
        alert('Error removing: ' + err.message);
    }
};

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
                            ${inventory.map(item => {
                                const isExpired = Number(item.is_expired) === 1;
                                const isLowStock = Number(item.is_low_stock) === 1;
                                return `
                                <tr style="${isExpired ? 'opacity:0.85;' : ''}">
                                    <td>${item.medicine_name}</td>
                                    <td>${item.batch_number}</td>
                                    <td style="color: ${isExpired ? 'var(--accent-red)' : 'inherit'};">${new Date(item.expiry_date).toLocaleDateString()}</td>
                                    <td>${item.stock_quantity}</td>
                                    <td>
                                        ${isExpired ? '<span class="badge badge-danger">Expired</span>' : ''}
                                        ${isLowStock && !isExpired ? '<span class="badge badge-warning">Low Stock</span>' : ''}
                                        ${!isExpired && !isLowStock ? '<span class="badge badge-success">OK</span>' : ''}
                                    </td>
                                    <td>
                                        <button class="btn btn-secondary" style="padding: 0.5rem 1rem; font-size: 0.875rem;" 
                                            onclick="editInventory(${item.id})">Edit</button>
                                        <button class="btn btn-danger" style="padding: 0.5rem 1rem; font-size: 0.875rem;" 
                                            onclick="deleteInventory(${item.id})">Delete</button>
                                    </td>
                                </tr>`;
                            }).join('')}
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
                
                <div style="display:flex; gap:0.75rem; margin-top:1.5rem;">
                    <button type="button" class="btn btn-secondary close-modal" style="flex:1; padding:0.75rem;">Cancel</button>
                    <button type="submit" class="btn btn-primary" style="flex:2; padding:0.75rem;">Add Stock</button>
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

window.editInventory = async function (id) {
    try {
        // Get all inventory items to find the one being edited
        const inventory = await apiCall('/inventory');
        const item = inventory.find(inv => inv.id === id);

        if (!item) {
            alert('Inventory item not found');
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Edit Inventory - ${item.medicine_name}</h3>
                    <button class="close-modal">×</button>
                </div>
                
                <form id="editInventoryForm">
                    <div class="form-group">
                        <label>Medicine</label>
                        <input type="text" value="${item.medicine_name}" disabled>
                    </div>
                    
                    <div class="form-group">
                        <label>Batch Number</label>
                        <input type="text" id="editBatchNumber" value="${item.batch_number}" required>
                    </div>
                    
                    <div class="form-group">
                        <label>Expiry Date</label>
                        <input type="date" id="editExpiryDate" value="${new Date(item.expiry_date).toISOString().split('T')[0]}" required>
                    </div>
                    
                    <div class="form-group">
                        <label>Stock Quantity</label>
                        <input type="number" id="editStockQuantity" value="${item.stock_quantity}" min="0" required>
                    </div>
                    
                    <div style="display:flex; gap:0.75rem; margin-top:1.5rem;">
                        <button type="button" class="btn btn-secondary close-modal" style="flex:1; padding:0.75rem;">Cancel</button>
                        <button type="submit" class="btn btn-primary" style="flex:2; padding:0.75rem;">Update Stock</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => modal.remove());
        });

        document.getElementById('editInventoryForm').addEventListener('submit', async (e) => {
            e.preventDefault();

            const batchNumber = document.getElementById('editBatchNumber').value;
            const expiryDate = document.getElementById('editExpiryDate').value;
            const stockQuantity = document.getElementById('editStockQuantity').value;

            try {
                await apiCall(`/inventory/${id}`, 'PUT', {
                    batchNumber,
                    expiryDate,
                    stockQuantity
                });

                modal.remove();
                loadPharmacistInventory();
            } catch (error) {
                alert('Error updating inventory: ' + error.message);
            }
        });
    } catch (error) {
        alert('Error loading inventory data: ' + error.message);
    }
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
        const [analytics, weeklyData] = await Promise.all([
            apiCall('/pharmacist/analytics'),
            apiCall('/pharmacist/analytics/weekly')
        ]);

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
                    <div class="stat-description">Need restock (non-expired)</div>
                </div>

                <div class="stat-card" style="border-top: 3px solid var(--accent-red);">
                    <div class="stat-label" style="color: var(--accent-red);">Expired Items</div>
                    <div class="stat-value" style="color: var(--accent-red);">${analytics.expiredCount}</div>
                    <div class="stat-description">Must be removed or restocked</div>
                </div>
                
                <div class="stat-card green">
                    <div class="stat-label">Monthly Sales</div>
                    <div class="stat-value">${analytics.monthlySales}</div>
                    <div class="stat-description">Last 30 days</div>
                </div>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <h3>Sales Trend (Last 7 Days)</h3>
                </div>
                <div class="chart-container">
                    <canvas id="salesTrendChart"></canvas>
                </div>
            </div>
        `;

        // Create line chart
        const ctx = document.getElementById('salesTrendChart');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: weeklyData.sales.map(d => {
                    const date = new Date(d.date);
                    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                }),
                datasets: [{
                    label: 'Medicines Sold',
                    data: weeklyData.sales.map(d => d.count),
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderColor: '#10b981',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#10b981',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 7
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: '#e4e6eb', font: { size: 14 } }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(30, 34, 41, 0.95)',
                        titleColor: '#e4e6eb',
                        bodyColor: '#b0b3ba',
                        borderColor: '#2d3139',
                        borderWidth: 1,
                        padding: 12
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: '#b0b3ba',
                            stepSize: 1
                        },
                        grid: { color: '#2d3139' },
                        title: {
                            display: true,
                            text: 'Sales',
                            color: '#e4e6eb'
                        }
                    },
                    x: {
                        ticks: { color: '#b0b3ba' },
                        grid: { color: '#2d3139' },
                        title: {
                            display: true,
                            text: 'Date',
                            color: '#e4e6eb'
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error loading analytics:', error);
    }
}

// ==================== ADMIN DASHBOARD ====================
async function renderAdminDashboard() {
    dashboardPage.innerHTML = `
        <div class="dashboard">
            <button class="mobile-menu-toggle" onclick="document.querySelector('.sidebar').classList.toggle('active')">
                <i class="fas fa-bars"></i>
            </button>
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
                                        <td>${user.fullName || user.full_name || 'N/A'}</td>
                                        <td>${user.email}</td>
                                        <td><span class="badge badge-info">${user.role}</span></td>
                                        <td>${user.mobile}</td>
                                        <td>${user.medicalLicenseNumber || user.medical_license_number || '-'}</td>
                                        <td>${new Date(user.createdAt || user.created_at).toLocaleDateString()}</td>
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
    const content = document.getElementById('adminContent');
    content.innerHTML = `
        <div class="page-header">
            <h1>Users Management</h1>
            <p>Manage all system users</p>
        </div>
        
        <div class="tabs">
            <div class="tab active" data-view="users">User List</div>
            <div class="tab" data-view="analytics">Analytics</div>
        </div>
        
        <div id="adminUsersContent"></div>
    `;

    // Tab handlers
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const view = tab.dataset.view;
            if (view === 'users') loadAdminUsersList();
            if (view === 'analytics') loadAdminUserAnalytics();
        });
    });

    loadAdminUsersList();
}

async function loadAdminUsersList() {
    try {
        const users = await apiCall('/admin/users');

        const content = document.getElementById('adminUsersContent');
        content.innerHTML = `
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
                                    <td>${user.fullName || user.full_name || 'N/A'}</td>
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

async function loadAdminUserAnalytics() {
    try {
        const analytics = await apiCall('/admin/users/analytics');

        const content = document.getElementById('adminUsersContent');
        content.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h3>Doctor Registrations (Last 7 Days)</h3>
                </div>
                <div class="chart-container">
                    <canvas id="doctorRegistrationsChart"></canvas>
                </div>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <h3>Patient Registrations (Last 7 Days)</h3>
                </div>
                <div class="chart-container">
                    <canvas id="patientRegistrationsChart"></canvas>
                </div>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <h3>Pharmacist Registrations (Last 7 Days)</h3>
                </div>
                <div class="chart-container">
                    <canvas id="pharmacistRegistrationsChart"></canvas>
                </div>
            </div>
        `;

        // Create charts
        const chartConfig = (data, label, color) => ({
            type: 'line',
            data: {
                labels: data.map(d => {
                    const date = new Date(d.date);
                    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                }),
                datasets: [{
                    label: label,
                    data: data.map(d => d.count),
                    backgroundColor: `${color}20`,
                    borderColor: color,
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: color,
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 7
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: '#e4e6eb', font: { size: 14 } }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(30, 34, 41, 0.95)',
                        titleColor: '#e4e6eb',
                        bodyColor: '#b0b3ba',
                        borderColor: '#2d3139',
                        borderWidth: 1,
                        padding: 12
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: '#b0b3ba',
                            stepSize: 1
                        },
                        grid: { color: '#2d3139' },
                        title: {
                            display: true,
                            text: 'Registrations',
                            color: '#e4e6eb'
                        }
                    },
                    x: {
                        ticks: { color: '#b0b3ba' },
                        grid: { color: '#2d3139' },
                        title: {
                            display: true,
                            text: 'Date',
                            color: '#e4e6eb'
                        }
                    }
                }
            }
        });

        new Chart(document.getElementById('doctorRegistrationsChart'),
            chartConfig(analytics.doctors, 'Doctor Registrations', '#3b82f6'));
        new Chart(document.getElementById('patientRegistrationsChart'),
            chartConfig(analytics.patients, 'Patient Registrations', '#10b981'));
        new Chart(document.getElementById('pharmacistRegistrationsChart'),
            chartConfig(analytics.pharmacists, 'Pharmacist Registrations', '#f59e0b'));
    } catch (error) {
        console.error('Error loading user analytics:', error);
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
                                    <td>${new Date(p.createdAt || p.created_at).toLocaleDateString()}</td>
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
                            ${inventory.map(item => {
                                const isExpired = Number(item.is_expired) === 1;
                                const isLowStock = Number(item.is_low_stock) === 1;
                                return `
                                <tr>
                                    <td>${item.medicine_name}</td>
                                    <td>${item.batch_number}</td>
                                    <td style="color: ${isExpired ? 'var(--accent-red)' : 'inherit'};">${new Date(item.expiry_date).toLocaleDateString()}</td>
                                    <td>${item.stock_quantity}</td>
                                    <td>
                                        ${isExpired ? '<span class="badge badge-danger">Expired</span>' : ''}
                                        ${isLowStock && !isExpired ? '<span class="badge badge-warning">Low Stock</span>' : ''}
                                        ${!isExpired && !isLowStock ? '<span class="badge badge-success">OK</span>' : ''}
                                    </td>
                                </tr>`;
                            }).join('')}
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
