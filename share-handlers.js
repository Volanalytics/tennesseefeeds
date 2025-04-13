// Fix for share button functionality
function setupShareButtons() {
  console.log('Setting up share button handlers');
  
  // Use direct event listeners on share buttons instead of delegation
  document.querySelectorAll('.share-btn').forEach(button => {
    button.addEventListener('click', async function(event) {
      event.preventDefault();
      event.stopPropagation();
      
      console.log('Share button clicked directly');
      
      // Find the article container
      const articleContainer = this.closest('.article-card') || this.closest('.bg-white');
      if (!articleContainer) {
        console.error('Could not find article container');
        return;
      }
      
      // Extract article data
      const titleElement = articleContainer.querySelector('h3 a');
      const title = titleElement ? titleElement.textContent.trim() : 'Tennessee News Article';
      const link = titleElement ? titleElement.getAttribute('href') : '';
      const descriptionElement = articleContainer.querySelector('p.text-neutral-600');
      const description = descriptionElement ? descriptionElement.textContent.trim() : '';
      const sourceElement = articleContainer.querySelector('.text-sm.text-neutral-500');
      const source = sourceElement ? sourceElement.textContent.trim() : '';
      const imageElement = articleContainer.querySelector('img');
      const imageUrl = imageElement ? imageElement.getAttribute('src') : '';
      const articleId = articleContainer.querySelector('[data-article-id]') ? 
                       articleContainer.querySelector('[data-article-id]').dataset.articleId : '';
      
      // Loading state
      this.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
      
      // Generate the share URL
      let shareUrl = null;
      
      try {
        // Try to use UserTracking for share tracking
        if (window.UserTracking && typeof window.UserTracking.trackShare === 'function') {
          shareUrl = await window.UserTracking.trackShare(articleId || link, 'web');
        }
        
        // Fallback to direct API call
        if (!shareUrl) {
          const response = await fetch('https://tennesseefeeds-api.onrender.com/api/save-share', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              title,
              description,
              link,
              source,
              image: imageUrl
            })
          });
          
          const data = await response.json();
          if (data.success && data.shareUrl) {
            shareUrl = data.shareUrl;
          }
        }
      } catch (error) {
        console.error('Error generating share URL:', error);
      }
      
      // Restore button
      this.innerHTML = '<i class="fas fa-share"></i>';
      
      // Show share modal with the URL
      if (shareUrl) {
        showShareModal(shareUrl, title);
      } else {
        alert('Sorry, there was an error creating the share link.');
      }
    });
  });
  
  // Function to show share modal
  function showShareModal(shareUrl, title) {
    let shareModal = document.getElementById('share-modal');
    
    if (!shareModal) {
      // Create the modal if it doesn't exist
      shareModal = document.createElement('div');
      shareModal.id = 'share-modal';
      shareModal.className = 'fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50';
      shareModal.innerHTML = `
        <div class="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-bold">Share Article</h3>
            <button id="close-share-modal" class="text-neutral-500 hover:text-neutral-800">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="mb-4">
            <input id="share-url" type="text" class="w-full px-3 py-2 border rounded-md" readonly>
          </div>
          <div class="flex flex-wrap justify-center gap-4 mb-4">
            <a href="#" id="share-facebook" class="share-social-btn bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
              <i class="fab fa-facebook-f mr-2"></i>Facebook
            </a>
            <a href="#" id="share-twitter" class="share-social-btn bg-blue-400 text-white px-4 py-2 rounded-md hover:bg-blue-500">
              <i class="fab fa-twitter mr-2"></i>Twitter
            </a>
            <a href="#" id="share-linkedin" class="share-social-btn bg-blue-700 text-white px-4 py-2 rounded-md hover:bg-blue-800">
              <i class="fab fa-linkedin-in mr-2"></i>LinkedIn
            </a>
            <a href="#" id="share-email" class="share-social-btn bg-neutral-600 text-white px-4 py-2 rounded-md hover:bg-neutral-700">
              <i class="fas fa-envelope mr-2"></i>Email
            </a>
          </div>
          <button id="copy-share-url" class="w-full bg-neutral-700 text-white px-4 py-2 rounded-md hover:bg-neutral-600">
            <i class="fas fa-copy mr-2"></i>Copy Link
          </button>
        </div>
      `;
      
      document.body.appendChild(shareModal);
    }
    
    // Configure the modal
    const shareUrlInput = document.getElementById('share-url');
    if (shareUrlInput) {
      shareUrlInput.value = shareUrl;
    }
    
    // Set up social sharing links
    setupSocialShareLinks(shareUrl, title);
    
    // Show the modal
    shareModal.classList.remove('hidden');
    
    // Set up copy button
    const copyButton = document.getElementById('copy-share-url');
    if (copyButton) {
      copyButton.addEventListener('click', function() {
        const shareUrlInput = document.getElementById('share-url');
        if (shareUrlInput) {
          shareUrlInput.select();
          document.execCommand('copy');
          this.innerHTML = '<i class="fas fa-check mr-2"></i>Copied!';
          setTimeout(() => {
            this.innerHTML = '<i class="fas fa-copy mr-2"></i>Copy Link';
          }, 2000);
        }
      });
    }
    
    // Set up close button
    const closeButton = document.getElementById('close-share-modal');
    if (closeButton) {
      closeButton.addEventListener('click', function() {
        shareModal.classList.add('hidden');
      });
    }
    
    // Close on background click
    shareModal.addEventListener('click', function(e) {
      if (e.target === this) {
        this.classList.add('hidden');
      }
    });
  }
  
  // Function to set up social sharing links
  function setupSocialShareLinks(shareUrl, title) {
    const facebookBtn = document.getElementById('share-facebook');
    if (facebookBtn) {
      facebookBtn.href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
      facebookBtn.target = '_blank';
      
      facebookBtn.addEventListener('click', function(e) {
        e.preventDefault();
        window.open(this.href, 'facebook-share-dialog', 'width=800,height=600');
      });
    }
    
    const twitterBtn = document.getElementById('share-twitter');
    if (twitterBtn) {
      twitterBtn.href = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(title + ' | TennesseeFeeds')}`;
      twitterBtn.target = '_blank';
      
      twitterBtn.addEventListener('click', function(e) {
        e.preventDefault();
        window.open(this.href, 'twitter-share-dialog', 'width=800,height=600');
      });
    }
    
    const linkedinBtn = document.getElementById('share-linkedin');
    if (linkedinBtn) {
      linkedinBtn.href = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
      linkedinBtn.target = '_blank';
      
      linkedinBtn.addEventListener('click', function(e) {
        e.preventDefault();
        window.open(this.href, 'linkedin-share-dialog', 'width=800,height=600');
      });
    }
    
    const emailBtn = document.getElementById('share-email');
    if (emailBtn) {
      emailBtn.href = `mailto:?subject=${encodeURIComponent(title + ' | TennesseeFeeds')}&body=${encodeURIComponent('Check out this article from TennesseeFeeds: ' + shareUrl)}`;
    }
  }
}

// Call this function when the document is ready
document.addEventListener('DOMContentLoaded', function() {
  setupShareButtons();
});
