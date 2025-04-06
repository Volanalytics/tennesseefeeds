/**
 * TennesseeFeeds.com - Frontend API Integration
 * This script connects to the backend API to fetch news content
 */

// Configuration
const API_URL = 'https://tennesseefeeds-api.onrender.com'; // Replace with your actual API URL
const FALLBACK_CONTENT = true; // Use fallback content if API fails
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes in milliseconds

// User info stored in localStorage
let userInfo = {
  name: localStorage.getItem('userName') || '',
  email: localStorage.getItem('userEmail') || ''
};


// State management
let state = {
  articles: [],
  displayedArticles: [],
  currentRegion: 'all',
  currentCategory: 'all',
  page: 1,
  articlesPerPage: 5,
  isLoading: false,
  hasMoreArticles: true,
  lastFetched: null,
  apiError: false
};

/**
 * Format date as time ago
 * @param {string} dateString - ISO date string
 * @returns {string} - Formatted time ago
 */
function timeAgo(dateString) {
  const date = new Date(dateString);
  const seconds = Math.floor((new Date() - date) / 1000);
  
  let interval = Math.floor(seconds / 31536000);
  if (interval > 1) return interval + " years ago";
  if (interval === 1) return "1 year ago";
  
  interval = Math.floor(seconds / 2592000);
  if (interval > 1) return interval + " months ago";
  if (interval === 1) return "1 month ago";
  
  interval = Math.floor(seconds / 86400);
  if (interval > 1) return interval + " days ago";
  if (interval === 1) return "1 day ago";
  
  interval = Math.floor(seconds / 3600);
  if (interval > 1) return interval + " hours ago";
  if (interval === 1) return "1 hour ago";
  
  interval = Math.floor(seconds / 60);
  if (interval > 1) return interval + " minutes ago";
  if (interval === 1) return "1 minute ago";
  
  return Math.floor(seconds) + " seconds ago";
}

/**
 * Fetch articles from the API
 * @returns {Promise<Array>} Array of article objects
 */
async function fetchArticles() {
  try {
    // Show loading state
    showLoading(true);
    console.log('Fetching articles from API...');
    
    // Check if we should use cached data
    if (state.lastFetched && (new Date() - state.lastFetched < CACHE_DURATION) && state.articles.length > 0) {
      console.log('Using cached articles');
      showLoading(false);
      return state.articles;
    }
    
    // Fetch from API
    const response = await fetch(`${API_URL}/feeds`);
    
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.success || !data.articles || !Array.isArray(data.articles)) {
      throw new Error('Invalid data format from API');
    }
    
    console.log(`Successfully fetched ${data.articles.length} articles`);
    
    // Format dates as time ago and clean up data
    const articles = data.articles.map(article => ({
      ...article,
      formattedDate: timeAgo(article.pubDate)
    }));
    
    // Update state
    state.lastFetched = new Date();
    state.apiError = false;
    
    showLoading(false);
    return articles;
  } catch (error) {
    console.error('Error fetching articles:', error);
    state.apiError = true;
    showLoading(false);
    
    if (FALLBACK_CONTENT) {
      console.log('Using fallback content');
      return getSampleArticles();
    }
    
    return [];
  }
}

/**
 * Get sample articles as fallback
 * @returns {Array} Array of sample article objects
 */
function getSampleArticles() {
  return [
    {
      title: "Nashville's Music Row Historic Preservation Project Receives $3M Grant",
      link: "#article1",
      description: "The Music Row Preservation Foundation announced today that it has received a major grant to help preserve historic music studios in the district.",
      source: "Nashville Public Radio",
      pubDate: new Date().toISOString(),
      formattedDate: "4 hours ago",
      region: "Nashville",
      category: "Arts & Culture",
      image: ""
    },
    {
      title: "Tennessee Volunteers Add Five-Star Quarterback to 2026 Recruiting Class",
      link: "#article2",
      description: "The University of Tennessee football program received a major commitment from one of the nation's top-rated quarterback prospects for the 2026 recruiting class.",
      source: "Knoxville News Sentinel",
      pubDate: new Date().toISOString(),
      formattedDate: "6 hours ago",
      region: "Knoxville",
      category: "Sports",
      image: ""
    },
    {
      title: "New Memphis BBQ Trail Map Features 22 Essential Restaurants",
      link: "#article3",
      description: "The Memphis Tourism Board has released its 2025 BBQ Trail map featuring 22 must-visit BBQ joints across the city and surrounding areas.",
      source: "Memphis Commercial Appeal",
      pubDate: new Date().toISOString(),
      formattedDate: "8 hours ago",
      region: "Memphis",
      category: "Food",
      image: ""
    },
    {
      title: "Chattanooga's Riverwalk Extension Project Enters Final Phase",
      link: "#article4",
      description: "The final phase of Chattanooga's ambitious Riverwalk extension project begins next month, promising to add 3.5 miles of scenic paths along the Tennessee River.",
      source: "Chattanooga Times Free Press",
      pubDate: new Date().toISOString(),
      formattedDate: "10 hours ago",
      region: "Chattanooga",
      category: "Development",
      image: ""
    },
    {
      title: "Governor Signs New Education Funding Bill for Tennessee Schools",
      link: "#article5",
      description: "Tennessee's governor signed a new education funding bill today that will increase per-pupil spending and provide additional resources for rural schools.",
      source: "Tennessee State News",
      pubDate: new Date().toISOString(),
      formattedDate: "12 hours ago",
      region: "Nashville",
      category: "Politics",
      image: ""
    }
  ];
}

/**
 * Show or hide loading indicator
 * @param {boolean} isLoading - Whether loading is in progress
 */
function showLoading(isLoading) {
  const loadingIndicator = document.getElementById('loading-indicator');
  if (loadingIndicator) {
    loadingIndicator.style.display = isLoading ? 'block' : 'none';
  }
  state.isLoading = isLoading;
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
  const contentArea = document.getElementById('content-area');
  
  if (!contentArea) {
    console.error('Content area not found');
    return;
  }
  
  // Reset content if needed
  if (resetContent) {
    contentArea.innerHTML = '';
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
    contentArea.appendChild(noContent);
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
      <div class="source">Source: ${article.source} • ${article.formattedDate || timeAgo(article.pubDate)}</div>
      ${imageHtml}
      <p>${article.description}</p>
      <div class="interactions">
        <button class="like-btn"><span>👍</span> Like (0)</button>
        <button class="comment-btn"><span>💬</span> Comment (0)</button>
        <button class="share-btn"><span>🔄</span> Share</button>
      </div>
      
      <div class="comment-section">
        <div class="comment-form">
          <input type="text" placeholder="Add a comment...">
          <button>Post</button>
        </div>
        <div class="comments"></div>
      </div>
    `;
    
    contentArea.appendChild(articleElement);
  });
  
  // Initialize interactions for new articles
  initializeInteractions();
}

/**
 * Load more articles
 */
function loadMoreArticles() {
  if (state.isLoading) return;
  
  state.isLoading = true;
  state.page++;
  
  // Show loading status
  const loadMoreBtn = document.getElementById('load-more-btn');
  if (loadMoreBtn) {
    loadMoreBtn.disabled = true;
    loadMoreBtn.textContent = 'Loading...';
  }
  
  // Simulate network delay for smoother UX
  setTimeout(() => {
    displayArticles();
    
    state.isLoading = false;
    
    if (loadMoreBtn) {
      loadMoreBtn.disabled = false;
      loadMoreBtn.textContent = 'Load More Articles';
      
      // Hide button if no more articles
      if (!state.hasMoreArticles) {
        loadMoreBtn.style.display = 'none';
      }
    }
  }, 500);
}

/**
 * Initialize article interactions
 */
function initializeInteractions() {
  // Like button functionality
  const likeButtons = document.querySelectorAll('.like-btn');
  likeButtons.forEach(button => {
    if (button.hasListenerAttached) return;
    button.hasListenerAttached = true;
    
    button.addEventListener('click', function() {
      const currentText = this.textContent;
      const currentCount = parseInt(currentText.match(/\d+/)[0]);
      this.innerHTML = `<span>👍</span> Like (${currentCount + 1})`;
    });
  });
  
  // Comment form functionality
  const commentForms = document.querySelectorAll('.comment-form');
  commentForms.forEach(form => {
    if (form.hasListenerAttached) return;
    form.hasListenerAttached = true;
    
    const input = form.querySelector('input');
    const button = form.querySelector('button');
    const commentsContainer = form.parentElement.querySelector('.comments');
    
    button.addEventListener('click', function() {
      if (input.value.trim() !== '') {
        const newComment = document.createElement('div');
        newComment.className = 'comment';
        newComment.innerHTML = `
          <div class="user">Guest${Math.floor(Math.random() * 1000)}</div>
          <p>${input.value}</p>
        `;
        commentsContainer.prepend(newComment);
        input.value = '';
      }
    });
  });
  
  // Share button functionality
  const shareButtons = document.querySelectorAll('.share-btn');
  shareButtons.forEach(button => {
    if (button.hasListenerAttached) return;
    button.hasListenerAttached = true;
    
    button.addEventListener('click', function() {
      const article = this.closest('.news-item');
      const title = article.querySelector('h3').textContent;
      const link = article.querySelector('h3 a').getAttribute('href');
      
      // Check if Web Share API is available
      if (navigator.share) {
        navigator.share({
          title: title,
          url: link
        })
        .catch(err => {
          console.error('Share failed:', err);
          fallbackShare(this, title, link);
        });
      } else {
        fallbackShare(this, title, link);
      }
    });
  });
}

/**
 * Fallback share function for browsers without Web Share API
 */
function fallbackShare(button, title, link) {
  // Create a temporary input to copy the URL
  const tempInput = document.createElement('input');
  tempInput.value = `${title} - ${link}`;
  document.body.appendChild(tempInput);
  tempInput.select();
  document.execCommand('copy');
  document.body.removeChild(tempInput);
  
  // Show feedback
  const originalText = button.innerHTML;
  button.innerHTML = '<span>✓</span> Copied!';
  setTimeout(() => {
    button.innerHTML = originalText;
  }, 2000);
}

/**
 * Initialize the application
 */
async function initApp() {
  try {
    // Set up UI elements
    setupUI();
    
    // Fetch articles
    const articles = await fetchArticles();
    state.articles = articles;
    state.displayedArticles = articles;
    
    // Display articles
    filterAndDisplayArticles();
  } catch (error) {
    console.error('Error initializing app:', error);
    showError('Failed to initialize the application. Please try again later.');
  }
}

/**
 * Set up UI elements and event listeners
 */
function setupUI() {
  // Set up navigation links
  const navLinks = document.querySelectorAll('nav a');
  navLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      
      // Update active link
      navLinks.forEach(l => l.classList.remove('active'));
      this.classList.add('active');
      
      // Get region from link text
      const region = this.textContent.trim().toLowerCase();
      state.currentRegion = region === 'all tennessee' ? 'all' : region;
      
      // Filter and display articles
      filterAndDisplayArticles();
    });
  });
  
  // Set up category filters
  const categoryFilters = document.querySelectorAll('.category-filters .tag');
  categoryFilters.forEach(filter => {
    filter.addEventListener('click', function() {
      // Update active filter
      categoryFilters.forEach(f => f.classList.remove('active'));
      this.classList.add('active');
      
      // Get category from data attribute
      state.currentCategory = this.dataset.category;
      
      // Filter and display articles
      filterAndDisplayArticles();
    });
  });
  
  // Set up load more button
  const loadMoreBtn = document.getElementById('load-more-btn');
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', loadMoreArticles);
  }
  
  // Set up refresh button if it exists
  const refreshBtn = document.getElementById('refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async function() {
      state.lastFetched = null; // Force refresh
      const articles = await fetchArticles();
      state.articles = articles;
      state.displayedArticles = articles;
      filterAndDisplayArticles();
    });
  }
}
// Initialize comments UI
function initializeComments(articleId, articleTitle) {
  const commentSection = document.createElement('div');
  commentSection.className = 'comments-section';
  commentSection.innerHTML = `
    <h3>Comments</h3>
    <div class="user-info-form" ${userInfo.name ? 'style="display: none;"' : ''}>
      <input type="text" id="user-name" placeholder="Your Name" value="${userInfo.name}">
      <input type="email" id="user-email" placeholder="Your Email (optional)" value="${userInfo.email}">
      <button id="save-user-info">Save</button>
    </div>
    <div class="comment-form" ${!userInfo.name ? 'style="display: none;"' : ''}>
      <p>Commenting as: <span class="user-name">${userInfo.name}</span> <button id="change-user">Change</button></p>
      <textarea id="comment-text" placeholder="Add your comment..."></textarea>
      <button id="post-comment">Post Comment</button>
    </div>
    <div class="comments-list">
      <p>Loading comments...</p>
    </div>
  `;
  
  // Return the element to be added to the DOM
  return commentSection;
}

// Load comments for an article
async function loadComments(articleId) {
  try {
    const commentsListElement = document.querySelector('.comments-list');
    commentsListElement.innerHTML = '<p>Loading comments...</p>';
    
    const response = await fetch(`${API_URL}/comments/${articleId}`);
    
    if (!response.ok) {
      throw new Error('Failed to load comments');
    }
    
    const data = await response.json();
    
    if (!data.success || !data.comments) {
      commentsListElement.innerHTML = '<p>No comments yet. Be the first to comment!</p>';
      return;
    }
    
    if (data.comments.length === 0) {
      commentsListElement.innerHTML = '<p>No comments yet. Be the first to comment!</p>';
      return;
    }
    
    // Sort comments (newest first)
    data.comments.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Display comments
    commentsListElement.innerHTML = '';
    data.comments.forEach(comment => {
      const commentElement = document.createElement('div');
      commentElement.className = 'comment';
      commentElement.innerHTML = `
        <div class="comment-header">
          <span class="comment-author">${comment.userName}</span>
          <span class="comment-time">${timeAgo(comment.timestamp)}</span>
        </div>
        <div class="comment-content">${comment.comment}</div>
        <div class="comment-actions">
          <button class="like-comment" data-id="${comment.id}">👍 ${comment.likes}</button>
        </div>
      `;
      commentsListElement.appendChild(commentElement);
    });
    
    // Add like button event listeners
    document.querySelectorAll('.like-comment').forEach(button => {
      button.addEventListener('click', async function() {
        const commentId = this.dataset.id;
        try {
          const response = await fetch(`${API_URL}/comments/${commentId}/like`, {
            method: 'POST'
          });
          
          if (!response.ok) {
            throw new Error('Failed to like comment');
          }
          
          const data = await response.json();
          if (data.success) {
            this.textContent = `👍 ${data.likes}`;
          }
        } catch (error) {
          console.error('Error liking comment:', error);
        }
      });
    });
  } catch (error) {
    console.error('Error loading comments:', error);
    const commentsListElement = document.querySelector('.comments-list');
    commentsListElement.innerHTML = '<p>Error loading comments. Please try again later.</p>';
  }
}

// Handle comment form submission
function setupCommentFormHandlers(articleId, articleTitle) {
  // Save user info
  document.getElementById('save-user-info').addEventListener('click', () => {
    const nameInput = document.getElementById('user-name');
    const emailInput = document.getElementById('user-email');
    
    if (!nameInput.value.trim()) {
      alert('Please enter your name');
      return;
    }
    
    userInfo.name = nameInput.value.trim();
    userInfo.email = emailInput.value.trim();
    
    localStorage.setItem('userName', userInfo.name);
    localStorage.setItem('userEmail', userInfo.email);
    
    document.querySelector('.user-info-form').style.display = 'none';
    document.querySelector('.comment-form').style.display = 'block';
    document.querySelector('.user-name').textContent = userInfo.name;
  });
  
  // Change user info
  document.getElementById('change-user').addEventListener('click', () => {
    document.querySelector('.user-info-form').style.display = 'block';
    document.querySelector('.comment-form').style.display = 'none';
  });
  
  // Post comment
  document.getElementById('post-comment').addEventListener('click', async () => {
    const commentText = document.getElementById('comment-text').value.trim();
    
    if (!commentText) {
      alert('Please enter a comment');
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          articleId,
          articleTitle,
          userName: userInfo.name,
          userEmail: userInfo.email,
          comment: commentText
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to post comment');
      }
      
      const data = await response.json();
      
      if (data.success) {
        document.getElementById('comment-text').value = '';
        loadComments(articleId); // Reload comments
      }
    } catch (error) {
      console.error('Error posting comment:', error);
      alert('Failed to post comment. Please try again later.');
    }
  });
}





/**
 * Show error message
 * @param {string} message - Error message to display
 */
function showError(message) {
  const contentArea = document.getElementById('content-area');
  if (!contentArea) return;
  
  const errorElement = document.createElement('div');
  errorElement.className = 'error-message';
  errorElement.innerHTML = `
    <p>${message}</p>
    <button id="retry-btn">Retry</button>
  `;
  
  contentArea.innerHTML = '';
  contentArea.appendChild(errorElement);
  
  // Add retry button listener
  const retryBtn = document.getElementById('retry-btn');
  if (retryBtn) {
    retryBtn.addEventListener('click', initApp);
  }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);
