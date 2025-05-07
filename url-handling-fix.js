// Final URL Transformer for TennesseeFeeds
// This script ensures proper handling of article URLs for sharing and viewing

(function() {
    // Configuration
    const DEBUG = true; // Set to false in production
    
    /**
     * Debug logging function
     */
    function debugLog(...args) {
        if (DEBUG) {
            console.log('[URLTransformer]', ...args);
        }
    }
    
    /**
     * Convert dashed URL format to normal URL format
     * @param {string} dashedUrl - URL in dashed format (e.g., https---example--com-path)
     * @returns {string} - Normal URL format (e.g., https://example.com/path)
     */
    function dashedToNormal(dashedUrl) {
        if (!dashedUrl || typeof dashedUrl !== 'string') return dashedUrl;
        
        debugLog('Converting dashed to normal:', dashedUrl);
        
        try {
            // Step 1: Handle protocol
            let normalUrl = dashedUrl;
            
            if (normalUrl.startsWith('https---')) {
                normalUrl = 'https://' + normalUrl.substring(8);
            } else if (normalUrl.startsWith('http---')) {
                normalUrl = 'http://' + normalUrl.substring(7);
            }
            
            // Step 2: Find all double dashes (which represent dots)
            const parts = normalUrl.split('--');
            
            // If there are no double dashes, this might be a incorrectly converted URL already
            if (parts.length <= 1 && normalUrl.includes('/')) {
                // Try to fix obviously incorrect domains like www/example/com
                normalUrl = normalUrl.replace(/www\/([^\/]+)\/com\//, 'www.$1.com/');
                normalUrl = normalUrl.replace(/\/com\//, '.com/');
                normalUrl = normalUrl.replace(/\/org\//, '.org/');
                normalUrl = normalUrl.replace(/\/net\//, '.net/');
                return normalUrl;
            }
            
            // Step 3: Process each part
            let result = parts[0]; // First part (has protocol)
            
            for (let i = 1; i < parts.length; i++) {
                const part = parts[i];
                
                // Look for first dash in this part (separates domain from path)
                const dashIndex = part.indexOf('-');
                
                if (dashIndex > -1) {
                    // This part contains both domain and path
                    const domainSegment = part.substring(0, dashIndex);
                    const pathSegment = part.substring(dashIndex + 1);
                    
                    // Add the domain segment with a dot
                    result += '.' + domainSegment;
                    
                    // Add the path with slashes
                    if (pathSegment) {
                        result += '/' + pathSegment.replace(/-/g, '/');
                    }
                } else {
                    // This is just a domain segment
                    result += '.' + part;
                }
            }
            
            // Step 4: Ensure proper formatting
            // Make sure protocol://domain structure is correct
            if (result.includes('://')) {
                const protocolParts = result.split('://');
                if (protocolParts.length === 2) {
                    // Fix cases where we might have extra dots after protocol
                    if (protocolParts[1].startsWith('.')) {
                        result = protocolParts[0] + '://' + protocolParts[1].substring(1);
                    }
                }
            }
            
            // Handle trailing slashes
            if (dashedUrl.endsWith('-') && !result.endsWith('/')) {
                result += '/';
            }
            
            debugLog('Converted result:', result);
            return result;
        } catch (error) {
            console.error('Error converting dashed URL:', error);
            
            // Fallback to a simple conversion
            try {
                let simpleResult = dashedUrl;
                
                // Replace https--- with https://
                simpleResult = simpleResult.replace(/^https---/, 'https://');
                
                // Replace http--- with http://
                simpleResult = simpleResult.replace(/^http---/, 'http://');
                
                // Replace all -- with .
                simpleResult = simpleResult.replace(/--/g, '.');
                
                // Replace remaining - with /
                simpleResult = simpleResult.replace(/-/g, '/');
                
                debugLog('Used simple fallback conversion:', simpleResult);
                return simpleResult;
            } catch (fallbackError) {
                console.error('Even fallback conversion failed:', fallbackError);
                return dashedUrl;
            }
        }
    }
    
    /**
     * Convert normal URL to dashed format
     * @param {string} url - Normal URL (e.g., https://example.com/path)
     * @returns {string} - Dashed format (e.g., https---example--com-path)
     */
    function normalToDashed(url) {
        if (!url || typeof url !== 'string') return url;
        
        debugLog('Converting normal to dashed:', url);
        
        try {
            let dashedUrl = url;
            
            // Handle protocol
            if (dashedUrl.startsWith('https://')) {
                dashedUrl = 'https---' + dashedUrl.substring(8);
            } else if (dashedUrl.startsWith('http://')) {
                dashedUrl = 'http---' + dashedUrl.substring(7);
            }
            
            // Replace dots with double dashes in domain part
            const parts = dashedUrl.split('/');
            if (parts.length > 0) {
                // The first part is the domain (with protocol)
                parts[0] = parts[0].replace(/\./g, '--');
                
                // Join with single dashes (for slashes)
                dashedUrl = parts.join('-');
            }
            
            // Ensure compatibility with database format
            // Replace any remaining dots or slashes
            dashedUrl = dashedUrl.replace(/\./g, '--');
            dashedUrl = dashedUrl.replace(/\//g, '-');
            
            debugLog('Converted to dashed format:', dashedUrl);
            return dashedUrl;
        } catch (error) {
            console.error('Error converting normal URL to dashed:', error);
            return url;
        }
    }
    
    /**
     * Get the base article ID from a URL or ID
     * This handles cases where the article ID was shortened
     * @param {string} id - Article ID or URL
     * @returns {string} - The base article ID
     */
    function getBaseArticleId(id) {
        if (!id) return id;
        
        // Check if this is an article ID without the full URL
        // In these cases, we need to ensure it's in the correct format for the database
        if (!id.includes('://') && !id.includes('---')) {
            // This might be a shortened ID like "steve-haley-district-11-robertson-county-commissio"
            // We need to use it as is, since it's in the correct format for the database
            debugLog('Using ID as is for database lookup:', id);
            return id;
        }
        
        // If it's a dashed URL, convert to normal
        if (id.includes('---')) {
            return dashedToNormal(id);
        }
        
        return id;
    }
    
    /**
     * Process URL parameters
     */
    function processUrlParameters() {
        try {
            debugLog('Processing URL parameters');
            
            // Check if we have an article parameter
            const urlParams = new URLSearchParams(window.location.search);
            const articleParam = urlParams.get('article');
            
            if (!articleParam) return;
            
            debugLog('Found article parameter:', articleParam);
            
            // Check if it needs conversion
            if (articleParam.includes('---') || articleParam.includes('//')) {
                const baseArticleId = getBaseArticleId(articleParam);
                
                // Only update if we made a change
                if (baseArticleId !== articleParam) {
                    debugLog('Converted article ID:', baseArticleId);
                    
                    // Update URL without reloading
                    let newUrl = window.location.pathname + '?article=' + encodeURIComponent(baseArticleId);
                    
                    // Keep other parameters
                    const newParams = new URLSearchParams();
                    for (const [key, value] of urlParams.entries()) {
                        if (key !== 'article') {
                            newParams.append(key, value);
                        }
                    }
                    
                    // Add other params if we have any
                    const otherParams = newParams.toString();
                    if (otherParams) {
                        newUrl += '&' + otherParams;
                    }
                    
                    window.history.replaceState({}, '', newUrl);
                    
                    // Try to load article with the fixed ID
                    if (window.ArticleSystem && window.ArticleSystem.fetchArticleById) {
                        setTimeout(() => {
                            window.ArticleSystem.fetchArticleById(baseArticleId).then(article => {
                                if (article) {
                                    window.ArticleSystem.showArticleView(article);
                                } else {
                                    debugLog('Article not found with converted ID, trying alternatives...');
                                    
                                    // If we can't find the article with the converted ID,
                                    // try with the original ID as it might be a database-specific format
                                    window.ArticleSystem.fetchArticleById(articleParam).then(originalArticle => {
                                        if (originalArticle) {
                                            window.ArticleSystem.showArticleView(originalArticle);
                                        } else {
                                            // Last attempt - try the original URL directly if it looks like a URL
                                            if (articleParam.includes('/')) {
                                                debugLog('Trying original URL directly:', articleParam);
                                                window.ArticleSystem.fetchArticleById(articleParam);
                                            }
                                        }
                                    });
                                }
                            });
                        }, 100);
                    }
                }
            } else {
                // Check if this is a shortened ID that needs to be used directly
                if (window.ArticleSystem && window.ArticleSystem.fetchArticleById && 
                    !articleParam.includes('://') && !articleParam.includes('---')) {
                    debugLog('Appears to be a shortened ID, using directly:', articleParam);
                    
                    setTimeout(() => {
                        window.ArticleSystem.fetchArticleById(articleParam);
                    }, 100);
                }
            }
        } catch (error) {
            console.error('Error processing URL parameters:', error);
        }
    }
    
    /**
     * Fix links throughout the page
     */
    function fixPageLinks() {
        debugLog('Setting up link fixing');
        
        // Intercept clicks on article links
        document.addEventListener('click', function(event) {
            const link = event.target.closest('a[href*="tennesseefeeds.com"][href*="?article="]');
            if (!link) return;
            
            const href = link.getAttribute('href');
            if (!href) return;
            
            debugLog('Intercepted click on article link:', href);
            
            try {
                const url = new URL(href);
                const articleParam = url.searchParams.get('article');
                
                if (articleParam && (articleParam.includes('---') || articleParam.includes('//'))) {
                    // Convert to proper format
                    const baseArticleId = getBaseArticleId(articleParam);
                    
                    if (baseArticleId !== articleParam) {
                        url.searchParams.set('article', baseArticleId);
                        link.setAttribute('href', url.toString());
                        debugLog('Fixed link href to:', url.toString());
                    }
                }
            } catch (error) {
                console.error('Error fixing link on click:', error);
            }
        }, true);
        
        // Fix existing links
        setTimeout(() => {
            try {
                const links = document.querySelectorAll('a[href*="tennesseefeeds.com"][href*="?article="]');
                
                links.forEach(link => {
                    const href = link.getAttribute('href');
                    
                    try {
                        const url = new URL(href);
                        const articleParam = url.searchParams.get('article');
                        
                        if (articleParam && (articleParam.includes('---') || articleParam.includes('//'))) {
                            const baseArticleId = getBaseArticleId(articleParam);
                            
                            if (baseArticleId !== articleParam) {
                                url.searchParams.set('article', baseArticleId);
                                link.setAttribute('href', url.toString());
                                debugLog('Fixed existing link href to:', url.toString());
                            }
                        }
                    } catch (error) {
                        console.error('Error fixing existing link:', error);
                    }
                });
            } catch (error) {
                console.error('Error fixing page links:', error);
            }
        }, 1000);
    }
    
    /**
     * Fix share page buttons
     */
    function fixSharePageButtons() {
        if (!window.location.href.includes('/share/')) return;
        
        debugLog('Fixing share page buttons');
        
        setTimeout(() => {
            try {
                // Get share ID from URL
                const shareId = window.location.pathname.split('/share/')[1]?.split('?')[0];
                if (!shareId) return;
                
                debugLog('Share ID:', shareId);
                
                // Find TennesseeFeeds button
                const tennesseeButton = Array.from(document.querySelectorAll('a')).find(a => 
                    a.textContent.includes('TennesseeFeeds') || 
                    a.href.includes('tennesseefeeds.com')
                );
                
                // Find Read Article button
                const readButton = Array.from(document.querySelectorAll('a')).find(a => 
                    (a.textContent.includes('Read') && a.textContent.includes('Article')) ||
                    (a.href && a.href !== '#' && !a.href.includes('tennesseefeeds.com'))
                );
                
                // If we found either button, get the article URL from API
                if (tennesseeButton || readButton) {
                    // Check if read button has a valid URL
                    let originalUrl = null;
                    if (readButton && readButton.href && readButton.href !== '#') {
                        originalUrl = readButton.href;
                        debugLog('Found original URL in read button:', originalUrl);
                    }
                    
                    // If not, fetch from API
                    if (!originalUrl) {
                        fetch(`https://tennesseefeeds-api.onrender.com/api/share/${shareId}`)
                            .then(response => {
                                if (!response.ok) {
                                    throw new Error(`API responded with status ${response.status}`);
                                }
                                return response.json();
                            })
                            .then(data => {
                                if (data.success && data.share && data.share.article && data.share.article.url) {
                                    originalUrl = data.share.article.url;
                                    debugLog('Got original URL from API:', originalUrl);
                                    
                                    // Update buttons with the original URL
                                    updateShareButtons(tennesseeButton, readButton, originalUrl);
                                }
                            })
                            .catch(error => {
                                console.error('Error fetching share data:', error);
                            });
                    } else {
                        // Update buttons with the URL we already have
                        updateShareButtons(tennesseeButton, readButton, originalUrl);
                    }
                }
            } catch (error) {
                console.error('Error fixing share page buttons:', error);
            }
        }, 500);
    }
    
    /**
     * Update share page buttons with the correct URL
     * @param {HTMLElement} tennesseeButton - The TennesseeFeeds button
     * @param {HTMLElement} readButton - The Read Article button
     * @param {string} originalUrl - The original article URL
     */
    function updateShareButtons(tennesseeButton, readButton, originalUrl) {
        if (!originalUrl) return;
        
        // Update TennesseeFeeds button
        if (tennesseeButton) {
            const newHref = `https://tennesseefeeds.com/?article=${encodeURIComponent(originalUrl)}`;
            tennesseeButton.setAttribute('href', newHref);
            debugLog('Updated TennesseeFeeds button href to:', newHref);
        }
        
        // Update Read Article button
        if (readButton && (readButton.getAttribute('href') === '#' || !readButton.getAttribute('href'))) {
            readButton.setAttribute('href', originalUrl);
            debugLog('Updated Read Article button href to:', originalUrl);
        }
        
        // Fix automatic redirect if present
        fixAutomaticRedirect(originalUrl);
    }
    
    /**
     * Fix automatic redirect script on share pages
     * @param {string} originalUrl - The original article URL to redirect to
     */
    function fixAutomaticRedirect(originalUrl) {
        if (!originalUrl) return;
        
        // Look for countdown element
        const countdownElement = document.getElementById('countdown');
        if (countdownElement) {
            debugLog('Found countdown element, overriding redirect');
            
            // Override setTimeout
            const originalSetTimeout = window.setTimeout;
            window.setTimeout = function(callback, delay) {
                if (delay >= 1000 && callback.toString().includes('window.location')) {
                    debugLog('Intercepted redirect, will use proper URL');
                    
                    return originalSetTimeout(() => {
                        window.location.href = originalUrl;
                    }, delay);
                }
                
                return originalSetTimeout(callback, delay);
            };
        }
    }
    
    /**
     * Make ArticleSystem and UserTracking aware of our URL conversion functions
     */
    function patchSystems() {
        // Patch ArticleSystem if it exists
        if (window.ArticleSystem) {
            debugLog('Enhancing ArticleSystem with URL conversion');
            
            // Save original function
            const originalFetchArticleById = window.ArticleSystem.fetchArticleById;
            
            // Override with enhanced version
            window.ArticleSystem.fetchArticleById = function(articleId) {
                debugLog('Enhanced fetchArticleById called with:', articleId);
                
                // Get base article ID
                const baseArticleId = getBaseArticleId(articleId);
                
                // If we made a conversion, try that first
                if (baseArticleId !== articleId) {
                    return originalFetchArticleById(baseArticleId).then(article => {
                        if (article) {
                            return article;
                        } else {
                            // If not found, try the original ID
                            return originalFetchArticleById(articleId);
                        }
                    }).catch(error => {
                        // If that fails, try the original ID
                        console.error('Error fetching with converted ID:', error);
                        return originalFetchArticleById(articleId);
                    });
                }
                
                // Otherwise just use the original function
                return originalFetchArticleById(articleId);
            };
            
            // Also enhance createArticleUrl if it exists
            if (window.ArticleSystem.createArticleUrl) {
                const originalCreateArticleUrl = window.ArticleSystem.createArticleUrl;
                
                window.ArticleSystem.createArticleUrl = function(articleId, title) {
                    debugLog('Enhanced createArticleUrl called with:', articleId);
                    
                    // Ensure articleId is in the right format
                    if (articleId && articleId.includes('://')) {
                        // This is a full URL, use it directly
                        return originalCreateArticleUrl(articleId, title);
                    } else if (articleId && (articleId.includes('---') || articleId.includes('//'))) {
                        // This is a transformed URL, convert it back
                        const baseArticleId = getBaseArticleId(articleId);
                        return originalCreateArticleUrl(baseArticleId, title);
                    }
                    
                    // Otherwise just use the original function
                    return originalCreateArticleUrl(articleId, title);
                };
            }
        }
        
        // Patch UserTracking if it exists
        if (window.UserTracking) {
            debugLog('Enhancing UserTracking with URL conversion');
            
            // Save original functions
            const originalTrackShare = window.UserTracking.trackShare;
            
            // Override with enhanced version
            if (originalTrackShare) {
                window.UserTracking.trackShare = function(articleId, platform) {
                    debugLog('Enhanced trackShare called with:', articleId);
                    
                    // Ensure articleId is in database-compatible format
                    const dbArticleId = normalToDashed(articleId);
                    
                    // Use the converted ID
                    return originalTrackShare(dbArticleId, platform);
                };
            }
        }
    }
    
    /**
     * Initialize the URL transformer
     */
    function initialize() {
        debugLog('Initializing URL transformer');
        
        // Process current URL parameters
        processUrlParameters();
        
        // Fix page links
        fixPageLinks();
        
        // Fix share page buttons if on a share page
        fixSharePageButtons();
        
        // Patch ArticleSystem and UserTracking
        patchSystems();
        
        // Monitor URL changes
        let lastUrl = location.href;
        new MutationObserver(() => {
            const currentUrl = location.href;
            if (currentUrl !== lastUrl) {
                lastUrl = currentUrl;
                debugLog('URL changed, checking parameters');
                processUrlParameters();
                fixSharePageButtons();
            }
        }).observe(document, {subtree: true, childList: true});
        
        debugLog('URL transformer initialized');
    }
    
    // Run initialization
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})();
