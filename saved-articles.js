// saved-articles.js - Add pinned articles functionality

/**
 * Get saved article IDs from localStorage
 * @returns {Array} Array of saved article IDs
 */
function getSavedArticleIds() {
  const savedJson = localStorage.getItem('tnfeeds_saved_articles');
  return savedJson ? JSON.parse(savedJson) : [];
}

/**
 * Check if an article is saved
 * @param {string} articleId - ID of the article
 * @returns {boolean} True if article is saved
 */
function isSaved(articleId) {
  const saved = getSavedArticleIds();
  return saved.includes(articleId);
}

/**
 * Toggle saved state for an article
 * @param {string} articleId - ID of the article
 * @param {string} title - Title of the article
 * @param {string} link - Link to the article
 * @param {string} source - Source of the article
 */
function toggleSaved(articleId, title, link, source) {
  const saved = getSavedArticleIds();
  const index = saved.indexOf(articleId);
  
  if (index !== -1) {
    // If already saved, remove it
    saved.splice(index, 1);
  } else {
    // Otherwise add it
    saved.push(articleId);
  }
  
  // Save to localStorage
  localStorage.setItem('tnfeeds_saved_articles', JSON.stringify(saved));
  
  // Update the UI
  updatePinnedArticles();
  updateSaveButtonStates();
}

/**
 * Update the pinned saved articles section
 */
function updatePinnedArticles() {
  // Get saved article IDs
  const savedArticles = getSavedArticleIds();
  
  // Get or create the pinned articles container
  let pinnedContainer = document.getElementById('pinned-articles');
  
  // First, check if we need to do anything
  if (savedArticles.length === 0) {
    // If no saved articles and container exists, remove it
    if (pinnedContainer) {
      pinnedContainer.remove();
    }
    
    // Also remove the section title if it exists
    const sectionTitle = document.getElementById('regular-articles-title');
    if (sectionTitle) {
      sectionTitle.remove();
    }
    
    return;
  }
  
  // If pinned container doesn't exist, create it
  if (!pinnedContainer) {
    // Create the container
    pinnedContainer = document.createElement('div');
    pinnedContainer.id = 'pinned-articles';
    pinnedContainer.className = 'col-span-full mb-8';
    
    // Add a header
    const header = document.createElement('div');
    header.className = 'flex justify-between items-center mb-4 p-2 bg-blue-50 rounded-lg border border-blue-200';
    header.innerHTML = `
      <h3 class="text-lg font-semibold text-blue-800">
        <i class="fas fa-bookmark mr-2"></i>Saved Articles
      </h3>
      <span class="text-sm text-blue-600">${savedArticles.length} saved</span>
    `;
    
    pinnedContainer.appendChild(header);
    
    // Create the grid container for the article cards
    const grid = document.createElement('div');
    grid.className = 'grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-4';
    grid.id = 'pinned-articles-grid';
    pinnedContainer.appendChild(grid);
    
    // Insert at the top of the content area
    const contentArea = document.getElementById('content-area');
    contentArea.insertBefore(pinnedContainer, contentArea.firstChild);
  } else {
    // Update the count in the header
    const countElement = pinnedContainer.querySelector('span');
    if (countElement) {
      countElement.textContent = `${savedArticles.length} saved`;
    }
  }
  
  // Get the grid container
  const pinnedGrid = document.getElementById('pinned-articles-grid');
  
  // Clear existing pinned articles
  pinnedGrid.innerHTML = '';
  
  // For each saved article, clone its card and add to the pinned section
  savedArticles.forEach(articleId => {
    // Find the original article card
    const originalArticleElement = document.querySelector(`[data-article-id="${articleId}"]`);
    
    if (originalArticleElement) {
      // Find the parent article card element
      const originalCard = originalArticleElement.closest('.bg-white');
      
      if (originalCard) {
        // Clone the article's card
        const card = originalCard.cloneNode(true);
        
        // Wrap in article card container if needed
        const cardContainer = document.createElement('div');
        cardContainer.className = 'article-card relative';
        cardContainer.appendChild(card);
        
        // Add a "remove from saved" button
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-save
