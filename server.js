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

// ADD THE NEW CORS HEADERS RIGHT HERE
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'https://tennesseefeeds.com');
  res.header('Access-Control-Allow-Methods', 'GET, POST');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Accept');
  next();
});
// Enable JSON parsing for request bodies
app.use(express.json());

// List of Tennessee news sources
const tennesseeSources = [
  {
    name: "WSMV Nashville",
    url: "https://www.wsmv.com/news/",
    region: "Nashville",
    category: "News"
  },
  {
    name: "WTVF Nashville",
    url: "https://www.newschannel5.com/index.rss",
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
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCsefBCbI7P5Xr-edSOpbF4A",
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
    name: "WKRN News 2, Nashville TN",
    url: "https://www.wkrn.com/news/feed/",
    region: "Nashville",
    category: "News"
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
  },
  // Appended additional sources below
  {
    name: "The Leaf-Chronicle",
    url: "https://www.theleafchronicle.com/rss/",
    region: "Clarksville",
    category: "General"
  },
  {
    name: "Daily Memphian",
    url: "https://dailymemphian.com/rss",
    region: "Memphis",
    category: "News"
  },
  {
    name: "WDEF Chattanooga",
    url: "https://wdef.com/feed/",
    region: "Chattanooga",
    category: "News"
  },
  {
    name: "Clarksville Now",
    url: "https://clarksvillenow.com/feed/",
    region: "Clarksville",
    category: "News"
  },
  {
    name: "The Daily Beacon",
    url: "https://utdailybeacon.com/feed/",
    region: "Knoxville",
    category: "Education"
  },
  {
    name: "WPLN Nashville Public Radio",
    url: "https://wpln.org/feed/",
    region: "Nashville",
    category: "News"
  },
  {
    name: "The Jackson Sun",
    url: "https://www.jacksonsun.com/rss/",
    region: "Jackson",
    category: "General"
  },
  {
    name: "Main Street Nashville",
    url: "https://www.mainstreet-nashville.com/feed/",
    region: "Nashville",
    category: "News"
  },
  {
    name: "The Murfreesboro Post",
    url: "https://www.murfreesboropost.com/feed/",
    region: "Murfreesboro",
    category: "News"
  },
  {
    name: "Tennessee Tribune",
    url: "https://tntribune.com/feed/",
    region: "Nashville",
    category: "News"
  },
  {
    name: "Out & About Nashville",
    url: "https://outandaboutnashville.com/feed/",
    region: "Nashville",
    category: "Entertainment"
  },
  {
    name: "The Bristol Herald Courier",
    url: "https://heraldcourier.com/feed/",
    region: "Tri-Cities",
    category: "News"
  },
  {
    name: "WRCB Chattanooga",
    url: "https://www.wrcbtv.com/feed/",
    region: "Chattanooga",
    category: "News"
  },
  {
    name: "The Tennessean Sports",
    url: "https://www.tennessean.com/sports/rss/",
    region: "Nashville",
    category: "Sports"
  },
  {
    name: "Vanderbilt Hustler",
    url: "https://vanderbilthustler.com/feed/",
    region: "Nashville",
    category: "Education"
  },
  {
    name: "Nooga Today",
    url: "https://noogatoday.6amcity.com/feed/",
    region: "Chattanooga",
    category: "News"
  },
  {
    name: "Johnson City Press",
    url: "https://www.johnsoncitypress.com/feed/",
    region: "Tri-Cities",
    category: "General"
  },
  {
    name: "The Daily Times",
    url: "https://www.thedailytimes.com/feed/",
    region: "Maryville",
    category: "News"
  },
  {
    name: "Cleveland Daily Banner",
    url: "https://clevelandbanner.com/feed/",
    region: "Cleveland",
    category: "News"
  },
  {
    name: "Tennessee Tech Oracle",
    url: "https://www.tntechoracle.com/feed/",
    region: "Cookeville",
    category: "Education"
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

// Helper function to generate a short unique ID
function generateShortId(length = 8) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

// =============================================
// USER TRACKING ENDPOINTS - START
// =============================================

// Adjusted API endpoint for user identification with database schema fix
app.post('/api/identify-user', express.json(), async (req, res) => {
  try {
    const { userId, username, fingerprint, ipAddress } = req.body;
    
    // Validation
    if (!fingerprint) {
      return res.status(400).json({
        success: false,
        error: 'Fingerprint is required'
      });
    }
    
    let user = null;
    
    // First, check if the user exists by user ID
    if (userId) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (!error && data) {
        user = data;
        
        // Update fingerprint and last seen info if needed
        if (user.fingerprint_id !== fingerprint || 
            user.last_ip_address !== ipAddress) {
          
          const { error: updateError } = await supabase
            .from('users')
            .update({
              fingerprint_id: fingerprint,
              last_ip_address: ipAddress,
              // Removed user_agent field to match database schema
              updated_at: new Date()
            })
            .eq('id', user.id);
            
          if (updateError) {
            console.error('Error updating user:', updateError);
          }
        }
      }
    }
    
    // If no user found by ID, try to find by fingerprint
    if (!user) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('fingerprint_id', fingerprint)
        .single();
        
      if (!error && data) {
        user = data;
        
        // Update last seen info
        const { error: updateError } = await supabase
          .from('users')
          .update({
            last_ip_address: ipAddress,
            // Removed user_agent field
            updated_at: new Date()
          })
          .eq('id', user.id);
          
        if (updateError) {
          console.error('Error updating user:', updateError);
        }
      }
    }
    
    // If still no user, create a new one
    if (!user) {
      const { data, error } = await supabase
        .from('users')
        .insert({
          username: username || 'Anonymous',
          fingerprint_id: fingerprint,
          last_ip_address: ipAddress
          // Removed user_agent field
        })
        .select()
        .single();
        
      if (error) {
        console.error('Error creating user:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to create user'
        });
      }
      
      user = data;
    }
    
    // Return the user data
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username
      }
    });
  } catch (error) {
    console.error('Error in identify-user:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// Handle user reactions
app.post('/api/reaction', express.json(), async (req, res) => {
  try {
    const { articleId, userId, fingerprint, type } = req.body;
    
    if (!articleId || !(userId || fingerprint) || !type) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }
    
    if (type !== 'like' && type !== 'dislike') {
      return res.status(400).json({
        success: false,
        error: 'Invalid reaction type'
      });
    }

    // Get the article
    const { data: article, error: articleError } = await supabase
      .from('articles')
      .select('id')
      .eq('article_id', articleId)
      .single();

    if (articleError || !article) {
      console.error('Error finding article:', articleError);
      return res.status(404).json({
        success: false,
        error: 'Article not found'
      });
    }
    
    // Find existing reaction by user ID or fingerprint
    let query = supabase.from('reactions').select('id, type');
    
    if (userId) {
      query = query.eq('user_id', userId);
    } else {
      query = query.eq('user_fingerprint', fingerprint);
    }
    
    query = query.eq('article_id', article.id);
    
    const { data: existingReaction, error: findError } = await query.maybeSingle();
    
    let action;
    
    if (!findError && existingReaction) {
      // Toggle reaction off if same type
      if (existingReaction.type === type) {
        await supabase
          .from('reactions')
          .delete()
          .eq('id', existingReaction.id);
        
        action = 'removed';
      } else {
        // Change reaction type
        await supabase
          .from('reactions')
          .update({ type })
          .eq('id', existingReaction.id);
        
        action = 'updated';
      }
    } else {
      // Create new reaction
      const reactionData = {
        article_id: article.id,
        type
      };
      
      // Add either user ID or fingerprint
      if (userId) {
        reactionData.user_id = userId;
      } else {
        reactionData.user_fingerprint = fingerprint;
      }
      
      await supabase
        .from('reactions')
        .insert(reactionData);
      
      action = 'added';
    }
    
    // Get updated counts - safely with null check
    const { data: reactions } = await supabase
      .from('reactions')
      .select('type')
      .eq('article_id', article.id);

    // Safe handling of reactions data
    const likes = reactions && Array.isArray(reactions) 
      ? reactions.filter(r => r.type === 'like').length 
      : 0;
      
    const dislikes = reactions && Array.isArray(reactions) 
      ? reactions.filter(r => r.type === 'dislike').length 
      : 0;
    
    // Log the results for debugging
    console.log('Reaction processed:', {
      article_id: article.id,
      action,
      type,
      likes,
      dislikes
    });
    
    res.json({
      success: true,
      action,
      type,
      likes,
      dislikes
    });
  } catch (error) {
    console.error('Error handling reaction:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process reaction'
    });
  }
});

// Get reaction counts for an article - with improved error handling
app.get('/api/reactions/:articleId', async (req, res) => {
  try {
    const articleId = req.params.articleId;
    
    // Get the article
    const { data: article, error: articleError } = await supabase
      .from('articles')
      .select('id')
      .eq('article_id', articleId)
      .single();
    
    if (articleError || !article) {
      // Instead of erroring, return zero counts
      return res.json({
        success: true,
        likes: 0,
        dislikes: 0
      });
    }
    
    // Get reactions
    const { data: reactions, error: reactionsError } = await supabase
      .from('reactions')
      .select('type')
      .eq('article_id', article.id);
    
    // Safe handling of reactions data
    const likes = reactions && Array.isArray(reactions) 
      ? reactions.filter(r => r.type === 'like').length 
      : 0;
      
    const dislikes = reactions && Array.isArray(reactions) 
      ? reactions.filter(r => r.type === 'dislike').length 
      : 0;
    
    res.json({
      success: true,
      likes,
      dislikes
    });
  } catch (error) {
    console.error('Error getting reactions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get reactions'
    });
  }
});

// Get a specific user's reaction to an article
app.get('/api/user-reaction/:articleId/:userId', async (req, res) => {
  try {
    const { articleId, userId } = req.params;
    
    // Get the article
    const { data: article, error: articleError } = await supabase
      .from('articles')
      .select('id')
      .eq('article_id', articleId)
      .single();
    
    if (articleError) {
      return res.json({
        success: false,
        error: 'Article not found',
        type: null
      });
    }
    
    // Get user reaction
    const { data: reaction, error: reactionError } = await supabase
      .from('reactions')
      .select('type')
      .eq('article_id', article.id)
      .eq('user_id', userId)
      .single();
    
    if (reactionError) {
      return res.json({
        success: false,
        type: null
      });
    }
    
    res.json({
      success: true,
      type: reaction.type
    });
  } catch (error) {
    console.error('Error getting user reaction:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user reaction'
    });
  }
});

// Update username
app.post('/api/update-username', express.json(), async (req, res) => {
  try {
    const { userId, username } = req.body;
    
    if (!userId || !username) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }
    
    const { error } = await supabase
      .from('users')
      .update({ 
        username,
        updated_at: new Date()
      })
      .eq('id', userId);
    
    if (error) {
      console.error('Error updating username:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update username'
      });
    }
    
    res.json({
      success: true,
      username
    });
  } catch (error) {
    console.error('Error updating username:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update username'
    });
  }
});

// Track article sharing
app.post('/api/track-share', express.json(), async (req, res) => {
  try {
    const { articleId, userId, shareId, platform } = req.body;
    
    if (!articleId || !shareId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }
    
    // Get the article
    const { data: article, error: articleError } = await supabase
      .from('articles')
      .select('id')
      .eq('article_id', articleId)
      .single();
    
    if (articleError) {
      console.error('Error finding article:', articleError);
      return res.status(404).json({
        success: false,
        error: 'Article not found'
      });
    }
    
    // Record the share
    const shareData = {
      article_id: article.id,
      share_id: shareId,
      platform: platform || null
    };
    
    // Add user ID if available
    if (userId) {
      shareData.user_id = userId;
    }
    
    await supabase
      .from('shares')
      .insert(shareData);
    
    // Generate a share URL (using your existing logic)
    const apiDomain = process.env.API_DOMAIN || 'https://share.tennesseefeeds.com';
    const shareUrl = `${apiDomain}/share/${shareId}`;
    
    res.json({
      success: true,
      shareUrl
    });
  } catch (error) {
    console.error('Error tracking share:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track share'
    });
  }
});

// Get share information
app.get('/api/share/:shareId', async (req, res) => {
  try {
    const shareId = req.params.shareId;
    
    // Get share and related article
    const { data: share, error: shareError } = await supabase
      .from('shares')
      .select(`
        id,
        share_id,
        platform,
        created_at,
        articles (
          id,
          article_id,
          title,
          source,
          url
        ),
        users (
          username
        )
      `)
      .eq('share_id', shareId)
      .single();
    
    if (shareError) {
      console.error('Error finding share:', shareError);
      return res.status(404).json({
        success: false,
        error: 'Share not found'
      });
    }
    
    res.json({
      success: true,
      share: {
        id: share.id,
        shareId: share.share_id,
        platform: share.platform,
        createdAt: share.created_at,
        article: share.articles,
        username: share.users ? share.users.username : 'Anonymous'
      }
    });
  } catch (error) {
    console.error('Error getting share:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get share'
    });
  }
});

// Update the existing comments endpoint to store user info
app.post('/api/comments', express.json(), async (req, res) => {
  console.log('Received comment request:', req.body);
  try {
    const { articleId, userName, userId, fingerprint, comment, articleTitle, source, url } = req.body;
    
    // Validate required fields
    if (!articleId || !comment) {
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
          title: articleTitle || 'Untitled Article',
          source: source || 'Unknown Source',
          url: url || ''
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

    // Insert the comment with user info if available
    const commentData = {
      article_id: article.id,
      username: userName || 'Anonymous',
      content: comment
    };
    
    // Add user ID if available
    if (userId) {
      commentData.user_id = userId;
    }

    const { data: newComment, error: commentError } = await supabase
      .from('comments')
      .insert(commentData)
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

// =============================================
// USER TRACKING ENDPOINTS - END
// =============================================

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

// Comments API endpoints - Getting comments
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
          // Redirect to TennesseeFeeds after 10 seconds
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
