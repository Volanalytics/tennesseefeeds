// Static Sample Data for TennesseeFeeds.com
// Add this script to your index.html to display sample content during development

document.addEventListener('DOMContentLoaded', () => {
    // Sample news articles data
    const sampleArticles = [
        {
            title: "Nashville's Music Row Historic Preservation Project Receives $3M Grant",
            link: "#article1",
            description: "The Music Row Preservation Foundation announced today that it has received a major grant to help preserve historic music studios in the district.",
            source: "Nashville Public Radio",
            pubDate: "4 hours ago",
            region: "Nashville",
            category: "Arts & Culture"
        },
        {
            title: "Tennessee Volunteers Add Five-Star Quarterback to 2026 Recruiting Class",
            link: "#article2",
            description: "The University of Tennessee football program received a major commitment from one of the nation's top-rated quarterback prospects for the 2026 recruiting class.",
            source: "Knoxville News Sentinel",
            pubDate: "6 hours ago",
            region: "Knoxville",
            category: "Sports"
        },
        {
            title: "New Memphis BBQ Trail Map Features 22 Essential Restaurants",
            link: "#article3",
            description: "The Memphis Tourism Board has released its 2025 BBQ Trail map featuring 22 must-visit BBQ joints across the city and surrounding areas.",
            source: "Memphis Commercial Appeal",
            pubDate: "8 hours ago",
            region: "Memphis",
            category: "Food"
        },
        {
            title: "Chattanooga's Riverwalk Extension Project Enters Final Phase",
            link: "#article4",
            description: "The final phase of Chattanooga's ambitious Riverwalk extension project begins next month, promising to add 3.5 miles of scenic paths along the Tennessee River.",
            source: "Chattanooga Times Free Press",
            pubDate: "10 hours ago",
            region: "Chattanooga",
            category: "Development"
        },
        {
            title: "Governor Signs New Education Funding Bill for Tennessee Schools",
            link: "#article5",
            description: "Tennessee's governor signed a new education funding bill today that will increase per-pupil spending and provide additional resources for rural schools.",
            source: "Tennessee State News",
            pubDate: "12 hours ago",
            region: "Nashville",
            category: "Politics"
        }
    ];

    // Function to render articles to DOM
    function renderSampleArticles() {
        const newsFeed = document.querySelector('.news-feed');
        if (!newsFeed) return;
        
        // Clear existing placeholder content except the heading
        const heading = newsFeed.querySelector('h2');
        newsFeed.innerHTML = '';
        newsFeed.appendChild(heading);
        
        // Add each sample article
        sampleArticles.forEach(article => {
            const articleDiv = document.createElement('div');
            articleDiv.className = 'news-item';
            
            articleDiv.innerHTML = `
                <h3><a href="${article.link}">${article.title}</a></h3>
                <div class="source">Source: ${article.source} • ${article.pubDate}</div>
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
            
            newsFeed.appendChild(articleDiv);
        });
        
        // Initialize interactions
        initializeInteractions();
    }

    // Function to initialize interaction features
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
                    newComment.innerHTML = `
                        <div class="user">Guest${Math.floor(Math.random() * 1000)}</div>
                        <p>${input.value}</p>
                    `;
                    commentsContainer.prepend(newComment);
                    input.value = '';
                }
            });
        });
    }

    // Function to make navigation work
    function setupNavigation() {
        const navLinks = document.querySelectorAll('nav a');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Remove active class from all links
                navLinks.forEach(l => l.classList.remove('active'));
                
                // Add active class to clicked link
                link.classList.add('active');
                
                const region = link.textContent.trim();
                console.log(`Filtering for region: ${region}`);
                
                // Filter articles based on region
                if (region === 'Home' || region === 'All Tennessee') {
                    renderSampleArticles(); // Show all articles
                } else {
                    // Filter and display only articles from selected region
                    const filteredArticles = sampleArticles.filter(article => 
                        article.region.toLowerCase() === region.toLowerCase()
                    );
                    
                    const newsFeed = document.querySelector('.news-feed');
                    if (!newsFeed) return;
                    
                    // Preserve the heading
                    const heading = newsFeed.querySelector('h2');
                    newsFeed.innerHTML = '';
                    newsFeed.appendChild(heading);
                    
                    if (filteredArticles.length === 0) {
                        const noContent = document.createElement('p');
                        noContent.textContent = `No articles found for ${region}. Check back later!`;
                        newsFeed.appendChild(noContent);
                    } else {
                        filteredArticles.forEach(article => {
                            const articleDiv = document.createElement('div');
                            articleDiv.className = 'news-item';
                            
                            articleDiv.innerHTML = `
                                <h3><a href="${article.link}">${article.title}</a></h3>
                                <div class="source">Source: ${article.source} • ${article.pubDate}</div>
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
                            
                            newsFeed.appendChild(articleDiv);
                        });
                    }
                    
                    initializeInteractions();
                }
            });
        });
    }

    // Initialize the page
    renderSampleArticles();
    setupNavigation();
});
