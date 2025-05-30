(function() {
  function createModal() {
    let modal = document.getElementById('auth-modal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'auth-modal';
    modal.style = `position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10000`;
    modal.innerHTML = `
      <div style="background:#fff;padding:2em;border-radius:8px;max-width:350px;width:100%;position:relative">
        <button id="close-auth-modal" style="position:absolute;right:8px;top:8px;font-size:1.2em;">&times;</button>
        <h2>Sign Up or Log In</h2>
        <form id="auth-form">
          <label>Email<br/><input type="email" name="email" required style="width:100%"/></label><br/><br/>
          <label>Password<br/><input type="password" name="password" required style="width:100%"/></label><br/><br/>
          <button type="submit" id="register-btn">Register</button>
          <button type="button" id="login-btn">Login</button>
        </form>
        <div id="auth-message" style="color:green;margin-top:1em;display:none"></div>
        <div id="auth-error" style="color:red;margin-top:1em;display:none"></div>
      </div>
    `;
    document.body.appendChild(modal);
    return modal;
  }
  window.showAuthModal = function(onAuthenticated) {
    const modal = createModal();
    modal.style.display = 'flex';
    modal.querySelector('#close-auth-modal').onclick = () => { modal.style.display = 'none'; };
    const form = modal.querySelector('#auth-form');
    const registerBtn = modal.querySelector('#register-btn');
    const loginBtn = modal.querySelector('#login-btn');
    const errorDiv = modal.querySelector('#auth-error');
    const msgDiv = modal.querySelector('#auth-message');

    async function handleAuth(type) {
      errorDiv.style.display = 'none';
      msgDiv.style.display = 'none';
      const email = form.email.value;
      const password = form.password.value;
      try {
        let url, payload;
        if (type === 'register') {
          url = '/api/register';
          payload = { email, password };
        } else {
          url = '/api/login';
          payload = { email, password };
        }
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (type === 'register') {
          if (data.success) {
            msgDiv.textContent = "Registration successful. Please check your email to verify.";
            msgDiv.style.display = 'block';
          } else {
            throw new Error(data.error || 'Unknown error');
          }
        } else if (type === 'login') {
          if (!data.success) throw new Error(data.error || 'Unknown error');
          localStorage.setItem('tnfeeds_token', data.token);
          localStorage.setItem('tnfeeds_username', data.user.username);
          localStorage.setItem('tnfeeds_email', data.user.email);
          modal.style.display = 'none';
          onAuthenticated && onAuthenticated(data.user);
        }
      } catch (err) {
        errorDiv.textContent = err.message;
        errorDiv.style.display = 'block';
      }
    }

    registerBtn.onclick = e => { e.preventDefault(); handleAuth('register'); }
    loginBtn.onclick = e => { e.preventDefault(); handleAuth('login'); }
    form.onsubmit = e => { e.preventDefault(); }
  }
})();