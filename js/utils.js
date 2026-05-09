// ═══════════════════════════════════════════════════════════
//  GHAR360 Admin Panel — utils.js
//  JWT helpers, API config, form utilities
// ═══════════════════════════════════════════════════════════

const CONFIG = {
  BASE_URL: 'https://ghr360.onrender.com',
  TOKEN_KEY: 'ghr360_token',
  USER_KEY: 'ghr360_user',
};

// ── JWT / Auth ───────────────────────────────────────────────

const Auth = {
  saveSession(data) {
    localStorage.setItem(CONFIG.TOKEN_KEY, data.accessToken);
    localStorage.setItem(CONFIG.USER_KEY, JSON.stringify({
      username: data.username,
      userType: data.userType,
      isFirstTimeLogin: data.isFirstTimeLogin,
    }));
  },

  getToken() {
    return localStorage.getItem(CONFIG.TOKEN_KEY);
  },

  getUser() {
    const u = localStorage.getItem(CONFIG.USER_KEY);
    return u ? JSON.parse(u) : null;
  },

  isLoggedIn() {
    return !!this.getToken();
  },

  logout() {
    const token = this.getToken();
    if (token) {
      fetch(`${CONFIG.BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      }).catch(() => {});
    }
    localStorage.removeItem(CONFIG.TOKEN_KEY);
    localStorage.removeItem(CONFIG.USER_KEY);
    window.location.href = '../login.html';
  },

  requireAuth() {
    if (!this.isLoggedIn()) {
      window.location.href = '../login.html';
    }
  },

  bearerHeader() {
    return { 'Authorization': `Bearer ${this.getToken()}` };
  },
};

// ── API Client ───────────────────────────────────────────────

const API = {
  async post(endpoint, body, auth = false) {
    const headers = { 'Content-Type': 'application/json' };
    if (auth) Object.assign(headers, Auth.bearerHeader());

    const res = await fetch(`${CONFIG.BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Request failed');
    return data;
  },

  async put(endpoint, body) {
    const headers = { 'Content-Type': 'application/json', ...Auth.bearerHeader() };
    const res = await fetch(`${CONFIG.BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Request failed');
    return data;
  },

  async get(endpoint, auth = true) {
    const headers = {};
    if (auth) Object.assign(headers, Auth.bearerHeader());

    const res = await fetch(`${CONFIG.BASE_URL}${endpoint}`, { headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Request failed');
    return data;
  },

  async patch(endpoint, body = null) {
    const headers = { ...Auth.bearerHeader() };
    const opts = { method: 'PATCH', headers };
    if (body) {
      headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    const res  = await fetch(`${CONFIG.BASE_URL}${endpoint}`, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Request failed');
    return data;
  },

  async delete(endpoint) {
    const res = await fetch(`${CONFIG.BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: Auth.bearerHeader(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Request failed');
    return data;
  },

  async upload(endpoint, formData) {
    const res = await fetch(`${CONFIG.BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: Auth.bearerHeader(),
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Upload failed');
    return data;
  },

  // Auth
  login: (body) => API.post('/auth/login', body, false),
  register: (body) => API.post('/auth/register', body, true),

  // Property
  registerProperty: (body) => API.post('/api/properties/register', body, true),
  getMyProperties: (filter = {}) => API.post('/api/properties/my', filter, true),

  // City
  addCity: (body) => API.post('/api/city/add', body, true),
  updateCity: (id, body) => API.put(`/api/city/update/${id}`, body),
  getCities: () => API.get('/api/city/all'),

  // State
  addState: (body) => API.post('/api/state/add', body, true),
  updateState: (id, body) => API.put(`/api/state/update/${id}`, body),
  getStates: () => API.get('/api/state/all'),

  // Media (Cloudinary)
  uploadMedia: (formData) => API.upload('/api/media/upload', formData),
  getMedia: (propertyId, mediaType = '') => API.get(`/api/media/${propertyId}${mediaType ? '?mediaType=' + mediaType : ''}`),
  deleteMedia: (mediaId) => API.delete(`/api/media/${mediaId}`),

  // Users
  getAllUsers: () => API.get('/api/users'),
};

// ── Form Helpers ─────────────────────────────────────────────

const Form = {
  collect(formEl) {
    const data = {};
    const elements = formEl.querySelectorAll('input, select, textarea');
    elements.forEach(el => {
      if (!el.name) return;
      const val = el.value.trim();
      if (val !== '') data[el.name] = val;
    });
    return data;
  },

  async submit(formEl, submitBtn, onSubmit, onSuccess) {
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span class="spinner"></span> Processing...`;

    try {
      const data = Form.collect(formEl);
      const res = await onSubmit(data);
      Toast.show(res.message || 'Success!', 'success');
      if (onSuccess) onSuccess(res);
    } catch (err) {
      Toast.show(err.message || 'Something went wrong', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  },

  reset(formEl) {
    formEl.reset();
  },
};

// ── Toast Notifications ──────────────────────────────────────

const Toast = {
  show(message, type = 'success', duration = 3500) {
    const existing = document.querySelector('.g360-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `g360-toast g360-toast--${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${type === 'success' ? '✓' : '✕'}</span>
      <span>${message}</span>
    `;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('g360-toast--visible'), 10);
    setTimeout(() => {
      toast.classList.remove('g360-toast--visible');
      setTimeout(() => toast.remove(), 400);
    }, duration);
  },
};

// ── UI Helpers ───────────────────────────────────────────────

const UI = {
  setUserInfo() {
    const user = Auth.getUser();
    if (!user) return;
    const el = document.getElementById('adminUsername');
    if (el) el.textContent = user.username;
  },

  showLoading(container) {
    container.innerHTML = `
      <div class="loading-state">
        <div class="loading-spinner"></div>
        <p>Loading...</p>
      </div>`;
  },

  showEmpty(container, message = 'No data found') {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">◈</div>
        <p>${message}</p>
      </div>`;
  },
};

// ── Number / String Utils ────────────────────────────────────

const Utils = {
  formatPrice(price) {
    if (!price) return '—';
    return '₹ ' + Number(price).toLocaleString('en-IN');
  },

  formatDate(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN');
  },

  badge(type) {
    const map = { RENT: '#D4AF37', SALE: '#0B1C2C' };
    return `<span style="background:${map[type] || '#555'};color:#fff;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:700;">${type}</span>`;
  },
};

async function loadDropdown({
  endpoint,
  method = "GET",   // GET / POST support
  dropdownId,
  selectedId = null,
  placeholder = "Select",
  body = null
}) {
  try {
    let data;

    if (method === "GET") {
      data = await API.get(endpoint);
    } else if (method === "POST") {
      data = await API.post(endpoint, body, true);
    }

    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;

    dropdown.innerHTML = `<option value="">${placeholder}</option>`;

    // MAP support {id:name}
    if (!Array.isArray(data)) {
      Object.entries(data).forEach(([id, name]) => {
        const option = new Option(name, id);
        if (selectedId && selectedId == id) option.selected = true;
        dropdown.add(option);
      });
    }

    // LIST support [{id,name}]
    else {
      data.forEach(item => {
        const option = new Option(item.name || item.username, item.id);
        if (selectedId && selectedId == item.id) option.selected = true;
        dropdown.add(option);
      });
    }

  } catch (err) {
    console.error("Dropdown load failed:", err);
  }
}