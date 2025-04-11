// trending-contributors.js - Component to display top users based on points
(function() {
    /**
     * Fetch the top users by points
     * @param {number} limit - Maximum number of users to fetch
     * @returns {Promise<Array|null>} Array of top users or null if failed
     */
    async function fetchTopUsers(limit = 5) {
        try {
            const response = await fetch(`https://tennesseefeeds-api.onrender.com/api/users/top?limit=${limit}`);
            
            if (!response.ok) {
                throw new Error(`API responded with status ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                return result.users;
            } else {
                console.error('Failed to fetch top users:', result.error);
                return null;
            }
        } catch (error) {
            console.error('Error fetching top users:', error);
            return null;
        }
    }
    
    /**
     * Create and render the trending contributors component
     * @param {HTMLElement} targetElement - Element to render the component in
     * @param {number} limit - Maximum number of users to display
     */
    async function renderTrendingContributors(targetElement, limit = 5) {
        if (!targetElement) {
            console.error('Target element not found');
            return;
        }
        
        // Create the container
        const container = document.createElement('div');
        container.className = 'trending-contributors bg-white rounded-lg shadow-md overflow-hidden p-4 mb-8';
        
        // Add the header
        container.innerHTML = `
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-bold text-neutral-800">
                    <i class="fas fa-fire text-orange-500 mr-2"></i>Trending Contributors
                </h3>
                <span class="text-xs text-neutral-500">Based on comment quality</span>
            </div>
            <div id="contributors-list" class="contributors-list">
                <div class="flex justify-center py-4">
                    <div class="animate-spin h-6 w-6 border-2 border-neutral-300 border-t-neutral-600 rounded-full"></div>
                </div>
            </div>
        `;
        
        // Add the container to the target element
        targetElement.appendChild(container);
        
        // Fetch top users
        const users = await fetchTopUsers(limit);
        const contributorsList = container.querySelector('#contributors-list');
        
        if (!users || users.length === 0) {
            contributorsList.innerHTML = `
                <p class="text-neutral-500 text-center text-sm py-2">No contributors found yet.</p>
            `;
            return;
        }
        
        // Render the users
        contributorsList.innerHTML = '';
        
        users.forEach((user, index) => {
            const userElement = document.createElement('div');
            userElement.className = 'contributor flex items-center justify-between py-2 border-b border-neutral-100 last:border-b-0';
            
            // Generate a consistent avatar based on username
            const avatarColor = getAvatarColor(user.username);
            const initials = getInitials(user.username);
            
            userElement.innerHTML = `
                <div class="flex items-center">
                    <div class="user-rank text-sm font-bold text-neutral-400 w-6 text-center">${index + 1}</div>
                    <div class="avatar w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold mr-3" style="background-color: ${avatarColor}">
                        ${initials}
                    </div>
                    <div class="user-info">
                        <div class="username font-medium text-neutral-800">${user.username}</div>
                        <div class="text-xs text-neutral-500">
                            ${getContributorLevel(user.points)}
                        </div>
                    </div>
                </div>
                <div class="user-points px-3 py-1 bg-neutral-100 rounded-full text-xs font-bold text-neutral-700">
                    ${user.points} <span class="text-neutral-500">pts</span>
                </div>
            `;
            
            contributorsList.appendChild(userElement);
        });
    }
    
    /**
     * Get a consistent color based on username
     * @param {string} username - The username
     * @returns {string} A color in hex format
     */
    function getAvatarColor(username) {
        // Generate a simple hash from the username
        let hash = 0;
        for (let i = 0; i < username.length; i++) {
            hash = username.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        // List of pleasant colors
        const colors = [
            '#4299E1', // blue
            '#48BB78', // green
            '#ED8936', // orange
            '#9F7AEA', // purple
            '#F56565', // red
            '#667EEA', // indigo
            '#38B2AC', // teal
            '#ED64A6', // pink
            '#ECC94B', // yellow
            '#A3BFFA'  // light blue
        ];
        
        // Use the hash to pick a color
        const index = Math.abs(hash) % colors.length;
        return colors[index];
    }
    
    /**
     * Get the initials from a username
     * @param {string} username - The username
     * @returns {string} The initials (up to 2 characters)
     */
    function getInitials(username) {
        if (!username) return '?';
        
        // Handle anonymous users
        if (username.toLowerCase() === 'anonymous') {
            return 'A';
        }
        
        // Split by spaces and get first letter of each part
        const parts = username.split(/[\s_-]+/);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        
        // Just return the first 1-2 characters
        return username.substring(0, Math.min(2, username.length)).toUpperCase();
    }
    
    /**
     * Get a contributor level based on points
     * @param {number} points - The user's points
     * @returns {string} A descriptive level
     */
    function getContributorLevel(points) {
        if (points >= 100) return 'Tennessee Expert';
        if (points >= 50) return 'Power Contributor';
        if (points >= 25) return 'Active Contributor';
        if (points >= 10) return 'Regular Contributor';
        return 'New Contributor';
    }
    
    /**
     * Initialize the trending contributors component
     */
    function initTrendingContributors() {
        // Wait for the document to be fully loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', setupComponent);
        } else {
            setupComponent();
        }
        
        function setupComponent() {
            // Find a suitable place to add the component
            let targetElement;
            
            // Option 1: Find sidebar if it exists
            const sidebar = document.querySelector('.sidebar') || document.querySelector('.aside') || document.querySelector('[class*="sidebar"]');
            if (sidebar) {
                targetElement = sidebar;
            } else {
                // Option 2: Insert before the main content area
                const contentArea = document.getElementById('content-area');
                if (contentArea) {
                    targetElement = document.createElement('div');
                    targetElement.className = 'trending-sidebar md:w-1/4 px-4';
                    
                    // Create a flex container for content-area and sidebar
                    const container = document.createElement('div');
                    container.className = 'flex flex-wrap';
                    
                    // Move content-area into the container and adjust its width
                    contentArea.parentNode.insertBefore(container, contentArea);
                    container.appendChild(targetElement);
                    container.appendChild(contentArea);
                    
                    // Adjust content area width
                    contentArea.className = contentArea.className.replace('md:grid-cols-2', '');
                    contentArea.className = contentArea.className.replace('lg:grid-cols-3', '');
                    contentArea.className += ' md:w-3/4';
                } else {
                    // Option 3: Just add it to the main container
                    const mainContainer = document.querySelector('main .container');
                    if (mainContainer) {
                        targetElement = document.createElement('div');
                        targetElement.className = 'trending-container mb-8';
                        mainContainer.insertBefore(targetElement, mainContainer.firstChild);
                    }
                }
            }
            
            // Render the component if we found a target
            if (targetElement) {
                renderTrendingContributors(targetElement);
            }
        }
    }
    
    // Set up CSS styles for trending contributors
    function setupStyles() {
        const existingStyle = document.getElementById('trending-contributor-styles');
        
        if (existingStyle) {
            return;
        }
        
        const style = document.createElement('style');
        style.id = 'trending-contributor-styles';
        style.textContent = `
            .trending-contributors {
                border-top: 3px solid #F59E0B;
            }
            .contributor:hover {
                background-color: rgba(0, 0, 0, 0.01);
            }
            .user-points {
                transition: transform 0.2s;
            }
            .contributor:hover .user-points {
                transform: scale(1.05);
            }
        `;
        document.head.appendChild(style);
    }
    
    // Expose functions globally
    window.TrendingContributors = {
        init: initTrendingContributors,
        render: renderTrendingContributors,
        refresh: function(targetElement, limit) {
            if (targetElement) {
                targetElement.innerHTML = '';
                renderTrendingContributors(targetElement, limit);
            }
        }
    };
    
    // Initialize styles
    setupStyles();
    
    // Auto-initialize
    initTrendingContributors();
})();
