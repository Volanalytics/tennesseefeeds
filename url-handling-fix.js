// Domain-Aware URL Transformer for TennesseeFeeds
// This script specifically fixes URL transformations for article sharing

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
     * The FIXED solution for converting dashed URL format to normal URL format
     * This version specifically handles domains correctly
     * @param {string} dashedUrl - URL in dashed format (e.g., https---www-wjhl-com-news-...)
     * @returns {string} - Normal URL format (e.g., https://www.wjhl.com/news/...)
     */
    function dashedToNormal(dashedUrl) {
        if (!dashedUrl || typeof dashedUrl !== 'string') return dashedUrl;
        
        debugLog('Converting dashed to normal:', dashedUrl);
        
        try {
            // DIRECT REPLACEMENT APPROACH - Works in most cases
            // Step 1: Convert protocol
            let result = dashedUrl.replace(/^https---/, 'https://').replace(/^http---/, 'http://');
            
            // Step 2: Find all domain segments by looking for double dashes
            // In a URL like https---www-wjhl-com-news-... the domain is www-wjhl-com
            const protocolEndIndex = result.indexOf('://') + 3; // Skip the protocol part
            
            if (protocolEndIndex > 3) {
                const protocol = result.substring(0, protocolEndIndex);
                const rest = result.substring(protocolEndIndex);
                
                // Find where the domain ends and path begins
                // This is usually the first single dash after the TLD (.com, .org, etc.)
                const domainParts = rest.split('-');
                
                // Extract domain segments - we need to check for common TLDs
                let domainEnd = 0;
                const knownTlds = ['com', 'org', 'net', 'edu', 'gov', 'io', 'co', 'us', 'uk', 'ca', 'au'];
                
                // Find the domain by looking for a known TLD
                for (let i = 0; i < domainParts.length; i++) {
                    const part = domainParts[i];
                    if (knownTlds.includes(part)) {
                        // Found a TLD, so the domain ends here
                        domainEnd = i + 1;
                        break;
                    }
                }
                
                if (domainEnd === 0) {
                    // Fallback: assume first two parts are domain (like www-example)
                    domainEnd = 2;
                }
                
                // Reconstruct the domain with dots
                const domain = domainParts.slice(0, domainEnd).join('.');
                
                // Reconstruct the path with slashes
                const path = domainParts.slice(domainEnd).join('/');
                
                // Put it all together
                result = protocol + domain + (path ? '/' + path : '');
                
                // Handle trailing slash
                if (dashedUrl.endsWith('-') && !result.endsWith('/')) {
                    result += '/';
                }
            }
            
            // Fix common domain issues (this is the most important part for wjhl.com type domains)
            result = result.replace(/www\/([^\/]+)\/com/, 'www.$1.com');
            result = result.replace(/\/com\//, '.com/');
            result = result.replace(/\/org\//, '.org/');
            result = result.replace(/\/net\//, '.net/');
            result = result.replace(/\/edu\//, '.edu/');
            
            // Specifically fix wjhl.com pattern which is common in your examples
            result = result.replace(/wjhl\/com/, 'wjhl.com');
            
            debugLog('Converted result:', result);
            
            // For WJHL and similar sites, try a completely different approach if the result still looks wrong
            if (result.includes('/com/') || result.includes('/org/')) {
                debugLog('Result still contains invalid domain structure, trying alternative approach');
                
                // Extract and reconstruct completely for this specific case
                const alternateResult = extractUrlByPattern(dashedUrl);
                if (alternateResult) {
                    debugLog('Alternative approach result:', alternateResult);
                    return alternateResult;
                }
            }
            
            return result;
        } catch (error) {
            console.error('Error converting dashed URL:', error);
            
            // Try the alternative method as a fallback
            try {
                const alternateResult = extractUrlByPattern(dashedUrl);
                if (alternateResult) {
                    debugLog('Used alternative approach as fallback:', alternateResult);
                    return alternateResult;
                }
            } catch (fallbackError) {
                console.error('Alternative approach also failed:', fallbackError);
            }
            
            // Ultimate fallback: simple replacement
            try {
                const simpleResult = dashedUrl
                    .replace(/^https---/, 'https://')
                    .replace(/^http---/, 'http://')
                    .replace(/--/g, '.')
                    .replace(/-/g, '/');
                
                debugLog('Used simple replacement as last resort:', simpleResult);
                return simpleResult;
            } catch (ultimateError) {
                console.error('All conversion attempts failed:', ultimateError);
                return dashedUrl;
            }
        }
    }
    
    /**
     * Extract URL using pattern matching for specific troublesome domains
     * @param {string} dashedUrl - The dashed URL to extract from
     * @returns {string|null} - The extracted URL or null if not found
     */
    function extractUrlByPattern(dashedUrl) {
        // For www.wjhl.com type URLs
        if (dashedUrl.includes('wjhl')) {
            const match = dashedUrl.match(/https---www-wjhl-com-(.+)/);
            if (match && match[1]) {
                const path = match[1].replace(/-/g, '/');
                return `https://www.wjhl.com/${path}`;
            }
        }
        
        // For general www.domain.com pattern
        const generalMatch = dashedUrl.match(/https---(www-)?([^-]+)-([^-]+)-(.+)/);
        if (generalMatch) {
            const www = generalMatch[1] ? 'www.' : '';
            const domain = generalMatch[2];
            const tld = generalMatch[3];
            const path = generalMatch[4].replace(/-/g, '/');
            return `https://${www}${domain}.${tld}/${path}`;
        }
        
        return null;
    }
    
    /**
     * Get a shortened article ID for the database
     * @param {string} url - The full article URL
     * @returns {string} - The shortened article ID
     */
    function getShortArticleId(url) {
        if (!url) return url;
        
        try {
            // Remove protocol
            let result = url.replace(/^https?:\/\//, '');
            
            // Replace dots and slashes with dashes
            result = result.replace(/\./g, '-').replace(/\//g, '-');
            
            // Limit length to 63 characters (common database field limit)
            if (result.length > 63) {
                result = result.substring(0, 63);
            }
            
            return result;
        } catch (error) {
            console.error('Error getting short article ID:', error);
            return url;
        }
    }
    
    /**
     * Process URL parameters to fix article URL
     */
    function processUrlParameters() {
        try {
            debugLog('Processing URL parameters');
            
            // Check for article parameter
            const urlParams = new URLSearchParams(window.location.search);
            const articleParam = urlParams.get('article');
            
            if (!articleParam) return;
            
            debugLog('Found article parameter:', articleParam);
            
            // Check if this is a dashed URL that needs conversion
            if (articleParam.includes('---')) {
                debugLog('This appears to be a dashed URL, converting...');
                
                // Get the proper URL
                const normalUrl = dashedToNormal(articleParam);
                
                if (normalUrl !== articleParam) {
                    debugLog('Converted URL:', normalUrl);
                    
                    // Try to fetch both the original and converted URLs
                    if (window.ArticleSystem && window.ArticleSystem.fetchArticleById) {
                        // Try the converted URL first
                        tryMultipleArticleIds(articleParam, normalUrl);
                    }
                    
                    // Update the URL without reloading
                    let newUrl = window.location.pathname + '?article=' + encodeURIComponent(normalUrl);
                    
                    // Keep other parameters
                    urlParams.delete('article');
                    const otherParams = urlParams.toString();
                    if (otherParams) {
                        newUrl += '&' + otherParams;
                    }
                    
                    window.history.replaceState({}, '', newUrl);
                }
            } else if (articleParam.includes('//') && articleParam.includes('/com/')) {
                // This is a URL that was already incorrectly converted
                debugLog('Found incorrectly converted URL, fixing:', articleParam);
                
                // Fix the domain issues
                let fixedUrl = articleParam
                    .replace(/www\/([^\/]+)\/com/, 'www.$1.com')
                    .replace(/\/com\//, '.com/')
                    .replace(/\/org\//, '.org/')
                    .replace(/\/net\//, '.net/')
                    .replace(/\/edu\//, '.edu/');
                
                // Try to fix WJHL specifically
                if (articleParam.includes('wjhl')) {
                    fixedUrl = fixedUrl.replace(/wjhl\/com/, 'wjhl.com');
                }
                
                if (fixedUrl !== articleParam) {
                    debugLog('Fixed URL:', fixedUrl);
                    
                    // Try to fetch with fixed URL
                    if (window.ArticleSystem && window.ArticleSystem.fetchArticleById) {
                        tryMultipleArticleIds(articleParam, fixedUrl);
                    }
                    
                    // Update the URL
                    let newUrl = window.location.pathname + '?article=' + encodeURIComponent(fixedUrl);
                    
                    // Keep other parameters
                    urlParams.delete('article');
                    const otherParams = urlParams.toString();
                    if (otherParams) {
                        newUrl += '&' + otherParams;
                    }
                    
                    window.history.replaceState({}, '', newUrl);
                }
            } else if (articleParam && !articleParam.includes('://') && !articleParam.includes('---')) {
                // This might be a short ID format that needs to be used directly
                debugLog('Article parameter appears to be a short ID, using directly:', articleParam);
                
                // Try to fetch with this ID
                if (window.ArticleSystem && window.ArticleSystem.fetchArticleById) {
                    window.ArticleSystem.fetchArticleById(articleParam);
                }
            }
        } catch (error) {
            console.error('Error processing URL parameters:', error);
        }
    }
    
    /**
     * Try to fetch an article with multiple IDs
     * @param {string} originalId - The original article ID
     * @param {string} convertedId - The converted article ID
     */
    function tryMultipleArticleIds(originalId, convertedId) {
        debugLog('Trying multiple article IDs');
        
        setTimeout(() => {
            // Use fetchArticleById directly rather than through a promise chain
            // to avoid issues with rejection handling
            
            // Try the converted ID first
            window.ArticleSystem.fetchArticleById(convertedId).then(article => {
                if (article) {
                    debugLog('Found article with converted ID');
                    window.ArticleSystem.showArticleView(article);
                } else {
                    debugLog('Article not found with converted ID, trying original ID');
                    
                    // Try the original ID
                    window.ArticleSystem.fetchArticleById(originalId).then(originalArticle => {
                        if (originalArticle) {
                            debugLog('Found article with original ID');
                            window.ArticleSystem.showArticleView(originalArticle);
                        } else {
                            debugLog('Article not found with original ID, trying short ID format');
                            
                            // Try a shortened version as a last resort
                            const shortId = getShortArticleId(convertedId);
                            if (shortId !== convertedId && shortId !== originalId) {
                                debugLog('Trying with short ID:', shortId);
                                window.ArticleSystem.fetchArticleById(shortId);
                            }
                        }
                    }).catch(error => {
                        console.error('Error fetching with original ID:', error);
                    });
                }
            }).catch(error => {
                console.error('Error fetching with converted ID:', error);
                
                // Try the original ID as a fallback
                window.ArticleSystem.fetchArticleById(originalId);
            });
        }, 100);
    }
    
    /**
     * Fix links throughout the page
     */
    function fixPageLinks() {
        debugLog('Setting up link fixing');
        
        // Set up click interception
        document.addEventListener('click', function(event) {
            const link = event.target.closest('a[href*="tennesseefeeds.com"][href*="?article="]');
            if (!link) return;
            
            const href = link.getAttribute('href');
            if (!href) return;
            
            debugLog('Intercepted click on article link:', href);
            
            try {
                const url = new URL(href);
                const articleParam = url.searchParams.get('article');
                
                if (articleParam && articleParam.includes('---')) {
                    // Convert dashed URL
                    const normalUrl = dashedToNormal(articleParam);
                    
                    if (normalUrl !== articleParam) {
                        url.searchParams.set('article', normalUrl);
                        link.setAttribute('href', url.toString());
                        debugLog('Fixed link href to:', url.toString());
                    }
                } else if (articleParam && articleParam.includes('/com/')) {
                    // Fix incorrectly converted URL
                    let fixedUrl = articleParam
                        .replace(/www\/([^\/]+)\/com/, 'www.$1.com')
                        .replace(/\/com\//, '.com/')
                        .replace(/\/org\//, '.org/')
                        .replace(/\/net\//, '.net/')
                        .replace(/\/edu\//, '.edu/');
                    
                    if (articleParam.includes('wjhl')) {
                        fixedUrl = fixedUrl.replace(/wjhl\/com/, 'wjhl.com');
                    }
                    
                    if (fixedUrl !== articleParam) {
                        url.searchParams.set('article', fixedUrl);
                        link.setAttribute('href', url.toString());
                        debugLog('Fixed incorrectly converted URL in link to:', url.toString());
                    }
                }
            } catch (error) {
                console.error('Error fixing link on click:', error);
            }
        }, true);
        
        // Fix existing links on the page
        setTimeout(() => {
            try {
                debugLog('Fixing existing links on page');
                
                const links = document.querySelectorAll('a[href*="tennesseefeeds.com"][href*="?article="]');
                let fixedCount = 0;
                
                links.forEach(link => {
                    const href = link.getAttribute('href');
                    
                    try {
                        const url = new URL(href);
                        const articleParam = url.searchParams.get('article');
                        
                        if (articleParam && articleParam.includes('---')) {
                            // Convert dashed URL
                            const normalUrl = dashedToNormal(articleParam);
                            
                            if (normalUrl !== articleParam) {
                                url.searchParams.set('article', normalUrl);
                                link.setAttribute('href', url.toString());
                                fixedCount++;
                            }
                        } else if (articleParam && articleParam.includes('/com/')) {
                            // Fix incorrectly converted URL
                            let fixedUrl = articleParam
                                .replace(/www\/([^\/]+)\/com/, 'www.$1.com')
                                .replace(/\/com\//, '.com/')
                                .replace(/\/org\//, '.org/')
                                .replace(/\/net\//, '.net/')
                                .replace(/\/edu\//, '.edu/');
                            
                            if (articleParam.includes('wjhl')) {
                                fixedUrl = fixedUrl.replace(/wjhl\/com/, 'wjhl.com');
                            }
                            
                            if (fixedUrl !== articleParam) {
                                url.searchParams.set('article', fixedUrl);
                                link.setAttribute('href', url.toString());
                                fixedCount++;
                            }
                        }
                    } catch (error) {
                        console.error('Error fixing existing link:', error);
                    }
                });
                
                if (fixedCount > 0) {
                    debugLog(`Fixed ${fixedCount} existing links on the page`);
                }
            } catch (error) {
                console.error('Error fixing page links:', error);
            }
        }, 1000);
    }
    
    /**
     * Fix buttons on share pages
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
                
                // Find the TennesseeFeeds button
                const tennesseeButton = Array.from(document.querySelectorAll('a')).find(a => 
                    a.textContent.includes('TennesseeFeeds') || 
                    a.href.includes('tennesseefeeds.com')
                );
                
                // Find the Read Article button
                const readButton = Array.from(document.querySelectorAll('a')).find(a => 
                    (a.textContent.includes('Read') && a.textContent.includes('Article')) ||
                    (a.href && a.href !== '#' && !a.href.includes('tennesseefeeds.com'))
                );
                
                // Get the article URL
                let originalUrl = null;
                
                // First try to get it from the Read button
                if (readButton && readButton.href && readButton.href !== '#') {
                    originalUrl = readButton.href;
                    debugLog('Found original URL in read button:', originalUrl);
                }
                
                // If not found, fetch from API
                if (!originalUrl) {
                    debugLog('Fetching share data from API for share ID:', shareId);
                    
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
                                
                                // Update buttons
                                updateButtons(tennesseeButton, readButton, originalUrl);
                            }
                        })
                        .catch(error => {
                            console.error('Error fetching share data:', error);
                        });
                } else {
                    // Update buttons with the URL we already have
                    updateButtons(tennesseeButton, readButton, originalUrl);
                }
            } catch (error) {
                console.error('Error fixing share page buttons:', error);
            }
        }, 500);
    }
    
    /**
     * Update buttons with the correct URL
     * @param {HTMLElement} tennesseeButton - The TennesseeFeeds button
     * @param {HTMLElement} readButton - The Read Article button
     * @param {string} originalUrl - The original article URL
     */
    function updateButtons(tennesseeButton, readButton, originalUrl) {
        if (!originalUrl) return;
        
        // Update TennesseeFeeds button
        if (tennesseeButton) {
            const newHref = `https://tennesseefeeds.com/?article=${encodeURIComponent(originalUrl)}`;
            tennesseeButton.setAttribute('href', newHref);
            debugLog('Updated TennesseeFeeds button href to:', newHref);
        }
        
        // Update Read Article button if needed
        if (readButton && (readButton.getAttribute('href') === '#' || !readButton.getAttribute('href'))) {
            readButton.setAttribute('href', originalUrl);
            debugLog('Updated Read Article button href to:', originalUrl);
        }
        
        // Fix automatic redirect
        fixRedirect(originalUrl);
    }
    
    /**
     * Fix automatic redirect on share pages
     * @param {string} originalUrl - The original article URL
     */
    function fixRedirect(originalUrl) {
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
     * Enhance ArticleSystem and UserTracking
     */
    function patchSystems() {
        if (window.ArticleSystem && window.ArticleSystem.fetchArticleById) {
            debugLog('Enhancing ArticleSystem.fetchArticleById');
            
            // Save original function
            const originalFetchArticleById = window.ArticleSystem.fetchArticleById;
            
            // Override with enhanced version
            window.ArticleSystem.fetchArticleById = function(articleId) {
                debugLog('Enhanced fetchArticleById called with:', articleId);
                
                // Check if this is a dashed URL
                if (articleId && typeof articleId === 'string' && articleId.includes('---')) {
                    const normalUrl = dashedToNormal(articleId);
                    
                    if (normalUrl !== articleId) {
                        debugLog('Converting dashed URL for fetchArticleById:', normalUrl);
                        
                        // Try the converted URL, falling back to original if needed
                        return originalFetchArticleById(normalUrl).then(article => {
                            if (article) {
                                return article;
                            } else {
                                debugLog('Article not found with converted ID, trying original');
                                return originalFetchArticleById(articleId);
                            }
                        }).catch(error => {
                            console.error('Error fetching with converted ID:', error);
                            return originalFetchArticleById(articleId);
                        });
                    }
                } else if (articleId && typeof articleId === 'string' && articleId.includes('/com/')) {
                    // Fix incorrectly converted URL
                    let fixedUrl = articleId
                        .replace(/www\/([^\/]+)\/com/, 'www.$1.com')
                        .replace(/\/com\//, '.com/')
                        .replace(/\/org\//, '.org/')
                        .replace(/\/net\//, '.net/')
                        .replace(/\/edu\//, '.edu/');
                    
                    if (articleId.includes('wjhl')) {
                        fixedUrl = fixedUrl.replace(/wjhl\/com/, 'wjhl.com');
                    }
                    
                    if (fixedUrl !== articleId) {
                        debugLog('Fixing incorrectly converted URL for fetchArticleById:', fixedUrl);
                        
                        // Try the fixed URL, falling back to original if needed
                        return originalFetchArticleById(fixedUrl).then(article => {
                            if (article) {
                                return article;
                            } else {
                                debugLog('Article not found with fixed URL, trying original');
                                return originalFetchArticleById(articleId);
                            }
                        }).catch(error => {
                            console.error('Error fetching with fixed URL:', error);
                            return originalFetchArticleById(articleId);
                        });
                    }
                }
                
                // Otherwise use the original function
                return originalFetchArticleById(articleId);
            };
        }
    }
    
    /**
     * Initialize the URL transformer
     */
    function initialize() {
        debugLog('Initializing domain-aware URL transformer');
        
        // Process URL parameters
        processUrlParameters();
        
        // Fix page links
        fixPageLinks();
        
        // Fix share page buttons
        fixSharePageButtons();
        
        // Patch systems
        patchSystems();
        
        // Monitor URL changes for single-page apps
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
        
        debugLog('Domain-aware URL transformer initialized');
    }
    
    // Run initialization
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})();
