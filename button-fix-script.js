/**
 * This script fixes the buttons on the TennesseeFeeds share page
 * Add this to article-system.js or include it as a separate script
 */
(function() {
    // Execute this script immediately when it loads
    console.log('[ButtonFix] Script loaded');
    
    // Check if we're on a share page
    if (window.location.href.includes('/share/')) {
        console.log('[ButtonFix] Share page detected');
        
        // Run the fix function immediately and also after a short delay
        fixShareButtons();
        // Also run after DOM is fully loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', fixShareButtons);
        }
        // Run one more time after a delay to catch any dynamic button updates
        setTimeout(fixShareButtons, 1000);
    }
    
    /**
     * Fix the buttons on the share page
     */
    function fixShareButtons() {
        try {
            console.log('[ButtonFix] Fixing share buttons');
            
            // Get the share ID from the URL
            const urlPath = window.location.pathname;
            const shareId = urlPath.split('/share/')[1]?.split('?')[0]?.split('#')[0];
            
            if (!shareId) {
                console.error('[ButtonFix] Could not extract share ID from URL:', urlPath);
                return;
            }
            
            console.log('[ButtonFix] Share ID:', shareId);
            
            // Look for the Read Full Article button
            const buttons = document.querySelectorAll('.buttons a, .button, a.button');
            console.log('[ButtonFix] Found buttons:', buttons.length);
            
            if (buttons.length === 0) {
                console.error('[ButtonFix] No buttons found');
                return;
            }
            
            // Try to find the actual article URL from the page content
            const articleUrl = findArticleUrl();
            console.log('[ButtonFix] Extracted article URL:', articleUrl);
            
            buttons.forEach(button => {
                const buttonText = button.textContent.trim().toLowerCase();
                console.log('[ButtonFix] Processing button:', buttonText);
                
                if (buttonText.includes('read') || buttonText.includes('article')) {
                    // This is the Read Full Article button
                    const currentHref = button.getAttribute('href');
                    console.log('[ButtonFix] Read button current href:', currentHref);
                    
                    // Only fix if the current URL is invalid or points back to the share page
                    if (!currentHref || 
                        currentHref === '#' || 
                        currentHref.includes('/share/') || 
                        currentHref.includes('share.tennesseefeeds.com')) {
                        
                        if (articleUrl) {
                            console.log('[ButtonFix] Setting Read button href to:', articleUrl);
                            button.setAttribute('href', articleUrl);
                        } else {
                            // Try to extract the URL from a script in the page
                            const redirectUrl = findRedirectUrl();
                            if (redirectUrl) {
                                console.log('[ButtonFix] Setting Read button href to redirect URL:', redirectUrl);
                                button.setAttribute('href', redirectUrl);
                            }
                        }
                    }
                } else if (buttonText.includes('tennessee')) {
                    // This is the View on TennesseeFeeds button
                    const currentHref = button.getAttribute('href');
                    console.log('[ButtonFix] Tennessee button current href:', currentHref);
                    
                    // Fix if the current URL has a broken article parameter
                    if (currentHref && (
                        currentHref.includes('?article=#') || 
                        currentHref.endsWith('?article=') || 
                        !currentHref.includes(shareId))) {
                        
                        // Create the proper URL with the share ID
                        let baseUrl = 'https://tennesseefeeds.com';
                        
                        // Preserve the base domain if it's already pointing to a specific URL
                        if (currentHref.startsWith('http')) {
                            const urlObj = new URL(currentHref);
                            baseUrl = urlObj.origin;
                        }
                        
                        const newUrl = `${baseUrl}/?article=${encodeURIComponent(shareId)}`;
                        console.log('[ButtonFix] Setting Tennessee button href to:', newUrl);
                        button.setAttribute('href', newUrl);
                    }
                }
            });
            
            // Also fix the automatic redirect to make sure it uses the correct URL
            fixRedirectScript(articleUrl);
            
            console.log('[ButtonFix] Buttons fixed successfully');
        } catch (error) {
            console.error('[ButtonFix] Error fixing buttons:', error);
        }
    }
    
    /**
     * Try to find the article URL from elements on the page
     * @returns {string|null} The article URL or null if not found
     */
    function findArticleUrl() {
        try {
            // Method 1: Check for article info in the description text
            const description = document.querySelector('.description');
            if (description) {
                const descriptionText = description.textContent;
                // Look for URLs in the description
                const urlMatch = /https?:\/\/[^\s"']+/.exec(descriptionText);
                if (urlMatch) {
                    return urlMatch[0];
                }
            }
            
            // Method 2: Try to find the article URL in meta tags
            const metaTags = document.querySelectorAll('meta[property="og:url"], meta[name="twitter:url"]');
            for (const tag of metaTags) {
                const content = tag.getAttribute('content');
                if (content && !content.includes('share.tennesseefeeds.com') && !content.includes('/share/')) {
                    return content;
                }
            }
            
            // Method 3: Look for a paragraph with possible article details
            const paragraphs = document.querySelectorAll('p');
            for (const p of paragraphs) {
                const text = p.textContent;
                const urlMatch = /https?:\/\/[^\s"']+/.exec(text);
                if (urlMatch) {
                    return urlMatch[0];
                }
            }
            
            // Method 4: Check for any link in the page that might be the article
            const links = document.querySelectorAll('a:not(.button)');
            for (const link of links) {
                const href = link.getAttribute('href');
                if (href && 
                    href !== '#' && 
                    !href.includes('share.tennesseefeeds.com') && 
                    !href.includes('/share/') &&
                    href.startsWith('http')) {
                    return href;
                }
            }
            
            return null;
        } catch (error) {
            console.error('[ButtonFix] Error finding article URL:', error);
            return null;
        }
    }
    
    /**
     * Try to find the redirect URL in any script tags
     * @returns {string|null} The redirect URL or null if not found
     */
    function findRedirectUrl() {
        try {
            const scripts = document.querySelectorAll('script');
            for (const script of scripts) {
                const content = script.textContent;
                if (content && content.includes('window.location') && content.includes('setTimeout')) {
                    // Look for URL in the redirect script
                    const urlMatch = /window\.location\.href\s*=\s*["']([^"']+)["']/.exec(content);
                    if (urlMatch && urlMatch[1]) {
                        return urlMatch[1];
                    }
                }
            }
            
            return null;
        } catch (error) {
            console.error('[ButtonFix] Error finding redirect URL:', error);
            return null;
        }
    }
    
    /**
     * Fix the automatic redirect script
     * @param {string|null} articleUrl - The article URL if found
     */
    function fixRedirectScript(articleUrl) {
        try {
            // Only fix if we have an article URL
            if (!articleUrl) {
                return;
            }
            
            // Look for any setTimeout calls that might be redirecting
            const originalSetTimeout = window.setTimeout;
            window.setTimeout = function(callback, timeout) {
                // Only intercept setTimeout calls that look like redirects
                if (typeof callback === 'function' && timeout >= 3000) {
                    const callbackStr = callback.toString();
                    
                    // If this looks like a redirect function, replace it
                    if (callbackStr.includes('window.location')) {
                        console.log('[ButtonFix] Intercepting redirect setTimeout');
                        
                        // Instead of original redirect, use our known article URL
                        return originalSetTimeout(function() {
                            console.log('[ButtonFix] Redirecting to article URL:', articleUrl);
                            window.location.href = articleUrl;
                        }, timeout);
                    }
                }
                
                // For all other setTimeout calls, use the original
                return originalSetTimeout(callback, timeout);
            };
        } catch (error) {
            console.error('[ButtonFix] Error fixing redirect script:', error);
        }
    }
})();