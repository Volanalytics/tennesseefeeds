/**
 * Direct Article Share Fix
 */
(function() {
    console.log('[ShareFix] Loaded ' + new Date().toISOString());
    
    // Fix share pages immediately
    if (window.location.href.includes('/share/')) {
        fixSharePage();
        // Also run after a delay
        setTimeout(fixSharePage, 1000);
    }
    
    // Fix the UserTracking.trackShare function
    fixTrackShareFunction();
    
    /**
     * Fix the UserTracking.trackShare function by monitoring when it becomes available
     */
    function fixTrackShareFunction() {
        const checkInterval = setInterval(function() {
            if (window.UserTracking && window.UserTracking.trackShare) {
                clearInterval(checkInterval);
                
                // Save original function
                const originalTrackShare = window.UserTracking.trackShare;
                
                // Replace with our fixed version
                window.UserTracking.trackShare = function(articleId, platform) {
                    console.log('[ShareFix] trackShare called with ID:', articleId);
                    
                    // If articleId is invalid, find a better one
                    if (!articleId || articleId === '#') {
                        // Get article from current page
                        const articleView = document.getElementById('single-article-view');
                        if (articleView && articleView.style.display === 'block') {
                            // Use article title to create ID
                            const title = articleView.querySelector('h1')?.textContent.trim();
                            if (title) {
                                articleId = createIdFromTitle(title);
                                console.log('[ShareFix] Using ID from title:', articleId);
                            }
                            
                            // Use article link
                            const readBtn = articleView.querySelector('a[target="_blank"]');
                            if (readBtn && readBtn.href) {
                                articleId = readBtn.href;
                                console.log('[ShareFix] Using link as ID:', articleId);
                            }
                        }
                        
                        // If still invalid, use a random ID
                        if (!articleId || articleId === '#') {
                            articleId = 'article-' + Math.random().toString(36).substring(2, 10);
                            console.log('[ShareFix] Using random ID:', articleId);
                        }
                    }
                    
                    // Call original function with fixed ID
                    return originalTrackShare.call(this, articleId, platform);
                };
                
                console.log('[ShareFix] UserTracking.trackShare fixed');
            }
        }, 500);
        
        // Stop checking after 10 seconds
        setTimeout(function() {
            clearInterval(checkInterval);
        }, 10000);
    }
    
    /**
     * Fix buttons and redirect on share page
     */
    function fixSharePage() {
        try {
            // Get share ID from URL
            const shareId = window.location.pathname.split('/share/')[1]?.split('?')[0];
            if (!shareId) return;
            
            // Get article title
            const title = document.querySelector('h1')?.textContent.trim();
            if (!title) return;
            
            console.log('[ShareFix] Fixing share page:', title, shareId);
            
            // Fix TN button first
            const buttons = document.querySelectorAll('.buttons a, a.button, .button');
            buttons.forEach(button => {
                const text = button.textContent.toLowerCase();
                
                if (text.includes('tennessee') || text.includes('go to')) {
                    // Check if the URL contains template literals or is invalid
                    const href = button.getAttribute('href') || '';
                    
                    if (href.includes('${') || href === '#' || href.includes('?article=#')) {
                        console.log('[ShareFix] Found invalid TN button URL:', href);
                        
                        // Determine the correct base URL
                        let baseUrl = 'https://tennesseefeeds.com';
                        
                        // If it's dev.html, keep that in the URL
                        if (href.includes('dev.html')) {
                            baseUrl = 'https://tennesseefeeds.com/dev.html';
                        }
                        
                        // Create the fixed URL
                        const newUrl = `${baseUrl}?article=${shareId}`;
                        button.setAttribute('href', newUrl);
                        console.log('[ShareFix] Fixed TN button URL to:', newUrl);
                    } else {
                        console.log('[ShareFix] TN button URL already valid:', href);
                    }
                }
            });
            
            // Now search for actual article URL
            findArticleUrl(title).then(articleUrl => {
                if (!articleUrl) return;
                
                console.log('[ShareFix] Found actual article URL:', articleUrl);
                
                // Fix read button
                buttons.forEach(button => {
                    const text = button.textContent.toLowerCase();
                    if (text.includes('read') || text.includes('article')) {
                        button.setAttribute('href', articleUrl);
                        console.log('[ShareFix] Set read button URL:', articleUrl);
                    }
                });
                
                // Fix redirect
                fixRedirect(articleUrl);
            });
        } catch (error) {
            console.error('[ShareFix] Error fixing share page:', error);
        }
    }
    
    /**
     * Find real article URL by title
     */
    async function findArticleUrl(title) {
        if (!title) return null;
        
        try {
            // First try feeds API
            const response = await fetch('https://tennesseefeeds-api.onrender.com/api/feeds');
            if (response.ok) {
                const data = await response.json();
                
                if (data.success && data.articles) {
                    // Look for article with similar title
                    const normalizedTitle = title.toLowerCase().trim();
                    
                    for (const article of data.articles) {
                        if (!article.title) continue;
                        
                        const articleTitle = article.title.toLowerCase().trim();
                        
                        // Check for substantial overlap in titles
                        if (articleTitle.includes(normalizedTitle) || 
                            normalizedTitle.includes(articleTitle) ||
                            calculateSimilarity(articleTitle, normalizedTitle) > 0.7) {
                            
                            console.log('[ShareFix] Found matching article:', article.title);
                            return article.link;
                        }
                    }
                }
            }
            
            return null;
        } catch (error) {
            console.error('[ShareFix] Error finding article URL:', error);
            return null;
        }
    }
    
    /**
     * Fix automatic redirect
     */
    function fixRedirect(url) {
        if (!url) return;
        
        try {
            // Override setTimeout to intercept redirects
            const originalSetTimeout = window.setTimeout;
            window.setTimeout = function(callback, timeout) {
                if (typeof callback === 'function' && timeout >= 3000) {
                    const callbackStr = callback.toString();
                    
                    if (callbackStr.includes('window.location') || 
                        callbackStr.includes('redirect')) {
                        
                        console.log('[ShareFix] Intercepting redirect');
                        
                        return originalSetTimeout(function() {
                            console.log('[ShareFix] Redirecting to:', url);
                            window.location.href = url;
                        }, timeout);
                    }
                }
                
                return originalSetTimeout(callback, timeout);
            };
        } catch (error) {
            console.error('[ShareFix] Error fixing redirect:', error);
        }
    }
    
    /**
     * Create ID from title
     */
    function createIdFromTitle(title) {
        return title.toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-');
    }
    
    /**
     * Calculate text similarity
     */
    function calculateSimilarity(str1, str2) {
        // Simple Jaccard similarity of words
        const words1 = new Set(str1.split(/\s+/));
        const words2 = new Set(str2.split(/\s+/));
        
        // Find intersection and union
        const intersection = new Set([...words1].filter(x => words2.has(x)));
        const union = new Set([...words1, ...words2]);
        
        return intersection.size / union.size;
    }
})();
