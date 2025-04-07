// comments.js - Supabase-powered comment system for TennesseeFeeds.com

(function() {
    // Supabase configuration
    const supabaseUrl = 'https://ulhbtjppfoctdghimkmu.supabase.co';
    const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsaGJ0anBwZm9jdGRnaGlta211Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQwMzE5MzAsImV4cCI6MjA1OTYwNzkzMH0.LLIBpZkoiHWTOHzNfho2KALWdRMkNYSXF-AWD9Wyoa0';
    
    // Wait for Supabase library to load
    function waitForSupabase() {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            
            function checkSupabase() {
                if (window.supabase) {
                    const client = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
                    resolve(client);
                } else if (Date.now() - startTime > 5000) {
                    reject(new Error('Supabase failed to load within 5 seconds'));
                } else {
                    setTimeout(checkSupabase, 100);
                }
            }
            
            checkSupabase();
        });
    }

    // Function to post a comment
    async function postComment(supabase, articleId, username, content, title, source, url) {
        try {
            // Post comment via API to handle article creation and comment insertion
            const response = await fetch('https://tennesseefeeds-api.onrender.com/api/comments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    articleId: articleId,
                    articleTitle: title || 'Untitled Article',
                    userName: username,
                    userEmail: '', // Optional
                    comment: content
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

    // Function to load comments for an article
    async function loadComments(articleId) {
        try {
            const response = await fetch(`/api/comments/${articleId}`);
            const result = await response.json();

            if (result.success) {
                // Find the comments section for this article
                const commentsContainer = document.querySelector(
                    `.comments-section[data-article-id="${articleId}"]`
                );

                if (commentsContainer) {
                    // Clear existing comments
                    commentsContainer.innerHTML = '';

                    // Render each comment
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
                }
            } else {
                console.error('Failed to load comments:', result.error);
            }
        } catch (error) {
            console.error('Error loading comments:', error);
        }
    }

    // Initialize comment system
    function initCommentSystem() {
        // Setup comment posting
        const postButtons = document.querySelectorAll('.post-comment-btn');
        postButtons.forEach(button => {
            button.addEventListener('click', async function() {
                const articleCard = this.closest('[data-article-id]');
                const articleId = articleCard.dataset.articleId;
                const commentInput = articleCard.querySelector('.comment-input');
                
                // Get article details
                const articleTitle = articleCard.querySelector('.article-title')?.textContent || 'Untitled Article';
                const articleSource = articleCard.dataset.source || 'Unknown';
                const articleUrl = articleCard.querySelector('a')?.href || '';
                
                const commentText = commentInput.value.trim();
                
                if (commentText === '') {
                    alert('Please enter a comment');
                    return;
                }
                
                // Get or set username
                let username = localStorage.getItem('tnfeeds_username');
                
                if (!username) {
                    username = prompt('Enter your name (or remain Anonymous):', 'Anonymous') || 'Anonymous';
                    localStorage.setItem('tnfeeds_username', username);
                }
                
                // Post comment
                const success = await postComment(
                    null, // Supabase client is not used directly anymore
                    articleId, 
                    username, 
                    commentText, 
                    articleTitle, 
                    articleSource, 
                    articleUrl
                );
                
                if (success) {
                    // Clear input and reload comments
                    commentInput.value = '';
                    loadComments(articleId);
                } else {
                    alert('Error posting comment. Please try again.');
                }
            });
        });

        // Setup comment loading
        const commentButtons = document.querySelectorAll('.comment-btn');
        commentButtons.forEach(button => {
            button.addEventListener('click', function() {
                const articleCard = this.closest('[data-article-id]');
                const commentsSection = articleCard.querySelector('.comments-section');
                const articleId = articleCard.dataset.articleId;
                
                // Toggle comments section visibility
                if (commentsSection.classList.contains('hidden')) {
                    commentsSection.classList.remove('hidden');
                    // Load comments when section is shown
                    loadComments(articleId);
                } else {
                    commentsSection.classList.add('hidden');
                }
            });
        });

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
    }

    // Wait for DOM to be ready
    document.addEventListener('DOMContentLoaded', initCommentSystem);
})();
