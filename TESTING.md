# 🧪 Testing Guide

## Manual Testing Scenarios

### Scenario 1: Complete Doctor Workflow

**Objective:** Test the full doctor experience from signup to analytics

1. **Sign Up as Doctor**
   - Navigate to signup page
   - Fill in all fields
   - Add medical license: `MD123456`
   - Submit form
   - Expected: "Waiting for admin approval" message

2. **Admin Approval**
   - Login as admin (`admin@healthcare.com` / `admin123`)
   - Go to "Pending Approvals"
   - Find the doctor account
   - Click "Approve"
   - Expected: Status changes to approved

3. **Doctor Login**
   - Logout from admin
   - Login with doctor credentials
   - Expected: Redirected to Doctor Dashboard

4. **Create Patient Account**
   - Logout, signup as patient
   - Login as patient (auto-approved)
   - Note patient email for next step

5. **Create Prescription**
   - Login as doctor
   - Click "New Prescription"
   - Select patient created in step 4
   - Choose medicine: Paracetamol
   - Set start date: Today
   - Duration: 7 days
   - Frequency: Twice per day
   - Click "Create Prescription"
   - Expected: 
     - End date auto-calculated (7 days from today)
     - Total quantity = 14 (7 days × 2 doses)
     - Prescription appears in Active tab

6. **View Analytics**
   - Click "Analytics" in sidebar
   - Expected:
     - Total Prescriptions: 1
     - Active Prescriptions: 1
     - Average adherence shows

**Pass Criteria:** All steps complete without errors

---

### Scenario 2: Complete Pharmacist Workflow

**Objective:** Test inventory management and prescription fulfillment

1. **Sign Up as Pharmacist**
   - Register with pharmacist role
   - Expected: "Waiting for admin approval"

2. **Admin Approval**
   - Login as admin
   - Approve pharmacist account

3. **Add Inventory**
   - Login as pharmacist
   - Click "Add Stock"
   - Medicine: Paracetamol
   - Batch: BATCH001
   - Expiry: 1 year from now
   - Stock: 500
   - Submit
   - Expected: Item appears in inventory table

4. **Test Low Stock Alert**
   - Edit inventory item
   - Change stock to 90
   - Expected: "Low Stock" badge appears

5. **Test Expired Medicine**
   - Add another item
   - Set expiry date to yesterday
   - Expected: "Expired" badge appears

6. **Sell Prescription**
   - Go to "Prescriptions" tab
   - Find prescription from Scenario 1
   - Click "Sell"
   - Confirm
   - Expected:
     - Stock reduces by 14 (total quantity)
     - Prescription marked as "Sold"
     - Moves to history
     - Cannot sell again

7. **View Analytics**
   - Click "Analytics"
   - Expected:
     - Total medicines count shown
     - Low stock count shown
     - Monthly sales = 1

**Pass Criteria:** All inventory operations work correctly

---

### Scenario 3: Complete Patient Workflow

**Objective:** Test patient prescription viewing and reminder management

1. **View Prescriptions**
   - Login as patient (from Scenario 1)
   - View prescriptions
   - Expected: Prescription from Scenario 1 appears
   - Check "Bought" status badge

2. **View Reminders**
   - Click "Reminders" in sidebar
   - Expected:
     - Reminders appear (2 per day for 7 days = 14 total)
     - Times are 09:00 and 21:00 (for twice-per-day)
     - Status is "pending"

3. **Confirm Dose**
   - Click "✓ Taken" on a reminder
   - Expected:
     - Status changes to "taken"
     - Buttons disappear

4. **Skip Dose**
   - Click "✗ Skip" on another reminder
   - Expected:
     - Status changes to "missed"

5. **View Analytics**
   - Click "Analytics"
   - Expected:
     - Adherence percentage calculated
     - Weekly chart displays
     - Shows taken vs missed doses

**Pass Criteria:** Reminder system works correctly

---

### Scenario 4: Complete Admin Workflow

**Objective:** Test all admin capabilities

1. **Login as Admin**
   - Use default credentials

2. **Pending Approvals**
   - Create new doctor account (don't approve)
   - Create new pharmacist account (don't approve)
   - Login as admin
   - Go to "Pending Approvals"
   - Expected: Both accounts appear

3. **Approve User**
   - Click "Approve" on doctor
   - Expected: User disappears from pending list

4. **Reject User**
   - Click "Reject" on pharmacist
   - Expected: User disappears from pending list

5. **Test Rejected Login**
   - Try to login with rejected pharmacist
   - Expected: "Account has been rejected" error

6. **Users Management**
   - Go to "Users Management"
   - Expected: All users listed

7. **Disable User**
   - Click "Disable" on a user
   - Expected: Status shows "No" in Enabled column

8. **Test Disabled Login**
   - Try to login with disabled user
   - Expected: "Account has been disabled" error

9. **Enable User**
   - Click "Enable" on same user
   - Expected: Can login again

10. **Delete User**
    - Click "Delete" on a user
    - Confirm deletion
    - Expected: User removed from list

11. **View Prescriptions**
    - Go to "Prescriptions" tab
    - Expected: All system prescriptions shown (read-only)

12. **View Inventory**
    - Go to "Inventory" tab
    - Expected: All inventory shown (read-only)

13. **View Analytics**
    - Click "Analytics"
    - Expected:
      - Total users count
      - Breakdown by role
      - Total prescriptions
      - Low stock count

**Pass Criteria:** All admin functions work correctly

---

## Edge Cases Testing

### Authentication Edge Cases

1. **Wrong Password**
   - Try login with wrong password
   - Expected: "Invalid credentials" error

2. **Wrong Role**
   - Try login with correct email/password but wrong role
   - Expected: "Invalid credentials" error

3. **Non-existent User**
   - Try login with email that doesn't exist
   - Expected: "Invalid credentials" error

4. **Expired Token**
   - Wait 24 hours (or manually expire token)
   - Try to access protected route
   - Expected: "Invalid token" error

### Prescription Edge Cases

1. **Empty Medicine List**
   - Try to create prescription without medicines
   - Expected: Validation error

2. **Past Start Date**
   - Try to create prescription with start date in past
   - Expected: Should accept (might be backdating)

3. **Zero Duration**
   - Try duration = 0
   - Expected: Validation error

4. **Negative Quantity**
   - Try to set negative stock
   - Expected: Validation error

### Inventory Edge Cases

1. **Duplicate Batch Number**
   - Add two items with same batch number
   - Expected: Should allow (different batches can exist)

2. **Future Expiry Check**
   - Add item expiring tomorrow
   - Check after tomorrow
   - Expected: Should show as expired

3. **Insufficient Stock Sale**
   - Reduce stock to below prescription quantity
   - Try to sell
   - Expected: "Insufficient stock" error

4. **Double Sale Prevention**
   - Try to sell same prescription twice
   - Expected: "Already sold" error

---

## Automated Testing Script

Create `test.js`:

```javascript
const assert = require('assert');

// Mock API calls for testing
async function runTests() {
  console.log('🧪 Running automated tests...\n');

  // Test 1: User Registration
  console.log('Test 1: User Registration');
  const signupResponse = await fetch('http://localhost:3000/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Test User',
      email: 'test@example.com',
      mobile: '1234567890',
      password: 'test123',
      role: 'patient'
    })
  });
  assert.equal(signupResponse.status, 201, 'Signup should return 201');
  console.log('✓ Passed\n');

  // Test 2: Login
  console.log('Test 2: User Login');
  const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'test@example.com',
      password: 'test123',
      role: 'patient'
    })
  });
  const loginData = await loginResponse.json();
  assert.ok(loginData.token, 'Login should return token');
  console.log('✓ Passed\n');

  // Test 3: Protected Route Without Token
  console.log('Test 3: Protected Route Without Token');
  const noTokenResponse = await fetch('http://localhost:3000/api/auth/me');
  assert.equal(noTokenResponse.status, 401, 'Should return 401 without token');
  console.log('✓ Passed\n');

  // Test 4: Protected Route With Token
  console.log('Test 4: Protected Route With Token');
  const withTokenResponse = await fetch('http://localhost:3000/api/auth/me', {
    headers: { 'Authorization': `Bearer ${loginData.token}` }
  });
  assert.equal(withTokenResponse.status, 200, 'Should return 200 with token');
  console.log('✓ Passed\n');

  console.log('✅ All tests passed!');
}

// Run tests
runTests().catch(console.error);
```

Run with:
```bash
node test.js
```

---

## Performance Testing

### Load Testing with Apache Bench

```bash
# Test login endpoint
ab -n 1000 -c 10 -p login.json -T application/json http://localhost:3000/api/auth/login

# Test prescription listing (requires auth token)
ab -n 1000 -c 10 -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/doctor/prescriptions
```

### Expected Performance

- Login: < 100ms per request
- Data retrieval: < 50ms per request
- Prescription creation: < 200ms per request
- Analytics calculation: < 500ms per request

---

## Security Testing

### SQL Injection Test (Should Fail)

Try entering in email field:
```
admin@test.com' OR '1'='1
```

Expected: Should not bypass authentication

### XSS Test (Should Be Sanitized)

Try entering in name field:
```html
<script>alert('XSS')</script>
```

Expected: Should be escaped in display

### JWT Tampering Test

1. Get valid JWT token
2. Modify payload (change role)
3. Try to access admin routes
Expected: Should reject invalid signature

---

## Browser Compatibility

Test on:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Chrome
- [ ] Mobile Safari

---

## Accessibility Testing

1. **Keyboard Navigation**
   - Tab through all forms
   - Enter to submit
   - Esc to close modals

2. **Screen Reader**
   - Test with NVDA/JAWS
   - Check aria labels
   - Verify form labels

3. **Color Contrast**
   - Check text readability
   - Verify button states
   - Test error messages

---

## Regression Testing Checklist

After any code changes:

- [ ] All user roles can login
- [ ] Doctors can create prescriptions
- [ ] Pharmacists can manage inventory
- [ ] Patients can view reminders
- [ ] Admins can approve users
- [ ] Analytics load correctly
- [ ] Charts render properly
- [ ] Modals open and close
- [ ] Forms validate correctly
- [ ] Error messages display
- [ ] Success messages display
- [ ] Navigation works
- [ ] Logout works
- [ ] Token refresh works
- [ ] Mobile view responsive

---

## Bug Report Template

When reporting bugs, include:

```
**Bug Title:** [Short description]

**Severity:** Critical / High / Medium / Low

**Steps to Reproduce:**
1. Step 1
2. Step 2
3. Step 3

**Expected Result:**
What should happen

**Actual Result:**
What actually happens

**Environment:**
- Browser: Chrome 120
- OS: Windows 11
- User Role: Doctor

**Screenshots:**
[Attach screenshots]

**Console Errors:**
[Paste any console errors]
```

---

## Testing Best Practices

1. **Test in Isolation**
   - Each test should be independent
   - Clean up test data after each test

2. **Use Descriptive Names**
   - Test names should describe what they test
   - Example: "should_reject_login_with_wrong_password"

3. **Test Both Happy and Sad Paths**
   - Happy path: Everything works
   - Sad path: Things go wrong

4. **Keep Tests Updated**
   - Update tests when features change
   - Remove tests for removed features

5. **Document Test Results**
   - Keep log of test runs
   - Track failures over time

---

**Remember:** Good testing catches bugs before users do! 🐛
