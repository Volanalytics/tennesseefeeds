// Client-side enhancement for share button functionality
document.querySelectorAll('.share-btn').forEach(button => {
  button.addEventListener('click', async function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    // Show loading state
    const originalHtml = this.innerHTML;
    this.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    this.disabled = true;
    
    try {
      // Get article data from closest article container
      const articleContainer = this.closest('.article-card, [data-article-id]');
      if (!articleContainer) {
        console.error('Article container not found');
        throw new Error('Could not locate article container');
      }
      
      // Extract article metadata and generate article ID
      const titleElement = articleContainer.querySelector('h3 a');
      const title = titleElement ? titleElement.textContent.trim() : '';
      // Get article ID from data attribute or generate from title
      const articleId = articleContainer.dataset.articleId;
      console.log('DEBUG: articleId from data attribute:', articleId);
      if (!articleId) {
        throw new Error('Article ID not found');
      }

      // Generate the article block URL
      const articleBlockUrl = `/index.html?article=${articleId}&title=${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
      
      const descriptionElement = articleContainer.querySelector('p.text-neutral-600, .line-clamp-3');
      const description = descriptionElement ? descriptionElement.textContent.trim() : '';
      
      const sourceElement = articleContainer.querySelector('.text-sm.text-neutral-500');
      const source = sourceElement ? sourceElement.textContent.trim() : '';
      
      const imageElement = articleContainer.querySelector('img');
      const image = imageElement ? imageElement.getAttribute('src') : '';
      
      console.log('Sharing article:', { 
        articleId, title, source, url: articleBlockUrl,
        description: description.substring(0, 30) + '...',
        hasImage: !!image
      });
      
      // Make the API request with all article metadata
      const response = await fetch('/api/track-share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          articleId: articleId,  // Ensure this is the slug-based article ID
          title,
          description,
          source,
          url: articleBlockUrl,
          image,
          platform: 'web'
        })
      });
      
      const result = await response.json();
      
      if (result.success && result.shareUrl) {
        // Show sharing dialog
        showShareModal(result.shareUrl, title);
      } else {
        throw new Error('Failed to create share link');
      }
    } catch (error) {
      console.error('Error sharing article:', error);
      alert('Sorry, there was a problem sharing this article. Please try again later.');
    } finally {
      // Restore button
      this.innerHTML = originalHtml;
      this.disabled = false;
    }
  });
});

// Modal handling function
function showShareModal(shareUrl, title) {
  // Create modal or use existing
  let modal = document.getElementById('share-modal');
  if (modal) {
    modal.remove();
  }
  
  modal = document.createElement('div');
  modal.id = 'share-modal';
  modal.className = 'fixed inset-0 flex items-center justify-center z-50';
  modal.innerHTML = `
    <div class="absolute inset-0 bg-black bg-opacity-50" id="modal-overlay"></div>
    <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4 relative z-10">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-bold">Share Article</h3>
        <button id="close-share-modal" class="text-neutral-500 hover:text-neutral-700">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="mb-4">
        <input id="share-url" type="text" value="${shareUrl}" class="w-full px-3 py-2 border rounded-md bg-neutral-100" readonly>
      </div>
      <div class="flex flex-wrap justify-center gap-2 mb-4">
        <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}" target="_blank" class="bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700">
          <i class="fab fa-facebook-f mr-2"></i>Facebook
        </a>
        <a href="https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(title)}" target="_blank" class="bg-blue-400 text-white px-3 py-2 rounded-md hover:bg-blue-500">
          <i class="fab fa-twitter mr-2"></i>Twitter
        </a>
        <a href="mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent('Check out this article: ' + shareUrl)}" class="bg-neutral-600 text-white px-3 py-2 rounded-md hover:bg-neutral-700">
          <i class="fas fa-envelope mr-2"></i>Email
        </a>
      </div>
      <button id="copy-share-url" class="w-full bg-neutral-700 text-white px-4 py-2 rounded-md hover:bg-neutral-600">
        <i class="fas fa-copy mr-2"></i>Copy Link
      </button>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Set up event listeners
  document.getElementById('modal-overlay').addEventListener('click', function() {
    modal.remove();
  });
  
  document.getElementById('close-share-modal').addEventListener('click', function() {
    modal.remove();
  });
  
  document.getElementById('copy-share-url').addEventListener('click', function() {
    const shareUrlInput = document.getElementById('share-url');
    shareUrlInput.select();
    document.execCommand('copy');
    
    this.innerHTML = '<i class="fas fa-check mr-2"></i>Copied!';
    setTimeout(() => {
      this.innerHTML = '<i class="fas fa-copy mr-2"></i>Copy Link';
    }, 2000);
  });
  
  // Select the URL text for easy copying
  setTimeout(() => {
    const shareUrlInput = document.getElementById('share-url');
    if (shareUrlInput) {
      shareUrlInput.focus();
      shareUrlInput.select();
    }
  }, 100);
}
