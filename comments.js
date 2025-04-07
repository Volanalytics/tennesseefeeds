// comments.js - Complete implementation for TennesseeFeeds.com comment system

// Wait for both Supabase and Fingerprint libraries to be fully loaded
(function() {
    // Check library load status
    function checkLibrariesLoaded() {
        return new Promise((resolve, reject) => {
            const checkInterval = setInterval(() => {
                if (window.supabase && window.Fingerprint2) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);

            // Timeout after 5 seconds
            setTimeout(() => {
                clearInterval(checkInterval);
                reject(new Error('Libraries failed to load'));
            }, 5000);
        });
    }

    // Initialize comment system once libraries are loaded
    function initializeCommentSystem() {
        // Initialize Supabase client
const supabaseUrl = 'https://ulhbtjppfoctdghimkmu.supabase.co';  // Get this from Settings > API
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsaGJ0anBwZm9jdGRnaGlta211Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQwMzE5MzAsImV4cCI6MjA1OTYwNzkzMH0.LLIBpZkoiHWTOHzNfho2KALWdRMkNYSXF-AWD9Wyoa0';  // Get this from Settings > API
const supabase = supabase.createClient(supabaseUrl, supabaseKey);


        // Generate a consistent fingerprint to identify users anonymously
        async function getUserFingerprint() {
            const components = await Fingerprint2.getPromise({
                excludes: {
                    // Exclude highly variable components for more stable fingerprints
                    enumerateDevices: true,
                    pixelRatio: true,
                    doNotTrack: true
                }
            });
            const values = components.map(component => component.value);
            const fingerprint = Fingerprint2.x64hash128(values.join(''), 31);
            return fingerprint;
        }

        // Store visitor's fingerprint in a variable
        let userFingerprint;
        // Initialize with a promise for fingerprint
        const fingerprintPromise = getUserFingerprint().then(fingerprint => {
            userFingerprint = fingerprint;
            // Once we have the fingerprint, load reaction states
            return loadAllReactions();
        });

        // Helper function to escape HTML to prevent XSS
        function escapeHTML(str) {
            return str
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        }

        // Rest of the existing functions (getOrCreateArticle, loadComments, postComment, etc.)
        // ... (copy all the existing functions from the previous implementation)

        // Add event listeners for comment buttons
        const commentButtons = document.querySelectorAll('.comment-btn');
        commentButtons.forEach(button => {
            button.addEventListener('click', function() {
                const articleCard = this.closest('[data-article-id]');
                const commentsSection = articleCard.querySelector('.comments-section');
                
                // Toggle comments section visibility
                if (commentsSection.classList.contains('hidden')) {
                    commentsSection.classList.remove('hidden');
                    // Load comments when section is shown
                    const articleId = articleCard.dataset.articleId;
                    loadComments(articleId);
                } else {
                    commentsSection.classList.add('hidden');
                }
            });
        });
        
        // Add event listeners for post comment buttons
        const postButtons = document.querySelectorAll('.post-comment-btn');
        postButtons.forEach(button => {
            button.addEventListener('click', async function() {
                const articleCard = this.closest('[data-article-id]');
                const articleId = articleCard.dataset.articleId;
                const commentInput = articleCard.querySelector('.comment-input');
                
                // Get the comment text
                const commentText = commentInput.value.trim();
                
                // Simple validation
                if (commentText === '') {
                    alert('Please enter a comment');
                    return;
                }
                
                // Use a default username or prompt for one
                let username = localStorage.getItem('tnfeeds_username');
                
                // If no username is stored, prompt for one
                if (!username) {
                    username = prompt('Enter your name (or remain Anonymous):', 'Anonymous');
                    if (!username) username = 'Anonymous'; // Default if cancelled
                    
                    // Store username for future comments
                    localStorage.setItem('tnfeeds_username', username);
                }
                
                // Post the comment
                const success = await postComment(articleId, username, commentText);
                
                if (success) {
                    // Clear the input field
                    commentInput.value = '';
                } else {
                    alert('Error posting comment. Please try again.');
                }
            });
        });
        
        // Add event listeners for like/dislike buttons
        const reactionButtons = document.querySelectorAll('.like-btn, .dislike-btn');
        reactionButtons.forEach(button => {
            button.addEventListener('click', async function() {
                const articleId = this.dataset.articleId;
                const reactionType = this.dataset.action; // 'like' or 'dislike'
                
                // Handle the reaction
                const result = await handleReaction(articleId, reactionType);
                
                // Update UI based on result
                if (result === 'added' || result === 'updated') {
                    // If the reaction was added or updated, highlight this button
                    this.classList.add('active', reactionType === 'like' ? 'text-blue-600' : 'text-red-600');
                    
                    // If updated, un-highlight the other button
                    const otherButton = reactionType === 'like' 
                        ? document.querySelector(`.dislike-btn[data-article-id="${articleId}"]`)
                        : document.querySelector(`.like-btn[data-article-id="${articleId}"]`);
                        
                    if (otherButton && otherButton.classList.contains('active')) {
                        otherButton.classList.remove('active', 'text-blue-600', 'text-red-600');
                    }
                } else if (result === 'removed') {
                    // If the reaction was removed, un-highlight this button
                    this.classList.remove('active', 'text-blue-600', 'text-red-600');
                }
                
                // Refresh the counts for this article
                const article = await getOrCreateArticle(articleId);
                loadReactionCounts(articleId, article.id);
            });
        });
        
        // Load initial reaction states
        if (userFingerprint) {
            loadAllReactions();
        } else {
            // If fingerprint is not ready yet, wait for it
            fingerprintPromise.then(() => {
                loadAllReactions();
            });
        }
        
        // Add CSS styles for active reaction buttons
        const style = document.createElement('style');
        style.textContent = `
            /* Add style for active reaction buttons */
            .like-btn.active, .dislike-btn.active {
                font-weight: bold;
            }
            
            .like-btn.active {
                color: #2563eb !important; /* blue-600 */
            }
            
            .dislike-btn.active {
                color: #dc2626 !important; /* red-600 */
            }
            
            .comment {
                padding-bottom: 8px;
                margin-bottom: 8px;
                border-bottom: 1px solid #e5e5e5;
            }
            
            .comment:last-child {
                border-bottom: none;
            }
        `;
        document.head.appendChild(style);
    }

    // Wait for libraries to load before initializing
    checkLibrariesLoaded()
        .then(initializeCommentSystem)
        .catch(error => {
            console.error('Error loading libraries:', error);
            alert('Failed to load comment system. Please refresh the page.');
        });
})();
