// Fix for comment button behavior in index.html
// Add this code to the end of your index.html file (before the closing </body> tag)
// or save as a separate file and include it after comments.js

document.addEventListener('DOMContentLoaded', function() {
  // Remove all existing click event listeners (this is crucial)
  document.body.addEventListener('click', function(event) {
    event.stopPropagation(); // Stop propagation at body level
  }, true); // Using capture phase to ensure it runs first

  // Replace the old click handler with a new one
  const oldClickListeners = getEventListeners(document).click || [];
  for (const listener of oldClickListeners) {
    document.removeEventListener('click', listener.listener);
  }

  // Single event handler for comment buttons with lock to prevent race conditions
  let commentToggleLock = false;
  
  // New delegated event handler for comment buttons only
  document.body.addEventListener('click', function(event) {
    // Find if this click was on or inside a comment button
    const commentBtn = event.target.closest('.comment-btn');
    if (!commentBtn) return; // Not a comment button click
    
    // Prevent default behavior and stop event propagation
    event.preventDefault();
    event.stopPropagation();
    
    // If a toggle operation is already in progress, ignore this click
    if (commentToggleLock) {
      console.log('Comment toggle in progress, ignoring click');
      return;
    }
    
    // Set lock to prevent multiple operations
    commentToggleLock = true;
    
    // Find the article container and comments section
    const articleContainer = commentBtn.closest('[data-article-id]');
    if (!articleContainer) {
      console.error('Article container not found');
      commentToggleLock = false;
      return;
    }
    
    const articleId = articleContainer.dataset.articleId;
    const commentsSection = articleContainer.querySelector('.comments-section');
    
    if (!commentsSection) {
      console.error('Comments section not found');
      commentToggleLock = false;
      return;
    }
    
    console.log('Toggling comments for article:', articleId);
    
    // Get current display state (using computed style is more reliable)
    const currentDisplay = window.getComputedStyle(commentsSection).display;
    const isVisible = currentDisplay !== 'none';
    
    if (isVisible) {
      // Hide comments
      commentsSection.style.display = 'none';
      console.log('Comments hidden for', articleId);
      commentToggleLock = false;
    } else {
      // Show comments
      commentsSection.style.display = 'block';
      
      // Set data attribute for tracking
      commentsSection.dataset.articleId = articleId;
      
      // Load comments
      if (typeof window.loadComments === 'function') {
        window.loadComments(articleId)
          .then(() => {
            // Ensure comments section is still visible after loading
            commentsSection.style.display = 'block';
            console.log('Comments loaded and visible for', articleId);
            commentToggleLock = false;
          })
          .catch(error => {
            console.error('Error loading comments:', error);
            commentToggleLock = false;
          });
      } else {
        console.error('loadComments function not found');
        commentToggleLock = false;
      }
    }
  });

  // Helper function to get event listeners (polyfill for Chrome DevTools function)
  function getEventListeners(element) {
    if (window.getEventListeners) {
      return window.getEventListeners(element);
    }
    return {}; // Return empty object if function not available
  }
  
  // Fix comment post button behavior
  document.body.addEventListener('click', function(event) {
    const postButton = event.target.closest('.post-comment-btn');
    if (!postButton) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    const articleCard = postButton.closest('[data-article-id]');
    if (!articleCard) return;
    
    const articleId = articleCard.dataset.articleId;
    const commentInput = articleCard.querySelector('.comment-input');
    const commentText = commentInput.value.trim();
    
    if (commentText === '') {
      alert('Please enter a comment');
      return;
    }
    
    let username = localStorage.getItem('tnfeeds_username');
    if (!username) {
      username = prompt('Enter your name (or remain Anonymous):', 'Anonymous') || 'Anonymous';
      localStorage.setItem('tnfeeds_username', username);
    }
    
    const articleTitle = articleCard.querySelector('h3 a')?.textContent || 'Untitled Article';
    const articleSource = articleCard.dataset.source || 'Unknown';
    const articleUrl = articleCard.querySelector('a')?.href || '';
    
    if (typeof window.postComment === 'function') {
      window.postComment(null, articleId, username, commentText, articleTitle, articleSource, articleUrl)
        .then(success => {
          if (success) {
            commentInput.value = '';
            return window.loadComments(articleId);
          } else {
            alert('Error posting comment. Please try again.');
          }
        })
        .catch(error => {
          console.error('Error posting comment:', error);
          alert('Error posting comment. Please try again.');
        });
    }
  });
  
  console.log('Comment button fix initialized');
});
