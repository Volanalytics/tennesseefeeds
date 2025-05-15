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
const supabaseUrl = 'https://ulhbtjppfoctdghimkmu.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsaGJ0anBwZm9jdGRnaGlta211Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDAzMTkzMCwiZXhwIjoyMDU5NjA3OTMwfQ.Bg1_HMnnTfWMpS9J982nDd5thQChuCALriF5-hfJwrY';
const supabase = createClient(supabaseUrl, supabaseKey);

// Enable CORS for your domain with improved settings
app.use(cors({
  origin: ['https://tennesseefeeds.com', 'http://localhost:3000', 'http://127.0.0.1:5500'],
  credentials: true
}));

// Add this to handle OPTIONS requests (for CORS preflight)
app.options('*', cors());

// ADD THE NEW CORS HEADERS RIGHT HERE
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Accept');
  next();
});

// Enable JSON parsing for request bodies
app.use(express.json());

// Helper function to generate a short unique ID
function generateShortId(length = 8) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

// User identification endpoint
app.post('/api/identify-user', express.json(), async (req, res) => {
  try {
    const { userId, username, fingerprint, ipAddress } = req.body;
    
    if (!fingerprint) {
      return res.status(400).json({
        success: false,
        error: 'Fingerprint is required'
      });
    }
    
    let user = null;
    
    if (userId) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (!error && data) {
        user = data;
        
        if (user.fingerprint_id !== fingerprint || user.last_ip_address !== ipAddress) {
          const { error: updateError } = await supabase
            .from('users')
            .update({
              fingerprint_id: fingerprint,
              last_ip_address: ipAddress,
              updated_at: new Date()
            })
            .eq('id', user.id);
            
          if (updateError) {
            console.error('Error updating user:', updateError);
          }
        }
      }
    }
    
    if (!user) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('fingerprint_id', fingerprint)
        .single();
        
      if (!error && data) {
        user = data;
        
        const { error: updateError } = await supabase
          .from('users')
          .update({
            last_ip_address: ipAddress,
            updated_at: new Date()
          })
          .eq('id', user.id);
          
        if (updateError) {
          console.error('Error updating user:', updateError);
        }
      }
    }
    
    if (!user) {
      const { data, error } = await supabase
        .from('users')
        .insert({
          username: username || 'Anonymous',
          fingerprint_id: fingerprint,
          last_ip_address: ipAddress
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

// Track share endpoint
app.post('/api/track-share', express.json(), async (req, res) => {
  try {
    const { 
      articleId, 
      userId, 
      title, 
      description, 
      source, 
      url, 
      image,
      platform
    } = req.body;
    
    if (!articleId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: articleId'
      });
    }
    
    const shareId = generateShortId();
    
    try {
      const dataDir = path.join(__dirname, 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      const shareFile = path.join(dataDir, `share_${shareId}.json`);
      const shareData = {
        shareId,
        articleId,
        title: title || 'Shared Article',
        description: description || '',
        source: source || 'Unknown Source',
        url: url || '',
        image: image || '',
        platform: platform || 'web',
        createdAt: new Date().toISOString()
      };
      
      fs.writeFileSync(shareFile, JSON.stringify(shareData, null, 2));
    } catch (fileError) {
      console.error('Error saving share to file:', fileError);
    }
    
    const apiDomain = process.env.API_DOMAIN || 'https://share.tennesseefeeds.com';
    const shareUrl = `${apiDomain}/share/${shareId}`;
    
    try {
      let article = null;
      const { data: existingArticle, error: articleError } = await supabase
        .from('articles')
        .select('id')
        .eq('article_id', articleId)
        .single();

      if (articleError) {
        const { data: newArticle, error: createError } = await supabase
          .from('articles')
          .upsert({
            article_id: articleId,
            title: title || 'Shared Article',
            source: source || 'Unknown Source',
            url: url || '',
            description: description || '',
            image_url: image || ''
          }, {
            onConflict: 'article_id',
            ignoreDuplicates: false
          })
          .select()
          .single();
          
        if (!createError) {
          article = newArticle;
        }
      } else {
        article = existingArticle;
      }
      
      if (article) {
        const { data: defaultUser } = await supabase
          .from('users')
          .select('id')
          .eq('username', 'Admin')
          .single();
          
        const effectiveUserId = userId || (defaultUser ? defaultUser.id : null) || '00000000-0000-0000-0000-000000000000';
        
        await supabase
          .from('shares')
          .upsert({
            share_id: shareId,
            article_id: article.id,
            user_id: effectiveUserId,
            platform: platform || 'web',
            created_at: new Date()
          }, {
            onConflict: 'share_id',
            ignoreDuplicates: false
          });
      }
    } catch (dbError) {
      console.error('Database operation error:', dbError);
    }
    
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

// List of Tennessee news sources
const tennesseeSources = [
  {
    name: "WSMV Nashville",
    url: "https://rss.app/feeds/0JFSdrkystYHqjfx.xml",
    region: "Nashville",
    category: "News"
  }
  // ... rest of sources
];

// Clean HTML and limit text length
function cleanDescription(html, maxLength = 200) {
  if (!html) return '';
  const text = html.replace(/<[^>]*>/g, "").trim();
  return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
}

// Extract image from content
function extractImage(content) {
  if (!content) return null;
  try {
    const $ = cheerio.load(content);
    const img = $('img').first();
    return img && img.attr('src') ? img.attr('src') : null;
  } catch (error) {
    console.error('Error extracting image:', error);
    return null;
  }
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
    
    let feed;
    try {
      feed = await parser.parseString(response.data);
    } catch (parseError) {
      const result = await xml2js.parseStringPromise(response.data);
      feed = {
        items: result.rss?.channel[0]?.item?.map(item => ({
          title: item.title?.[0],
          link: item.link?.[0],
          content: item.description?.[0],
          isoDate: item.pubDate?.[0],
          category: item.category?.[0] || null
        })) || []
      };
    }
    
    return feed.items.map(item => ({
      title: item.title,
      link: item.link,
      description: cleanDescription(item.content || item['content:encoded'] || item.description),
      pubDate: item.isoDate ? new Date(item.isoDate).toISOString() : new Date().toISOString(),
      source: source.name,
      region: source.region,
      category: item.category || source.category,
      image: extractImage(item.content || item['content:encoded'])
    }));
  } catch (error) {
    console.error(`Error fetching feed from ${source.name}:`, error.message);
    return [];
  }
}

// API endpoint for all feeds
app.get('/api/feeds', async (req, res) => {
  try {
    const feedPromises = tennesseeSources.map(source => fetchRssFeed(source));
    const results = await Promise.allSettled(feedPromises);
    
    let allArticles = [];
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        allArticles = [...allArticles, ...result.value];
      } else {
        console.error(`Failed to fetch ${tennesseeSources[index].name}: ${result.reason}`);
      }
    });
    
    allArticles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    
    res.set('Cache-Control', 'public, max-age=600');
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

// API endpoint for health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Start the server
app.listen(port, () => {
  console.log(`TennesseeFeeds API server running on port ${port}`);
});
