/**
 * Direct Share Button Fix for TennesseeFeeds
 */
(function() {
    console.log('[ShareFix] Loading share button fix script');

    // Fix existing share pages immediately
    if (location.href.includes('/share/')) {
        fixSharePageButtons();
    }

    // Fix the share button clicks directly
    document.addEventListener('click', function(event) {
        // Find if this is a share button
        const shareButton = event.target.closest('.share-btn, [data-action="share"], #article-share-btn');
        if (!shareButton) return;

        console.log('[ShareFix] Share button click detected');
            
        // Find the article card or container
        const articleContainer = shareButton.closest('[data-article-id]');
        if (!articleContainer) return;

        // Get the article ID
        const articleId = articleContainer.dataset.articleId;
        console.log('[ShareFix] Article ID found:', articleId);
        
        // If the article ID is invalid, prevent the default action
        if (!articleId || articleId === '#') {
            // Stop the default action
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            
            console.log('[ShareFix] Preventing share with invalid article ID');
            
            // Find better article data
            const articleData = extractArticleData(articleContainer);
            console.log('[ShareFix] Extracted article data:', articleData);
            
            // Update the article ID if we found better data
            if (articleData.id && articleData.id !== '#') {
                console.log('[ShareFix] Updating article ID to:', articleData.id);
                articleContainer.dataset.articleId = articleData.id;
                
                // Also update the button if it has an article ID
                if ('articleId' in shareButton.dataset) {
                    shareButton.dataset.articleId = articleData.id;
                }
                
                // Re-trigger the click after a short delay
                setTimeout(function() {
                    console.log('[ShareFix] Re-triggering share click with valid ID');
                    shareButton.click();
                }, 10);
            } else {
                alert('Unable to share this article properly. Please try another article.');
            }
        }
    }, true); // Use capture phase to intercept before other handlers

    /**
     * Extract better article data from the article container
     */
    function extractArticleData(container) {
        const data = {
            id: null,
            url: null,
            title: null,
            source: null
        };
        
        try {
            // Get title and link from header
            const titleElement = container.querySelector('h3 a');
            if (titleElement) {
                data.title = titleElement.textContent.trim();
                data.url = titleElement.getAttribute('href');
                
                // Generate better ID from URL if possible
                if (data.url && data.url !== '#') {
                    data.id = generateArticleId(data.url);
                } else if (data.title) {
                    // Or from title if URL not available
                    data.id = generateArticleId(data.title);
                }
            }
            
            // Get source
            const sourceElement = container.querySelector('.text-sm.text-neutral-500');
            if (sourceElement) {
                data.source = sourceElement.textContent.trim();
            }
            
            // If we still don't have an ID, generate a random one
            if (!data.id) {
                data.id = 'article-' + Math.random().toString(36).substring(2, 10);
            }
        } catch (error) {
            console.error('[ShareFix] Error extracting article data:', error);
        }
        
        return data;
    }
    
    /**
     * Generate an article ID from a URL or title
     */
    function generateArticleId(input) {
        if (!input) return null;
        
        try {
            // For URLs, extract last segment
            if (input.startsWith('http')) {
                const cleanUrl = input.split('?')[0].split('#')[0];
                const segments = cleanUrl.split('/').filter(s => s.trim() !== '');
                if (segments.length > 0) {
                    return segments[segments.length - 1].replace(/[^a-zA-Z0-9]/g, '-');
                }
            }
            
            // For titles, create a slug
            return input.toLowerCase()
                .replace(/[^\w\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .substring(0, 50);
        } catch (e) {
            console.error('[ShareFix] Error generating article ID:', e);
            return 'article-' + Math.random().toString(36).substring(2, 10);
        }
    }
    
    /**
     * Fix buttons on share pages
     */
    function fixSharePageButtons() {
        console.log('[ShareFix] Fixing share page buttons');
        
        try {
            // Get the share ID from the URL
            const shareId = location.pathname.split('/share/')[1]?.split('?')[0]?.split('#')[0];
            if (!shareId) return;
            
            // Get article title
            const title = document.querySelector('h1')?.textContent.trim();
            console.log('[ShareFix] Article title:', title);
            
            // Get the source
            const source = document.querySelector('.source')?.textContent.replace('Source:', '').trim();
            console.log('[ShareFix] Article source:', source);
            
            // Look for the read article button
            const readButton = findButtonByText(['read', 'article']);
            if (readButton) {
                const currentHref = readButton.getAttribute('href') || '';
                
                // Find a better URL
                findBetterArticleUrl(title, source).then(betterUrl => {
                    if (betterUrl && betterUrl !== '#' && currentHref === '#') {
                        console.log('[ShareFix] Setting read button URL to:', betterUrl);
                        readButton.setAttribute('href', betterUrl);
                        
                        // Also fix redirect
                        fixRedirect(betterUrl);
                    }
                });
            }
            
            // Look for the TennesseeFeeds button
            const tnButton = findButtonByText(['tennessee', 'go to']);
            if (tnButton) {
                const currentHref = tnButton.getAttribute('href') || '';
                
                // Check if the URL is incomplete
                if (currentHref === '#' || 
                    currentHref.includes('?article=#') || 
                    currentHref.endsWith('?article=')) {
                    
                    // Create a proper URL
                    let baseUrl = 'https://tennesseefeeds.com';
                    if (currentHref.startsWith('http')) {
                        try {
                            const url = new URL(currentHref);
                            baseUrl = url.origin + url.pathname.split('?')[0];
                        } catch (e) {}
                    }
                    
                    const newUrl = `${baseUrl}?article=${encodeURIComponent(shareId)}`;
                    console.log('[ShareFix] Setting TN button URL to:', newUrl);
                    tnButton.setAttribute('href', newUrl);
                }
            }
        } catch (error) {
            console.error('[ShareFix] Error fixing share page buttons:', error);
        }
    }
    
    /**
     * Find a button by text content
     */
    function findButtonByText(terms) {
        const buttons = document.querySelectorAll('.button, a.button, .buttons a');
        for (const button of buttons) {
            const text = button.textContent.toLowerCase().trim();
            if (terms.some(term => text.includes(term))) {
                return button;
            }
        }
        return null;
    }
    
    /**
     * Find a better article URL based on title and source
     */
    async function findBetterArticleUrl(title, source) {
        if (!title) return null;
        
        try {
            // Try to find the article in the feed
            const apiUrl = 'https://tennesseefeeds-api.onrender.com/api/feeds';
            const response = await fetch(apiUrl);
            
            if (response.ok) {
                const data = await response.json();
                
                if (data.success && data.articles) {
                    // Look for matching article
                    const matchingArticle = data.articles.find(article => {
                        const titleMatch = article.title && 
                            (article.title.includes(title) || title.includes(article.title));
                        const sourceMatch = article.source && source && 
                            (article.source.includes(source) || source.includes(article.source));
                        return titleMatch && (source ? sourceMatch : true);
                    });
                    
                    if (matchingArticle && matchingArticle.link) {
                        return matchingArticle.link;
                    }
                }
            }
            
            return null;
        } catch (error) {
            console.error('[ShareFix] Error finding better article URL:', error);
            return null;
        }
    }
    
    /**
     * Fix the automatic redirect
     */
    function fixRedirect(url) {
        if (!url || url === '#') return;
        
        const originalSetTimeout = window.setTimeout;
        window.setTimeout = function(callback, timeout) {
            if (typeof callback === 'function' && timeout >= 3000) {
                const callbackStr = callback.toString();
                if (callbackStr.includes('window.location')) {
                    console.log('[ShareFix] Intercepting redirect timeout');
                    return originalSetTimeout(function() {
                        console.log('[ShareFix] Redirecting to:', url);
                        window.location.href = url;
                    }, timeout);
                }
            }
            return originalSetTimeout(callback, timeout);
        };
    }
})();
