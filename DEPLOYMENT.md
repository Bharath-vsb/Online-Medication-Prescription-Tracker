# 🚀 Deployment Guide

## Production Deployment Checklist

### Pre-Deployment

- [ ] Replace in-memory database with PostgreSQL/MongoDB
- [ ] Set strong JWT secret
- [ ] Change admin secret code
- [ ] Enable HTTPS
- [ ] Configure CORS properly
- [ ] Add rate limiting
- [ ] Set up error logging
- [ ] Configure backup system
- [ ] Add input validation middleware
- [ ] Enable security headers

### Security Hardening

#### 1. Environment Variables
Create `.env` file (never commit to git):
```env
PORT=3000
JWT_SECRET=use-a-strong-random-string-here
ADMIN_SECRET_CODE=change-from-0000
NODE_ENV=production
DATABASE_URL=your-database-connection-string
```

#### 2. Install Additional Security Packages
```bash
npm install helmet express-rate-limit express-validator dotenv
```

#### 3. Update server.js Security
```javascript
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

app.use(helmet());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

---

## Database Integration

### PostgreSQL Setup

#### 1. Install Dependencies
```bash
npm install pg sequelize
```

#### 2. Database Schema
```sql
-- Users Table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  mobile VARCHAR(20) NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  medical_license_number VARCHAR(100),
  status VARCHAR(50) DEFAULT 'pending',
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Medicines Table
CREATE TABLE medicines (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inventory Table
CREATE TABLE inventory (
  id SERIAL PRIMARY KEY,
  medicine_id INTEGER REFERENCES medicines(id),
  medicine_name VARCHAR(255) NOT NULL,
  batch_number VARCHAR(100) NOT NULL,
  expiry_date DATE NOT NULL,
  stock_quantity INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Prescriptions Table
CREATE TABLE prescriptions (
  id SERIAL PRIMARY KEY,
  prescription_group_id INTEGER NOT NULL,
  doctor_id INTEGER REFERENCES users(id),
  patient_id INTEGER REFERENCES users(id),
  medicine_id INTEGER REFERENCES medicines(id),
  medicine_name VARCHAR(255) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  duration INTEGER NOT NULL,
  frequency VARCHAR(50) NOT NULL,
  doses_per_day INTEGER NOT NULL,
  total_quantity INTEGER NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  bought BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sold Medicines Table
CREATE TABLE sold_medicines (
  id SERIAL PRIMARY KEY,
  prescription_id INTEGER REFERENCES prescriptions(id),
  medicine_id INTEGER REFERENCES medicines(id),
  quantity INTEGER NOT NULL,
  sold_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reminders Table
CREATE TABLE reminders (
  id SERIAL PRIMARY KEY,
  prescription_id INTEGER REFERENCES prescriptions(id),
  patient_id INTEGER REFERENCES users(id),
  reminder_time TIMESTAMP NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Dose Confirmations Table
CREATE TABLE dose_confirmations (
  id SERIAL PRIMARY KEY,
  reminder_id INTEGER REFERENCES reminders(id),
  prescription_id INTEGER REFERENCES prescriptions(id),
  patient_id INTEGER REFERENCES users(id),
  status VARCHAR(50) NOT NULL,
  confirmed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications Table
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit Logs Table
CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER REFERENCES users(id),
  action VARCHAR(255) NOT NULL,
  target_user_id INTEGER,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_prescriptions_doctor ON prescriptions(doctor_id);
CREATE INDEX idx_prescriptions_patient ON prescriptions(patient_id);
CREATE INDEX idx_prescriptions_status ON prescriptions(status);
CREATE INDEX idx_reminders_patient ON reminders(patient_id);
CREATE INDEX idx_inventory_medicine ON inventory(medicine_id);
```

---

### MongoDB Setup

#### 1. Install Dependencies
```bash
npm install mongoose
```

#### 2. Connection Code
```javascript
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// User Schema
const userSchema = new mongoose.Schema({
  fullName: String,
  email: { type: String, unique: true },
  mobile: String,
  password: String,
  role: String,
  medicalLicenseNumber: String,
  status: { type: String, default: 'pending' },
  enabled: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
```

---

## Cloud Deployment Options

### Option 1: Heroku

#### 1. Install Heroku CLI
```bash
npm install -g heroku
```

#### 2. Create Heroku App
```bash
heroku login
heroku create your-app-name
```

#### 3. Add Database
```bash
heroku addons:create heroku-postgresql:hobby-dev
```

#### 4. Set Environment Variables
```bash
heroku config:set JWT_SECRET=your-secret
heroku config:set ADMIN_SECRET_CODE=your-code
heroku config:set NODE_ENV=production
```

#### 5. Deploy
```bash
git push heroku main
```

#### 6. Open App
```bash
heroku open
```

---

### Option 2: AWS EC2

#### 1. Launch EC2 Instance
- Choose Ubuntu Server 22.04 LTS
- Instance type: t2.micro (free tier)
- Configure security group (ports 22, 80, 443, 3000)

#### 2. SSH into Instance
```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
```

#### 3. Install Node.js
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo apt-get install -y nginx
```

#### 4. Clone Repository
```bash
git clone your-repository-url
cd your-repository
npm install
```

#### 5. Install PM2
```bash
sudo npm install -g pm2
pm2 start server.js
pm2 startup
pm2 save
```

#### 6. Configure Nginx
```nginx
server {
  listen 80;
  server_name your-domain.com;

  location / {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }
}
```

#### 7. Enable HTTPS with Let's Encrypt
```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

### Option 3: DigitalOcean

#### 1. Create Droplet
- Choose Ubuntu 22.04
- Select $5/month plan
- Add SSH key

#### 2. Follow AWS EC2 steps 2-7

#### 3. Configure Firewall
```bash
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

---

### Option 4: Vercel (Frontend) + Railway (Backend)

#### Backend on Railway

1. Push code to GitHub
2. Go to railway.app
3. New Project → Deploy from GitHub
4. Add PostgreSQL database
5. Set environment variables
6. Deploy

#### Frontend on Vercel

1. Separate frontend into own folder
2. Push to GitHub
3. Import to Vercel
4. Set environment variables (API URL)
5. Deploy

---

## Environment-Specific Configuration

### Development
```javascript
if (process.env.NODE_ENV === 'development') {
  // Enable detailed error messages
  // Allow CORS from localhost
  // Use local database
}
```

### Production
```javascript
if (process.env.NODE_ENV === 'production') {
  // Minimal error messages
  // Strict CORS
  // Use production database
  // Enable HTTPS only
}
```

---

## Performance Optimization

### 1. Enable Compression
```bash
npm install compression
```

```javascript
const compression = require('compression');
app.use(compression());
```

### 2. Add Caching
```javascript
app.use(express.static('public', {
  maxAge: '1d',
  etag: true
}));
```

### 3. Database Indexing
Ensure all foreign keys and frequently queried fields are indexed.

### 4. Connection Pooling
```javascript
// PostgreSQL
const { Pool } = require('pg');
const pool = new Pool({
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

---

## Monitoring & Logging

### 1. Install Winston for Logging
```bash
npm install winston
```

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

### 2. Error Tracking (Sentry)
```bash
npm install @sentry/node
```

```javascript
const Sentry = require("@sentry/node");

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV
});
```

### 3. Uptime Monitoring
- Use services like UptimeRobot
- Set up health check endpoint:

```javascript
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});
```

---

## Backup Strategy

### 1. Database Backups
```bash
# PostgreSQL
pg_dump database_name > backup.sql

# Automated daily backups
0 2 * * * pg_dump database_name > /backups/backup-$(date +\%Y\%m\%d).sql
```

### 2. Code Backups
- Use Git for version control
- Push to GitHub/GitLab
- Tag releases

---

## SSL/TLS Configuration

### Using Let's Encrypt (Free)
```bash
sudo certbot --nginx -d yourdomain.com
```

### Manual Certificate
```javascript
const https = require('https');
const fs = require('fs');

const options = {
  key: fs.readFileSync('private-key.pem'),
  cert: fs.readFileSync('certificate.pem')
};

https.createServer(options, app).listen(443);
```

---

## CI/CD Pipeline

### GitHub Actions Example
Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Install dependencies
      run: npm install
    
    - name: Run tests
      run: npm test
    
    - name: Deploy to production
      run: |
        # Your deployment script
```

---

## Troubleshooting

### Common Issues

**Port already in use:**
```bash
sudo lsof -i :3000
sudo kill -9 PID
```

**Permission denied:**
```bash
sudo chown -R $USER:$USER /path/to/app
```

**Database connection failed:**
- Check connection string
- Verify firewall rules
- Check database credentials

**Out of memory:**
```bash
# Increase Node.js memory
node --max-old-space-size=4096 server.js
```

---

## Post-Deployment Checklist

- [ ] Test all user flows
- [ ] Verify database connections
- [ ] Check SSL certificate
- [ ] Test email notifications (if enabled)
- [ ] Verify backups are working
- [ ] Check monitoring dashboards
- [ ] Review error logs
- [ ] Test performance under load
- [ ] Verify CORS settings
- [ ] Check rate limiting

---

## Scaling Strategies

### Horizontal Scaling
- Use load balancer (nginx/AWS ELB)
- Deploy multiple instances
- Use session store (Redis)

### Vertical Scaling
- Upgrade server resources
- Optimize database queries
- Enable caching

### Database Scaling
- Read replicas
- Sharding
- Connection pooling

---

**Remember**: Always test deployments in a staging environment first!
