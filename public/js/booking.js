let guestCount = 1;

document.addEventListener('DOMContentLoaded', () => {
  initSidebar('booking');

  const roomTypeSelect = document.getElementById('s-roomtype');
  const roomSelect = document.getElementById('s-room');
  const checkinInput = document.getElementById('s-checkin');
  const checkoutInput = document.getElementById('s-checkout');

  document.getElementById('qty-minus').addEventListener('click', () => {
    guestCount = Math.max(1, guestCount - 1);
    document.getElementById('qty-val').textContent = guestCount;
  });
  document.getElementById('qty-plus').addEventListener('click', () => {
    guestCount = Math.min(10, guestCount + 1);
    document.getElementById('qty-val').textContent = guestCount;
  });

  // Room-type label as stored on room records ("Single", "Suite", …) —
  // keyed by the same $/night value used in the <option>s below.
  const TYPE_BY_RATE = { '150': 'Single', '200': 'Double', '300': 'Deluxe', '450': 'Suite' };

  async function refreshRoomOptions(){
    const type = TYPE_BY_RATE[roomTypeSelect.value];
    if (!type){
      roomSelect.innerHTML = '<option value="">Select a room type first</option>';
      roomSelect.disabled = true;
      return;
    }
    roomSelect.disabled = true;
    roomSelect.innerHTML = '<option value="">Loading rooms…</option>';
    try{
      const rooms = await Store.getRooms({ type, status: 'Available' });
      if (!rooms.length){
        roomSelect.innerHTML = '<option value="">No available rooms of this type</option>';
        return;
      }
      roomSelect.innerHTML = '<option value="">Select a room</option>' +
        rooms.map(r => `<option value="${r.num}">Room ${r.num} — Floor ${r.floor}</option>`).join('');
      roomSelect.disabled = false;
    }catch(err){
      roomSelect.innerHTML = '<option value="">Could not load rooms</option>';
    }
  }

  roomTypeSelect.addEventListener('change', refreshRoomOptions);

  [roomTypeSelect, roomSelect, checkinInput, checkoutInput].forEach(el => {
    el.addEventListener('change', updateSummary);
    el.addEventListener('input', updateSummary);
  });

  document.getElementById('booking-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const first = document.getElementById('g-first').value.trim();
    const last = document.getElementById('g-last').value.trim();
    const email = document.getElementById('g-email').value.trim();
    const phone = document.getElementById('g-phone').value.trim();
    if (!first || !last || !email || !checkinInput.value || !checkoutInput.value || !roomTypeSelect.value || !roomSelect.value){
      showToast('Please fill in all required fields, including a specific room');
      return;
    }

    const rate = Number(roomTypeSelect.value);
    const typeLabel = roomTypeSelect.options[roomTypeSelect.selectedIndex].text.split(' — ')[0];
    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    try{
      await Store.createBooking({
        firstName: first,
        lastName: last,
        email: email,
        phone: phone,
        roomTypeLabel: typeLabel,
        ratePerNight: rate,
        checkIn: checkinInput.value,
        checkOut: checkoutInput.value,
        guestsCount: guestCount,
        roomNumber: roomSelect.value,
      });

      showToast(`Booking confirmed for ${first} ${last}`);
      e.target.reset();
      guestCount = 1;
      document.getElementById('qty-val').textContent = '1';
      roomSelect.innerHTML = '<option value="">Select a room type first</option>';
      roomSelect.disabled = true;
      updateSummary();
    }catch(err){
      showToast(err.message || 'Could not create booking');
    }finally{
      if (submitBtn) submitBtn.disabled = false;
    }
  });

  document.getElementById('save-draft-btn').addEventListener('click', () => showToast('Draft saved'));

  updateSummary();
});

function updateSummary(){
  const roomTypeSelect = document.getElementById('s-roomtype');
  const checkinInput = document.getElementById('s-checkin');
  const checkoutInput = document.getElementById('s-checkout');
  const summaryBox = document.getElementById('summary-box');

  const rate = Number(roomTypeSelect.value);
  const inD = checkinInput.value ? new Date(checkinInput.value) : null;
  const outD = checkoutInput.value ? new Date(checkoutInput.value) : null;

  if (!rate || !inD || !outD || outD <= inD){
    summaryBox.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9aa0ac" stroke-width="1.8"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 3v3M16 3v3"/></svg>
      Select dates and room type to see estimated total.`;
    return;
  }
  const nights = Math.round((outD - inD) / 86400000);
  const total = nights * rate;
  summaryBox.innerHTML = `
    <div class="summary-line"><span>Room rate</span><span>$${rate} / night</span></div>
    <div class="summary-line"><span>Nights</span><span>${nights}</span></div>
    <div class="summary-line total"><span>Estimated Total</span><span>$${total.toLocaleString()}</span></div>`;
}
