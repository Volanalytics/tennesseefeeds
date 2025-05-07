// Create a new file called url-handling-fix.js
(function() {
    // Debug mode
    const DEBUG = true;
    
    // Log function
    function debugLog(...args) {
        if (DEBUG) {
            console.log('[URLTransformer]', ...args);
        }
    }

    /**
     * Convert a standard URL to a dashed format
     * @param {string} url - The URL to transform
     * @returns {string} - The transformed URL
     */
    function urlToDashed(url) {
        if (!url) return '';
        
        // Use a more specific replacement that preserves hyphens
        return url.replace(/[:/\.\?=&%]/g, '-');
    }

    /**
     * Convert a dashed URL back to standard format
     * @param {string} dashedUrl - The dashed URL to transform back
     * @returns {string} - The original URL (best effort)
     */
    function dashedToUrl(dashedUrl) {
        if (!dashedUrl) return '';
        
        // Step 1: Replace protocol marker
        let result = dashedUrl.replace(/^https---/, 'https://');
        result = result.replace(/^http---/, 'http://');
        
        // Step 2: Replace domain separators (e.g., www-example-com)
        result = result.replace(/^([^-]+)---([^-]+)-([^-]+)-([^-]+)/, '$1://$2.$3.$4');
        
        // Common two-part domains
        result = result.replace(/^([^-]+)---([^-]+)-([^-]+)/, '$1://$2.$3');
        
        // Step 3: Replace remaining dashes that should be dots or slashes
        // This is trickier and might need domain-specific rules
        
        // Replace obvious domain dots (after the protocol is fixed)
        result = result.replace(/:\/\/([^\/]+)/, (match) => {
            return match.replace(/-/g, '.');
        });
        
        // Replace path separators (assume remaining dashes after domain are path separators)
        // We need to be careful here to not replace legitimate hyphens
        const domainAndPath = result.split('://');
        if (domainAndPath.length === 2) {
            const domain = domainAndPath[0] + '://' + domainAndPath[1].split('/')[0];
            const path = domainAndPath[1].split('/').slice(1).join('/');
            
            if (path) {
                // Now we're working just with the path portion
                // In the path, replace only specific patterns like double dash with slash
                let newPath = path;
                
                // Replace specific patterns that look like artifacts from our conversion
                newPath = newPath.replace(/--/g, '/');
                
                // Reconstruct the URL
                result = domain + '/' + newPath;
            }
        }
        
        return result;
    }
    
    /**
     * Enhanced URL transformation that preserves all special characters
     * @param {string} url - The URL to transform
     * @returns {string} - The transformed URL with special encoding
     */
    function enhancedUrlTransform(url) {
        if (!url) return '';
        
        // Base64 encoding would be ideal, but for readability we'll use a simpler approach
        // Replace specific characters with unique markers
        return url.replace(/:/g, '--COLON--')
                 .replace(/\//g, '--SLASH--')
                 .replace(/\./g, '--DOT--')
                 .replace(/\?/g, '--QUES--')
                 .replace(/=/g, '--EQUAL--')
                 .replace(/&/g, '--AMP--')
                 .replace(/%/g, '--PERC--')
                 .replace(/-/g, '--HYPHEN--');
    }
    
    /**
     * Convert an enhanced transformed URL back to standard format
     * @param {string} transformedUrl - The transformed URL
     * @returns {string} - The original URL
     */
    function enhancedUrlUntransform(transformedUrl) {
        if (!transformedUrl) return '';
        
        return transformedUrl.replace(/--COLON--/g, ':')
                          .replace(/--SLASH--/g, '/')
                          .replace(/--DOT--/g, '.')
                          .replace(/--QUES--/g, '?')
                          .replace(/--EQUAL--/g, '=')
                          .replace(/--AMP--/g, '&')
                          .replace(/--PERC--/g, '%')
                          .replace(/--HYPHEN--/g, '-');
    }
    
    /**
     * Process URL parameters to convert dashed URLs to normal format
     */
    function processUrlParameters() {
        debugLog('Processing URL parameters');
        const urlParams = new URLSearchParams(window.location.search);
        const articleParam = urlParams.get('article');
        
        if (!articleParam) {
            debugLog('No article parameter found');
            return;
        }
        
        debugLog('Found article parameter:', articleParam);
        
        // If this is a full dashed URL, convert it
        if (articleParam.startsWith('https---') || articleParam.startsWith('http---')) {
            debugLog('This appears to be a dashed URL, converting...');
            
            // Try to convert the dashed URL to a normal URL
            debugLog('Converting dashed to normal:', articleParam);
            const convertedUrl = dashedToUrl(articleParam);
            debugLog('Converted result:', convertedUrl);
            
            // Update the URL parameter to use the converted URL
            debugLog('Converted URL:', convertedUrl);
            
            // Try multiple strategies to find the article
            debugLog('Trying multiple article IDs');
            
            // Option 1: Try the converted URL directly
            fetchArticleWithId(convertedUrl);
            
            // Option 2: Try a normalized version (remove trailing slashes)
            const normalizedUrl = convertedUrl.replace(/\/+$/, '');
            if (normalizedUrl !== convertedUrl) {
                fetchArticleWithId(normalizedUrl);
            }
            
            // Option 3: Try the generateArticleId approach with the converted URL
            if (window.ArticleSystem && window.ArticleSystem.generateArticleId) {
                const generatedId = window.ArticleSystem.generateArticleId(convertedUrl);
                fetchArticleWithId(generatedId);
            }
        } else {
            // This is probably already a short ID, use it directly
            debugLog('Article parameter appears to be a short ID, using directly:', articleParam);
            fetchArticleWithId(articleParam);
        }
    }
    
    /**
     * Fetch an article with a specific ID
     * @param {string} articleId - The article ID to fetch
     */
    function fetchArticleWithId(articleId) {
        if (window.ArticleSystem && window.ArticleSystem.fetchArticleById) {
            window.ArticleSystem.fetchArticleById(articleId).then(article => {
                if (article) {
                    debugLog('Found article with converted ID');
                    window.ArticleSystem.showArticleView(article);
                }
            });
        }
    }
    
    /**
     * Fix existing links on the page to use the enhanced URL transformation
     */
    function fixExistingLinks() {
        debugLog('Fixing existing links on page');
        let fixedCount = 0;
        
        // Find all article links
        document.querySelectorAll('a.article-link, a[data-article-id]').forEach(link => {
            const href = link.getAttribute('href');
            
            // Check if this is a dashed URL that needs fixing
            if (href && (href.startsWith('https---') || href.startsWith('http---'))) {
                debugLog('Converting dashed to normal:', href);
                const convertedUrl = dashedToUrl(href);
                debugLog('Converted result:', convertedUrl);
                
                // Update the link
                link.setAttribute('href', convertedUrl);
                fixedCount++;
            }
        });
        
        debugLog(`Fixed ${fixedCount} existing links on the page`);
    }
    
    /**
     * Enhance the ArticleSystem.fetchArticleById function to handle both formats
     */
    function enhanceFetchArticleById() {
        if (!window.ArticleSystem || !window.ArticleSystem.fetchArticleById) {
            return;
        }
        
        debugLog('Enhancing ArticleSystem.fetchArticleById');
        
        // Store the original function
        const originalFetchArticleById = window.ArticleSystem.fetchArticleById;
        
        // Replace with our enhanced version
        window.ArticleSystem.fetchArticleById = function(articleId) {
            debugLog('Enhanced fetchArticleById called with:', articleId);
            
            // Try the original function first
            return originalFetchArticleById(articleId).then(article => {
                if (article && article.id !== 'Article Not Found') {
                    return article;
                }
                
                // If not found and this looks like a dashed URL, try converting it
                if (articleId && (articleId.startsWith('https---') || articleId.startsWith('http---'))) {
                    const convertedId = dashedToUrl(articleId);
                    debugLog('Article not found with dashed ID, trying converted ID:', convertedId);
                    
                    return originalFetchArticleById(convertedId);
                }
                
                // If this is a normal URL, try the dashed version as fallback
                if (articleId && (articleId.startsWith('https://') || articleId.startsWith('http://'))) {
                    const dashedId = urlToDashed(articleId);
                    debugLog('Article not found with normal URL, trying dashed version:', dashedId);
                    
                    return originalFetchArticleById(dashedId);
                }
                
                return article;
            });
        };
    }
    
    /**
     * Initialize the URL transformer
     */
    function init() {
        debugLog('Initializing domain-aware URL transformer');
        
        // Process URL parameters
        processUrlParameters();
        
        // Set up link fixing
        debugLog('Setting up link fixing');
        fixExistingLinks();
        
        // Enhance fetch article function
        enhanceFetchArticleById();
        
        // Listen for URL changes
        window.addEventListener('popstate', function() {
            debugLog('URL changed, checking parameters');
            processUrlParameters();
        });
        
        // Listen for URL parameter changes
        const originalPushState = window.history.pushState;
        window.history.pushState = function() {
            originalPushState.apply(window.history, arguments);
            debugLog('URL changed, checking parameters');
            processUrlParameters();
        };
        
        debugLog('Domain-aware URL transformer initialized');
    }
    
    // Initialize on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
