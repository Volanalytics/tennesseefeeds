async function loadComments(articleId) {
            try {
                // Get the article first
                const article = await getOrCreateArticle(articleId);
                if (!article) {
                    console.error('Could not get article');
                    return;
                }

                // Fetch comments for this article
                const { data: comments, error } = await supabaseClient
                    .from('comments')
                    .select('*')
                    .eq('article_id', article.id)
                    .order('created_at', { ascending: true });

                if (error) {
                    console.error('Error loading comments:', error);
                    return;
                }

                // Render comments in the UI
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

        // Function to load reaction counts
        async function loadReactionCounts(articleId, dbArticleId) {
            try {
                // Fetch reaction counts
                const { data: reactionCounts, error } = await supabaseClient
                    .from('reactions')
                    .select('reaction_type, count')
                    .eq('article_id', dbArticleId)
                    .groupBy('reaction_type');

                if (error) {
                    console.error('Error loading reaction counts:', error);
                    return;
                }

                // Update reaction count buttons
                const likeButton = document.querySelector(`.like-btn[data-article-id="${articleId}"]`);
                const dislikeButton = document.querySelector(`.dislike-btn[data-article-id="${articleId}"]`);

                if (likeButton && dislikeButton) {
                    const likesCount = reactionCounts.find(r => r.reaction_type === 'like')?.count || 0;
                    const dislikesCount = reactionCounts.find(r => r.reaction_type === 'dislike')?.count || 0;

                    likeButton.textContent = `Like (${likesCount})`;
                    dislikeButton.textContent = `Dislike (${dislikesCount})`;
                }
            } catch (error) {
                console.error('Unexpected error in loadReactionCounts:', error);
            }
        }

        // Initial load of all reactions
        async function loadAllReactions() {
            try {
                // Get all articles with their reaction counts
                const { data: articles, error: articlesError } = await supabaseClient
                    .from('articles')
                    .select('id, article_id');

                if (articlesError) {
                    console.error('Error fetching articles:', articlesError);
                    return;
                }

                // Load reaction counts for each article
                for (const article of articles) {
                    loadReactionCounts(article.article_id, article.id);
                }
            } catch (error) {
                console.error('Unexpected error in loadAllReactions:', error);
            }
        }// comments.js - Improved implementation for TennesseeFeeds.com comment system

(function() {
    // Safer way to check if libraries are loaded
    function waitForLibraries() {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            
            function checkLibraries() {
                if (window.supabase && window.Fingerprint2) {
                    resolve();
                } else if (Date.now() - startTime > 5000) {
                    reject(new Error('Libraries failed to load within 5 seconds'));
                } else {
                    setTimeout(checkLibraries, 100);
                }
            }
            
            checkLibraries();
        });
    }

    // Main initialization function
    function initCommentSystem() {
        // Defensive check for libraries
        if (!window.supabase || !window.Fingerprint2) {
            console.error('Supabase or Fingerprint libraries not loaded');
            return;
        }

        // Initialize Supabase client with better error handling
        let supabaseClient;
        try {
            supabaseClient = supabase.createClient(
                'https://ulhbtjppfoctdghimkmu.supabase.co',  
                'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsaGJ0anBwZm9jdGRnaGlta211Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQwMzE5MzAsImV4cCI6MjA1OTYwNzkzMH0.LLIBpZkoiHWTOHzNfho2KALWdRMkNYSXF-AWD9Wyoa0'
            );
        } catch (error) {
            console.error('Failed to initialize Supabase client:', error);
            return;
        }

        // Generate a consistent fingerprint to identify users anonymously
        async function getUserFingerprint() {
            try {
                const components = await Fingerprint2.getPromise({
                    excludes: {
                        enumerateDevices: true,
                        pixelRatio: true,
                        doNotTrack: true
                    }
                });
                const values = components.map(component => component.value);
                return Fingerprint2.x64hash128(values.join(''), 31);
            } catch (error) {
                console.error('Error generating fingerprint:', error);
                return 'unknown_user';
            }
        }

        // Improved function to get or create an article
        async function getOrCreateArticle(articleId, title, source, url) {
            try {
                // First, try to fetch existing article
                const { data: existingArticle, error: fetchError } = await supabaseClient
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
                const { data: newArticle, error: insertError } = await supabaseClient
                    .from('articles')
                    .insert({ 
                        article_id: articleId,
                        title: title || 'Untitled Article',
                        source: source || 'Unknown',
                        url: url || '',
                        created_at: new Date().toISOString()
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

        // Improved function to post comments
        async function postComment(articleId, username, content, title = 'Untitled', source = 'Unknown', url = '') {
            try {
                // First, get or create the article
                const article = await getOrCreateArticle(articleId, title, source, url);
                if (!article) {
                    console.error('Could not get or create article');
                    return false;
                }

                // Insert comment
                const { data, error } = await supabaseClient
                    .from('comments')
                    .insert({
                        article_id: article.id,
                        username: escapeHTML(username),
                        content: escapeHTML(content)
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

        // Improved function to handle reactions
        async function handleReaction(articleId, reactionType, title = 'Untitled', source = 'Unknown', url = '') {
            try {
                // Get or create the article
                const article = await getOrCreateArticle(articleId, title, source, url);
                if (!article) {
                    console.error('Could not get or create article');
                    return 'error';
                }

                // Get user fingerprint
                const userFingerprint = await getUserFingerprint();

                // Check if user has already reacted
                const { data: existingReaction, error: fetchError } = await supabaseClient
                    .from('reactions')
                    .select('*')
                    .eq('article_id', article.id)
                    .eq('user_fingerprint', userFingerprint)
                    .single();

                if (fetchError && fetchError.code !== 'PGRST116') {
                    console.error('Error checking existing reaction:', fetchError);
                    return 'error';
                }

                if (existingReaction) {
                    // If reaction exists and is the same, remove it
                    if (existingReaction.reaction_type === reactionType) {
                        const { error: deleteError } = await supabaseClient
                            .from('reactions')
                            .delete()
                            .eq('id', existingReaction.id);

                        if (deleteError) {
                            console.error('Error removing reaction:', deleteError);
                            return 'error';
                        }
                        return 'removed';
                    }

                    // If different reaction, update the existing reaction
                    const { error: updateError } = await supabaseClient
                        .from('reactions')
                        .update({ reaction_type: reactionType })
                        .eq('id', existingReaction.id);

                    if (updateError) {
                        console.error('Error updating reaction:', updateError);
                        return 'error';
                    }
                    return 'updated';
                }

                // No existing reaction, create a new one
                const { error: insertError } = await supabaseClient
                    .from('reactions')
                    .insert({
                        article_id: article.id,
                        reaction_type: reactionType,
                        user_fingerprint: userFingerprint
                    });

                if (insertError) {
                    console.error('Error adding reaction:', insertError);
                    return 'error';
                }
                return 'added';
            } catch (error) {
                console.error('Unexpected error in handleReaction:', error);
                return 'error';
            }
        }

        // Function to load comments for an article
        async function loadComments(articleId) {
            try {
                // Get the article first
                const article = await getOrCreateArticle(articleId);
                if (!article) {
                    console.error('Could not get article');
                    return;
                }

                // Fetch comments for this article
                const { data: comments, error } = await supabaseClient
                    .from('comments')
                    .select('*')
                    .eq('article_id', article.id)
                    .order('created_at', { ascending: true });

                if (error) {
                    console.error('Error loading comments:', error);
                    return;
                }

                // Render comments in the UI
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

        // Function to load reaction counts
        async function loadReactionCounts(articleId, dbArticleId) {
            try {
                // Fetch reaction counts
                const { data: reactionCounts, error } = await supabaseClient
                    .from('reactions')
                    .select('reaction_type, count')
                    .eq('article_id', dbArticleId)
                    .groupBy('reaction_type');

                if (error) {
                    console.error('Error loading reaction counts:', error);
                    return;
                }

                // Update reaction count buttons
                const likeButton = document.querySelector(`.like-btn[data-article-id="${articleId}"]`);
                const dislikeButton = document.querySelector(`.dislike-btn[data-article-id="${articleId}"]`);

                if (likeButton && dislikeButton) {
                    const likesCount = reactionCounts.find(r => r.reaction_type === 'like')?.count || 0;
                    const dislikesCount = reactionCounts.find(r => r.reaction_type === 'dislike')?.count || 0;

                    likeButton.textContent = `Like (${likesCount})`;
                    dislikeButton.textContent = `Dislike (${dislikesCount})`;
                }
            } catch (error) {
                console.error('Unexpected error in loadReactionCounts:', error);
            }
        }

        // Existing event listeners remain the same as in the previous implementation
        // ... (rest of the event listener code from the original implementation)

        // Initial load of all reactions
        async function loadAllReactions() {
            try {
                // Get all articles with their reaction counts
                const { data: articles, error: articlesError } = await supabaseClient
                    .from('articles')
                    .select('id, external_id');

                if (articlesError) {
                    console.error('Error fetching articles:', articlesError);
                    return;
                }

                // Load reaction counts for each article
                for (const article of articles) {
                    loadReactionCounts(article.external_id, article.id);
                }
            } catch (error) {
                console.error('Unexpected error in loadAllReactions:', error);
            }
        }

        // Initialization process
        let userFingerprint;
        const fingerprintPromise = getUserFingerprint().then(fingerprint => {
            userFingerprint = fingerprint;
            return loadAllReactions();
        });

        // Rest of the initialization remains the same
        // ... (rest of the code from the original implementation)
    }

    // Wait for libraries and DOM to be ready
    document.addEventListener('DOMContentLoaded', () => {
        waitForLibraries()
            .then(initCommentSystem)
            .catch(error => {
                console.error('Failed to initialize comment system:', error);
                alert('Failed to load comment system. Please refresh the page.');
            });
    });
})();
