/**
 * TennesseeFeeds.com - User Experience Enhancements
 */

// State management
let state = {
  articles: [],
  displayedArticles: [],
  currentRegion: 'all',
  currentCategory: 'all',
  page: 1,
  articlesPerPage: 5,
  isLoading: false,
  hasMoreArticles: true
};

/**
 * Initialize UX enhancements
 */
function initUxEnhancements() {
  // Add loading indicator to the DOM
  addLoadingIndicator();
  
  // Add category filtering
  setupCategoryFilters();
  
  // Set up infinite scroll
  setupInfiniteScroll();
  
  // Add animations for smoother transitions
  addAnimations();
}

/**
 * Add loading indicator to the page
 */
function addLoadingIndicator() {
  const loadingIndicator = document.createElement('div');
  loadingIndicator.id = 'loading-indicator';
  loadingIndicator.innerHTML = `
    <div class="spinner"></div>
    <p>Loading Tennessee news...</p>
  `;
  
  document.querySelector('.news-feed').prepend(loadingIndicator);
  
  // Add the CSS for the loading indicator
  const style = document.createElement('style');
  style.textContent = `
    #loading-indicator {
      display: none;
      text-align: center;
      padding: 20px;
      margin-bottom: 20px;
    }
    
    .spinner {
      border: 4px solid rgba(0, 0, 0, 0.1);
      border-radius: 50%;
      border-top: 4px solid var(--primary);
      width: 40px;
      height: 40px;
      margin: 0 auto 10px auto;
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .news-item {
      opacity: 0;
      transform: translateY(20px);
      animation: fadeIn 0.5s forwards;
    }
    
    @keyframes fadeIn {
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    .news-item:nth-child(1) { animation-delay: 0.1s; }
    .news-item:nth-child(2) { animation-delay: 0.2s; }
    .news-item:nth-child(3) { animation-delay: 0.3s; }
    .news-item:nth-child(4) { animation-delay: 0.4s; }
    .news-item:nth-child(5) { animation-delay: 0.5s; }
  `;
  
  document.head.appendChild(style);
}

/**
 * Set up category filters
 */
function setupCategoryFilters() {
  // Categories for Tennessee content
  const categories = [
    'All',
    'Politics',
    'Sports',
    'Business',
    'Arts & Culture',
    'Food',
    'Education',
    'Health',
    'Crime'
  ];
  
  // Create category filters in the sidebar
  const sidebar = document.querySelector('.sidebar');
  const categorySection = document.createElement('div');
  categorySection.innerHTML = `
    <h3>Categories</h3>
    <div class="category-filters"></div>
  `;
  
  // Insert after tags but before ad space
  const tagsSection = sidebar.querySelector('.popular-tags').parentNode;
  sidebar.insertBefore(categorySection, tagsSection.nextSibling);
  
  // Add category buttons
  const categoryFilters = document.querySelector('.category-filters');
  categories.forEach(category => {
    const categoryBtn = document.createElement('span');
    categoryBtn.className = 'tag';
    categoryBtn.dataset.category = category.toLowerCase();
    categoryBtn.textContent = category;
    
    if (category.toLowerCase() === state.currentCategory) {
      categoryBtn.classList.add('active');
    }
    
    categoryBtn.addEventListener('click', () => {
      // Update active state
      document.querySelectorAll('.category-filters .tag').forEach(btn => {
        btn.classList.remove('active');
      });
      categoryBtn.classList.add('active');
      
      // Update state
      state.currentCategory = category.toLowerCase() === 'all' ? 'all' : category;
      state.page = 1;
      
      // Filter articles
      filterAndDisplayArticles();
    });
    
    categoryFilters.appendChild(categoryBtn);
  });
  
  // Add some styling
  const style = document.createElement('style');
  style.textContent = `
    .category-filters {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 2rem;
    }
    
    .tag.active {
      background-color: var(--primary);
      color: white;
    }
  `;
  
  document.head.appendChild(style);
}

/**
 * Set up infinite scroll
 */
function setupInfiniteScroll() {
  // Add scroll event listener
  window.addEventListener('scroll', () => {
    if (state.isLoading || !state.hasMoreArticles) return;
    
    // Check if user has scrolled to the bottom
    const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
    
    if (scrollTop + clientHeight >= scrollHeight - 300) {
      // Load more articles
      loadMoreArticles();
    }
  });
  
  // Add load more button as fallback
  const newsFeed = document.querySelector('.news-feed');
  const loadMoreBtn = document.createElement('button');
  loadMoreBtn.id = 'load-more-btn';
  loadMoreBtn.textContent = 'Load More Articles';
  loadMoreBtn.className = 'load-more-btn';
  
  loadMoreBtn.addEventListener('click', () => {
    loadMoreArticles();
  });
  
  newsFeed.appendChild(loadMoreBtn);
  
  // Add styling
  const style = document.createElement('style');
  style.textContent = `
    .load-more-btn {
      display: block;
      margin: 20px auto;
      padding: 10px 20px;
      background-color: var(--primary);
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      transition: background-color 0.3s;
    }
    
    .load-more-btn:hover {
      background-color: #0046b8;
    }
    
    .load-more-btn:disabled {
      background-color: #cccccc;
      cursor: not-allowed;
    }
  `;
  
  document.head.appendChild(style);
}

/**
 * Load more articles for infinite scroll
 */
function loadMoreArticles() {
  state.isLoading = true;
  state.page++;
  
  // Show loading indicator
  const loadMoreBtn = document.getElementById('load-more-btn');
  loadMoreBtn.disabled = true;
  loadMoreBtn.textContent = 'Loading...';
  
  // Simulate network delay for smoother UX
  setTimeout(() => {
    displayArticles();
    
    state.isLoading = false;
    loadMoreBtn.disabled = false;
    loadMoreBtn.textContent = 'Load More Articles';
    
    // Hide button if no more articles
    if (!state.hasMoreArticles) {
      loadMoreBtn.style.display = 'none';
    }
  }, 800);
}

/**
 * Filter articles based on current region and category
 */
function filterAndDisplayArticles() {
  // Filter articles based on region and category
  state.displayedArticles = state.articles.filter(article => {
    const regionMatch = state.currentRegion === 'all' || 
                        article.region.toLowerCase() === state.currentRegion.toLowerCase();
    
    const categoryMatch = state.currentCategory === 'all' || 
                          article.category.toLowerCase() === state.currentCategory.toLowerCase();
    
    return regionMatch && categoryMatch;
  });
  
  // Reset pagination
  state.page = 1;
  state.hasMoreArticles = true;
  
  // Display first page of articles
  displayArticles(true);
}

/**
 * Display articles based on current filters and pagination
 * @param {boolean} resetContent - Whether to reset the content area
 */
function displayArticles(resetContent = false) {
  const newsFeed = document.querySelector('.news-feed');
  const heading = newsFeed.querySelector('h2');
  
  // Reset content if needed
  if (resetContent) {
    newsFeed.innerHTML = '';
    newsFeed.appendChild(heading);
  }
  
  // Calculate slice of articles to display
  const startIndex = (state.page - 1) * state.articlesPerPage;
  const endIndex = startIndex + state.articlesPerPage;
  const articlesToDisplay = state.displayedArticles.slice(startIndex, endIndex);
  
  // Check if there are more articles
  state.hasMoreArticles = endIndex < state.displayedArticles.length;
  
  // Update load more button
  const loadMoreBtn = document.getElementById('load-more-btn');
  if (loadMoreBtn) {
    loadMoreBtn.style.display = state.hasMoreArticles ? 'block' : 'none';
  }
  
  // Display message if no articles
  if (articlesToDisplay.length === 0 && resetContent) {
    const noContent = document.createElement('p');
    noContent.className = 'no-content-message';
    noContent.textContent = `No articles found for the selected filters. Please try a different region or category.`;
    newsFeed.appendChild(noContent);
    return;
  }
  
  // Add articles to the DOM
  articlesToDisplay.forEach((article, index) => {
    const articleElement = document.createElement('div');
    articleElement.className = 'news-item';
    articleElement.style.animationDelay = `${index * 0.1}s`;
    
    let imageHtml = '';
    if (article.image) {
      imageHtml = `<div class="news-image"><img src="${article.image}" alt="${article.title}"></div>`;
    }
    
    articleElement.innerHTML = `
      <h3><a href="${article.link}" target="_blank">${article.title}</a></h3>
      <div class="source">Source: ${article.source} • ${article.pubDate}</div>
      ${imageHtml}
      <p>${article.description}</p>
      <div class="interactions">
        <button><span>👍</span> Like (0)</button>
        <button><span>💬</span> Comment (0)</button>
        <button><span>🔄</span> Share</button>
      </div>
      
      <div class="comment-section">
        <div class="comment-form">
          <input type="text" placeholder="Add a comment...">
          <button>Post</button>
        </div>
        <div class="comments"></div>
      </div>
    `;
    
    newsFeed.insertBefore(articleElement, loadMoreBtn);
  });
  
  // Initialize interactions for new articles
  initializeInteractions();
}

/**
 * Add animations for smoother transitions
 */
function addAnimations() {
  const style = document.createElement('style');
  style.textContent = `
    .news-item, .sidebar > * {
      transition: opacity 0.3s, transform 0.3s;
    }
    
    nav a {
      position: relative;
      overflow: hidden;
    }
    
    nav a::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      width: 0;
      height: 3px;
      background-color: var(--primary);
      transition: width 0.3s;
    }
    
    nav a:hover::after {
      width: 100%;
    }
    
    .news-item:hover {
      transform: translateY(-5px);
      box-shadow: 0 5px 15px rgba(0,0,0,0.1);
    }
    
    .comment-form button, .interactions button {
      transition: background-color 0.3s, transform 0.2s;
    }
    
    .comment-form button:active, .interactions button:active {
      transform: scale(0.95);
    }
  `;
  
  document.head.appendChild(style);
}

// Make functions available globally
window.uxEnhancements = {
  init: initUxEnhancements,
  setState: (newState) => {
    state = { ...state, ...newState };
  },
  getState: () => state,
  filterAndDisplay: filterAndDisplayArticles
};
