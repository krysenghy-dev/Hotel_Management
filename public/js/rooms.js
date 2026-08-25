let rooms = [];

const roomIcons = `
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 20v-6a4 4 0 0 1 4-4h1"/><circle cx="8" cy="9" r="1.6"/><path d="M2 16h20v4H2z"/><path d="M22 20v-4"/></svg>
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="14" rx="2"/><path d="M8 21h8"/></svg>
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 4v18M2 4h5.5a2.5 2.5 0 0 1 0 5H2M9 22V10"/></svg>`;

document.addEventListener('DOMContentLoaded', async () => {
  initSidebar('rooms');
  await loadRooms();

  ['filter-type','filter-status','filter-floor'].forEach(id => {
    document.getElementById(id).addEventListener('change', renderRooms);
  });

  const addRoomModal = document.getElementById('add-room-modal');
  document.getElementById('add-room-btn').addEventListener('click', () => addRoomModal.style.display = 'flex');
  document.getElementById('cancel-room-btn').addEventListener('click', () => addRoomModal.style.display = 'none');
  addRoomModal.addEventListener('click', (e) => { if (e.target === addRoomModal) addRoomModal.style.display = 'none'; });

  document.getElementById('add-room-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const num = document.getElementById('new-room-num').value.trim();
    const floor = document.getElementById('new-room-floor').value;
    const type = document.getElementById('new-room-type').value;
    const price = document.getElementById('new-room-price').value;

    try{
      await Store.addRoom({ num: Number(num), floor: Number(floor), type, price: Number(price) });
      addRoomModal.style.display = 'none';
      e.target.reset();
      document.getElementById('filter-type').value='';
      document.getElementById('filter-status').value='';
      document.getElementById('filter-floor').value='';
      await loadRooms();
      showToast(`Room ${num} added`);
    }catch(err){
      showToast(err.message || `Could not add room ${num}`);
    }
  });
});

async function loadRooms(){
  try{
    rooms = await Store.getRooms();
    renderRooms();
  }catch(err){
    document.getElementById('rooms-grid').innerHTML = `<div class="empty-note">Failed to load rooms.</div>`;
    showToast(err.message || 'Failed to load rooms');
  }
}

function renderRooms(){
  const type = document.getElementById('filter-type').value;
  const status = document.getElementById('filter-status').value;
  const floor = document.getElementById('filter-floor').value;
  const grid = document.getElementById('rooms-grid');

  const filtered = rooms.filter(r =>
    (!type || r.type === type) &&
    (!status || r.status === status) &&
    (!floor || String(r.floor) === floor)
  );

  if (filtered.length === 0){
    grid.innerHTML = `<div class="empty-note">No rooms match these filters.</div>`;
    return;
  }

  grid.innerHTML = filtered.map(r => `
    <div class="room-card">
      <div class="rc-top">
        <div class="rc-num">${r.num}</div>
        <span class="badge ${statusClass(r.status)}">${r.status}</span>
      </div>
      <div class="rc-meta">${r.type} &nbsp;•&nbsp; Floor&nbsp;${r.floor}</div>
      <div class="rc-icons">${roomIcons}</div>
      <div class="rc-bottom">
        <div class="rc-price"><span>$</span>${r.price} <small>/night</small></div>
        <button class="rc-edit" onclick="editRoom(${r.num})">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>
          Edit
        </button>
      </div>
    </div>`).join('');
}

async function editRoom(num){
  try{
    const updated = await Store.cycleRoomStatus(num);
    const idx = rooms.findIndex(r => r.num === num);
    if (idx !== -1) rooms[idx] = updated;
    renderRooms();
    showToast(`Room ${num} marked as ${updated.status}`);
  }catch(err){
    showToast(err.message || `Could not update room ${num}`);
  }
}
