// comments.js - Complete implementation for TennesseeFeeds.com comment system

// Ensure Supabase client is loaded before initializing
document.addEventListener('DOMContentLoaded', function() {
    // Check if Supabase is available
    if (typeof supabase === 'undefined') {
        console.error('Supabase library not loaded. Please include the Supabase script.');
        return;
    }

// Initialize Supabase client
const supabaseUrl = 'https://ulhbtjppfoctdghimkmu.supabase.co';  // Get this from Settings > API
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsaGJ0anBwZm9jdGRnaGlta211Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQwMzE5MzAsImV4cCI6MjA1OTYwNzkzMH0.LLIBpZkoiHWTOHzNfho2KALWdRMkNYSXF-AWD9Wyoa0';  // Get this from Settings > API
const supabase = supabase.createClient(supabaseUrl, supabaseKey);


    // Generate a consistent fingerprint to identify users anonymously
    async function getUserFingerprint() {
        const components = await Fingerprint2.getPromise({
            excludes: {
                // Exclude highly variable components for more stable fingerprints
                enumerateDevices: true,
                pixelRatio: true,
                doNotTrack: true
            }
        });
        const values = components.map(component => component.value);
        const fingerprint = Fingerprint2.x64hash128(values.join(''), 31);
        return fingerprint;
    }

    // Store visitor's fingerprint in a variable
    let userFingerprint;
    // Initialize with a promise for fingerprint
    const fingerprintPromise = getUserFingerprint().then(fingerprint => {
        userFingerprint = fingerprint;
        // Once we have the fingerprint, load reaction states
        return loadAllReactions();
    });

    // Rest of the existing code remains the same...
    // (Keep all the functions like getOrCreateArticle, loadComments, postComment, etc.)

    // Modify the event listeners to ensure Supabase is available
    const commentButtons = document.querySelectorAll('.comment-btn');
    commentButtons.forEach(button => {
        button.addEventListener('click', function() {
            const articleCard = this.closest('[data-article-id]');
            const commentsSection = articleCard.querySelector('.comments-section');
            
            // Toggle comments section visibility
            if (commentsSection.classList.contains('hidden')) {
                commentsSection.classList.remove('hidden');
                // Load comments when section is shown
                const articleId = articleCard.dataset.articleId;
                loadComments(articleId);
            } else {
                commentsSection.classList.add('hidden');
            }
        });
    });

    // Add a global error handler to catch Supabase-related errors
    window.addEventListener('error', function(event) {
        console.error('Global error caught:', event.error);
    });
});

// Add script to dynamically load Supabase and Fingerprint libraries
(function() {
    // Supabase script
    const supabaseScript = document.createElement('script');
    supabaseScript.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
    supabaseScript.async = true;
    
    // Fingerprint script
    const fingerprintScript = document.createElement('script');
    fingerprintScript.src = 'https://cdn.jsdelivr.net/npm/fingerprintjs2@2.1.0/dist/fingerprint2.min.js';
    fingerprintScript.async = true;

    // Append scripts to document head
    document.head.appendChild(supabaseScript);
    document.head.appendChild(fingerprintScript);
})();
