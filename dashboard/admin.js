document.addEventListener('DOMContentLoaded', function() {
    // Check if the user is an admin
    console.log('Checking admin status...');
    const isAdmin = localStorage.getItem('isAdmin');
    console.log('isAdmin value:', isAdmin);
    if (!isAdmin) {
        console.log('Admin access denied - redirecting to login');
        alert('Access denied. Redirecting to login.');
        window.location.href = 'login.html';
    } else {
        console.log('Admin access granted');
        initializeAdminDashboard();
    }
});

function initializeAdminDashboard() {
    // Initialize calendar
    initializeCalendar();
    
    // Menu toggle functionality
    const menuToggle = document.getElementById('menu-toggle');
    const nav = document.querySelector('nav');
    const main = document.querySelector('main');
    const footer = document.querySelector('footer');

    // Load menu state from localStorage
    const isNavCollapsed = localStorage.getItem('navCollapsed') === 'true';
    if (isNavCollapsed) {
        nav.classList.remove('nav-expanded');
        nav.classList.add('nav-collapsed');
        main.classList.add('nav-collapsed');
        footer.classList.add('nav-collapsed');
        menuToggle.querySelector('i').classList.remove('fa-bars');
        menuToggle.querySelector('i').classList.add('fa-bars-staggered');
    }

    menuToggle.addEventListener('click', () => {
        nav.classList.toggle('nav-collapsed');
        main.classList.toggle('nav-collapsed');
        footer.classList.toggle('nav-collapsed');
        
        const isCollapsed = nav.classList.contains('nav-collapsed');
        localStorage.setItem('navCollapsed', isCollapsed);
        
        // Toggle icon
        const icon = menuToggle.querySelector('i');
        icon.classList.toggle('fa-bars');
        icon.classList.toggle('fa-bars-staggered');
    });

    // Navigation functionality
    const navLinks = document.querySelectorAll('nav a');
    const sections = document.querySelectorAll('main > section');

    // Hide all sections except overview initially
    sections.forEach(section => {
        if (section.id !== 'overview') {
            section.style.display = 'none';
        }
    });

    // Add click handlers to nav links
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remove active class from all links
            navLinks.forEach(l => l.classList.remove('active'));
            
            // Add active class to clicked link
            link.classList.add('active');
            
            // Hide all sections
            sections.forEach(section => {
                section.style.display = 'none';
            });
            
            // Show the selected section
            const targetId = link.getAttribute('href').substring(1);
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.style.display = 'block';
            }
        });
    });

    // Logout functionality
    document.getElementById('logout').addEventListener('click', function() {
        localStorage.removeItem('isAdmin');
        window.location.href = 'login.html';
    });

    // User Management Functions
    let users = JSON.parse(localStorage.getItem('users')) || [];
    let systemLogs = JSON.parse(localStorage.getItem('systemLogs')) || [];

    function isUsernameExists(username) {
        return users.some(user => user.username === username);
    }

    function addUser(username, role, email = '') {
        // Check if username already exists
        if (isUsernameExists(username)) {
            throw new Error('Username already exists');
        }

        const newUser = { 
            id: Date.now(), 
            username, 
            role,
            email: email.trim(),
            password: 'default123', // Default password
            createdAt: new Date().toISOString()
        };
        users.push(newUser);
        localStorage.setItem('users', JSON.stringify(users));
        logAction(`Added new user: ${username} (${role})`);
        updateDashboardStats(); // Update stats immediately
        return newUser;
    }

    function removeUser(userId) {
        const user = users.find(u => u.id === userId);
        if (user) {
            users = users.filter(u => u.id !== userId);
            localStorage.setItem('users', JSON.stringify(users));
            logAction(`Removed user: ${user.username}`);
            updateDashboardStats(); // Update stats immediately
            updateUserList(); // Update the user list display
        }
    }

    // Make removeUser available globally
    window.removeUser = removeUser;

    function listUsers() {
        return users;
    }

    function logAction(action) {
        const log = {
            timestamp: new Date().toISOString(),
            action: action
        };
        systemLogs.push(log);
        localStorage.setItem('systemLogs', JSON.stringify(systemLogs));
        displayLogs();
    }

    function getRecentLogs(limit = 10) {
        return systemLogs.slice(-limit).reverse();
    }

    // Track login counts and active users
    function updateDashboardStats() {
        // Update active users count
        const activeUsers = JSON.parse(localStorage.getItem('users')) || [];
        document.getElementById('active-users').textContent = activeUsers.length;

        // Update total logins from system logs
        const logs = JSON.parse(localStorage.getItem('systemLogs')) || [];
        const loginLogs = logs.filter(log => log.action.includes('logged in'));
        document.getElementById('total-logins').textContent = loginLogs.length;
    }

    // Log admin login and update stats
    logAction('Admin logged in');
    updateDashboardStats();

    // Update stats periodically
    setInterval(updateDashboardStats, 30000); // Update every 30 seconds

    // Event listeners for admin actions
    const addUserForm = document.getElementById('add-user-form');
    if (addUserForm) {
        addUserForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const username = document.getElementById('username').value.trim();
            const email = document.getElementById('email').value.trim();
            const role = document.getElementById('user-role').value;

            try {
                const newUser = addUser(username, role, email);
                this.reset();
                updateUserList();
                alert(`User "${newUser.username}" added successfully`);
            } catch (error) {
                alert(error.message);
            }
        });
    }

    // Initialize calendar variable at a higher scope
    let calendar;

    // Calendar initialization
    function initializeCalendar() {
        const calendarEl = document.getElementById('calendar');
        if (!calendarEl) return null;

        calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
            },
            events: getLessonPlansAsEvents(),
            editable: true,
            selectable: true,
            select: function(info) {
                // Handle date selection
                document.getElementById('lesson-date').value = info.startStr;
            },
            eventClick: function(info) {
                // Handle event click
                showLessonDetails(info.event);
            }
        });
        
        calendar.render();
        return calendar;
    }

    // Convert lesson plans to calendar events
    function getLessonPlansAsEvents() {
        const lessonPlans = JSON.parse(localStorage.getItem('lessonPlans')) || [];
        return lessonPlans.map(lesson => ({
            id: lesson.id,
            title: lesson.title,
            start: `${lesson.date}T${lesson.time}`,
            end: calculateEndTime(lesson.date, lesson.time, lesson.duration),
            description: lesson.description
        }));
    }

    // Helper function to calculate end time
    function calculateEndTime(date, startTime, durationMinutes) {
        const start = new Date(`${date}T${startTime}`);
        return new Date(start.getTime() + durationMinutes * 60000).toISOString();
    }

    // Initialize calendar when DOM is loaded
    document.addEventListener('DOMContentLoaded', function() {
        initializeCalendar();
        if (calendar) {
            calendar.render();
        }
    });

    // Initialize lesson plan form
    const lessonPlanForm = document.getElementById('lesson-plan-form');
    if (lessonPlanForm) {
        lessonPlanForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const formData = {
                id: Date.now(),
                title: document.getElementById('lesson-title').value,
                description: document.getElementById('lesson-description').value,
                date: document.getElementById('lesson-date').value,
                time: document.getElementById('lesson-time').value,
                duration: parseInt(document.getElementById('lesson-duration').value)
            };

            // Get existing lesson plans or initialize empty array
            const lessonPlans = JSON.parse(localStorage.getItem('lessonPlans')) || [];
            lessonPlans.push(formData);
            localStorage.setItem('lessonPlans', JSON.stringify(lessonPlans));

            // Reset form
            this.reset();
            document.getElementById('lesson-submit').textContent = 'Add Lesson Plan';
            document.getElementById('cancel-lesson-edit').style.display = 'none';

            // Refresh calendar events
            if (calendar) {
                calendar.refetchEvents();
            }
            
            alert('Lesson plan added successfully!');
        });
    }

    // Handle cancel edit button
    const cancelEditButton = document.getElementById('cancel-lesson-edit');
    if (cancelEditButton) {
        cancelEditButton.addEventListener('click', function() {
            lessonPlanForm.reset();
            this.style.display = 'none';
            document.getElementById('lesson-submit').textContent = 'Add Lesson Plan';
        });
    }

    // Show lesson details in a modal or panel
    function showLessonDetails(event) {
        const lessonTitle = document.getElementById('lesson-title');
        const lessonDescription = document.getElementById('lesson-description');
        const lessonDate = document.getElementById('lesson-date');
        const lessonTime = document.getElementById('lesson-time');
        const lessonDuration = document.getElementById('lesson-duration');
        
        if (lessonTitle && lessonDescription && lessonDate && lessonTime && lessonDuration) {
            lessonTitle.value = event.title;
            lessonDescription.value = event.extendedProps.description || '';
            lessonDate.value = event.start.toISOString().split('T')[0];
            lessonTime.value = event.start.toISOString().split('T')[1].substring(0, 5);
            
            // Calculate duration in minutes
            const duration = (event.end - event.start) / (1000 * 60);
            lessonDuration.value = duration;
            
            // Update form button to show we're editing
            const submitButton = document.getElementById('lesson-submit');
            if (submitButton) {
                submitButton.textContent = 'Update Lesson Plan';
            }
            
            // Show cancel button
            const cancelButton = document.getElementById('cancel-lesson-edit');
            if (cancelButton) {
                cancelButton.style.display = 'block';
            }
        }
    }

    // Update user list function with better handling
    function updateUserList() {
    console.log('Updating user list...');
    const userList = document.getElementById('user-list');
    if (!userList) {
        console.error('User list element not found');
        return;
    }
    
    const users = JSON.parse(localStorage.getItem('users')) || [];
    console.log('Current users:', users);
    
    userList.innerHTML = '';
    
    if (users.length === 0) {
        const emptyMessage = document.createElement('li');
        emptyMessage.textContent = 'No users added yet';
        emptyMessage.classList.add('empty-message');
        userList.appendChild(emptyMessage);
        return;
    }
    
    users.forEach(user => {
        const li = document.createElement('li');
        li.classList.add('user-item');
        li.innerHTML = `
            <div class="user-info">
                <span class="username">${user.username}</span>
                <span class="role">${user.role}</span>
                ${user.email ? `<span class="email">${user.email}</span>` : ''}
            </div>
            <button onclick="removeUser(${user.id})" class="remove-btn">
                <i class="fas fa-trash"></i>
            </button>
        `;
        userList.appendChild(li);
    });
}

    // Initialize user list
    updateUserList();

    // System Logs Display
    function displayLogs() {
        const logList = document.getElementById('log-list');
        if (!logList) return;
        
        logList.innerHTML = '';
        
        getRecentLogs().forEach(log => {
            const li = document.createElement('li');
            const date = new Date(log.timestamp);
            li.textContent = `${date.toLocaleString()}: ${log.action}`;
            logList.appendChild(li);
        });
    }

    // Initialize logs display
    displayLogs();

    // Event listener for refresh logs button
    const refreshLogsBtn = document.querySelector('.view-logs');
    if (refreshLogsBtn) {
        refreshLogsBtn.addEventListener('click', displayLogs);
    }
}
