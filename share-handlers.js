// share-handlers.js - Improved sharing functionality
(function() {
  console.log('Initializing enhanced share handlers...');
  
  // Wait for DOM to be ready
  document.addEventListener('DOMContentLoaded', function() {
    // Set up handlers for all share buttons
    setupShareButtons();
    
    // Check if we're on a share page and handle redirect
    handleShareRedirect();
  });
  
  function setupShareButtons() {
    const shareButtons = document.querySelectorAll('.share-btn');
    
    if (shareButtons.length === 0) {
      console.log('No share buttons found on page');
      return;
    }
    
    console.log(`Found ${shareButtons.length} share buttons, setting up handlers`);
    
    shareButtons.forEach(button => {
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
          
          const articleId = articleContainer.dataset.articleId;
          
          // Extract article metadata - improved selectors to better find content
          const titleElement = articleContainer.querySelector('h3 a');
          const title = titleElement ? titleElement.textContent.trim() : '';
          
          // Try multiple selectors for description to increase chances of finding it
          const descriptionElement = articleContainer.querySelector('p.text-neutral-600, .line-clamp-3');
          const description = descriptionElement ? descriptionElement.textContent.trim() : '';
          
          const sourceElement = articleContainer.querySelector('.text-sm.text-neutral-500');
          const source = sourceElement ? sourceElement.textContent.trim() : '';
          
          const linkElement = articleContainer.querySelector('h3 a');
          const link = linkElement ? linkElement.getAttribute('href') : window.location.href;
          
          const imageElement = articleContainer.querySelector('img');
          const image = imageElement ? imageElement.getAttribute('src') : '';
          
          console.log('Sharing article:', { 
            articleId, 
            title: title || '[No title provided]',
            source: source || '[No source provided]',
            urlProvided: !!link,
            descriptionLength: description ? description.length : 0,
            hasImage: !!image
          });
          
          // Make the API request with all article metadata and platform parameter
          const response = await fetch('/api/track-share', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              articleId,
              title,
              description,
              source,
              url: link,
              image,
              platform: 'web' // Add platform parameter
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
  }
  
  function showShareModal(shareUrl, title) {
    // Remove any existing modal
    const existingModal = document.getElementById('share-modal');
    if (existingModal) {
      existingModal.remove();
    }
    
    // Create modal
    const modal = document.createElement('div');
    modal.id = 'share-modal';
    modal.className = 'fixed inset-0 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="absolute inset-0 bg-black bg-opacity-50" id="modal-overlay"></div>
      <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4 relative z-10">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-bold">Share Article</h3>
          <button id="close-share-modal" class="text-gray-500 hover:text-gray-700">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="mb-4">
          <input id="share-url" type="text" value="${shareUrl}" class="w-full px-3 py-2 border rounded-md bg-gray-100" readonly>
        </div>
        <div class="flex flex-wrap justify-center gap-2 mb-4">
          <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}" target="_blank" class="bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700">
            <i class="fab fa-facebook-f mr-2"></i>Facebook
          </a>
          <a href="https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(title)}" target="_blank" class="bg-blue-400 text-white px-3 py-2 rounded-md hover:bg-blue-500">
            <i class="fab fa-twitter mr-2"></i>Twitter
          </a>
          <a href="mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent('Check out this article: ' + shareUrl)}" class="bg-gray-600 text-white px-3 py-2 rounded-md hover:bg-gray-700">
            <i class="fas fa-envelope mr-2"></i>Email
          </a>
          <button id="copy-share-url" class="bg-gray-700 text-white px-3 py-2 rounded-md hover:bg-gray-800">
            <i class="fas fa-copy mr-2"></i>Copy Link
          </button>
        </div>
        <p class="text-sm text-gray-500 text-center">Share this article with your friends and family!</p>
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
  
  function handleShareRedirect() {
    // Check if we're on a share page
    const pathMatch = window.location.pathname.match(/^\/share\/([^\/]+)$/);
    if (pathMatch && pathMatch[1]) {
      const shareId = pathMatch[1];
      console.log(`On share page for ID: ${shareId}`);
      
      // If we're on a share page but no redirect happens automatically,
      // we can extract the article URL from query params and redirect
      const urlParams = new URLSearchParams(window.location.search);
      const articleUrl = urlParams.get('article');
      
      if (articleUrl) {
        console.log(`Redirecting to article: ${articleUrl}`);
        window.location.href = articleUrl;
      }
      
      // Add a fallback redirect in case the server-side redirect fails
      setTimeout(() => {
        if (window.location.pathname.startsWith('/share/')) {
          console.log('Fallback redirect to homepage');
          window.location.href = 'https://tennesseefeeds.com';
        }
      }, 5000);
    }
  }
})();
