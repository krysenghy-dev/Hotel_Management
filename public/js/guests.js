let guests = [];
let searchDebounce;

document.addEventListener('DOMContentLoaded', async () => {
  initSidebar('guests');
  await loadGuests();

  document.getElementById('guest-search').addEventListener('input', () => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(loadGuests, 250);
  });
  document.getElementById('export-btn').addEventListener('click', exportGuests);

  // ---- View modal ----
  const viewModal = document.getElementById('view-guest-modal');
  document.getElementById('close-view-guest-btn').addEventListener('click', () => viewModal.style.display = 'none');
  viewModal.addEventListener('click', (e) => { if (e.target === viewModal) viewModal.style.display = 'none'; });
  document.getElementById('view-to-edit-btn').addEventListener('click', () => {
    const code = viewModal.dataset.code;
    viewModal.style.display = 'none';
    openEditModal(code);
  });

  // ---- Edit modal ----
  const editModal = document.getElementById('edit-guest-modal');
  document.getElementById('cancel-edit-guest-btn').addEventListener('click', () => editModal.style.display = 'none');
  editModal.addEventListener('click', (e) => { if (e.target === editModal) editModal.style.display = 'none'; });

  document.getElementById('edit-guest-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = document.getElementById('eg-code').value;
    const name = document.getElementById('eg-name').value.trim();
    const email = document.getElementById('eg-email').value.trim();
    const phone = document.getElementById('eg-phone').value.trim();
    const room = document.getElementById('eg-room').value.trim();
    const status = document.getElementById('eg-status').value;

    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;
    try{
      await Store.updateGuest(code, { name, email, phone, room: room || null, status });
      editModal.style.display = 'none';
      await loadGuests();
      showToast(`${name} updated`);
    }catch(err){
      showToast(err.message || 'Could not save changes');
    }finally{
      if (submitBtn) submitBtn.disabled = false;
    }
  });
});

async function loadGuests(){
  const q = document.getElementById('guest-search').value.trim();
  const body = document.getElementById('guests-body');
  try{
    guests = await Store.getGuests(q);
    renderGuests();
  }catch(err){
    body.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-mute);padding:30px;">Failed to load guests.</td></tr>`;
    showToast(err.message || 'Failed to load guests');
  }
}

function renderGuests(){
  const body = document.getElementById('guests-body');
  if (guests.length === 0){
    body.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-mute);padding:30px;">No guests found.</td></tr>`;
    return;
  }
  body.innerHTML = guests.map(g => `
    <tr>
      <td><div class="guest-name">${g.name}</div><div class="guest-sub">${g.code}</div></td>
      <td>${g.email}<div class="guest-sub">${g.phone}</div></td>
      <td>${g.room ?? '–'}</td>
      <td><span class="badge ${statusClass(g.status)}">${g.status}</span></td>
      <td>${g.visit}</td>
      <td><div class="actions-cell">
        <button title="View" onclick="viewGuest('${g.code}')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>
        </button>
        <button title="Edit" onclick="openEditModal('${g.code}')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>
        </button>
      </div></td>
    </tr>`).join('');
}

function exportGuests(){
  if (guests.length === 0){
    showToast('No guests to export');
    return;
  }
  exportToCsv('guests.csv', guests, [
    { key: 'name', label: 'Guest Name' },
    { key: 'code', label: 'Guest Code' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'room', label: 'Room' },
    { key: 'status', label: 'Status' },
    { key: 'visit', label: 'Last Visit' },
  ]);
  showToast('Guest list exported');
}

function viewGuest(code){
  const g = guests.find(g => g.code === code);
  if (!g) return;
  const modal = document.getElementById('view-guest-modal');
  modal.dataset.code = code;
  document.getElementById('vg-name').textContent = g.name;
  document.getElementById('vg-code').textContent = g.code;
  document.getElementById('vg-email').textContent = g.email;
  document.getElementById('vg-phone').textContent = g.phone || '—';
  document.getElementById('vg-room').textContent = g.room ?? '—';
  document.getElementById('vg-status').innerHTML = `<span class="badge ${statusClass(g.status)}">${g.status}</span>`;
  document.getElementById('vg-visit').textContent = g.visit;
  modal.style.display = 'flex';
}

function openEditModal(code){
  const g = guests.find(g => g.code === code);
  if (!g) return;
  document.getElementById('eg-code').value = g.code;
  document.getElementById('eg-name').value = g.name;
  document.getElementById('eg-email').value = g.email;
  document.getElementById('eg-phone').value = g.phone || '';
  document.getElementById('eg-room').value = g.room ?? '';
  document.getElementById('eg-status').value = g.status;
  document.getElementById('edit-guest-modal').style.display = 'flex';
}
