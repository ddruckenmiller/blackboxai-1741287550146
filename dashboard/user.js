document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) {
        console.log('No user found - redirecting to login');
        window.location.href = 'login.html';
        return;
    }

    // Update UI with user information
    document.getElementById('user-name').textContent = currentUser.username;
    document.getElementById('profile-name').textContent = currentUser.username;
    document.getElementById('profile-role').textContent = currentUser.role || 'User';

    // Add change password handler
    document.getElementById('change-password').addEventListener('click', function() {
        const currentPassword = prompt('Enter current password:');
        if (currentPassword === currentUser.password) {
            const newPassword = prompt('Enter new password:');
            if (newPassword && newPassword.trim()) {
                // Update password in users array
                const users = JSON.parse(localStorage.getItem('users')) || [];
                const userIndex = users.findIndex(u => u.id === currentUser.id);
                if (userIndex !== -1) {
                    users[userIndex].password = newPassword;
                    localStorage.setItem('users', JSON.stringify(users));
                    // Update current user
                    currentUser.password = newPassword;
                    localStorage.setItem('currentUser', JSON.stringify(currentUser));
                    alert('Password changed successfully!');
                }
            }
        } else {
            alert('Current password is incorrect!');
        }
    });

    // Initialize calendar with a small delay to ensure proper rendering
    setTimeout(() => {
        initializeCalendar(currentUser);
    }, 100);

    // Setup logout handler
    document.getElementById('logout').addEventListener('click', function() {
        if (confirm('Are you sure you want to log out?')) {
            // Clear all user-specific data
            localStorage.removeItem('currentUser');
            localStorage.removeItem('isAdmin');
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminPermissions');
            
            // Redirect to login page
            window.location.href = 'login.html';
        }
    });

    // Update upcoming lessons sidebar
    updateUpcomingLessons(currentUser);
});

function initializeCalendar(currentUser) {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl) {
        console.error('Calendar element not found');
        return;
    }

    const lessonPlans = JSON.parse(localStorage.getItem('lessonPlans')) || [];
    
    // Filter lessons assigned to current user
    const userLessons = lessonPlans.filter(lesson => 
        lesson.assignedUsers && lesson.assignedUsers.includes(currentUser.id)
    );

    // Convert lessons to calendar events
    const events = userLessons.map(lesson => ({
        id: lesson.id,
        title: lesson.title,
        start: lesson.start,
        description: lesson.description,
        className: 'user-lesson-event',
        allDay: true
    }));

    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,dayGridWeek'
        },
        events: events,
        height: 'auto',
        selectable: true,
        eventDidMount: function(info) {
            // Add tooltips to events
            info.el.title = info.event.extendedProps.description || info.event.title;
        },
        eventClick: function(info) {
            // Show lesson details when clicked
            const lesson = userLessons.find(l => l.id === parseInt(info.event.id));
            if (lesson) {
                showLessonDetails(lesson);
            }
        }
    });

    calendar.render();
}

function showLessonDetails(lesson) {
    const formattedDate = new Date(lesson.start).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const details = `
        Lesson: ${lesson.title}
        Date: ${formattedDate}
        
        Description: ${lesson.description}
    `;

    alert(details);
}

function updateUpcomingLessons(currentUser) {
    const upcomingList = document.getElementById('upcoming-lessons');
    const lessonPlans = JSON.parse(localStorage.getItem('lessonPlans')) || [];
    
    // Filter and sort upcoming lessons
    const now = new Date();
    const userLessons = lessonPlans
        .filter(lesson => 
            lesson.assignedUsers && 
            lesson.assignedUsers.includes(currentUser.id) &&
            new Date(lesson.start) >= now
        )
        .sort((a, b) => new Date(a.start) - new Date(b.start))
        .slice(0, 5); // Show only next 5 lessons

    // Update the upcoming lessons list
    if (userLessons.length) {
        upcomingList.innerHTML = userLessons.map(lesson => {
            const date = new Date(lesson.start).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
            });
            return `
                <li class="p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors cursor-pointer"
                    onclick="showLessonDetails(${JSON.stringify(lesson).replace(/"/g, '&quot;')})">
                    <div class="font-semibold text-gray-800">${lesson.title}</div>
                    <div class="text-sm text-gray-600">${date}</div>
                </li>
            `;
        }).join('');
    } else {
        upcomingList.innerHTML = '<li class="text-gray-600 text-center p-3">No upcoming lessons</li>';
    }
}

// Make showLessonDetails available globally for the onclick handlers
window.showLessonDetails = showLessonDetails;
