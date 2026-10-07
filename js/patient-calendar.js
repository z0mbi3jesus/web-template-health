const API_BASE = window.location.hostname === 'localhost'
    ? 'http://localhost:3001/api'
    : `${window.__APP_CONFIG__?.BACKEND_URL || 'https://web-template-health.onrender.com'}/api`;

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const state = {
    token: localStorage.getItem('authToken'),
    userRole: localStorage.getItem('userRole') || 'client',
    userName: localStorage.getItem('userName') || 'Patient',
    monthAnchor: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    selectedDateIso: null,
    appointmentTypes: [],
    availableSlotsByDate: {},
    myAppointments: [],
    chosenSlot: null
};

const els = {
    monthLabel: document.getElementById('monthLabel'),
    weekdayHeader: document.getElementById('weekdayHeader'),
    calendarGrid: document.getElementById('calendarGrid'),
    selectedDateLabel: document.getElementById('selectedDateLabel'),
    slotList: document.getElementById('slotList'),
    typeSelect: document.getElementById('typeSelect'),
    notesInput: document.getElementById('notesInput'),
    selectedSlotPill: document.getElementById('selectedSlotPill'),
    bookBtn: document.getElementById('bookBtn'),
    appointmentsList: document.getElementById('appointmentsList'),
    globalMessage: document.getElementById('globalMessage'),
    welcomeText: document.getElementById('welcomeText'),
    prevMonthBtn: document.getElementById('prevMonthBtn'),
    nextMonthBtn: document.getElementById('nextMonthBtn'),
    logoutBtn: document.getElementById('logoutBtn'),
    backHomeBtn: document.getElementById('backHomeBtn')
};

document.addEventListener('DOMContentLoaded', async () => {
    if (!state.token) {
        window.location.href = 'index.html';
        return;
    }

    if (state.userRole === 'admin' || state.userRole === 'staff') {
        window.location.href = 'admin-panel.html';
        return;
    }

    els.welcomeText.textContent = `Signed in as ${state.userName}. Pick a date and book from real provider availability.`;

    initializeStaticUI();
    wireEvents();

    try {
        await loadAppointmentTypes();
        await refreshCalendarData();
    } catch (error) {
        showMessage(error.message || 'Failed to load calendar data.', 'err');
    }

    try {
        await loadMyAppointments();
    } catch (error) {
        showMessage(error.message || 'Could not load your appointments.', 'warn');
    }
});

function initializeStaticUI() {
    els.weekdayHeader.innerHTML = WEEKDAYS
        .map((day) => `<div class="weekday">${day}</div>`)
        .join('');

    renderCalendar();
}

function wireEvents() {
    els.prevMonthBtn.addEventListener('click', async () => {
        state.monthAnchor = new Date(state.monthAnchor.getFullYear(), state.monthAnchor.getMonth() - 1, 1);
        await refreshCalendarData();
    });

    els.nextMonthBtn.addEventListener('click', async () => {
        state.monthAnchor = new Date(state.monthAnchor.getFullYear(), state.monthAnchor.getMonth() + 1, 1);
        await refreshCalendarData();
    });

    els.typeSelect.addEventListener('change', async () => {
        state.chosenSlot = null;
        updateChosenSlotPill();
        updateBookButtonState();
        await refreshCalendarData();
    });

    els.bookBtn.addEventListener('click', handleBooking);

    els.logoutBtn.addEventListener('click', async () => {
        try {
            if (window.SupabaseAuth) {
                await window.SupabaseAuth.signOut();
            }
        } catch (error) {
            console.log('Sign out cleanup warning:', error.message);
        }

        localStorage.removeItem('authToken');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userName');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userId');
        window.location.href = 'index.html';
    });

    els.backHomeBtn.addEventListener('click', () => {
        window.location.href = 'index.html?fromDashboard=1';
    });
}

async function apiRequest(path, options = {}) {
    const response = await fetch(`${API_BASE}${path}`, {
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${state.token}`,
            ...(options.headers || {})
        },
        ...options
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
        const msg = payload.error || payload.message || `Request failed (${response.status})`;
        throw new Error(msg);
    }

    return payload;
}

async function loadAppointmentTypes() {
    const payload = await apiRequest('/appointment-types');
    state.appointmentTypes = Array.isArray(payload) ? payload : (payload.appointmentTypes || []);

    if (!state.appointmentTypes.length) {
        els.typeSelect.innerHTML = '<option value="">No visit types available</option>';
        return;
    }

    const options = state.appointmentTypes
        .map((type) => `<option value="${window.escapeHtml(type.id)}">${window.escapeHtml(type.name)} (${type.duration_minutes} min)</option>`)
        .join('');

    els.typeSelect.innerHTML = options;
}

async function refreshCalendarData() {
    const selectedType = els.typeSelect.value || state.appointmentTypes[0]?.id;
    if (!selectedType) {
        state.availableSlotsByDate = {};
        state.selectedDateIso = isoDate(new Date(state.monthAnchor));
        renderCalendar();
        renderSelectedDateSlots();
        return;
    }

    const params = new URLSearchParams({ appointment_type_id: selectedType });
    const payload = await apiRequest(`/available-slots?${params.toString()}`);
    const slotRows = Array.isArray(payload) ? payload : (payload.availableSlots || []);

    const grouped = {};
    slotRows.forEach((slot) => {
        const date = typeof slot.start_time === 'string' ? slot.start_time.slice(0, 10) : '';
        if (!date) return;

        if (!grouped[date]) {
            grouped[date] = [];
        }

        const providerFullName = (slot.users?.name || slot.staff_name || slot.provider_name || '').trim();
        const nameParts = providerFullName ? providerFullName.split(/\s+/) : [];
        const firstName = nameParts.shift() || '';
        const lastName = nameParts.join(' ');

        grouped[date].push({
            slot_id: slot.id,
            start_time: slot.start_time,
            end_time: slot.end_time,
            display_start: new Date(slot.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            display_end: new Date(slot.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            staff_id: slot.staff_id,
            staff_first_name: slot.staff_first_name || firstName,
            staff_last_name: slot.staff_last_name || lastName,
            appointment_type_name: slot.appointment_types?.name || slot.appointment_type_name || ''
        });
    });

    state.availableSlotsByDate = grouped;

    const firstDateInMonth = firstAvailableDateInCurrentMonth();
    if (!state.selectedDateIso || !isDateInCurrentMonth(state.selectedDateIso)) {
        state.selectedDateIso = firstDateInMonth || isoDate(new Date(state.monthAnchor));
    }

    state.chosenSlot = null;
    updateChosenSlotPill();
    updateBookButtonState();

    renderCalendar();
    renderSelectedDateSlots();
}

function renderCalendar() {
    const year = state.monthAnchor.getFullYear();
    const month = state.monthAnchor.getMonth();
    const firstDay = new Date(year, month, 1);
    const startWeekday = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    els.monthLabel.textContent = state.monthAnchor.toLocaleDateString(undefined, {
        month: 'long',
        year: 'numeric'
    });

    const cells = [];

    for (let i = startWeekday - 1; i >= 0; i--) {
        const d = new Date(year, month - 1, daysInPrevMonth - i);
        cells.push(dayButtonHTML(d, true));
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const d = new Date(year, month, day);
        cells.push(dayButtonHTML(d, false));
    }

    while (cells.length < 42) {
        const d = new Date(year, month + 1, cells.length - (startWeekday + daysInMonth) + 1);
        cells.push(dayButtonHTML(d, true));
    }

    els.calendarGrid.innerHTML = cells.join('');

    Array.from(els.calendarGrid.querySelectorAll('.day')).forEach((btn) => {
        btn.addEventListener('click', () => {
            const dateIso = btn.getAttribute('data-date');
            state.selectedDateIso = dateIso;
            state.chosenSlot = null;
            updateChosenSlotPill();
            updateBookButtonState();
            renderCalendar();
            renderSelectedDateSlots();
        });
    });
}

function dayButtonHTML(dateObj, muted) {
    const dateIso = isoDate(dateObj);
    const slots = state.availableSlotsByDate[dateIso] || [];
    const selected = dateIso === state.selectedDateIso;
    const today = dateIso === isoDate(new Date());

    const classes = [
        'day',
        muted ? 'muted' : '',
        selected ? 'selected' : '',
        today ? 'today' : ''
    ].filter(Boolean).join(' ');

    const countText = slots.length ? `<span class="slot-count">${slots.length} open slot${slots.length > 1 ? 's' : ''}</span>` : '';

    return `
        <button type="button" class="${classes}" data-date="${dateIso}">
            <span class="day-number">${dateObj.getDate()}</span>
            ${countText}
        </button>
    `;
}

function renderSelectedDateSlots() {
    if (!state.selectedDateIso) {
        els.selectedDateLabel.textContent = 'Select a date';
        els.slotList.innerHTML = '';
        return;
    }

    const dayDate = new Date(`${state.selectedDateIso}T00:00:00`);
    els.selectedDateLabel.textContent = dayDate.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });

    const slots = state.availableSlotsByDate[state.selectedDateIso] || [];
    if (!slots.length) {
        els.slotList.innerHTML = '<div class="slot-item"><strong>No slots</strong><div class="slot-meta">No provider availability for this date and appointment type.</div></div>';
        return;
    }

    els.slotList.innerHTML = slots.map((slot, idx) => {
        const staffName = `${slot.staff_first_name || ''} ${slot.staff_last_name || ''}`.trim() || 'Provider';
        return `
            <div class="slot-item">
                <strong>${window.escapeHtml(slot.display_start || slot.start_time)} - ${window.escapeHtml(slot.display_end || slot.end_time)}</strong>
                <div class="slot-meta">${window.escapeHtml(staffName)} | ${window.escapeHtml(slot.appointment_type_name || 'Appointment')} </div>
                <div class="slot-actions">
                    <button class="btn btn-primary" type="button" data-slot-index="${idx}">Select Slot</button>
                </div>
            </div>
        `;
    }).join('');

    Array.from(els.slotList.querySelectorAll('[data-slot-index]')).forEach((btn) => {
        btn.addEventListener('click', () => {
            const slotsForDay = state.availableSlotsByDate[state.selectedDateIso] || [];
            state.chosenSlot = slotsForDay[parseInt(btn.getAttribute('data-slot-index'), 10)];
            updateChosenSlotPill();
            updateBookButtonState();
        });
    });
}

function updateChosenSlotPill() {
    if (!state.chosenSlot || !state.selectedDateIso) {
        els.selectedSlotPill.textContent = 'Select a slot to continue';
        return;
    }

    const provider = `${state.chosenSlot.staff_first_name || ''} ${state.chosenSlot.staff_last_name || ''}`.trim();
    const startLabel = state.chosenSlot.display_start || state.chosenSlot.start_time;
    const endLabel = state.chosenSlot.display_end || state.chosenSlot.end_time;
    els.selectedSlotPill.textContent = `${state.selectedDateIso} ${startLabel}-${endLabel}${provider ? ` with ${window.escapeHtml(provider)}` : ''}`;
}

function updateBookButtonState() {
    els.bookBtn.disabled = !state.chosenSlot || !state.selectedDateIso;
}

async function handleBooking() {
    if (!state.chosenSlot || !state.selectedDateIso) {
        showMessage('Pick a date and slot first.', 'warn');
        return;
    }

    els.bookBtn.disabled = true;
    const originalText = els.bookBtn.textContent;
    els.bookBtn.textContent = 'Booking...';

    try {
        const payload = {
            slot_id: state.chosenSlot.slot_id,
            appointment_type_id: els.typeSelect.value,
            start_time: state.chosenSlot.start_time,
            client_notes: els.notesInput.value.trim()
        };

        await apiRequest('/appointments', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        els.notesInput.value = '';
        state.chosenSlot = null;
        updateChosenSlotPill();
        showMessage('Appointment request submitted. Provider can now approve it.', 'ok');

        await Promise.all([refreshCalendarData(), loadMyAppointments()]);
    } catch (error) {
        showMessage(error.message || 'Booking failed.', 'err');
    } finally {
        els.bookBtn.textContent = originalText;
        updateBookButtonState();
    }
}

async function loadMyAppointments() {
    const payload = await apiRequest('/appointments');
    state.myAppointments = Array.isArray(payload) ? payload : (payload.appointments || []);

    if (!state.myAppointments.length) {
        els.appointmentsList.innerHTML = '<div class="appt-item"><strong>No appointments yet</strong><div class="appt-meta">Book your first appointment from the calendar.</div></div>';
        return;
    }

    els.appointmentsList.innerHTML = state.myAppointments.map((appt) => {
        const canCancel = ['pending', 'confirmed'].includes(appt.status);
        const provider = appt.staff?.name || 'Provider TBD';
        const appointmentName = appt.appointment_types?.name || appt.appointment_type_name || 'Appointment';
        const startLabel = appt.start_time ? new Date(appt.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
        const endLabel = appt.end_time ? new Date(appt.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
        const dateLabel = appt.start_time ? new Date(appt.start_time).toLocaleDateString() : (appt.appointment_date || '');

        return `
            <div class="appt-item">
                <strong>${dateLabel} | ${startLabel}-${endLabel}</strong>
                <div class="appt-meta">${window.escapeHtml(appointmentName)} with ${window.escapeHtml(provider)}</div>
                <div style="margin-top:6px;"><span class="status ${window.escapeHtml(appt.status)}">${window.escapeHtml(appt.status.replace('_', ' '))}</span></div>
                <div class="appt-actions">
                    ${canCancel ? `<button class="btn btn-secondary" type="button" data-cancel-id="${window.escapeHtml(appt.id)}">Cancel</button>` : ''}
                </div>
            </div>
        `;
    }).join('');

    Array.from(els.appointmentsList.querySelectorAll('[data-cancel-id]')).forEach((btn) => {
        btn.addEventListener('click', async () => {
            const appointmentId = btn.getAttribute('data-cancel-id');
            await cancelAppointment(appointmentId);
        });
    });
}

async function cancelAppointment(appointmentId) {
    if (!window.confirm('Cancel this appointment?')) {
        return;
    }

    try {
        await apiRequest(`/appointments/${appointmentId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status: 'cancelled' })
        });

        showMessage('Appointment cancelled.', 'ok');
        await Promise.all([loadMyAppointments(), refreshCalendarData()]);
    } catch (error) {
        showMessage(error.message || 'Could not cancel appointment.', 'err');
    }
}

function firstAvailableDateInCurrentMonth() {
    const year = state.monthAnchor.getFullYear();
    const month = state.monthAnchor.getMonth();

    const matches = Object.keys(state.availableSlotsByDate)
        .filter((iso) => {
            const d = new Date(`${iso}T00:00:00`);
            return d.getFullYear() === year && d.getMonth() === month;
        })
        .sort();

    return matches[0] || null;
}

function isDateInCurrentMonth(dateIso) {
    const dateObj = new Date(`${dateIso}T00:00:00`);
    return dateObj.getFullYear() === state.monthAnchor.getFullYear() && dateObj.getMonth() === state.monthAnchor.getMonth();
}

function isoDate(dateObj) {
    const year = dateObj.getFullYear();
    const month = `${dateObj.getMonth() + 1}`.padStart(2, '0');
    const day = `${dateObj.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function showMessage(text, type) {
    els.globalMessage.textContent = text;
    els.globalMessage.className = `message show ${type}`;

    if (type === 'ok') {
        setTimeout(() => {
            els.globalMessage.className = 'message';
        }, 3200);
    }
}
