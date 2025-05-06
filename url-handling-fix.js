// URL Format Fix for TennesseeFeeds
// This script ensures proper handling of article URLs in different formats

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
     * Convert URL from dashed format to normal format
     * @param {string} dashedUrl - URL in dashed format (e.g., https---wreg-com-news-...)
     * @returns {string} - Normal URL format (e.g., https://wreg.com/news/...)
     */
    function convertDashedToNormal(dashedUrl) {
        debugLog('Converting dashed URL to normal:', dashedUrl);
        
        if (!dashedUrl || typeof dashedUrl !== 'string') return dashedUrl;
        
        // Example input: https---wreg-com-news-man-shot-to-death-at-frayser-mcdonalds-
        // Expected output: https://wreg.com/news/man-shot-to-death-at-frayser-mcdonalds/
        
        try {
            // Replace https--- with https://
            let result = dashedUrl.replace(/^https---/, 'https://');
            
            // Replace http--- with http://
            result = result.replace(/^http---/, 'http://');
            
            // Find domain part (up to first '-' after protocol)
            const protocolEnd = result.indexOf('://');
            if (protocolEnd > -1) {
                const protocol = result.substring(0, protocolEnd + 3);
                const remainder = result.substring(protocolEnd + 3);
                
                // Split remainder by '-'
                const parts = remainder.split('-');
                
                // The first part is the domain, replace internal dashes with dots
                if (parts.length > 0) {
                    const domain = parts[0].replace(/--/g, '.').replace(/-/g, '.');
                    
                    // The rest are path segments, join with slashes
                    const path = parts.slice(1).join('/');
                    
                    // Combine everything
                    result = protocol + domain;
                    if (path) {
                        result += '/' + path;
                    }
                    
                    // If the URL ends with a dash, it was a trailing slash
                    if (dashedUrl.endsWith('-')) {
                        result += '/';
                    }
                }
            }
            
            debugLog('Converted to normal URL:', result);
            return result;
        } catch (error) {
            console.error('Error converting dashed URL:', error);
            return dashedUrl;
        }
    }
    
    /**
     * Handle URL parameters on page load
     */
    function handleUrlParams() {
        debugLog('Checking URL parameters');
        
        try {
            // Check for article parameter
            const urlParams = new URLSearchParams(window.location.search);
            const articleParam = urlParams.get('article');
            
            if (articleParam) {
                debugLog('Found article parameter:', articleParam);
                
                // Check if it's a dashed URL
                if (articleParam.includes('https---') || articleParam.includes('http---')) {
                    debugLog('This is a dashed URL, converting to normal format');
                    
                    // Convert it to normal URL format
                    const normalUrl = convertDashedToNormal(articleParam);
                    
                    // If successful and different from original, update the URL
                    if (normalUrl && normalUrl !== articleParam) {
                        // Create new URL with the converted article parameter
                        let newUrl = window.location.pathname + '?article=' + encodeURIComponent(normalUrl);
                        
                        // Preserve any other parameters
                        for (const [key, value] of urlParams.entries()) {
                            if (key !== 'article') {
                                newUrl += '&' + key + '=' + encodeURIComponent(value);
                            }
                        }
                        
                        // Update the URL without reloading
                        window.history.replaceState({}, '', newUrl);
                        debugLog('Updated URL to:', newUrl);
                        
                        // Force reload page with fixed URL (uncomment if needed)
                        // window.location.href = newUrl;
                        // return;
                    }
                }
            }
            
            // If we're on a share page, fix the buttons
            if (window.location.href.includes('/share/')) {
                fixSharePageButtons();
            }
            
        } catch (error) {
            console.error('Error handling URL parameters:', error);
        }
    }
    
    /**
     * Fix buttons on share pages
     */
    function fixSharePageButtons() {
        debugLog('Fixing share page buttons');
        
        // Wait a bit to ensure the DOM is fully loaded
        setTimeout(() => {
            // Get the share ID from the URL
            const shareId = window.location.pathname.split('/share/')[1];
            if (!shareId) return;
            
            debugLog('Share ID:', shareId);
            
            // Fetch the share data to get the correct article URL
            fetch(`https://tennesseefeeds-api.onrender.com/api/share/${shareId}`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`API responded with status ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.success && data.share && data.share.article) {
                        const article = data.share.article;
                        const originalUrl = article.url;
                        
                        debugLog('Found original article URL:', originalUrl);
                        
                        // Fix the "View on TennesseeFeeds" button
                        const tennesseeButton = Array.from(document.querySelectorAll('a.button, a')).find(a => 
                            a.textContent.includes('TennesseeFeeds') || 
                            a.href.includes('tennesseefeeds.com')
                        );
                        
                        if (tennesseeButton) {
                            debugLog('Found TennesseeFeeds button:', tennesseeButton);
                            
                            // Create a proper URL with the original article URL
                            const newHref = `https://tennesseefeeds.com/?article=${encodeURIComponent(originalUrl)}`;
                            
                            tennesseeButton.setAttribute('href', newHref);
                            debugLog('Updated TennesseeFeeds button href to:', newHref);
                        }
                        
                        // Fix the "Read Full Article" button
                        const readButton = Array.from(document.querySelectorAll('a.button, a')).find(a => 
                            a.textContent.includes('Read') || 
                            a.textContent.includes('Article') ||
                            (a.href && a.href !== '#' && !a.href.includes('tennesseefeeds.com'))
                        );
                        
                        if (readButton) {
                            debugLog('Found Read Article button:', readButton);
                            
                            // Set it to the original URL
                            readButton.setAttribute('href', originalUrl);
                            debugLog('Updated Read Article button href to:', originalUrl);
                        }
                        
                        // Fix automatic redirect if present
                        const countdownElement = document.getElementById('countdown');
                        if (countdownElement) {
                            debugLog('Found countdown element, fixing redirect');
                            
                            // Override setTimeout to catch the redirect
                            const originalSetTimeout = window.setTimeout;
                            window.setTimeout = function(callback, delay) {
                                // Check if this is a redirect
                                if (delay > 1000 && callback.toString().includes('window.location')) {
                                    debugLog('Intercepted redirect, will use proper URL');
                                    
                                    // Replace with our own redirect to the actual article URL
                                    return originalSetTimeout(() => {
                                        window.location.href = originalUrl;
                                    }, delay);
                                }
                                
                                // Otherwise, pass through to original
                                return originalSetTimeout(callback, delay);
                            };
                        }
                    }
                })
                .catch(error => {
                    console.error('Error fetching share data:', error);
                });
        }, 500);
    }
    
    /**
     * Initialize this fix
     */
    function init() {
        debugLog('Initializing URL format fix');
        
        // Process URL parameters on current page
        handleUrlParams();
        
        // Add listener for link clicks to ensure proper formatting
        document.addEventListener('click', event => {
            // Find if the click was on a link or inside a link
            const link = event.target.closest('a');
            if (!link) return;
            
            const href = link.getAttribute('href');
            if (!href) return;
            
            // Check if this is a link to TennesseeFeeds with an article parameter
            if (href.includes('tennesseefeeds.com') && href.includes('?article=')) {
                debugLog('Intercepted click on TennesseeFeeds article link');
                
                try {
                    // Extract article parameter
                    const urlObj = new URL(href);
                    const articleParam = urlObj.searchParams.get('article');
                    
                    if (articleParam && (articleParam.includes('https---') || articleParam.includes('http---'))) {
                        debugLog('Link contains dashed URL:', articleParam);
                        
                        // Convert to normal URL
                        const normalUrl = convertDashedToNormal(articleParam);
                        
                        // Update the href
                        urlObj.searchParams.set('article', normalUrl);
                        
                        // Set the new URL
                        link.setAttribute('href', urlObj.toString());
                        debugLog('Updated link href to:', urlObj.toString());
                    }
                } catch (error) {
                    console.error('Error fixing link href:', error);
                }
            }
        }, true); // Use capturing to intercept before normal click handling
        
        // Fix any existing links on the page
        setTimeout(() => {
            const links = document.querySelectorAll('a[href*="tennesseefeeds.com"][href*="?article="]');
            links.forEach(link => {
                try {
                    const href = link.getAttribute('href');
                    const urlObj = new URL(href);
                    const articleParam = urlObj.searchParams.get('article');
                    
                    if (articleParam && (articleParam.includes('https---') || articleParam.includes('http---'))) {
                        const normalUrl = convertDashedToNormal(articleParam);
                        urlObj.searchParams.set('article', normalUrl);
                        link.setAttribute('href', urlObj.toString());
                    }
                } catch (error) {
                    console.error('Error fixing existing link:', error);
                }
            });
        }, 1000);
        
        debugLog('URL format fix initialized');
    }
    
    // Run the initialization
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
