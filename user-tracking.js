/**
 * TennesseeFeeds User Tracking System (Unified Version)
 * 
 * Supports anonymous fingerprint-based tracking and registered user flows.
 * Handles:
 *  - Identifying anonymous users with browser fingerprint and IP
 *  - Identifying registered users with JWT
 *  - Username change for both anonymous and authenticated users
 *  - Caching user info in localStorage and memory
 *  - Graceful fallback for all flows
 */
(function() {
    // --- Configuration ---
    const apiBaseUrl = 'https://tennesseefeeds-api.onrender.com/api';

    // --- Local session cache ---
    let currentUser = null;

    // --- JWT utilities ---
    function getJWT() {
        return localStorage.getItem('tnfeeds_token') || null;
    }
    function setJWT(token) {
        if (token) localStorage.setItem('tnfeeds_token', token);
    }
    function clearJWT() {
        localStorage.removeItem('tnfeeds_token');
    }

    // --- Fingerprint2 Loader (unchanged) ---
    async function ensureFingerprintLibrary() {
        return new Promise(resolve => {
            if (typeof Fingerprint2 !== 'undefined') {
                resolve(true);
                return;
            }
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/fingerprintjs2/2.1.4/fingerprint2.min.js';
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.head.appendChild(script);
        });
    }

    // --- Fingerprint Generation (unchanged) ---
    async function generateFingerprint() {
        return new Promise(async resolve => {
            const libraryLoaded = await ensureFingerprintLibrary();
            if (!libraryLoaded) {
                resolve(generateFallbackFingerprint());
                return;
            }
            setTimeout(() => {
                try {
                    Fingerprint2.get(components => {
                        const values = components.map(component => component.value);
                        const fingerprintHash = Fingerprint2.x64hash128(values.join(''), 31);
                        resolve(fingerprintHash);
                    });
                } catch (error) {
                    resolve(generateFallbackFingerprint());
                }
            }, 500);
        });
    }

    function generateFallbackFingerprint() {
        const userAgent = navigator.userAgent;
        const screenProps = `${screen.width}x${screen.height}x${screen.colorDepth}`;
        const timeZone = new Date().getTimezoneOffset();
        const language = navigator.language || '';
        const plugins = Array.from(navigator.plugins || []).map(p => p.name).join(',');
        const str = userAgent + screenProps + timeZone + language + plugins;
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16).padStart(16, '0');
    }

    // --- VPN/Proxy Detection (basic: returns IP, for future heuristics) ---
    async function getIpAddress() {
        try {
            const response = await fetch('https://api.ipify.org?format=json', { method: 'GET' });
            if (!response.ok) throw new Error('Failed to get IP');
            const data = await response.json();
            return data.ip;
        } catch {
            return null;
        }
    }

    // --- User Identification: Registered (JWT) or Anonymous (Fingerprint) ---
    async function identifyUser() {
        // If already cached for this session
        if (currentUser) return currentUser;

        const jwt = getJWT();
        if (jwt) {
            // Try to get user profile from backend using JWT
            try {
                const response = await fetch(`${apiBaseUrl}/me`, {
                    headers: { 'Authorization': `Bearer ${jwt}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    // Save to localStorage for fallback
                    localStorage.setItem('tnfeeds_user_id', data.id);
                    localStorage.setItem('tnfeeds_username', data.username);
                    localStorage.setItem('tnfeeds_email', data.email);
                    currentUser = {
                        id: data.id,
                        username: data.username,
                        email: data.email,
                        is_anonymous: false,
                        is_email_verified: data.is_email_verified
                    };
                    return currentUser;
                } else {
                    // JWT may be expired/invalid
                    clearJWT();
                }
            } catch {
                // Network error, fallback below
            }
        }
        // Fallback: anonymous user (fingerprint)
        const fingerprint = await generateFingerprint();
        const storedUserId = localStorage.getItem('tnfeeds_user_id') || ('anon-' + fingerprint.substring(0, 8));
        const storedUsername = localStorage.getItem('tnfeeds_username') || 'Anonymous';
        currentUser = {
            id: storedUserId,
            username: storedUsername,
            is_anonymous: true,
            fingerprint
        };
        // Optionally, you can ping your backend for further fingerprint/IP intelligence here
        return currentUser;
    }

    // --- Username Update: Registered (JWT-protected) or Anonymous (local + best-effort API) ---
    async function updateUsername(newUsername) {
        newUsername = (newUsername || '').trim().substring(0, 30);
        if (!newUsername) return false;

        const user = await identifyUser();
        // Authenticated/verified user: use secure API
        if (!user.is_anonymous && getJWT()) {
            try {
                const response = await fetch(`${apiBaseUrl}/update-username`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${getJWT()}`
                    },
                    body: JSON.stringify({ username: newUsername })
                });
                const result = await response.json();
                if (response.ok && result.success) {
                    localStorage.setItem('tnfeeds_username', newUsername);
                    currentUser.username = newUsername;
                    updateUsernameDisplays(newUsername);
                    return true;
                }
                alert(result.error || "Username update failed.");
                return false;
            } catch (err) {
                alert("Network error updating username.");
                return false;
            }
        } else {
            // Anonymous: try best-effort backend sync and always update locally
            try {
                await fetch(`${apiBaseUrl}/update-username`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: user.id,
                        username: newUsername
                    })
                });
            } catch {}
            localStorage.setItem('tnfeeds_username', newUsername);
            currentUser.username = newUsername;
            updateUsernameDisplays(newUsername);
            return true;
        }
    }

    // --- Utility: Update username anywhere on the site (if you use .username-display) ---
    function updateUsernameDisplays(username) {
        document.querySelectorAll('.username-display, .mobile-username-display').forEach(el => {
            el.textContent = username;
        });
    }

    // --- Expose public API ---
    window.UserTracking = {
        getUserProfile: identifyUser,
        updateUsername,
        // (Optionally: trackComment, trackReaction, trackShare, getReactionCounts, etc.)
    };

    // --- On page load: update UI with stored username and pre-identify user ---
    document.addEventListener('DOMContentLoaded', function() {
        const storedUsername = localStorage.getItem('tnfeeds_username') || 'Anonymous';
        updateUsernameDisplays(storedUsername);
        setTimeout(() => {
            identifyUser().then(user => {
                updateUsernameDisplays(user.username);
            });
        }, 500);
    });
})();
