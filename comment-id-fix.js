/**
 * Direct Comment System Fix
 * 
 * This script fixes the comment system by ensuring article IDs are consistent
 * across different views of the same article.
 */

(function() {
    // Store the original functions
    const originalPostComment = window.postComment;
    const originalLoadComments = window.loadComments;
    
    // Create a simple way to extract a consistent article ID
    function getConsistentArticleId(articleId) {
        // If it's a URL or already processed ID with dashes
        if (articleId.includes('http') || articleId.includes('---')) {
            // Extract the article title from the URL or ID
            const parts = articleId.split('/');
            const lastPart = parts[parts.length - 1] || '';
            // Remove file extension if present
            return lastPart.replace('.html', '').replace(/[^a-zA-Z0-9-]/g, '-');
        }
        // Otherwise, keep as is
        return articleId;
    }
    
    // Helper to update data attributes on HTML elements
    function updateArticleIdInDOM(oldId, newId) {
        // Update article elements
        document.querySelectorAll(`[data-article-id="${oldId}"]`).forEach(element => {
            element.dataset.articleId = newId;
        });
        
        // Update comments section
        document.querySelectorAll(`.comments-section[data-article-id="${oldId}"]`).forEach(element => {
            element.dataset.articleId = newId;
        });
        
        // Update comments container
        document.querySelectorAll(`[data-comments-container="${oldId}"]`).forEach(element => {
            element.dataset.commentsContainer = newId;
        });
    }
    
    // Override post comment function
    window.postComment = async function(supabase, articleId, username, content, title, source, url, parentId = null) {
        // Get a consistent article ID
        const newArticleId = getConsistentArticleId(articleId);
        console.log(`Post comment: Changing article ID from ${articleId} to ${newArticleId}`);
        
        // Update DOM elements with the new ID
        updateArticleIdInDOM(articleId, newArticleId);
        
        // Call original function with the new ID
        return originalPostComment(supabase, newArticleId, username, content, title, source, url, parentId);
    };
    
    // Override load comments function
    window.loadComments = async function(articleId) {
        // Get a consistent article ID
        const newArticleId = getConsistentArticleId(articleId);
        console.log(`Load comments: Changing article ID from ${articleId} to ${newArticleId}`);
        
        // Update DOM elements with the new ID
        updateArticleIdInDOM(articleId, newArticleId);
        
        // Call original function with the new ID
        return originalLoadComments(newArticleId);
    };
    
    // Fix article URLs when transitioning between views
    if (window.ArticleSystem && window.ArticleSystem.createArticleUrl) {
        const originalCreateArticleUrl = window.ArticleSystem.createArticleUrl;
        window.ArticleSystem.createArticleUrl = function(articleId, title = '') {
            const newArticleId = getConsistentArticleId(articleId);
            return originalCreateArticleUrl(newArticleId, title);
        };
    }
    
    // Initialize fix when article view is displayed
    function initCommentsForArticleView() {
        const articleView = document.getElementById('single-article-view');
        if (!articleView || articleView.style.display !== 'block') return;
        
        // Look for article ID in the article view
        const articleElements = articleView.querySelectorAll('[data-article-id]');
        if (articleElements.length > 0) {
            const articleId = articleElements[0].dataset.articleId;
            const newArticleId = getConsistentArticleId(articleId);
            
            // Find or create the comments section
            let commentsSection = articleView.querySelector('.comments-section');
            if (commentsSection) {
                commentsSection.dataset.articleId = newArticleId;
                
                // Update the comments container
                const commentsContainer = commentsSection.querySelector('.comments-container');
                if (commentsContainer) {
                    commentsContainer.dataset.commentsContainer = newArticleId;
                }
                
                // Ensure it's visible
                commentsSection.style.display = 'block';
                
                // Reload comments with the consistent ID
                if (window.loadComments) {
                    window.loadComments(newArticleId);
                }
            }
        }
    }
    
    // Initialize on page load
    function init() {
        // Fix all article IDs on the page
        const articleElements = document.querySelectorAll('[data-article-id]');
        articleElements.forEach(element => {
            const oldId = element.dataset.articleId;
            const newId = getConsistentArticleId(oldId);
            
            if (oldId !== newId) {
                console.log(`Initializing: Changing article ID from ${oldId} to ${newId}`);
                updateArticleIdInDOM(oldId, newId);
            }
        });
        
        // Check for article view
        initCommentsForArticleView();
    }
    
    // Run on DOMContentLoaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // Watch for article view becoming visible
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.type === 'attributes' && 
                mutation.attributeName === 'style' && 
                mutation.target.id === 'single-article-view') {
                
                // If article view is displayed
                if (mutation.target.style.display === 'block') {
                    setTimeout(initCommentsForArticleView, 100);
                }
            }
        });
    });
    
    // Start observing article view
    const articleView = document.getElementById('single-article-view');
    if (articleView) {
        observer.observe(articleView, { attributes: true });
    }
    
    // Fix any comment buttons to ensure consistent ID
    document.addEventListener('click', function(event) {
        // If it's a comment button
        const commentBtn = event.target.closest('.comment-btn');
        if (commentBtn && commentBtn.dataset.articleId) {
            const oldId = commentBtn.dataset.articleId;
            const newId = getConsistentArticleId(oldId);
            if (oldId !== newId) {
                commentBtn.dataset.articleId = newId;
            }
        }
    }, true); // Use capture phase
    
    console.log('Direct comment system fix applied');
})();
