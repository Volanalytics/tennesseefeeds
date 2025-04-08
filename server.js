require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
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
const supabaseUrl = 'https://ulhbtjppfoctdghimkmu.supabase.co';  // Get this from Settings > API
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsaGJ0anBwZm9jdGRnaGlta211Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQwMzE5MzAsImV4cCI6MjA1OTYwNzkzMH0.LLIBpZkoiHWTOHzNfho2KALWdRMkNYSXF-AWD9Wyoa0';
const supabase = createClient(supabaseUrl, supabaseKey);

// Enable CORS for your domain with improved settings
app.use(cors({
  origin: ['https://tennesseefeeds.com', 'http://localhost:3000', 'http://127.0.0.1:5500'],
  credentials: true // Add this to allow credentials
}));

// Add this to handle OPTIONS requests (for CORS preflight)
app.options('*', cors());

// Enable JSON parsing for request bodies
app.use(express.json());

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
// const commentsFile = path.join(dataDir, 'comments.json');
// if (!fs.existsSync(commentsFile)) {
 // fs.writeFileSync(commentsFile, JSON.stringify([]));
// }

// Comments API endpoints
app.get('/api/comments/:articleId', async (req, res) => {
  try {
    const articleId = req.params.articleId;

    // First, find the article in the database
    const { data: article, error: articleError } = await supabase
      .from('articles')
      .select('id')
      .eq('article_id', articleId)
      .single();

    if (articleError || !article) {
      return res.json({
        success: true,
        comments: []
      });
    }

    // Then fetch comments for this article
    const { data: comments, error } = await supabase
      .from('comments')
      .select('*')
      .eq('article_id', article.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching comments:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch comments'
      });
    }

    res.json({
      success: true,
      comments: comments.map(comment => ({
        id: comment.id,
        userName: comment.username,
        comment: comment.content,
        timestamp: comment.created_at
      }))
    });
  } catch (error) {
    console.error('Unexpected error in comments endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch comments'
    });
  }
});

app.post('/api/comments', express.json(), async (req, res) => {
    console.log('Received comment request:', req.body); // Log incoming request
  try {
    const { articleId, articleTitle, userName, comment } = req.body;
    
    // Validate required fields
    if (!articleId || !userName || !comment) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // First, find or create the article
    let { data: article, error: articleError } = await supabase
      .from('articles')
      .select('id')
      .eq('article_id', articleId)
      .single();

    if (articleError && articleError.code !== 'PGRST116') {
      console.error('Error finding article:', articleError);
      return res.status(500).json({
        success: false,
        error: 'Failed to process comment'
      });
    }

    // If article doesn't exist, create it
    if (!article) {
      const { data: newArticle, error: insertError } = await supabase
        .from('articles')
        .insert({
          article_id: articleId,
          title: articleTitle || 'Untitled Article'
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating article:', insertError);
        return res.status(500).json({
          success: false,
          error: 'Failed to process comment'
        });
      }

      article = newArticle;
    }

    // Insert the comment
    const { data: newComment, error: commentError } = await supabase
      .from('comments')
      .insert({
        article_id: article.id,
        username: userName,
        content: comment
      })
      .select()
      .single();

    if (commentError) {
      console.error('Error adding comment:', commentError);
      return res.status(500).json({
        success: false,
        error: 'Failed to add comment'
      });
    }

    res.json({
      success: true,
      comment: {
        id: newComment.id,
        articleId: articleId,
        userName: newComment.username,
        comment: newComment.content,
        timestamp: newComment.created_at
      }
    });
  } catch (error) {
    console.error('Unexpected error adding comment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add comment'
    });
  }
});

// Optional: Like functionality (currently a no-op)
app.post('/api/comments/:commentId/like', async (req, res) => {
  try {
    // Note: Supabase doesn't have built-in like tracking
    // You might want to create a separate 'likes' table or use a different approach
    res.json({
      success: false,
      error: 'Like functionality not implemented'
    });
  } catch (error) {
    console.error('Error liking comment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to like comment'
    });
  }
});

// You can remove the following lines as they're no longer needed:
// const commentsFile = path.join(dataDir, 'comments.json');
// if (!fs.existsSync(commentsFile)) {
//   fs.writeFileSync(commentsFile, JSON.stringify([]));
// }

// Initialize shares file if it doesn't exist
const sharesFile = path.join(dataDir, 'shares.json');
if (!fs.existsSync(sharesFile)) {
  fs.writeFileSync(sharesFile, JSON.stringify({}));
}

// API endpoint to save article data for sharing
app.post('/api/save-share', async (req, res) => {
  try {
    const { title, description, link, source, image } = req.body;
    
    // Validate the required fields
    if (!title || !link) {
      return res.status(400).json({ 
        success: false,
        error: 'Title and link are required' 
      });
    }
    
    // Generate a unique short ID for the article
    const articleId = generateShortId();
    
    // Load existing shares
    const shares = JSON.parse(fs.readFileSync(sharesFile, 'utf8'));
    
    // Save the article data
    shares[articleId] = {
      title,
      description: description || '',
      link,
      source: source || 'Tennessee News',
      image: image || '',
      createdAt: new Date().toISOString()
    };
    
    // Save updated shares
    fs.writeFileSync(sharesFile, JSON.stringify(shares, null, 2));
    
    // Return the share URL
    // Use the API domain instead of tennesseefeeds.com
    const apiDomain = process.env.API_DOMAIN || 'https://share.tennesseefeeds.com';
    
    res.json({
      success: true,
      shareUrl: `${apiDomain}/share/${articleId}`
    });
    
  } catch (error) {
    console.error('Error saving share data:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to save share data' 
    });
  }
});

// Route to handle article sharing
app.get('/share/:id', (req, res) => {
  try {
    const articleId = req.params.id;
    
    // Load existing shares
    const shares = JSON.parse(fs.readFileSync(sharesFile, 'utf8'));
    
    // Get the article data
    const articleData = shares[articleId];
    
    // If article not found, redirect to homepage
    if (!articleData) {
      return res.redirect('https://tennesseefeeds.com');
    }
    
    // Handle potential undefined fields
    const safeTitle = articleData.title || 'Tennessee News Article';
    const safeDescription = articleData.description || '';
    const safeSource = articleData.source || 'Tennessee News';
    const safeLink = articleData.link || 'https://tennesseefeeds.com';
    const apiDomain = process.env.API_DOMAIN || 'https://tennesseefeeds-api.onrender.com';
    
    // If we have the article data, render an HTML page with proper meta tags
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${safeTitle} | TennesseeFeeds</title>
        
        <!-- Regular Meta Tags -->
        <meta name="description" content="${safeDescription}">
        
        <!-- Open Graph / Facebook -->
        <meta property="og:type" content="article">
        <meta property="og:url" content="${apiDomain}/share/${articleId}">
        <meta property="og:title" content="${safeTitle}">
        <meta property="og:description" content="${safeDescription}">
        ${articleData.image ? `
        <meta property="og:image" content="${articleData.image}">
        <meta property="og:image:width" content="1200">
        <meta property="og:image:height" content="630">
        ` : ''}
        
        <!-- Twitter -->
        <meta name="twitter:card" content="summary">
        <meta name="twitter:url" content="${apiDomain}/share/${articleId}">
        <meta name="twitter:title" content="${safeTitle}">
        <meta name="twitter:description" content="${safeDescription}">
        ${articleData.image ? `<meta name="twitter:image" content="${articleData.image}">` : ''}
        
        <!-- Add your other head elements (CSS, favicon, etc.) -->
        <link rel="icon" type="image/svg+xml" href="https://tennesseefeeds.com/favicon.svg">
        <link rel="icon" type="image/png" href="https://tennesseefeeds.com/favicon.png">
        
        <!-- Redirect to TennesseeFeeds homepage instead of the article -->
        <script>
          // Redirect to TennesseeFeeds after 2 seconds
          setTimeout(function() {
            window.location.href = "https://tennesseefeeds.com/";
          }, 10000);
        </script>
        
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
          }
          .container {
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            padding: 20px;
            margin-top: 40px;
          }
          .header {
            display: flex;
            align-items: center;
            margin-bottom: 20px;
          }
          .logo {
            width: 40px;
            margin-right: 10px;
          }
          h1 {
            font-size: 24px;
            margin-bottom: 10px;
          }
          .source {
            color: #666;
            margin-bottom: 15px;
          }
          .article-image {
            width: 100%;
            max-width: 500px; /* Limit width */
            max-height: 300px; /* Limit height */
            object-fit: cover;
            border-radius: 4px;
            margin: 0 auto 20px auto;
            display: block;
          }
          .description {
            color: #333;
            line-height: 1.6;
            margin-bottom: 20px;
          }
          .redirect-message {
            text-align: center;
            color: #666;
            font-style: italic;
          }
          .button {
            display: inline-block;
            background-color: #333;
            color: white;
            padding: 10px 15px;
            border-radius: 4px;
            text-decoration: none;
            margin-top: 15px;
          }
          .buttons {
            display: flex;
            gap: 10px;
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="https://tennesseefeeds.com/favicon.svg" alt="TennesseeFeeds Logo" class="logo">
            <h2>TennesseeFeeds</h2>
          </div>
          
          <h1>${safeTitle}</h1>
          <div class="source">Source: ${safeSource}</div>
          
          ${articleData.image ? `<img src="${articleData.image}" alt="${safeTitle}" class="article-image">` : ''}
          
          <div class="description">${safeDescription}</div>
          
          <div class="buttons">
            <a href="${safeLink}" class="button">Read Original Article</a>
            <a href="https://tennesseefeeds.com" class="button" style="background-color: #4a5568;">Go to TennesseeFeeds</a>
          </div>
          
          <p class="redirect-message">Redirecting to TennesseeFeeds...</p>
        </div>
      </body>
      </html>
    `;
    
    // Send the HTML response
    res.send(html);
    
  } catch (error) {
    console.error('Error handling share request:', error);
    res.redirect('https://tennesseefeeds.com');
  }
});

// Serve static files for the share page (if you have a public directory)
const publicDir = path.join(__dirname, 'public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
}

// Fallback route for static assets
app.get('/favicon.svg', (req, res) => {
  res.redirect('https://tennesseefeeds.com/favicon.svg');
});

app.get('/favicon.png', (req, res) => {
  res.redirect('https://tennesseefeeds.com/favicon.png');
});

// Helper function to generate a short unique ID
function generateShortId(length = 8) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

// Add a cleanup routine to remove old shares (optional, to prevent unlimited growth)
function cleanupOldShares() {
  try {
    const shares = JSON.parse(fs.readFileSync(sharesFile, 'utf8'));
    const now = new Date().getTime();
    const oneMonthAgo = now - (30 * 24 * 60 * 60 * 1000); // 30 days in milliseconds
    
    let modified = false;
    
    // Check each share and remove if older than one month
    Object.keys(shares).forEach(id => {
      const createdAt = new Date(shares[id].createdAt).getTime();
      if (createdAt < oneMonthAgo) {
        delete shares[id];
        modified = true;
      }
    });
    
    // Save if modifications were made
    if (modified) {
      fs.writeFileSync(sharesFile, JSON.stringify(shares, null, 2));
      console.log('Cleaned up old share entries');
    }
  } catch (error) {
    console.error('Error cleaning up old shares:', error);
  }
}

// Set up periodic cleanup (run once per day)
setInterval(cleanupOldShares, 24 * 60 * 60 * 1000);

// Start the server
app.listen(port, () => {
  console.log(`TennesseeFeeds API server running on port ${port}`);
});
