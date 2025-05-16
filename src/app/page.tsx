'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { generateEnhancedFingerprint } from '@/utils/fingerprint';
import { trackEvent, trackCustomEvent } from '@/utils/tracking';

interface Article {
  id: string;
  title: string;
  description: string;
  source: string;
  link: string;
  image?: string;
}

export default function Home() {
  const [fingerprint, setFingerprint] = useState<string>('');
  const [clickCount, setClickCount] = useState(0);
  const [articles, setArticles] = useState<Article[]>([]);

  useEffect(() => {
    const initializeFingerprint = async () => {
      const fp = await generateEnhancedFingerprint();
      setFingerprint(fp);
      trackEvent('pageview', '/');
    };

    const fetchArticles = async () => {
      try {
        const response = await fetch('/api/feeds');
        const data = await response.json();
        if (data.success && data.articles) {
          setArticles(data.articles.map((article: any) => ({
            id: generateArticleId(article.link, article.title),
            title: article.title,
            description: article.description,
            source: article.source,
            link: article.link,
            image: article.image
          })));
        }
      } catch (error) {
        console.error('Error fetching articles:', error);
      }
    };

    initializeFingerprint();
    fetchArticles();
  }, []);

  const generateArticleId = (link: string, title: string): string => {
    // Create a deterministic hash from link and title
    const str = link + title;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    // Create parts of the ID using different sections of the hash
    const part1 = Math.abs(hash).toString(16).padStart(8, '0');
    const part2 = Math.abs(hash >> 8).toString(16).padStart(4, '0');
    const part3 = Math.abs(hash >> 16).toString(16).padStart(4, '0');
    const part4 = Math.abs(hash >> 24).toString(16).padStart(12, '0');
    
    // Combine into UUID-like format (always starts with '51-' prefix)
    return `51-${part1}-${part2}-${part3}-${part4}`;
  };

  const handleTestClick = async () => {
    setClickCount(prev => prev + 1);
    await trackCustomEvent('/', 'interaction', 'test_button_click', {
      clickCount: clickCount + 1
    });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const input = form.querySelector('input') as HTMLInputElement;
    
    await trackEvent('form_submit', '/', {
      id: 'test-form',
      text: input.value
    });

    alert('Form submitted! Your interaction has been tracked.');
    input.value = '';
  };

  return (
    <main className="min-h-screen p-8 bg-background">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">Tennessee Feeds</h1>
        
        {/* Articles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {articles.map((article) => (
            <Card 
              key={article.id}
              className="article-card"
              data-article-id={article.id}
            >
              {article.image && (
                <div className="relative w-full h-48 overflow-hidden">
                  <img
                    src={article.image}
                    alt={article.title}
                    className="object-cover w-full h-full"
                  />
                </div>
              )}
              <CardHeader>
                <h3 className="text-lg font-semibold line-clamp-2">
                  <a 
                    href={`/index.html?article=${generateArticleId(article.link, article.title)}&title=${encodeURIComponent(article.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}`} 
                    className="hover:underline"
                  >
                    {article.title}
                  </a>
                </h3>
                <p className="text-sm text-neutral-500">{article.source}</p>
              </CardHeader>
              <CardContent>
                <p className="text-neutral-600 line-clamp-3">{article.description}</p>
              </CardContent>
              <CardFooter className="flex justify-between">
                <a
                  href={`/index.html?article=${article.id}&title=${encodeURIComponent(article.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}`}
                  className="text-sm text-primary hover:underline"
                >
                  Read More
                </a>
                <button 
                  className="share-btn text-sm text-neutral-500 hover:text-neutral-700"
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    // Get article data
                    const articleId = article.id;  // UUID format for API
                    const title = article.title;
                    const description = article.description;
                    const source = article.source;
                    // Use the same URL format as the article links
                    const url = `https://tennesseefeeds.com/index.html?article=${articleId}&title=${encodeURIComponent(title.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}`;
                    const image = article.image || '';

                    try {
                      const response = await fetch('/api/track-share', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                          articleId,
                          title,
                          description,
                          source,
                          url,
                          image,
                          platform: 'web'
                        })
                      });

                      const result = await response.json();

                      if (result.success && result.shareUrl) {
                        // Remove any existing share modals
                        const existingModal = document.getElementById('share-modal');
                        if (existingModal) {
                          existingModal.remove();
                        }

                        // Create and show share modal
                        const modal = document.createElement('div');
                        modal.id = 'share-modal';
                        modal.className = 'fixed inset-0 flex items-center justify-center z-50';
                        modal.innerHTML = `
                          <div class="absolute inset-0 bg-black bg-opacity-50" id="modal-overlay"></div>
                          <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4 relative z-10">
                            <div class="flex justify-between items-center mb-4">
                              <h3 class="text-lg font-bold">Share Article</h3>
                              <button id="close-share-modal" class="text-neutral-500 hover:text-neutral-700">
                                <i class="fas fa-times"></i>
                              </button>
                            </div>
                            <div class="mb-4">
                              <input id="share-url" type="text" value="${result.shareUrl}" class="w-full px-3 py-2 border rounded-md bg-neutral-100" readonly>
                            </div>
                            <div class="flex flex-wrap justify-center gap-2 mb-4">
                              <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(result.shareUrl)}" target="_blank" class="bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700">
                                <i class="fab fa-facebook-f mr-2"></i>Facebook
                              </a>
                              <a href="https://twitter.com/intent/tweet?url=${encodeURIComponent(result.shareUrl)}&text=${encodeURIComponent(title)}" target="_blank" class="bg-blue-400 text-white px-3 py-2 rounded-md hover:bg-blue-500">
                                <i class="fab fa-twitter mr-2"></i>Twitter
                              </a>
                              <a href="mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent('Check out this article: ' + result.shareUrl)}" class="bg-neutral-600 text-white px-3 py-2 rounded-md hover:bg-neutral-700">
                                <i class="fas fa-envelope mr-2"></i>Email
                              </a>
                            </div>
                            <button id="copy-share-url" class="w-full bg-neutral-700 text-white px-4 py-2 rounded-md hover:bg-neutral-600">
                              <i class="fas fa-copy mr-2"></i>Copy Link
                            </button>
                          </div>
                        `;
                        
                        document.body.appendChild(modal);
                        
                        // Set up event listeners
                        document.getElementById('modal-overlay')?.addEventListener('click', () => {
                          modal.remove();
                        });
                        
                        document.getElementById('close-share-modal')?.addEventListener('click', () => {
                          modal.remove();
                        });
                        
                        document.getElementById('copy-share-url')?.addEventListener('click', function() {
                          const shareUrlInput = document.getElementById('share-url') as HTMLInputElement;
                          shareUrlInput.select();
                          document.execCommand('copy');
                          
                          const button = this as HTMLButtonElement;
                          button.innerHTML = '<i class="fas fa-check mr-2"></i>Copied!';
                          setTimeout(() => {
                            button.innerHTML = '<i class="fas fa-copy mr-2"></i>Copy Link';
                          }, 2000);
                        });
                        
                        // Select the URL text for easy copying
                        setTimeout(() => {
                          const shareUrlInput = document.getElementById('share-url') as HTMLInputElement;
                          if (shareUrlInput) {
                            shareUrlInput.focus();
                            shareUrlInput.select();
                          }
                        }, 100);
                      } else {
                        throw new Error('Failed to create share link');
                      }
                    } catch (error) {
                      console.error('Error sharing article:', error);
                      alert('Sorry, there was a problem sharing this article. Please try again later.');
                    }
                  }}
                >
                  <i className="fas fa-share-alt mr-1"></i>
                  Share
                </button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Tracking Info Card */}
        <Card className="w-full">
          <CardHeader>
            <h2 className="text-2xl font-semibold">Tracking Information</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Your Fingerprint:</p>
              <p className="font-mono text-sm bg-muted p-2 rounded-md break-all">{fingerprint}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Test Interaction Tracking:</p>
              <button
                onClick={handleTestClick}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90"
                id="test-button"
              >
                Click me! ({clickCount} clicks)
              </button>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Test Form Submission:</p>
              <form 
                onSubmit={handleFormSubmit}
                className="space-y-2"
                id="test-form"
              >
                <input 
                  type="text" 
                  placeholder="Type something..."
                  className="w-full px-3 py-2 border rounded-md"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                  Submit Form
                </button>
              </form>
            </div>
            <p className="text-sm text-muted-foreground">
              This unique identifier helps us improve your experience while maintaining privacy.
              We use advanced browser fingerprinting techniques to ensure accuracy.
            </p>
          </CardContent>
          <CardFooter className="border-t pt-6">
            <p className="text-xs text-muted-foreground">
              Your data is securely stored and never shared with third parties.
              Analytics dashboard access is restricted to authenticated administrators only.
            </p>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
