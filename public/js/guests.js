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
        <button title="Edit" onclick="viewGuest('${g.code}')">
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
  showToast(`${g.name} — ${g.status}`);
}
