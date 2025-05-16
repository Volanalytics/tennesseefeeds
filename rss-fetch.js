/**
 * TennesseeFeeds.com - Advanced RSS Feed Aggregator
 * This script fetches news from Tennessee sources via RSS-to-JSON API
 */

// Tennessee news sources
const tennesseeSources = [
  {
    name: "The Tennessean",
    feedUrl: "https://www.tennessean.com/rss/",
    region: "Nashville",
    category: "General"
  },
  {
    name: "Knoxville News Sentinel",
    feedUrl: "https://www.knoxnews.com/rss/",
    region: "Knoxville",
    category: "General"
  },
  {
    name: "Commercial Appeal",
    feedUrl: "https://www.commercialappeal.com/rss/",
    region: "Memphis",
    category: "General"
  },
  {
    name: "WKRN News",
    feedUrl: "https://www.wkrn.com/feed/",
    region: "Nashville",
    category: "General"
  },
  {
    name: "WBIR",
    feedUrl: "https://www.wbir.com/feeds/rss/news/local/",
    region: "Knoxville",
    category: "Local"
  }
];

// List of RSS-to-JSON API services
const rssProxyServices = [
  "https://api.rss2json.com/v1/api.json?rss_url=",
  "https://api.npoint.io/proxy/rss?url="
];

/**
 * Fetches RSS feed using a proxy service
 * @param {string} feedUrl - URL of the RSS feed
 * @param {string} source - Name of the source
 * @param {string} region - Region this source belongs to
 * @param {string} category - Category of content
 * @returns {Promise<Array>} - Array of articles
 */
async function fetchRssFeed(feedUrl, source, region, category) {
  // Try each proxy service until one works
  for (const proxyService of rssProxyServices) {
    try {
      const proxyUrl = `${proxyService}${encodeURIComponent(feedUrl)}`;
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        continue; // Try next service if this one fails
      }
      
      const data = await response.json();
      
      // Different services return data in different formats
      const items = data.items || data.feed?.entries || [];
      
      if (!items || items.length === 0) {
        continue;
      }
      
      // Process and normalize the data
      return items.map(item => {
        // Extract image if available
        let image = "";
        if (item.enclosure?.link) {
          image = item.enclosure.link;
        } else if (item.thumbnail) {
          image = item.thumbnail;
        } else if (item.media_content && item.media_content.length > 0) {
          image = item.media_content[0].url;
        } else if (item.description) {
          // Try to extract image from description
          const imgMatch = item.description.match(/<img[^>]+src="([^">]+)"/);
          if (imgMatch && imgMatch[1]) {
            image = imgMatch[1];
          }
        }
        
        // Clean description text (remove HTML tags)
        let description = item.description || item.content || "";
        description = description.replace(/<[^>]*>/g, "");
        description = description.length > 160 ? description.substring(0, 160) + "..." : description;
        
        // Format date
        const pubDate = item.pubDate || item.published || new Date().toISOString();
        const date = new Date(pubDate);
        const timeAgo = getTimeAgo(date);
        
        // Generate a deterministic article ID
        const generateArticleId = (url, title) => {
          const str = url + title;
          let hash = 0;
          for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
          }
          
          const part1 = Math.abs(hash).toString(16).padStart(8, '0');
          const part2 = Math.abs(hash >> 8).toString(16).padStart(4, '0');
          const part3 = Math.abs(hash >> 16).toString(16).padStart(4, '0');
          const part4 = Math.abs(hash >> 24).toString(16).padStart(12, '0');
          
          return `51-${part1}-${part2}-${part3}-${part4}`;
        };

        return {
          id: generateArticleId(item.link, item.title),
          title: item.title,
          link: item.link,
          description: description,
          pubDate: timeAgo,
          source: source,
          region: region,
          category: category,
          image: image
        };
      });
    } catch (error) {
      console.log(`Error with ${proxyService} for ${source}: ${error.message}`);
      continue; // Try next service
    }
  }
  
  console.log(`All proxy services failed for ${source}`);
  return []; // Return empty array if all services fail
}

/**
 * Convert date to "time ago" format
 * @param {Date} date - Date to convert
 * @returns {string} - Formatted time ago string
 */
function getTimeAgo(date) {
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
 * Fetch all RSS feeds and combine the results
 * @returns {Promise<Array>} - Combined array of articles from all sources
 */
async function fetchAllFeeds() {
  try {
    // Show loading state
    document.getElementById('loading-indicator').style.display = 'block';
    
    // Fetch all feeds concurrently
    const feedPromises = tennesseeSources.map(source => 
      fetchRssFeed(source.feedUrl, source.name, source.region, source.category)
    );
    
    // Wait for all feeds to be fetched
    const results = await Promise.allSettled(feedPromises);
    
    // Combine all articles and sort by date (newest first)
    let allArticles = [];
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        allArticles = [...allArticles, ...result.value];
      } else {
        console.error(`Failed to fetch ${tennesseeSources[index].name}: ${result.reason}`);
      }
    });
    
    // If no articles could be fetched, use sample data
    if (allArticles.length === 0) {
      console.log("No articles fetched, falling back to sample data");
      return getSampleArticles();
    }
    
    // Sort by date (newest first) - assumes pubDate is in the format "X time ago"
    // This is a simple heuristic sort, not perfect but works for our display
    return allArticles.sort((a, b) => {
      const aTime = a.pubDate.match(/\d+/)?.[0] || 0;
      const bTime = b.pubDate.match(/\d+/)?.[0] || 0;
      
      const aUnit = a.pubDate.includes('second') ? 1 :
                    a.pubDate.includes('minute') ? 60 :
                    a.pubDate.includes('hour') ? 3600 :
                    a.pubDate.includes('day') ? 86400 :
                    a.pubDate.includes('month') ? 2592000 : 31536000;
                    
      const bUnit = b.pubDate.includes('second') ? 1 :
                    b.pubDate.includes('minute') ? 60 :
                    b.pubDate.includes('hour') ? 3600 :
                    b.pubDate.includes('day') ? 86400 :
                    b.pubDate.includes('month') ? 2592000 : 31536000;
                    
      return (aTime * aUnit) - (bTime * bUnit);
    });
  } catch (error) {
    console.error("Error fetching feeds:", error);
    return getSampleArticles();
  } finally {
    // Hide loading indicator
    document.getElementById('loading-indicator').style.display = 'none';
  }
}

/**
 * Get sample articles as a fallback
 * @returns {Array} - Sample articles
 */
function getSampleArticles() {
  // Use the same ID generation function
  const generateArticleId = (url, title) => {
    const str = url + title;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    const part1 = Math.abs(hash).toString(16).padStart(8, '0');
    const part2 = Math.abs(hash >> 8).toString(16).padStart(4, '0');
    const part3 = Math.abs(hash >> 16).toString(16).padStart(4, '0');
    const part4 = Math.abs(hash >> 24).toString(16).padStart(12, '0');
    
    return `51-${part1}-${part2}-${part3}-${part4}`;
  };

  const articles = [
    {
      title: "Nashville's Music Row Historic Preservation Project Receives $3M Grant",
      link: "https://tennesseefeeds.com/articles/nashville-music-row-preservation",
      description: "The Music Row Preservation Foundation announced today that it has received a major grant to help preserve historic music studios in the district.",
      source: "Nashville Public Radio",
      pubDate: "4 hours ago",
      region: "Nashville",
      category: "Arts & Culture",
      image: ""
    },
    {
      title: "Tennessee Volunteers Add Five-Star Quarterback to 2026 Recruiting Class",
      link: "https://tennesseefeeds.com/articles/tennessee-volunteers-quarterback-recruit",
      description: "The University of Tennessee football program received a major commitment from one of the nation's top-rated quarterback prospects for the 2026 recruiting class.",
      source: "Knoxville News Sentinel",
      pubDate: "6 hours ago",
      region: "Knoxville",
      category: "Sports",
      image: ""
    },
    {
      title: "New Memphis BBQ Trail Map Features 22 Essential Restaurants",
      link: "https://tennesseefeeds.com/articles/memphis-bbq-trail-map",
      description: "The Memphis Tourism Board has released its 2025 BBQ Trail map featuring 22 must-visit BBQ joints across the city and surrounding areas.",
      source: "Memphis Commercial Appeal",
      pubDate: "8 hours ago",
      region: "Memphis",
      category: "Food",
      image: ""
    },
    {
      title: "Chattanooga's Riverwalk Extension Project Enters Final Phase",
      link: "https://tennesseefeeds.com/articles/chattanooga-riverwalk-extension",
      description: "The final phase of Chattanooga's ambitious Riverwalk extension project begins next month, promising to add 3.5 miles of scenic paths along the Tennessee River.",
      source: "Chattanooga Times Free Press",
      pubDate: "10 hours ago",
      region: "Chattanooga",
      category: "Development",
      image: ""
    },
    {
      title: "Governor Signs New Education Funding Bill for Tennessee Schools",
      link: "https://tennesseefeeds.com/articles/tennessee-education-funding-bill",
      description: "Tennessee's governor signed a new education funding bill today that will increase per-pupil spending and provide additional resources for rural schools.",
      source: "Tennessee State News",
      pubDate: "12 hours ago",
      region: "Nashville",
      category: "Politics",
      image: ""
    }
  ];

  // Add IDs to all articles
  return articles.map(article => ({
    ...article,
    id: generateArticleId(article.link, article.title)
  }));
}

// Make functions available globally
window.tennesseeFeeds = {
  fetchAllFeeds,
  getSampleArticles
};
