/* ---------------- HotelDesk API client ----------------
   Talks to the Express + SQL backend (see /server). Replaces the old
   localStorage-only Store with real fetch() calls, while keeping a
   similar-shaped API so the page scripts stay easy to read. Auth
   token lives in localStorage — it survives closing the tab/browser,
   so staff aren't asked to sign in again just because they stepped
   away for a while; it's only cleared on explicit logout or once the
   token itself expires. */

const API_BASE = '/api';

const Store = {
  // ---- auth ----
  isLoggedIn(){ return !!localStorage.getItem('hd_token'); },
  getToken(){ return localStorage.getItem('hd_token'); },
  setSession(token, user){
    localStorage.setItem('hd_token', token);
    localStorage.setItem('hd_user', JSON.stringify(user || {}));
  },
  getUser(){
    try{ return JSON.parse(localStorage.getItem('hd_user') || '{}'); }catch(e){ return {}; }
  },
  clearSession(){
    localStorage.removeItem('hd_token');
    localStorage.removeItem('hd_user');
  },

  async login(username, password){
    const res = await api('/auth/login', { method: 'POST', body: { username, password }, auth: false });
    Store.setSession(res.token, res.user);
    return res.user;
  },
  async checkSetupStatus(){
    return api('/auth/setup-status', { auth: false });
  },
  async setupAccount(payload){
    const res = await api('/auth/setup', { method: 'POST', body: payload, auth: false });
    Store.setSession(res.token, res.user);
    return res.user;
  },

  // ---- rooms ----
  async getRooms(filters = {}){
    const qs = new URLSearchParams(Object.entries(filters).filter(([,v]) => v)).toString();
    return api('/rooms' + (qs ? `?${qs}` : ''));
  },
  async addRoom(room){
    return api('/rooms', { method: 'POST', body: room });
  },
  async cycleRoomStatus(num){
    return api(`/rooms/${num}/cycle-status`, { method: 'PATCH' });
  },

  // ---- bookings ----
  async getBookings(params = {}){
    const qs = new URLSearchParams(Object.entries(params).filter(([,v]) => v)).toString();
    return api('/bookings' + (qs ? `?${qs}` : ''));
  },
  async createBooking(payload){
    return api('/bookings', { method: 'POST', body: payload });
  },

  // ---- guests ----
  async getGuests(q){
    const qs = q ? `?q=${encodeURIComponent(q)}` : '';
    return api('/guests' + qs);
  },
  async updateGuest(code, changes){
    return api(`/guests/${code}`, { method: 'PUT', body: changes });
  },

  // ---- dashboard ----
  async getStats(){
    return api('/dashboard/stats');
  },

  // ---- notifications ----
  async getNotifications(params = {}){
    const qs = new URLSearchParams(Object.entries(params).filter(([,v]) => v)).toString();
    return api('/notifications' + (qs ? `?${qs}` : ''));
  },
  async getUnreadCount(){
    return api('/notifications/unread-count');
  },
  async markNotificationRead(id){
    return api(`/notifications/${id}/read`, { method: 'PATCH' });
  },
  async markAllNotificationsRead(){
    return api('/notifications/read-all', { method: 'PATCH' });
  },

  // ---- account ----
  async updateProfile(payload){
    const res = await api('/auth/me', { method: 'PUT', body: payload });
    Store.setSession(res.token, res.user);
    return res.user;
  },
  async changePassword(payload){
    return api('/auth/me/password', { method: 'PUT', body: payload });
  },
};

async function api(path, { method = 'GET', body, auth = true } = {}){
  const headers = { 'Content-Type': 'application/json' };
  if (auth){
    const token = Store.getToken();
    if (!token){
      window.location.href = 'index.html';
      throw new Error('Not authenticated');
    }
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(API_BASE + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && auth){
    Store.clearSession();
    window.location.href = 'index.html';
    throw new Error('Session expired');
  }

  if (res.status === 204) return null;

  let data;
  try{ data = await res.json(); }catch(e){ data = null; }

  if (!res.ok){
    const message = (data && data.error) || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}
