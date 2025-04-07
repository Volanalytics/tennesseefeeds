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

   async function loadComments(articleId) {
    console.log('Loading comments for article:', articleId);
    try {
        const response = await fetch(`https://tennesseefeeds-api.onrender.com/api/comments/${articleId}`);
        console.log('Fetch response status:', response.status);
        
        const result = await response.json();
        console.log('Fetch result:', result);

        if (result.success) {
            const commentsContainer = document.querySelector(
                `.comments-section[data-article-id="${articleId}"]`
            );

            if (commentsContainer) {
                console.log('Comments container found, updating...');
                commentsContainer.innerHTML = '';
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
                console.error('Comments container not found for article:', articleId);
            }
        } else {
            console.error('Failed to load comments:', result.error);
        }
    } catch (error) {
        console.error('Error loading comments:', error);
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
