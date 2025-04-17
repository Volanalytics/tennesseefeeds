/**
 * Article ID Standardization for Comments
 * 
 * This patch ensures that article IDs are consistent across all views
 * to fix the issue where comments aren't showing up when switching between
 * the main feed view and the individual article view.
 */

// Function to create a consistent hash from a string
function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
}

// Function to standardize article IDs
function standardizeArticleId(articleId) {
    if (!articleId) return articleId;
    
    // If the ID is already in processed form (contains --- which indicates it's from our system)
    // use a hash of the full ID to ensure consistency across all views
    if (articleId.includes('---')) {
        return 'a-' + hashString(articleId);
    }
    
    // For URLs with http or https, create a standardized form
    if (articleId.includes('http')) {
        // Clean the URL (remove trailing slashes, query params, etc.)
        const cleanUrl = articleId.split('?')[0].split('#')[0].replace(/\/$/, '');
        return 'a-' + hashString(cleanUrl);
    }
    
    // For slugs or other formats, ensure consistency by hashing
    return 'a-' + hashString(articleId);
}

// Override the existing loadComments function
const originalLoadComments = window.loadComments;
window.loadComments = async function(articleId) {
    console.log('Original articleId:', articleId);
    const standardizedId = standardizeArticleId(articleId);
    console.log('Standardized articleId:', standardizedId);
    
    // Call the original function with the standardized ID
    return originalLoadComments(standardizedId);
};

// Override the postComment function to standardize the articleId
const originalPostComment = window.postComment;
window.postComment = async function(supabase, articleId, username, content, title, source, url, parentId = null) {
    console.log('Original articleId for post:', articleId);
    const standardizedId = standardizeArticleId(articleId);
    console.log('Standardized articleId for post:', standardizedId);
    
    // Call the original function with the standardized ID
    return originalPostComment(supabase, standardizedId, username, content, title, source, url, parentId);
};

// Update the voteOnComment function to use standardized IDs for the comment's article
const originalVoteOnComment = window.voteOnComment;
window.voteOnComment = async function(commentId, isUpvote) {
    // The comment ID itself doesn't need standardization, as it's a database ID
    // We just pass it through to the original function
    return originalVoteOnComment(commentId, isUpvote);
};

// Patch the article system's createArticleUrl function to use standardized IDs
if (window.ArticleSystem && window.ArticleSystem.createArticleUrl) {
    const originalCreateArticleUrl = window.ArticleSystem.createArticleUrl;
    window.ArticleSystem.createArticleUrl = function(articleId, title = '') {
        const standardizedId = standardizeArticleId(articleId);
        return originalCreateArticleUrl(standardizedId, title);
    };
}

// Add a function to fix existing comment containers on the page
function fixExistingCommentContainers() {
    // Find all comment sections
    const commentSections = document.querySelectorAll('.comments-section[data-article-id]');
    
    commentSections.forEach(section => {
        const originalId = section.dataset.articleId;
        const standardizedId = standardizeArticleId(originalId);
        
        // Only update if they're different
        if (originalId !== standardizedId) {
            console.log(`Updating comment section ID from ${originalId} to ${standardizedId}`);
            section.dataset.articleId = standardizedId;
            
            // Also update any comment containers within this section
            const commentsContainer = section.querySelector('.comments-container[data-comments-container]');
            if (commentsContainer && commentsContainer.dataset.commentsContainer) {
                commentsContainer.dataset.commentsContainer = standardizedId;
            }
        }
    });
}

// Run the fix immediately and also after DOM content is loaded
fixExistingCommentContainers();
document.addEventListener('DOMContentLoaded', fixExistingCommentContainers);

// Add a MutationObserver to handle dynamically added comment sections
const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            mutation.addedNodes.forEach(node => {
                // Check if the added node is a comment section or contains one
                if (node.nodeType === 1) { // Element node
                    const commentSections = node.classList?.contains('comments-section') ? 
                        [node] : node.querySelectorAll('.comments-section[data-article-id]');
                    
                    if (commentSections.length > 0) {
                        fixExistingCommentContainers();
                    }
                }
            });
        }
    });
});

// Start observing
observer.observe(document.body, { childList: true, subtree: true });

console.log('Comment ID standardization patch applied successfully');
