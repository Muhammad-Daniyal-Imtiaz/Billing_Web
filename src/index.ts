import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serveStatic } from '@hono/node-server/serve-static';
import 'dotenv/config';

// Import routers
import authRouter from './api/auth.js';
import invoicesRouter from './api/invoices.js';

const app = new Hono();

// Middleware
app.use('*', logger());

// CORS configuration - FIXED: removed regex patterns
app.use('*', cors({
  origin: [
    'http://localhost:8081',
    'http://localhost:19006',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5500',
    'http://127.0.0.1:5500'
  ],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Admin-Key'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
  credentials: true,
}));

// Serve static files from public folder
app.use('/static/*', serveStatic({ root: './public' }));
app.use('/favicon.ico', serveStatic({ path: './public/favicon.ico' }));

// Home route - redirects to login
app.get('/', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Billing Manager API</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
        }
        
        body {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        
        .container {
            background: white;
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            max-width: 500px;
            width: 100%;
            text-align: center;
        }
        
        h1 {
            color: #333;
            margin-bottom: 20px;
            font-size: 32px;
        }
        
        p {
            color: #666;
            margin-bottom: 30px;
            line-height: 1.6;
        }
        
        .api-url {
            background: #f3f4f6;
            padding: 12px;
            border-radius: 10px;
            font-family: 'Courier New', monospace;
            margin: 20px 0;
            font-size: 14px;
            word-break: break-all;
        }
        
        .btn {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 14px 32px;
            border-radius: 10px;
            text-decoration: none;
            font-weight: 600;
            font-size: 16px;
            margin: 10px;
            transition: all 0.3s;
            border: none;
            cursor: pointer;
        }
        
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
        }
        
        .btn-secondary {
            background: #6b7280;
        }
        
        .endpoints {
            margin-top: 30px;
            text-align: left;
            background: #f9fafb;
            padding: 20px;
            border-radius: 10px;
        }
        
        .endpoints h3 {
            color: #374151;
            margin-bottom: 15px;
            font-size: 18px;
        }
        
        .endpoint-item {
            margin-bottom: 10px;
            padding-bottom: 10px;
            border-bottom: 1px solid #e5e7eb;
        }
        
        .method {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
            margin-right: 10px;
            min-width: 60px;
            text-align: center;
        }
        
        .method-get {
            background: #d1fae5;
            color: #065f46;
        }
        
        .method-post {
            background: #dbeafe;
            color: #1e40af;
        }
        
        .method-put {
            background: #fef3c7;
            color: #92400e;
        }
        
        .method-delete {
            background: #fee2e2;
            color: #991b1b;
        }
        
        .path {
            font-family: 'Courier New', monospace;
            font-size: 14px;
            color: #374151;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Billing Manager API 🚀</h1>
        <p>Secure backend API for billing management system</p>
        
        <div class="api-url">http://localhost:3000</div>
        
        <a href="/login" class="btn">Go to Login Demo</a>
        <a href="/api/health" class="btn btn-secondary">Check API Health</a>
        
        <div class="endpoints">
            <h3>Available Endpoints:</h3>
            <div class="endpoint-item">
                <span class="method method-post">POST</span>
                <span class="path">/api/auth/signup</span>
            </div>
            <div class="endpoint-item">
                <span class="method method-post">POST</span>
                <span class="path">/api/auth/signin</span>
            </div>
            <div class="endpoint-item">
                <span class="method method-get">GET</span>
                <span class="path">/api/auth/profile</span>
            </div>
            <div class="endpoint-item">
                <span class="method method-get">GET</span>
                <span class="path">/api/health</span>
            </div>
        </div>
    </div>
</body>
</html>
  `);
});

// Login page route
app.get('/login', async (c) => {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Billing Manager - Login</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
        }
        
        body {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        
        .container {
            width: 100%;
            max-width: 500px;
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 28px;
            font-weight: 600;
            margin-bottom: 8px;
        }
        
        .header p {
            opacity: 0.9;
            font-size: 14px;
        }
        
        .content {
            padding: 40px;
        }
        
        .form-container {
            display: block;
        }
        
        .profile-container {
            display: none;
        }
        
        .form-group {
            margin-bottom: 24px;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 500;
            color: #333;
            font-size: 14px;
        }
        
        .form-group input {
            width: 100%;
            padding: 14px;
            border: 2px solid #e0e0e0;
            border-radius: 10px;
            font-size: 16px;
            transition: border-color 0.3s;
        }
        
        .form-group input:focus {
            outline: none;
            border-color: #667eea;
        }
        
        .form-group input.error {
            border-color: #ef4444;
        }
        
        .error-message {
            color: #ef4444;
            font-size: 13px;
            margin-top: 6px;
            display: none;
        }
        
        .btn {
            width: 100%;
            padding: 16px;
            border: none;
            border-radius: 10px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            margin-bottom: 16px;
        }
        
        .btn-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
        }
        
        .btn-secondary {
            background: #f3f4f6;
            color: #374151;
            border: 2px solid #e5e7eb;
        }
        
        .btn-secondary:hover {
            background: #e5e7eb;
        }
        
        .btn-danger {
            background: #ef4444;
            color: white;
        }
        
        .btn-danger:hover {
            background: #dc2626;
        }
        
        .loading {
            display: none;
            text-align: center;
            padding: 20px;
        }
        
        .spinner {
            border: 3px solid #f3f3f3;
            border-top: 3px solid #667eea;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .tabs {
            display: flex;
            margin-bottom: 30px;
            border-bottom: 2px solid #e5e7eb;
        }
        
        .tab {
            flex: 1;
            text-align: center;
            padding: 16px;
            font-weight: 600;
            cursor: pointer;
            color: #6b7280;
            transition: all 0.3s;
        }
        
        .tab.active {
            color: #667eea;
            border-bottom: 3px solid #667eea;
        }
        
        .user-info {
            background: #f9fafb;
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 24px;
        }
        
        .user-info h3 {
            color: #374151;
            margin-bottom: 20px;
            font-size: 18px;
        }
        
        .info-row {
            display: flex;
            margin-bottom: 12px;
            padding-bottom: 12px;
            border-bottom: 1px solid #e5e7eb;
        }
        
        .info-label {
            font-weight: 600;
            color: #6b7280;
            width: 140px;
            flex-shrink: 0;
        }
        
        .info-value {
            color: #374151;
            flex: 1;
        }
        
        .alert {
            padding: 16px;
            border-radius: 10px;
            margin-bottom: 24px;
            display: none;
        }
        
        .alert-success {
            background: #d1fae5;
            color: #065f46;
            border: 1px solid #a7f3d0;
        }
        
        .alert-error {
            background: #fee2e2;
            color: #991b1b;
            border: 1px solid #fecaca;
        }
        
        .token-display {
            background: #f3f4f6;
            padding: 12px;
            border-radius: 8px;
            margin-top: 20px;
            font-size: 12px;
            word-break: break-all;
            display: none;
        }
        
        .api-status {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 10px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
        }
        
        .status-connected {
            background: #d1fae5;
            color: #065f46;
        }
        
        .status-disconnected {
            background: #fee2e2;
            color: #991b1b;
        }
        
        @media (max-width: 600px) {
            .content {
                padding: 30px 20px;
            }
            
            .header {
                padding: 24px 20px;
            }
            
            .info-row {
                flex-direction: column;
            }
            
            .info-label {
                width: 100%;
                margin-bottom: 4px;
            }
        }
    </style>
</head>
<body>
    <!-- API Status Indicator -->
    <div id="apiStatus" class="api-status status-disconnected">
        🔴 API Disconnected
    </div>
    
    <div class="container">
        <div class="header">
            <h1>Billing Manager</h1>
            <p>Secure Authentication Demo</p>
        </div>
        
        <div class="content">
            <!-- Alert Messages -->
            <div id="successAlert" class="alert alert-success">
                Success! You are now logged in.
            </div>
            
            <div id="errorAlert" class="alert alert-error">
                An error occurred. Please try again.
            </div>
            
            <!-- Tabs -->
            <div class="tabs">
                <div class="tab active" onclick="showTab('login')">Sign In</div>
                <div class="tab" onclick="showTab('signup')">Sign Up</div>
            </div>
            
            <!-- Loading Spinner -->
            <div id="loading" class="loading">
                <div class="spinner"></div>
                <p>Processing...</p>
            </div>
            
            <!-- Login Form -->
            <div id="loginForm" class="form-container">
                <div class="form-group">
                    <label for="loginEmail">Email Address</label>
                    <input type="email" id="loginEmail" placeholder="Enter your email">
                    <div class="error-message" id="loginEmailError">Please enter a valid email</div>
                </div>
                
                <div class="form-group">
                    <label for="loginPassword">Password</label>
                    <input type="password" id="loginPassword" placeholder="Enter your password">
                    <div class="error-message" id="loginPasswordError">Password is required</div>
                </div>
                
                <button class="btn btn-primary" onclick="handleLogin()">
                    Sign In
                </button>
                
                <button class="btn btn-secondary" onclick="checkSession()">
                    Check Existing Session
                </button>
                
                <!-- Google Sign-In Divider -->
                <div style="margin: 20px 0; text-align: center;">
                  <div style="height: 1px; background: #e5e7eb; margin: 20px 0; position: relative;">
                    <span style="background: white; padding: 0 10px; position: absolute; top: -10px; left: 50%; transform: translateX(-50%); color: #6b7280;">Or</span>
                  </div>
                  
                  <button onclick="signInWithGoogle()" style="
                    width: 100%;
                    padding: 12px;
                    background: white;
                    border: 2px solid #e5e7eb;
                    border-radius: 10px;
                    font-weight: 600;
                    color: #374151;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    transition: all 0.3s;
                  ">
                    <svg width="20" height="20" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Continue with Google
                  </button>
                </div>
            </div>
            
            <!-- Signup Form -->
            <div id="signupForm" class="form-container" style="display: none;">
                <div class="form-group">
                    <label for="signupName">Full Name</label>
                    <input type="text" id="signupName" placeholder="Enter your full name">
                    <div class="error-message" id="signupNameError">Name is required</div>
                </div>
                
                <div class="form-group">
                    <label for="signupEmail">Email Address</label>
                    <input type="email" id="signupEmail" placeholder="Enter your email">
                    <div class="error-message" id="signupEmailError">Please enter a valid email</div>
                </div>
                
                <div class="form-group">
                    <label for="signupPassword">Password</label>
                    <input type="password" id="signupPassword" placeholder="Create a password (min 6 chars)">
                    <div class="error-message" id="signupPasswordError">Password must be at least 6 characters</div>
                </div>
                
                <div class="form-group">
                    <label for="signupPhone">Phone (Optional)</label>
                    <input type="tel" id="signupPhone" placeholder="Enter your phone number">
                </div>
                
                <div class="form-group">
                    <label for="signupCompany">Company (Optional)</label>
                    <input type="text" id="signupCompany" placeholder="Enter company name">
                </div>
                
                <button class="btn btn-primary" onclick="handleSignup()">
                    Create Account
                </button>
                
                <button class="btn btn-secondary" onclick="showTab('login')">
                    Already have an account? Sign In
                </button>
                
                <!-- Google Sign-Up Divider -->
                <div style="margin: 20px 0; text-align: center;">
                  <div style="height: 1px; background: #e5e7eb; margin: 20px 0; position: relative;">
                    <span style="background: white; padding: 0 10px; position: absolute; top: -10px; left: 50%; transform: translateX(-50%); color: #6b7280;">Or</span>
                  </div>
                  
                  <button onclick="signUpWithGoogle()" style="
                    width: 100%;
                    padding: 12px;
                    background: white;
                    border: 2px solid #e5e7eb;
                    border-radius: 10px;
                    font-weight: 600;
                    color: #374151;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    transition: all 0.3s;
                  ">
                    <svg width="20" height="20" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Sign Up with Google
                  </button>
                </div>
            </div>
            
            <!-- User Profile -->
            <div id="profileContainer" class="profile-container">
                <div class="user-info">
                    <h3>👤 User Profile</h3>
                    <div class="info-row">
                        <div class="info-label">User ID:</div>
                        <div class="info-value" id="profileId">-</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">Name:</div>
                        <div class="info-value" id="profileName">-</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">Email:</div>
                        <div class="info-value" id="profileEmail">-</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">Phone:</div>
                        <div class="info-value" id="profilePhone">-</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">Company:</div>
                        <div class="info-value" id="profileCompany">-</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">Plan:</div>
                        <div class="info-value" id="profilePlan">-</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">Created:</div>
                        <div class="info-value" id="profileCreated">-</div>
                    </div>
                </div>
                
                <!-- Token Display (for debugging) -->
                <div class="token-display" id="tokenDisplay">
                    <strong>Access Token:</strong><br>
                    <span id="accessToken">-</span>
                </div>
                
                <!-- Action Buttons -->
                <button class="btn btn-secondary" onclick="refreshProfile()">
                    🔄 Refresh Profile
                </button>
                
                <button class="btn btn-danger" onclick="handleLogout()">
                    🚪 Sign Out
                </button>
            </div>
        </div>
    </div>

    <script>
        // Configuration
        const API_BASE_URL = 'http://localhost:3000/api';
        
        // State
        let currentUser = null;
        let accessToken = localStorage.getItem('access_token');
        let refreshToken = localStorage.getItem('refresh_token');
        
        // DOM Elements
        const apiStatus = document.getElementById('apiStatus');
        const loading = document.getElementById('loading');
        const successAlert = document.getElementById('successAlert');
        const errorAlert = document.getElementById('errorAlert');
        
        // Check API connection on load
        document.addEventListener('DOMContentLoaded', function() {
            checkAPIHealth();
            
            // Check if we have Google auth tokens in localStorage
            const googleAccessToken = localStorage.getItem('access_token');
            const googleUser = localStorage.getItem('user');
            
            if (googleAccessToken && googleUser) {
                // We're already logged in via Google
                currentUser = JSON.parse(googleUser);
                accessToken = googleAccessToken;
                showProfile();
            } else if (accessToken) {
                // Check if user is already logged in via regular auth
                checkSession();
            }
        });
        
        // Check API health
        async function checkAPIHealth() {
            try {
                const response = await fetch('/api/health');
                const data = await response.json();
                
                if (data.success) {
                    apiStatus.className = 'api-status status-connected';
                    apiStatus.textContent = '✅ API Connected';
                }
            } catch (error) {
                apiStatus.className = 'api-status status-disconnected';
                apiStatus.textContent = '🔴 API Disconnected';
            }
        }
        
        // Show tab
        function showTab(tabName) {
            // Update tabs
            document.querySelectorAll('.tab').forEach(tab => {
                tab.classList.remove('active');
            });
            
            if (tabName === 'login') {
                document.querySelectorAll('.tab')[0].classList.add('active');
                document.getElementById('loginForm').style.display = 'block';
                document.getElementById('signupForm').style.display = 'none';
            } else {
                document.querySelectorAll('.tab')[1].classList.add('active');
                document.getElementById('loginForm').style.display = 'none';
                document.getElementById('signupForm').style.display = 'block';
            }
        }
        
        // Show/hide loading
        function showLoading(show) {
            loading.style.display = show ? 'block' : 'none';
        }
        
        // Show alerts
        function showAlert(type, message) {
            if (type === 'success') {
                successAlert.textContent = message || 'Success!';
                successAlert.style.display = 'block';
                errorAlert.style.display = 'none';
            } else {
                errorAlert.textContent = message || 'An error occurred.';
                errorAlert.style.display = 'block';
                successAlert.style.display = 'none';
            }
            
            setTimeout(() => {
                successAlert.style.display = 'none';
                errorAlert.style.display = 'none';
            }, 5000);
        }
        
        // Clear form errors
        function clearErrors() {
            document.querySelectorAll('.error-message').forEach(el => {
                el.style.display = 'none';
            });
            document.querySelectorAll('input').forEach(el => {
                el.classList.remove('error');
            });
        }
        
        // Validate email
        function isValidEmail(email) {
            return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email);
        }
        
        // Save tokens to localStorage
        function saveTokens(tokenData) {
            if (tokenData.access_token) {
                accessToken = tokenData.access_token;
                localStorage.setItem('access_token', accessToken);
            }
            if (tokenData.refresh_token) {
                refreshToken = tokenData.refresh_token;
                localStorage.setItem('refresh_token', refreshToken);
            }
        }
        
        // Clear tokens
        function clearTokens() {
            accessToken = null;
            refreshToken = null;
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
        }
        
        // API Call helper
        async function apiCall(endpoint, method = 'GET', data = null, requiresAuth = false) {
            const headers = {
                'Content-Type': 'application/json'
            };
            
            if (requiresAuth && accessToken) {
                headers['Authorization'] = \`Bearer \${accessToken}\`;
            }
            
            const config = {
                method,
                headers
            };
            
            if (data) {
                config.body = JSON.stringify(data);
            }
            
            try {
                const response = await fetch(\`/api\${endpoint}\`, config);
                return await response.json();
            } catch (error) {
                console.error('API Error:', error);
                return {
                    success: false,
                    error: 'Network error. Please check your connection.'
                };
            }
        }
        
        // Handle Login
        async function handleLogin() {
            clearErrors();
            
            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value;
            
            let hasError = false;
            
            if (!email || !isValidEmail(email)) {
                document.getElementById('loginEmailError').style.display = 'block';
                document.getElementById('loginEmail').classList.add('error');
                hasError = true;
            }
            
            if (!password) {
                document.getElementById('loginPasswordError').style.display = 'block';
                document.getElementById('loginPassword').classList.add('error');
                hasError = true;
            }
            
            if (hasError) return;
            
            showLoading(true);
            
            try {
                const result = await apiCall('/auth/signin', 'POST', {
                    email,
                    password
                });
                
                showLoading(false);
                
                if (result.success) {
                    saveTokens(result.data.session);
                    currentUser = result.data.user;
                    showProfile();
                    showAlert('success', 'Login successful!');
                } else {
                    showAlert('error', result.error || 'Login failed');
                }
            } catch (error) {
                showLoading(false);
                showAlert('error', 'Login failed. Please try again.');
            }
        }
        
        // Handle Signup
        async function handleSignup() {
            clearErrors();
            
            const name = document.getElementById('signupName').value.trim();
            const email = document.getElementById('signupEmail').value.trim();
            const password = document.getElementById('signupPassword').value;
            const phone = document.getElementById('signupPhone').value.trim();
            const company = document.getElementById('signupCompany').value.trim();
            
            let hasError = false;
            
            if (!name) {
                document.getElementById('signupNameError').style.display = 'block';
                document.getElementById('signupName').classList.add('error');
                hasError = true;
            }
            
            if (!email || !isValidEmail(email)) {
                document.getElementById('signupEmailError').style.display = 'block';
                document.getElementById('signupEmail').classList.add('error');
                hasError = true;
            }
            
            if (!password || password.length < 6) {
                document.getElementById('signupPasswordError').style.display = 'block';
                document.getElementById('signupPassword').classList.add('error');
                hasError = true;
            }
            
            if (hasError) return;
            
            showLoading(true);
            
            try {
                const result = await apiCall('/auth/signup', 'POST', {
                    name,
                    email,
                    password,
                    phone: phone || undefined,
                    company_name: company || undefined
                });
                
                showLoading(false);
                
                if (result.success) {
                    if (result.data.session) {
                        saveTokens(result.data.session);
                        currentUser = result.data.user;
                        showProfile();
                        showAlert('success', 'Account created successfully!');
                    } else {
                        showAlert('success', 'Account created! Please sign in.');
                        showTab('login');
                        document.getElementById('loginEmail').value = email;
                    }
                } else {
                    showAlert('error', result.error || 'Signup failed');
                }
            } catch (error) {
                showLoading(false);
                showAlert('error', 'Signup failed. Please try again.');
            }
        }
        
        // Check existing session
        async function checkSession() {
            if (!accessToken) {
                showAlert('error', 'No active session found');
                return;
            }
            
            showLoading(true);
            
            try {
                const result = await apiCall('/auth/check', 'GET', null, true);
                
                showLoading(false);
                
                if (result.success && result.valid) {
                    // Get full profile
                    const profileResult = await apiCall('/auth/profile', 'GET', null, true);
                    
                    if (profileResult.success) {
                        currentUser = profileResult.data.user;
                        showProfile();
                        showAlert('success', 'Session restored!');
                    }
                } else {
                    clearTokens();
                    showAlert('error', 'Session expired. Please sign in again.');
                }
            } catch (error) {
                showLoading(false);
                clearTokens();
                showAlert('error', 'Session check failed');
            }
        }
        
        // Show user profile
        function showProfile() {
            // Hide forms, show profile
            document.querySelectorAll('.form-container').forEach(el => {
                el.style.display = 'none';
            });
            document.querySelectorAll('.tab').forEach(tab => {
                tab.style.display = 'none';
            });
            
            // Update profile info
            if (currentUser) {
                document.getElementById('profileId').textContent = currentUser.id.substring(0, 8) + '...';
                document.getElementById('profileName').textContent = currentUser.name || 'Not set';
                document.getElementById('profileEmail').textContent = currentUser.email || 'Not set';
                document.getElementById('profilePhone').textContent = currentUser.phone || 'Not set';
                document.getElementById('profileCompany').textContent = currentUser.company_name || 'Not set';
                document.getElementById('profilePlan').textContent = currentUser.subscription_plan || 'free';
                document.getElementById('profileCreated').textContent = currentUser.created_at ? 
                    new Date(currentUser.created_at).toLocaleDateString() : 'Not set';
                
                // Show token for debugging
                document.getElementById('accessToken').textContent = accessToken ? 
                    accessToken.substring(0, 50) + '...' : 'No token';
                document.getElementById('tokenDisplay').style.display = 'block';
            }
            
            document.getElementById('profileContainer').style.display = 'block';
        }
        
        // Refresh profile
        async function refreshProfile() {
            showLoading(true);
            
            try {
                const result = await apiCall('/auth/profile', 'GET', null, true);
                
                showLoading(false);
                
                if (result.success) {
                    currentUser = result.data.user;
                    
                    // Update profile info
                    document.getElementById('profileName').textContent = currentUser.name || 'Not set';
                    document.getElementById('profilePhone').textContent = currentUser.phone || 'Not set';
                    document.getElementById('profileCompany').textContent = currentUser.company_name || 'Not set';
                    document.getElementById('profilePlan').textContent = currentUser.subscription_plan || 'free';
                    
                    showAlert('success', 'Profile refreshed!');
                } else {
                    showAlert('error', 'Failed to refresh profile');
                }
            } catch (error) {
                showLoading(false);
                showAlert('error', 'Refresh failed');
            }
        }
        
        // Handle Logout
        async function handleLogout() {
            showLoading(true);
            
            try {
                const result = await apiCall('/auth/signout', 'POST', null, true);
                
                showLoading(false);
                
                if (result.success) {
                    clearTokens();
                    currentUser = null;
                    
                    // Show login form
                    document.getElementById('profileContainer').style.display = 'none';
                    document.querySelectorAll('.tab').forEach(tab => {
                        tab.style.display = 'flex';
                    });
                    showTab('login');
                    
                    // Clear form fields
                    document.getElementById('loginEmail').value = '';
                    document.getElementById('loginPassword').value = '';
                    
                    showAlert('success', 'Logged out successfully!');
                }
            } catch (error) {
                showLoading(false);
                clearTokens();
                currentUser = null;
                
                // Force show login form
                document.getElementById('profileContainer').style.display = 'none';
                document.querySelectorAll('.tab').forEach(tab => {
                    tab.style.display = 'flex';
                });
                showTab('login');
                
                showAlert('success', 'Logged out successfully!');
            }
        }
        
        // Add event listeners for Enter key
        document.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const activeTab = document.querySelector('.tab.active');
                if (activeTab.textContent === 'Sign In') {
                    handleLogin();
                } else {
                    handleSignup();
                }
            }
        });
        
        // Google Sign In function
        async function signInWithGoogle() {
            try {
                // Show loading
                showLoading(true);
                
                // Start Google auth
                const response = await fetch('/api/auth/google', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        redirect_to: window.location.origin + '/api/auth/callback'
                    })
                });
                
                const result = await response.json();
                showLoading(false);
                
                if (result.success) {
                    // Open Google auth in popup
                    const width = 500;
                    const height = 600;
                    const left = window.screen.width / 2 - width / 2;
                    const top = window.screen.height / 2 - height / 2;
                    
                    const popup = window.open(
                        result.data.url, 
                        'Google Auth',
                        \`width=\${width},height=\${height},top=\${top},left=\${left},resizable=yes,scrollbars=yes\`
                    );
                    
                    // Listen for auth success message
                    const messageHandler = function(event) {
                        if (event.data.type === 'google-auth-success') {
                            // Save tokens
                            localStorage.setItem('access_token', event.data.tokens.access_token);
                            localStorage.setItem('refresh_token', event.data.tokens.refresh_token);
                            localStorage.setItem('user', JSON.stringify(event.data.user));
                            
                            currentUser = event.data.user;
                            accessToken = event.data.tokens.access_token;
                            refreshToken = event.data.tokens.refresh_token;
                            
                            // Hide popup
                            if (popup) popup.close();
                            
                            // Update UI
                            showProfile();
                            showAlert('success', 'Signed in with Google!');
                            
                            // Remove listener
                            window.removeEventListener('message', messageHandler);
                        } else if (event.data.type === 'google-auth-error') {
                            // Handle auth errors
                            showAlert('error', event.data.error || 'Google authentication failed');
                            
                            // Hide popup
                            if (popup) popup.close();
                            
                            // Remove listener
                            window.removeEventListener('message', messageHandler);
                        }
                    };
                    
                    window.addEventListener('message', messageHandler);
                    
                    // Check if popup was blocked
                    if (!popup || popup.closed || typeof popup.closed == 'undefined') {
                        showAlert('error', 'Popup blocked! Please allow popups for this site.');
                        window.removeEventListener('message', messageHandler);
                    }
                } else {
                    showAlert('error', result.error || 'Google sign in failed');
                }
            } catch (error) {
                showLoading(false);
                showAlert('error', 'Google sign in failed. Please try again.');
                console.error('Google sign in error:', error);
            }
        }
        
        // Google Sign Up function (same as sign in)
        async function signUpWithGoogle() {
            // Sign up with Google is the same flow as sign in
            // Supabase automatically creates an account if it doesn't exist
            signInWithGoogle();
        }
    </script>
</body>
</html>
  `;
  
  return c.html(html);
});

// Health check endpoint
app.get('/api/health', (c) => {
  const health = {
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development',
    supabase_connected: !!process.env.SUPABASE_URL,
    endpoints: {
      auth: {
        signup: 'POST /api/auth/signup',
        signin: 'POST /api/auth/signin',
        profile: 'GET /api/auth/profile',
        signout: 'POST /api/auth/signout',
        check: 'GET /api/auth/check'
      },
      demo: {
        login_page: 'GET /login',
        home: 'GET /'
      }
    }
  };
  
  return c.json(health);
});

// Mount API routers
app.route('/api/auth', authRouter);
app.route('/api/invoices', invoicesRouter);

// 404 handler for API routes
app.notFound((c) => {
  if (c.req.path.startsWith('/api/')) {
    return c.json({
      success: false,
      error: 'API endpoint not found',
      path: c.req.path
    }, 404);
  }
  
  // For non-API routes, show simple error page
  return c.html(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Page Not Found</title>
      <style>
        body { font-family: sans-serif; text-align: center; padding: 50px; }
        h1 { color: #333; }
        a { color: #667eea; text-decoration: none; }
      </style>
    </head>
    <body>
      <h1>404 - Page Not Found</h1>
      <p>The page you're looking for doesn't exist.</p>
      <p><a href="/">Go to Home</a> | <a href="/login">Go to Login</a></p>
    </body>
    </html>
  `, 404);
});

// Global error handler
app.onError((err, c) => {
  console.error('Server error:', err);
  
  if (c.req.path.startsWith('/api/')) {
    return c.json({
      success: false,
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined
    }, 500);
  }
  
  return c.html(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Server Error</title>
      <style>
        body { font-family: sans-serif; text-align: center; padding: 50px; }
        h1 { color: #dc2626; }
        pre { text-align: left; background: #f3f4f6; padding: 20px; border-radius: 5px; }
      </style>
    </head>
    <body>
      <h1>500 - Internal Server Error</h1>
      <p>Something went wrong on our server.</p>
      ${process.env.NODE_ENV === 'development' ? `<pre>${err.message}</pre>` : ''}
      <p><a href="/">Go to Home</a></p>
    </body>
    </html>
  `, 500);
});

// Start server
const port = parseInt(process.env.PORT || '3000');
serve({
  fetch: app.fetch,
  port
}, (info) => {
  console.log('='.repeat(60));
  console.log(`🚀 Billing Manager API Server Started`);
  console.log('='.repeat(60));
  console.log(`📍 Local:    http://localhost:${info.port}`);
  console.log(`👤 Login:    http://localhost:${info.port}/login`);
  console.log(`📊 API Docs: http://localhost:${info.port}`);
  console.log(`💚 Health:   http://localhost:${info.port}/api/health`);
  console.log('='.repeat(60));
  console.log('\n🔐 Authentication Endpoints:');
  console.log('   POST /api/auth/signup    - Register new user');
  console.log('   POST /api/auth/signin    - Login user');
  console.log('   GET  /api/auth/profile   - Get user profile');
  console.log('   POST /api/auth/signout   - Logout user');
  console.log('   GET  /api/auth/check     - Check session');
  console.log('\n💰 Invoice Endpoints (Protected):');
  console.log('   GET  /api/invoices       - List invoices');
  console.log('   POST /api/invoices       - Create invoice');
  console.log('\n📱 Open http://localhost:${info.port}/login in your browser');
  console.log('   to test the authentication system!');
  console.log('='.repeat(60));
});