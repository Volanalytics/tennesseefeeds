/**
 * Comprehensive button and sharing fix for TennesseeFeeds
 * Add to article-system.js or include as a separate script
 */
(function() {
    console.log('[ShareFix] Script loaded');
    
    // PART 1: Fix share buttons on share landing pages
    // Execute immediately if we're on a share page
    if (window.location.href.includes('/share/')) {
        console.log('[ShareFix] Share page detected, will fix buttons');
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', fixSharePageButtons);
        } else {
            fixSharePageButtons();
        }
        setTimeout(fixSharePageButtons, 1000); // Run again after a delay
    }
    
    // PART 2: Overriding the share tracking functionality to prevent bad URLs
    // This fixes the issue at its source by ensuring proper data is sent
    overrideShareTracking();
    
    /**
     * Fix share page buttons by extracting and setting proper URLs
     */
    function fixSharePageButtons() {
        try {
            console.log('[ShareFix] Fixing share buttons');
            
            // Extract share ID from URL
            const shareId = window.location.pathname.split('/share/')[1]?.split('?')[0]?.split('#')[0];
            if (!shareId) {
                console.log('[ShareFix] No share ID found in URL');
                return;
            }
            
            console.log('[ShareFix] Share ID:', shareId);
            
            // Try to find the real article URL
            let articleUrl = findArticleUrl();
            console.log('[ShareFix] Found article URL:', articleUrl);
            
            // Fix Read Article button
            const readButton = findButtonByText(['read', 'article', 'full']);
            if (readButton) {
                const currentHref = readButton.getAttribute('href') || '';
                if (currentHref === '#' || currentHref.includes('/share/')) {
                    if (articleUrl) {
                        console.log('[ShareFix] Setting Read button href to:', articleUrl);
                        readButton.setAttribute('href', articleUrl);
                        readButton.onclick = function(e) {
                            // Prevent default only if we're going to redirect
                            if (articleUrl) {
                                e.preventDefault();
                                window.location.href = articleUrl;
                            }
                        };
                    } else {
                        // Try to find the URL from the page text
                        const extractedUrl = extractUrlFromText();
                        if (extractedUrl) {
                            console.log('[ShareFix] Setting Read button href to extracted URL:', extractedUrl);
                            readButton.setAttribute('href', extractedUrl);
                        }
                    }
                }
            }
            
            // Fix TennesseeFeeds button
            const tnButton = findButtonByText(['tennessee', 'go to']);
            if (tnButton) {
                const currentHref = tnButton.getAttribute('href') || '';
                
                // Create a proper TennesseeFeeds URL
                let baseUrl = 'https://tennesseefeeds.com';
                
                // Keep the current domain if it's already set
                if (currentHref.startsWith('http')) {
                    try {
                        const url = new URL(currentHref);
                        baseUrl = url.origin;
                    } catch (e) {}
                }
                
                // Add the proper article parameter
                const newUrl = `${baseUrl}/?article=${encodeURIComponent(shareId)}`;
                
                // Only update if the current URL is broken
                if (currentHref === '#' || 
                    currentHref.includes('?article=#') || 
                    currentHref.endsWith('?article=')) {
                    console.log('[ShareFix] Setting TN button href from', currentHref, 'to', newUrl);
                    tnButton.setAttribute('href', newUrl);
                }
            }
            
            // Fix auto-redirect
            fixRedirect(articleUrl);
            
        } catch (error) {
            console.error('[ShareFix] Error fixing share buttons:', error);
        }
    }
    
    /**
     * Find a button by its text content (matches any of the provided terms)
     */
    function findButtonByText(terms) {
        // Look for buttons and links
        const buttons = document.querySelectorAll('.button, a.button, .buttons a');
        for (const button of buttons) {
            const text = button.textContent.toLowerCase().trim();
            if (terms.some(term => text.includes(term))) {
                return button;
            }
        }
        
        // Fallback to any link that might be a button
        const links = document.querySelectorAll('a');
        for (const link of links) {
            const text = link.textContent.toLowerCase().trim();
            if (terms.some(term => text.includes(term))) {
                return link;
            }
        }
        
        return null;
    }
    
    /**
     * Find the article URL from page elements 
     */
    function findArticleUrl() {
        try {
            // Method 1: Check page metadata
            const metaTags = document.querySelectorAll('meta[property="og:url"], meta[name="twitter:url"]');
            for (const tag of metaTags) {
                const content = tag.getAttribute('content');
                if (content && !content.includes('/share/')) {
                    return content;
                }
            }
            
            // Method 2: Check for title and try to find the article
            const title = document.querySelector('h1')?.textContent.trim();
            if (title) {
                console.log('[ShareFix] Article title:', title);
                // If we have the title, try a search API call
                searchForArticle(title).then(url => {
                    if (url) {
                        // Update Read button with this URL
                        const readButton = findButtonByText(['read', 'article', 'full']);
                        if (readButton) {
                            console.log('[ShareFix] Updating Read button with search result:', url);
                            readButton.setAttribute('href', url);
                        }
                    }
                });
            }
            
            // Method 3: Try to extract URL from description text
            const description = document.querySelector('.description');
            if (description) {
                const text = description.textContent;
                const urlMatch = /https?:\/\/[^\s"']+/.exec(text);
                if (urlMatch) {
                    return urlMatch[0];
                }
            }
            
            // Method 4: Try redirect script
            const redirectUrl = extractRedirectUrl();
            if (redirectUrl && redirectUrl !== '#') {
                return redirectUrl;
            }
            
            return null;
        } catch (error) {
            console.error('[ShareFix] Error finding article URL:', error);
            return null;
        }
    }
    
    /**
     * Try to find a valid URL in any text content on the page
     */
    function extractUrlFromText() {
        // Get all text nodes
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
        
        // Check each text node for URLs
        for (const node of textNodes) {
            const text = node.textContent;
            const urlMatch = /https?:\/\/[^\s"']+/.exec(text);
            if (urlMatch && !urlMatch[0].includes('/share/')) {
                return urlMatch[0];
            }
        }
        
        return null;
    }
    
    /**
     * Try to extract the redirect URL from script tags
     */
    function extractRedirectUrl() {
        const scripts = document.querySelectorAll('script');
        for (const script of scripts) {
            const content = script.textContent;
            if (content && content.includes('window.location') && content.includes('redirect')) {
                const urlMatch = /window\.location\.href\s*=\s*["']([^"']+)["']/.exec(content);
                if (urlMatch && urlMatch[1] && urlMatch[1] !== '#') {
                    return urlMatch[1];
                }
            }
        }
        return null;
    }
    
    /**
     * Fix the automatic redirect
     */
    function fixRedirect(articleUrl) {
        if (!articleUrl || articleUrl === '#') {
            return;
        }
        
        const originalSetTimeout = window.setTimeout;
        window.setTimeout = function(callback, timeout) {
            // Look for setTimeout calls that might be redirects
            if (typeof callback === 'function' && timeout >= 2000) {
                const callbackStr = callback.toString();
                if (callbackStr.includes('window.location') || callbackStr.includes('redirect')) {
                    console.log('[ShareFix] Intercepting redirect setTimeout');
                    
                    return originalSetTimeout(function() {
                        console.log('[ShareFix] Redirecting to:', articleUrl);
                        window.location.href = articleUrl;
                    }, timeout);
                }
            }
            
            return originalSetTimeout(callback, timeout);
        };
    }
    
    /**
     * Search for an article by title to get its URL
     */
    async function searchForArticle(title) {
        try {
            // Simple search using the API
            const response = await fetch(`https://tennesseefeeds-api.onrender.com/api/feeds`);
            if (!response.ok) {
                return null;
            }
            
            const data = await response.json();
            if (!data.success || !data.articles) {
                return null;
            }
            
            // Find an article with a matching title
            const normalizedTitle = title.toLowerCase().trim();
            const matchingArticle = data.articles.find(article => {
                const articleTitle = (article.title || '').toLowerCase().trim();
                return articleTitle.includes(normalizedTitle) || 
                      normalizedTitle.includes(articleTitle);
            });
            
            if (matchingArticle && matchingArticle.link) {
                console.log('[ShareFix] Found matching article:', matchingArticle.title);
                return matchingArticle.link;
            }
            
            return null;
        } catch (error) {
            console.error('[ShareFix] Error searching for article:', error);
            return null;
        }
    }
    
    /**
     * Override the share tracking to prevent bad URLs
     */
    function overrideShareTracking() {
        try {
            // Check if UserTracking exists
            if (!window.UserTracking) {
                console.log('[ShareFix] UserTracking not available yet, will wait');
                // Try again later
                setTimeout(overrideShareTracking, 1000);
                return;
            }
            
            // Save reference to the original function
            const originalTrackShare = window.UserTracking.trackShare;
            
            // Override the function
            window.UserTracking.trackShare = async function(articleId, platform) {
                console.log('[ShareFix] trackShare called with ID:', articleId);
                
                // Fix articleId if it's invalid
                if (!articleId || articleId === '#') {
                    console.log('[ShareFix] Fixing invalid articleId');
                    
                    // Try to get a better ID from the URL or page content
                    const betterArticleId = await getBetterArticleId();
                    if (betterArticleId) {
                        console.log('[ShareFix] Using better articleId:', betterArticleId);
                        articleId = betterArticleId;
                    }
                }
                
                // Call the original trackShare with the fixed ID
                return originalTrackShare.call(window.UserTracking, articleId, platform);
            };
            
            // Also fix the server-side share tracking API if it's directly used
            const originalFetch = window.fetch;
            window.fetch = async function(url, options) {
                // Check if this is a share tracking API call
                if (url && typeof url === 'string' && url.includes('/api/track-share')) {
                    console.log('[ShareFix] Intercepting track-share API call');
                    
                    try {
                        // Get the request body
                        const requestBody = options && options.body ? JSON.parse(options.body) : {};
                        
                        // Fix articleId if invalid
                        if (!requestBody.articleId || requestBody.articleId === '#') {
                            console.log('[ShareFix] API call has invalid articleId:', requestBody.articleId);
                            
                            const betterArticleId = await getBetterArticleId();
                            if (betterArticleId) {
                                console.log('[ShareFix] Setting better articleId in API call:', betterArticleId);
                                requestBody.articleId = betterArticleId;
                                
                                // Update the options with the fixed body
                                options.body = JSON.stringify(requestBody);
                            }
                        }
                        
                        // If we have a title but no URL, try to find the URL
                        if (requestBody.title && (!requestBody.url || requestBody.url === '#')) {
                            console.log('[ShareFix] API call has title but invalid URL:', requestBody.title);
                            
                            const articleUrl = await searchForArticle(requestBody.title);
                            if (articleUrl) {
                                console.log('[ShareFix] Setting better URL in API call:', articleUrl);
                                requestBody.url = articleUrl;
                                
                                // Update the options with the fixed body
                                options.body = JSON.stringify(requestBody);
                            }
                        }
                    } catch (e) {
                        console.error('[ShareFix] Error fixing track-share API call:', e);
                    }
                }
                
                // Call original fetch with possibly modified options
                return originalFetch.apply(window, arguments);
            };
            
            console.log('[ShareFix] Share tracking overridden successfully');
        } catch (error) {
            console.error('[ShareFix] Error overriding share tracking:', error);
        }
    }
    
    /**
     * Get a better article ID from the page or URL
     */
    async function getBetterArticleId() {
        try {
            // Try to get from current article view
            const articleView = document.getElementById('single-article-view');
            if (articleView) {
                const commentSection = articleView.querySelector('.comments-section');
                if (commentSection && commentSection.dataset.articleId) {
                    return commentSection.dataset.articleId;
                }
            }
            
            // Try to get from URL parameters
            const urlParams = new URLSearchParams(window.location.search);
            const articleParam = urlParams.get('article');
            if (articleParam) {
                return articleParam;
            }
            
            // Try to get from active element with article ID
            const articleElements = document.querySelectorAll('[data-article-id]');
            if (articleElements.length > 0) {
                return articleElements[0].dataset.articleId;
            }
            
            // If we have window.allArticles, try to get the first article's ID
            if (window.allArticles && window.allArticles.length > 0) {
                const firstArticle = window.allArticles[0];
                if (firstArticle.link) {
                    return generateArticleId(firstArticle.link);
                }
            }
            
            return null;
        } catch (error) {
            console.error('[ShareFix] Error getting better article ID:', error);
            return null;
        }
    }
    
    /**
     * Generate an article ID from a URL
     */
    function generateArticleId(url) {
        if (!url) return null;
        
        try {
            // Remove query parameters and hash
            const cleanUrl = url.split('?')[0].split('#')[0];
            // Split by slashes and get the last non-empty segment
            const segments = cleanUrl.split('/').filter(s => s.trim() !== '');
            if (segments.length > 0) {
                return segments[segments.length - 1].replace(/[^a-zA-Z0-9]/g, '-').substring(0, 50);
            }
        } catch (e) {}
        
        // Fallback: use a hash of the URL
        let hash = 0;
        for (let i = 0; i < url.length; i++) {
            hash = ((hash << 5) - hash) + url.charCodeAt(i);
            hash = hash & hash; // Convert to 32bit integer
        }
        return 'article-' + Math.abs(hash).toString(36).substring(0, 8);
    }
})();
