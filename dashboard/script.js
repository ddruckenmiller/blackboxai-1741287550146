document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form');
    if (!loginForm) return;

    loginForm.addEventListener('submit', function(event) {
        event.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        if (!username || !password) {
            alert('Please enter both username and password');
            return;
        }

        // Get users from localStorage
        const users = JSON.parse(localStorage.getItem('users')) || [];
        
        // Login logic with redirection
        console.log('Login attempt:', username);
        
        // Check if it's the admin
        if (username === 'admin' && password === 'admin') {
            console.log('Admin credentials verified');
            localStorage.setItem('isAdmin', 'true');
            localStorage.setItem('adminToken', 'admin-auth-token');
            localStorage.setItem('adminPermissions', JSON.stringify({
                manageUsers: true,
                manageContent: true,
                viewAnalytics: true
            }));
            window.location.href = 'admin.html';
            return;
        }
        
        // Check for user in the users array
        const user = users.find(u => u.username === username);
        if (user && user.password === password) {
            console.log('User found and password verified:', user.username);
            
            // Clear any existing admin status
            localStorage.removeItem('isAdmin');
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminPermissions');
            
            // Store user information
            const currentUser = {
                id: user.id,
                username: user.username,
                role: user.role,
                password: user.password,
                loginTime: new Date().toISOString()
            };
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            // Log the login action
            const systemLogs = JSON.parse(localStorage.getItem('systemLogs')) || [];
            systemLogs.push({
                timestamp: new Date().toISOString(),
                action: `User ${user.username} logged in`
            });
            localStorage.setItem('systemLogs', JSON.stringify(systemLogs));
            
            // Redirect to user dashboard
            window.location.href = 'index.html';
        } else {
            alert('Invalid username or password. Please check your credentials or contact admin.');
        }
    });
});

// Function to check admin status
function checkAdminStatus() {
    const isAdmin = localStorage.getItem('isAdmin');
    const adminToken = localStorage.getItem('adminToken');
    const adminPermissions = JSON.parse(localStorage.getItem('adminPermissions'));

    if (isAdmin === 'true' && adminToken && adminPermissions) {
        console.log('Admin is logged in with permissions:', adminPermissions);
        return true;
    }
    return false;
}

// Function to check if user is logged in
function checkUserStatus() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (currentUser && currentUser.id) {
        console.log('User is logged in:', currentUser.username);
        return true;
    }
    return false;
}
