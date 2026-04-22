/**
 * Secure Video Visit Client
 * HIPAA-Compliant Whereby Integration
 */

let state = {
    appointmentId: null,
    videoVisitId: null,
    token: null,
    roomId: null,
    status: 'idle',  // idle, waiting, active, ended
    isStaff: false
};

// Parse appointment ID from URL
function getAppointmentIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('appointmentId');
}

/**
 * Initialize video visit
 */
async function initializeVideoVisit() {
    state.appointmentId = getAppointmentIdFromUrl();

    if (!state.appointmentId) {
        document.getElementById('noAppointment').classList.add('show');
        document.getElementById('appointmentSection').style.display = 'none';
        return;
    }

    try {
        // Check if user is authenticated
        const session = await SupabaseAuth.getCurrentSession();
        if (!session?.user) {
            redirectToLogin();
            return;
        }

        // Verify user role
        const userEmail = session.user.email;
        const { data: userProfile } = await SupabaseAPI.makeRequest('/api/auth/me');
        state.isStaff = userProfile?.user?.role === 'staff' || userProfile?.user?.role === 'admin';

        // Fetch appointment
        const appointment = await SupabaseAPI.makeRequest(`/api/appointments/${state.appointmentId}`);
        if (!appointment) {
            showAlert('Appointment not found', 'error');
            return;
        }

        // Load appointment details
        loadAppointmentDetails(appointment);

        // Fetch or create video visit
        try {
            const videoVisits = await SupabaseAPI.makeRequest(`/api/video-visits/${state.appointmentId}`);
            state.videoVisitId = videoVisits.videoVisit.id;
            state.roomId = videoVisits.videoVisit.room_id;
            state.status = videoVisits.videoVisit.status;
            updateUIForStatus();
        } catch (err) {
            // No video visit yet - staff can create one
            if (state.isStaff) {
                await createVideoVisit();
            }
        }

        document.getElementById('appointmentSection').style.display = 'block';
        document.getElementById('noAppointment').style.display = 'none';

    } catch (error) {
        console.error('Initialization error:', error);
        showAlert('Failed to load appointment. Please try again.', 'error');
        document.getElementById('noAppointment').classList.add('show');
    }
}

/**
 * Load appointment details to UI
 */
function loadAppointmentDetails(appointment) {
    document.getElementById('appointmentType').textContent = appointment.type?.name || 'General Visit';
    
    const appointmentTime = new Date(appointment.scheduled_time);
    document.getElementById('appointmentTime').textContent = 
        appointmentTime.toLocaleString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

    document.getElementById('providerName').textContent = 
        appointment.staff?.name || 'Healthcare Provider';

    updateStatusDisplay();
}

/**
 * Create video visit (staff only)
 */
async function createVideoVisit() {
    try {
        showAlert('⏳ Setting up video session...', 'info');

        const response = await SupabaseAPI.makeRequest('/api/video-visits', {
            method: 'POST',
            body: JSON.stringify({ appointmentId: state.appointmentId })
        });

        state.videoVisitId = response.videoVisit.id;
        state.roomId = response.videoVisit.room_id;
        state.status = response.videoVisit.status;

        showAlert('Video session ready. Patient has been notified.', 'info');
        updateUIForStatus();

    } catch (error) {
        console.error('Create video visit error:', error);
        showAlert('Failed to create video session', 'error');
    }
}

/**
 * Request access token and join video call
 */
async function joinVideoCall() {
    try {
        showAlert('Connecting to video...', 'info');

        // Request token from backend
        const response = await SupabaseAPI.makeRequest(`/api/video-visits/${state.videoVisitId}/token`, {
            method: 'POST'
        });

        state.token = response.token;
        state.roomId = response.roomId;

        // Load Whereby video embed
        await loadWherebyVideo(response);
        
        state.status = 'active';
        updateUIForStatus();
        showAlert('Connected to video', 'info');

    } catch (error) {
        console.error('Join video error:', error);
        showAlert('Failed to join video. Token may have expired.', 'error');
    }
}

/**
 * Load Whereby video embed
 * User will implement with Whereby SDK
 */
async function loadWherebyVideo(tokenResponse) {
    const container = document.getElementById('videoContent');
    
        try {
            // Check if Whereby SDK is loaded
            if (typeof Whereby === 'undefined') {
                throw new Error('Whereby SDK not loaded. Check CDN connection.');
            }

            // Create Whereby embedded room
            const wherbyRoom = new Whereby.EmbeddedRoom({
                roomUrl: `https://whereby.com/room/${state.roomId}`,
                accessToken: state.token,
                container: container,
                height: '100%',
                expiresAt: new Date(tokenResponse.expiresAt),
                theme: {
                    primaryColor: '#667eea',
                    participants: {
                        aspectRatio: '16:9'
                    }
                }
            });

            // Handle disconnect
            wherbyRoom.on('disconnected', () => {
                console.log('Whereby room disconnected');
                state.status = 'ended';
                updateUIForStatus();
                showAlert('Video call ended', 'info');
            });

            // Handle connection errors
            wherbyRoom.on('error', (error) => {
                console.error('Whereby error:', error);
                showAlert(`Video error: ${error.message}`, 'error');
            });

            // Store room reference for cleanup
            window.wherbyRoom = wherbyRoom;

            console.log('Whereby room loaded successfully');

        } catch (error) {
            console.error('Failed to load Whereby video:', error);
            showAlert(`Failed to load video: ${error.message}`, 'error');
        
            // Fallback display
            container.innerHTML = `
                <div style="color: white; text-align: center; padding: 100px 20px;">
                    <h2>Video Connection Failed</h2>
                    <p>${error.message}</p>
                    <button onclick="location.reload()" style="padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 6px; cursor: pointer;">
                        Retry
                    </button>
                </div>
            `;
        }


    document.getElementById('videoFrame').style.display = 'flex';
    document.getElementById('waitingRoom').style.display = 'none';
}

/**
 * Leave video call
 */
async function leaveVideoCall() {
    try {
        document.getElementById('videoFrame').style.display = 'none';
        document.getElementById('waitingRoom').style.display = 'block';
        document.getElementById('videoContent').innerHTML = '';
        state.status = 'waiting';
        updateUIForStatus();
        showAlert('Left video call', 'info');
    } catch (error) {
        console.error('Leave video error:', error);
    }
}

/**
 * End video visit (staff only)
 */
async function endVideoVisit() {
    if (!state.isStaff) {
        showAlert('Only providers can end the video visit', 'warning');
        return;
    }

    try {
        await SupabaseAPI.makeRequest(`/api/video-visits/${state.videoVisitId}/end`, {
            method: 'POST'
        });

        state.status = 'ended';
        updateUIForStatus();
        showAlert('Video visit ended', 'info');

    } catch (error) {
        console.error('End video error:', error);
        showAlert('Failed to end video visit', 'error');
    }
}

/**
 * Update UI based on visit status
 */
function updateUIForStatus() {
    const statusEl = document.getElementById('visitStatus');
    const controlsEl = document.getElementById('controls');
    const waitingEl = document.getElementById('waitingRoom');

    const statusMap = {
        'pending': { icon: '⏳', text: 'Waiting for provider', indicator: 'status-waiting' },
        'active': { icon: '🟢', text: 'In progress', indicator: 'status-active' },
        'completed': { icon: '', text: 'Completed', indicator: 'status-ended' }
    };

    const status = statusMap[state.status] || statusMap.pending;
    statusEl.innerHTML = `
        <span class="status-indicator ${status.indicator}"></span>
        ${status.icon} ${status.text}
    `;

    // Show controls for active sessions
    if (state.status === 'active') {
        controlsEl.style.display = 'flex';
        waitingEl.style.display = 'none';
    } else if (state.status === 'pending') {
        controlsEl.style.display = 'flex';
        waitingEl.style.display = 'block';
    } else {
        controlsEl.style.display = 'none';
        waitingEl.innerHTML = '<h2>Visit Complete</h2><p>Thank you for using our secure video service.</p>';
    }
}

/**
 * Show alert message
 */
function showAlert(message, type = 'info') {
    const alertEl = document.getElementById('alert');
    alertEl.textContent = message;
    alertEl.className = `alert alert-${type} show`;
    
    // Auto-hide info alerts
    if (type === 'info') {
        setTimeout(() => {
            alertEl.classList.remove('show');
        }, 4000);
    }
}

/**
 * Redirect to login
 */
function redirectToLogin() {
    window.location.href = 'index.html';
}

/**
 * Event listeners
 */
document.addEventListener('DOMContentLoaded', () => {
    initializeVideoVisit();

    document.getElementById('joinBtn')?.addEventListener('click', joinVideoCall);
    document.getElementById('leaveBtn')?.addEventListener('click', leaveVideoCall);
    document.getElementById('endBtn')?.addEventListener('click', endVideoVisit);
});

// Warn on page unload during active call
window.addEventListener('beforeunload', (e) => {
    if (state.status === 'active') {
        e.preventDefault();
        e.returnValue = 'You are in an active video call. Are you sure you want to leave?';
    }
});
