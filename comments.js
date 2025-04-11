// enhanced-comments.js - Extended comment system for TennesseeFeeds.com with threading and upvoting
(function() {
    // Make the cache globally accessible
    window.commentsCache = {};
    
    /**
     * Post a comment or reply to the server
     * @param {Object} supabase - Supabase client instance (optional)
     * @param {string} articleId - ID of the article
     * @param {string} username - Username of commenter
     * @param {string} content - Comment content
     * @param {string} title - Article title (optional)
     * @param {string} source - Article source (optional)
     * @param {string} url - Article URL (optional)
     * @param {string} parentId - Parent comment ID for replies (optional)
     * @returns {Promise<boolean>} Success status
     */
    async function postComment(supabase, articleId, username, content, title, source, url, parentId = null) {
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
                articleId, username, content, title, source, url, parentId
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
                    url: url || '',
                    parentId: parentId // Add parent ID for threaded replies
                })
            });

            const result = await response.json();
            
            // Release the posting flag
            window._isPostingComment = false;

            if (result.success) {
                console.log('Comment posted successfully:', result.comment);
                // Clear this particular article from cache to ensure fresh data on next load
                delete window.commentsCache[articleId];
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

    /**
     * Vote on a comment (upvote/downvote)
     * @param {string} commentId - ID of the comment to vote on
     * @param {boolean} isUpvote - True for upvote, false for downvote
     * @returns {Promise<Object|boolean>} Vote result or false if failed
     */
    async function voteOnComment(commentId, isUpvote) {
        try {
            const userId = await getUserId();
            
            if (!userId) {
                return promptForUsername().then(username => {
                    if (username) {
                        return voteOnComment(commentId, isUpvote);
                    }
                    return false;
                });
            }
            
            const response = await fetch('https://tennesseefeeds-api.onrender.com/api/comments/vote', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    commentId,
                    userId,
                    voteType: isUpvote ? 'upvote' : 'downvote'
                })
            });
            
            if (!response.ok) {
                throw new Error(`Server responded with status ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                // Clear cache to ensure fresh data
                Object.keys(window.commentsCache).forEach(key => {
                    delete window.commentsCache[key];
                });
                
                return {
                    commentId,
                    voteType: isUpvote ? 'upvote' : 'downvote',
                    newScore: result.newScore,
                    userPoints: result.userPoints
                };
            } else {
                console.error('Failed to vote on comment:', result.error);
                return false;
            }
        } catch (error) {
            console.error('Error voting on comment:', error);
            return false;
        }
    }

    /**
     * Get user ID from localStorage or create a new one
     * @returns {Promise<string|null>} User ID or null if failed
     */
    async function getUserId() {
        let userId = localStorage.getItem('tnfeeds_user_id');
        
        if (!userId) {
            // Try to get/create a user via the UserTracking system
            if (window.UserTracking) {
                const user = await window.UserTracking.getUserProfile();
                if (user && user.id) {
                    userId = user.id;
                    localStorage.setItem('tnfeeds_user_id', userId);
                }
            }
        }
        
        return userId;
    }

    /**
     * Prompt user for username
     * @returns {Promise<string|null>} Username or null if cancelled
     */
    async function promptForUsername() {
        let username = localStorage.getItem('tnfeeds_username');
        
        if (!username) {
            username = prompt('Enter your name (or remain Anonymous):', 'Anonymous');
            
            if (username === null) {
                return null;
            }
            
            username = username.trim() || 'Anonymous';
            localStorage.setItem('tnfeeds_username', username);
            
            // If UserTracking is available, update the username there too
            if (window.UserTracking) {
                await window.UserTracking.updateUsername(username);
            }
        }
        
        return username;
    }

    /**
     * Load comments for an article, including threaded replies
     * @param {string} articleId - ID of the article to load comments for
     * @returns {Promise<void>}
     */
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
            
            // Check cache first
            if (window.commentsCache[articleId]) {
                console.log('Using cached comments for article:', articleId);
                renderComments(commentsContainer, window.commentsCache[articleId], articleId);
                return Promise.resolve();
            }
            
            // 2. Make the API request
            const response = await fetch(`https://tennesseefeeds-api.onrender.com/api/comments/${articleId}`);
            console.log('Fetch response status:', response.status);
            
            if (!response.ok) {
                throw new Error(`API responded with status ${response.status}`);
            }
            
            const result = await response.json();
            console.log('Fetch result:', result);

            // Cache the comments
            if (result.success && result.comments) {
                window.commentsCache[articleId] = result.comments;
            }

            // 3. Update the UI with comments
            if (result.success && commentsContainer) {
                console.log('Comments container found, updating...');
                renderComments(commentsContainer, result.comments, articleId);
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
    
    /**
     * Render comments with threaded replies
     * @param {HTMLElement} container - Container to render comments in
     * @param {Array} comments - Array of comment objects
     * @param {string} articleId - ID of the article
     */
    function renderComments(container, comments, articleId) {
        if (!container) return;
        
        // Clear current comments
        container.innerHTML = '';
        
        if (!comments || comments.length === 0) {
            container.innerHTML = '<p class="text-neutral-500 text-sm">No comments yet.</p>';
            return;
        }
        
        // Build comment tree
        const rootComments = [];
        const replyMap = {};
        
        // First pass: identify top-level comments and build reply map
        comments.forEach(comment => {
            // Convert to our internal format
            const commentObj = {
                id: comment.id,
                userName: comment.userName,
                content: comment.comment,
                timestamp: comment.timestamp,
                parentId: comment.parentId || null,
                score: comment.score || 0,
                userVote: comment.userVote || null,
                replies: []
            };
            
            if (!commentObj.parentId) {
                rootComments.push(commentObj);
            } else {
                if (!replyMap[commentObj.parentId]) {
                    replyMap[commentObj.parentId] = [];
                }
                replyMap[commentObj.parentId].push(commentObj);
            }
        });
        
        // Second pass: build the reply tree
        function addReplies(comment) {
            const repliesForComment = replyMap[comment.id] || [];
            comment.replies = repliesForComment;
            
            // Recursively add replies to replies
            repliesForComment.forEach(reply => addReplies(reply));
            
            // Sort replies by score (highest first)
            comment.replies.sort((a, b) => b.score - a.score);
            
            return comment;
        }
        
        // Build the full tree
        const commentTree = rootComments.map(comment => addReplies(comment));
        
        // Sort top-level comments by score (highest first)
        commentTree.sort((a, b) => b.score - a.score);
        
        // Render the comment tree
        commentTree.forEach(comment => {
            container.appendChild(createCommentElement(comment, articleId, 0));
        });
        
        // Add event listeners to vote buttons and reply buttons
        setupCommentInteractions(container);
    }
    
    /**
     * Create a DOM element for a comment with its replies
     * @param {Object} comment - Comment object
     * @param {string} articleId - ID of the article
     * @param {number} level - Nesting level (for indentation)
     * @returns {HTMLElement} Comment element
     */
    function createCommentElement(comment, articleId, level) {
        const commentElement = document.createElement('div');
        commentElement.classList.add('comment');
        commentElement.dataset.commentId = comment.id;
        commentElement.dataset.level = level;
        
        // Add indentation for nested comments
        const indentClass = level > 0 ? `ml-${Math.min(level * 4, 16)}` : '';
        
        // Determine if user has voted on this comment
        const userUpvoted = comment.userVote === 'upvote';
        const userDownvoted = comment.userVote === 'downvote';
        
        commentElement.innerHTML = `
            <div class="comment-content ${indentClass} ${level > 0 ? 'border-l-2 border-neutral-200 pl-2' : ''}">
                <div class="flex items-start">
                    <div class="vote-controls flex flex-col items-center mr-2">
                        <button class="upvote-btn text-sm ${userUpvoted ? 'text-blue-500' : 'text-neutral-400'}" data-comment-id="${comment.id}">
                            <i class="fas fa-arrow-up"></i>
                        </button>
                        <span class="score text-sm font-bold ${comment.score > 0 ? 'text-blue-500' : comment.score < 0 ? 'text-red-500' : 'text-neutral-500'}">${comment.score}</span>
                        <button class="downvote-btn text-sm ${userDownvoted ? 'text-red-500' : 'text-neutral-400'}" data-comment-id="${comment.id}">
                            <i class="fas fa-arrow-down"></i>
                        </button>
                    </div>
                    <div class="flex-grow">
                        <div class="flex items-baseline gap-2">
                            <strong class="text-neutral-800">${comment.userName}</strong>
                            <span class="text-xs text-neutral-500">${formatTimestamp(comment.timestamp)}</span>
                        </div>
                        <p class="comment-text my-1">${comment.content}</p>
                        <div class="comment-actions text-xs text-neutral-500 mt-1">
                            <button class="reply-btn hover:text-neutral-700" data-comment-id="${comment.id}" data-article-id="${articleId}">
                                Reply
                            </button>
                        </div>
                        <div class="reply-form hidden mt-2" data-for-comment="${comment.id}">
                            <div class="flex">
                                <input type="text" class="reply-input flex-grow mr-2 px-3 py-1 text-sm border rounded-md text-neutral-700" placeholder="Write a reply...">
                                <button class="post-reply-btn bg-neutral-700 text-white text-sm px-3 py-1 rounded-md" data-parent-id="${comment.id}" data-article-id="${articleId}">Reply</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Add replies if any
        if (comment.replies && comment.replies.length > 0) {
            const repliesContainer = document.createElement('div');
            repliesContainer.classList.add('replies-container', 'mt-2');
            
            comment.replies.forEach(reply => {
                repliesContainer.appendChild(createCommentElement(reply, articleId, level + 1));
            });
            
            commentElement.appendChild(repliesContainer);
        }
        
        return commentElement;
    }
    
    /**
     * Format timestamp in a human-readable way
     * @param {string} timestamp - ISO timestamp
     * @returns {string} Formatted timestamp
     */
    function formatTimestamp(timestamp) {
        try {
            const date = new Date(timestamp);
            const now = new Date();
            const diffMs = now - date;
            const diffSecs = Math.floor(diffMs / 1000);
            const diffMins = Math.floor(diffSecs / 60);
            const diffHours = Math.floor(diffMins / 60);
            const diffDays = Math.floor(diffHours / 24);
            
            if (diffSecs < 60) {
                return 'just now';
            } else if (diffMins < 60) {
                return `${diffMins}m ago`;
            } else if (diffHours < 24) {
                return `${diffHours}h ago`;
            } else if (diffDays < 7) {
                return `${diffDays}d ago`;
            } else {
                return date.toLocaleDateString();
            }
        } catch (error) {
            console.error('Error formatting timestamp:', error);
            return timestamp;
        }
    }
    
    /**
     * Set up event listeners for comment interactions
     * @param {HTMLElement} container - Container with comments
     */
    function setupCommentInteractions(container) {
        if (!container) return;
        
        // Upvote buttons
        container.querySelectorAll('.upvote-btn').forEach(button => {
            button.addEventListener('click', async function() {
                const commentId = this.dataset.commentId;
                const result = await voteOnComment(commentId, true);
                
                if (result) {
                    updateCommentScore(commentId, result.newScore, 'upvote');
                    
                    // Show a notification with updated user points if available
                    if (result.userPoints !== undefined) {
                        showNotification(`Your points: ${result.userPoints}`);
                    }
                }
            });
        });
        
        // Downvote buttons
        container.querySelectorAll('.downvote-btn').forEach(button => {
            button.addEventListener('click', async function() {
                const commentId = this.dataset.commentId;
                const result = await voteOnComment(commentId, false);
                
                if (result) {
                    updateCommentScore(commentId, result.newScore, 'downvote');
                    
                    // Show a notification with updated user points if available
                    if (result.userPoints !== undefined) {
                        showNotification(`Your points: ${result.userPoints}`);
                    }
                }
            });
        });
        
        // Reply buttons
        container.querySelectorAll('.reply-btn').forEach(button => {
            button.addEventListener('click', function() {
                const commentId = this.dataset.commentId;
                const replyForm = container.querySelector(`.reply-form[data-for-comment="${commentId}"]`);
                
                // Hide all other reply forms
                container.querySelectorAll('.reply-form').forEach(form => {
                    if (form !== replyForm) {
                        form.classList.add('hidden');
                    }
                });
                
                // Toggle this reply form
                replyForm.classList.toggle('hidden');
                
                // Focus the input if showing
                if (!replyForm.classList.contains('hidden')) {
                    replyForm.querySelector('.reply-input').focus();
                }
            });
        });
        
        // Post reply buttons
        container.querySelectorAll('.post-reply-btn').forEach(button => {
            button.addEventListener('click', async function() {
                const parentId = this.dataset.parentId;
                const articleId = this.dataset.articleId;
                const replyInput = container.querySelector(`.reply-form[data-for-comment="${parentId}"] .reply-input`);
                const replyText = replyInput.value.trim();
                
                if (!replyText) {
                    alert('Please enter a reply');
                    return;
                }
                
                // Get username
                const username = await promptForUsername();
                
                if (!username) {
                    return;
                }
                
                // Post the reply
                const success = await postComment(
                    null, articleId, username, replyText, null, null, null, parentId
                );
                
                if (success) {
                    // Clear input and hide form
                    replyInput.value = '';
                    container.querySelector(`.reply-form[data-for-comment="${parentId}"]`).classList.add('hidden');
                    
                    // Reload comments
                    loadComments(articleId);
                }
            });
        });
    }
    
    /**
     * Update the displayed score for a comment
     * @param {string} commentId - ID of the comment
     * @param {number} newScore - New score value
     * @param {string} voteType - Type of vote ('upvote' or 'downvote')
     */
    function updateCommentScore(commentId, newScore, voteType) {
        const commentElement = document.querySelector(`.comment[data-comment-id="${commentId}"]`);
        if (!commentElement) return;
        
        // Update the score
        const scoreElement = commentElement.querySelector('.score');
        if (scoreElement) {
            scoreElement.textContent = newScore;
            scoreElement.className = 'score text-sm font-bold';
            
            // Add appropriate color class
            if (newScore > 0) {
                scoreElement.classList.add('text-blue-500');
            } else if (newScore < 0) {
                scoreElement.classList.add('text-red-500');
            } else {
                scoreElement.classList.add('text-neutral-500');
            }
        }
        
        // Update button styles
        const upvoteBtn = commentElement.querySelector('.upvote-btn');
        const downvoteBtn = commentElement.querySelector('.downvote-btn');
        
        if (upvoteBtn) {
            upvoteBtn.className = 'upvote-btn text-sm ' + (voteType === 'upvote' ? 'text-blue-500' : 'text-neutral-400');
        }
        
        if (downvoteBtn) {
            downvoteBtn.className = 'downvote-btn text-sm ' + (voteType === 'downvote' ? 'text-red-500' : 'text-neutral-400');
        }
    }
    
    /**
     * Show a temporary notification
     * @param {string} message - Notification message
     */
    function showNotification(message) {
        // Create or get notification element
        let notification = document.getElementById('tn-notification');
        
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'tn-notification';
            notification.className = 'fixed bottom-4 right-4 bg-neutral-800 text-white px-4 py-2 rounded-md shadow-lg transform transition-transform duration-300 translate-y-full';
            document.body.appendChild(notification);
        }
        
        // Set message
        notification.textContent = message;
        
        // Show
        setTimeout(() => {
            notification.classList.remove('translate-y-full');
        }, 10);
        
        // Hide after 3 seconds
        setTimeout(() => {
            notification.classList.add('translate-y-full');
        }, 3000);
    }
    
    /**
     * Update username for the current user
     * @returns {Promise<boolean>} Success status
     */
    async function updateUsername() {
        const newUsername = prompt('Enter a new username:', localStorage.getItem('tnfeeds_username') || 'Anonymous');
        
        if (!newUsername || newUsername === null) {
            return false;
        }
        
        const username = newUsername.trim() || 'Anonymous';
        localStorage.setItem('tnfeeds_username', username);
        
        // Update display
        const usernameDisplay = document.getElementById('username-display');
        if (usernameDisplay) {
            usernameDisplay.textContent = username;
        }
        
        // Update on server if UserTracking is available
        if (window.UserTracking) {
            try {
                const success = await window.UserTracking.updateUsername(username);
                return success;
            } catch (err) {
                console.error('Error updating username via API:', err);
            }
        }
        
        return true;
    }
    
    // Set up CSS styles for enhanced comments
    function setupCommentStyles() {
        const existingStyle = document.getElementById('tn-comment-styles');
        
        if (existingStyle) {
            return;
        }
        
        const style = document.createElement('style');
        style.id = 'tn-comment-styles';
        style.textContent = `
            .comment {
                padding: 10px 0;
                border-bottom: 1px solid #e5e5e5;
            }
            .comment:last-child {
                border-bottom: none;
            }
            .comment-content {
                position: relative;
            }
            .vote-controls {
                min-width: 20px;
            }
            .upvote-btn, .downvote-btn {
                cursor: pointer;
                padding: 2px;
                border-radius: 4px;
                transition: background-color 0.2s;
            }
            .upvote-btn:hover, .downvote-btn:hover {
                background-color: rgba(0, 0, 0, 0.05);
            }
            .upvote-btn.text-blue-500, .downvote-btn.text-red-500 {
                background-color: rgba(0, 0, 0, 0.05);
            }
            .reply-btn {
                cursor: pointer;
                padding: 2px 4px;
                border-radius: 4px;
                transition: background-color 0.2s;
            }
            .reply-btn:hover {
                background-color: rgba(0, 0, 0, 0.05);
            }
            .replies-container {
                margin-left: 25px;
            }
            #tn-notification {
                z-index: 9999;
            }
            .comment-actions {
                display: flex;
                gap: 8px;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Fix for comment form submission
    document.addEventListener('DOMContentLoaded', function() {
        // Override the post comment button click handler
        document.addEventListener('click', async function(event) {
            const postButton = event.target.closest('.post-comment-btn');
            if (!postButton) return;
            
            // Prevent event bubbling and default behavior
            event.preventDefault();
            event.stopPropagation();
            
            // Disable the button immediately to prevent multiple clicks
            postButton.disabled = true;
            const originalText = postButton.innerHTML;
            postButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            
            try {
                const articleCard = postButton.closest('[data-article-id]');
                const articleId = articleCard.dataset.articleId;
                const commentInput = articleCard.querySelector('.comment-input');
                const articleTitle = articleCard.querySelector('h3 a')?.textContent || 'Untitled Article';
                const articleSource = articleCard.querySelector('.text-sm.text-neutral-500')?.textContent || 'Unknown Source';
                const articleUrl = articleCard.querySelector('a')?.href || '';
                const commentText = commentInput.value.trim();
                
                if (commentText === '') {
                    alert('Please enter a comment');
                    return;
                }
                
                // Get username
                let username = localStorage.getItem('tnfeeds_username') || 'Anonymous';
                
                let success = false;
                
                // Use UserTracking if available
                if (window.UserTracking) {
                    success = await window.UserTracking.trackComment(articleId, commentText);
                } else {
                    // Fall back to direct comment posting
                    success = await window.postComment(
                        null, articleId, username, commentText, articleTitle, articleSource, articleUrl
                    );
                }
                
                if (success) {
                    // Clear input
                    commentInput.value = '';
                    
                    // Force delete cache and reload comments
                    if (window.commentsCache) {
                        delete window.commentsCache[articleId];
                    }
                    
                    // Reload comments with a slight delay to allow the backend to process
                    setTimeout(() => {
                        window.loadComments(articleId);
                    }, 500);
                } else {
                    alert('Error posting comment. Please try again.');
                }
            } catch (err) {
                console.error('Error posting comment:', err);
                alert('Error posting comment: ' + (err.message || 'Unknown error'));
            } finally {
                // Re-enable the button after processing
                postButton.disabled = false;
                postButton.innerHTML = originalText;
            }
        });
        
        // Override the change username button click handler
        const changeUsernameBtn = document.getElementById('change-username-btn');
        if (changeUsernameBtn) {
            // Remove any existing handlers by cloning
            const newBtn = changeUsernameBtn.cloneNode(true);
            changeUsernameBtn.parentNode.replaceChild(newBtn, changeUsernameBtn);
            
            // Add new handler
            newBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                window.updateUsername();
            });
        }
    });
    
    // Add a global helper function to force reload comments
    window.forceReloadComments = function(articleId) {
        console.log('Force reloading comments for:', articleId);
        
        // Clear cache
        if (window.commentsCache) {
            delete window.commentsCache[articleId];
        }
        
        // Find comments section
        const commentsSection = document.querySelector(
            `.comments-section[data-article-id="${articleId}"]`
        );
        
        if (commentsSection) {
            // Make sure it's visible
            commentsSection.style.display = 'block';
            
            // Force reload comments
            window.loadComments(articleId);
            
            return true;
        } else {
            console.error('Comments section not found for article:', articleId);
            return false;
        }
    };
    
    // Debug: Log current cache contents
    window.logCommentsCache = function() {
        console.log('Current comments cache:', window.commentsCache);
    };
    
    // Debug: Check if elements are properly set up
    document.addEventListener('DOMContentLoaded', function() {
        document.querySelectorAll('.comments-section').forEach(section => {
            console.log('Found comments section with article ID:', section.dataset.articleId);
        });
    });
    
    // Expose functions globally
    window.postComment = postComment;
    window.loadComments = loadComments;
    window.updateUsername = updateUsername;
    
    // Initialize
    setupCommentStyles();
})();
