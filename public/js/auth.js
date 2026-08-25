document.addEventListener('DOMContentLoaded', async () => {
  // If already logged in, skip straight to the dashboard.
  if (Store.isLoggedIn()){
    window.location.href = 'dashboard.html';
    return;
  }

  const loginForm = document.getElementById('login-form');
  const loginError = document.getElementById('login-error');
  const setupForm = document.getElementById('setup-form');
  const setupError = document.getElementById('setup-error');

  // Decide whether to show the sign-in form or the one-time account
  // setup form (no accounts exist yet in the database).
  try{
    const { needsSetup } = await Store.checkSetupStatus();
    if (needsSetup){
      loginForm.style.display = 'none';
      setupForm.style.display = 'block';
    }
  }catch(err){
    // If the check fails, fall back to the normal login form.
  }

  document.getElementById('toggle-pw').addEventListener('click', () => {
    const pw = document.getElementById('password');
    pw.type = pw.type === 'password' ? 'text' : 'password';
  });
  document.getElementById('setup-toggle-pw').addEventListener('click', () => {
    const pw = document.getElementById('setup-password');
    pw.type = pw.type === 'password' ? 'text' : 'password';
  });

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const u = document.getElementById('username').value.trim();
    const p = document.getElementById('password').value.trim();
    if (!u || !p){
      loginError.textContent = 'Please enter both a username and password.';
      loginError.style.display = 'block';
      return;
    }
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;
    try{
      await Store.login(u, p);
      loginError.style.display = 'none';
      window.location.href = 'dashboard.html';
    }catch(err){
      loginError.textContent = err.message || 'Invalid username or password.';
      loginError.style.display = 'block';
    }finally{
      if (submitBtn) submitBtn.disabled = false;
    }
  });

  setupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fullName = document.getElementById('setup-fullname').value.trim();
    const username = document.getElementById('setup-username').value.trim();
    const password = document.getElementById('setup-password').value;
    const confirm = document.getElementById('setup-confirm').value;

    if (!fullName || !username || !password || !confirm){
      setupError.textContent = 'Please fill in every field.';
      setupError.style.display = 'block';
      return;
    }
    if (username.length < 3){
      setupError.textContent = 'Username must be at least 3 characters.';
      setupError.style.display = 'block';
      return;
    }
    if (password.length < 6){
      setupError.textContent = 'Password must be at least 6 characters.';
      setupError.style.display = 'block';
      return;
    }
    if (password !== confirm){
      setupError.textContent = 'Passwords do not match.';
      setupError.style.display = 'block';
      return;
    }

    const submitBtn = setupForm.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;
    try{
      await Store.setupAccount({ fullName, username, password });
      setupError.style.display = 'none';
      window.location.href = 'dashboard.html';
    }catch(err){
      setupError.textContent = err.message || 'Could not create the account.';
      setupError.style.display = 'block';
    }finally{
      if (submitBtn) submitBtn.disabled = false;
    }
  });
});
