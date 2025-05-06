// URL Transformer for TennesseeFeeds
// This script handles proper URL conversion between normal and dashed formats

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
     * @param {string} dashedUrl - URL in dashed format (e.g., https---wreg-com-news-...)
     * @returns {string} - Normal URL format (e.g., https://wreg.com/news/...)
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
            
            // Step 2: Process domain part (up to first single dash after double dash)
            // Find all double dashes (--) which represent dots in the domain
            let parts = normalUrl.split('--');
            
            if (parts.length > 1) {
                // First part contains protocol and first domain segment
                let result = parts[0];
                
                // Process domain parts
                for (let i = 1; i < parts.length; i++) {
                    // For each part after a double dash
                    const part = parts[i];
                    
                    // If this is the last part or it contains a single dash
                    const dashIndex = part.indexOf('-');
                    
                    if (dashIndex > -1) {
                        // This part contains both domain segment and path
                        // Example: com-news-article
                        const domainSegment = part.substring(0, dashIndex);
                        const pathSegment = part.substring(dashIndex + 1);
                        
                        // Add domain segment with dot
                        result += '.' + domainSegment;
                        
                        // Add path segment with slashes
                        if (pathSegment) {
                            result += '/' + pathSegment.replace(/-/g, '/');
                        }
                    } else {
                        // This is just a domain segment with no path
                        // Example: com
                        result += '.' + part;
                    }
                }
                
                normalUrl = result;
            } else {
                // No double dashes, so just convert single dashes in the path to slashes
                // But preserve protocol and domain structure
                const urlParts = normalUrl.split('://');
                
                if (urlParts.length === 2) {
                    const protocol = urlParts[0];
                    const rest = urlParts[1];
                    
                    // Split at first slash or dash after domain
                    const domainEnd = Math.min(
                        rest.indexOf('/') > -1 ? rest.indexOf('/') : rest.length,
                        rest.indexOf('-') > -1 ? rest.indexOf('-') : rest.length
                    );
                    
                    const domain = rest.substring(0, domainEnd);
                    const path = rest.substring(domainEnd);
                    
                    // Reassemble with path dashes converted to slashes
                    normalUrl = protocol + '://' + domain + path.replace(/-/g, '/');
                }
            }
            
            debugLog('Converted result:', normalUrl);
            return normalUrl;
        } catch (error) {
            console.error('Error converting dashed URL:', error);
            return dashedUrl;
        }
    }
    
    /**
     * Process URL parameters on page load
     */
    function processUrlParameters() {
        debugLog('Processing URL parameters');
        
        try {
            // Check if we have an article parameter
            const urlParams = new URLSearchParams(window.location.search);
            const articleParam = urlParams.get('article');
            
            if (articleParam && (articleParam.includes('https---') || articleParam.includes('http---'))) {
                debugLog('Found dashed article URL in parameters:', articleParam);
                
                // Convert to normal URL
                const normalUrl = dashedToNormal(articleParam);
                
                // Update the URL if conversion was successful
                if (normalUrl !== articleParam) {
                    let newUrl = window.location.pathname + '?article=' + encodeURIComponent(normalUrl);
                    
                    // Preserve any other query parameters
                    urlParams.delete('article');
                    for (const [key, value] of urlParams.entries()) {
                        newUrl += '&' + key + '=' + encodeURIComponent(value);
                    }
                    
                    debugLog('Updating URL to:', newUrl);
                    window.history.replaceState({}, '', newUrl);
                    
                    // After updating URL, attempt to use it directly if we have the article system
                    if (window.ArticleSystem && window.ArticleSystem.fetchArticleById) {
                        debugLog('Trying to fetch article with converted URL:', normalUrl);
                        window.ArticleSystem.fetchArticleById(normalUrl).then(article => {
                            if (article) {
                                window.ArticleSystem.showArticleView(article);
                            }
                        }).catch(err => {
                            console.error('Error fetching article with converted URL:', err);
                        });
                    }
                }
            }
            
            // Fix share page buttons if we're on a share page
            if (window.location.href.includes('/share/')) {
                setTimeout(fixSharePageButtons, 500);
            }
        } catch (error) {
            console.error('Error processing URL parameters:', error);
        }
    }
    
    /**
     * Fix the buttons on share pages
     */
    function fixSharePageButtons() {
        debugLog('Fixing share page buttons');
        
        try {
            // Get share ID from URL
            const shareId = window.location.pathname.split('/share/')[1]?.split('?')[0] || '';
            if (!shareId) return;
            
            // Find TennesseeFeeds button
            const tennesseeButton = Array.from(document.querySelectorAll('a')).find(a => 
                a.textContent.includes('TennesseeFeeds') || 
                a.href.includes('tennesseefeeds.com')
            );
            
            if (tennesseeButton) {
                debugLog('Found TennesseeFeeds button:', tennesseeButton);
                
                // Get the original article URL either from the page or via API
                const originalUrl = getOriginalArticleUrl();
                
                if (originalUrl) {
                    // Fix the button to use the proper URL format
                    const newHref = `https://tennesseefeeds.com/?article=${encodeURIComponent(originalUrl)}`;
                    tennesseeButton.setAttribute('href', newHref);
                    debugLog('Updated TennesseeFeeds button URL to:', newHref);
                } else {
                    // Fetch from API
                    debugLog('Fetching share data from API for share ID:', shareId);
                    
                    fetch(`https://tennesseefeeds-api.onrender.com/api/share/${shareId}`)
                        .then(response => response.json())
                        .then(data => {
                            if (data.success && data.share && data.share.article && data.share.article.url) {
                                const url = data.share.article.url;
                                debugLog('Got article URL from API:', url);
                                
                                // Update the button
                                const newHref = `https://tennesseefeeds.com/?article=${encodeURIComponent(url)}`;
                                tennesseeButton.setAttribute('href', newHref);
                                debugLog('Updated TennesseeFeeds button URL to:', newHref);
                            }
                        })
                        .catch(error => {
                            console.error('Error fetching share data:', error);
                        });
                }
            }
        } catch (error) {
            console.error('Error fixing share page buttons:', error);
        }
    }
    
    /**
     * Try to extract the original article URL from the page content
     * @returns {string|null} Original article URL or null if not found
     */
    function getOriginalArticleUrl() {
        // Look for Read Full Article button
        const readButton = Array.from(document.querySelectorAll('a')).find(a => 
            (a.textContent.includes('Read') && a.textContent.includes('Article')) ||
            (a.href && a.href !== '#' && !a.href.includes('tennesseefeeds.com'))
        );
        
        if (readButton && readButton.href && readButton.href !== '#') {
            debugLog('Found article URL in Read button:', readButton.href);
            return readButton.href;
        }
        
        // Try to find it in text content
        const scripts = document.querySelectorAll('script');
        for (const script of scripts) {
            if (script.textContent.includes('window.location.href') && 
                (script.textContent.includes('http://') || script.textContent.includes('https://'))) {
                
                const match = script.textContent.match(/window\.location\.href\s*=\s*["']([^"']+)["']/);
                if (match && match[1] && (match[1].startsWith('http://') || match[1].startsWith('https://'))) {
                    debugLog('Found article URL in redirect script:', match[1]);
                    return match[1];
                }
            }
        }
        
        return null;
    }
    
    /**
     * Fix URL transformation throughout the page
     */
    function fixUrlTransformationGlobally() {
        debugLog('Setting up global URL transformation fixes');
        
        // Intercept clicks on links to fix URL format
        document.addEventListener('click', function(event) {
            const link = event.target.closest('a');
            if (!link) return;
            
            const href = link.getAttribute('href');
            if (!href) return;
            
            // Check if this is a link to TennesseeFeeds with a dashed article URL
            if (href.includes('tennesseefeeds.com') && 
                href.includes('?article=') && 
                (href.includes('https---') || href.includes('http---'))) {
                
                debugLog('Intercepted click on link with dashed article URL:', href);
                
                try {
                    // Extract and fix the article parameter
                    const url = new URL(href);
                    const articleParam = url.searchParams.get('article');
                    
                    if (articleParam) {
                        const normalUrl = dashedToNormal(articleParam);
                        
                        if (normalUrl !== articleParam) {
                            // Update the URL
                            url.searchParams.set('article', normalUrl);
                            
                            // Set the new href
                            link.setAttribute('href', url.toString());
                            debugLog('Fixed link href to:', url.toString());
                            
                            // Let the click proceed with the fixed URL
                        }
                    }
                } catch (error) {
                    console.error('Error fixing link URL:', error);
                }
            }
        }, true); // Use capture phase to intercept before normal handlers
        
        // Fix URLs in existing links on the page
        setTimeout(function() {
            const links = document.querySelectorAll('a[href*="tennesseefeeds.com"][href*="?article="]');
            
            for (const link of links) {
                const href = link.getAttribute('href');
                
                try {
                    if (href.includes('https---') || href.includes('http---')) {
                        const url = new URL(href);
                        const articleParam = url.searchParams.get('article');
                        
                        if (articleParam) {
                            const normalUrl = dashedToNormal(articleParam);
                            
                            if (normalUrl !== articleParam) {
                                url.searchParams.set('article', normalUrl);
                                link.setAttribute('href', url.toString());
                                debugLog('Fixed existing link href to:', url.toString());
                            }
                        }
                    }
                } catch (error) {
                    console.error('Error fixing existing link:', error);
                }
            }
        }, 1000);
    }
    
    /**
     * Initialize the URL transformer
     */
    function initialize() {
        debugLog('Initializing URL transformer');
        
        // Process current URL parameters
        processUrlParameters();
        
        // Set up global URL transformation fixes
        fixUrlTransformationGlobally();
        
        debugLog('URL transformer initialized');
    }
    
    // Run initialization
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})();
