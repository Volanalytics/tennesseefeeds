// Create a file named micro-fix.js with this code
// This is a minimal solution with ONLY what's needed to fix the issue

(function() {
  // Track the comment section we're currently interacting with
  let activeCommentSectionId = null;
  
  // Create a MutationObserver to watch for style changes
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.attributeName === 'style') {
        const section = mutation.target;
        // If this is our active section and it's being hidden, prevent that
        if (section.dataset.articleId === activeCommentSectionId && 
            section.style.display === 'none') {
          console.log('Preventing unwanted close of comment section');
          section.style.display = 'block';
        }
      }
    });
  });
  
  // Wait for DOM to be ready
  document.addEventListener('DOMContentLoaded', function() {
    // Find all comment buttons
    document.querySelectorAll('.comment-btn').forEach(function(button) {
      // Add a click interceptor
      button.addEventListener('click', function(e) {
        const article = this.closest('[data-article-id]');
        if (!article) return;
        
        const articleId = article.dataset.articleId;
        const commentsSection = article.querySelector('.comments-section');
        if (!commentsSection) return;
        
        // If we're opening comments, mark this as active
        if (commentsSection.style.display !== 'block') {
          activeCommentSectionId = articleId;
          
          // Start observing this section
          observer.observe(commentsSection, { 
            attributes: true,
            attributeFilter: ['style']
          });
          
          // Set a timeout to stop observing
          setTimeout(function() {
            activeCommentSectionId = null;
            observer.disconnect();
          }, 1000);
        } else {
          // If we're closing, clear active ID
          activeCommentSectionId = null;
        }
      }, true); // Use capture phase
    });
  });
})();
