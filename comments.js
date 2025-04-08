// comments.js - Supabase-powered comment system for TennesseeFeeds.com
(function() {
    // Function to post a comment
    async function postComment(supabase, articleId, username, content, title, source, url) {
        try {
            // Add debouncing to prevent duplicate submissions
            if (window._isPostingComment) {
                console.log('A comment is already being posted, please wait...');
                return false;
            }
            
            window._isPostingComment = true;
            
            // Clear this flag after 5 seconds no matter what happens
            setTimeout(() => { window._isPostingComment = false; }, 5000);
            
            console.log('Posting comment:', {
                articleId, username, content, title, source, url
            });
            
            const response = await fetch('https://tennesseefeeds-api.onrender.com/api/comments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    articleId: articleId,
                    articleTitle: title || 'Untitled Article',
                    userName: username,
                    comment: content,
                    source: source || 'Unknown Source',
                    url: url || ''
                })
            });

            const result = await response.json();
            
            // Release the posting flag
            window._isPostingComment = false;

            if (result.success) {
                console.log('Comment posted successfully:', result.comment);
                return true;
            } else {
                console.error('Failed to post comment:', result.error);
                alert('Error posting comment: ' + (result.error || 'Unknown error'));
                return false;
            }
        } catch (error) {
            // Release the posting flag on error
            window._isPostingComment = false;
            console.error('Error posting comment:', error);
            alert('Error posting comment: ' + (error.message || 'Unknown error'));
            return false;
        }
    }

    async function loadComments(articleId) {
        console.log('Loading comments for article:', articleId);
        
        if (!articleId) {
            console.error('No articleId provided to loadComments');
            return Promise.resolve();
        }
        
        try {
            // 1. First, ensure the comments section stays visible during loading
            const commentsSection = document.querySelector(
                `.comments-section[data-article-id="${articleId}"]`
            );
            
            if (!commentsSection) {
                console.error(`Comments section not found for article: ${articleId}`);
                return Promise.resolve();
            }
            
            commentsSection.style.display = 'block';
            
            // Add a loading indicator
            const commentsContainer = commentsSection.querySelector('.comments-container');
            if (commentsContainer) {
                commentsContainer.innerHTML = '<p class="text-neutral-500 text-sm">Loading comments...</p>';
            }
            
            // 2. Make the API request
            const response = await fetch(`https://tennesseefeeds-api.onrender.com/api/comments/${articleId}`);
            console.log('Fetch response status:', response.status);
            
            if (!response.ok) {
                throw new Error(`API responded with status ${response.status}`);
            }
            
            const result = await response.json();
            console.log('Fetch result:', result);

            // 3. Update the UI with comments
            if (result.success && commentsContainer) {
                console.log('Comments container found, updating...');
                
                // Clear current comments
                commentsContainer.innerHTML = '';
                
                // Add comments or show "no comments" message
                if (result.comments && result.comments.length > 0) {
                    result.comments.forEach(comment => {
                        const commentElement = document.createElement('div');
                        commentElement.classList.add('comment');
                        commentElement.innerHTML = `
                            <strong>${comment.userName}</strong>
                            <p>${comment.comment}</p>
                            <small>${new Date(comment.timestamp).toLocaleString()}</small>
                        `;
                        commentsContainer.appendChild(commentElement);
                    });
                } else {
                    commentsContainer.innerHTML = '<p class="text-neutral-500 text-sm">No comments yet.</p>';
                }
            } else {
                console.error('Failed to load comments:', result.error || 'Unknown error');
                if (commentsContainer) {
                    commentsContainer.innerHTML = '<p class="text-red-500 text-sm">Error loading comments. Please try again.</p>';
                }
            }
            
            // 5. Final check to ensure visibility
            setTimeout(() => {
                if (commentsSection) {
                    commentsSection.style.display = 'block';
                    console.log('Final visibility check applied');
                }
            }, 100);
            
            return Promise.resolve();
        } catch (error) {
            console.error('Error loading comments:', error);
            const commentsSection = document.querySelector(
                `.comments-section[data-article-id="${articleId}"]`
            );
            
            if (commentsSection) {
                const commentsContainer = commentsSection.querySelector('.comments-container');
                if (commentsContainer) {
                    commentsContainer.innerHTML = '<p class="text-red-500 text-sm">Error loading comments: ' + (error.message || 'Unknown error') + '</p>';
                }
            }
            
            return Promise.resolve();
        }
    }
    
    // Expose functions globally
    window.postComment = postComment;
    window.loadComments = loadComments;

    // Add CSS for comments
    const style = document.createElement('style');
    style.textContent = `
        .comment {
            padding: 10px;
            border-bottom: 1px solid #e5e5e5;
        }
        .comment:last-child {
            border-bottom: none;
        }
        .comments-section.hidden {
            display: none;
        }
    `;
    document.head.appendChild(style);
})();
// Add this function to your comments.js file

// Immediately-invoked function to prevent double click events on comment buttons
(function() {
    // Keep track of already processed buttons to prevent duplicate handlers
    const processedButtons = new Set();
    
    function fixCommentButtonClicks() {
        // Find all post comment buttons
        const postButtons = document.querySelectorAll('.post-comment-btn');
        
        postButtons.forEach(button => {
            // Skip if we've already processed this button
            if (processedButtons.has(button)) return;
            
            // Mark as processed
            processedButtons.add(button);
            
            // Remove any existing click handlers by cloning and replacing
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            
            // Add a single click handler with explicit stopPropagation
            newButton.addEventListener('click', function(event) {
                // Stop propagation to prevent event bubbling
                event.stopPropagation();
                event.preventDefault();
                
                const articleCard = this.closest('[data-article-id]');
                if (!articleCard) return;
                
                const articleId = articleCard.dataset.articleId;
                const commentInput = articleCard.querySelector('.comment-input');
                if (!commentInput || !commentInput.value.trim()) return;
                
                // Get article metadata
                const titleElement = articleCard.querySelector('h3 a');
                const sourceElement = articleCard.querySelector('.text-sm.text-neutral-500');
                
                const title = titleElement ? titleElement.textContent.trim() : 'Untitled Article';
                const url = titleElement ? titleElement.getAttribute('href') : '';
                const source = sourceElement ? sourceElement.textContent.trim() : '';
                
                // Get username
                let username = localStorage.getItem('tnfeeds_username');
                if (!username) {
                    username = prompt('Enter your name (or remain Anonymous):', 'Anonymous') || 'Anonymous';
                    localStorage.setItem('tnfeeds_username', username);
                }
                
                // Post the comment
                window.postComment(null, articleId, username, commentInput.value.trim(), title, source, url);
            });
        });
    }
    
    // Run initially for existing buttons
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', fixCommentButtonClicks);
    } else {
        fixCommentButtonClicks();
    }
    
    // Watch for new buttons being added
    // This might be needed if you dynamically load content
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes.length) {
                fixCommentButtonClicks();
            }
        });
    });
    
    // Start observing the document body for DOM changes
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
})();
