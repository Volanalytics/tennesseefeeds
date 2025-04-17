/**
 * Direct HTML Modification for Comment Links
 * 
 * This script directly modifies the comment buttons in the DOM
 * to transform them into actual links to the article page.
 * 
 * Add this code at the end of your HTML file or in a separate JS file.
 */

// Execute immediately when the script loads
(function() {
    // Function to transform comment buttons to links
    function transformCommentButtons() {
        console.log("Transforming comment buttons to links...");
        
        // Find all comment buttons
        document.querySelectorAll('.comment-btn').forEach(button => {
            // Skip if already transformed
            if (button.hasAttribute('data-transformed')) return;
            
            // Get article ID and parent element
            const articleId = button.getAttribute('data-article-id');
            const parentElement = button.parentElement;
            
            if (!articleId || !parentElement) return;
            
            // Get article title for better URL
            const articleCard = button.closest('.article-card, .bg-white');
            const titleElement = articleCard?.querySelector('h3 a');
            const title = titleElement?.textContent || '';
            
            // Create a real link element
            const linkElement = document.createElement('a');
            linkElement.className = button.className; // Copy classes
            linkElement.innerHTML = button.innerHTML; // Copy inner content
            
            // Set href to article page
            const baseUrl = window.location.href.split('?')[0]; // Remove any query params
            linkElement.href = `${baseUrl}?article=${encodeURIComponent(articleId)}&title=${encodeURIComponent(title)}`;
            
            // Copy relevant attributes
            Array.from(button.attributes).forEach(attr => {
                if (attr.name !== 'class' && attr.name !== 'data-transformed') {
                    linkElement.setAttribute(attr.name, attr.value);
                }
            });
            
            // Mark as transformed
            linkElement.setAttribute('data-transformed', 'true');
            
            // Replace the button with our link
            parentElement.replaceChild(linkElement, button);
            
            console.log("Transformed comment button for article:", articleId);
        });
    }
    
    // Run immediately
    transformCommentButtons();
    
    // Run again when DOM is fully loaded
    document.addEventListener('DOMContentLoaded', transformCommentButtons);
    
    // Set up observer to watch for new comment buttons
    const observer = new MutationObserver(mutations => {
        let shouldTransform = false;
        
        // Check if any new comment buttons were added
        mutations.forEach(mutation => {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === 1) { // Element node
                        // Check if it's a comment button or contains one
                        if (node.classList?.contains('comment-btn') || 
                            node.querySelector?.('.comment-btn')) {
                            shouldTransform = true;
                            break;
                        }
                    }
                }
            }
        });
        
        if (shouldTransform) {
            setTimeout(transformCommentButtons, 100); // Short delay to ensure DOM is updated
        }
    });
    
    // Start observing the entire body for new comment buttons
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    console.log("Direct HTML modification for comment links initialized");
})();
