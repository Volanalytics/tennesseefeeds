/**
 * TennesseeFeeds Article System
 * 
 * This script handles article saving, individual article URLs, and the recently shared
 * articles functionality.
 */
(function() {
    // Configuration
    const savedArticlesKey = 'tnfeeds_saved_articles';
    const maxSavedArticles = 50;
    const maxRecentlyShared = 5;
    
    /**
     * Get all saved articles from localStorage
     * @returns {Array} Array of saved article objects
     */
    function getSavedArticles() {
        try {
            const savedData = localStorage.getItem(savedArticlesKey);
            return savedData ? JSON.parse(savedData) : [];
        } catch (error) {
            console.error('Error getting saved articles:', error);
            return [];
        }
    }
    
    /**
     * Save an article to localStorage
     * @param {Object} article - Article object to save
     * @returns {boolean} Success status
     */
    function saveArticle(article) {
        try {
            if (!article || !article.id) {
                console.error('Invalid article object');
                return false;
            }
            
            // Get existing saved articles
            let savedArticles = getSavedArticles();
            
            // Check if already saved
            const existingIndex = savedArticles.findIndex(a => a.id === article.id);
            if (existingIndex >= 0) {
                // Already saved, update the timestamp
                savedArticles[existingIndex].savedAt = new Date().toISOString();
                localStorage.setItem(savedArticlesKey, JSON.stringify(savedArticles));
                return true;
            }
            
            // Add to saved articles
            savedArticles.push({
                ...article,
                savedAt: new Date().toISOString()
            });
            
            // Limit number of saved articles (remove oldest first)
            if (savedArticles.length > maxSavedArticles) {
                savedArticles.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
                savedArticles = savedArticles.slice(0, maxSavedArticles);
            }
            
            // Save to localStorage
            localStorage.setItem(savedArticlesKey, JSON.stringify(savedArticles));
            return true;
        } catch (error) {
            console.error('Error saving article:', error);
            return false;
        }
    }
    
    /**
     * Remove an article from saved articles
     * @param {string} articleId - ID of article to remove
     * @returns {boolean} Success status
     */
    function removeSavedArticle(articleId) {
        try {
            if (!articleId) {
                console.error('Invalid article ID');
                return false;
            }
            
            // Get existing saved articles
            let savedArticles = getSavedArticles();
            
            // Remove article
            savedArticles = savedArticles.filter(article => article.id !== articleId);
            
            // Save updated list
            localStorage.setItem(savedArticlesKey, JSON.stringify(savedArticles));
            return true;
        } catch (error) {
            console.error('Error removing saved article:', error);
            return false;
        }
    }
    
    /**
     * Check if an article is saved
     * @param {string} articleId - Article ID to check
     * @returns {boolean} True if saved
     */
    function isArticleSaved(articleId) {
        try {
            const savedArticles = getSavedArticles();
            return savedArticles.some(article => article.id === articleId);
        } catch (error) {
            console.error('Error checking if article is saved:', error);
            return false;
        }
    }
    
    /**
     * Get recently shared articles from the API
     * @param {number} limit - Maximum number of articles to return
     * @returns {Promise<Array>} Array of recently shared articles
     */
    async function getRecentlySharedArticles(limit = maxRecentlyShared) {
        try {
            // First try to get from local storage to have something to show immediately
            const cachedShared = localStorage.getItem('tnfeeds_recent_shared');
            let sharedArticles = [];
            
            if (cachedShared) {
                try {
                    const parsed = JSON.parse(cachedShared);
                    if (Array.isArray(parsed)) {
                        sharedArticles = parsed;
                    }
                } catch (e) {
                    console.error('Error parsing cached shared articles:', e);
                }
            }
            
            // Try to fetch new data in the background
            // This is a mockup for now - API endpoint would need to be created
            try {
                // Use the existing API to get some article data
                const response = await fetch('https://tennesseefeeds-api.onrender.com/api/feeds');
                
                if (response.ok) {
                    const result = await response.json();
                    
                    if (result.success && result.articles) {
                        // Format as recently shared
                        const mockShared = result.articles.slice(0, limit).map(article => ({
                            articleId: article.link.replace(/[^a-zA-Z0-9]/g, '-'),
                            title: article.title,
                            source: article.source,
                            shareDate: new Date(Date.now() - Math.random() * 86400000 * 2).toISOString(), // Random time in last 48 hours
                            url: article.link
                        }));
                        
                        // Sort by "shareDate" (newest first)
                        mockShared.sort((a, b) => new Date(b.shareDate) - new Date(a.shareDate));
                        
                        // Cache for next time
                        localStorage.setItem('tnfeeds_recent_shared', JSON.stringify(mockShared));
                        
                        // Use this data
                        return mockShared;
                    }
                }
            } catch (fetchError) {
                console.error('Error fetching recent shares:', fetchError);
            }
            
            // If we can't fetch, return whatever we had cached
            return sharedArticles;
        } catch (error) {
            console.error('Error getting recently shared articles:', error);
            return [];
        }
    }
    
    /**
     * Create a URL for a specific article
     * @param {string} articleId - The article ID
     * @param {string} title - The article title (optional)
     * @returns {string} The article URL
     */
    function createArticleUrl(articleId, title = '') {
        // Base URL
        const baseUrl = window.location.origin + window.location.pathname;
        
        // Create slug from title if provided
        let slug = '';
        if (title) {
            slug = title
                .toLowerCase()
                .replace(/[^\w\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .substring(0, 50);
        }
        
        // Construct URL with article ID and optional slug
        return `${baseUrl}?article=${articleId}${slug ? '&title=' + encodeURIComponent(slug) : ''}`;
    }
    
    /**
     * Handle article URL parameters on page load
     * @returns {Promise<boolean>} Success status
     */
    async function handleArticleUrl() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const articleId = urlParams.get('article');
            
            if (!articleId) {
                return false;
            }
            
            console.log('Article URL detected:', articleId);
            
            // Show a loading state for the article
            showArticleLoading();
            
            // Fetch the article from your API or from the main articles list
            const article = await fetchArticleById(articleId);
            
            if (!article) {
                console.error('Article not found:', articleId);
                hideArticleLoading();
                return false;
            }
            
            // Show the article view
            showArticleView(article);
            return true;
        } catch (error) {
            console.error('Error handling article URL:', error);
            hideArticleLoading();
            return false;
        }
    }
    
    /**
     * Show loading state for article view
     */
    function showArticleLoading() {
        // Create or show a loading overlay
        let loadingOverlay = document.getElementById('article-loading-overlay');
        
        if (!loadingOverlay) {
            loadingOverlay = document.createElement('div');
            loadingOverlay.id = 'article-loading-overlay';
            loadingOverlay.className = 'fixed inset-0 bg-white bg-opacity-90 flex flex-col items-center justify-center z-50';
            loadingOverlay.innerHTML = `
                <div class="animate-spin h-12 w-12 border-4 border-neutral-300 border-t-neutral-600 rounded-full mb-4"></div>
                <p class="text-neutral-600">Loading article...</p>
            `;
            document.body.appendChild(loadingOverlay);
        } 
        
        loadingOverlay.classList.add('show');
    }
    
    /**
     * Hide loading state for article view
     */
    function hideArticleLoading() {
        const loadingOverlay = document.getElementById('article-loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.classList.remove('show');
        }
    }
    
    /**
     * Fetch an article by ID from the API or main articles list
     * @param {string} articleId - ID of the article to fetch
     * @returns {Promise<Object|null>} Article object or null if not found
     */
    async function fetchArticleById(articleId) {
        try {
            // First check in the cache and saved articles
            const savedArticles = getSavedArticles();
            const savedArticle = savedArticles.find(article => article.id === articleId);
            
            if (savedArticle) {
                return savedArticle;
            }
            
            // Then check in the current page articles
            if (window.allArticles && Array.isArray(window.allArticles)) {
                const pageArticle = window.allArticles.find(article => 
                    article.link === articleId || 
                    article.link.replace(/[^a-zA-Z0-9]/g, '-') === articleId
                );
                
                if (pageArticle) {
                    return {
                        id: pageArticle.link.replace(/[^a-zA-Z0-9]/g, '-'),
                        title: pageArticle.title,
                        link: pageArticle.link,
                        description: pageArticle.description,
                        source: pageArticle.source,
                        pubDate: pageArticle.pubDate,
                        image: pageArticle.image,
                        category: pageArticle.category,
                        region: pageArticle.region
                    };
                }
            }
            
            // Since we don't have a real API endpoint yet, check cached articles
            const cachedData = localStorage.getItem('tennesseefeeds_cache');
            if (cachedData) {
                try {
                    const data = JSON.parse(cachedData);
                    if (data.articles && Array.isArray(data.articles)) {
                        const cachedArticle = data.articles.find(article => 
                            article.link === articleId || 
                            article.link.replace(/[^a-zA-Z0-9]/g, '-') === articleId
                        );
                        
                        if (cachedArticle) {
                            return {
                                id: cachedArticle.link.replace(/[^a-zA-Z0-9]/g, '-'),
                                title: cachedArticle.title,
                                link: cachedArticle.link,
                                description: cachedArticle.description,
                                source: cachedArticle.source,
                                pubDate: cachedArticle.pubDate,
                                image: cachedArticle.image,
                                category: cachedArticle.category,
                                region: cachedArticle.region
                            };
                        }
                    }
                } catch (e) {
                    console.error('Error parsing cached articles:', e);
                }
            }
            
            // For now, return a mock article if we can't find it elsewhere
            return {
                id: articleId,
                title: 'Article Not Found',
                link: '#',
                description: 'Sorry, we could not find the article you were looking for. It may have been removed or is temporarily unavailable.',
                source: 'TennesseeFeeds',
                pubDate: new Date().toISOString(),
                image: 'https://via.placeholder.com/800x400?text=Article+Not+Found',
                category: 'News'
            };
        } catch (error) {
            console.error('Error fetching article by ID:', error);
            return null;
        }
    }
    
    /**
     * Show the article view for a specific article
     * @param {Object} article - Article object to display
     */
    function showArticleView(article) {
        // Hide loading
        hideArticleLoading();
        
        // Get or create the article view container
        let articleView = document.getElementById('single-article-view');
        
        if (!articleView) {
            articleView = document.createElement('div');
            articleView.id = 'single-article-view';
            articleView.className = 'fixed inset-0 bg-white overflow-auto z-40';
            document.body.appendChild(articleView);
        }
        
        // Format date
        const formattedDate = formatDate(article.pubDate);
        
        // Create article HTML
        articleView.innerHTML = `
            <div class="container mx-auto px-4 py-8">
                <div class="flex justify-between items-center mb-6">
                    <button id="back-to-feed-btn" class="bg-neutral-700 text-white px-4 py-2 rounded-md hover:bg-neutral-600 transition-colors flex items-center">
                        <i class="fas fa-arrow-left mr-2"></i>
                        Back to Feed
                    </button>
                    <div class="flex space-x-4">
                        <button id="article-save-btn" class="flex items-center ${isArticleSaved(article.id) ? 'text-blue-500' : 'text-neutral-600'} hover:text-blue-700">
                            <i class="${isArticleSaved(article.id) ? 'fas fa-bookmark' : 'far fa-bookmark'} mr-2"></i>
                            <span>${isArticleSaved(article.id) ? 'Saved' : 'Save'}</span>
                        </button>
                        <button id="article-share-btn" class="flex items-center text-neutral-600 hover:text-neutral-800">
                            <i class="fas fa-share-alt mr-2"></i>
                            <span>Share</span>
                        </button>
                    </div>
                </div>
                
                <div class="max-w-4xl mx-auto">
                    ${article.image ? `<img src="${article.image}" alt="${article.title}" class="w-full h-96 object-cover rounded-lg mb-6">` : ''}
                    
                    <div class="flex items-center justify-between mb-4">
                        <div>
                            <span class="text-sm text-neutral-500">${article.source}</span>
                            ${article.category ? `<span class="ml-2 px-2 py-0.5 bg-neutral-200 text-neutral-700 rounded-full text-xs">${article.category}</span>` : ''}
                        </div>
                        <span class="text-sm text-neutral-500">${formattedDate}</span>
                    </div>
                    
                    <h1 class="text-3xl font-bold text-neutral-800 mb-4">${article.title}</h1>
                    
                    <div class="prose max-w-none mb-8">
                        <p class="text-neutral-600">${article.description}</p>
                        <div class="mt-4">
                            <a href="${article.link}" target="_blank" class="inline-block bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors">
                                Read Full Article <i class="fas fa-external-link-alt ml-2"></i>
                            </a>
                        </div>
                    </div>
                    
                    <div class="border-t border-neutral-200 pt-6">
                        <h2 class="text-xl font-semibold mb-4">Comments</h2>
                        <div class="comments-section" data-article-id="${article.id}">
                            <div class="flex mb-4">
                                <input type="text" class="comment-input flex-grow mr-2 px-3 py-2 border rounded-md text-neutral-700" placeholder="Write a comment...">
                                <button class="post-comment-btn bg-neutral-700 text-white px-4 py-2 rounded-md">Post</button>
                            </div>
                            <div class="comments-container max-h-96 overflow-y-auto pr-2" data-comments-container="${article.id}">
                                <p class="text-neutral-500 text-sm">Loading comments...</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Show article view
        articleView.classList.add('show');
        
        // Add event listeners
        document.getElementById('back-to-feed-btn').addEventListener('click', hideArticleView);
        
        // Save button
        const saveBtn = document.getElementById('article-save-btn');
        saveBtn.addEventListener('click', () => {
            const isSaved = isArticleSaved(article.id);
            
            if (isSaved) {
                if (removeSavedArticle(article.id)) {
                    saveBtn.innerHTML = `<i class="far fa-bookmark mr-2"></i><span>Save</span>`;
                    saveBtn.classList.remove('text-blue-500');
                    saveBtn.classList.add('text-neutral-600');
                    
                    // Update saved articles display if it exists
                    renderSavedArticles();
                    
                    // Update any matching article cards
                    updateArticleCardSaveState(article.id, false);
                }
            } else {
                if (saveArticle(article)) {
                    saveBtn.innerHTML = `<i class="fas fa-bookmark mr-2"></i><span>Saved</span>`;
                    saveBtn.classList.remove('text-neutral-600');
                    saveBtn.classList.add('text-blue-500');
                    
                    // Update saved articles display if it exists
                    renderSavedArticles();
                    
                    // Update any matching article cards
                    updateArticleCardSaveState(article.id, true);
                }
            }
        });
        
        // Share button
        document.getElementById('article-share-btn').addEventListener('click', () => {
            if (window.UserTracking && window.UserTracking.trackShare) {
                window.UserTracking.trackShare(article.id, 'web').then(shareUrl => {
                    if (shareUrl) {
                        if (window.createOrShowShareModal) {
                            window.createOrShowShareModal(shareUrl, article.title);
                        } else {
                            navigator.clipboard.writeText(shareUrl).then(() => {
                                alert('Share link copied to clipboard: ' + shareUrl);
                            });
                        }
                    }
                });
            } else {
                // Fallback to direct URL sharing
                const articleUrl = createArticleUrl(article.id, article.title);
                navigator.clipboard.writeText(articleUrl).then(() => {
                    alert('Article link copied to clipboard: ' + articleUrl);
                });
            }
        });
        
        // Load comments if the function exists
        if (window.loadComments) {
            window.loadComments(article.id);
        }
        
        // Update page title
        document.title = `${article.title} | TennesseeFeeds`;
        
        // Update URL without reloading the page
        const newUrl = createArticleUrl(article.id, article.title);
        window.history.pushState({ articleId: article.id }, article.title, newUrl);
        
        return true;
    }
    
    /**
     * Hide the article view
     */
    function hideArticleView() {
        const articleView = document.getElementById('single-article-view');
        if (articleView) {
            articleView.classList.remove('show');
        }
        
        // Restore original page title
        document.title = 'Tennessee News | Latest Tennessee Headlines | TennesseeFeeds.com';
        
        // Restore original URL without reloading
        window.history.pushState({}, '', window.location.pathname);
    }
    
    /**
     * Format date string to human-readable format
     * @param {string} dateString - Date string to format
     * @returns {string} Formatted date
     */
    function formatDate(dateString) {
        if (!dateString) return '';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (e) {
            return dateString;
        }
    }
    
    /**
     * Format a date as a relative time string (e.g. "5m ago")
     * @param {string} dateString - Date string to format
     * @returns {string} Formatted relative time
     */
    function formatTimeAgo(dateString) {
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffMs = now - date;
            const diffSecs = Math.floor(diffMs / 1000);
            const diffMins = Math.floor(diffSecs / 60);
            const diffHours = Math.floor(diffMins / 60);
            const diffDays = Math.floor(diffHours / 24);
            
            if (diffSecs < 60) {
                return 'just now';
            } else if (diffMins < 60) {
                return `${diffMins}m ago`;
            } else if (diffHours < 24) {
                return `${diffHours}h ago`;
            } else if (diffDays < 7) {
                return `${diffDays}d ago`;
            } else {
                return date.toLocaleDateString();
            }
        } catch (error) {
            console.error('Error formatting time ago:', error);
            return dateString;
        }
    }
    
    /**
     * Render the saved articles section
     */
    function renderSavedArticles() {
        const savedArticlesSection = document.getElementById('pinned-articles');
        if (!savedArticlesSection) return;
        
        const savedArticles = getSavedArticles();
        const pinnedArticlesGrid = document.getElementById('pinned-articles-grid');
        
        if (!pinnedArticlesGrid) return;
        
        // Update counter
        const savedCounter = savedArticlesSection.querySelector('span');
        if (savedCounter) {
            savedCounter.textContent = `${savedArticles.length} saved`;
        }
        
        // Handle empty state
        if (savedArticles.length === 0) {
            pinnedArticlesGrid.innerHTML = `
                <div class="col-span-full text-center py-8">
                    <p class="text-neutral-500">You haven't saved any articles yet.</p>
                    <p class="text-sm text-neutral-500 mt-2">Click the bookmark icon on any article to save it here.</p>
                </div>
            `;
            return;
        }
        
        // Sort saved articles by save date (newest first)
        savedArticles.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
        
        // Generate HTML
        pinnedArticlesGrid.innerHTML = savedArticles.map(article => {
            const formattedDate = formatDate(article.pubDate);
            
            return `
                <div class="article-card bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow relative">
                    <button class="remove-saved-btn absolute top-2 right-2 bg-white rounded-full p-1 text-red-500 hover:bg-red-50 transition-colors z-10" data-article-id="${article.id}">
                        <i class="fas fa-times"></i>
                    </button>
                    ${article.image ? 
                        `<img src="${article.image}" alt="${article.title}" class="w-full h-48 object-cover">` :
                        `<div class="w-full h-48 bg-neutral-200 flex items-center justify-center text-neutral-500">
                            <i class="fas fa-newspaper text-4xl"></i>
                        </div>`
                    }
                    <div class="p-6">
                        <div class="flex justify-between items-start mb-2">
                            <div class="flex items-center">
                                <span class="text-sm text-neutral-500">${article.source}</span>
                                ${article.category ? 
                                    `<span class="ml-2 px-2 py-0.5 bg-neutral-200 text-neutral-700 rounded-full text-xs">${article.category}</span>` :
                                    ''
                                }
                            </div>
                            <span class="text-sm text-neutral-500 formatted-date">${formattedDate}</span>
                        </div>
                        <h3 class="text-xl font-bold text-neutral-800 mb-3">
                            <a href="#" class="article-link hover:text-neutral-600 transition-colors" data-article-id="${article.id}">
                                ${article.title}
                            </a>
                        </h3>
                        <p class="text-neutral-600 mb-4 line-clamp-3">${article.description}</p>
                        <div class="flex justify-between items-center border-t pt-4">
                            <div class="flex space-x-4">
                                <button class="comment-btn flex items-center text-neutral-600 hover:text-neutral-800" data-article-id="${article.id}">
                                    <i class="fas fa-comment mr-2"></i>
                                    <span>Comment</span>
                                </button>
                                <button class="favorite-btn flex items-center text-blue-500 hover:text-blue-700" data-article-id="${article.id}">
                                    <i class="fas fa-bookmark mr-2"></i>
                                    <span>Saved</span>
                                </button>
                            </div>
                            <button class="share-btn text-neutral-600 hover:text-neutral-800" data-article-id="${article.id}">
                                <i class="fas fa-share"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        // Add event listeners to remove buttons
        pinnedArticlesGrid.querySelectorAll('.remove-saved-btn').forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const articleId = this.dataset.articleId;
                
                if (removeSavedArticle(articleId)) {
                    // Update saved articles display
                    renderSavedArticles();
                    
                    // Update any article cards on the page for this article
                    updateArticleCardSaveState(articleId, false);
                }
            });
        });
        
        // Add event listeners to article links
        pinnedArticlesGrid.querySelectorAll('.article-link').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const articleId = this.dataset.articleId;
                if (articleId) {
                    fetchArticleById(articleId).then(article => {
                        if (article) {
                            showArticleView(article);
                        }
                    });
                }
            });
        });
    }
    
    /**
     * Update save state of article cards on the page
     * @param {string} articleId - ID of the article
     * @param {boolean} isSaved - Whether the article is saved
     */
    function updateArticleCardSaveState(articleId, isSaved) {
        // Find all save buttons for this article
        const saveButtons = document.querySelectorAll(`.favorite-btn[data-article-id="${articleId}"]`);
        
        saveButtons.forEach(button => {
            // Skip buttons in the saved articles section
            if (button.closest('#pinned-articles-grid')) return;
            
            if (isSaved) {
                button.innerHTML = `<i class="fas fa-bookmark mr-2"></i><span>Saved</span>`;
                button.classList.remove('text-neutral-600');
                button.classList.add('text-blue-500');
            } else {
                button.innerHTML = `<i class="far fa-bookmark mr-2"></i><span>Save</span>`;
                button.classList.remove('text-blue-500');
                button.classList.add('text-neutral-600');
            }
        });
    }
    
    /**
     * Render recently shared articles
     */
    async function renderRecentlyShared() {
        const sharedContainer = document.querySelector('.shared-articles-list');
        if (!sharedContainer) return;
        
        // Add loading state
        sharedContainer.innerHTML = `
            <div class="text-center py-4">
                <div class="inline-block animate-spin h-5 w-5 border-2 border-neutral-300 border-t-neutral-600 rounded-full"></div>
                <p class="text-sm text-neutral-500 mt-2">Loading...</p>
            </div>
        `;
        
        try {
            const recentlyShared = await getRecentlySharedArticles();
            
            if (recentlyShared.length === 0) {
                sharedContainer.innerHTML = `
                    <p class="text-center text-neutral-500 py-4">No shared articles yet.</p>
                `;
                return;
            }
            
            sharedContainer.innerHTML = recentlyShared.map(share => {
                const timeAgo = formatTimeAgo(share.shareDate);
                return `
                    <div class="shared-article py-2 border-b border-neutral-100" data-article-id="${share.articleId}">
                        <a href="#" class="article-link block hover:bg-neutral-50 p-2 rounded transition-colors" data-article-id="${share.articleId}">
                            <div class="text-sm font-medium text-neutral-800 line-clamp-2">${share.title || 'Shared Article'}</div>
                            <div class="flex items-center mt-1 text-xs text-neutral-500">
                                <span class="mr-2">${share.source || 'Unknown Source'}</span>
                                <span>•</span>
                                <span class="ml-2">Shared ${timeAgo}</span>
                            </div>
                        </a>
                    </div>
                `;
            }).join('');
            
            // Add event listeners to article links
            sharedContainer.querySelectorAll('.article-link').forEach(link => {
                link.addEventListener('click', function(e) {
                    e.preventDefault();
                    const articleId = this.dataset.articleId;
                    if (articleId) {
                        fetchArticleById(articleId).then(article => {
                            if (article) {
                                showArticleView(article);
                            }
                        });
                    }
                });
            });
        } catch (error) {
            console.error('Error rendering recently shared:', error);
            sharedContainer.innerHTML = `
                <p class="text-center text-neutral-500 py-4">Error loading shared articles.</p>
            `;
        }
    }
    
    /**
     * Setup article saving functionality
     */
    function setupArticleSaving() {
        // Handle save button clicks (event delegation)
        document.addEventListener('click', function(event) {
            const saveButton = event.target.closest('.favorite-btn');
            if (!saveButton) return;
            
            event.preventDefault();
            event.stopPropagation();
            
            const articleId = saveButton.dataset.articleId;
            if (!articleId) return;
            
            // Skip if this is in the saved articles section
            if (saveButton.closest('#pinned-articles-grid')) return;
            
            // Get current save state
            const isSaved = isArticleSaved(articleId);
            
            if (isSaved) {
                // Remove from saved
                if (removeSavedArticle(articleId)) {
                    // Update UI
                    saveButton.innerHTML = '<i class="far fa-bookmark mr-2"></i><span>Save</span>';
                    saveButton.classList.remove('text-blue-500');
                    saveButton.classList.add('text-neutral-600');
                    
                    // Update saved articles section
                    renderSavedArticles();
                }
            } else {
                // Find the article card
                const articleCard = saveButton.closest('[data-article-id]');
                if (!articleCard) return;
                
                // Get article information
                const titleElement = articleCard.querySelector('h3 a');
                const title = titleElement ? titleElement.textContent.trim() : '';
                const link = titleElement && titleElement.hasAttribute('href') ? titleElement.getAttribute('href') : '#';
                const description = articleCard.querySelector('p.line-clamp-3')?.textContent.trim() || '';
                const sourceElement = articleCard.querySelector('.text-sm.text-neutral-500');
                const source = sourceElement ? sourceElement.textContent.trim() : 'Unknown Source';
                const dateElement = articleCard.querySelector('.formatted-date');
                const pubDate = dateElement ? new Date(dateElement.textContent).toISOString() : new Date().toISOString();
                
                // Get category badge if present
                const categoryElement = articleCard.querySelector('.rounded-full.text-xs');
                const category = categoryElement ? categoryElement.textContent.trim() : '';
                
                // Get image if present
                const imageElement = articleCard.querySelector('img');
                const image = imageElement ? imageElement.src : '';
                
                const article = {
                    id: articleId,
                    title: title,
                    link: link,
                    description: description,
                    source: source,
                    pubDate: pubDate,
                    image: image,
                    category: category
                };
                
                // Add to saved
                if (saveArticle(article)) {
                    // Update UI
                    saveButton.innerHTML = '<i class="fas fa-bookmark mr-2"></i><span>Saved</span>';
                    saveButton.classList.remove('text-neutral-600');
                    saveButton.classList.add('text-blue-500');
                    
                    // Update saved articles section
                    renderSavedArticles();
                }
            }
        });
    }
    
    /**
     * Initialize article handling and URL support
     */
    function initializeArticleSystem() {
        // Ensure we have the necessary elements
        if (!document.getElementById('pinned-articles-grid')) {
            console.warn('Saved articles container not found, skipping initialization of saved articles feature');
        }
        
        if (!document.querySelector('.shared-articles-list')) {
            console.warn('Recently shared container not found, skipping initialization of recently shared feature');
        }
        
        // Set up article saving
        setupArticleSaving();
        
        // Render saved articles if container exists
        if (document.getElementById('pinned-articles-grid')) {
            renderSavedArticles();
        }
        
        // Render recently shared articles if container exists
        if (document.querySelector('.shared-articles-list')) {
            renderRecentlyShared();
        }
        
        // Check URL parameters for article view
        handleArticleUrl();
        
        // Update saved article buttons state
        document.querySelectorAll('.favorite-btn[data-article-id]').forEach(button => {
            const articleId = button.dataset.articleId;
            
            if (isArticleSaved(articleId)) {
                button.innerHTML = '<i class="fas fa-bookmark mr-2"></i><span>Saved</span>';
                button.classList.remove('text-neutral-600');
                button.classList.add('text-blue-500');
            }
        });
        
        // Set up browser back button handling
        window.addEventListener('popstate', function(event) {
            if (event.state && event.state.articleId) {
                // Show the article view again
                fetchArticleById(event.state.articleId).then(article => {
                    if (article) {
                        showArticleView(article);
                    }
                });
            } else {
                // Hide the article view
                hideArticleView();
            }
        });
        
        // Set up article link handling for individual article views
        document.addEventListener('click', function(event) {
            const articleLink = event.target.closest('.article-link, a[data-article-id]');
            
            if (articleLink && !event.ctrlKey && !event.metaKey) {
                event.preventDefault();
                
                // Get article ID from the element
                const articleId = articleLink.dataset.articleId;
                
                if (articleId) {
                    // Show article loading
                    showArticleLoading();
                    
                    // Get article data and show view
                    fetchArticleById(articleId).then(article => {
                        if (article) {
                            showArticleView(article);
                        } else {
                            hideArticleLoading();
                            // Fallback to regular link behavior
                            if (articleLink.hasAttribute('href')) {
                                window.location.href = articleLink.getAttribute('href');
                            }
                        }
                    });
                }
            }
        });
        
        console.log('Article system initialized');
    }
    
    // Expose utilities globally
    window.ArticleSystem = {
        getSavedArticles,
        saveArticle,
        removeSavedArticle,
        isArticleSaved,
        showArticleView,
        hideArticleView,
        createArticleUrl,
        renderSavedArticles,
        renderRecentlyShared
    };
    
    // Initialize on page load
    document.addEventListener('DOMContentLoaded', initializeArticleSystem);
})();
