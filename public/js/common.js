/* ---------------- Shared page helpers ----------------
   Included on every authenticated page (dashboard, rooms,
   new-booking, guests). Handles the auth guard, logout,
   sidebar active state, toast notifications, the notification
   bell dropdown, and the account menu / settings modal. */

(function(){
  // Guard: bounce back to login if not authenticated.
  if (!Store.isLoggedIn()){
    window.location.href = 'index.html';
  }
})();

function statusClass(s){ return s.toLowerCase().replace(/\s+/g,''); }

function initSidebar(activePage){
  document.querySelectorAll('.nav-item[data-page]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.page === activePage);
    btn.addEventListener('click', () => {
      window.location.href = btn.dataset.page + '.html';
    });
  });
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn){
    logoutBtn.addEventListener('click', () => {
      Store.clearSession();
      window.location.href = 'index.html';
    });
  }

  initNotifications();
  initAccountMenu();
}

/* ---------------- CSV export ----------------
   Generic helper: builds a CSV file from an array of row objects and
   triggers a browser download. CSV opens directly in Excel/Sheets. */

function csvEscape(value){
  const s = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

/**
 * exportToCsv('guests.csv',
 *   [{ name: 'Jane', email: 'jane@x.com' }, ...],
 *   [{ key: 'name', label: 'Guest Name' }, { key: 'email', label: 'Email' }]
 * )
 */
function exportToCsv(filename, rows, columns){
  const header = columns.map(c => csvEscape(c.label)).join(',');
  const body = rows.map(row =>
    columns.map(c => csvEscape(row[c.key])).join(',')
  ).join('\n');
  const csv = header + '\n' + body;

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function showToast(msg){
  const t = document.getElementById('toast');
  if (!t) return;
  document.getElementById('toast-msg').textContent = msg;
  t.style.display = 'flex';
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(()=> t.style.display='none', 2600);
}

/* ---------------- Notification bell ---------------- */

function timeAgo(iso){
  const then = new Date(iso.replace(' ', 'T') + 'Z');
  const diffSec = Math.max(0, Math.round((Date.now() - then.getTime()) / 1000));
  if (diffSec < 60) return 'Just now';
  const mins = Math.round(diffSec / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

function initNotifications(){
  const bell = document.getElementById('notif-bell');
  const panel = document.getElementById('notif-panel');
  const list = document.getElementById('notif-list');
  const dot = document.getElementById('notif-dot');
  const markAllBtn = document.getElementById('notif-mark-all');
  if (!bell || !panel || !list) return;

  refreshUnreadDot();

  bell.addEventListener('click', async (e) => {
    e.stopPropagation();
    closeAccountMenu();
    const willOpen = !panel.classList.contains('open');
    panel.classList.toggle('open', willOpen);
    if (willOpen) await loadNotifications();
  });

  markAllBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    try{
      await Store.markAllNotificationsRead();
      await loadNotifications();
      refreshUnreadDot();
    }catch(err){
      showToast(err.message || 'Could not update notifications');
    }
  });

  document.addEventListener('click', (e) => {
    if (!bell.contains(e.target)) panel.classList.remove('open');
  });

  async function loadNotifications(){
    list.innerHTML = `<div class="notif-empty">Loading…</div>`;
    try{
      const notifications = await Store.getNotifications({ limit: 15 });
      if (notifications.length === 0){
        list.innerHTML = `<div class="notif-empty">No notifications yet.</div>`;
        return;
      }
      list.innerHTML = notifications.map(n => `
        <div class="notif-item ${n.read ? 'read' : ''}" data-id="${n.id}">
          <span class="dot-unread"></span>
          <div class="notif-body">
            <div class="notif-msg">${n.message}</div>
            <div class="notif-time">${timeAgo(n.createdAt)}</div>
          </div>
        </div>`).join('');
      list.querySelectorAll('.notif-item').forEach(item => {
        item.addEventListener('click', async () => {
          const id = item.dataset.id;
          if (item.classList.contains('read')) return;
          try{
            await Store.markNotificationRead(id);
            item.classList.add('read');
            refreshUnreadDot();
          }catch(err){ /* silent — non-critical */ }
        });
      });
    }catch(err){
      list.innerHTML = `<div class="notif-empty">Failed to load notifications.</div>`;
    }
  }

  async function refreshUnreadDot(){
    try{
      const { count } = await Store.getUnreadCount();
      dot.style.display = count > 0 ? 'block' : 'none';
    }catch(err){ /* silent */ }
  }
}

/* ---------------- Account menu + settings modal ---------------- */

function closeAccountMenu(){
  const menu = document.getElementById('account-menu');
  if (menu) menu.classList.remove('open');
}

function initAccountMenu(){
  const avatar = document.getElementById('user-avatar');
  const menu = document.getElementById('account-menu');
  const nameEl = document.getElementById('am-name');
  const roleEl = document.getElementById('am-role');
  const manageBtn = document.getElementById('am-manage-btn');
  const logoutBtn2 = document.getElementById('am-logout-btn');
  if (!avatar || !menu) return;

  const user = Store.getUser();
  applyUserToAvatar(user);
  if (nameEl) nameEl.textContent = user.fullName || user.username || 'Account';
  if (roleEl) roleEl.textContent = user.role || '';

  avatar.addEventListener('click', (e) => {
    e.stopPropagation();
    const panel = document.getElementById('notif-panel');
    if (panel) panel.classList.remove('open');
    menu.classList.toggle('open');
  });

  document.addEventListener('click', (e) => {
    if (!avatar.contains(e.target)) menu.classList.remove('open');
  });

  if (manageBtn){
    manageBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.classList.remove('open');
      openAccountModal();
    });
  }
  if (logoutBtn2){
    logoutBtn2.addEventListener('click', () => {
      Store.clearSession();
      window.location.href = 'index.html';
    });
  }
}

function applyUserToAvatar(user){
  const avatar = document.getElementById('user-avatar');
  if (!avatar) return;
  const name = (user.fullName || user.username || 'Admin').trim();
  const initials = name.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase() || 'AD';
  // Avatar contains the dropdown as a child node — only touch the leading text node.
  for (const node of avatar.childNodes){
    if (node.nodeType === Node.TEXT_NODE){
      node.textContent = initials;
      return;
    }
  }
  avatar.insertBefore(document.createTextNode(initials), avatar.firstChild);
}

let accountModalBuilt = false;

function openAccountModal(){
  buildAccountModalIfNeeded();
  const overlay = document.getElementById('account-modal');
  const user = Store.getUser();
  document.getElementById('acc-fullname').value = user.fullName || '';
  document.getElementById('acc-username').value = user.username || '';
  document.getElementById('acc-current-pw').value = '';
  document.getElementById('acc-new-pw').value = '';
  document.getElementById('acc-confirm-pw').value = '';
  document.getElementById('acc-profile-error').style.display = 'none';
  document.getElementById('acc-password-error').style.display = 'none';
  switchAccountTab('profile');
  overlay.style.display = 'flex';
}

function closeAccountModal(){
  const overlay = document.getElementById('account-modal');
  if (overlay) overlay.style.display = 'none';
}

function switchAccountTab(tab){
  document.querySelectorAll('#account-modal .tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('#account-modal .tab-panel').forEach(p => p.classList.toggle('active', p.dataset.tab === tab));
}

function buildAccountModalIfNeeded(){
  if (accountModalBuilt) return;
  accountModalBuilt = true;

  const wrap = document.createElement('div');
  wrap.className = 'modal-overlay';
  wrap.id = 'account-modal';
  wrap.innerHTML = `
    <div class="modal">
      <h3>Manage Account</h3>
      <div class="tabs">
        <button type="button" class="tab-btn active" data-tab="profile">Profile</button>
        <button type="button" class="tab-btn" data-tab="password">Password</button>
      </div>

      <div class="tab-panel active" data-tab="profile">
        <form id="acc-profile-form">
          <div class="field"><label>Full Name</label><input id="acc-fullname" placeholder="e.g. Hotel Administrator"></div>
          <div class="field"><label>Username</label><input id="acc-username" placeholder="e.g. admin"></div>
          <div class="form-error" id="acc-profile-error"></div>
          <div class="modal-actions">
            <button type="button" class="btn btn-ghost" id="acc-cancel-btn-1">Cancel</button>
            <button type="submit" class="btn btn-primary">Save Changes</button>
          </div>
        </form>
      </div>

      <div class="tab-panel" data-tab="password">
        <form id="acc-password-form">
          <div class="field"><label>Current Password</label><input type="password" id="acc-current-pw"></div>
          <div class="field"><label>New Password</label><input type="password" id="acc-new-pw"></div>
          <div class="field"><label>Confirm New Password</label><input type="password" id="acc-confirm-pw"></div>
          <div class="form-hint">At least 6 characters.</div>
          <div class="form-error" id="acc-password-error"></div>
          <div class="modal-actions">
            <button type="button" class="btn btn-ghost" id="acc-cancel-btn-2">Cancel</button>
            <button type="submit" class="btn btn-primary">Update Password</button>
          </div>
        </form>
      </div>
    </div>`;
  document.body.appendChild(wrap);

  wrap.addEventListener('click', (e) => { if (e.target === wrap) closeAccountModal(); });
  wrap.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchAccountTab(btn.dataset.tab));
  });
  document.getElementById('acc-cancel-btn-1').addEventListener('click', closeAccountModal);
  document.getElementById('acc-cancel-btn-2').addEventListener('click', closeAccountModal);

  document.getElementById('acc-profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errBox = document.getElementById('acc-profile-error');
    errBox.style.display = 'none';
    const fullName = document.getElementById('acc-fullname').value.trim();
    const username = document.getElementById('acc-username').value.trim();
    if (!fullName || !username){
      errBox.textContent = 'Full name and username are required.';
      errBox.style.display = 'block';
      return;
    }
    try{
      const user = await Store.updateProfile({ fullName, username });
      applyUserToAvatar(user);
      const nameEl = document.getElementById('am-name');
      if (nameEl) nameEl.textContent = user.fullName || user.username;
      showToast('Profile updated');
      closeAccountModal();
    }catch(err){
      errBox.textContent = err.message || 'Could not update profile';
      errBox.style.display = 'block';
    }
  });

  document.getElementById('acc-password-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errBox = document.getElementById('acc-password-error');
    errBox.style.display = 'none';
    const currentPassword = document.getElementById('acc-current-pw').value;
    const newPassword = document.getElementById('acc-new-pw').value;
    const confirmPassword = document.getElementById('acc-confirm-pw').value;
    if (!currentPassword || !newPassword || !confirmPassword){
      errBox.textContent = 'Please fill in all password fields.';
      errBox.style.display = 'block';
      return;
    }
    if (newPassword !== confirmPassword){
      errBox.textContent = 'New password and confirmation do not match.';
      errBox.style.display = 'block';
      return;
    }
    try{
      await Store.changePassword({ currentPassword, newPassword });
      showToast('Password updated');
      closeAccountModal();
    }catch(err){
      errBox.textContent = err.message || 'Could not update password';
      errBox.style.display = 'block';
    }
  });
}
