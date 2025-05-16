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
    const DEBUG = true; // Set to true to see debug logs, false for production
    
    /**
     * Debug logging function
     */
    function debugLog(...args) {
        if (DEBUG) {
            console.log('[ArticleSystem]', ...args);
        }
    }
    
    // Log script loading
    debugLog('Article system script loaded');
    
    /**
     * Check if we're on a share page and fix the buttons if needed
     * This is executed immediately when the script loads to fix share pages as early as possible
     */
    (function checkAndFixSharePage() {
        try {
            // Check if this is a share page based on URL pattern
            const isSharePage = window.location.href.includes('/share/');
            if (isSharePage) {
                debugLog('Share page detected, will fix buttons');
                
                // Fix buttons once DOM is loaded
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', fixSharePageButtons);
                } else {
                    fixSharePageButtons();
                }
                
                // Also set up a fallback to run after a delay in case DOM loading is slow
                setTimeout(fixSharePageButtons, 1000);
            }
        } catch (error) {
            console.error('Error in checkAndFixSharePage:', error);
        }
    })();
    
    /**
     * Fix the buttons on the share page
     */
    function fixSharePageButtons() {
        try {
            debugLog('Fixing share page buttons');
            
            // Get the share ID from the URL
            const shareId = window.location.pathname.split('/share/')[1]?.split('?')[0]?.split('#')[0];
            if (!shareId) {
                debugLog('No share ID found in URL, cannot fix buttons');
                return;
            }
            
            debugLog('Share ID:', shareId);
            
            // Find all buttons in the page
            const buttons = document.querySelectorAll('.button, a.button, .buttons a');
            debugLog('Found buttons:', buttons.length);
            
            if (buttons.length === 0) {
                // Try to find buttons with a more general selector
                const allLinks = document.querySelectorAll('a');
                debugLog('No buttons found, trying with general links selector:', allLinks.length);
                
                // Try to identify buttons by their content/text
                allLinks.forEach(link => {
                    const text = link.textContent.trim().toLowerCase();
                    
                    if (text.includes('read full article') || text.includes('read article')) {
                        fixReadArticleButton(link, shareId);
                    } else if (text.includes('tennessee') || text.includes('go to tennessee')) {
                        fixTennesseeButton(link, shareId);
                    }
                });
                
                return;
            }
            
            // Process each button
            buttons.forEach(button => {
                const buttonText = button.textContent.trim().toLowerCase();
                const href = button.getAttribute('href') || '';
                
                debugLog('Processing button:', buttonText, 'href:', href);
                
                if (buttonText.includes('read full article') || buttonText.includes('read article')) {
                    fixReadArticleButton(button, shareId);
                } else if (buttonText.includes('tennessee') || buttonText.includes('go to tennessee')) {
                    fixTennesseeButton(button, shareId);
                }
            });
            
            // Also try to intercept the automatic redirect
            interceptRedirect(shareId);
            
        } catch (error) {
            console.error('Error fixing share page buttons:', error);
        }
    }
    
    /**
     * Fix the "Read Full Article" button
     * @param {HTMLElement} button - The button element
     * @param {string} shareId - The share ID from the URL
     */
    function fixReadArticleButton(button, shareId) {
        debugLog('Fixing Read Article button');
        
        // First check if it already has a proper external URL
        const href = button.getAttribute('href') || '';
        
        // If the URL is just a hash or points back to the share page, we need to fix it
        if (href === '#' || href.includes('share.tennesseefeeds.com') || href.includes('/share/')) {
            debugLog('Read Article button has incorrect URL:', href);
            
            // Try to find the article URL from other elements on the page
            let articleUrl = extractArticleUrlFromPage();
            
            if (!articleUrl) {
                // If we couldn't find the URL, try fetching it from the API
                fetchShareData(shareId).then(shareData => {
                    if (shareData && shareData.url) {
                        debugLog('Got article URL from API:', shareData.url);
                        button.setAttribute('href', shareData.url);
                    }
                });
            } else {
                debugLog('Found article URL from page:', articleUrl);
                button.setAttribute('href', articleUrl);
            }
        } else {
            debugLog('Read Article button already has a valid URL:', href);
        }
    }
    
    /**
     * Fix the "View on TennesseeFeeds" button
     * @param {HTMLElement} button - The button element
     * @param {string} shareId - The share ID from the URL
     */
    function fixTennesseeButton(button, shareId) {
        debugLog('Fixing View on TennesseeFeeds button');
        
        // Create a proper Tennessee Feeds URL with the article ID
        const newUrl = `https://tennesseefeeds.com/?article=${encodeURIComponent(shareId)}`;
        
        // Check if URL is a proper Tennessee Feeds URL with the article ID
        const href = button.getAttribute('href') || '';
        
        // If the URL is missing the article ID or has an invalid one, fix it
        if (!href.includes('?article=') || href.includes('?article=#') || href.endsWith('?article=')) {
            debugLog('Tennessee button has incorrect URL:', href, 'setting to:', newUrl);
            button.setAttribute('href', newUrl);
        } else {
            debugLog('Tennessee button already has a valid URL:', href);
        }
    }
    
    /**
     * Extract the article URL from elements on the page
     * @returns {string|null} The article URL or null if not found
     */
    function extractArticleUrlFromPage() {
        try {
            // Try to find any link with a proper URL that might be the article
            const allLinks = document.querySelectorAll('a');
            
            for (const link of allLinks) {
                const href = link.getAttribute('href') || '';
                
                // Skip empty links, hash links, and links to tennesseefeeds
                if (href && href !== '#' && !href.startsWith('#') && 
                    !href.includes('tennesseefeeds.com') && !href.includes('/share/')) {
                    return href;
                }
            }
            
            // Try to find URLs in the metadata
            const ogUrl = document.querySelector('meta[property="og:url"]');
            if (ogUrl && ogUrl.getAttribute('content')) {
                const content = ogUrl.getAttribute('content');
                if (!content.includes('tennesseefeeds.com') && !content.includes('/share/')) {
                    return content;
                }
            }
            
            // If we can't find anything, check if there's a description with a URL in it
            const description = document.querySelector('.description');
            if (description) {
                const text = description.textContent;
                const urlMatch = text.match(/https?:\/\/[^\s]+/);
                if (urlMatch) {
                    return urlMatch[0];
                }
            }
            
            return null;
        } catch (error) {
            console.error('Error extracting article URL from page:', error);
            return null;
        }
    }
    
    /**
     * Fetch share data from the API
     * @param {string} shareId - The share ID
     * @returns {Promise<Object|null>} The share data or null if not found
     */
    async function fetchShareData(shareId) {
        try {
            // Try both the API endpoint and direct fetch
            let shareData = null;
            
            // First try the API endpoint
            try {
                const response = await fetch(`https://tennesseefeeds-api.onrender.com/api/share/${shareId}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.share) {
                        shareData = {
                            url: data.share.article?.url || null,
                            title: data.share.article?.title || null,
                            description: data.share.article?.description || null,
                            image: data.share.article?.image_url || null
                        };
                    }
                }
            } catch (error) {
                console.error('Error fetching from API endpoint:', error);
            }
            
            // If API endpoint didn't work, try direct fetch from the share file
            if (!shareData) {
                try {
                    const response = await fetch(`/data/share_${shareId}.json`);
                    if (response.ok) {
                        const data = await response.json();
                        shareData = {
                            url: data.url || null,
                            title: data.title || null,
                            description: data.description || null,
                            image: data.image || null
                        };
                    }
                } catch (error) {
                    console.error('Error fetching from share file:', error);
                }
            }
            
            return shareData;
        } catch (error) {
            console.error('Error fetching share data:', error);
            return null;
        }
    }
    
    /**
     * Intercept the automatic redirect on the share page
     * @param {string} shareId - The share ID
     */
    function interceptRedirect(shareId) {
        try {
            // Look for redirect code in the page
            const scripts = document.querySelectorAll('script');
            let redirectScriptFound = false;
            
            // Check if any script contains redirect code
            scripts.forEach(script => {
                const content = script.textContent;
                if (content && content.includes('setTimeout') && content.includes('window.location')) {
                    redirectScriptFound = true;
                }
            });
            
            if (redirectScriptFound) {
                debugLog('Redirect script found, will intercept');
                
                // Override setTimeout to intercept the redirect
                const originalSetTimeout = window.setTimeout;
                window.setTimeout = function(callback, timeout) {
                    // If this is a redirect (contains window.location), replace it
                    if (typeof callback === 'function' && timeout >= 3000) {
                        const callbackStr = callback.toString();
                        if (callbackStr.includes('window.location')) {
                            debugLog('Intercepted redirect, will use corrected URL');
                            
                            // Instead, use our own redirect logic
                            return originalSetTimeout(() => {
                                // Find a valid article URL
                                const readButton = document.querySelector('.button:first-child');
                                if (readButton && readButton.getAttribute('href') && readButton.getAttribute('href') !== '#') {
                                    window.location.href = readButton.getAttribute('href');
                                } else {
                                    // If we don't have a URL yet, try to fetch it
                                    fetchShareData(shareId).then(shareData => {
                                        if (shareData && shareData.url) {
                                            window.location.href = shareData.url;
                                        }
                                    });
                                }
                            }, timeout);
                        }
                    }
                    
                    // Otherwise, use the original setTimeout
                    return originalSetTimeout(callback, timeout);
                };
            }
        } catch (error) {
            console.error('Error intercepting redirect:', error);
        }
    }

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
     * Generate a more reliable article ID from a URL
     * @param {string} url - Article URL
     * @returns {string} A more compact article ID
     */
    function generateArticleId(url, title = '') {
        if (!url) return 'unknown-article';
        
        // Create a deterministic hash from URL and title
        const str = url + title;
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        
        // Create parts of the ID using different sections of the hash
        const part1 = Math.abs(hash).toString(16).padStart(8, '0');
        const part2 = Math.abs(hash >> 8).toString(16).padStart(4, '0');
        const part3 = Math.abs(hash >> 16).toString(16).padStart(4, '0');
        const part4 = Math.abs(hash >> 24).toString(16).padStart(12, '0');
        
        // Combine into UUID-like format
        return `51-${part1}-${part2}-${part3}-${part4}`;
    }
    
    /**
     * Save an article to localStorage
     * @param {Object} article - Article object to save
     * @returns {boolean} Success status
     */
    function saveArticle(article) {
        try {
            debugLog('Saving article:', article);
            
            if (!article || !article.id) {
                console.error('Invalid article object, missing ID');
                return false;
            }
            
            // Ensure the article has all required fields to avoid "Unknown Source" issues
            const safeArticle = {
                id: article.id,
                title: article.title || 'Unknown Article',
                link: article.link || '#',
                description: article.description || '',
                source: article.source || 'Unknown Source',
                pubDate: article.pubDate || new Date().toISOString(),
                image: article.image || '',
                category: article.category || '',
                savedAt: new Date().toISOString()
            };
            
            debugLog('Prepared article with required fields:', safeArticle);
            
            // Get existing saved articles
            let savedArticles = getSavedArticles();
            
            // Check if already saved
            const existingIndex = savedArticles.findIndex(a => a.id === safeArticle.id);
            if (existingIndex >= 0) {
                // Already saved, update the timestamp
                savedArticles[existingIndex] = {
                    ...savedArticles[existingIndex],
                    ...safeArticle,
                    savedAt: new Date().toISOString()
                };
                localStorage.setItem(savedArticlesKey, JSON.stringify(savedArticles));
                return true;
            }
            
            // Add to saved articles
            savedArticles.push(safeArticle);
            
            // Limit number of saved articles (remove oldest first)
            if (savedArticles.length > maxSavedArticles) {
                savedArticles.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
                savedArticles = savedArticles.slice(0, maxSavedArticles);
            }
            
            // Save to localStorage
            localStorage.setItem(savedArticlesKey, JSON.stringify(savedArticles));
            debugLog('Article saved successfully');
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
                            articleId: generateArticleId(article.link),
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
        const baseUrl = window.location.href.split('?')[0]; // Remove existing query params
        
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
            // Check for article parameter in URL
            const urlParams = new URLSearchParams(window.location.search);
            const articleId = urlParams.get('article');
            
            // Also check for article in URL hash (for compatibility with share page)
            let hashArticleId = null;
            if (window.location.hash && window.location.hash.includes('article=')) {
                try {
                    hashArticleId = window.location.hash.split('article=')[1].split('&')[0];
                } catch (e) {
                    console.error('Error parsing hash article ID:', e);
                }
            }
            
            // Use query param first, then hash
            const effectiveArticleId = articleId || hashArticleId;
            
            if (!effectiveArticleId) {
                debugLog('No article ID found in URL');
                
                // Check if we came from a share page
                const referrer = document.referrer;
                debugLog('Referrer:', referrer);
                
                if (referrer && (referrer.includes('/share/') || referrer.includes('tennesseefeeds-api.onrender.com'))) {
                    debugLog('Detected navigation from share page');
                    
                    // Try to extract shareId from the referrer URL
                    try {
                        const shareId = referrer.split('/share/')[1]?.split('?')[0];
                        if (shareId) {
                            debugLog('Found share ID in referrer:', shareId);
                            
                            // Try to use this as article ID
                            const article = await fetchArticleById(shareId);
                            if (article) {
                                showArticleView(article);
                                return true;
                            }
                        }
                    } catch (e) {
                        console.error('Error extracting share ID from referrer:', e);
                    }
                }
                
                return false;
            }
            
            debugLog('Article URL detected:', effectiveArticleId);
            
            // Show a loading state for the article
            showArticleLoading();
            
            // Fetch the article from your API or from the main articles list
            const article = await fetchArticleById(effectiveArticleId);
            
            if (!article) {
                console.error('Article not found:', effectiveArticleId);
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
        
        loadingOverlay.style.display = 'flex';
    }
    
    /**
     * Hide loading state for article view
     */
    function hideArticleLoading() {
        const loadingOverlay = document.getElementById('article-loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }
    
    /**
     * Fetch an article by ID from the API or main articles list
     * Enhanced to better handle share IDs
     * @param {string} articleId - ID of the article to fetch
     * @returns {Promise<Object|null>} Article object or null if not found
     */
    async function fetchArticleById(articleId) {
        try {
            debugLog('Fetching article with ID:', articleId);
            
            // Clean up article ID (remove any query parameters, etc.)
            const cleanArticleId = decodeURIComponent(articleId.split('?')[0].split('&')[0]);
            debugLog('Cleaned article ID:', cleanArticleId);
            
            // First check in the cache and saved articles
            const savedArticles = getSavedArticles();
            const savedArticle = savedArticles.find(article => article.id === cleanArticleId);
            
            if (savedArticle) {
                debugLog('Found in saved articles:', savedArticle);
                return savedArticle;
            }
            
            // Try to find article in window.allArticles (if available)
            if (window.allArticles && Array.isArray(window.allArticles)) {
                debugLog('Checking allArticles array for article');
                
                // Try multiple matching methods
                const pageArticle = window.allArticles.find(article => {
                    // Method 1: Match against our generated ID
                    const generatedId = generateArticleId(article.link);
                    
                    // Method 2: Match against the raw link
                    const rawMatch = article.link === cleanArticleId;
                    
                    // Method 3: Match against the legacy ID format (replace non-alphanumeric with dash)
                    const legacyId = article.link ? article.link.replace(/[^a-zA-Z0-9]/g, '-') : '';
                    
                    // Method 4: If the article has an explicit ID field
                    const explicitId = article.id === cleanArticleId;
                    
                    return generatedId === cleanArticleId || rawMatch || legacyId === cleanArticleId || explicitId;
                });
                
                if (pageArticle) {
                    debugLog('Found in page articles:', pageArticle);
                    return {
                        id: generateArticleId(pageArticle.link),
                        title: pageArticle.title || 'Unknown Title',
                        link: pageArticle.link || '#',
                        description: pageArticle.description || '',
                        source: pageArticle.source || 'Unknown Source',
                        pubDate: pageArticle.pubDate || new Date().toISOString(),
                        image: pageArticle.image || '',
                        category: pageArticle.category || '',
                        region: pageArticle.region || ''
                    };
                }
            }
            
            // Since we don't have a real API endpoint yet, check cached articles
            debugLog('Checking localStorage cache for article');
            const cachedData = localStorage.getItem('tennesseefeeds_cache');
            if (cachedData) {
                try {
                    const data = JSON.parse(cachedData);
                    if (data.articles && Array.isArray(data.articles)) {
                        const cachedArticle = data.articles.find(article => {
                            // Try multiple matching methods (same as above)
                            const generatedId = generateArticleId(article.link);
                            const rawMatch = article.link === cleanArticleId;
                            const legacyId = article.link ? article.link.replace(/[^a-zA-Z0-9]/g, '-') : '';
                            const explicitId = article.id === cleanArticleId;
                            
                            return generatedId === cleanArticleId || rawMatch || legacyId === cleanArticleId || explicitId;
                        });
                        
                        if (cachedArticle) {
                            debugLog('Found in cached articles:', cachedArticle);
                            return {
                                id: generateArticleId(cachedArticle.link),
                                title: cachedArticle.title || 'Unknown Title',
                                link: cachedArticle.link || '#',
                                description: cachedArticle.description || '',
                                source: cachedArticle.source || 'Unknown Source',
                                pubDate: cachedArticle.pubDate || new Date().toISOString(),
                                image: cachedArticle.image || '',
                                category: cachedArticle.category || '',
                                region: cachedArticle.region || ''
                            };
                        }
                    }
                } catch (e) {
                    console.error('Error parsing cached articles:', e);
                }
            }
            
            // Try to fetch from API directly
            debugLog('Attempting to fetch from API directly');
            try {
                // First try the share endpoint since we might have a share ID
                const shareUrl = `https://tennesseefeeds-api.onrender.com/api/share/${cleanArticleId}`;
                debugLog('Fetching from share endpoint:', shareUrl);
                
                const shareResponse = await fetch(shareUrl);
                
                if (shareResponse.ok) {
                    const shareData = await shareResponse.json();
                    debugLog('Got share data:', shareData);
                    
                    if (shareData.success && shareData.share && shareData.share.article) {
                        const article = shareData.share.article;
                        
                        // Create a proper article object from the share data
                        return {
                            id: cleanArticleId,
                            title: article.title || 'Shared Article',
                            link: article.url || '#',
                            description: article.description || '',
                            source: article.source || 'Unknown Source',
                            pubDate: shareData.share.createdAt || new Date().toISOString(),
                            image: article.image_url || ''
                        };
                    }
                }
                
                // If share endpoint didn't work, try the general feeds API
                debugLog('Fetching from general feeds API');
                const feedsResponse = await fetch('https://tennesseefeeds-api.onrender.com/api/feeds');
                
                if (feedsResponse.ok) {
                    const feedsData = await feedsResponse.json();
                    
                    if (feedsData.success && feedsData.articles) {
                        // Try to find the article in the general feed
                        const matchingArticle = feedsData.articles.find(article => {
                            const generatedId = generateArticleId(article.link);
                            const legacyId = article.link ? article.link.replace(/[^a-zA-Z0-9]/g, '-') : '';
                            
                            return generatedId === cleanArticleId || legacyId === cleanArticleId || article.link === cleanArticleId;
                        });
                        
                        if (matchingArticle) {
                            debugLog('Found article in general feed:', matchingArticle);
                            return {
                                id: generateArticleId(matchingArticle.link),
                                title: matchingArticle.title,
                                link: matchingArticle.link,
                                description: matchingArticle.description,
                                source: matchingArticle.source,
                                pubDate: matchingArticle.pubDate,
                                image: matchingArticle.image,
                                category: matchingArticle.category,
                                region: matchingArticle.region
                            };
                        }
                    }
                }
            } catch (apiError) {
                console.error('API fetch error:', apiError);
            }
            
            // Special case: If this is a share ID, try to check if any article cards on the page
            // match it (they might have been added after initial page load)
            const articleElements = document.querySelectorAll(`[data-article-id="${cleanArticleId}"]`);
            debugLog('Found article elements on page:', articleElements.length);
            
            if (articleElements.length > 0) {
                // Extract data from the first matching element
                const articleCard = articleElements[0].closest('.article-card, .bg-white');
                if (articleCard) {
                    const extractedArticle = extractArticleData(articleCard);
                    if (extractedArticle) {
                        debugLog('Extracted article from DOM:', extractedArticle);
                        return extractedArticle;
                    }
                }
            }
            
            // For now, return a mock article if we can't find it elsewhere
            debugLog('Article not found, using default placeholder');
            return {
                id: cleanArticleId,
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
        articleView.style.display = 'block';
        
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
        
        // Share button - Use your existing share function if available
        document.getElementById('article-share-btn').addEventListener('click', () => {
            // Try to use the site's existing share function if it exists
            if (window.shareHandler) {
                window.shareHandler(article.link, article.title);
                return;
            }
            
            // Otherwise use our own implementation
            if (window.UserTracking && window.UserTracking.trackShare) {
                window.UserTracking.trackShare(article.id, 'web').then(shareUrl => {
                    if (shareUrl) {
                        navigator.clipboard.writeText(shareUrl).then(() => {
                            alert('Share link copied to clipboard: ' + shareUrl);
                        });
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
            articleView.style.display = 'none';
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
     * Extract all metadata from an article card
     * This is a more robust way to get article data from the DOM
     * @param {HTMLElement} articleCard - The article card element
     * @returns {Object} Article data object
     */
    function extractArticleData(articleCard) {
        if (!articleCard) {
            console.error('No article card provided');
            return null;
        }
        
        debugLog('Extracting data from article card:', articleCard);
        
        // Try to find article ID
        const articleContainer = articleCard.querySelector('[data-article-id]');
        const articleId = articleContainer ? articleContainer.dataset.articleId : null;
        
        if (!articleId) {
            console.error('No article ID found in card');
            return null;
        }
        
        // Find the link element
        const linkElement = articleCard.querySelector('h3 a, a.article-link');
        const link = linkElement ? linkElement.getAttribute('href') : '#';
        
        // Get title
        const title = linkElement ? linkElement.textContent.trim() : 'Unknown Article';
        
        // Get description - look for paragraph with line-clamp-3 class
        const description = articleCard.querySelector('p.line-clamp-3, p.text-neutral-600')?.textContent.trim() || '';
        
        // Get source - look for text-neutral-500 span
        const source = articleCard.querySelector('.text-sm.text-neutral-500')?.textContent.trim() || 'Unknown Source';
        
        // Get date from formatted-date element
        const dateElement = articleCard.querySelector('.formatted-date');
        const pubDate = dateElement ? dateElement.textContent.trim() : new Date().toISOString();
        
        // Get category from badge
        const categoryElement = articleCard.querySelector('.rounded-full.text-xs');
        const category = categoryElement ? categoryElement.textContent.trim() : '';
        
        // Get image if present
        const imageElement = articleCard.querySelector('img');
        const image = imageElement ? imageElement.src : '';
        
        // Build the article object
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
        
        debugLog('Extracted article data:', article);
        return article;
    }
    
    /**
     * Setup article saving functionality
     */
    function setupArticleSaving() {
        // Handle save button clicks (event delegation)
        document.addEventListener('click', function(event) {
            // Find the closest save button to the clicked element
            const saveButton = event.target.closest('.favorite-btn');
            if (!saveButton) return;
            
            debugLog('Save button clicked:', saveButton);
            
            // Prevent default behavior
            event.preventDefault();
            event.stopPropagation();
            
            // Get article ID from button
            const articleId = saveButton.dataset.articleId;
            if (!articleId) {
                console.error('No article ID found on save button');
                return;
            }
            
            debugLog('Clicked article ID:', articleId);
            
            // Skip if this is in the saved articles section
            if (saveButton.closest('#pinned-articles-grid')) {
                debugLog('Skipping save button in saved articles section');
                return;
            }
            
            // Get current save state
            const isSaved = isArticleSaved(articleId);
            debugLog('Article is currently saved:', isSaved);
            
            if (isSaved) {
                // Remove from saved
                debugLog('Removing saved article');
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
                const articleCard = saveButton.closest('.article-card, .bg-white');
                if (!articleCard) {
                    console.error('No article card found for save button');
                    return;
                }
                
                // Extract article data
                const article = extractArticleData(articleCard);
                
                if (!article) {
                    console.error('Failed to extract article data');
                    return;
                }
                
                // Add to saved
                debugLog('Saving article');
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
        debugLog('Initializing article system');
        
        // For share pages, fix the buttons (should already be done by the immediate execution function,
        // but this is a safety check)
        if (window.location.href.includes('/share/')) {
            fixSharePageButtons();
        }
        
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
                const href = articleLink.getAttribute('href');
                
                // Only handle internal links or links with data-article-id
                if (articleLink.dataset.articleId || (href && (href === '#' || href.startsWith('#') || href.includes('?article=')))) {
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
                                if (href && href !== '#') {
                                    window.location.href = href;
                                }
                            }
                        });
                    }
                }
            }
        });
        
        debugLog('Article system initialized');
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
        renderRecentlyShared,
        fetchArticleById, // Expose this publicly so other scripts can use it
        fixSharePageButtons, // Expose this so it can be called from other scripts if needed
    };
    
    // Initialize on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeArticleSystem);
    } else {
        initializeArticleSystem();
    }
})();
