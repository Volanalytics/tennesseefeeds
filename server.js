const express = require('express');
const axios = require('axios');
const cors = require('cors');
const xml2js = require('xml2js');
const cheerio = require('cheerio');
const Parser = require('rss-parser');

const app = express();
const port = process.env.PORT || 3000;
const parser = new Parser();
const fs = require('fs');
const path = require('path');

// Enable CORS for your domain
app.use(cors({
  origin: ['https://tennesseefeeds.com', 'http://localhost:3000', 'http://127.0.0.1:5500']
}));

// List of Tennessee news sources
const tennesseeSources = [
  // Add these to your tennesseeSources array
{
  name: "WSMV Nashville",
  url: "https://www.wsmv.com/arcio/rss/",
  region: "Nashville",
  category: "News"
},
{
  name: "WTVF Nashville",
  url: "https://www.newschannel5.com/feed/",
  region: "Nashville",
  category: "News"
},
{
  name: "WATE Knoxville",
  url: "https://www.wate.com/feed/",
  region: "Knoxville",
  category: "News"
},
{
  name: "WBIR Knoxville",
  url: "https://www.wbir.com/feeds/rss/news/",
  region: "Knoxville",
  category: "News"
},
{
  name: "WREG Memphis",
  url: "https://wreg.com/feed/",
  region: "Memphis",
  category: "News"
},
{
  name: "WMC Memphis",
  url: "https://www.actionnews5.com/rss/",
  region: "Memphis",
  category: "News"
},
{
  name: "WTVC Chattanooga",
  url: "https://newschannel9.com/feed/",
  region: "Chattanooga",
  category: "News"
},
{
  name: "Chattanooga Times Free Press",
  url: "https://www.timesfreepress.com/rss/headlines/",
  region: "Chattanooga",
  category: "News"
},
{
  name: "WJHL Tri-Cities",
  url: "https://www.wjhl.com/feed/",
  region: "Tri-Cities",
  category: "News"
},
{
  name: "WBBJ Jackson",
  url: "https://www.wbbjtv.com/feed/",
  region: "Jackson",
  category: "News"
},
{
  name: "The Tennessean",
  url: "https://www.tennessean.com/rss/",
  region: "Nashville",
  category: "General"
},
{
  name: "Knoxville News Sentinel",
  url: "https://www.knoxnews.com/rss/",
  region: "Knoxville",
  category: "General"
},
{
  name: "Commercial Appeal",
  url: "https://www.commercialappeal.com/rss/",
  region: "Memphis",
  category: "General"
},
{
  name: "Nashville Scene",
  url: "https://www.nashvillescene.com/api/feed/",
  region: "Nashville",
  category: "Entertainment"
},
{
  name: "Nashville Post",
  url: "https://www.nashvillepost.com/search/?f=rss",
  region: "Nashville",
  category: "Business"
},
{
  name: "Memphis Business Journal",
  url: "https://www.bizjournals.com/memphis/news/rss.xml",
  region: "Memphis",
  category: "Business"
},
{
  name: "Nashville Business Journal",
  url: "https://www.bizjournals.com/nashville/news/rss.xml",
  region: "Nashville",
  category: "Business"
},
{
  name: "MTSU Sidelines",
  url: "https://mtsusidelines.com/feed/",
  region: "Nashville",
  category: "Education"
},
{
  name: "TN Capitol Hill",
  url: "https://www.wkrn.com/category/news/capitol-hill/feed/",
  region: "Nashville",
  category: "Politics"
},
{
  name: "Tennessee Star",
  url: "https://tennesseestar.com/feed/",
  region: "Nashville",
  category: "News"
},
{
  name: "Memphis Flyer",
  url: "https://www.memphisflyer.com/feed",
  region: "Memphis",
  category: "Entertainment"
},
{
  name: "Tennessee Lookout",
  url: "https://tennesseelookout.com/feed/",
  region: "Nashville",
  category: "Politics"
}
];

// Clean HTML and limit text length
function cleanDescription(html, maxLength = 200) {
  if (!html) return '';
  
  // Remove HTML tags
  const text = html.replace(/<[^>]*>/g, "").trim();
  
  // Limit length and add ellipsis if needed
  return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
}

// Extract image from content
function extractImage(content) {
  if (!content) return null;
  
  try {
    const $ = cheerio.load(content);
    const img = $('img').first();
    
    if (img && img.attr('src')) {
      return img.attr('src');
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting image:', error);
    return null;
  }
}

// Create data directory if it doesn't exist
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}


// Fetch and parse RSS feed
async function fetchRssFeed(source) {
  try {
    const response = await axios.get(source.url, {
      headers: {
        'User-Agent': 'TennesseeFeeds/1.0 (https://tennesseefeeds.com)'
      },
      timeout: 10000
    });
    
    // Parse the RSS feed
    let feed;
    try {
      feed = await parser.parseString(response.data);
    } catch (parseError) {
      // If rss-parser fails, try xml2js
      const result = await xml2js.parseStringPromise(response.data);
      feed = {
        items: result.rss?.channel[0]?.item?.map(item => ({
          title: item.title?.[0],
          link: item.link?.[0],
          content: item.description?.[0],
          isoDate: item.pubDate?.[0]
        })) || []
      };
    }
    
    // Process the feed items
    return feed.items.map(item => {
      const image = extractImage(item.content || item['content:encoded']);
      
      return {
        title: item.title,
        link: item.link,
        description: cleanDescription(item.content || item['content:encoded'] || item.description),
        pubDate: item.isoDate ? new Date(item.isoDate).toISOString() : new Date().toISOString(),
        source: source.name,
        region: source.region,
        category: determineCategory(item.title, item.content, source.category),
        image: image
      };
    });
  } catch (error) {
    console.error(`Error fetching feed from ${source.name}:`, error.message);
    return [];
  }
}

// Determine article category based on title and content
function determineCategory(title, content, defaultCategory) {
  const titleContent = (title + ' ' + (content || '')).toLowerCase();
  
  const categoryKeywords = {
    'Politics': ['governor', 'senator', 'legislature', 'vote', 'election', 'bill', 'law', 'political'],
    'Sports': ['football', 'basketball', 'titans', 'grizzlies', 'volunteers', 'vols', 'championship', 'tournament', 'playoff', 'coach'],
    'Business': ['business', 'economy', 'job', 'market', 'company', 'investment', 'stock', 'startup', 'entrepreneur'],
    'Arts & Culture': ['music', 'concert', 'festival', 'theater', 'art', 'museum', 'culture', 'entertainment', 'performance'],
    'Food': ['restaurant', 'food', 'dining', 'cuisine', 'chef', 'barbecue', 'bbq', 'cafe'],
    'Development': ['construction', 'development', 'project', 'building', 'expansion', 'infrastructure', 'property', 'real estate']
  };
  
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    for (const keyword of keywords) {
      if (titleContent.includes(keyword)) {
        return category;
      }
    }
  }
  
  return defaultCategory;
}

// API endpoint for all feeds
app.get('/api/feeds', async (req, res) => {
  try {
    // Fetch all feeds concurrently
    const feedPromises = tennesseeSources.map(source => fetchRssFeed(source));
    
    // Wait for all feeds to be fetched
    const results = await Promise.allSettled(feedPromises);
    
    // Combine all articles
    let allArticles = [];
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        allArticles = [...allArticles, ...result.value];
      } else {
        console.error(`Failed to fetch ${tennesseeSources[index].name}: ${result.reason}`);
      }
    });
    
    // Sort by date (newest first)
    allArticles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    
    // Return with appropriate cache headers
    res.set('Cache-Control', 'public, max-age=600'); // Cache for 10 minutes
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      count: allArticles.length,
      articles: allArticles
    });
  } catch (error) {
    console.error('Error fetching feeds:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API endpoint for specific source
app.get('/api/feeds/:source', async (req, res) => {
  try {
    const sourceId = req.params.source.toLowerCase();
    const source = tennesseeSources.find(s => s.name.toLowerCase().replace(/\s+/g, '-') === sourceId);
    
    if (!source) {
      return res.status(404).json({
        success: false,
        error: 'Source not found'
      });
    }
    
    const articles = await fetchRssFeed(source);
    
    res.set('Cache-Control', 'public, max-age=600'); // Cache for 10 minutes
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      source: source.name,
      count: articles.length,
      articles: articles
    });
  } catch (error) {
    console.error('Error fetching source:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API endpoint for health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});
// Initialize comments file if it doesn't exist
const commentsFile = path.join(dataDir, 'comments.json');
if (!fs.existsSync(commentsFile)) {
  fs.writeFileSync(commentsFile, JSON.stringify([]));
}

// Comments API endpoints
app.get('/api/comments/:articleId', (req, res) => {
  try {
    const articleId = req.params.articleId;
    const comments = JSON.parse(fs.readFileSync(commentsFile, 'utf8'));
    
    const articleComments = comments.filter(comment => comment.articleId === articleId);
    
    res.json({
      success: true,
      comments: articleComments
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch comments'
    });
  }
});

app.post('/api/comments', express.json(), (req, res) => {
  try {
    const { articleId, articleTitle, userName, userEmail, comment } = req.body;
    
    // Validate required fields
    if (!articleId || !userName || !comment) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }
    
    // Load existing comments
    const comments = JSON.parse(fs.readFileSync(commentsFile, 'utf8'));
    
    // Add new comment
    const newComment = {
      id: Date.now().toString(),
      articleId,
      articleTitle,
      userName,
      userEmail,
      comment,
      timestamp: new Date().toISOString(),
      likes: 0
    };
    
    comments.push(newComment);
    
    // Save updated comments
    fs.writeFileSync(commentsFile, JSON.stringify(comments, null, 2));
    
    res.json({
      success: true,
      comment: newComment
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add comment'
    });
  }
});

// Add like to comment
app.post('/api/comments/:commentId/like', (req, res) => {
  try {
    const commentId = req.params.commentId;
    
    // Load existing comments
    const comments = JSON.parse(fs.readFileSync(commentsFile, 'utf8'));
    
    // Find and update the comment
    const commentIndex = comments.findIndex(c => c.id === commentId);
    
    if (commentIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Comment not found'
      });
    }
    
    comments[commentIndex].likes += 1;
    
    // Save updated comments
    fs.writeFileSync(commentsFile, JSON.stringify(comments, null, 2));
    
    res.json({
      success: true,
      likes: comments[commentIndex].likes
    });
  } catch (error) {
    console.error('Error liking comment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to like comment'
    });
  }

// Start the server
app.listen(port, () => {
  console.log(`TennesseeFeeds API server running on port ${port}`);
});
