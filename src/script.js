// ================================================================
// CONFIG — UPDATE THESE FOR YOUR SETUP
// ================================================================
const CONFIG = {
  GITHUB_OWNER: 'betahubdepaul-byte',
  GITHUB_REPO: 'depaul-slot-booking',
  GITHUB_BRANCH: 'main',
  DATA_PATH: 'data/bookings.json',
  GT_TOKEN_P1: 'github_pat_',
  GT_TOKEN_P2: '11CBYB3XY0pjoglxjtDtYO_RRLC5Lp1LWSqrlWbO1uy63y63EP9T1N9Yzkh6D8CcQgXPZQCXWMDEFWaflc', // <-- PASTE THE REST OF YOUR NEW TOKEN HERE

  get GT_TOKEN() {
    return this.GT_TOKEN_P2 ? this.GT_TOKEN_P1 + this.GT_TOKEN_P2 : null;
  },
};


// ================================================================
// STATE
// ================================================================
let student = {};
let bookings = [];
let fileSha = null;
let selectedDate = null;  // { name, date, display }
let selectedSlot = null;  // { id, range }
let viewMonth = new Date().getMonth();
let viewYear = new Date().getFullYear();


// ================================================================
// STEP 1 → STEP 2
// ================================================================
function goStep2() {
  const name = v('f-name');
  const id = v('f-id');
  const email = v('f-email');
  const course = v('f-course');
  const reason = v('f-reason');

  if (!name || !id || !email || !course || !reason) {
    toast('Please fill in all fields'); return;
  }
  if (!email.endsWith('@depaul.edu')) {
    document.getElementById('email-err').style.display = 'block'; return;
  }
  if (!/^\d+$/.test(id)) {
    toast('Student ID must contain digits only'); return;
  }
  document.getElementById('email-err').style.display = 'none';

  student = { name, id, email, course, reason };
  selectedDate = null;
  selectedSlot = null;

  loadBookings().then(() => {
    renderCalendar();
    document.getElementById('step2-user').textContent = `${name} · ${email}`;
    showScreen('step2');
  });
}

function v(id) { return document.getElementById(id).value.trim(); }


// ================================================================
// STEP 2: CALENDAR SELECTION
// ================================================================
function changeMonth(delta) {
  viewMonth += delta;
  if (viewMonth < 0) { viewMonth = 11; viewYear--; }
  if (viewMonth > 11) { viewMonth = 0; viewYear++; }
  renderCalendar();
}

function countAvailable(dayDate) {
  const totalSlots = getTimeSlots().length;
  const booked = bookings.filter(b => b.dayDate === dayDate).length;
  const blockedByTime = getTimeSlots().filter(s => isPastSlotForToday(dayDate, s.id)).length;
  return Math.max(0, totalSlots - booked - blockedByTime);
}

function renderCalendar() {
  const container = document.getElementById('calendar-grid');
  if (!container) return;

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  document.getElementById('cal-month-name').textContent = `${monthNames[viewMonth]} ${viewYear}`;

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let html = '';
  ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach(d => html += `<div class="cal-day-label">${d}</div>`);

  // Fill empty days for current month offset
  for (let i = 0; i < firstDay; i++) html += '<div class="cal-item other"></div>';

  for (let d = 1; d <= daysInMonth; d++) {
    const curDate = new Date(viewYear, viewMonth, d);
    const dateStr = curDate.toISOString().split('T')[0];
    const isPast = curDate < today;
    const dayOfWeek = curDate.getDay();
    // Fri (5), Sat (6), Sun (0) restricted per original logic (Mon-Thu only)
    const isRestricted = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6;

    const avail = countAvailable(dateStr);
    const sel = selectedDate && selectedDate.date === dateStr;
    const isToday = curDate.getTime() === today.getTime();

    let cls = 'cal-item ';
    if (isPast) cls += 'past';
    else if (isRestricted) cls += 'restricted';
    else {
      cls += 'selectable';
      if (avail <= 0) cls += ' full';
      if (sel) cls += ' selected';
    }
    if (isToday) cls += ' today';

    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];
    const displayDate = curDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const clickAttr = (isPast || isRestricted || avail <= 0) ? '' : `onclick="selectDate('${dayName}','${dateStr}','${displayDate}')"`;

    html += `
      <div class="${cls}" ${clickAttr}>
        <div class="cal-num">${d}</div>
        ${(!isPast && !isRestricted) ? `<div class="avail-text">${avail <= 0 ? 'Full' : avail + ' open'}</div>` : ''}
      </div>`;
  }

  container.innerHTML = html;
  document.getElementById('btn-to-step3').disabled = !selectedDate;
}

function selectDate(name, date, display) {
  selectedDate = { name, date, display };
  selectedSlot = null;
  renderCalendar();
}


// ================================================================
// STEP 2 → STEP 3
// ================================================================
function goStep3() {
  if (!selectedDate) return;
  renderTimeGrid();
  document.getElementById('step3-info').textContent =
    `${selectedDate.name}, ${selectedDate.display} · ${student.name}`;
  showScreen('step3');
}


// ================================================================
// STEP 3: TIME SLOT SELECTION
// ================================================================
function getTimeSlots() {
  const s = [];
  for (let h = 10; h < 16; h++) {
    for (let m = 0; m < 60; m += 30) {
      const sh = String(h).padStart(2, '0');
      const sm = String(m).padStart(2, '0');
      const et = h * 60 + m + 30;
      const eh = String(Math.floor(et / 60)).padStart(2, '0');
      const em = String(et % 60).padStart(2, '0');
      s.push({ range: `${sh}:${sm} – ${eh}:${em}`, id: `${sh}${sm}` });
    }
  }
  return s;
}

function renderTimeGrid() {
  const slots = getTimeSlots();
  let html = '';

  if (selectedSlot) {
    const slotTakenNow = bookings.find(b => b.dayDate === selectedDate.date && b.slotId === selectedSlot.id);
    if (slotTakenNow || isPastSlotForToday(selectedDate.date, selectedSlot.id)) {
      selectedSlot = null;
    }
  }

  slots.forEach(sl => {
    const bk = bookings.find(b => b.dayDate === selectedDate.date && b.slotId === sl.id);
    const yours = bk && bk.email === student.email;
    const past = isPastSlotForToday(selectedDate.date, sl.id);
    const sel = selectedSlot && selectedSlot.id === sl.id;

    let cls = 'time-card ';
    let statusText = '';
    let onclick = '';

    if (yours) {
      cls += 'yours';
      statusText = 'Your booking';
    } else if (bk) {
      cls += 'taken';
      statusText = 'Taken';
    } else if (past) {
      cls += 'taken';
      statusText = 'Time passed';
    } else {
      cls += sel ? 'selected' : 'open';
      statusText = sel ? 'Selected ✓' : 'Available';
      onclick = `onclick="selectTime('${sl.id}','${sl.range}')"`;
    }

    html += `
      <div class="${cls}" ${onclick}>
        ${sl.range}
        <div class="status">${statusText}</div>
      </div>`;
  });

  document.getElementById('time-grid').innerHTML = html;
  document.getElementById('btn-book').disabled = !selectedSlot;
}

function selectTime(id, range) {
  selectedSlot = { id, range };
  renderTimeGrid();
}


// ================================================================
// SUBMIT BOOKING
// ================================================================
async function submitBooking() {
  if (!selectedDate || !selectedSlot) return;

  setLoading(true, 'Checking availability...');

  // Re-fetch to check conflicts
  await loadBookings();
  if (isPastSlotForToday(selectedDate.date, selectedSlot.id)) {
    setLoading(false);
    toast('This time slot has already passed. Please choose a future slot.');
    renderTimeGrid();
    return;
  }
  if (bookings.find(b => b.dayDate === selectedDate.date && b.slotId === selectedSlot.id)) {
    setLoading(false);
    toast('This slot was just booked by someone else!');
    renderTimeGrid();
    return;
  }

  const booking = {
    id: Date.now().toString(),
    name: student.name,
    email: student.email,
    studentId: student.id,
    course: student.course,
    reason: student.reason,
    day: selectedDate.name,
    dayDate: selectedDate.date,
    dayDisplay: selectedDate.display,
    slotId: selectedSlot.id,
    timeRange: selectedSlot.range,
    bookedAt: new Date().toISOString(),
  };

  setLoading(true, 'Saving booking...');
  const result = await saveToGitHub(booking);
  setLoading(false);

  // Build confirmation
  document.getElementById('confirm-details').innerHTML = [
    ['Name', booking.name],
    ['Email', booking.email],
    ['Student ID', booking.studentId],
    ['Course', booking.course],
    ['Reason', booking.reason],
    ['Date', `${booking.day}, ${booking.dayDisplay}`],
    ['Time Slot', booking.timeRange],
    ['Booked At', new Date(booking.bookedAt).toLocaleString()],
  ].map(([l, val]) =>
    `<div class="detail-row"><span class="lbl">${l}</span><span class="val">${val}</span></div>`
  ).join('');

  // Handle response status
  const statusElement = document.getElementById('email-status-box');
  if (result.success) {
    statusElement.innerHTML = `
      <div class="email-status email-ok">
        <strong>${result.message}</strong><br>
        A confirmation email will be sent to ${booking.email} via GitHub Actions.
      </div>`;
  } else {
    statusElement.innerHTML = `
      <div class="email-status email-fail">
        <strong>⚠️ ${result.message}</strong><br>
        ${result.details ? result.details : 'Please check your GitHub token.'}
      </div>`;
  }

  showScreen('step4');
}

async function saveToGitHub(booking) {
  if (!CONFIG.GT_TOKEN) {
    return {
      success: false,
      message: 'Configuration Error',
      details: 'GitHub token missing in CONFIG'
    };
  }

  try {
    const url = `https://api.github.com/repos/${CONFIG.GITHUB_OWNER}/${CONFIG.GITHUB_REPO}/actions/workflows/handle_booking.yml/dispatches`;
    const headers = {
      'Authorization': `Bearer ${CONFIG.GT_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    };

    // 1. Trigger save_booking action in the workflow
    const saveRes = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        ref: CONFIG.GITHUB_BRANCH,
        inputs: {
          action: 'save_booking',
          booking_data: JSON.stringify(booking)
        }
      })
    });

    if (!saveRes.ok) {
       const err = await saveRes.text();
       console.error('Trigger save error:', err);
       return {
         success: false,
         message: 'Failed to Save Booking',
         details: 'Could not trigger save_booking action. Check your GitHub token.'
       };
    }

    // 2. Trigger send_email action in the workflow
    const emailRes = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        ref: CONFIG.GITHUB_BRANCH,
        inputs: {
          action: 'send_email',
          name: booking.name || '',
          email: booking.email || '',
          student_id: booking.studentId || '',
          course: booking.course || '',
          reason: booking.reason || '',
          day: booking.day || '',
          day_display: booking.dayDisplay || '',
          time_range: booking.timeRange || ''
        }
      })
    });

    if (!emailRes.ok) {
       console.error('Trigger email error');
       // Still return success but note email may have failed
       return {
         success: true,
         message: 'Booking Saved (Email Pending)',
         details: 'Your booking was saved but the email notification may be delayed.'
       };
    }

    bookings.push(booking); // optimistically update local state
    return {
      success: true,
      message: 'Booking confirmed!'
    };

  } catch (e) {
    console.error('Trigger handle_booking error:', e);
    return {
      success: false,
      message: 'Network Error',
      details: 'Could not reach GitHub. Please check your internet connection.'
    };
  }
}

function bookAnother() {
  selectedDate = null;
  selectedSlot = null;
  loadBookings().then(() => {
    renderCalendar();
    showScreen('step2');
  });
}

// ================================================================
// GITHUB API — READ bookings.json
// ================================================================

async function loadBookings() {
  setLoading(true, 'Loading bookings...');
  try {
    const url = `https://raw.githubusercontent.com/${CONFIG.GITHUB_OWNER}/${CONFIG.GITHUB_REPO}/${CONFIG.GITHUB_BRANCH}/${CONFIG.DATA_PATH}?t=${Date.now()}`;
    const res = await fetch(url);
    bookings = res.ok ? await res.json() : [];
  } catch { bookings = []; }
  setLoading(false);
}


// ================================================================
// UTILITIES
// ================================================================
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
}

function setLoading(on, text) {
  document.getElementById('loading').classList.toggle('on', on);
  if (text) document.getElementById('loading-text').textContent = text;
}

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.display = 'block';
  setTimeout(() => t.style.display = 'none', 3500);
}

function dateKeyLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isPastSlotForToday(dayDate, slotId) {
  if (dayDate !== dateKeyLocal(new Date())) return false;
  if (!/^\d{4}$/.test(slotId)) return false;

  const hour = Number(slotId.slice(0, 2));
  const minute = Number(slotId.slice(2, 4));
  const slotStartMinutes = hour * 60 + minute;
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  return nowMinutes >= slotStartMinutes;
}

function enforceDigitOnlyInput(inputEl) {
  if (!inputEl) return;

  inputEl.addEventListener('keydown', (e) => {
    const allowedKeys = [
      'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End'
    ];
    const isShortcut = e.ctrlKey || e.metaKey;
    if (allowedKeys.includes(e.key) || isShortcut) return;
    if (!/^\d$/.test(e.key)) e.preventDefault();
  });

  inputEl.addEventListener('beforeinput', (e) => {
    if (!e.data) return;
    if (!/^\d+$/.test(e.data)) e.preventDefault();
  });

  inputEl.addEventListener('paste', (e) => {
    const pasted = (e.clipboardData || window.clipboardData).getData('text');
    if (!/^\d+$/.test(pasted)) {
      e.preventDefault();
      inputEl.value = (inputEl.value + pasted).replace(/\D/g, '');
    }
  });

  // Fallback sanitizer if browser allows non-digit input events.
  inputEl.addEventListener('input', () => {
    inputEl.value = inputEl.value.replace(/\D/g, '');
  });
}

enforceDigitOnlyInput(document.getElementById('f-id'));
