// comments.js - Supabase-powered comment system for TennesseeFeeds.com

(function() {
    // Initialize Supabase client
    const supabaseUrl = 'https://ulhbtjppfoctdghimkmu.supabase.co';
    const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsaGJ0anBwZm9jdGRnaGlta211Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQwMzE5MzAsImV4cCI6MjA1OTYwNzkzMH0.LLIBpZkoiHWTOHzNfho2KALWdRMkNYSXF-AWD9Wyoa0';
    
    // Wait for Supabase library to load
    function waitForSupabase() {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            
            function checkSupabase() {
                if (window.supabase) {
                    resolve(window.supabase.createClient(supabaseUrl, supabaseAnonKey));
                } else if (Date.now() - startTime > 5000) {
                    reject(new Error('Supabase failed to load within 5 seconds'));
                } else {
                    setTimeout(checkSupabase, 100);
                }
            }
            
            checkSupabase();
        });
    }

    // Utility function to get or create an article
    async function getOrCreateArticle(supabase, articleId, title, source, url) {
        try {
            // First, try to fetch existing article
            const { data: existingArticle, error: fetchError } = await supabase
                .from('articles')
                .select('*')
                .eq('article_id', articleId)
                .single();

            if (fetchError && fetchError.code !== 'PGRST116') {
                console.error('Error fetching article:', fetchError);
                return null;
            }

            // If article exists, return it
            if (existingArticle) {
                return existingArticle;
            }

            // If no article, create a new one
            const { data: newArticle, error: insertError } = await supabase
                .from('articles')
                .insert({ 
                    article_id: articleId,
                    title: title || 'Untitled Article',
                    source: source || 'Unknown',
                    url: url || ''
                })
                .select()
                .single();

            if (insertError) {
                console.error('Error creating article:', insertError);
                return null;
            }

            return newArticle;
        } catch (error) {
            console.error('Unexpected error in getOrCreateArticle:', error);
            return null;
        }
    }

    // Function to post a comment
    async function postComment(supabase, articleId, username, content, title, source, url) {
        try {
            // Get or create the article
            const article = await getOrCreateArticle(supabase, articleId, title, source, url);
            
            if (!article) {
                console.error('Could not get or create article');
                return false;
            }

            // Insert comment
            const { data, error } = await supabase
                .from('comments')
                .insert({
                    article_id: article.id,
                    username: username,
                    content: content
                })
                .select()
                .single();

            if (error) {
                console.error('Error posting comment:', error);
                return false;
            }

            console.log('Comment posted successfully:', data);
            return true;
        } catch (error) {
            console.error('Unexpected error in postComment:', error);
            return false;
        }
    }

    // Function to load comments for an article
    async function loadComments(supabase, articleId) {
        try {
            // Get the article first
            const article = await getOrCreateArticle(supabase, articleId);
            
            if (!article) {
                console.error('Could not get article');
                return;
            }

            // Fetch comments for this article
            const { data: comments, error } = await supabase
                .from('comments')
                .select('*')
                .eq('article_id', article.id)
                .order('created_at', { ascending: true });

            if (error) {
                console.error('Error loading comments:', error);
                return;
            }

            // Find the comments section for this article
            const commentsContainer = document.querySelector(
                `.comments-section[data-article-id="${articleId}"]`
            );

            if (commentsContainer) {
                // Clear existing comments
                commentsContainer.innerHTML = '';

                // Render each comment
                comments.forEach(comment => {
                    const commentElement = document.createElement('div');
                    commentElement.classList.add('comment');
                    commentElement.innerHTML = `
                        <strong>${comment.username}</strong>
                        <p>${comment.content}</p>
                        <small>${new Date(comment.created_at).toLocaleString()}</small>
                    `;
                    commentsContainer.appendChild(commentElement);
                });
            }
        } catch (error) {
            console.error('Unexpected error in loadComments:', error);
        }
    }

    // Initialize comment system
    function initCommentSystem(supabase) {
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
                    supabase, 
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
                    loadComments(supabase, articleId);
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
                    loadComments(supabase, articleId);
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

    // Wait for DOM and Supabase to be ready
    document.addEventListener('DOMContentLoaded', () => {
        waitForSupabase()
            .then(supabase => {
                initCommentSystem(supabase);
            })
            .catch(error => {
                console.error('Failed to initialize Supabase:', error);
                alert('Failed to load comment system. Please refresh the page.');
            });
    });
})();
