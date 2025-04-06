import React, { useState, useEffect } from 'react';
import './App.css';

// Component imports
import Header from './components/Header';
import NewsFeed from './components/NewsFeed';
import Sidebar from './components/Sidebar';
import Footer from './components/Footer';
import { fetchNewsFromSources } from './utils/newsApi';

function App() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeRegion, setActiveRegion] = useState('all');
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    const loadNews = async () => {
      try {
        setLoading(true);
        const newsData = await fetchNewsFromSources();
        setNews(newsData);
        setError(null);
      } catch (err) {
        console.error('Error fetching news:', err);
        setError('Failed to load news. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadNews();

    // Refresh news every 30 minutes
    const interval = setInterval(loadNews, 30 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Filter news based on active region and category
  const filteredNews = news.filter(item => {
    const regionMatch = activeRegion === 'all' || item.region === activeRegion;
    const categoryMatch = activeCategory === 'all' || item.category === activeCategory;
    return regionMatch && categoryMatch;
  });

  // Handle region change
  const handleRegionChange = (region) => {
    setActiveRegion(region);
  };

  // Handle category change
  const handleCategoryChange = (category) => {
    setActiveCategory(category);
  };

  return (
    <div className="app">
      <Header 
        onRegionChange={handleRegionChange}
        activeRegion={activeRegion}
      />
      
      <main className="container main-content">
        <NewsFeed 
          news={filteredNews}
          loading={loading}
          error={error}
        />
        
        <Sidebar 
          onCategoryChange={handleCategoryChange}
          activeCategory={activeCategory}
        />
      </main>
      
      <Footer />
    </div>
  );
}

export default App;
