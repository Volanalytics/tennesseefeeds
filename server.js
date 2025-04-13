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
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsaGJ0anBwZm9jdGRnaGlta211Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDAzMTkzMCwiZXhwIjoyMDU5NjA3OTMwfQ.Bg1_HMnnTfWMpS9J982nDd5thQChuCALriF5-hfJwrY';
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
    url: "https://rss.app/feeds/0JFSdrkystYHqjfx.xml",
    region: "Nashville",
    category: "News"
  },
  {
    name: "WTVF Nashville",
    url: "https://rss.app/feeds/yQs4Ss21QWYmp6LL.xml",
    region: "Nashville",
    category: "News"
  },
  {
    name: "WATE Knoxville",
    url: "https://rss.app/feeds/1EFDrXAck3rjCumi.xml",
    region: "Knoxville",
    category: "News"
  },
  {
    name: "WBIR Knoxville",
    url: "https://rss.app/feeds/3KEcJ7opgJnaekG0.xml",
    region: "Knoxville",
    category: "News"
  },
  {
    name: "WREG Memphis",
    url: "https://rss.app/feeds/D4HSIn1GzQhrQKNd.xml",
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
    url: "https://rss.app/feeds/6L4aGmB8asmfzujF.xml",
    region: "Tri-Cities",
    category: "News"
  },
  {
    name: "Tennessee Stands",
    url: "https://rss.app/feeds/GCVP46QvrytySm6k.xml",
    region: "Nashville",
    category: "Politics"
  },
  {
    name: "Tennessee Conservative News",
    url: "https://rss.app/feeds/4RtQxBpNLFlpHSQr.xml",
    region: "Nashville",
    category: "Politics"
  },
  {
    name: "WBBJ Jackson",
    url: "https://rss.app/feeds/nlXk6gJOwEKo6bAw.xml",
    region: "Jackson",
    category: "News"
  },
  {
    name: "The Tennessean",
    url: "https://rss.app/feeds/pxGvhVEpUtH53x9u.xml",
    region: "Nashville",
    category: "General"
  },
  {
    name: "Knoxville News Sentinel",
    url: "https://rss.app/feeds/b3ELipGGw1vxVeVb.xml",
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
    url: "https://rss.app/feeds/egDqdCiaT5r5ke0L.xml",
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
    url: "https://rss.app/feeds/39icE8aKoPixk0n9.xml",
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
    url: "https://rss.app/feeds/UmPzKjgaJzT0m860.xml",
    region: "Nashville",
    category: "News"
  },
  {
    name: "The Murfreesboro Post",
    url: "https://rss.app/feeds/c1xp8BdsUqujQjdi.xml",
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
          isoDate: item.pubDate?.[0],
          // Try to extract category from RSS if available
          category: item.category?.[0] || null
        })) || []
      };
    }
    
    // Process the feed items
    return feed.items.map(item => {
      const image = extractImage(item.content || item['content:encoded']);
      
      // Try to get category from the feed item first, if available
      let category = null;
      if (item.category) {
        // Some feeds have category as an array
        if (Array.isArray(item.category)) {
          category = item.category[0];
        } else {
          category = item.category;
        }
      }
      
      // If no category in the feed, determine it from content
      if (!category) {
        category = determineCategory(item.title, item.content || item['content:encoded'], source.category);
      }
      
      return {
        title: item.title,
        link: item.link,
        description: cleanDescription(item.content || item['content:encoded'] || item.description),
        pubDate: item.isoDate ? new Date(item.isoDate).toISOString() : new Date().toISOString(),
        source: source.name,
        region: source.region,
        category: category,
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
    'News': ['news', 'breaking', 'headlines', 'report', 'update', 'latest', 'announce', 'release'],
    'Politics': ['governor', 'senator', 'legislature', 'vote', 'election', 'bill', 'law', 'political', 'campaign', 'congress', 'mayor', 'council', 'policy', 'government', 'president', 'democrat', 'republican'],
    'Sports': ['football', 'basketball', 'titans', 'grizzlies', 'volunteers', 'vols', 'championship', 'tournament', 'playoff', 'coach', 'game', 'score', 'player', 'team', 'match', 'win', 'lose', 'athletics', 'stadium', 'sports'],
    'Business': ['business', 'economy', 'job', 'market', 'company', 'investment', 'stock', 'startup', 'entrepreneur', 'industry', 'corporate', 'retail', 'finance', 'trade', 'commerce', 'economic'],
    'Arts & Culture': ['music', 'concert', 'festival', 'theater', 'art', 'museum', 'culture', 'entertainment', 'performance', 'exhibit', 'gallery', 'show', 'artist', 'band', 'movie', 'film', 'dance', 'play', 'actor'],
    'Food': ['restaurant', 'food', 'dining', 'cuisine', 'chef', 'barbecue', 'bbq', 'cafe', 'menu', 'dish', 'recipe', 'eat', 'drink', 'bar', 'brewery', 'winery'],
    'Development': ['construction', 'development', 'project', 'building', 'expansion', 'infrastructure', 'property', 'real estate', 'housing', 'apartment', 'renovation', 'downtown', 'neighborhood'],
    'Education': ['school', 'university', 'college', 'education', 'student', 'teacher', 'campus', 'academic', 'class', 'course', 'degree', 'learn', 'study', 'graduate', 'professor'],
    'Health': ['health', 'hospital', 'doctor', 'medical', 'clinic', 'disease', 'treatment', 'patient', 'care', 'vaccine', 'medicine', 'healthcare', 'wellness', 'research']
  };
  
  // First, try to find a match in the keywords
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    for (const keyword of keywords) {
      if (titleContent.includes(keyword)) {
        return category;
      }
    }
  }
  
  // If no match, use the source default category
  return defaultCategory || 'General';
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

// This is the fixed reaction endpoint code for your server.js file
// Replace your existing reaction endpoint with this code

// Handle user reactions
app.post('/api/reaction', express.json(), async (req, res) => {
  try {
    console.log('Received reaction request:', req.body);
    const { articleId, userId, fingerprint, type } = req.body;
    
    if (!articleId || !(userId || fingerprint) || !type) {
      console.error('Missing required fields:', { articleId, userId, fingerprint, type });
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }
    
    if (type !== 'like' && type !== 'dislike') {
      console.error('Invalid reaction type:', type);
      return res.status(400).json({
        success: false,
        error: 'Invalid reaction type'
      });
    }

    // First, check if the article exists, if not, create it
    let { data: article, error: articleError } = await supabase
      .from('articles')
      .select('id')
      .eq('article_id', articleId)
      .single();

    if (articleError) {
      console.log('Article not found, creating:', articleId);
      // Article doesn't exist yet, so create it
      const { data: newArticle, error: createError } = await supabase
        .from('articles')
        .insert({
          article_id: articleId,
          title: 'Unknown Article', // Default title
          source: 'Unknown Source', // Default source
          url: '' // Default empty URL
        })
        .select()
        .single();
        
      if (createError) {
        console.error('Error creating article:', createError);
        return res.status(500).json({
          success: false,
          error: 'Failed to process reaction - article creation failed'
        });
      }
      
      article = newArticle;
    }
    
    // Find existing reaction by user ID or fingerprint
    let query = supabase.from('reactions').select('id, reaction_type');
    
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
      if (existingReaction.reaction_type === type) {
        const { error: deleteError } = await supabase
          .from('reactions')
          .delete()
          .eq('id', existingReaction.id);
          
        if (deleteError) {
          console.error('Error deleting reaction:', deleteError);
          return res.status(500).json({
            success: false,
            error: 'Failed to delete reaction'
          });
        }
        
        action = 'removed';
      } else {
       // Change reaction type
        const { error: updateError } = await supabase
          .from('reactions')
          .update({ reaction_type: type })
          .eq('id', existingReaction.id);
          
        if (updateError) {
          console.error('Error updating reaction:', updateError);
          return res.status(500).json({
            success: false,
            error: 'Failed to update reaction'
          });
        }
        
        action = 'updated';
      }
    } else {
      // Create new reaction - with proper conflict handling
      const reactionData = {
        article_id: article.id,
        reaction_type: type,
        user_fingerprint: fingerprint || 'unknown' // Always provide fingerprint
      };
      
      // Add user ID if available
      if (userId) {
        reactionData.user_id = userId;
      }
      
      // Use upsert with onConflict to handle duplicate errors
      const { error: insertError } = await supabase
        .from('reactions')
        .upsert(reactionData, { 
          onConflict: 'article_id,user_fingerprint', 
          ignoreDuplicates: false 
        });
       
      if (insertError) {
        console.error('Error inserting reaction:', insertError);
        return res.status(500).json({
          success: false,
          error: 'Failed to add reaction'
        });
      }
      
      action = 'added';
    }
    
    // Get updated counts
    const { data: reactions, error: countError } = await supabase
      .from('reactions')
      .select('reaction_type')
      .eq('article_id', article.id);
      
    if (countError) {
      console.error('Error counting reactions:', countError);
      return res.status(500).json({
        success: false,
        error: 'Failed to count reactions'
      });
    }
    
    const likes = reactions.filter(r => r.reaction_type === 'like').length;
    const dislikes = reactions.filter(r => r.reaction_type === 'dislike').length;
    
    res.json({
      success: true,
      action,
      type, // Send back the original type for client compatibility
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

// Get reaction counts for an article
app.get('/api/reactions/:articleId', async (req, res) => {
  try {
    const articleId = req.params.articleId;
    console.log('Getting reaction counts for article:', articleId);
    
    // Get the article
    const { data: article, error: articleError } = await supabase
      .from('articles')
      .select('id')
      .eq('article_id', articleId)
      .single();
    
    if (articleError) {
      console.log('Article not found in DB for reaction counts:', articleId);
      return res.json({
        success: true,
        likes: 0,
        dislikes: 0
      });
    }
    
    // Get reactions
    const { data: reactions, error: reactionError } = await supabase
      .from('reactions')
      .select('reaction_type')  // Use the correct column name
      .eq('article_id', article.id);
    
    if (reactionError) {
      console.error('Error fetching reactions:', reactionError);
      return res.status(500).json({
        success: false,
        error: 'Failed to get reactions',
        likes: 0,
        dislikes: 0
      });
    }
    
    const likes = reactions.filter(r => r.reaction_type === 'like').length;
    const dislikes = reactions.filter(r => r.reaction_type === 'dislike').length;
    
    console.log('Reaction counts for article:', articleId, { likes, dislikes });
    
    res.json({
      success: true,
      likes,
      dislikes
    });
  } catch (error) {
    console.error('Error getting reactions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get reactions',
      likes: 0,
      dislikes: 0
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
    
    // Get the article with error handling
    let { data: article, error: articleError } = await supabase
      .from('articles')
      .select('id')
      .eq('article_id', articleId)
      .single();
    
    // If article doesn't exist, create it
    if (articleError && articleError.code === 'PGRST116') {
      console.log('Article not found for sharing, creating:', articleId);
      
      // Article doesn't exist yet, so create it
      const { data: newArticle, error: createError } = await supabase
        .from('articles')
        .insert({
          article_id: articleId,
          title: 'Shared Article', // Default title
          source: 'Unknown Source', // Default source
          url: articleId // Use article ID as URL for tracking
        })
        .select()
        .single();
        
      if (createError) {
        // If we get a duplicate key error, someone else created the article concurrently
        if (createError.code === '23505') {
          console.log('Article created concurrently, fetching instead:', articleId);
          
          // Try to fetch the article again since it must now exist
          const { data: refetchedArticle, error: refetchError } = await supabase
            .from('articles')
            .select('id')
            .eq('article_id', articleId)
            .single();
            
          if (refetchError) {
            console.error('Error refetching article after duplicate key:', refetchError);
            return res.status(500).json({
              success: false,
              error: 'Failed to process share - could not fetch article after conflict'
            });
          }
          
          article = refetchedArticle;
        } else {
          console.error('Error creating article for sharing:', createError);
          return res.status(500).json({
            success: false,
            error: 'Failed to process share - article creation failed'
          });
        }
      } else {
        article = newArticle;
      }
    } else if (articleError) {
      console.error('Error finding article:', articleError);
      return res.status(500).json({
        success: false,
        error: 'Failed to process share - article query error'
      });
    }
    
    // Make sure we have an article by this point
    if (!article) {
      console.error('Article not available after all attempts');
      return res.status(500).json({
        success: false,
        error: 'Failed to process share - article not available'
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
    
    // Insert with error handling
    const { error: insertError } = await supabase
      .from('shares')
      .insert(shareData);
      
    if (insertError) {
      console.error('Error inserting share record:', insertError);
      return res.status(500).json({
        success: false,
        error: 'Failed to record share'
      });
    }
    
    // Generate a share URL (using your existing logic)
    const apiDomain = process.env.API_DOMAIN || 'https://share.tennesseefeeds.com';
    const shareUrl = `${apiDomain}/share/${shareId}`;
    
    console.log('Share recorded successfully for article:', articleId, 'with shareId:', shareId);
    
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

// ENHANCED COMMENT SYSTEM - START
// Update the existing comments endpoint to support threaded replies and comment scoring

// Enhanced comments endpoint with improved article creation handling
app.post('/api/comments', express.json(), async (req, res) => {
  console.log('Received comment request:', req.body);
  try {
    const { 
      articleId, 
      userName, 
      userId, 
      fingerprint, 
      comment, 
      articleTitle, 
      source, 
      url, 
      parentId  // New parameter for threaded replies
    } = req.body;
    
    // Validate required fields
    if (!articleId || !comment) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // First, find or create the article WITH DUPLICATE KEY ERROR HANDLING
    let article = null;
    const { data: existingArticle, error: articleError } = await supabase
      .from('articles')
      .select('id')
      .eq('article_id', articleId)
      .single();

    if (articleError) {
      // Only try to create if the article wasn't found
      if (articleError.code === 'PGRST116') {
        try {
          // Article doesn't exist yet, try to create it
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
            // If we get a duplicate key error, someone else created the article concurrently
            if (insertError.code === '23505') {
              console.log('Article created concurrently, fetching instead:', articleId);
              
              // Try to fetch the article again since it must now exist
              const { data: refetchedArticle, error: refetchError } = await supabase
                .from('articles')
                .select('id')
                .eq('article_id', articleId)
                .single();
                
              if (refetchError) {
                console.error('Error refetching article after duplicate key:', refetchError);
                return res.status(500).json({
                  success: false,
                  error: 'Failed to process comment - could not fetch article after conflict'
                });
              }
              
              article = refetchedArticle;
            } else {
              // Some other error occurred during creation
              console.error('Error creating article:', insertError);
              return res.status(500).json({
                success: false,
                error: 'Failed to process comment - article creation failed'
              });
            }
          } else {
            // Article created successfully
            article = newArticle;
          }
        } catch (createError) {
          console.error('Unexpected error creating article:', createError);
          return res.status(500).json({
            success: false,
            error: 'Failed to process comment - unexpected article creation error'
          });
        }
      } else {
        // Not a not-found error, something else went wrong
        console.error('Error finding article:', articleError);
        return res.status(500).json({
          success: false,
          error: 'Failed to process comment - article query error'
        });
      }
    } else {
      // Article already exists
      article = existingArticle;
    }

    // Check that we have an article by this point
    if (!article) {
      console.error('Article not available after all attempts');
      return res.status(500).json({
        success: false,
        error: 'Failed to process comment - article not available'
      });
    }

    // Insert the comment with user info if available
    const commentData = {
      article_id: article.id,
      username: userName || 'Anonymous',
      content: comment,
      // Add parent ID for threaded replies
      parent_id: parentId || null,
      // Initialize score to zero
      score: 0
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
        timestamp: newComment.created_at,
        parentId: newComment.parent_id,
        score: newComment.score
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

// Enhanced endpoint to get comments with threaded structure and votes
app.get('/api/comments/:articleId', async (req, res) => {
  try {
    const articleId = req.params.articleId;
    // Get user ID from request if available (from query param)
    const userId = req.query.userId;

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
      .select('id, username, content, created_at, parent_id, score, user_id')
      .eq('article_id', article.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching comments:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch comments'
      });
    }

    // If we have a userId, fetch the user's votes on these comments
    let userVotes = {};
    if (userId) {
      const { data: votes, error: votesError } = await supabase
        .from('comment_votes')
        .select('comment_id, vote_type')
        .eq('user_id', userId)
        .in('comment_id', comments.map(c => c.id));

      if (!votesError && votes) {
        votes.forEach(vote => {
          userVotes[vote.comment_id] = vote.vote_type;
        });
      }
    }

    // Map comments to include user votes
    const mappedComments = comments.map(comment => ({
      id: comment.id,
      userName: comment.username,
      comment: comment.content,
      timestamp: comment.created_at,
      parentId: comment.parent_id,
      score: comment.score || 0,
      userVote: userVotes[comment.id] || null
    }));

    res.json({
      success: true,
      comments: mappedComments
    });
  } catch (error) {
    console.error('Unexpected error in comments endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch comments'
    });
  }
});

// Enhanced comment voting endpoint with better error handling
app.post('/api/comments/vote', express.json(), async (req, res) => {
  try {
    console.log('Received vote request:', req.body);
    const { commentId, userId, voteType } = req.body;
    
    // Validate inputs with detailed error messages
    if (!commentId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: commentId'
      });
    }
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: userId'
      });
    }
    
    if (!voteType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: voteType'
      });
    }
    
    if (voteType !== 'upvote' && voteType !== 'downvote') {
      return res.status(400).json({
        success: false,
        error: `Invalid vote type: ${voteType}. Must be "upvote" or "downvote".`
      });
    }
    
    console.log(`Finding comment with ID: ${commentId}`);
    
    // First check if the comment exists
    let { data: comment, error: commentError } = await supabase
      .from('comments')
      .select('id, score, user_id')
      .eq('id', commentId)
      .maybeSingle();
      
    if (commentError) {
      console.error('Error fetching comment:', commentError);
      return res.status(500).json({
        success: false,
        error: 'Database error when fetching comment',
        details: commentError.message
      });
    }
    
    if (!comment) {
      console.log(`Comment not found with ID: ${commentId}`);
      return res.status(404).json({
        success: false,
        error: 'Comment not found'
      });
    }
    
    console.log('Found comment:', comment);
    
    // Check if user has already voted
    console.log(`Checking if user ${userId} already voted on comment ${commentId}`);
    let { data: existingVote, error: voteError } = await supabase
      .from('comment_votes')
      .select('id, vote_type')
      .eq('comment_id', commentId)
      .eq('user_id', userId)
      .maybeSingle();
      
    if (voteError) {
      console.error('Error checking existing vote:', voteError);
      return res.status(500).json({
        success: false,
        error: 'Database error when checking existing vote',
        details: voteError.message
      });
    }
    
    console.log('Existing vote:', existingVote);
    
    // Calculate vote impact and perform DB operations
    let voteAction;
    let voteImpact;
    
    try {
      if (existingVote) {
        if (existingVote.vote_type === voteType) {
          // Remove vote if same type
          console.log(`Removing ${voteType} from user ${userId} on comment ${commentId}`);
          const { error: deleteError } = await supabase
            .from('comment_votes')
            .delete()
            .eq('id', existingVote.id);
            
          if (deleteError) {
            console.error('Error deleting vote:', deleteError);
            throw new Error(`Failed to remove vote: ${deleteError.message}`);
          }
          
          voteImpact = voteType === 'upvote' ? -1 : 1;
          voteAction = 'removed';
        } else {
          // Change vote type
          console.log(`Changing vote from ${existingVote.vote_type} to ${voteType} for user ${userId}`);
          const { error: updateError } = await supabase
            .from('comment_votes')
            .update({ vote_type: voteType })
            .eq('id', existingVote.id);
            
          if (updateError) {
            console.error('Error updating vote:', updateError);
            throw new Error(`Failed to update vote: ${updateError.message}`);
          }
          
          voteImpact = voteType === 'upvote' ? 2 : -2;
          voteAction = 'updated';
        }
      } else {
       // New vote using a stored procedure to avoid ambiguity
          console.log(`Adding new ${voteType} from user ${userId} on comment ${commentId}`);
          const { data, error: insertError } = await supabase.rpc(
            'insert_comment_vote',
          { 
            p_comment_id: commentId,
            p_user_id: userId, 
            p_vote_type: voteType 
           }
          );
          
        if (insertError) {
          console.error('Error adding vote:', insertError);
          throw new Error(`Failed to add vote: ${insertError.message}`);
        }
        
        voteImpact = voteType === 'upvote' ? 1 : -1;
        voteAction = 'added';
      }
      
      // Update the comment score
      console.log(`Updating comment ${commentId} score by ${voteImpact}`);
      const newScore = (comment.score || 0) + voteImpact;
      
      const { error: updateError } = await supabase
        .from('comments')
        .update({ score: newScore })
        .eq('id', commentId);
        
      if (updateError) {
        console.error('Error updating comment score:', updateError);
        throw new Error(`Failed to update comment score: ${updateError.message}`);
      }
      
      // Get updated counts
      console.log(`Getting updated vote counts for comment ${commentId}`);
      const { data: votes, error: countError } = await supabase
        .from('comment_votes')
        .select('vote_type')
        .eq('comment_id', commentId);
        
      if (countError) {
        console.error('Error counting votes:', countError);
        throw new Error(`Failed to count votes: ${countError.message}`);
      }
      
      const likes = (votes || []).filter(v => v.vote_type === 'upvote').length;
      const dislikes = (votes || []).filter(v => v.vote_type === 'downvote').length;
      
      // Success response
      console.log('Vote processed successfully:', {
        action: voteAction,
        newScore,
        likes,
        dislikes
      });
      
      return res.json({
        success: true,
        action: voteAction,
        voteType,
        newScore,
        likes,
        dislikes
      });
    } catch (dbError) {
      console.error('Database operation error:', dbError);
      return res.status(500).json({
        success: false,
        error: dbError.message
      });
    }
  } catch (error) {
    console.error('Uncaught error in vote endpoint:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Get top users by points
app.get('/api/users/top', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    // Get top users by points
    const { data: users, error } = await supabase
      .from('user_points')
      .select('user_id, points, users(username)')
      .order('points', { ascending: false })
      .limit(limit);
      
    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch top users'
      });
    }
    
    // Map to a nicer format
    const topUsers = users.map(user => ({
      userId: user.user_id,
      points: user.points,
      username: user.users ? user.users.username : 'Anonymous'
    }));
    
    res.json({
      success: true,
      users: topUsers
    });
  } catch (error) {
    console.error('Error fetching top users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch top users'
    });
  }
});

// Endpoint to recalculate all comment scores (admin use)
app.post('/api/admin/recalculate-comment-scores', express.json(), async (req, res) => {
  try {
    // Check admin authorization
    // TODO: Add proper authorization checks here
    
    // Get all comments
    const { data: comments, error: commentsError } = await supabase
      .from('comments')
      .select('id');
      
    if (commentsError) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch comments'
      });
    }
    
    // Update scores for each comment
    const updates = await Promise.all(comments.map(async comment => {
      // Count upvotes
      const { count: upvotes, error: upError } = await supabase
        .from('comment_votes')
        .select('id', { count: 'exact', head: true })
        .eq('comment_id', comment.id)
        .eq('vote_type', 'upvote');
      
      // Count downvotes
      const { count: downvotes, error: downError } = await supabase
        .from('comment_votes')
        .select('id', { count: 'exact', head: true })
        .eq('comment_id', comment.id)
        .eq('vote_type', 'downvote');
      
      if (upError || downError) {
        return { id: comment.id, success: false };
      }
      
      // Calculate new score
      const newScore = (upvotes || 0) - (downvotes || 0);
      
      // Update comment
      const { error: updateError } = await supabase
        .from('comments')
        .update({ score: newScore })
        .eq('id', comment.id);
      
      return { 
        id: comment.id, 
        success: !updateError,
        newScore
      };
    }));
    
    const success = updates.every(update => update.success);
    
    res.json({
      success,
      updated: updates.length,
      details: updates
    });
  } catch (error) {
    console.error('Error recalculating comment scores:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to recalculate comment scores'
    });
  }
});

// Endpoint to recalculate user points (admin use)
app.post('/api/admin/recalculate-user-points', express.json(), async (req, res) => {
  try {
    // Check admin authorization
    // TODO: Add proper authorization checks here
    
    // First get all users who have received upvotes on their comments
    const { data: commentAuthors, error: authorsError } = await supabase
      .from('comments')
      .select('user_id')
      .not('user_id', 'is', null);
      
    if (authorsError) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch comment authors'
      });
    }
    
    // Get unique user IDs
    const userIds = [...new Set(commentAuthors.map(author => author.user_id))];
    
    // Calculate points for each user
    const updates = await Promise.all(userIds.map(async userId => {
      // Count upvotes on user's comments from other users
      const { data: comments, error: commentsError } = await supabase
        .from('comments')
        .select('id')
        .eq('user_id', userId);
        
      if (commentsError || !comments) {
        return { userId, success: false, error: 'Failed to fetch comments' };
      }
      
      const commentIds = comments.map(comment => comment.id);
      
      if (commentIds.length === 0) {
        return { userId, success: true, points: 0 };
      }
      
      // Count upvotes from other users
      const { data: upvotes, error: votesError } = await supabase
        .from('comment_votes')
        .select('id, user_id')
        .in('comment_id', commentIds)
        .eq('vote_type', 'upvote')
        .not('user_id', 'eq', userId); // Exclude self-votes
        
      if (votesError) {
        return { userId, success: false, error: 'Failed to fetch votes' };
      }
      
      const points = upvotes ? upvotes.length : 0;
      
      // Update or create user points record
      const { data: existingPoints, error: pointsError } = await supabase
        .from('user_points')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
        
      let updateError;
      
      if (!pointsError && existingPoints) {
        // Update existing record
        const { error } = await supabase
          .from('user_points')
          .update({ points, updated_at: new Date() })
          .eq('id', existingPoints.id);
          
        updateError = error;
      } else {
        // Create new record
        const { error } = await supabase
          .from('user_points')
          .insert({
            user_id: userId,
            points
          });
          
        updateError = error;
      }
      
      return {
        userId,
        success: !updateError,
        points,
        error: updateError ? updateError.message : null
      };
    }));
    
    const success = updates.every(update => update.success);
    
    res.json({
      success,
      updated: updates.length,
      details: updates
    });
  } catch (error) {
    console.error('Error recalculating user points:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to recalculate user points'
    });
  }
});
// ENHANCED COMMENT SYSTEM - END

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
// Endpoint for category filtering
app.get('/api/feeds/category/:category', async (req, res) => {
  try {
    const categoryId = req.params.category.toLowerCase();
    
    // Fetch all feeds
    const feedPromises = tennesseeSources.map(source => fetchRssFeed(source));
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
    
    // Filter articles by category
    const filteredArticles = allArticles.filter(article => {
      return article.category && article.category.toLowerCase() === categoryId;
    });
    
    // Sort by date (newest first)
    filteredArticles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    
    // Return with appropriate cache headers
    res.set('Cache-Control', 'public, max-age=600'); // Cache for 10 minutes
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      category: categoryId,
      count: filteredArticles.length,
      articles: filteredArticles
    });
  } catch (error) {
    console.error('Error fetching feeds by category:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint for region + category filtering
app.get('/api/feeds/region/:region/category/:category', async (req, res) => {
  try {
    const regionId = req.params.region.toLowerCase();
    const categoryId = req.params.category.toLowerCase();
    
    // Fetch all feeds
    const feedPromises = tennesseeSources.map(source => fetchRssFeed(source));
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
    
    // Filter articles by region and category
    const filteredArticles = allArticles.filter(article => {
      const matchesCategory = article.category && article.category.toLowerCase() === categoryId;
      
      // If region is "all", only filter by category
      if (regionId === 'all') {
        return matchesCategory;
      }
      
      // Otherwise, check if title, description, or source contains the region name
      const title = article.title ? article.title.toLowerCase() : '';
      const description = article.description ? article.description.toLowerCase() : '';
      const source = article.source ? article.source.toLowerCase() : '';
      
      const matchesRegion = title.includes(regionId) || 
                          description.includes(regionId) || 
                          source.includes(regionId);
      
      return matchesRegion && matchesCategory;
    });
    
    // Sort by date (newest first)
    filteredArticles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    
    // Return with appropriate cache headers
    res.set('Cache-Control', 'public, max-age=600'); // Cache for 10 minutes
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      region: regionId,
      category: categoryId,
      count: filteredArticles.length,
      articles: filteredArticles
    });
  } catch (error) {
    console.error('Error fetching feeds by region and category:', error);
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
        <meta property="og:image" content="https://tennesseefeeds.com/social-share.jpg">
        <meta property="og:image:width" content="1200">
        <meta property="og:image:height" content="630">
  
        
        <!-- Twitter -->
        <meta name="twitter:card" content="summary">
        <meta name="twitter:url" content="${apiDomain}/share/${articleId}">
        <meta name="twitter:title" content="${safeTitle}">
        <meta name="twitter:description" content="${safeDescription}">
        <meta name="twitter:image" content="https://tennesseefeeds.com/social-share.jpg">
        
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
