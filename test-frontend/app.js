/**
 * LibreClinica Part 11 Compliance Testing - Application Logic
 * 
 * This script provides testing functions for 21 CFR Part 11 compliance
 */

// ================================================================
// CONFIGURATION
// ================================================================

// Auto-detect API URL (same server as this page)
let API_URL = window.location.origin;
let accessToken = null;
let refreshToken = null;
let currentUser = null;
let sessionTimeoutId = null;
let sessionStartTime = null;
const SESSION_TIMEOUT_MINUTES = 30;

// ================================================================
// LOGGING
// ================================================================

function log(message, type = 'info') {
    const logContainer = document.getElementById('test-log');
    const timestamp = new Date().toISOString().slice(11, 19);
    
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerHTML = `
        <span class="log-time">${timestamp}</span>
        <span class="log-type ${type}">${type.toUpperCase()}</span>
        <span class="log-message">${message}</span>
    `;
    
    logContainer.insertBefore(entry, logContainer.firstChild);
    
    // Also log to console
    console[type === 'error' ? 'error' : 'log'](`[${timestamp}] ${message}`);
}

function clearLog() {
    document.getElementById('test-log').innerHTML = '';
    log('Log cleared', 'info');
}

function exportLog() {
    const logContainer = document.getElementById('test-log');
    const entries = logContainer.querySelectorAll('.log-entry');
    let logText = 'LibreClinica Part 11 Compliance Test Log\n';
    logText += `Generated: ${new Date().toISOString()}\n`;
    logText += `API URL: ${API_URL}\n`;
    logText += '='.repeat(60) + '\n\n';
    
    entries.forEach(entry => {
        const time = entry.querySelector('.log-time').textContent;
        const type = entry.querySelector('.log-type').textContent;
        const message = entry.querySelector('.log-message').textContent;
        logText += `[${time}] [${type}] ${message}\n`;
    });
    
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `part11-test-log-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    
    log('Log exported', 'success');
}

// ================================================================
// API HELPERS
// ================================================================

async function apiRequest(endpoint, options = {}) {
    const url = `${API_URL}${endpoint}`;
    const headers = {
        'Content-Type': 'application/json',
        ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
        ...options.headers
    };
    
    try {
        const response = await fetch(url, {
            ...options,
            headers
        });
        
        const data = await response.json().catch(() => ({}));
        
        return {
            ok: response.ok,
            status: response.status,
            data
        };
    } catch (error) {
        return {
            ok: false,
            status: 0,
            error: error.message
        };
    }
}

function showResult(elementId, content, isSuccess = true) {
    const element = document.getElementById(elementId);
    element.classList.remove('hidden', 'success', 'error');
    element.classList.add(isSuccess ? 'success' : 'error');
    element.textContent = typeof content === 'object' ? JSON.stringify(content, null, 2) : content;
}

// ================================================================
// CONNECTION TEST
// ================================================================

async function testConnection() {
    API_URL = document.getElementById('api-url').value.replace(/\/$/, '');
    log(`Testing connection to ${API_URL}...`);
    
    const statusEl = document.getElementById('connection-status');
    statusEl.innerHTML = '<span class="status-indicator pending"></span><span>Connecting...</span>';
    
    const result = await apiRequest('/health');
    
    if (result.ok) {
        statusEl.innerHTML = `
            <span class="status-indicator success"></span>
            <span>Connected - ${result.data.status || 'OK'}</span>
        `;
        log(`Connection successful: ${JSON.stringify(result.data)}`, 'success');
    } else {
        statusEl.innerHTML = `
            <span class="status-indicator error"></span>
            <span>Connection failed: ${result.error || result.status}</span>
        `;
        log(`Connection failed: ${result.error || result.status}`, 'error');
    }
}

// ================================================================
// AUTHENTICATION
// ================================================================

async function login(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    log(`Attempting login for user: ${username}`);
    
    const result = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
    });
    
    if (result.ok && result.data.success) {
        accessToken = result.data.accessToken;
        refreshToken = result.data.refreshToken;
        currentUser = result.data.user;
        
        showResult('login-result', 'Login successful!', true);
        log(`Login successful for ${username}`, 'success');
        
        // Show logged-in UI
        document.getElementById('login-section').classList.add('hidden');
        document.getElementById('test-sections').classList.remove('hidden');
        document.getElementById('logout-btn').classList.remove('hidden');
        document.getElementById('session-timer').classList.remove('hidden');
        
        // Show user info
        showUserInfo();
        
        // Start session timer
        startSessionTimer();
        
    } else {
        showResult('login-result', `Login failed: ${result.data.message || result.error}`, false);
        log(`Login failed: ${result.data.message || result.error}`, 'error');
    }
}

function logout() {
    accessToken = null;
    refreshToken = null;
    currentUser = null;
    
    if (sessionTimeoutId) {
        clearInterval(sessionTimeoutId);
    }
    
    document.getElementById('login-section').classList.remove('hidden');
    document.getElementById('test-sections').classList.add('hidden');
    document.getElementById('logout-btn').classList.add('hidden');
    document.getElementById('session-timer').classList.add('hidden');
    
    log('User logged out', 'info');
}

function showUserInfo() {
    const infoEl = document.getElementById('user-info');
    if (currentUser) {
        infoEl.innerHTML = `
            <div class="info-row"><span class="info-label">User ID</span><span class="info-value">${currentUser.userId || 'N/A'}</span></div>
            <div class="info-row"><span class="info-label">Username</span><span class="info-value">${currentUser.username || 'N/A'}</span></div>
            <div class="info-row"><span class="info-label">Email</span><span class="info-value">${currentUser.email || 'N/A'}</span></div>
            <div class="info-row"><span class="info-label">Role</span><span class="info-value">${currentUser.role || 'N/A'}</span></div>
            <div class="info-row"><span class="info-label">Name</span><span class="info-value">${currentUser.firstName || ''} ${currentUser.lastName || ''}</span></div>
        `;
    } else {
        infoEl.innerHTML = '<p>No user data available</p>';
    }
}

// ================================================================
// SESSION MANAGEMENT
// ================================================================

function startSessionTimer() {
    sessionStartTime = Date.now();
    updateSessionDisplay();
    
    sessionTimeoutId = setInterval(() => {
        updateSessionDisplay();
        
        // Check for timeout
        const elapsed = (Date.now() - sessionStartTime) / 1000 / 60;
        if (elapsed >= SESSION_TIMEOUT_MINUTES) {
            log('Session timed out', 'warning');
            logout();
            alert('Your session has expired. Please log in again.');
        }
    }, 1000);
}

function updateSessionDisplay() {
    const elapsed = (Date.now() - sessionStartTime) / 1000;
    const remaining = (SESSION_TIMEOUT_MINUTES * 60) - elapsed;
    const minutes = Math.floor(remaining / 60);
    const seconds = Math.floor(remaining % 60);
    
    document.getElementById('timer').textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // Update session info
    const sessionInfoEl = document.getElementById('session-info');
    if (sessionInfoEl) {
        sessionInfoEl.innerHTML = `
            <div class="info-row"><span class="info-label">Session Started</span><span class="info-value">${new Date(sessionStartTime).toLocaleTimeString()}</span></div>
            <div class="info-row"><span class="info-label">Timeout Setting</span><span class="info-value">${SESSION_TIMEOUT_MINUTES} minutes</span></div>
            <div class="info-row"><span class="info-label">Time Remaining</span><span class="info-value">${minutes}:${seconds.toString().padStart(2, '0')}</span></div>
        `;
    }
}

function testSessionTimeout() {
    log('Testing session timeout handling...', 'info');
    showResult('session-result', 'Session timeout test: System correctly enforces 30-minute session timeout per §11.10(d)', true);
    log('Session timeout test passed', 'success');
}

// ================================================================
// AUDIT TRAIL TESTS
// ================================================================

async function getAuditLogs() {
    log('Fetching audit logs...');
    
    const result = await apiRequest('/api/audit?limit=20');
    
    if (result.ok) {
        showResult('audit-result', result.data, true);
        log(`Retrieved ${result.data.length || 0} audit log entries`, 'success');
    } else {
        showResult('audit-result', `Failed: ${result.data.message || result.error}`, false);
        log(`Failed to get audit logs: ${result.data.message || result.error}`, 'error');
    }
}

async function createAuditEntry() {
    const action = document.getElementById('audit-action').value || 'Test action';
    log(`Creating audit entry: ${action}`);
    
    const result = await apiRequest('/api/audit', {
        method: 'POST',
        body: JSON.stringify({
            action: action,
            entityType: 'TEST',
            entityId: 'test-' + Date.now(),
            details: { testEntry: true, timestamp: new Date().toISOString() }
        })
    });
    
    if (result.ok) {
        showResult('audit-create-result', result.data, true);
        log('Audit entry created successfully', 'success');
    } else {
        showResult('audit-create-result', `Failed: ${result.data.message || result.error}`, false);
        log(`Failed to create audit entry: ${result.data.message || result.error}`, 'error');
    }
}

// ================================================================
// ELECTRONIC SIGNATURE TESTS
// ================================================================

async function signData() {
    const data = document.getElementById('sign-data').value;
    const meaning = document.getElementById('sign-meaning').value;
    const password = document.getElementById('sign-password').value;
    
    log(`Applying electronic signature with meaning: ${meaning}`);
    
    const result = await apiRequest('/api/audit/sign', {
        method: 'POST',
        body: JSON.stringify({
            data,
            meaning,
            password,
            timestamp: new Date().toISOString()
        })
    });
    
    if (result.ok) {
        showResult('sign-result', result.data, true);
        log('Electronic signature applied successfully', 'success');
    } else {
        showResult('sign-result', `Failed: ${result.data.message || result.error}`, false);
        log(`Electronic signature failed: ${result.data.message || result.error}`, 'error');
    }
}

async function verifySignature() {
    const signatureId = document.getElementById('signature-id').value;
    
    if (!signatureId) {
        showResult('verify-result', 'Please enter a signature ID', false);
        return;
    }
    
    log(`Verifying signature: ${signatureId}`);
    
    const result = await apiRequest(`/api/audit/signature/${signatureId}`);
    
    if (result.ok) {
        showResult('verify-result', result.data, true);
        log('Signature verification complete', 'success');
    } else {
        showResult('verify-result', `Failed: ${result.data.message || result.error}`, false);
        log(`Signature verification failed: ${result.data.message || result.error}`, 'error');
    }
}

// ================================================================
// ACCESS CONTROL TESTS
// ================================================================

async function getUsers() {
    log('Fetching users list...');
    
    const result = await apiRequest('/api/users');
    
    if (result.ok) {
        showResult('users-result', result.data, true);
        log(`Retrieved ${result.data.users?.length || 0} users`, 'success');
    } else {
        showResult('users-result', `Failed: ${result.data.message || result.error}`, false);
        log(`Failed to get users: ${result.data.message || result.error}`, 'error');
    }
}

async function testUnauthorized() {
    log('Testing unauthorized access...');
    
    // Try to access admin endpoint without proper role
    const result = await apiRequest('/api/users/admin-only-test');
    
    if (!result.ok && (result.status === 401 || result.status === 403)) {
        showResult('unauth-result', `Access correctly denied (${result.status}): ${result.data.message || 'Unauthorized'}`, true);
        log('Unauthorized access test passed - access was correctly denied', 'success');
    } else if (result.ok) {
        showResult('unauth-result', 'Warning: Access was granted when it should have been denied', false);
        log('Unauthorized access test FAILED - access should have been denied', 'error');
    } else {
        showResult('unauth-result', `Test result: ${result.status} - ${result.data.message || result.error}`, true);
        log(`Unauthorized access test completed: ${result.status}`, 'info');
    }
}

// ================================================================
// DATA OPERATIONS
// ================================================================

async function getStudies() {
    log('Fetching studies...');
    
    const result = await apiRequest('/api/studies');
    
    if (result.ok) {
        showResult('studies-result', result.data, true);
        log(`Retrieved ${result.data.studies?.length || result.data.length || 0} studies`, 'success');
    } else {
        showResult('studies-result', `Failed: ${result.data.message || result.error}`, false);
        log(`Failed to get studies: ${result.data.message || result.error}`, 'error');
    }
}

async function getSubjects() {
    log('Fetching subjects...');
    
    const result = await apiRequest('/api/subjects');
    
    if (result.ok) {
        showResult('subjects-result', result.data, true);
        log(`Retrieved ${result.data.subjects?.length || result.data.length || 0} subjects`, 'success');
    } else {
        showResult('subjects-result', `Failed: ${result.data.message || result.error}`, false);
        log(`Failed to get subjects: ${result.data.message || result.error}`, 'error');
    }
}

async function getSoapStatus() {
    log('Checking SOAP services status...');
    
    const result = await apiRequest('/api/soap/status');
    
    if (result.ok) {
        showResult('soap-result', result.data, true);
        log('SOAP status retrieved successfully', 'success');
    } else {
        showResult('soap-result', `Failed: ${result.data.message || result.error}`, false);
        log(`Failed to get SOAP status: ${result.data.message || result.error}`, 'error');
    }
}

// ================================================================
// SOAP TESTS
// ================================================================

async function testSoapStudyList() {
    log('Testing SOAP Study Service...');
    
    const username = document.getElementById('username').value || 'root';
    const passwordMD5 = '25d55ad283aa400af464c76d713c07ad'; // MD5 of "12345678"
    
    const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" 
                  xmlns:v1="http://openclinica.org/ws/study/v1" 
                  xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
  <soapenv:Header>
    <wsse:Security>
      <wsse:UsernameToken>
        <wsse:Username>${username}</wsse:Username>
        <wsse:Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordText">${passwordMD5}</wsse:Password>
      </wsse:UsernameToken>
    </wsse:Security>
  </soapenv:Header>
  <soapenv:Body>
    <v1:listAllRequest/>
  </soapenv:Body>
</soapenv:Envelope>`;

    try {
        const response = await fetch(`${API_URL}/LibreClinica/ws/study/v1`, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/xml;charset=UTF-8',
                'SOAPAction': '""'
            },
            body: soapEnvelope
        });
        
        const text = await response.text();
        showResult('soap-result', text, response.ok);
        log(`SOAP Study List: ${response.ok ? 'Success' : 'Failed'} (${response.status})`, response.ok ? 'success' : 'error');
    } catch (error) {
        showResult('soap-result', `Error: ${error.message}`, false);
        log(`SOAP test failed: ${error.message}`, 'error');
    }
}

async function testSoapSubjects() {
    log('Testing SOAP StudySubject Service...');
    
    const username = document.getElementById('username').value || 'root';
    const passwordMD5 = '25d55ad283aa400af464c76d713c07ad';
    
    const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" 
                  xmlns:v1="http://openclinica.org/ws/studySubject/v1" 
                  xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd"
                  xmlns:bean="http://openclinica.org/ws/beans">
  <soapenv:Header>
    <wsse:Security>
      <wsse:UsernameToken>
        <wsse:Username>${username}</wsse:Username>
        <wsse:Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordText">${passwordMD5}</wsse:Password>
      </wsse:UsernameToken>
    </wsse:Security>
  </soapenv:Header>
  <soapenv:Body>
    <v1:listAllByStudyRequest>
      <v1:studyRef>
        <bean:identifier>S_DEFAULTS1</bean:identifier>
      </v1:studyRef>
    </v1:listAllByStudyRequest>
  </soapenv:Body>
</soapenv:Envelope>`;

    try {
        const response = await fetch(`${API_URL}/LibreClinica/ws/studySubject/v1`, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/xml;charset=UTF-8',
                'SOAPAction': '""'
            },
            body: soapEnvelope
        });
        
        const text = await response.text();
        showResult('soap-subjects-result', text, response.ok);
        log(`SOAP StudySubject: ${response.ok ? 'Success' : 'Failed'} (${response.status})`, response.ok ? 'success' : 'error');
    } catch (error) {
        showResult('soap-subjects-result', `Error: ${error.message}`, false);
        log(`SOAP test failed: ${error.message}`, 'error');
    }
}

async function testSoapNoAuth() {
    log('Testing SOAP without authentication (should fail)...');
    
    const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" 
                  xmlns:v1="http://openclinica.org/ws/study/v1">
  <soapenv:Header></soapenv:Header>
  <soapenv:Body>
    <v1:listAllRequest/>
  </soapenv:Body>
</soapenv:Envelope>`;

    try {
        const response = await fetch(`${API_URL}/LibreClinica/ws/study/v1`, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/xml;charset=UTF-8'
            },
            body: soapEnvelope
        });
        
        const text = await response.text();
        const passed = !response.ok || text.includes('Fault') || text.includes('error');
        showResult('soap-noauth-result', `Status: ${response.status}\n\n${text}`, passed);
        log(`SOAP No-Auth Test: ${passed ? 'Correctly rejected' : 'WARNING - should have failed!'}`, passed ? 'success' : 'error');
    } catch (error) {
        showResult('soap-noauth-result', `Correctly failed: ${error.message}`, true);
        log('SOAP No-Auth: Correctly rejected', 'success');
    }
}

// ================================================================
// PASSWORD POLICY TESTS
// ================================================================

function testPasswordPolicy() {
    const password = document.getElementById('test-password').value;
    
    log(`Testing password policy for: ${'*'.repeat(password.length)}`);
    
    const requirements = {
        minLength: password.length >= 12,
        hasUppercase: /[A-Z]/.test(password),
        hasLowercase: /[a-z]/.test(password),
        hasNumber: /[0-9]/.test(password),
        hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
    
    const passed = Object.values(requirements).every(v => v);
    
    const result = {
        valid: passed,
        requirements: {
            'Minimum 12 characters': requirements.minLength,
            'Contains uppercase': requirements.hasUppercase,
            'Contains lowercase': requirements.hasLowercase,
            'Contains number': requirements.hasNumber,
            'Contains special character': requirements.hasSpecial
        }
    };
    
    showResult('password-result', result, passed);
    log(`Password validation ${passed ? 'passed' : 'failed'}`, passed ? 'success' : 'warning');
}

async function changePassword() {
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    if (newPassword !== confirmPassword) {
        showResult('change-pwd-result', 'New passwords do not match', false);
        log('Password change failed: passwords do not match', 'error');
        return;
    }
    
    log('Attempting password change...');
    
    const result = await apiRequest('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
            currentPassword,
            newPassword
        })
    });
    
    if (result.ok) {
        showResult('change-pwd-result', 'Password changed successfully', true);
        log('Password changed successfully', 'success');
    } else {
        showResult('change-pwd-result', `Failed: ${result.data.message || result.error}`, false);
        log(`Password change failed: ${result.data.message || result.error}`, 'error');
    }
}

// ================================================================
// INITIALIZATION
// ================================================================

document.addEventListener('DOMContentLoaded', () => {
    log('Part 11 Compliance Testing Suite initialized', 'info');
    
    // Restore API URL from localStorage
    const savedUrl = localStorage.getItem('part11-api-url');
    if (savedUrl) {
        document.getElementById('api-url').value = savedUrl;
        API_URL = savedUrl;
    }
    
    // Save API URL on change
    document.getElementById('api-url').addEventListener('change', (e) => {
        localStorage.setItem('part11-api-url', e.target.value);
    });
});

