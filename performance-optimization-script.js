// Performance and SEO Optimization Script

// Lazy Loading for Images
function lazyLoadImages() {
    const images = document.querySelectorAll('img');
    const options = {
        rootMargin: '0px',
        threshold: 0.1
    };

    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const image = entry.target;
                // Only change src if data-src exists
                if (image.dataset.src) {
                    image.src = image.dataset.src;
                    image.removeAttribute('data-src');
                }
                image.classList.add('loaded');
                observer.unobserve(image);
            }
        });
    }, options);

    images.forEach(image => {
        // Modify existing HTML to support lazy loading
        if (image.src) {
            image.setAttribute('data-src', image.src);
            image.src = ''; // Clear src initially
        }
        imageObserver.observe(image);
    });
}

// Caching Strategy
function implementCaching() {
    if ('caches' in window) {
        caches.open('tennessee-feeds-v1').then(cache => {
            cache.add('/');
            cache.add(apiUrl); // Use the existing apiUrl variable
        }).catch(error => {
            console.error('Caching failed:', error);
        });
    }
}

// Prefetch Critical Resources
function prefetchResources() {
    const prefetchLinks = [
        apiUrl, // Use the existing apiUrl variable
        'https://tennesseefeeds-api.onrender.com/api/comments'
    ];

    prefetchLinks.forEach(link => {
        const prefetch = document.createElement('link');
        prefetch.rel = 'prefetch';
        prefetch.href = link;
        document.head.appendChild(prefetch);
    });
}

// Optimization Master Function
function optimizeSite() {
    // Lazy load images after initial page load
    window.addEventListener('load', () => {
        lazyLoadImages();
        implementCaching();
        prefetchResources();
    });

    // Performance tracking for fetchArticles
    const originalFetchArticles = fetchArticles;
    window.fetchArticles = async function() {
        try {
            // Add performance tracking
            const startTime = performance.now();
            await originalFetchArticles();
            const endTime = performance.now();
            console.log(`Fetch articles took ${endTime - startTime} milliseconds`);
        } catch (error) {
            console.error('Optimized fetch failed:', error);
        }
    };
}

// Initialize optimization when DOM is ready
document.addEventListener('DOMContentLoaded', optimizeSite);
