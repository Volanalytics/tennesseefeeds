/**
 * Targeted Share Fix for TennesseeFeeds
 * 
 * This script specifically fixes the sharing functionality and button URLs
 * on the TennesseeFeeds website. It addresses two critical issues:
 * 
 * 1. Prevents sending invalid article IDs and URLs when creating shares
 * 2. Fixes broken buttons on share landing pages
 */
(function() {
    console.log('[ShareFix] Script loaded at', new Date().toISOString());
    
    // Fix share page buttons if we're on a share page
    if (location.href.includes('/share/')) {
        console.log('[ShareFix] Detected share page, will fix buttons');
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', fixSharePageButtons);
        } else {
            fixSharePageButtons();
        }
        setTimeout(fixSharePageButtons, 1000); // Run again after a delay
    }
    
    // Fix the article sharing functionality at its source
    fixArticleSharing();
    
    /**
     * Core function to fix share page buttons
     */
    function fixSharePageButtons() {
        try {
            console.log('[ShareFix] Running button fix for share page');
            
            // Get the share ID from the URL
            const shareId = location.pathname.split('/share/')[1]?.split('?')[0]?.split('#')[0];
            if (!shareId) {
                console.log('[ShareFix] No share ID found in URL');
                return;
            }
            
            console.log('[ShareFix] Share ID:', shareId);
            
            // Get the article title from the page
            const articleTitle = document.querySelector('h1')?.textContent.trim();
            console.log('[ShareFix] Article title:', articleTitle);
            
            // Get the article source
            const sourceElement = document.querySelector('.source');
            const articleSource = sourceElement ? sourceElement.textContent.replace('Source:', '').trim() : null;
            console.log('[ShareFix] Article source:', articleSource);
            
            // Try to find a proper article URL
            findArticleUrl(articleTitle, articleSource, shareId).then(articleUrl => {
                console.log('[ShareFix] Found article URL:', articleUrl);
                
                if (articleUrl && articleUrl !== '#') {
                    // Fix the Read Full Article button
                    const readButtons = document.querySelectorAll('.buttons a, a.button');
                    let readButton = null;
                    
                    for (const button of readButtons) {
                        const text = button.textContent.trim().toLowerCase();
                        if (text.includes('read') || text.includes('article')) {
                            readButton = button;
                            break;
                        }
                    }
                    
                    if (readButton) {
                        const currentHref = readButton.getAttribute('href');
                        console.log('[ShareFix] Read button current href:', currentHref);
                        
                        if (currentHref === '#' || currentHref.includes('/share/')) {
                            console.log('[ShareFix] Fixing Read button href to:', articleUrl);
                            readButton.setAttribute('href', articleUrl);
                        }
                    }
                    
                    // Fix the auto-redirect
                    fixRedirect(articleUrl);
                }
                
                // Fix the TennesseeFeeds button regardless of article URL
                const buttons = document.querySelectorAll('.buttons a, a.button');
                let tnButton = null;
                
                for (const button of buttons) {
                    const text = button.textContent.trim().toLowerCase();
                    if (text.includes('tennessee') || text.includes('go to')) {
                        tnButton = button;
                        break;
                    }
                }
                
                if (tnButton) {
                    const currentHref = tnButton.getAttribute('href');
                    console.log('[ShareFix] TN button current href:', currentHref);
                    
                    // Only fix if the URL is broken
                    if (currentHref === '#' || 
                        currentHref.includes('?article=#') || 
                        currentHref.endsWith('?article=')) {
                        
                        // Keep the base part of the URL if it exists
                        let baseUrl = 'https://tennesseefeeds.com';
                        if (currentHref && currentHref.startsWith('http')) {
                            const urlObj = new URL(currentHref);
                            baseUrl = urlObj.origin + urlObj.pathname.split('?')[0];
                        }
                        
                        // Create the correct URL with the share ID
                        const newUrl = `${baseUrl}?article=${encodeURIComponent(shareId)}`;
                        console.log('[ShareFix] Setting TN button href to:', newUrl);
                        tnButton.setAttribute('href', newUrl);
                    }
                }
            });
            
        } catch (error) {
            console.error('[ShareFix] Error fixing share page buttons:', error);
        }
    }
    
    /**
     * Find a valid article URL
     * @param {string} title - The article title
     * @param {string} source - The article source
     * @param {string} shareId - The share ID
     * @returns {Promise<string>} The article URL or null
     */
    async function findArticleUrl(title, source, shareId) {
        try {
            // Method 1: Check meta tags for URL
            const metaTags = document.querySelectorAll('meta[property="og:url"], meta[name="twitter:url"]');
            for (const tag of metaTags) {
                const content = tag.getAttribute('content');
                if (content && content !== '#' && !content.includes('/share/')) {
                    return content;
                }
            }
            
            // Method 2: Extract URL from the page content
            const textNodes = [];
            const walker = document.createTreeWalker(
                document.body,
                NodeFilter.SHOW_TEXT,
                null,
                false
            );
            
            let node;
            while (node = walker.nextNode()) {
                textNodes.push(node);
            }
            
            for (const node of textNodes) {
                const text = node.textContent;
                const urlMatch = /https?:\/\/[^\s"']+/.exec(text);
                if (urlMatch && !urlMatch[0].includes('/share/')) {
                    return urlMatch[0];
                }
            }
            
            // Method 3: Try to get the article via the API using the title and source
            if (title) {
                const apiUrl = `https://tennesseefeeds-api.onrender.com/api/feeds`;
                try {
                    const response = await fetch(apiUrl);
                    if (response.ok) {
                        const data = await response.json();
                        if (data.success && data.articles && Array.isArray(data.articles)) {
                            // Find an article with matching title and source
                            const matchingArticle = data.articles.find(article => {
                                const titleMatch = article.title && 
                                    (article.title.includes(title) || title.includes(article.title));
                                const sourceMatch = article.source && source && 
                                    (article.source.includes(source) || source.includes(article.source));
                                
                                return titleMatch && (source ? sourceMatch : true);
                            });
                            
                            if (matchingArticle && matchingArticle.link) {
                                return matchingArticle.link;
                            }
                        }
                    }
                } catch (error) {
                    console.error('[ShareFix] Error fetching articles from API:', error);
                }
            }
            
            // Method 4: Try to get the share data directly
            try {
                const shareDataUrl = `https://tennesseefeeds-api.onrender.com/api/share/${shareId}`;
                const shareResponse = await fetch(shareDataUrl);
                if (shareResponse.ok) {
                    const shareData = await shareResponse.json();
                    if (shareData.success && shareData.share && shareData.share.article && shareData.share.article.url) {
                        return shareData.share.article.url;
                    }
                }
            } catch (error) {
                console.error('[ShareFix] Error fetching share data:', error);
            }
            
            // Method 5: Extract URL from share file
            try {
                const shareFileUrl = `/data/share_${shareId}.json`;
                const fileResponse = await fetch(shareFileUrl);
                if (fileResponse.ok) {
                    const fileData = await fileResponse.json();
                    if (fileData.url && fileData.url !== '#') {
                        return fileData.url;
                    }
                }
            } catch (error) {
                // This is expected to fail in most cases
            }
            
            return null;
        } catch (error) {
            console.error('[ShareFix] Error finding article URL:', error);
            return null;
        }
    }
    
    /**
     * Fix the automatic redirect script
     * @param {string} articleUrl - The URL to redirect to
     */
    function fixRedirect(articleUrl) {
        if (!articleUrl || articleUrl === '#') {
            return;
        }
        
        try {
            // Override setTimeout to catch the redirect
            const originalSetTimeout = window.setTimeout;
            window.setTimeout = function(callback, timeout) {
                // Only intercept setTimeout calls that look like redirects
                if (typeof callback === 'function' && timeout >= 3000) {
                    const callbackStr = callback.toString();
                    
                    // If this looks like a redirect function, replace it
                    if (callbackStr.includes('window.location')) {
                        console.log('[ShareFix] Intercepting redirect setTimeout with timeout:', timeout);
                        
                        // Return our own timeout with the correct URL
                        return originalSetTimeout(function() {
                            console.log('[ShareFix] Redirecting to article URL:', articleUrl);
                            window.location.href = articleUrl;
                        }, timeout);
                    }
                }
                
                // Otherwise use the original setTimeout
                return originalSetTimeout(callback, timeout);
            };
        } catch (error) {
            console.error('[ShareFix] Error fixing redirect:', error);
        }
    }
    
    /**
     * Fix the article sharing functionality at its source
     * This prevents invalid article IDs and URLs from being sent to the server
     */
    function fixArticleSharing() {
        try {
            // Fix UserTracking.trackShare if it exists or when it becomes available
            if (window.UserTracking && window.UserTracking.trackShare) {
                fixTrackShareFunction();
            } else {
                // Wait for UserTracking to become available
                const checkInterval = setInterval(function() {
                    if (window.UserTracking && window.UserTracking.trackShare) {
                        clearInterval(checkInterval);
                        fixTrackShareFunction();
                    }
                }, 500);
                
                // Stop checking after 10 seconds
                setTimeout(function() {
                    clearInterval(checkInterval);
                }, 10000);
            }
            
            // Fix direct API calls to track-share endpoint
            const originalFetch = window.fetch;
            window.fetch = function(url, options) {
                // Check if this is a share tracking API call
                if (url && typeof url === 'string' && url.includes('/api/track-share')) {
                    console.log('[ShareFix] Intercepting track-share API call');
                    
                    if (options && options.body) {
                        try {
                            // Parse the request body
                            const requestBody = JSON.parse(options.body);
                            
                            // Fix invalid article ID
                            if (!requestBody.articleId || requestBody.articleId === '#') {
                                console.log('[ShareFix] API call has invalid articleId:', requestBody.articleId);
                                
                                // Find a better article ID
                                const articleId = getCurrentArticleId();
                                if (articleId) {
                                    console.log('[ShareFix] Setting better articleId in API call:', articleId);
                                    requestBody.articleId = articleId;
                                }
                            }
                            
                            // Fix invalid URL
                            if (!requestBody.url || requestBody.url === '#') {
                                console.log('[ShareFix] API call has invalid URL');
                                
                                // Find a better URL
                                const articleUrl = getCurrentArticleUrl();
                                if (articleUrl) {
                                    console.log('[ShareFix] Setting better URL in API call:', articleUrl);
                                    requestBody.url = articleUrl;
                                }
                            }
                            
                            // Update the request options with the fixed body
                            options.body = JSON.stringify(requestBody);
                        } catch (error) {
                            console.error('[ShareFix] Error fixing API call body:', error);
                        }
                    }
                }
                
                // Call the original fetch
                return originalFetch.apply(window, arguments);
            };
            
            // Fix any share buttons
            document.addEventListener('click', function(e) {
                const shareButton = e.target.closest('.share-btn, [data-action="share"]');
                if (shareButton) {
                    const articleCard = shareButton.closest('[data-article-id]');
                    if (articleCard && articleCard.dataset.articleId === '#') {
                        // Prevent the default action
                        e.preventDefault();
                        e.stopPropagation();
                        
                        // Get a better article ID
                        const betterArticleId = getBetterArticleIdFromCard(articleCard);
                        if (betterArticleId) {
                            // Update the article ID in the DOM
                            articleCard.dataset.articleId = betterArticleId;
                            if (shareButton.dataset.articleId) {
                                shareButton.dataset.articleId = betterArticleId;
                            }
                            
                            // Now trigger the share action again
                            setTimeout(function() {
                                shareButton.click();
                            }, 10);
                        }
                    }
                }
            }, true);
            
            console.log('[ShareFix] Article sharing functionality fixed');
        } catch (error) {
            console.error('[ShareFix] Error fixing article sharing:', error);
        }
    }
    
    /**
     * Fix the UserTracking.trackShare function
     */
    function fixTrackShareFunction() {
        // Save reference to the original function
        const originalTrackShare = window.UserTracking.trackShare;
        
        // Replace with our fixed version
        window.UserTracking.trackShare = async function(articleId, platform) {
            console.log('[ShareFix] trackShare called with ID:', articleId);
            
            // Fix invalid article ID
            if (!articleId || articleId === '#') {
                console.log('[ShareFix] Invalid articleId detected, fixing...');
                
                // Get a better article ID
                const betterArticleId = getCurrentArticleId();
                if (betterArticleId) {
                    console.log('[ShareFix] Using better articleId:', betterArticleId);
                    articleId = betterArticleId;
                }
            }
            
            // Call the original function with the fixed article ID
            return originalTrackShare.call(this, articleId, platform);
        };
        
        console.log('[ShareFix] UserTracking.trackShare function fixed');
    }
    
    /**
     * Get the current article ID from the page context
     * @returns {string} A valid article ID or null
     */
    function getCurrentArticleId() {
        try {
            // Method 1: Check URL parameters
            const urlParams = new URLSearchParams(window.location.search);
            const articleParam = urlParams.get('article');
            if (articleParam && articleParam !== '#') {
                return articleParam;
            }
            
            // Method 2: Check for article view
            const articleView = document.getElementById('single-article-view');
            if (articleView && articleView.style.display !== 'none') {
                const commentsSection = articleView.querySelector('.comments-section[data-article-id]');
                if (commentsSection && commentsSection.dataset.articleId !== '#') {
                    return commentsSection.dataset.articleId;
                }
            }
            
            // Method 3: Check for visible article cards
            const articleCards = document.querySelectorAll('[data-article-id]');
            for (const card of articleCards) {
                if (card.dataset.articleId && card.dataset.articleId !== '#' && isVisible(card)) {
                    return card.dataset.articleId;
                }
            }
            
            // Method 4: Check for any article ID regardless of visibility
            for (const card of articleCards) {
                if (card.dataset.articleId && card.dataset.articleId !== '#') {
                    return card.dataset.articleId;
                }
            }
            
            // Method 5: Try to generate an ID from the current URL
            const currentUrl = window.location.href;
            return generateArticleId(currentUrl);
        } catch (error) {
            console.error('[ShareFix] Error getting current article ID:', error);
            return null;
        }
    }
    
    /**
     * Get the current article URL from the page context
     * @returns {string} A valid article URL or null
     */
    function getCurrentArticleUrl() {
        try {
            // Method 1: Check for article view
            const articleView = document.getElementById('single-article-view');
            if (articleView && articleView.style.display !== 'none') {
                const readButton = articleView.querySelector('a[target="_blank"]');
                if (readButton && readButton.getAttribute('href') && readButton.getAttribute('href') !== '#') {
                    return readButton.getAttribute('href');
                }
            }
            
            // Method 2: Check active article card
            const activeCard = document.querySelector('[data-article-id]:hover, [data-article-id]:focus');
            if (activeCard) {
                const link = activeCard.querySelector('h3 a');
                if (link && link.getAttribute('href') && link.getAttribute('href') !== '#') {
                    return link.getAttribute('href');
                }
            }
            
            // Method 3: Check any visible article card
            const articleCards = document.querySelectorAll('[data-article-id]');
            for (const card of articleCards) {
                if (isVisible(card)) {
                    const link = card.querySelector('h3 a');
                    if (link && link.getAttribute('href') && link.getAttribute('href') !== '#') {
                        return link.getAttribute('href');
                    }
                }
            }
            
            // Method 4: Use current URL if it's not tennesseefeeds.com
            const currentUrl = window.location.href;
            if (!currentUrl.includes('tennesseefeeds.com')) {
                return currentUrl;
            }
            
            return null;
        } catch (error) {
            console.error('[ShareFix] Error getting current article URL:', error);
            return null;
        }
    }
    
    /**
     * Get a better article ID from an article card
     * @param {HTMLElement} card - The article card element
     * @returns {string} A valid article ID or null
     */
    function getBetterArticleIdFromCard(card) {
        try {
            // Try to get the link
            const link = card.querySelector('h3 a');
            if (link && link.getAttribute('href') && link.getAttribute('href') !== '#') {
                return generateArticleId(link.getAttribute('href'));
            }
            
            // Try to use the article title
            const title = link ? link.textContent.trim() : null;
            if (title) {
                return generateArticleId(title);
            }
            
            return 'article-' + Math.random().toString(36).substring(2, 10);
        } catch (error) {
            console.error('[ShareFix] Error getting better article ID from card:', error);
            return null;
        }
    }
    
    /**
     * Generate an article ID from a URL or title
     * @param {string} input - URL or title to generate ID from
     * @returns {string} A valid article ID
     */
    function generateArticleId(input) {
        if (!input) return 'unknown-article';
        
        try {
            // For URLs: extract the last path segment
            if (input.startsWith('http')) {
                // Remove query parameters and hash
                const cleanUrl = input.split('?')[0].split('#')[0];
                // Split by slashes and get the last non-empty segment
                const segments = cleanUrl.split('/').filter(s => s.trim() !== '');
                if (segments.length > 0) {
                    return segments[segments.length - 1].replace(/[^a-zA-Z0-9]/g, '-').substring(0, 50);
                }
            }
            
            // For titles or other strings, create a URL-friendly slug
            const slug = input
                .toLowerCase()
                .replace(/[^\w\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .substring(0, 50);
                
            if (slug && slug !== '-') {
                return slug;
            }
        } catch (e) {
            console.error('[ShareFix] Error generating article ID:', e);
        }
        
        // Fallback: use a hash of the input
        let hash = 0;
        for (let i = 0; i < input.length; i++) {
            hash = ((hash << 5) - hash) + input.charCodeAt(i);
            hash = hash & hash; // Convert to 32bit integer
        }
        return 'article-' + Math.abs(hash).toString(36).substring(0, 8);
    }
    
    /**
     * Check if an element is visible
     * @param {HTMLElement} element - The element to check
     * @returns {boolean} True if visible
     */
    function isVisible(element) {
        return element.offsetWidth > 0 && element.offsetHeight > 0;
    }
})();
