// Modified share-handlers.js - Enhanced code to fix share button issues

// This function handles sharing on both the main page and article detail pages
// ensuring consistent article IDs are used

(function() {
    // Configuration
    const DEBUG = true; // Set to false in production
    
    /**
     * Debug logging function
     */
    function debugLog(...args) {
        if (DEBUG) {
            console.log('[ShareFix]', ...args);
        }
    }
    
    /**
     * Share an article via the API
     * @param {string} articleId - Original article URL/ID
     * @param {string} title - Article title
     * @param {string} description - Article description
     * @param {string} source - Article source
     * @param {string} imageUrl - Image URL (optional)
     * @returns {Promise<string|null>} Share URL or null if failed
     */
    async function trackShare(articleId, title, description, source, imageUrl) {
        debugLog('trackShare called with ID:', articleId);
        
        try {
            // Always use the original article URL as the ID, not a transformed version
            // This fixes the inconsistency between share buttons
            const originalArticleId = articleId;
            
            if (!originalArticleId) {
                console.error('No article ID provided for share');
                return null;
            }
            
            // Loading state for the button that called this (handled by caller)
            
            const apiUrl = 'https://tennesseefeeds-api.onrender.com/api/track-share';
            
            // Make the API call
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    articleId: originalArticleId,
                    title: title || null,
                    description: description || null,
                    source: source || null,
                    url: originalArticleId,
                    image: imageUrl || null,
                    platform: 'web'
                })
            });
            
            if (!response.ok) {
                throw new Error(`Server responded with status ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success && data.shareUrl) {
                return data.shareUrl;
            } else {
                throw new Error(data.error || 'Unknown error');
            }
        } catch (error) {
            console.error('Error sharing article:', error);
            return null;
        }
    }
    
    /**
     * Create or show the share modal
     * @param {string} shareUrl - URL to share
     * @param {string} title - Article title
     */
    function createOrShowShareModal(shareUrl, title) {
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
            
            // Close button
            document.getElementById('close-share-modal').addEventListener('click', function() {
                shareModal.classList.add('hidden');
            });
            
            // Copy link button
            document.getElementById('copy-share-url').addEventListener('click', function() {
                const shareUrlInput = document.getElementById('share-url');
                shareUrlInput.select();
                document.execCommand('copy');
                
                this.innerHTML = '<i class="fas fa-check mr-2"></i>Copied!';
                setTimeout(() => {
                    this.innerHTML = '<i class="fas fa-copy mr-2"></i>Copy Link';
                }, 2000);
                
                // Also show a notification
                if (window.showNotification) {
                    window.showNotification('Share link copied to clipboard');
                }
            });
            
            // Close when clicking outside
            shareModal.addEventListener('click', function(e) {
                if (e.target === this) {
                    this.classList.add('hidden');
                }
            });
        }
        
        // Setup social share buttons
        setupSocialShareButtons(shareUrl, title);
        
        // Set URL in the input field
        const shareUrlInput = document.getElementById('share-url');
        shareUrlInput.value = shareUrl;
        
        // Show the modal
        shareModal.classList.remove('hidden');
    }
    
    /**
     * Set up the social share buttons
     * @param {string} shareUrl - URL to share
     * @param {string} title - Article title
     */
    function setupSocialShareButtons(shareUrl, title) {
        const encodedUrl = encodeURIComponent(shareUrl);
        const encodedTitle = encodeURIComponent(title + ' | TennesseeFeeds');
        
        // Facebook
        const facebookBtn = document.getElementById('share-facebook');
        facebookBtn.href = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        facebookBtn.target = '_blank';
        facebookBtn.addEventListener('click', function(e) {
            e.preventDefault();
            window.open(this.href, 'facebook-share-dialog', 'width=800,height=600');
        });
        
        // Twitter
        const twitterBtn = document.getElementById('share-twitter');
        twitterBtn.href = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`;
        twitterBtn.target = '_blank';
        twitterBtn.addEventListener('click', function(e) {
            e.preventDefault();
            window.open(this.href, 'twitter-share-dialog', 'width=800,height=600');
        });
        
        // LinkedIn
        const linkedinBtn = document.getElementById('share-linkedin');
        linkedinBtn.href = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
        linkedinBtn.target = '_blank';
        linkedinBtn.addEventListener('click', function(e) {
            e.preventDefault();
            window.open(this.href, 'linkedin-share-dialog', 'width=800,height=600');
        });
        
        // Email
        const emailBtn = document.getElementById('share-email');
        emailBtn.href = `mailto:?subject=${encodedTitle}&body=${encodeURIComponent('Check out this article from TennesseeFeeds: ' + shareUrl)}`;
    }

    /**
     * Extract article data from an element
     * @param {HTMLElement} element - Element to extract data from
     * @returns {Object|null} Article data or null if not found
     */
    function extractArticleData(element) {
        if (!element) return null;
        
        // Find the closest article container
        const articleContainer = element.closest('[data-article-id], .article-card, .bg-white');
        if (!articleContainer) return null;
        
        // Extract article ID - prefer data attribute, then fall back to link
        let articleId = articleContainer.dataset.articleId;
        
        // Get title, link, description, source, and image
        const titleElement = articleContainer.querySelector('h3 a, a.article-link, .article-title');
        const title = titleElement ? titleElement.textContent.trim() : null;
        
        // If we have a title element with href, use that as the article ID if we don't have one already
        if (!articleId && titleElement && titleElement.getAttribute('href')) {
            articleId = titleElement.getAttribute('href');
        }
        
        // If still no article ID found, look for any link
        if (!articleId) {
            const anyLink = articleContainer.querySelector('a[href]');
            if (anyLink && anyLink.getAttribute('href') !== '#') {
                articleId = anyLink.getAttribute('href');
            }
        }
        
        // Abort if we still don't have an ID
        if (!articleId) {
            console.error('Could not find article ID');
            return null;
        }
        
        // Get the rest of the article data
        const descElement = articleContainer.querySelector('p');
        const description = descElement ? descElement.textContent.trim() : null;
        
        const sourceElement = articleContainer.querySelector('.text-sm.text-neutral-500');
        const source = sourceElement ? sourceElement.textContent.trim() : null;
        
        const imageElement = articleContainer.querySelector('img');
        const imageUrl = imageElement ? imageElement.getAttribute('src') : null;
        
        return {
            id: articleId,
            title,
            link: articleId,
            description,
            source,
            imageUrl
        };
    }
    
    /**
     * Show a notification
     * @param {string} message - Message to show
     */
    function showNotification(message) {
        // Create or get notification element
        let notification = document.getElementById('tn-notification');
        
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'tn-notification';
            notification.className = 'fixed bottom-4 right-4 bg-neutral-800 text-white px-4 py-2 rounded-md shadow-lg transform transition-transform duration-300 translate-y-full';
            document.body.appendChild(notification);
        }
        
        // Set message
        notification.textContent = message;
        
        // Show
        setTimeout(() => {
            notification.classList.remove('translate-y-full');
        }, 10);
        
        // Hide after 3 seconds
        setTimeout(() => {
            notification.classList.add('translate-y-full');
        }, 3000);
    }
    
    /**
     * Handler for share button clicks
     * @param {Event} event - Click event
     */
    async function handleShareButtonClick(event) {
        // Find the closest share button to the clicked element
        const shareButton = event.target.closest('.share-btn');
        if (!shareButton) return;
        
        // Prevent default behavior
        event.preventDefault();
        event.stopPropagation();
        
        debugLog('Share button clicked:', shareButton);
        
        // Loading state
        const originalHTML = shareButton.innerHTML;
        shareButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        
        try {
            // Extract article data
            const articleData = extractArticleData(shareButton);
            
            if (!articleData) {
                throw new Error('Could not extract article data');
            }
            
            debugLog('Article data:', articleData);
            
            // Track share and get share URL
            const shareUrl = await trackShare(
                articleData.id,
                articleData.title,
                articleData.description,
                articleData.source,
                articleData.imageUrl
            );
            
            // Restore button
            shareButton.innerHTML = originalHTML;
            
            if (shareUrl) {
                // Show share modal with the URL
                createOrShowShareModal(shareUrl, articleData.title || 'Tennessee News Article');
            } else {
                alert('Error creating share link. Please try again.');
            }
        } catch (error) {
            console.error('Error handling share:', error);
            shareButton.innerHTML = originalHTML;
            alert('Error sharing article: ' + error.message);
        }
    }
    
    /**
     * Initialize the share functionality
     */
    function initShareHandlers() {
        // Add event listener for share button clicks using event delegation
        document.addEventListener('click', handleShareButtonClick);
        
        // Expose functions
        window.shareHandler = async function(articleId, title, description, source, imageUrl) {
            const shareUrl = await trackShare(articleId, title, description, source, imageUrl);
            
            if (shareUrl) {
                // Try to copy to clipboard
                try {
                    await navigator.clipboard.writeText(shareUrl);
                    showNotification('Share link copied to clipboard');
                } catch (error) {
                    // If clipboard API fails, show the share modal
                    createOrShowShareModal(shareUrl, title || 'Tennessee News Article');
                }
                return shareUrl;
            } else {
                alert('Error creating share link. Please try again.');
                return null;
            }
        };
        
        // Expose notification function
        window.showNotification = showNotification;
    }
    
    // Initialize when the DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initShareHandlers);
    } else {
        initShareHandlers();
    }
})();
