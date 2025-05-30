async function onChangeUsernameClick() {
  const user = await window.UserTracking.getUserProfile();
  if (user.is_anonymous) {
    window.showAuthModal(() => {
      showChangeUsernameForm();
    });
  } else {
    showChangeUsernameForm();
  }
}
function showChangeUsernameForm() {
  const newUsername = prompt('Enter your new username:', localStorage.getItem('tnfeeds_username') || 'Anonymous');
  if (newUsername && newUsername.trim()) {
    window.UserTracking.updateUsername(newUsername.trim());
  }
}
document.addEventListener('DOMContentLoaded', function() {
  const btn = document.getElementById('change-username-btn');
  if (btn) btn.onclick = onChangeUsernameClick;
});