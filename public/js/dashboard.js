let recentBookings = [];

document.addEventListener('DOMContentLoaded', () => {
  initSidebar('dashboard');
  loadStats();
  renderRecentBookings();
  document.getElementById('export-bookings-btn').addEventListener('click', exportBookings);
});

function exportBookings(){
  if (recentBookings.length === 0){
    showToast('No bookings to export');
    return;
  }
  exportToCsv('bookings.csv', recentBookings, [
    { key: 'name', label: 'Guest Name' },
    { key: 'code', label: 'Booking Code' },
    { key: 'room', label: 'Room' },
    { key: 'type', label: 'Room Type' },
    { key: 'in', label: 'Check-in' },
    { key: 'out', label: 'Check-out' },
    { key: 'amount', label: 'Amount' },
    { key: 'status', label: 'Status' },
  ]);
  showToast('Booking list exported');
}

async function loadStats(){
  try{
    const s = await Store.getStats();
    document.getElementById('stat-total-rooms').textContent = s.totalRooms;
    document.getElementById('stat-rooms-sub').textContent = `${s.availableRooms} available · ${s.maintenanceRooms} maintenance`;
    document.getElementById('stat-occupancy').textContent = `${s.occupancyRate}%`;
    document.getElementById('stat-occupancy-sub').textContent = `${s.occupiedRooms} of ${s.totalRooms} rooms occupied`;
    document.getElementById('stat-revenue').textContent = `$${Number(s.revenue).toLocaleString()}`;
    document.getElementById('stat-bookings-sub').textContent = `${s.activeBookings} active bookings`;
    document.getElementById('stat-guests').textContent = s.totalGuests;
    document.getElementById('stat-guests-sub').textContent = `${s.checkedInGuests} checked in`;
  }catch(err){
    showToast(err.message || 'Failed to load stats');
  }
}

async function renderRecentBookings(){
  const body = document.getElementById('recent-bookings-body');
  try{
    const bookings = await Store.getBookings({ limit: 8 });
    recentBookings = bookings;
    if (bookings.length === 0){
      body.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-mute);padding:30px;">No bookings yet.</td></tr>`;
      return;
    }
    body.innerHTML = bookings.map(b => `
      <tr>
        <td><div class="guest-name">${b.name}</div><div class="guest-sub">${b.code}</div></td>
        <td>${b.room}<div class="room-type">${b.type}</div></td>
        <td>${b.in}</td>
        <td>${b.out}</td>
        <td>${b.amount}</td>
        <td><span class="badge ${statusClass(b.status)}">${b.status}</span></td>
      </tr>`).join('');
  }catch(err){
    body.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-mute);padding:30px;">Failed to load bookings.</td></tr>`;
    showToast(err.message || 'Failed to load bookings');
  }
}
