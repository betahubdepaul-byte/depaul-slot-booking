const CONFIG = {
  ADMIN_PASSWORD: 'admin123',
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

let bookings = [];
let fileSha = null;

function to12HourRange(range) {
  if (!range || typeof range !== 'string') return range;

  const m = range.match(/^(\d{2}):(\d{2})\s*[\u2013-]\s*(\d{2}):(\d{2})$/);
  if (!m) return range;

  const to12 = (h, min) => {
    const hour24 = Number(h);
    const minute = String(min).padStart(2, '0');
    const period = hour24 >= 12 ? 'PM' : 'AM';
    const hour12 = hour24 % 12 || 12;
    return `${hour12}:${minute} ${period}`;
  };

  return `${to12(m[1], m[2])} - ${to12(m[3], m[4])}`;
}

function attemptLogin() {
  const pass = document.getElementById('admin-pass').value;
  if (pass === CONFIG.ADMIN_PASSWORD) {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('admin-app').classList.add('active');
    loadBookings();
  } else {
    document.getElementById('login-error').style.display = 'block';
  }
}

function logout() {
  document.getElementById('admin-app').classList.remove('active');
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('admin-pass').value = '';
  document.getElementById('login-error').style.display = 'none';
}

function switchTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelector(`.tab[onclick="switchTab('${name}')"]`).classList.add('active');
  document.getElementById(`tab-${name}`).classList.add('active');
  if (name === 'overview') renderOverview();
  if (name === 'bookings') renderBookingsTable();
  if (name === 'availability') renderAvailability();
}

function openCreateModal() {
  const dateSelect = document.getElementById('create-date');
  const slotSelect = document.getElementById('create-slot');
  dateSelect.innerHTML = '<option value="">Select a date</option>';
  slotSelect.innerHTML = '<option value="">Select a time slot</option>';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let count = 0, i = 0;
  while (count < 30) {
    const d = new Date(today);
    d.setDate(d.getDate() + i++);
    if (d.getDay() !== 0 && d.getDay() !== 6) {
      const opts = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      dateSelect.innerHTML += `<option value="${d.toISOString().split('T')[0]}">${opts}</option>`;
      count++;
    }
  }

  getTimeSlots().forEach(sl => {
    slotSelect.innerHTML += `<option value="${sl.id}|${sl.range}">${to12HourRange(sl.range)}</option>`;
  });

  document.getElementById('create-name').value = '';
  document.getElementById('create-email').value = '';
  document.getElementById('create-studentId').value = '';
  document.getElementById('create-course').value = '';
  document.getElementById('create-reason').value = '';
  document.getElementById('create-modal').classList.add('on');
}

function closeCreateModal() {
  document.getElementById('create-modal').classList.remove('on');
}

async function saveCreate() {
  const name = document.getElementById('create-name').value.trim();
  const email = document.getElementById('create-email').value.trim();
  const studentId = document.getElementById('create-studentId').value.trim();
  const course = document.getElementById('create-course').value.trim();
  const reason = document.getElementById('create-reason').value.trim();
  const dateVal = document.getElementById('create-date').value;
  const slotVal = document.getElementById('create-slot').value;

  if (!name || !email || !studentId || !course || !dateVal || !slotVal) {
    toast('Please fill in all required fields.'); return;
  }
  if (!/^\d+$/.test(studentId)) {
    toast('Student ID must contain digits only'); return;
  }
  if (!email.endsWith('@depaul.edu')) {
    toast('Email must be @depaul.edu'); return;
  }

  const [slotId, timeRange] = slotVal.split('|');
  const dayDate = new Date(dateVal + 'T00:00:00');
  const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayDate.getDay()];
  const dayDisplay = dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  if (bookings.find(b => b.dayDate === dateVal && b.slotId === slotId)) {
    toast('This slot is already booked.'); return;
  }

  const booking = {
    id: Date.now().toString(),
    name, email, studentId, course, reason,
    day: dayName, dayDate, dayDisplay,
    slotId, timeRange,
    bookedAt: new Date().toISOString(),
  };

  bookings.push(booking);
  await saveBookings(booking);
  closeCreateModal();
  renderBookingsTable();
  renderOverview();
  toast('Booking added successfully.');
}

function renderOverview() {
  const today = new Date().toISOString().split('T')[0];
  const weekEnd = new Date();
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weekEndStr = weekEnd.toISOString().split('T')[0];

  const todayCount = bookings.filter(b => b.dayDate === today).length;
  const weekCount = bookings.filter(b => b.dayDate >= today && b.dayDate <= weekEndStr).length;
  const recent = [...bookings].sort((a, b) => new Date(b.bookedAt) - new Date(a.bookedAt)).slice(0, 5);

  document.getElementById('stats-grid').innerHTML = `
    <div class="stat-card">
      <div class="stat-label">Total Bookings</div>
      <div class="stat-value">${bookings.length}</div>
      <div class="stat-sub">All time</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Today</div>
      <div class="stat-value">${todayCount}</div>
      <div class="stat-sub">${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Next 7 Days</div>
      <div class="stat-value">${weekCount}</div>
      <div class="stat-sub">${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Available Slots</div>
      <div class="stat-value">${144 - bookings.length}</div>
      <div class="stat-sub">12 slots/day (Mon-Fri)</div>
    </div>`;

  if (recent.length === 0) {
    document.getElementById('recent-list').innerHTML = '<div class="empty-state">No bookings yet.</div>';
  } else {
    document.getElementById('recent-list').innerHTML = recent.map(b => `
      <div class="booking-item">
        <div class="info">
          <div class="bname">${b.name}</div>
          <div class="bdetail">${b.day}, ${b.dayDisplay} · ${to12HourRange(b.timeRange)}</div>
        </div>
        <span class="badge">${b.course.split(' - ')[0]}</span>
      </div>`).join('');
  }
}

function renderBookingsTable() {
  const q = document.getElementById('search-input').value.toLowerCase();
  const filtered = bookings.filter(b =>
    !q || b.name.toLowerCase().includes(q) || b.email.toLowerCase().includes(q) ||
    b.course.toLowerCase().includes(q)
  );
  const sorted = [...filtered].sort((a, b) => new Date(b.bookedAt) - new Date(a.bookedAt));

  if (sorted.length === 0) {
    document.getElementById('bookings-tbody').innerHTML = '<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--muted)">No bookings found.</td></tr>';
    return;
  }

  document.getElementById('bookings-tbody').innerHTML = sorted.map(b => `
    <tr>
      <td><strong>${b.name}</strong><br><span style="color:var(--muted);font-size:11px">${b.studentId}</span></td>
      <td>${b.email}</td>
      <td>${b.day}<br><span style="color:var(--muted);font-size:11px">${b.dayDisplay}</span></td>
      <td>${to12HourRange(b.timeRange)}</td>
      <td>${b.course.split(' - ')[0]}</td>
      <td>
        <div class="row-actions">
          <button class="edit-btn" onclick="openEditModal('${b.id}')">Edit</button>
          <button class="del-btn" onclick="openDelModal('${b.id}')">Delete</button>
        </div>
      </td>
    </tr>`).join('');
}

function openEditModal(id) {
  const b = bookings.find(b => b.id === id);
  if (!b) return;
  document.getElementById('edit-id').value = id;
  document.getElementById('edit-name').value = b.name;
  document.getElementById('edit-email').value = b.email;
  document.getElementById('edit-studentId').value = b.studentId;
  document.getElementById('edit-course').value = b.course;
  document.getElementById('edit-reason').value = b.reason;
  document.getElementById('edit-modal').classList.add('on');
}

function closeEditModal() {
  document.getElementById('edit-modal').classList.remove('on');
}

async function saveEdit() {
  const id = document.getElementById('edit-id').value;
  const idx = bookings.findIndex(b => b.id === id);
  if (idx === -1) return;

  const name = document.getElementById('edit-name').value.trim();
  const email = document.getElementById('edit-email').value.trim();
  const studentId = document.getElementById('edit-studentId').value.trim();
  const course = document.getElementById('edit-course').value.trim();
  const reason = document.getElementById('edit-reason').value.trim();

  if (!name || !email || !studentId || !course) {
    toast('Please fill in all required fields.'); return;
  }
  if (!/^\d+$/.test(studentId)) {
    toast('Student ID must contain digits only'); return;
  }
  if (!email.endsWith('@depaul.edu')) {
    toast('Email must be @depaul.edu'); return;
  }

  const updated = {
    ...bookings[idx],
    name, email, studentId, course, reason,
  };

  bookings[idx] = updated;
  await saveBookings(updated);
  closeEditModal();
  renderBookingsTable();
  renderOverview();
  toast('Booking updated successfully.');
}

function openDelModal(id) {
  document.getElementById('del-id').value = id;
  document.getElementById('del-modal').classList.add('on');
}

function closeDelModal() {
  document.getElementById('del-modal').classList.remove('on');
}

async function confirmDelete() {
  const id = document.getElementById('del-id').value;
  const b = bookings.find(b => b.id === id);
  bookings = bookings.filter(b => b.id !== id);
  await saveBookings(b);
  closeDelModal();
  renderBookingsTable();
  renderOverview();
  toast('Booking deleted.');
}

function exportCSV() {
  const headers = ['Name', 'Email', 'Student ID', 'Course', 'Reason', 'Date', 'Time', 'Booked At'];
  const rows = bookings.map(b => [b.name, b.email, b.studentId, b.course, b.reason, b.dayDate, b.timeRange, b.bookedAt]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${(v || '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url;
  a.download = `bookings-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function renderAvailability() {
  const nextDays = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    if (d.getDay() !== 0 && d.getDay() !== 6) {
      nextDays.push(d);
    }
  }

  const slots = getTimeSlots();

  document.getElementById('avail-grid').innerHTML = nextDays.map(day => {
    const dateStr = day.toISOString().split('T')[0];
    const dayName = day.toLocaleDateString('en-US', { weekday: 'short' });
    const dayBookings = bookings.filter(b => b.dayDate === dateStr);
    const bookedSlots = new Set(dayBookings.map(b => b.slotId));

    return `
      <div class="avail-card">
        <h3>${dayName} ${day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</h3>
        ${slots.map(sl => {
      const taken = bookedSlots.has(sl.id);
      const bk = dayBookings.find(b => b.slotId === sl.id);
      return `
            <div class="slot-toggle">
              <span class="slot-time">${to12HourRange(sl.range)}</span>
              ${taken
          ? `<span class="taken-name">${bk.name}</span>`
          : `<span class="open-label">Open</span>`}
            </div>`;
    }).join('')}
      </div>`;
  }).join('');
}

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

function ghURL() {
  return `https://api.github.com/repos/${CONFIG.GITHUB_OWNER}/${CONFIG.GITHUB_REPO}/contents/${CONFIG.DATA_PATH}`;
}
function ghHeaders() {
  const h = { 'Accept': 'application/vnd.github.v3+json' };
  if (CONFIG.GT_TOKEN) h['Authorization'] = `Bearer ${CONFIG.GT_TOKEN}`;
  return h;
}

async function loadBookings() {
  setLoading(true, 'Loading bookings...');
  try {
    const res = await fetch(ghURL() + '?ref=' + CONFIG.GITHUB_BRANCH, { headers: ghHeaders() });
    if (res.ok) {
      const data = await res.json();
      fileSha = data.sha;
      bookings = JSON.parse(decodeURIComponent(atob(data.content.replace(/\n/g, ''))));
    } else {
      await loadRaw();
    }
  } catch {
    await loadRaw();
  }
  setLoading(false);
  renderOverview();
}

async function loadRaw() {
  try {
    const url = `https://raw.githubusercontent.com/${CONFIG.GITHUB_OWNER}/${CONFIG.GITHUB_REPO}/${CONFIG.GITHUB_BRANCH}/${CONFIG.DATA_PATH}?t=${Date.now()}`;
    const res = await fetch(url);
    bookings = res.ok ? await res.json() : [];
  } catch {
    bookings = [];
  }
}

async function saveBookings(triggerBooking) {
  if (!CONFIG.GT_TOKEN) { toast('No GitHub token — changes not saved'); return; }
  const content = btoa(encodeURIComponent(JSON.stringify(bookings, null, 2)));
  const body = {
    message: `Admin: Updated bookings (${triggerBooking ? triggerBooking.name : 'edit'})`,
    content,
    branch: CONFIG.GITHUB_BRANCH,
  };
  if (fileSha) body.sha = fileSha;

  try {
    const res = await fetch(ghURL(), {
      method: 'PUT',
      headers: { ...ghHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const d = await res.json();
      fileSha = d.content.sha;
    } else {
      toast('Failed to save changes to GitHub');
    }
  } catch {
    toast('Network error');
  }
}

function setLoading(on, text) {
  document.getElementById('loading').classList.toggle('on', on);
  if (text) document.getElementById('loading-text').textContent = text;
}

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.style.display = 'block';
  setTimeout(() => t.style.display = 'none', 3000);
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

['create-studentId', 'edit-studentId'].forEach((id) => {
  enforceDigitOnlyInput(document.getElementById(id));
});
