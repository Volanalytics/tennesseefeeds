// comments.js - Complete implementation for TennesseeFeeds.com comment system
// Replace the URL and key below with your actual Supabase credentials

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

// Helper function to get or create an article entry
async function getOrCreateArticle(articleId) {
    // Try to get the article first
    const { data: existingArticle, error: getError } = await supabase
        .from('articles')
        .select('*')
        .eq('article_id', articleId)
        .maybeSingle();
    
    if (getError) throw getError;
    
    // If article exists, return it
    if (existingArticle) return existingArticle;
    
    // Otherwise, create a new article entry
    // Get article details from the DOM
    const articleElement = document.querySelector(`[data-article-id="${articleId}"]`);
    if (!articleElement) throw new Error('Article element not found');
    
    const title = articleElement.querySelector('h3 a').textContent.trim();
    const source = articleElement.closest('.bg-white').querySelector('.text-sm.text-neutral-500').textContent.trim();
    const url = articleElement.querySelector('h3 a').getAttribute('href');
    
    // Create the article
    const { data: newArticle, error: insertError } = await supabase
        .from('articles')
        .insert([
            { 
                article_id: articleId,
                title: title,
                source: source,
                url: url
            }
        ])
        .select()
        .single();
        
    if (insertError) throw insertError;
    
    return newArticle;
}

// Function to load comments for a specific article
async function loadComments(articleId) {
    // Get the comments container
    const commentsContainer = document.querySelector(`[data-comments-container="${articleId}"]`);
    
    if (!commentsContainer) return;
    
    try {
        // First, ensure the article exists in the database
        let article = await getOrCreateArticle(articleId);
        
        // Query for comments related to this article
        const { data: comments, error } = await supabase
            .from('comments')
            .select('*')
            .eq('article_id', article.id)
            .order('created_at', { ascending: false });
            
        if (error) throw error;
        
        // Clear existing comments
        commentsContainer.innerHTML = '';
        
        // Display comments or "no comments" message
        if (comments.length === 0) {
            commentsContainer.innerHTML = '<p class="text-neutral-500 text-sm">No comments yet.</p>';
        } else {
            comments.forEach(comment => {
                const commentElement = document.createElement('div');
                commentElement.classList.add('comment', 'mb-3', 'pb-3', 'border-b');
                
                const date = new Date(comment.created_at);
                const formattedDate = date.toLocaleString();
                
                commentElement.innerHTML = `
                    <div class="flex justify-between items-start mb-1">
                        <span class="font-semibold">${escapeHTML(comment.username)}</span>
                        <span class="text-xs text-neutral-500">${formattedDate}</span>
                    </div>
                    <p class="text-neutral-600">${escapeHTML(comment.content)}</p>
                `;
                
                commentsContainer.appendChild(commentElement);
            });
        }
    } catch (error) {
        console.error('Error loading comments:', error);
        commentsContainer.innerHTML = '<p class="text-red-500">Error loading comments. Please try again.</p>';
    }
}

// Function to post a new comment
async function postComment(articleId, username, content) {
    try {
        // First, ensure the article exists in the database
        let article = await getOrCreateArticle(articleId);
        
        // Insert the comment
        const { data, error } = await supabase
            .from('comments')
            .insert([
                { 
                    article_id: article.id,
                    username: username, 
                    content: content 
                }
            ])
            .select();
            
        if (error) throw error;
        
        // Reload comments to show the new one
        await loadComments(articleId);
        
        return true;
    } catch (error) {
        console.error('Error posting comment:', error);
        return false;
    }
}

// Function to handle reactions (likes/dislikes)
async function handleReaction(articleId, reactionType) {
    if (!userFingerprint) {
        await fingerprintPromise;
    }
    
    try {
        // First, ensure the article exists in the database
        let article = await getOrCreateArticle(articleId);
        
        // Check if user already reacted to this article
        const { data: existingReaction, error: getError } = await supabase
            .from('reactions')
            .select('*')
            .eq('article_id', article.id)
            .eq('user_fingerprint', userFingerprint)
            .maybeSingle();
            
        if (getError) throw getError;
        
        if (existingReaction) {
            // If same reaction type, remove the reaction (toggle off)
            if (existingReaction.reaction_type === reactionType) {
                const { error: deleteError } = await supabase
                    .from('reactions')
                    .delete()
                    .eq('id', existingReaction.id);
                    
                if (deleteError) throw deleteError;
                
                return 'removed';
            } 
            // If different reaction type, update the reaction (switch from like to dislike or vice versa)
            else {
                const { error: updateError } = await supabase
                    .from('reactions')
                    .update({ reaction_type: reactionType })
                    .eq('id', existingReaction.id);
                    
                if (updateError) throw updateError;
                
                return 'updated';
            }
        } 
        // If no existing reaction, create a new one
        else {
            const { error: insertError } = await supabase
                .from('reactions')
                .insert([
                    { 
                        article_id: article.id,
                        user_fingerprint: userFingerprint,
                        reaction_type: reactionType
                    }
                ]);
                
            if (insertError) throw insertError;
            
            return 'added';
        }
    } catch (error) {
        console.error(`Error handling ${reactionType}:`, error);
        return 'error';
    }
}

// Function to load all reaction states for the current page
async function loadAllReactions() {
    if (!userFingerprint) {
        await fingerprintPromise;
    }
    
    // Get all article IDs on the page
    const articleElements = document.querySelectorAll('[data-article-id]');
    const articleIds = Array.from(articleElements).map(el => el.dataset.articleId);
    
    // Skip if no articles
    if (articleIds.length === 0) return;
    
    try {
        // Get all articles that exist in the database
        const { data: articles, error: articlesError } = await supabase
            .from('articles')
            .select('id, article_id')
            .in('article_id', articleIds);
            
        if (articlesError) throw articlesError;
        
        if (articles && articles.length > 0) {
            // Create a map of article_id to database id
            const articleIdMap = articles.reduce((map, article) => {
                map[article.article_id] = article.id;
                return map;
            }, {});
            
            // Get user's reactions for these articles
            const { data: reactions, error: reactionsError } = await supabase
                .from('reactions')
                .select('*')
                .in('article_id', articles.map(a => a.id))
                .eq('user_fingerprint', userFingerprint);
                
            if (reactionsError) throw reactionsError;
            
            // Update UI for user's reactions
            if (reactions && reactions.length > 0) {
                reactions.forEach(reaction => {
                    // Find the article_id for this database id
                    const articleId = Object.keys(articleIdMap).find(
                        key => articleIdMap[key] === reaction.article_id
                    );
                    
                    if (articleId) {
                        // Find the buttons for this article
                        const likeBtn = document.querySelector(`.like-btn[data-article-id="${articleId}"]`);
                        const dislikeBtn = document.querySelector(`.dislike-btn[data-article-id="${articleId}"]`);
                        
                        if (reaction.reaction_type === 'like' && likeBtn) {
                            likeBtn.classList.add('active', 'text-blue-600');
                        } else if (reaction.reaction_type === 'dislike' && dislikeBtn) {
                            dislikeBtn.classList.add('active', 'text-red-600');
                        }
                    }
                });
            }
            
            // For each article, load the like/dislike counts
            for (const articleId of articleIds) {
                if (articleIdMap[articleId]) {
                    loadReactionCounts(articleId, articleIdMap[articleId]);
                }
            }
        }
    } catch (error) {
        console.error('Error loading reactions:', error);
    }
}

// Function to load reaction counts for an article
async function loadReactionCounts(articleId, dbArticleId) {
    try {
        // Get counts of likes and dislikes
        const { count: likesCount, error: likesError } = await supabase
            .from('reactions')
            .select('id', { count: 'exact', head: true })
            .eq('article_id', dbArticleId)
            .eq('reaction_type', 'like');
            
        const { count: dislikesCount, error: dislikesError } = await supabase
            .from('reactions')
            .select('id', { count: 'exact', head: true })
            .eq('article_id', dbArticleId)
            .eq('reaction_type', 'dislike');
            
        if (likesError) throw likesError;
        if (dislikesError) throw dislikesError;
        
        // Update the UI
        const likeBtn = document.querySelector(`.like-btn[data-article-id="${articleId}"]`);
        const dislikeBtn = document.querySelector(`.dislike-btn[data-article-id="${articleId}"]`);
        
        if (likeBtn) {
            const likeCountElement = likeBtn.querySelector('.like-count');
            if (likeCountElement) {
                likeCountElement.textContent = likesCount || 0;
            }
        }
        
        if (dislikeBtn) {
            const dislikeCountElement = dislikeBtn.querySelector('.dislike-count');
            if (dislikeCountElement) {
                dislikeCountElement.textContent = dislikesCount || 0;
            }
        }
    } catch (error) {
        console.error('Error loading reaction counts:', error);
    }
}

// Helper function to escape HTML to prevent XSS
function escapeHTML(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
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
});
