/**
 * Emergency Share Button Fix for TennesseeFeeds
 */
(function() {
    console.log('Share button fix active');
    
    // PART 1: Fix buttons on share pages
    if (window.location.href.includes('/share/')) {
        // Run immediately and after a short delay
        fixSharePage();
        setTimeout(fixSharePage, 500);
    }
    
    /**
     * Fix share page buttons and redirect
     */
    function fixSharePage() {
        try {
            // Get the share ID from URL
            const shareId = window.location.pathname.split('/share/')[1]?.split('?')[0];
            if (!shareId) return;
            
            // Get article title from the page
            const title = document.querySelector('h1')?.textContent.trim();
            if (!title) return;
            
            console.log('Fixing share page for:', title);
            
            // Find the buttons
            const buttons = document.querySelectorAll('.buttons a, a.button');
            
            // Set proper URLs for both buttons
            buttons.forEach(button => {
                const text = button.textContent.toLowerCase();
                
                if (text.includes('tennessee') || text.includes('go to')) {
                    // This is the TennesseeFeeds button
                    const newUrl = `https://tennesseefeeds.com/?article=${shareId}`;
                    console.log('Setting TN button URL to:', newUrl);
                    button.setAttribute('href', newUrl);
                }
                
                // For the read article button, we'll search for the article
                if (text.includes('read') || text.includes('article')) {
                    findArticleUrl(title).then(url => {
                        if (url) {
                            console.log('Setting article URL to:', url);
                            button.setAttribute('href', url);
                            
                            // Also fix the redirect
                            fixRedirect(url);
                        }
                    });
                }
            });
        } catch (error) {
            console.error('Error fixing share page:', error);
        }
    }
    
    /**
     * Find real article URL based on title
     */
    async function findArticleUrl(title) {
        try {
            // Get articles from API
            const response = await fetch('https://tennesseefeeds-api.onrender.com/api/feeds');
            if (!response.ok) return null;
            
            const data = await response.json();
            if (!data.success || !data.articles) return null;
            
            // Find matching article
            const matching = data.articles.find(article => 
                article.title && article.title.includes(title) || title.includes(article.title)
            );
            
            if (matching && matching.link) {
                return matching.link;
            }
            
            return null;
        } catch (error) {
            console.error('Error finding article URL:', error);
            return null;
        }
    }
    
    /**
     * Fix automatic redirect
     */
    function fixRedirect(url) {
        const originalSetTimeout = window.setTimeout;
        window.setTimeout = function(callback, timeout) {
            if (typeof callback === 'function' && timeout > 2000) {
                const stringCallback = callback.toString();
                if (stringCallback.includes('redirect') || stringCallback.includes('window.location')) {
                    return originalSetTimeout(function() {
                        window.location.href = url;
                    }, timeout);
                }
            }
            return originalSetTimeout(callback, timeout);
        };
    }
    
    // PART 2: Fix share button clicks
    document.addEventListener('click', function(event) {
        // Find share button
        const shareBtn = event.target.closest('.share-btn, #article-share-btn');
        if (!shareBtn) return;
        
        // Find container with articleId
        const container = shareBtn.closest('[data-article-id]');
        if (!container) return;
        
        // Check if articleId is invalid
        if (container.dataset.articleId === '#') {
            // Stop the click
            event.preventDefault();
            event.stopPropagation();
            
            // Find better article ID
            const linkElem = container.querySelector('h3 a');
            if (linkElem && linkElem.href) {
                const betterId = linkElem.href.replace(/[^a-zA-Z0-9]/g, '-');
                console.log('Fixing invalid article ID to:', betterId);
                
                // Update the article ID
                container.dataset.articleId = betterId;
                
                // Re-trigger click after a short delay
                setTimeout(() => shareBtn.click(), 10);
            }
        }
    }, true);
})();
