// Create a new file called better-comments.js with this content

// Better comment system - completely replaces existing functionality
(function() {
  // Wait for DOM to be loaded
  document.addEventListener('DOMContentLoaded', function() {
    console.log('Better comment system initializing');
    
    // First, remove all existing event handlers from comment buttons
    // by replacing them with clones
    document.querySelectorAll('.comment-btn').forEach(function(button) {
      const newButton = button.cloneNode(true);
      if (button.parentNode) {
        button.parentNode.replaceChild(newButton, button);
      }
    });
    
    // Initialize all comment sections as hidden
    document.querySelectorAll('.comments-section').forEach(function(section) {
      section.style.display = 'none';
    });
    
    // Add new event handlers directly to the buttons
    document.querySelectorAll('.comment-btn').forEach(function(button) {
      button.addEventListener('click', handleCommentButtonClick);
    });
    
    // Add event handlers for the post comment buttons
    document.querySelectorAll('.post-comment-btn').forEach(function(button) {
      button.addEventListener('click', handlePostComment);
    });
    
    // Store the current article ID that has comments open
    let currentOpenArticleId = null;
    
    // Handle comment button clicks
    function handleCommentButtonClick(event) {
      // Stop event propagation
      event.preventDefault();
      event.stopPropagation();
      
      console.log('Comment button clicked');
      
      // Find the article and comments section
      const article = this.closest('[data-article-id]');
      if (!article) return;
      
      const articleId = article.dataset.articleId;
      if (!articleId) return;
      
      const commentsSection = article.querySelector('.comments-section');
      if (!commentsSection) return;
      
      console.log('Processing comment toggle for article:', articleId);
      
      // Check if this section is already open
      const isOpen = commentsSection.style.display === 'block';
      
      // If another section is open, close it first
      if (currentOpenArticleId && currentOpenArticleId !== articleId) {
        const otherArticle = document.querySelector(`[data-article-id="${currentOpenArticleId}"]`);
        if (otherArticle) {
          const otherSection = otherArticle.querySelector('.comments-section');
          if (otherSection) {
            otherSection.style.display = 'none';
          }
        }
      }
      
      // Toggle this section
      if (isOpen) {
        // Close this section
        commentsSection.style.display = 'none';
        currentOpenArticleId = null;
        console.log('Comments section closed');
      } else {
        // Open this section
        commentsSection.style.display = 'block';
        commentsSection.dataset.articleId = articleId;
        currentOpenArticleId = articleId;
        console.log('Comments section opened, loading comments');
        
        // Load comments if the function exists
        if (typeof window.loadComments === 'function') {
          try {
            window.loadComments(articleId);
          } catch (error) {
            console.error('Error loading comments:', error);
          }
        }
      }
    }
    
    // Handle post comment button clicks
    function handlePostComment(event) {
      // Stop event propagation
      event.preventDefault();
      event.stopPropagation();
      
      // Find the article
      const article = this.closest('[data-article-id]');
      if (!article) return;
      
      const articleId = article.dataset.articleId;
      const commentInput = article.querySelector('.comment-input');
      if (!commentInput) return;
      
      const commentText = commentInput.value.trim();
      if (commentText === '') {
        alert('Please enter a comment');
        return;
      }
      
      // Get username from localStorage or prompt
      let username = localStorage.getItem('tnfeeds_username');
      if (!username) {
        username = prompt('Enter your name (or remain Anonymous):', 'Anonymous') || 'Anonymous';
        localStorage.setItem('tnfeeds_username', username);
      }
      
      // Get article details
      const articleTitle = article.querySelector('h3 a')?.textContent || 'Untitled Article';
      const articleSource = article.dataset.source || 'Unknown';
      const articleUrl = article.querySelector('a')?.href || '';
      
      // Post the comment if the function exists
      if (typeof window.postComment === 'function') {
        window.postComment(null, articleId, username, commentText, articleTitle, articleSource, articleUrl)
          .then(function(success) {
            if (success) {
              // Clear the input and reload comments
              commentInput.value = '';
              if (typeof window.loadComments === 'function') {
                window.loadComments(articleId);
              }
            } else {
              alert('Error posting comment. Please try again.');
            }
          })
          .catch(function(error) {
            console.error('Error posting comment:', error);
            alert('Error posting comment. Please try again.');
          });
      }
    }
    
    console.log('Better comment system initialized');
  });
})();
