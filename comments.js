// comments.js - Supabase-powered comment system for TennesseeFeeds.com
(function() {
    // Function to post a comment
    async function postComment(supabase, articleId, username, content, title, source, url) {
        try {
            const response = await fetch('https://tennesseefeeds-api.onrender.com/api/comments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                articleId: articleId,
                articleTitle: title || 'Untitled Article',
                userName: username,
                userEmail: '',
                comment: content,
                source: source || 'Unknown Source',
                url: url || ''
                })
            });

            const result = await response.json();

            if (result.success) {
                console.log('Comment posted successfully:', result.comment);
                return true;
            } else {
                console.error('Failed to post comment:', result.error);
                return false;
            }
        } catch (error) {
            console.error('Error posting comment:', error);
            return false;
        }
    }

    async function loadComments(articleId) {
        console.log('Loading comments for article:', articleId);
        try {
            // 1. First, ensure the comments section stays visible during loading
            const commentsSection = document.querySelector(
                `.comments-section[data-article-id="${articleId}"]`
            );
            
            if (commentsSection) {
                commentsSection.style.display = 'block';
            }
            
            // 2. Make the API request
            const response = await fetch(`https://tennesseefeeds-api.onrender.com/api/comments/${articleId}`);
            console.log('Fetch response status:', response.status);
            
            const result = await response.json();
            console.log('Fetch result:', result);

            // 3. Update the UI with comments
            if (result.success) {
                if (commentsSection) {
                    console.log('Comments container found, updating...');
                    
                    // Get the comments container inside the section (not the section itself)
                    const commentsContainer = commentsSection.querySelector('.comments-container') || commentsSection;
                    
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
                    
                    // 4. Ensure section remains visible after update
                    commentsSection.style.display = 'block';
                } else {
                    console.error('Comments container not found for article:', articleId);
                }
            } else {
                console.error('Failed to load comments:', result.error);
            }
            
            // 5. Final check to ensure visibility
            if (commentsSection) {
                setTimeout(() => {
                    commentsSection.style.display = 'block';
                    console.log('Final visibility check applied');
                }, 100);
            }
        } catch (error) {
            console.error('Error loading comments:', error);
        }
        
        // Return a promise to be compatible with existing code
        return Promise.resolve();
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
