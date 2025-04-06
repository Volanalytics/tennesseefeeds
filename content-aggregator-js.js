/**
 * TennesseeFeeds.com Content Aggregator
 * This script fetches news content from RSS feeds of Tennessee news sources
 * and displays them on the website.
 */

// Array of Tennessee news sources with RSS feeds
const tennesseeSources = [
  {
    name: "The Tennessean",
    url: "https://www.tennessean.com/rss/",
    region: "Nashville",
    category: "general"
  },
  {
    name: "Knoxville News Sentinel",
    url: "https://www.knoxnews.com/rss/",
    region: "Knoxville",
    category: "general"
  },
  {
    name: "Commercial Appeal",
    url: "https://www.commercialappeal.com/rss/",
    region: "Memphis",
    category: "general"
  },
  {
    name: "Chattanooga Times Free Press",
    url: "https://www.timesfreepress.com/rss/headlines/",
    region: "Chattanooga",
    category: "general"
  },
  {
    name: "WKRN News 2",
    url: "https://www.wkrn.com/feed/",
    region: "Nashville",
    category: "general"
  }
];

/**
 * Fetches and parses RSS feeds
 * Note: Due to CORS restrictions, this needs to be run through a proxy in production
 * For GitHub Pages deployment, you might need a serverless function or similar service
 */
async function fetchRSSFeed(url, sourceName) {
  try {
    // In a real implementation, you would use a CORS proxy or backend service
    // For demo purposes, we'll use a public CORS proxy (not recommended for production)
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    
    const response = await fetch(proxyUrl);
    const text = await response.text();
    
    // Parse XML
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, "text/xml");
    
    // Extract items
    const items = xmlDoc.querySelectorAll("item");
    const articles = [];
    
    items.forEach(item => {
      const title = item.querySelector("title")?.textContent || "";
      const link = item.querySelector("link")?.textContent || "";
      const description = item.querySelector("description")?.textContent || "";
      const pubDate = item.querySelector("pubDate")?.textContent || "";
      
      // Format date
      const date = new Date(pubDate);
      const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
      
      // Get the first image from the description if available
      let image = "";
      const imgMatch = description.match(/<img[^>]+src="([^">]+)"/);
      if (imgMatch && imgMatch[1]) {
        image = imgMatch[1];
      }
      
      articles.push({
        title,
        link,
        description: cleanDescription(description),
        pubDate: formattedDate,
        source: sourceName,
        image
      });
    });
    
    return articles;
  } catch (error) {
    console.error(`Error fetching feed from ${sourceName}:`, error);
    return [];
  }
}

/**
 * Cleans HTML from description and limits length
 */
function cleanDescription(html) {
  // Remove HTML tags
  const text = html.replace(/<[^>]*>/g, "");
  
  // Limit to 200 characters
  return text.length > 200 ? text.substring(0, 200) + "..." : text;
}

/**
 * Renders articles to the DOM
 */
function renderArticles(articles, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  // Clear existing content
  container.innerHTML = "";
  
  articles.forEach(article => {
    const articleElement = document.createElement("div");
    articleElement.className = "news-item";
    
    let imageHtml = "";
    if (article.image) {
      imageHtml = `<div class="news-image"><img src="${article.image}" alt="${article.title}"></div>`;
    }
    
    articleElement.innerHTML = `
      <h3><a href="${article.link}" target="_blank">${article.title}</a></h3>
      <div class="source">Source: ${article.source} • ${timeAgo(new Date(article.pubDate))}</div>
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
    
    container.appendChild(articleElement);
  });
  
  // Initialize interaction listeners
  initializeInteractions();
}

/**
 * Calculate time ago from date
 */
function timeAgo(date) {
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
 * Initialize user interaction features
 */
function initializeInteractions() {
  // Like button functionality
  const likeButtons = document.querySelectorAll('.interactions button:first-child');
  likeButtons.forEach(button => {
    button.addEventListener('click', () => {
      const currentText = button.textContent;
      const currentCount = parseInt(currentText.match(/\d+/)[0]);
      button.innerHTML = `<span>👍</span> Like (${currentCount + 1})`;
    });
  });
  
  // Comment form functionality
  const commentForms = document.querySelectorAll('.comment-form');
  commentForms.forEach(form => {
    const input = form.querySelector('input');
    const button = form.querySelector('button');
    const commentsContainer = form.parentElement.querySelector('.comments');
    
    button.addEventListener('click', () => {
      if (input.value.trim() !== '') {
        const newComment = document.createElement('div');
        newComment.className = 'comment';
        
        // Get username from localStorage or generate a guest name
        const username = localStorage.getItem('username') || `Guest${Math.floor(Math.random() * 1000)}`;
        
        newComment.innerHTML = `
          <div class="user">${username}</div>
          <p>${input.value}</p>
        `;
        commentsContainer.prepend(newComment);
        input.value = '';
        
        // Save comment to localStorage (simple implementation)
        saveComment(username, input.value, window.location.href);
      }
    });
  });
}

/**
 * Save comment to localStorage (basic implementation)
 * For a production site, you would use a database or service
 */
function saveComment(username, comment, page) {
  const comments = JSON.parse(localStorage.getItem('comments') || '[]');
  
  comments.push({
    username,
    comment,
    page,
    timestamp: new Date().toISOString()
  });
  
  localStorage.setItem('comments', JSON.stringify(comments));
}

/**
 * Load comments from localStorage
 */
function loadComments() {
  const comments = JSON.parse(localStorage.getItem('comments') || '[]');
  const currentPage = window.location.href;
  
  const pageComments = comments.filter(comment => comment.page === currentPage);
  
  // TODO: Display comments in the appropriate containers
}

/**
 * Main function to fetch and display content
 */
async function loadContent() {
  try {
    // For demo purposes, we'll just load content from the first source
    // In a real implementation, you would fetch from all sources and categorize
    const source = tennesseeSources[0];
    const articles = await fetchRSSFeed(source.url, source.name);
    
    renderArticles(articles, 'news-feed');
    
    // Load comments from localStorage
    loadComments();
  } catch (error) {
    console.error('Error loading content:', error);
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Load initial content
  loadContent();
  
  // Initialize region filters
  const regionLinks = document.querySelectorAll('nav a');
  regionLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Remove active class from all links
      regionLinks.forEach(l => l.classList.remove('active'));
      
      // Add active class to clicked link
      link.classList.add('active');
      
      // TODO: Filter content by region
      const region = link.textContent;
      console.log(`Filtering content for region: ${region}`);
      
      // This would be replaced with actual filtering
      if (region === 'Home') {
        loadContent();
      } else {
        // Filter by selected region
        // Implementation would depend on your data structure
      }
    });
  });
});
