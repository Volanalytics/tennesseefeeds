// Improved URL Handler for TennesseeFeeds
// This script fixes the issue with article URLs in shared links

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
     * Fix article URL handling
     * This function corrects the handling of transformed URLs
     */
    function fixArticleUrlHandling() {
        debugLog('Initializing URL handling fix');
        
        // The main issue is in how hyphens are converted back to slashes and dots
        // The previous fix was converting the URL incorrectly
        
        /**
         * Properly transform a dashed URL back to its original form
         * @param {string} dashedUrl - URL in dashed format (https---example--com-path)
         * @returns {string} - Properly formatted URL
         */
        function transformDashedToUrl(dashedUrl) {
            if (!dashedUrl || typeof dashedUrl !== 'string') return dashedUrl;
            
            // First, handle the protocol part (https---, http---)
            let url = dashedUrl;
            
            // Replace protocol part
            if (url.startsWith('https---')) {
                url = 'https://' + url.substring(8);
            } else if (url.startsWith('http---')) {
                url = 'http://' + url.substring(7);
            }
            
            // Now replace double hyphens with dots
            url = url.replace(/--/g, '.');
            
            // Replace remaining single hyphens with slashes, but be careful with legitimate hyphens in domain names
            // Split by dots first
            const parts = url.split('.');
            
            // Process each part (domain and path segments)
            for (let i = 0; i < parts.length; i++) {
                // For the domain part (usually parts[0]), we need to be careful not to replace legitimate hyphens
                if (i === 0 && parts[i].includes('://')) {
                    // This is the protocol + domain part
                    const protocolDomainParts = parts[i].split('://');
                    if (protocolDomainParts.length === 2) {
                        // Keep the domain part as is (it might have legitimate hyphens)
                        parts[i] = protocolDomainParts[0] + '://' + protocolDomainParts[1];
                    }
                } else if (i > 0) {
                    // For path parts and TLD, replace hyphens with slashes
                    parts[i] = parts[i].replace(/-/g, '/');
                }
            }
            
            // Rejoin everything
            url = parts.join('.');
            
            debugLog('Transformed URL from', dashedUrl, 'to', url);
            return url;
        }
        
        /**
         * Transform a URL to the dashed format
         * @param {string} url - Original URL
         * @returns {string} - URL in dashed format
         */
        function transformUrlToDashed(url) {
            if (!url || typeof url !== 'string') return url;
            
            // First handle the protocol
            let dashedUrl = url;
            
            if (dashedUrl.startsWith('https://')) {
                dashedUrl = 'https---' + dashedUrl.substring(8);
            } else if (dashedUrl.startsWith('http://')) {
                dashedUrl = 'http---' + dashedUrl.substring(7);
            }
            
            // Split by dots to preserve domain hyphens
            const parts = dashedUrl.split('.');
            
            // Replace dots with double hyphens
            dashedUrl = parts.join('--');
            
            // Now for each part, replace slashes with hyphens, but skip the domain part
            const protocolDomainParts = dashedUrl.split('---');
            if (protocolDomainParts.length >= 2) {
                const protocol = protocolDomainParts[0];
                const rest = protocolDomainParts.slice(1).join('---');
                
                // Replace slashes with hyphens in the rest of the URL
                const restWithHyphens = rest.replace(/\//g, '-');
                
                // Rejoin
                dashedUrl = protocol + '---' + restWithHyphens;
            } else {
                // Fallback: just replace all slashes with hyphens
                dashedUrl = dashedUrl.replace(/\//g, '-');
            }
            
            debugLog('Transformed URL from', url, 'to', dashedUrl);
            return dashedUrl;
        }
        
        // Override the URL parameter handling
        const originalHandleUrlParameters = window.handleUrlParameters || function() { return false; };
        
        window.handleUrlParameters = function() {
            debugLog('Enhanced URL parameter handler called');
            
            try {
                // Check for article parameter
                const urlParams = new URLSearchParams(window.location.search);
                let articleId = urlParams.get('article');
                
                if (articleId) {
                    debugLog('Found article ID in parameters:', articleId);
                    
                    // Check if it's a transformed URL
                    if (articleId.includes('https---') || articleId.includes('http---')) {
                        debugLog('Detected transformed URL, converting back to proper URL');
                        
                        // Transform it properly
                        const originalUrl = transformDashedToUrl(articleId);
                        debugLog('Original URL:', originalUrl);
                        
                        // Update the URL without reloading
                        if (originalUrl !== articleId) {
                            const newUrl = window.location.pathname + '?article=' + encodeURIComponent(originalUrl);
                            if (window.location.search.includes('&title=')) {
                                const titleParam = window.location.search.split('&title=')[1];
                                if (titleParam) {
                                    newUrl += '&title=' + titleParam;
                                }
                            }
                            
                            window.history.replaceState({}, '', newUrl);
                            debugLog('Updated URL to:', newUrl);
                            
                            // Update articleId for further processing
                            articleId = originalUrl;
                        }
                    }
                    
                    // Check if ArticleSystem exists and use it to fetch and display the article
                    if (window.ArticleSystem && window.ArticleSystem.fetchArticleById) {
                        // Attempt to fetch the article
                        window.ArticleSystem.fetchArticleById(articleId).then(article => {
                            if (article) {
                                window.ArticleSystem.showArticleView(article);
                                return true;
                            } else {
                                debugLog('Article not found by ID:', articleId);
                                
                                // Try with the original dashed version as fallback
                                if (!articleId.includes('https---') && !articleId.includes('http---')) {
                                    const dashedUrl = transformUrlToDashed(articleId);
                                    debugLog('Trying with dashed URL as fallback:', dashedUrl);
                                    
                                    return window.ArticleSystem.fetchArticleById(dashedUrl).then(fallbackArticle => {
                                        if (fallbackArticle) {
                                            window.ArticleSystem.showArticleView(fallbackArticle);
                                            return true;
                                        }
                                        return false;
                                    });
                                }
                                
                                return false;
                            }
                        }).catch(error => {
                            console.error('Error fetching article:', error);
                            return false;
                        });
                        
                        return true;
                    }
                }
                
                // Call the original handler if we didn't handle it
                return originalHandleUrlParameters();
            } catch (error) {
                console.error('Error in enhanced URL handler:', error);
                // Call the original handler as fallback
                return originalHandleUrlParameters();
            }
        };
        
        // Fix "View on TennesseeFeeds" links on share pages
        if (window.location.href.includes('/share/')) {
            setTimeout(fixSharePageButtons, 500);
        }
        
        // Fix links in the TennesseeFeeds page that go to article blocks
        document.addEventListener('click', function(event) {
            const link = event.target.closest('a[href*="tennesseefeeds.com/index.html?article="]');
            if (link) {
                const href = link.getAttribute('href');
                if (href && href.includes('https---')) {
                    debugLog('Intercepted click on article link:', href);
                    
                    // Extract the article ID
                    const articleIdMatch = href.match(/\?article=([^&]+)/);
                    if (articleIdMatch && articleIdMatch[1]) {
                        try {
                            const dashedArticleId = decodeURIComponent(articleIdMatch[1]);
                            const originalUrl = transformDashedToUrl(dashedArticleId);
                            
                            // Create fixed href
                            const fixedHref = href.replace(
                                /\?article=[^&]+/, 
                                `?article=${encodeURIComponent(originalUrl)}`
                            );
                            
                            debugLog('Fixed href:', fixedHref);
                            link.setAttribute('href', fixedHref);
                        } catch (error) {
                            console.error('Error fixing article link:', error);
                        }
                    }
                }
            }
        }, true); // Use capture phase to intercept before normal handling
        
        // Run the URL handler to handle any current parameters
        window.handleUrlParameters();
        
        debugLog('URL handling fix initialized');
    }
    
    /**
     * Fix buttons on share pages
     */
    function fixSharePageButtons() {
        debugLog('Fixing share page buttons');
        
        // Fix "View on TennesseeFeeds" button
        const tennesseeButton = document.querySelector('a[href*="tennesseefeeds.com"]');
        if (tennesseeButton) {
            const href = tennesseeButton.getAttribute('href');
            debugLog('Found TennesseeFeeds button with href:', href);
            
            if (href && href.includes('?article=')) {
                try {
                    // Extract the article ID
                    const articleIdMatch = href.match(/\?article=([^&]+)/);
                    if (articleIdMatch && articleIdMatch[1]) {
                        const dashedArticleId = decodeURIComponent(articleIdMatch[1]);
                        
                        // Get the current URL to extract the share ID
                        const shareId = window.location.pathname.split('/share/')[1];
                        if (shareId) {
                            // Fetch the original article URL from the API
                            fetch(`https://tennesseefeeds-api.onrender.com/api/share/${shareId}`)
                                .then(response => response.json())
                                .then(data => {
                                    if (data.success && data.share && data.share.article && data.share.article.url) {
                                        const articleUrl = data.share.article.url;
                                        debugLog('Got original article URL from API:', articleUrl);
                                        
                                        // Create a new href with the proper URL
                                        const newHref = href.replace(
                                            /\?article=[^&]+/, 
                                            `?article=${encodeURIComponent(articleUrl)}`
                                        );
                                        
                                        debugLog('Updated TennesseeFeeds button href to:', newHref);
                                        tennesseeButton.setAttribute('href', newHref);
                                    }
                                })
                                .catch(error => {
                                    console.error('Error fetching share data:', error);
                                });
                        }
                    }
                } catch (error) {
                    console.error('Error fixing TennesseeFeeds button:', error);
                }
            }
        }
        
        // Also fix the countdown redirect
        const scripts = document.querySelectorAll('script');
        scripts.forEach(script => {
            const content = script.textContent;
            if (content && content.includes('setTimeout') && content.includes('window.location.href')) {
                debugLog('Found redirect script, will attempt to fix');
                
                // Get the share ID
                const shareId = window.location.pathname.split('/share/')[1];
                if (shareId) {
                    // Fetch the original article URL
                    fetch(`https://tennesseefeeds-api.onrender.com/api/share/${shareId}`)
                        .then(response => response.json())
                        .then(data => {
                            if (data.success && data.share && data.share.article && data.share.article.url) {
                                const articleUrl = data.share.article.url;
                                debugLog('Got original URL for redirect:', articleUrl);
                                
                                // Override the redirect
                                window.setTimeout = function(callback, timeout) {
                                    if (timeout >= 3000 && callback.toString().includes('window.location')) {
                                        debugLog('Redirecting to proper URL after timeout');
                                        return setTimeout(() => {
                                            window.location.href = articleUrl;
                                        }, timeout);
                                    }
                                    return setTimeout(callback, timeout);
                                };
                            }
                        })
                        .catch(error => {
                            console.error('Error fetching share data for redirect:', error);
                        });
                }
            }
        });
    }
    
    // Initialize when the page is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', fixArticleUrlHandling);
    } else {
        fixArticleUrlHandling();
    }
})();
