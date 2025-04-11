// comment-handlers.js - Fix and override event handlers for the TennesseeFeeds comment system
// Add this script after comments.js in your HTML

(function() {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('Comment handlers script loaded');
        
        // Debug: Check if comments.js loaded properly and its functions are available
        if (window.loadComments && window.postComment) {
            console.log('Comments system is properly initialized');
        } else {
            console.error('Comments system functions not found - check if comments.js loaded correctly');
        }
        
        // Debug: Check article sections
        document.querySelectorAll('.comments-section').forEach(section => {
            const articleId = section.dataset.articleId;
            console.log('Found comments section with ID:', articleId);
            
            // Fix any malformed data-article-id attributes
            if (!articleId) {
                const articleCard = section.closest('[data-article-id]');
                if (articleCard && articleCard.dataset.articleId) {
                    section.dataset.articleId = articleCard.dataset.articleId;
                    console.log('Fixed missing article ID on comments section:', articleCard.dataset.articleId);
                }
            }
        });

        // Fix comment submission issues - override at the document level
        document.addEventListener('click', function(event) {
            const postButton = event.target.closest('.post-comment-btn');
            if (!postButton) return;
            
            // Log that we caught the click
            console.log('Post comment button clicked, using custom handler');
            
            // Prevent default and stop propagation to avoid multiple handlers
            event.preventDefault();
            event.stopPropagation();
            
            // Disable the button immediately to prevent multiple submissions
            postButton.disabled = true;
            const originalHTML = postButton.innerHTML;
            postButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            
            // Find the article card containing the button
            const articleCard = postButton.closest('[data-article-id]');
            if (!articleCard) {
                console.error('Could not find parent article card');
                postButton.disabled = false;
                postButton.innerHTML = originalHTML;
                return;
            }
            
            const articleId = articleCard.dataset.articleId;
            const commentInput = articleCard.querySelector('.comment-input');
            const commentText = commentInput.value.trim();
            
            if (!commentText) {
                alert('Please enter a comment');
                postButton.disabled = false;
                postButton.innerHTML = originalHTML;
                return;
            }
            
            // Get metadata for API
            const articleTitle = articleCard.querySelector('h3 a')?.textContent || 'Untitled Article';
            const sourceElement = articleCard.querySelector('.text-sm.text-neutral-500');
            const source = sourceElement ? sourceElement.textContent.trim() : 'Unknown Source';
            const linkElement = articleCard.querySelector('h3 a');
            const url = linkElement ? linkElement.getAttribute('href') : '';
            
            // Get username from localStorage
            const username = localStorage.getItem('tnfeeds_username') || 'Anonymous';
            
            // Post the comment
            (async function() {
                try {
                    let success = false;
                    
                    // Use UserTracking if available
                    if (window.UserTracking) {
                        console.log('Using UserTracking for comment');
                        success = await window.UserTracking.trackComment(articleId, commentText);
                    } else {
                        // Fallback to direct method
                        console.log('Using direct comment posting');
                        success = await window.postComment(
                            null, articleId, username, commentText, articleTitle, source, url
                        );
                    }
                    
                    if (success) {
                        // Clear the input
                        commentInput.value = '';
                        
                        // Clear cache for this article
                        if (window.commentsCache) {
                            delete window.commentsCache[articleId];
                        }
                        
                        // Reload the comments after a small delay to let the server process
                        setTimeout(() => {
                            console.log('Reloading comments after successful post');
                            window.loadComments(articleId);
                        }, 500);
                    } else {
                        console.error('Failed to post comment');
                        alert('Error posting comment. Please try again.');
                    }
                } catch (error) {
                    console.error('Error posting comment:', error);
                    alert('Error posting comment: ' + (error.message || 'Unknown error'));
                } finally {
                    // Re-enable the button
                    postButton.disabled = false;
                    postButton.innerHTML = originalHTML;
                }
            })();
        }, true); // Use capturing to get the event before other handlers
        
        // Fix username update issues
        const changeUsernameBtn = document.getElementById('change-username-btn');
        if (changeUsernameBtn) {
            console.log('Found username change button, applying custom handler');
            
            // Create a new button to replace the old one (removes all existing event listeners)
            const newBtn = changeUsernameBtn.cloneNode(true);
            changeUsernameBtn.parentNode.replaceChild(newBtn, changeUsernameBtn);
            
            // Add our custom handler
            newBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                console.log('Username change button clicked');
                
                // Show a prompt to get the new username
                const newUsername = prompt('Enter a new username:', localStorage.getItem('tnfeeds_username') || 'Anonymous');
                
                if (newUsername === null) {
                    console.log('Username change cancelled');
                    return; // User cancelled
                }
                
                const username = newUsername.trim() || 'Anonymous';
                
                // Store the username locally first
                localStorage.setItem('tnfeeds_username', username);
                
                // Update the display immediately
                const usernameDisplay = document.getElementById('username-display');
                if (usernameDisplay) {
                    usernameDisplay.textContent = username;
                    console.log('Username display updated to:', username);
                }
                
                // Update on the server if UserTracking is available
                if (window.UserTracking && window.UserTracking.updateUsername) {
                    console.log('Updating username on server');
                    window.UserTracking.updateUsername(username)
                        .then(success => {
                            if (success) {
                                console.log('Username updated successfully on server');
                            } else {
                                console.error('Server username update failed');
                            }
                        })
                        .catch(err => {
                            console.error('Error updating username on server:', err);
                        });
                }
            });
        }
        
        // Add a function to check and refresh comment sections
        window.checkAndRefreshComments = function() {
            console.log('Checking and refreshing all comment sections');
            
            document.querySelectorAll('.comments-section').forEach(section => {
                const articleId = section.dataset.articleId;
                const isVisible = section.style.display === 'block';
                
                if (articleId && isVisible) {
                    console.log('Refreshing comments for:', articleId);
                    
                    // Force a cache clear and refresh
                    if (window.commentsCache) {
                        delete window.commentsCache[articleId];
                    }
                    
                    window.loadComments(articleId);
                }
            });
        };
        
        // Add button to manually trigger comment refresh (for debugging)
        const addRefreshButton = function() {
            const debugControls = document.createElement('div');
            debugControls.style.position = 'fixed';
            debugControls.style.bottom = '10px';
            debugControls.style.left = '10px';
            debugControls.style.zIndex = '9999';
            debugControls.style.backgroundColor = 'rgba(0,0,0,0.7)';
            debugControls.style.padding = '5px';
            debugControls.style.borderRadius = '5px';
            
            const refreshBtn = document.createElement('button');
            refreshBtn.textContent = 'Refresh Comments';
            refreshBtn.style.backgroundColor = '#333';
            refreshBtn.style.color = 'white';
            refreshBtn.style.padding = '5px 10px';
            refreshBtn.style.border = 'none';
            refreshBtn.style.borderRadius = '3px';
            refreshBtn.style.cursor = 'pointer';
            
            refreshBtn.addEventListener('click', function() {
                window.checkAndRefreshComments();
            });
            
            debugControls.appendChild(refreshBtn);
            document.body.appendChild(debugControls);
        };
        
        // Uncomment this to add a debug refresh button
        // addRefreshButton();
    });
})();
