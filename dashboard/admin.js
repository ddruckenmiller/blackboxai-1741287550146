const API_URL = 'http://localhost:5000/api';

document.addEventListener('DOMContentLoaded', function() {
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (!token || !user || user.role !== 'admin') {
        console.log('Admin access denied - redirecting to login');
        window.location.href = 'login.html';
        return;
    }

    console.log('Admin access granted');
    initializeAdminDashboard();
});

function initializeAdminDashboard() {
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
            
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            sections.forEach(section => {
                section.style.display = 'none';
            });
            
            const targetId = link.getAttribute('href').substring(1);
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.style.display = 'block';
                if (targetId === 'lesson-plans' && !calendar) {
                    initializeCalendar();
                }
            }
        });
    });

    // Logout functionality
    document.getElementById('logout').addEventListener('click', function() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    });

    // Initialize calendar variable
    let calendar;

    // Calendar initialization
    function initializeCalendar() {
        const calendarEl = document.getElementById('calendar');
        if (!calendarEl) return;

        calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
            },
            events: fetchLessonPlans,
            editable: true,
            selectable: true,
            select: function(info) {
                document.getElementById('lesson-date').value = info.startStr;
            },
            eventClick: function(info) {
                showLessonDetails(info.event);
            }
        });
        
        calendar.render();
    }

    // Fetch lesson plans from API
    async function fetchLessonPlans() {
        try {
            const response = await fetch(`${API_URL}/lesson-plans`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch lesson plans');
            }
            
            const lessons = await response.json();
            return lessons.map(lesson => ({
                id: lesson.id,
                title: lesson.title,
                start: `${lesson.date}T${lesson.time}`,
                end: calculateEndTime(lesson.date, lesson.time, lesson.duration),
                description: lesson.description
            }));
        } catch (error) {
            console.error('Error fetching lesson plans:', error);
            return [];
        }
    }

    // Helper function to calculate end time
    function calculateEndTime(date, startTime, durationMinutes) {
        const start = new Date(`${date}T${startTime}`);
        return new Date(start.getTime() + durationMinutes * 60000).toISOString();
    }

    // Initialize lesson plan form
    const lessonPlanForm = document.getElementById('lesson-plan-form');
    if (lessonPlanForm) {
        lessonPlanForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = {
                title: document.getElementById('lesson-title').value,
                description: document.getElementById('lesson-description').value,
                date: document.getElementById('lesson-date').value,
                time: document.getElementById('lesson-time').value,
                duration: parseInt(document.getElementById('lesson-duration').value)
            };

            try {
                const response = await fetch(`${API_URL}/lesson-plans`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify(formData)
                });

                if (!response.ok) {
                    throw new Error('Failed to create lesson plan');
                }

                this.reset();
                document.getElementById('lesson-submit').textContent = 'Add Lesson Plan';
                document.getElementById('cancel-lesson-edit').style.display = 'none';

                if (calendar) {
                    calendar.refetchEvents();
                }
                
                alert('Lesson plan added successfully!');
            } catch (error) {
                alert(error.message);
            }
        });
    }

    // User Management Functions
    async function updateUserList() {
        console.log('Updating user list...');
        const userList = document.getElementById('user-list');
        if (!userList) {
            console.error('User list element not found');
            return;
        }
        
        try {
            const response = await fetch(`${API_URL}/users`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch users');
            }
            
            const users = await response.json();
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
        } catch (error) {
            console.error('Error updating user list:', error);
            userList.innerHTML = '<li class="error-message">Error loading users</li>';
        }
    }

    // Initialize user list
    updateUserList();

    // Add user form handler
    const addUserForm = document.getElementById('add-user-form');
    if (addUserForm) {
        addUserForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = {
                username: document.getElementById('username').value.trim(),
                email: document.getElementById('email').value.trim(),
                role: document.getElementById('user-role').value,
                password: 'default123' // Default password
            };

            try {
                const response = await fetch(`${API_URL}/users`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify(formData)
                });

                if (!response.ok) {
                    throw new Error('Failed to create user');
                }

                this.reset();
                updateUserList();
                alert('User added successfully');
            } catch (error) {
                alert(error.message);
            }
        });
    }

    // System Logs Display
    async function displayLogs() {
        const logList = document.getElementById('log-list');
        if (!logList) return;
        
        try {
            const response = await fetch(`${API_URL}/logs`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch logs');
            }
            
            const logs = await response.json();
            logList.innerHTML = '';
            
            logs.forEach(log => {
                const li = document.createElement('li');
                const date = new Date(log.timestamp);
                li.textContent = `${date.toLocaleString()}: ${log.action}`;
                logList.appendChild(li);
            });
        } catch (error) {
            console.error('Error displaying logs:', error);
            logList.innerHTML = '<li class="error-message">Error loading logs</li>';
        }
    }

    // Initialize logs display
    displayLogs();

    // Event listener for refresh logs button
    const refreshLogsBtn = document.querySelector('.view-logs');
    if (refreshLogsBtn) {
        refreshLogsBtn.addEventListener('click', displayLogs);
    }

    // Update dashboard stats
    async function updateDashboardStats() {
        try {
            const [usersResponse, logsResponse] = await Promise.all([
                fetch(`${API_URL}/users`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                }),
                fetch(`${API_URL}/logs`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                })
            ]);

            if (!usersResponse.ok || !logsResponse.ok) {
                throw new Error('Failed to fetch dashboard stats');
            }

            const users = await usersResponse.json();
            const logs = await logsResponse.json();
            
            document.getElementById('active-users').textContent = users.length;
            const loginLogs = logs.filter(log => log.action.includes('logged in'));
            document.getElementById('total-logins').textContent = loginLogs.length;
        } catch (error) {
            console.error('Error updating dashboard stats:', error);
        }
    }

    // Initialize dashboard stats
    updateDashboardStats();

    // Update stats periodically
    setInterval(updateDashboardStats, 30000);
}
