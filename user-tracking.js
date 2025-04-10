/**
 * TennesseeFeeds User Tracking System
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
     * Generate a browser fingerprint using Fingerprint2
     * @returns {Promise<string|null>} The fingerprint hash or null if failed
     */
    async function generateFingerprint() {
        return new Promise(resolve => {
            if (typeof Fingerprint2 === 'undefined') {
                console.error('Fingerprint2 library not loaded');
                resolve(null);
                return;
            }
            
            // Use a setTimeout to ensure the fingerprinting happens after page load
            setTimeout(() => {
                Fingerprint2.get(components => {
                    const values = components.map(component => component.value);
                    const fingerprintHash = Fingerprint2.x64hash128(values.join(''), 31);
                    resolve(fingerprintHash);
                });
            }, 500);
        });
    }
    
    /**
     * Get the user's IP address
     * @returns {Promise<string|null>} The IP address or null if failed
     */
    async function getIpAddress() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
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
                return null;
            }
            
            // Get stored user ID if available
            const storedUserId = localStorage.getItem('tnfeeds_user_id');
            const storedUsername = localStorage.getItem('tnfeeds_username') || 'Anonymous';
            
            // Get additional data for tracking
            const ipAddress = await getIpAddress();
            const userAgent = navigator.userAgent;
            
            // Make a request to identify or create user
            const response = await fetch(`${apiBaseUrl}/identify-user`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: storedUserId,
                    username: storedUsername,
                    fingerprint: fingerprint,
                    ipAddress: ipAddress,
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
                return null;
            }
        } catch (error) {
            console.error('Error identifying user:', error);
            return null;
        }
    }
    
    /**
     * Track a user comment on an article
     * @param {string} articleId - The article ID
     * @param {string} content - The comment text
     * @returns {Promise<boolean>} Success status
     */
    async function trackComment(articleId, content) {
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
                throw new Error(`Server responded with status ${response.status}`);
            }
            
            const result = await response.json();
            return result.success;
        } catch (error) {
            console.error('Error tracking comment:', error);
            return false;
        }
    }
    
    /**
     * Track a user reaction (like/dislike) on an article
     * @param {string} articleId - The article ID
     * @param {string} type - The reaction type ('like' or 'dislike')
     * @returns {Promise<Object|boolean>} Reaction result or false if failed
     */
    async function trackReaction(articleId, type) {
        // Initialize or get the user
        const user = await identifyUser();
        if (!user) {
            console.error('Cannot track reaction: User not identified');
            return false;
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
            
            // Make sure we handle both the new 'reaction_type' field and legacy 'type' field
            if (result.success && result.reaction_type && !result.type) {
                result.type = result.reaction_type;
            }
            
            return result.success ? result : false;
        } catch (error) {
            console.error('Error tracking reaction:', error);
            return false;
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
                throw new Error(`Server responded with status ${response.status}`);
            }
            
            const result = await response.json();
            return result.success ? result.shareUrl : null;
        } catch (error) {
            console.error('Error tracking share:', error);
            return null;
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
                throw new Error(`Server responded with status ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                localStorage.setItem('tnfeeds_username', newUsername);
                currentUser.username = newUsername;
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Error updating username:', error);
            return false;
        }
    }
    
    /**
     * Get reaction counts for an article
     * @param {string} articleId - The article ID
     * @returns {Promise<Object>} Object with likes and dislikes counts
     */
    async function getReactionCounts(articleId) {
        try {
            const response = await fetch(`${apiBaseUrl}/reactions/${articleId}`);
            
            if (!response.ok) {
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
            
            return { likes: 0, dislikes: 0 };
        } catch (error) {
            console.error('Error getting reaction counts:', error);
            return { likes: 0, dislikes: 0 };
        }
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
        // Pre-identify the user to improve perceived performance
        setTimeout(() => identifyUser(), 1000);
    });
})();
