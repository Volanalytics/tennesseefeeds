// search.js - Search functionality for TennesseeFeeds.com
(function() {
    /**
     * Initialize search functionality
     */
    function initSearch() {
        const searchInput = document.getElementById('search-input');
        const searchButton = document.getElementById('search-button');
        const mobileSearchInput = document.getElementById('mobile-search-input');
        const mobileSearchButton = document.getElementById('mobile-search-button');
        const searchResults = document.getElementById('search-results');
        const searchOverlay = document.getElementById('search-overlay');
        const closeSearchButton = document.getElementById('close-search-button');
        
        // Set up event listeners for desktop search
        if (searchButton && searchInput) {
            searchButton.addEventListener('click', () => {
                performSearch(searchInput.value);
            });
            
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    performSearch(searchInput.value);
                }
            });
        }
        
        // Set up event listeners for mobile search
        if (mobileSearchButton && mobileSearchInput) {
            mobileSearchButton.addEventListener('click', () => {
                performSearch(mobileSearchInput.value);
                
                // Close mobile menu after search
                const mobileMenu = document.getElementById('mobile-menu');
                if (mobileMenu && mobileMenu.classList.contains('show')) {
                    mobileMenu.classList.remove('show');
                    document.body.style.overflow = '';
                }
            });
            
            mobileSearchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    performSearch(mobileSearchInput.value);
                    
                    // Close mobile menu after search
                    const mobileMenu = document.getElementById('mobile-menu');
                    if (mobileMenu && mobileMenu.classList.contains('show')) {
                        mobileMenu.classList.remove('show');
                        document.body.style.overflow = '';
                    }
                }
            });
        }
        
        // Close search overlay
        if (closeSearchButton && searchOverlay) {
            closeSearchButton.addEventListener('click', () => {
                searchOverlay.classList.add('hidden');
            });
            
            // Also close when clicking outside the results
            searchOverlay.addEventListener('click', (e) => {
                if (e.target === searchOverlay) {
                    searchOverlay.classList.add('hidden');
                }
            });
        }
        
        // Handle keyboard shortcut (Ctrl+K or Command+K) to focus search
        document.addEventListener('keydown', (e) => {
            // Check for Ctrl+K or Command+K
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                
                // Focus the appropriate search input based on viewport size
                if (window.innerWidth >= 768 && searchInput) {
                    searchInput.focus();
                } else if (mobileSearchInput) {
                    // For mobile, also open the mobile menu first
                    const mobileMenu = document.getElementById('mobile-menu');
                    if (mobileMenu) {
                        mobileMenu.classList.add('show');
                        document.body.style.overflow = 'hidden';
                    }
                    
                    // Then focus the search input
                    mobileSearchInput.focus();
                }
            }
            
            // Close search with Escape
            if (e.key === 'Escape' && searchOverlay && !searchOverlay.classList.contains('hidden')) {
                searchOverlay.classList.add('hidden');
            }
        });
    }

    /**
     * Perform search across articles
     * @param {string} query - Search query
     */
    function performSearch(query) {
        if (!query || query.trim() === '') {
            alert('Please enter a search term');
            return;
        }
        
        const searchOverlay = document.getElementById('search-overlay');
        const searchResults = document.getElementById('search-results');
        const searchTerm = document.getElementById('search-term');
        
        // Show search UI
        if (searchOverlay && searchResults) {
            searchOverlay.classList.remove('hidden');
            searchResults.innerHTML = `
                <div class="text-center py-4">
                    <div class="inline-block animate-spin h-6 w-6 border-2 border-neutral-300 border-t-neutral-600 rounded-full"></div>
                    <p class="text-sm text-neutral-500 mt-2">Searching...</p>
                </div>
            `;
            
            if (searchTerm) {
                searchTerm.textContent = query;
            }
        }
        
        // Get our articles from either window.allArticles or localStorage
        let allArticles = [];
        
        if (window.allArticles && Array.isArray(window.allArticles)) {
            allArticles = window.allArticles;
        } else {
            try {
                const cachedData = localStorage.getItem('tennesseefeeds_cache');
                if (cachedData) {
                    const data = JSON.parse(cachedData);
                    if (data.articles && Array.isArray(data.articles)) {
                        allArticles = data.articles;
                    }
                }
            } catch (e) {
                console.error('Error accessing cached articles:', e);
            }
        }
        
        if (allArticles.length === 0) {
            if (searchResults) {
                searchResults.innerHTML = `
                    <div class="text-center py-4">
                        <p class="text-neutral-600">No articles available for search. Please refresh the page.</p>
                    </div>
                `;
            }
            return;
        }
        
        // Perform the actual search
        const queryLower = query.toLowerCase();
        const matchedArticles = allArticles.filter(article => {
            const title = article.title ? article.title.toLowerCase() : '';
            const description = article.description ? article.description.toLowerCase() : '';
            const source = article.source ? article.source.toLowerCase() : '';
            const category = article.category ? article.category.toLowerCase() : '';
            
            return title.includes(queryLower) || 
                description.includes(queryLower) || 
                source.includes(queryLower) ||
                category.includes(queryLower);
        });
        
        // Display results
        if (searchResults) {
            if (matchedArticles.length === 0) {
                searchResults.innerHTML = `
                    <div class="text-center py-8">
                        <p class="text-neutral-600">No articles found matching "${query}"</p>
                        <p class="text-sm text-neutral-500 mt-2">Try a different search term</p>
                    </div>
                `;
            } else {
                // Render matched articles
                searchResults.innerHTML = `
                    <div class="mb-4 text-neutral-600">
                        Found ${matchedArticles.length} articles matching "${query}"
                    </div>
                    <div class="grid md:grid-cols-2 gap-4" id="search-results-grid"></div>
                `;
                
                const resultsGrid = document.getElementById('search-results-grid');
                
                if (resultsGrid) {
                    // Render first 10 matches (or all if less than 10)
                    const articlesToShow = matchedArticles.slice(0, 10);
                    
                    articlesToShow.forEach(article => {
                        const articleElement = document.createElement('div');
                        articleElement.className = 'search-result-item bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow mb-4';
                        
                        const articleId = article.link.replace(/[^a-zA-Z0-9]/g, '-');
                        
                        // Format date
                        let formattedDate = '';
                        try {
                            const date = new Date(article.pubDate);
                            formattedDate = date.toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                            });
                        } catch (e) {
                            formattedDate = article.pubDate || '';
                        }
                        
                        // Category badge
                        const categoryBadge = article.category ? 
                            `<span class="ml-2 px-2 py-0.5 bg-neutral-200 text-neutral-700 rounded-full text-xs">${article.category}</span>` : 
                            '';
                        
                        articleElement.innerHTML = `
                            <div class="p-4" data-article-id="${articleId}">
                                <div class="flex justify-between items-start mb-2">
                                    <div class="flex items-center">
                                        <span class="text-sm text-neutral-500">${article.source || 'Unknown Source'}</span>
                                        ${categoryBadge}
                                    </div>
                                    <span class="text-sm text-neutral-500">${formattedDate}</span>
                                </div>
                                <h3 class="text-lg font-bold text-neutral-800 mb-2">
                                    <a href="${article.link}" class="hover:text-neutral-600 transition-colors article-link" data-article-id="${articleId}">
                                        ${article.title}
                                    </a>
                                </h3>
                                <p class="text-neutral-600 text-sm line-clamp-2">${article.description || ''}</p>
                                <div class="mt-2 text-right">
                                    <a href="#" class="view-article text-sm text-blue-600 hover:text-blue-800" data-article-id="${articleId}">View article</a>
                                </div>
                            </div>
                        `;
                        
                        resultsGrid.appendChild(articleElement);
                    });
                    
                    // If we have more than 10 results, add a "Show more" button
                    if (matchedArticles.length > 10) {
                        const showMoreButton = document.createElement('div');
                        showMoreButton.className = 'col-span-full text-center mt-4';
                        showMoreButton.innerHTML = `
                            <button class="bg-neutral-700 text-white px-4 py-2 rounded-md hover:bg-neutral-600 transition-colors" id="show-more-results">
                                Show More Results (${matchedArticles.length - 10} more)
                            </button>
                        `;
                        
                        resultsGrid.parentNode.appendChild(showMoreButton);
                        
                        // Add show more functionality
                        document.getElementById('show-more-results').addEventListener('click', function() {
                            // Remove the button
                            this.parentNode.remove();
                            
                            // Add the next batch of results
                            const nextBatch = matchedArticles.slice(10, 30);
                            
                            nextBatch.forEach(article => {
                                const articleElement = document.createElement('div');
                                articleElement.className = 'search-result-item bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow mb-4';
                                
                                const articleId = article.link.replace(/[^a-zA-Z0-9]/g, '-');
                                
                                let formattedDate = '';
                                try {
                                    const date = new Date(article.pubDate);
                                    formattedDate = date.toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric'
                                    });
                                } catch (e) {
                                    formattedDate = article.pubDate || '';
                                }
                                
                                const categoryBadge = article.category ? 
                                    `<span class="ml-2 px-2 py-0.5 bg-neutral-200 text-neutral-700 rounded-full text-xs">${article.category}</span>` : 
                                    '';
                                
                                articleElement.innerHTML = `
                                    <div class="p-4" data-article-id="${articleId}">
                                        <div class="flex justify-between items-start mb-2">
                                            <div class="flex items-center">
                                                <span class="text-sm text-neutral-500">${article.source || 'Unknown Source'}</span>
                                                ${categoryBadge}
                                            </div>
                                            <span class="text-sm text-neutral-500">${formattedDate}</span>
                                        </div>
                                        <h3 class="text-lg font-bold text-neutral-800 mb-2">
                                            <a href="${article.link}" class="hover:text-neutral-600 transition-colors article-link" data-article-id="${articleId}">
                                                ${article.title}
                                            </a>
                                        </h3>
                                        <p class="text-neutral-600 text-sm line-clamp-2">${article.description || ''}</p>
                                        <div class="mt-2 text-right">
                                            <a href="#" class="view-article text-sm text-blue-600 hover:text-blue-800" data-article-id="${articleId}">View article</a>
                                        </div>
                                    </div>
                                `;
                                
                                resultsGrid.appendChild(articleElement);
                            });
                            
                            // If there are still more results, add another show more button
                            if (matchedArticles.length > 30) {
                                const showEvenMoreButton = document.createElement('div');
                                showEvenMoreButton.className = 'col-span-full text-center mt-4';
                                showEvenMoreButton.innerHTML = `
                                    <button class="bg-neutral-700 text-white px-4 py-2 rounded-md hover:bg-neutral-600 transition-colors" id="show-even-more-results">
                                        Show All Results (${matchedArticles.length - 30} more)
                                    </button>
                                `;
                                
                                resultsGrid.parentNode.appendChild(showEvenMoreButton);
                                
                                // Add functionality for the second "show more" button
                                document.getElementById('show-even-more-results').addEventListener('click', function() {
                                    // Remove the button
                                    this.parentNode.remove();
                                    
                                    // Add all remaining results
                                    const remainingResults = matchedArticles.slice(30);
                                    
                                    remainingResults.forEach(article => {
                                        const articleElement = document.createElement('div');
                                        articleElement.className = 'search-result-item bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow mb-4';
                                        
                                        const articleId = article.link.replace(/[^a-zA-Z0-9]/g, '-');
                                        
                                        let formattedDate = '';
                                        try {
                                            const date = new Date(article.pubDate);
                                            formattedDate = date.toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric'
                                            });
                                        } catch (e) {
                                            formattedDate = article.pubDate || '';
                                        }
                                        
                                        const categoryBadge = article.category ? 
                                            `<span class="ml-2 px-2 py-0.5 bg-neutral-200 text-neutral-700 rounded-full text-xs">${article.category}</span>` : 
                                            '';
                                        
                                        articleElement.innerHTML = `
                                            <div class="p-4" data-article-id="${articleId}">
                                                <div class="flex justify-between items-start mb-2">
                                                    <div class="flex items-center">
                                                        <span class="text-sm text-neutral-500">${article.source || 'Unknown Source'}</span>
                                                        ${categoryBadge}
                                                    </div>
                                                    <span class="text-sm text-neutral-500">${formattedDate}</span>
                                                </div>
                                                <h3 class="text-lg font-bold text-neutral-800 mb-2">
                                                    <a href="${article.link}" class="hover:text-neutral-600 transition-colors article-link" data-article-id="${articleId}">
                                                        ${article.title}
                                                    </a>
                                                </h3>
                                                <p class="text-neutral-600 text-sm line-clamp-2">${article.description || ''}</p>
                                                <div class="mt-2 text-right">
                                                    <a href="#" class="view-article text-sm text-blue-600 hover:text-blue-800" data-article-id="${articleId}">View article</a>
                                                </div>
                                            </div>
                                        `;
                                        
                                        resultsGrid.appendChild(articleElement);
                                    });
                                });
                            }
                            
                            // Add new event listeners to view article links
                            setupViewArticleLinks();
                        });
                    }
                    
                    // Add event listeners to the view article links
                    setupViewArticleLinks();
                    
                    function setupViewArticleLinks() {
                        document.querySelectorAll('.view-article').forEach(link => {
                            link.addEventListener('click', async function(e) {
                                e.preventDefault();
                                
                                const articleId = this.dataset.articleId;
                                if (articleId) {
                                    // If article system is available, use it to display article
                                    if (window.ArticleSystem && window.ArticleSystem.fetchArticleById) {
                                        const article = await window.ArticleSystem.fetchArticleById(articleId);
                                        
                                        if (article && window.ArticleSystem.showArticleView) {
                                            window.ArticleSystem.showArticleView(article);
                                            
                                            // Close the search overlay
                                            if (searchOverlay) {
                                                searchOverlay.classList.add('hidden');
                                            }
                                        }
                                    }
                                }
                            });
                        });
                    }
                }
            }
            
            // Clear search inputs
            if (searchInput) searchInput.value = '';
            if (mobileSearchInput) mobileSearchInput.value = '';
        }
    }

    // Initialize search on page load
    document.addEventListener('DOMContentLoaded', initSearch);

    // Export the search functionality
    window.SearchFunctions = {
        init: initSearch,
        performSearch: performSearch
    };
})();
