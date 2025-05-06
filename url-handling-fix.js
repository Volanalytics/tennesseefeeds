// Fixed URL Handler for TennesseeFeeds
// This script fixes the issue with article URLs in shared links not working properly

(function() {
    // Configuration
    const DEBUG = true; // Set to false in production
    
    /**
     * Debug logging function
     */
    function debugLog(...args) {
        if (DEBUG) {
            console.log('[URLFix]', ...args);
        }
    }
    
    /**
     * Fix article URL handling on page load
     * This function corrects how article IDs are handled from share URLs
     */
    function fixArticleUrlHandling() {
        debugLog('Fixing article URL handling');
        
        // Replace the original URL handling function or wrap around it
        const originalHandleUrlParameters = window.handleUrlParameters || function() { return false; };
        
        // Create our enhanced version
        window.handleUrlParameters = function() {
            debugLog('Enhanced URL parameter handler called');
            
            // Check for article parameter
            const urlParams = new URLSearchParams(window.location.search);
            let articleId = urlParams.get('article');
            
            if (articleId) {
                debugLog('Found article ID in parameters:', articleId);
                
                // Check if it's a transformed URL (containing "https---" pattern)
                if (articleId.includes('https---')) {
                    debugLog('Detected transformed URL, converting back to proper URL');
                    
                    // Convert from "https---site-com-path" format back to "https://site.com/path"
                    const fixedArticleId = articleId
                        .replace(/https---/g, 'https://')
                        .replace(/http---/g, 'http://')
                        .replace(/---/g, '://')
                        .replace(/--/g, '..')
                        .replace(/-/g, '/');
                    
                    debugLog('Converted article ID:', fixedArticleId);
                    
                    // Update the URL without reloading the page
                    const newUrl = window.location.pathname + '?article=' + encodeURIComponent(fixedArticleId);
                    window.history.replaceState({}, '', newUrl);
                    
                    // Now get the updated URL params
                    const newUrlParams = new URLSearchParams(window.location.search);
                    articleId = newUrlParams.get('article');
                    
                    debugLog('Updated article ID in URL:', articleId);
                }
                
                // Check if it's a valid URL before proceeding
                if (articleId === '#' || articleId === 'undefined' || (!articleId.includes('://') && !articleId.startsWith('/'))) {
                    debugLog('Invalid article URL detected:', articleId);
                    return false;
                }
                
                // Check if ArticleSystem exists and use its fetch function
                if (window.ArticleSystem && window.ArticleSystem.fetchArticleById) {
                    // Show loading indicator
                    if (window.ArticleSystem.showArticleLoading) {
                        window.ArticleSystem.showArticleLoading();
                    }
                    
                    // Fetch and display the article
                    window.ArticleSystem.fetchArticleById(articleId).then(article => {
                        if (article) {
                            window.ArticleSystem.showArticleView(article);
                            return true;
                        } else {
                            debugLog('Article not found by ID:', articleId);
                            return false;
                        }
                    }).catch(error => {
                        console.error('Error fetching article:', error);
                        return false;
                    });
                    
                    return true;
                }
            }
            
            // If we didn't handle it, call the original function
            return originalHandleUrlParameters();
        };
        
        // Also fix the article fetch function if ArticleSystem exists
        if (window.ArticleSystem && window.ArticleSystem.fetchArticleById) {
            const originalFetchArticleById = window.ArticleSystem.fetchArticleById;
            
            window.ArticleSystem.fetchArticleById = async function(articleId) {
                // Check if it's a transformed URL
                if (articleId && articleId.includes('https---')) {
                    debugLog('Converting transformed article ID before fetching:', articleId);
                    
                    // Convert from "https---site-com-path" format back to "https://site.com/path"
                    articleId = articleId
                        .replace(/https---/g, 'https://')
                        .replace(/http---/g, 'http://')
                        .replace(/---/g, '://')
                        .replace(/--/g, '..')
                        .replace(/-/g, '/');
                    
                    debugLog('Converted to:', articleId);
                }
                
                // Call the original function with the fixed ID
                return originalFetchArticleById(articleId);
            };
        }
        
        // Also fix the createArticleUrl function for new shares
        if (window.ArticleSystem && window.ArticleSystem.createArticleUrl) {
            const originalCreateArticleUrl = window.ArticleSystem.createArticleUrl;
            
            window.ArticleSystem.createArticleUrl = function(articleId, title) {
                // If this is a normal URL, convert it to the dashed format
                if (articleId && articleId.includes('://')) {
                    debugLog('Converting URL to compatible format for createArticleUrl:', articleId);
                    
                    // Create a URL-safe ID that will still work with our fix
                    const transformedArticleId = articleId
                        .replace(/https:\/\//g, 'https---')
                        .replace(/http:\/\//g, 'http---')
                        .replace(/:/g, '---')
                        .replace(/\./g, '--')
                        .replace(/\//g, '-');
                    
                    debugLog('Transformed ID:', transformedArticleId);
                    
                    return originalCreateArticleUrl(transformedArticleId, title);
                }
                
                return originalCreateArticleUrl(articleId, title);
            };
        }
        
        // Check if we're on the share page and fix buttons if needed
        if (window.location.href.includes('/share/')) {
            fixSharePageButtons();
        }
        
        // Run the URL handler immediately to handle any current parameters
        window.handleUrlParameters();
        
        debugLog('URL handling fixed successfully');
    }
    
    /**
     * Fix buttons on share pages to ensure they use the correct article URL format
     */
    function fixSharePageButtons() {
        debugLog('Fixing share page buttons');
        
        // Wait for DOM to be fully loaded
        setTimeout(() => {
            // Find the "View on TennesseeFeeds" button
            const tenfeedsButton = document.querySelector('a[href*="tennesseefeeds.com"]');
            
            if (tenfeedsButton) {
                const href = tenfeedsButton.getAttribute('href');
                debugLog('Found TennesseeFeeds button with href:', href);
                
                // Check if it contains a transformed URL
                if (href.includes('?article=') && href.includes('https---')) {
                    // Extract the article ID
                    const articleIdMatch = href.match(/\?article=([^&]+)/);
                    if (articleIdMatch && articleIdMatch[1]) {
                        const transformedArticleId = decodeURIComponent(articleIdMatch[1]);
                        
                        // Convert back to a proper URL
                        const properArticleId = transformedArticleId
                            .replace(/https---/g, 'https://')
                            .replace(/http---/g, 'http://')
                            .replace(/---/g, '://')
                            .replace(/--/g, '..')
                            .replace(/-/g, '/');
                        
                        // Create new href
                        const newHref = href.replace(
                            /\?article=[^&]+/, 
                            `?article=${encodeURIComponent(properArticleId)}`
                        );
                        
                        debugLog('Updating href from', href, 'to', newHref);
                        tenfeedsButton.setAttribute('href', newHref);
                    }
                }
            }
            
            // Find the "Read Full Article" button
            const readButton = document.querySelector('a[href]:not([href*="tennesseefeeds.com"])');
            
            if (readButton) {
                const href = readButton.getAttribute('href');
                debugLog('Found Read Article button with href:', href);
                
                // Make sure it's not a placeholder or hash link
                if (href === '#' || href === 'javascript:void(0)') {
                    // Try to extract the article URL from the current URL
                    const shareId = window.location.pathname.split('/share/')[1];
                    if (shareId) {
                        debugLog('Extracted share ID:', shareId);
                        
                        // Fetch the share data to get the proper URL
                        fetch(`https://tennesseefeeds-api.onrender.com/api/share/${shareId}`)
                            .then(response => response.json())
                            .then(data => {
                                if (data.success && data.share && data.share.article && data.share.article.url) {
                                    const articleUrl = data.share.article.url;
                                    debugLog('Setting proper article URL:', articleUrl);
                                    readButton.setAttribute('href', articleUrl);
                                }
                            })
                            .catch(error => {
                                console.error('Error fetching share data:', error);
                            });
                    }
                }
            }
        }, 500); // Wait for 500ms to ensure DOM is loaded
    }
    
    // Run when the DOM is loaded or immediately if already loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', fixArticleUrlHandling);
    } else {
        fixArticleUrlHandling();
    }
})();
