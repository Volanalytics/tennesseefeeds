// share-fix.js - Fix for inconsistent share URLs on TennesseeFeeds
(function() {
    // Debug mode - set to true to see console logs
    const DEBUG = true;

    /**
     * Debug logging function
     * @param {...any} args - Arguments to log
     */
    function debugLog(...args) {
        if (DEBUG) {
            console.log('[ShareFix]', ...args);
        }
    }

    debugLog('Share fix script loaded');

    /**
     * Generate a consistent article ID from any URL or article ID
     * @param {string} input - URL or article ID
     * @returns {string} Consistent article ID
     */
    function generateConsistentArticleId(input) {
        if (!input) {
            debugLog('No input provided to generateConsistentArticleId');
            return 'unknown-article';
        }

        debugLog('Generating consistent ID from:', input);

        // If input is already a valid article ID format (not a URL)
        if (!input.includes('://') && !input.includes('/')) {
            debugLog('Input appears to be an ID already:', input);
            return input;
        }

        // Extract article ID from URL parameter if present
        if (input.includes('article=')) {
            try {
                const articleParam = input.split('article=')[1].split('&')[0];
                debugLog('Extracted article ID from parameter:', articleParam);
                return articleParam;
            } catch (e) {
                debugLog('Error extracting article parameter:', e);
            }
        }

        // Otherwise, generate a consistent hash from the URL
        try {
            // Remove protocol, query parameters, and hash
            const cleanUrl = input.replace(/^https?:\/\//, '')
                .split('?')[0]
                .split('#')[0];
            
            // Get the last path segment if it exists
            const segments = cleanUrl.split('/').filter(s => s.trim() !== '');
            if (segments.length > 0) {
                const lastSegment = segments[segments.length - 1];
                debugLog('Using last URL segment as ID:', lastSegment);
                return lastSegment;
            }
        } catch (e) {
            debugLog('Error processing URL:', e);
        }
        
        // Fallback: Simple hash of the input
        let hash = 0;
        for (let i = 0; i < input.length; i++) {
            hash = ((hash << 5) - hash) + input.charCodeAt(i);
            hash = hash & hash; // Convert to 32bit integer
        }
        const fallbackId = 'article-' + Math.abs(hash).toString(36).substring(0, 8);
        debugLog('Using fallback hash ID:', fallbackId);
        return fallbackId;
    }

    /**
     * Enhanced trackShare function that ensures consistent article IDs
     * @param {string} articleIdOrUrl - Article ID or URL
     * @param {string} title - Article title (optional)
     * @param {string} platform - Sharing platform (optional)
     * @returns {Promise<string|null>} Share URL or null if failed
     */
    async function trackShare(articleIdOrUrl, title = null, platform = 'web') {
        debugLog('trackShare called with ID:', articleIdOrUrl);
        
        // Ensure we have a consistent article ID
        const consistentArticleId = generateConsistentArticleId(articleIdOrUrl);
        debugLog('Consistent article ID:', consistentArticleId);
        
        // Find article metadata
        const article = findArticleMetadata(consistentArticleId, title);
        debugLog('Article metadata:', article);
        
        // Track share through API call or UserTracking if available
        if (window.UserTracking && window.UserTracking.trackShare) {
            try {
                debugLog('Using UserTracking.trackShare');
                const shareUrl = await window.UserTracking.trackShare(
                    consistentArticleId,
                    platform,
                    {
                        title: article.title,
                        description: article.description,
                        source: article.source,
                        url: article.url,
                        image: article.image
                    }
                );
                
                if (shareUrl) {
                    debugLog('Share URL from UserTracking:', shareUrl);
                    return shareUrl;
                }
            } catch (error) {
                console.error('Error using UserTracking.trackShare:', error);
            }
        }
        
        // Fallback to direct API call
        try {
            debugLog('Making direct API call to track-share');
            const response = await fetch('https://tennesseefeeds-api.onrender.com/api/track-share', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    articleId: consistentArticleId,
                    title: article.title,
                    description: article.description,
                    source: article.source,
                    url: article.url,
                    image: article.image,
                    platform: platform
                })
            });
            
            const data = await response.json();
            
            if (data.success && data.shareUrl) {
                debugLog('Share URL from API:', data.shareUrl);
                return data.shareUrl;
            } else {
                console.error('API call succeeded but returned error:', data);
                return null;
            }
        } catch (error) {
            console.error('Error making direct API call:', error);
            
            // Last resort fallback
            const fallbackShareUrl = `https://tennesseefeeds.com/?article=${encodeURIComponent(consistentArticleId)}`;
            debugLog('Using fallback share URL:', fallbackShareUrl);
            return fallbackShareUrl;
        }
    }

    /**
     * Find article metadata from the DOM
     * @param {string} articleId - Article ID to look for
     * @param {string} fallbackTitle - Fallback title if not found
     * @returns {Object} Article metadata
     */
    function findArticleMetadata(articleId, fallbackTitle = null) {
        debugLog('Looking for article metadata for ID:', articleId);
        
        // Start with default values
        const article = {
            id: articleId,
            title: fallbackTitle || 'Shared Article',
            description: '',
            source: 'TennesseeFeeds',
            url: window.location.href,
            image: ''
        };
        
        try {
            // Try to find article element in the DOM
            const articleElements = document.querySelectorAll(`[data-article-id="${articleId}"]`);
            
            // If not found by ID, look for article elements with links containing the ID
            if (articleElements.length === 0) {
                const allArticleElements = document.querySelectorAll('.article-card, .bg-white');
                for (const element of allArticleElements) {
                    const link = element.querySelector('a[href]');
                    if (link && link.getAttribute('href').includes(articleId)) {
                        articleElements.push(element);
                        break;
                    }
                }
            }
            
            // If we found matching elements, extract metadata
            if (articleElements.length > 0) {
                const articleElement = articleElements[0].closest('.article-card, .bg-white');
                
                if (articleElement) {
                    // Extract title
                    const titleElement = articleElement.querySelector('h1, h2, h3, .text-xl, .text-2xl, .text-3xl');
                    if (titleElement) {
                        article.title = titleElement.textContent.trim();
                    }
                    
                    // Extract description
                    const descElement = articleElement.querySelector('p.text-neutral-600, p.line-clamp-3, .description');
                    if (descElement) {
                        article.description = descElement.textContent.trim();
                    }
                    
                    // Extract source
                    const sourceElement = articleElement.querySelector('.text-sm.text-neutral-500, .source');
                    if (sourceElement) {
                        article.source = sourceElement.textContent.trim();
                    }
                    
                    // Extract URL
                    const linkElement = articleElement.querySelector('a[href]');
                    if (linkElement && linkElement.getAttribute('href') !== '#') {
                        article.url = linkElement.getAttribute('href');
                    }
                    
                    // Extract image
                    const imageElement = articleElement.querySelector('img');
                    if (imageElement && imageElement.getAttribute('src')) {
                        article.image = imageElement.getAttribute('src');
                    }
                }
            }
            
            // For article view page, try to get from meta tags
            if (window.location.href.includes('?article=')) {
                const metaTitle = document.querySelector('meta[property="og:title"]');
                const metaDesc = document.querySelector('meta[property="og:description"]');
                const metaImage = document.querySelector('meta[property="og:image"]');
                
                if (metaTitle) article.title = metaTitle.getAttribute('content');
                if (metaDesc) article.description = metaDesc.getAttribute('content');
                if (metaImage) article.image = metaImage.getAttribute('content');
            }
            
            // If we're in the article view
            const articleViewContainer = document.getElementById('single-article-view');
            if (articleViewContainer && articleViewContainer.style.display !== 'none') {
                const viewTitle = articleViewContainer.querySelector('h1');
                const viewDesc = articleViewContainer.querySelector('.prose p');
                const viewImage = articleViewContainer.querySelector('img');
                const viewSource = articleViewContainer.querySelector('.source');
                const viewLink = articleViewContainer.querySelector('a[target="_blank"]');
                
                if (viewTitle) article.title = viewTitle.textContent.trim();
                if (viewDesc) article.description = viewDesc.textContent.trim();
                if (viewImage) article.image = viewImage.getAttribute('src');
                if (viewSource) article.source = viewSource.textContent.trim();
                if (viewLink) article.url = viewLink.getAttribute('href');
            }
        } catch (error) {
            console.error('Error finding article metadata:', error);
        }
        
        return article;
    }

    /**
     * Share handler function - displays share UI with the correct URL
     * @param {string} articleIdOrUrl - Article ID or URL
     * @param {string} title - Article title (optional)
     */
    async function shareHandler(articleIdOrUrl, title = null) {
        debugLog('shareHandler called for:', articleIdOrUrl);
        
        // Show loading state
        showShareLoading();
        
        // Get the share URL
        const shareUrl = await trackShare(articleIdOrUrl, title);
        
        if (shareUrl) {
            // Show share modal
            showShareModal(shareUrl, title);
        } else {
            // Fallback to clipboard copy
            const fallbackUrl = `https://tennesseefeeds.com/?article=${encodeURIComponent(articleIdOrUrl)}`;
            navigator.clipboard.writeText(fallbackUrl)
                .then(() => {
                    alert('Share link copied to clipboard (fallback URL)');
                })
                .catch(() => {
                    alert('Failed to generate share link. Please try again.');
                });
        }
    }

    /**
     * Show loading state for share modal
     */
    function showShareLoading() {
        let loadingModal = document.getElementById('share-loading-modal');
        
        if (!loadingModal) {
            loadingModal = document.createElement('div');
            loadingModal.id = 'share-loading-modal';
            loadingModal.className = 'fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50';
            loadingModal.innerHTML = `
                <div class="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-bold">Generating Share Link</h3>
                    </div>
                    <div class="text-center py-4">
                        <div class="inline-block animate-spin h-8 w-8 border-4 border-neutral-300 border-t-neutral-600 rounded-full"></div>
                        <p class="mt-2 text-neutral-600">Creating your share link...</p>
                    </div>
                </div>
            `;
            document.body.appendChild(loadingModal);
        } else {
            loadingModal.style.display = 'flex';
        }
    }

    /**
     * Hide loading state for share modal
     */
    function hideShareLoading() {
        const loadingModal = document.getElementById('share-loading-modal');
        if (loadingModal) {
            loadingModal.style.display = 'none';
        }
    }

    /**
     * Show share modal with the provided share URL
     * @param {string} shareUrl - URL to share
     * @param {string} title - Article title (optional)
     */
    function showShareModal(shareUrl, title = 'Article') {
        hideShareLoading();
        
        let shareModal = document.getElementById('share-modal');
        if (!shareModal) {
            shareModal = document.createElement('div');
            shareModal.id = 'share-modal';
            shareModal.className = 'fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50';
            shareModal.innerHTML = `
                <div class="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-bold">Share Article</h3>
                        <button id="close-share-modal" class="text-neutral-500 hover:text-neutral-800">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="mb-4">
                        <input id="share-url" type="text" class="w-full px-3 py-2 border rounded-md" readonly>
                    </div>
                    <div class="flex flex-wrap justify-center gap-4 mb-4">
                        <a href="#" id="share-facebook" class="share-social-btn bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                            <i class="fab fa-facebook-f mr-2"></i>Facebook
                        </a>
                        <a href="#" id="share-twitter" class="share-social-btn bg-blue-400 text-white px-4 py-2 rounded-md hover:bg-blue-500">
                            <i class="fab fa-twitter mr-2"></i>Twitter
                        </a>
                        <a href="#" id="share-linkedin" class="share-social-btn bg-blue-700 text-white px-4 py-2 rounded-md hover:bg-blue-800">
                            <i class="fab fa-linkedin-in mr-2"></i>LinkedIn
                        </a>
                        <a href="#" id="share-email" class="share-social-btn bg-neutral-600 text-white px-4 py-2 rounded-md hover:bg-neutral-700">
                            <i class="fas fa-envelope mr-2"></i>Email
                        </a>
                    </div>
                    <button id="copy-share-url" class="w-full bg-neutral-700 text-white px-4 py-2 rounded-md hover:bg-neutral-600">
                        <i class="fas fa-copy mr-2"></i>Copy Link
                    </button>
                </div>
            `;
            document.body.appendChild(shareModal);
            
            document.getElementById('close-share-modal').addEventListener('click', function() {
                shareModal.style.display = 'none';
            });
            
            document.getElementById('copy-share-url').addEventListener('click', function() {
                const shareUrlInput = document.getElementById('share-url');
                shareUrlInput.select();
                document.execCommand('copy');
                this.innerHTML = '<i class="fas fa-check mr-2"></i>Copied!';
                setTimeout(() => {
                    this.innerHTML = '<i class="fas fa-copy mr-2"></i>Copy Link';
                }, 2000);
            });
            
            shareModal.addEventListener('click', function(e) {
                if (e.target === this) {
                    this.style.display = 'none';
                }
            });
        }
        
        // Set up social share buttons
        setupSocialShareButtons(shareUrl, title);
        
        // Set the share URL in the input field
        const shareUrlInput = document.getElementById('share-url');
        shareUrlInput.value = shareUrl;
        
        // Show the modal
        shareModal.style.display = 'flex';
    }

    /**
     * Set up social media share buttons
     * @param {string} shareUrl - URL to share
     * @param {string} title - Article title
     */
    function setupSocialShareButtons(shareUrl, title) {
        const safeTitle = encodeURIComponent(title || 'Shared from TennesseeFeeds');
        const safeUrl = encodeURIComponent(shareUrl);
        
        const facebookBtn = document.getElementById('share-facebook');
        facebookBtn.href = `https://www.facebook.com/sharer/sharer.php?u=${safeUrl}`;
        facebookBtn.target = '_blank';
        facebookBtn.addEventListener('click', function(e) {
            e.preventDefault();
            window.open(this.href, 'facebook-share-dialog', 'width=800,height=600');
        });
        
        const twitterBtn = document.getElementById('share-twitter');
        twitterBtn.href = `https://twitter.com/intent/tweet?url=${safeUrl}&text=${safeTitle}`;
        twitterBtn.target = '_blank';
        twitterBtn.addEventListener('click', function(e) {
            e.preventDefault();
            window.open(this.href, 'twitter-share-dialog', 'width=800,height=600');
        });
        
        const linkedinBtn = document.getElementById('share-linkedin');
        linkedinBtn.href = `https://www.linkedin.com/sharing/share-offsite/?url=${safeUrl}`;
        linkedinBtn.target = '_blank';
        linkedinBtn.addEventListener('click', function(e) {
            e.preventDefault();
            window.open(this.href, 'linkedin-share-dialog', 'width=800,height=600');
        });
        
        const emailBtn = document.getElementById('share-email');
        emailBtn.href = `mailto:?subject=${safeTitle}&body=Check out this article from TennesseeFeeds: ${safeUrl}`;
    }

    /**
     * Initialize share handlers
     */
    function initialize() {
        debugLog('Initializing share handlers');
        
        // Override existing trackShare function if it exists
        if (window.trackShare) {
            debugLog('Overriding existing trackShare function');
            window.originalTrackShare = window.trackShare;
            window.trackShare = trackShare;
        } else {
            debugLog('Adding trackShare function');
            window.trackShare = trackShare;
        }
        
        // Add shareHandler to window
        window.shareHandler = shareHandler;
        
        // Override UserTracking.trackShare if it exists
        if (window.UserTracking && window.UserTracking.trackShare) {
            debugLog('Wrapping UserTracking.trackShare');
            const originalTrackShare = window.UserTracking.trackShare;
            
            window.UserTracking.trackShare = function(articleId, platform = 'web', metadata = {}) {
                // Ensure consistent article ID
                const consistentArticleId = generateConsistentArticleId(articleId);
                debugLog('UserTracking.trackShare called with:', consistentArticleId);
                
                // Call original with consistent ID
                return originalTrackShare.call(window.UserTracking, consistentArticleId, platform, metadata);
            };
        }
        
        // Set up click handlers for share buttons
        setupShareButtons();
    }

    /**
     * Set up click handlers for share buttons
     */
    function setupShareButtons() {
        debugLog('Setting up share button handlers');
        
        // Use event delegation to handle all share button clicks
        document.addEventListener('click', function(event) {
            const shareButton = event.target.closest('.share-btn');
            if (!shareButton) return;
            
            event.preventDefault();
            event.stopPropagation();
            
            const articleId = shareButton.dataset.articleId;
            if (!articleId) {
                console.error('Share button missing articleId attribute');
                return;
            }
            
            debugLog('Share button clicked for article:', articleId);
            
            // Get title if available
            let title = null;
            const articleElement = shareButton.closest('[data-article-id]');
            if (articleElement) {
                const titleElement = articleElement.querySelector('h3 a, h1, h2, .text-xl, .text-2xl');
                if (titleElement) {
                    title = titleElement.textContent.trim();
                }
            }
            
            // Handle share
            shareHandler(articleId, title);
        });
        
        // Handle share buttons in single article view
        const articleShareBtn = document.getElementById('article-share-btn');
        if (articleShareBtn) {
            debugLog('Found article-share-btn in single article view');
            
            articleShareBtn.addEventListener('click', function() {
                debugLog('Article view share button clicked');
                
                // Get article ID from URL if available
                let articleId = null;
                
                if (window.location.search.includes('article=')) {
                    articleId = window.location.search.split('article=')[1].split('&')[0];
                }
                
                // Fallback to data attribute
                if (!articleId && this.dataset.articleId) {
                    articleId = this.dataset.articleId;
                }
                
                if (!articleId) {
                    console.error('Could not determine article ID for sharing');
                    return;
                }
                
                // Get title
                let title = null;
                const titleElement = document.querySelector('#single-article-view h1');
                if (titleElement) {
                    title = titleElement.textContent.trim();
                }
                
                // Handle share
                shareHandler(articleId, title);
            });
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})();
