/**
 * TennesseeFeeds User Tracking System (Fixed Version)
 * 
 * This script handles user identification and tracking of user actions
 * including comments, reactions, and shares. Uses browser fingerprinting
 * to identify users without requiring login.
 */
(function() {
    // Configuration
    const apiBaseUrl = 'https://tennesseefeeds-api.onrender.com/api';
    
    // Cache for the current user
    let currentUser = null;
    
    /**
     * Check if the Fingerprint2 library is available or load it dynamically
     * @returns {Promise<boolean>} Whether the library is available
     */
    async function ensureFingerprintLibrary() {
        return new Promise(resolve => {
            // If Fingerprint2 is already available, we're good
            if (typeof Fingerprint2 !== 'undefined') {
                console.log('Fingerprint2 library already loaded');
                resolve(true);
                return;
            }
            
            console.log('Loading Fingerprint2 library dynamically');
            
            // Create script element to load the library
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/fingerprintjs@2.1.4/dist/fingerprint2.min.js';
            script.onload = function() {
                console.log('Fingerprint2 library loaded successfully');
                resolve(true);
            };
            script.onerror = function() {
                console.error('Failed to load Fingerprint2 library');
                resolve(false);
            };
            
            // Add the script to the document
            document.head.appendChild(script);
        });
    }
    
    /**
     * Generate a browser fingerprint using Fingerprint2
     * @returns {Promise<string|null>} The fingerprint hash or null if failed
     */
    async function generateFingerprint() {
        return new Promise(async resolve => {
            // Ensure the library is loaded
            const libraryLoaded = await ensureFingerprintLibrary();
            
            if (!libraryLoaded) {
                console.error('Fingerprint2 library not available');
                resolve(generateFallbackFingerprint());
                return;
            }
            
            // Use a setTimeout to ensure the fingerprinting happens after page load
            setTimeout(() => {
                try {
                    Fingerprint2.get(components => {
                        const values = components.map(component => component.value);
                        const fingerprintHash = Fingerprint2.x64hash128(values.join(''), 31);
                        console.log('Fingerprint generated successfully');
                        resolve(fingerprintHash);
                    });
                } catch (error) {
                    console.error('Error generating fingerprint:', error);
                    resolve(generateFallbackFingerprint());
                }
            }, 500);
        });
    }
    
    /**
     * Generate a fallback fingerprint if Fingerprint2 fails
     * This is less reliable but better than nothing
     * @returns {string} A simple fallback fingerprint
     */
    function generateFallbackFingerprint() {
        console.log('Using fallback fingerprint generation');
        const userAgent = navigator.userAgent;
        const screenProps = `${screen.width}x${screen.height}x${screen.colorDepth}`;
        const timeZone = new Date().getTimezoneOffset();
        const language = navigator.language || '';
        const plugins = Array.from(navigator.plugins || []).map(p => p.name).join(',');
        
        // Create a simple hash from these values
        const str = userAgent + screenProps + timeZone + language + plugins;
        let hash = 0;
        
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        
        // Convert to a positive hex string
        const positiveHash = Math.abs(hash).toString(16);
        return positiveHash.padStart(16, '0');
    }
    
    /**
     * Get the user's IP address
     * @returns {Promise<string|null>} The IP address or null if failed
     */
    async function getIpAddress() {
        try {
            const response = await fetch('https://api.ipify.org?format=json', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
                mode: 'cors',
                cache: 'default',
                timeout: 5000
            });
            
            if (!response.ok) {
                throw new Error(`Failed to get IP: ${response.status}`);
            }
            
            const data = await response.json();
            return data.ip;
        } catch (error) {
            console.error('Error getting IP address:', error);
            return null;
        }
    }
    
    /**
     * Identify or create a user based on fingerprint and stored ID
     * @returns {Promise<Object|null>} User object or null if failed
     */
    async function identifyUser() {
        // If we already identified the user in this session, return cached data
        if (currentUser) {
            return currentUser;
        }
        
        try {
            // First generate fingerprint
            const fingerprint = await generateFingerprint();
            if (!fingerprint) {
                console.error('Could not generate fingerprint');
                
                // Use a simple anonymous user as fallback
                const fallbackUser = {
                    id: 'anonymous-' + Math.random().toString(36).substring(2, 10),
                    username: localStorage.getItem('tnfeeds_username') || 'Anonymous',
                    fingerprint: 'fallback-fingerprint'
                };
                
                // Cache the fallback user
                currentUser = fallbackUser;
                return fallbackUser;
            }
            
            // Get stored user ID if available
            const storedUserId = localStorage.getItem('tnfeeds_user_id');
            const storedUsername = localStorage.getItem('tnfeeds_username') || 'Anonymous';
            
            // Get additional data for tracking
            const ipAddress = await getIpAddress();
            const userAgent = navigator.userAgent;
            
            // Try to identify user on the server
            try {
                const response = await fetch(`${apiBaseUrl}/identify-user`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        userId: storedUserId,
                        username: storedUsername,
                        fingerprint: fingerprint,
                        ipAddress: ipAddress || '0.0.0.0',
                        userAgent: userAgent
                    })
                });
                
                if (!response.ok) {
                    throw new Error(`Server responded with status ${response.status}`);
                }
                
                const result = await response.json();
                
                if (result.success) {
                    // Save user data
                    localStorage.setItem('tnfeeds_user_id', result.user.id);
                    localStorage.setItem('tnfeeds_username', result.user.username);
                    
                    // Cache the user for this session
                    currentUser = {
                        id: result.user.id,
                        username: result.user.username,
                        fingerprint: fingerprint
                    };
                    
                    console.log('User identified:', currentUser.username);
                    return currentUser;
                } else {
                    console.error('Failed to identify user:', result.error);
                    
                    // Fallback to local user identification if server fails
                    throw new Error('Server identification failed');
                }
            } catch (serverError) {
                console.error('Server error in user identification:', serverError);
                
                // Fallback: create a local user if server API is unreachable
                const localUser = {
                    id: storedUserId || 'local-' + fingerprint.substring(0, 8),
                    username: storedUsername,
                    fingerprint: fingerprint
                };
                
                // Save user data locally
                localStorage.setItem('tnfeeds_user_id', localUser.id);
                localStorage.setItem('tnfeeds_username', localUser.username);
                
                // Cache the user for this session
                currentUser = localUser;
                
                console.log('Using local user identification:', localUser.username);
                return localUser;
            }
        } catch (error) {
            console.error('Error identifying user:', error);
            
            // Create an anonymous user as last resort
            const anonymousUser = {
                id: 'anonymous-' + Math.random().toString(36).substring(2, 10),
                username: localStorage.getItem('tnfeeds_username') || 'Anonymous',
                fingerprint: 'error-fingerprint'
            };
            
            // Cache the anonymous user
            currentUser = anonymousUser;
            return anonymousUser;
        }
    }
    
    /**
     * Track a user comment on an article
     * @param {string} articleId - The article ID
     * @param {string} content - The comment text
     * @returns {Promise<boolean>} Success status
     */
    async function trackComment(articleId, content) {
        if (!articleId || !content) {
            console.error('Missing required parameters for trackComment');
            return false;
        }
        
        // Initialize or get the user
        const user = await identifyUser();
        if (!user) {
            console.error('Cannot track comment: User not identified');
            return false;
        }
        
        try {
            // Use the existing comment endpoint with additional user data
            const response = await fetch(`${apiBaseUrl}/comments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    articleId: articleId,
                    userName: user.username,
                    userId: user.id,
                    fingerprint: user.fingerprint,
                    comment: content
                })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Server error (${response.status}):`, errorText);
                throw new Error(`Server responded with status ${response.status}`);
            }
            
            const result = await response.json();
            return result.success;
        } catch (error) {
            console.error('Error tracking comment:', error);
            
            // Fallback: store comment locally if server is unavailable
            try {
                const localComments = JSON.parse(localStorage.getItem('tnfeeds_comments') || '{}');
                
                if (!localComments[articleId]) {
                    localComments[articleId] = [];
                }
                
                localComments[articleId].push({
                    id: 'local-' + Date.now(),
                    userName: user.username,
                    comment: content,
                    timestamp: new Date().toISOString(),
                    local: true
                });
                
                localStorage.setItem('tnfeeds_comments', JSON.stringify(localComments));
                console.log('Comment saved locally');
                return true;
            } catch (localError) {
                console.error('Error saving comment locally:', localError);
                return false;
            }
        }
    }
    
    /**
     * Track a user reaction (like/dislike) on an article
     * @param {string} articleId - The article ID
     * @param {string} type - The reaction type ('like' or 'dislike')
     * @returns {Promise<Object|boolean>} Reaction result or false if failed
     */
    async function trackReaction(articleId, type) {
        if (!articleId || !type) {
            console.error('Missing required parameters for trackReaction');
            return false;
        }
        
        // Initialize or get the user
        const user = await identifyUser();
        if (!user) {
            console.error('Cannot track reaction: User not identified');
            return {
                success: false,
                likes: 0,
                dislikes: 0,
                error: 'User not identified'
            };
        }
        
        try {
            console.log('Tracking reaction:', {
                articleId: articleId,
                userId: user.id,
                fingerprint: user.fingerprint,
                type: type
            });
            
            // Call the reaction endpoint
            const response = await fetch(`${apiBaseUrl}/reaction`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    articleId: articleId,
                    userId: user.id,
                    fingerprint: user.fingerprint, 
                    type: type
                })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Server error (${response.status}):`, errorText);
                throw new Error(`Server responded with status ${response.status}`);
            }
            
            const result = await response.json();
            console.log('Reaction result:', result);
            return result.success ? result : false;
        } catch (error) {
            console.error('Error tracking reaction:', error);
            
            // Fallback: handle reaction locally if server is unavailable
            try {
                const localReactions = JSON.parse(localStorage.getItem('tnfeeds_reactions') || '{}');
                
                if (!localReactions[articleId]) {
                    localReactions[articleId] = { likes: 0, dislikes: 0, userReaction: null };
                }
                
                const currentData = localReactions[articleId];
                
                // Handle user changing their reaction
                if (currentData.userReaction === type) {
                    // User is removing their reaction
                    currentData[type + 's'] = Math.max(0, currentData[type + 's'] - 1);
                    currentData.userReaction = null;
                } else if (currentData.userReaction) {
                    // User is changing their reaction from one type to another
                    const oppositeType = type === 'like' ? 'dislike' : 'like';
                    currentData[oppositeType + 's'] = Math.max(0, currentData[oppositeType + 's'] - 1);
                    currentData[type + 's']++;
                    currentData.userReaction = type;
                } else {
                    // New reaction
                    currentData[type + 's']++;
                    currentData.userReaction = type;
                }
                
                // Save updated reactions
                localStorage.setItem('tnfeeds_reactions', JSON.stringify(localReactions));
                console.log('Reaction saved locally:', currentData);
                
                return {
                    success: true,
                    action: 'local',
                    type: type,
                    likes: currentData.likes,
                    dislikes: currentData.dislikes
                };
            } catch (localError) {
                console.error('Error saving reaction locally:', localError);
                return false;
            }
        }
    }
    
    /**
     * Get reaction counts for an article
     * @param {string} articleId - The article ID
     * @returns {Promise<Object>} Object with likes and dislikes counts
     */
    async function getReactionCounts(articleId) {
        if (!articleId) {
            console.error('Missing article ID for getReactionCounts');
            return { likes: 0, dislikes: 0 };
        }
        
        try {
            const response = await fetch(`${apiBaseUrl}/reactions/${articleId}`);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Server error (${response.status}):`, errorText);
                throw new Error(`Server responded with status ${response.status}`);
            }
            
            const result = await response.json();
            console.log('Reaction counts response:', result);
            
            if (result.success) {
                return {
                    likes: result.likes || 0,
                    dislikes: result.dislikes || 0
                };
            }
            
            throw new Error('Invalid response from server');
        } catch (error) {
            console.error('Error getting reaction counts:', error);
            
            // Fallback: check for local reactions
            try {
                const localReactions = JSON.parse(localStorage.getItem('tnfeeds_reactions') || '{}');
                
                if (localReactions[articleId]) {
                    return {
                        likes: localReactions[articleId].likes || 0,
                        dislikes: localReactions[articleId].dislikes || 0
                    };
                }
                
                return { likes: 0, dislikes: 0 };
            } catch (localError) {
                console.error('Error getting local reaction counts:', localError);
                return { likes: 0, dislikes: 0 };
            }
        }
    }
    
    /**
     * Generate a short unique ID for sharing
     * @param {number} length - The desired length of the ID
     * @returns {string} The generated ID
     */
    function generateShareId(length = 8) {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return result;
    }
    
    /**
     * Track a user share of an article
     * @param {string} articleId - The article ID
     * @param {string} platform - The platform shared to (optional)
     * @returns {Promise<string|null>} The share URL or null if failed
     */
    async function trackShare(articleId, platform) {
        if (!articleId) {
            console.error('Missing article ID for trackShare');
            return null;
        }
        
        // Initialize or get the user
        const user = await identifyUser();
        if (!user) {
            console.error('Cannot track share: User not identified');
            return null;
        }
        
        try {
            // Generate a share ID
            const shareId = generateShareId();
            
            // Call the share tracking endpoint
            const response = await fetch(`${apiBaseUrl}/track-share`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    articleId: articleId,
                    userId: user.id,
                    shareId: shareId,
                    platform: platform || null
                })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Server error (${response.status}):`, errorText);
                throw new Error(`Server responded with status ${response.status}`);
            }
            
            const result = await response.json();
            return result.success ? result.shareUrl : null;
        } catch (error) {
            console.error('Error tracking share:', error);
            
            // Fallback: create local share URL if server is unavailable
            const localShareId = generateShareId();
            const hostname = window.location.hostname;
            const protocol = window.location.protocol;
            
            return `${protocol}//${hostname}/#article=${encodeURIComponent(articleId)}`;
        }
    }
    
    /**
     * Get the current user's profile
     * @returns {Promise<Object|null>} User profile or null if not identified
     */
    async function getUserProfile() {
        const user = await identifyUser();
        return user;
    }
    
    /**
     * Update the user's username
     * @param {string} newUsername - The new username
     * @returns {Promise<boolean>} Success status
     */
    async function updateUsername(newUsername) {
        if (!newUsername || typeof newUsername !== 'string') {
            console.error('Invalid username provided');
            return false;
        }
        
        // Sanitize username
        newUsername = newUsername.trim().substring(0, 30);
        
        if (newUsername === '') {
            console.error('Username cannot be empty');
            return false;
        }
        
        // Initialize or get the user
        const user = await identifyUser();
        if (!user) {
            return false;
        }
        
        try {
            // Call the update username endpoint
            const response = await fetch(`${apiBaseUrl}/update-username`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: user.id,
                    username: newUsername
                })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Server error (${response.status}):`, errorText);
                throw new Error(`Server responded with status ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                // Update local storage and current user
                localStorage.setItem('tnfeeds_username', newUsername);
                
                if (currentUser) {
                    currentUser.username = newUsername;
                }
                
                // Update UI elements with the username
                updateUsernameDisplays(newUsername);
                
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Error updating username:', error);
            
            // Fallback: update username locally if server is unavailable
            localStorage.setItem('tnfeeds_username', newUsername);
            
            if (currentUser) {
                currentUser.username = newUsername;
            }
            
            // Update UI elements with the username
            updateUsernameDisplays(newUsername);
            
            return true;
        }
    }
    
    /**
     * Update all username displays in the UI
     * @param {string} username - The username to display
     */
    function updateUsernameDisplays(username) {
        // Update desktop username display
        const usernameDisplays = document.querySelectorAll('.username-display');
        usernameDisplays.forEach(element => {
            element.textContent = username;
        });
        
        // Update mobile username display
        const mobileUsernameDisplays = document.querySelectorAll('.mobile-username-display');
        mobileUsernameDisplays.forEach(element => {
            element.textContent = username;
        });
    }
    
    // Expose the methods globally
    window.UserTracking = {
        getUserProfile,
        trackComment,
        trackReaction,
        trackShare,
        getReactionCounts,
        updateUsername
    };
    
    // Initialize on page load
    document.addEventListener('DOMContentLoaded', function() {
        // Update username displays on load
        const storedUsername = localStorage.getItem('tnfeeds_username') || 'Anonymous';
        updateUsernameDisplays(storedUsername);
        
        // Pre-identify the user to improve perceived performance
        setTimeout(() => {
            identifyUser().then(user => {
                if (user) {
                    console.log('User pre-identified as:', user.username);
                    
                    // Make sure UI is updated
                    updateUsernameDisplays(user.username);
                    
                    // Show user profile section
                    const userProfile = document.getElementById('user-profile');
                    if (userProfile) {
                        userProfile.classList.remove('hidden');
                    }
                }
            }).catch(error => {
                console.error('Error in pre-identification:', error);
            });
        }, 1000);
    });
})();
