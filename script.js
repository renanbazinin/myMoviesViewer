// script.js

let librariesData = [];
let currentLibraryItems = [];
let filteredItems = [];
let genresSet = new Set();
let contentRatingsSet = new Set();
let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
let watchLater = JSON.parse(localStorage.getItem('watchLater')) || [];

// Password management
function initializePassword() {
    const savedPassword = CONFIG.loadPassword();
    const passwordInput = document.getElementById('password-input');
    if (savedPassword && passwordInput) {
        passwordInput.value = savedPassword;
        updatePasswordStatus('connected');
    }
}

// Update password status indicator
function updatePasswordStatus(status) {
    const statusIndicator = document.getElementById('password-status');
    if (statusIndicator) {
        statusIndicator.className = `status-indicator ${status}`;
    }
}

// Test password by checking server health
async function testPassword(password) {
    updatePasswordStatus('checking');
    CONFIG.setPassword(password);
    
    try {
        // Try to fetch libraries with the password
        const librariesEndpoint = CONFIG.getEndpointUrl('libraries');
        const fetchOptions = CONFIG.getFetchOptions();
        const response = await fetch(librariesEndpoint, fetchOptions);
        
        if (response.ok) {
            updatePasswordStatus('connected');
            return true;
        } else {
            updatePasswordStatus('error');
            return false;
        }
    } catch (error) {
        console.error('Password test failed:', error);
        updatePasswordStatus('error');
        return false;
    }
}

// Check server health
async function checkServerHealth() {
    try {
        const healthEndpoint = CONFIG.getEndpointUrl('health');
        const response = await fetch(healthEndpoint); // Health endpoint doesn't need auth
        return response.ok;
    } catch (error) {
        console.error('Server health check failed:', error);
        return false;
    }
}

// Poll and render health status in navbar
async function updateHealthBadge() {
    const badge = document.getElementById('health-badge');
    const label = document.getElementById('health-label');
    const popover = document.getElementById('health-popover');
    if (!badge || !label || !popover) return;

    label.textContent = 'Checking…';
    badge.classList.remove('connected', 'error');

    try {
        const res = await fetch(CONFIG.getEndpointUrl('health'));
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        // Overall status
        const connected = data?.status === 'OK' && data?.plex?.status === 'connected';
        badge.classList.add(connected ? 'connected' : 'error');
        label.textContent = connected ? 'Server: OK' : 'Server: Issue';

        // Build popover content (server + plex + apis)
        const tmdb = data?.apis?.tmdb || {};
        const omdb = data?.apis?.omdb || {};
        const plex = data?.plex || {};
        const server = data?.server || {};

        const pop = [];
        pop.push(`<h4>Health</h4>`);
        pop.push('<div class="health-grid">');
        pop.push(`<div class="health-item"><strong>Status:</strong> ${data.status || 'unknown'}</div>`);
        pop.push(`<div class="health-item"><strong>Resp:</strong> ${data.responseTime ?? '-'} ms</div>`);
        pop.push(`<div class="health-item"><strong>Mode:</strong> ${server.mode || data.mode || '-'}</div>`);
        pop.push(`<div class="health-item"><strong>Port:</strong> ${server.port || '-'}</div>`);
        pop.push(`<div class="health-item"><strong>Node:</strong> ${server.nodeVersion || '-'}</div>`);
        pop.push(`<div class="health-item"><strong>Uptime:</strong> ${(data.uptime ?? 0).toFixed ? data.uptime.toFixed(1) : data.uptime || '-'}s</div>`);
        pop.push('</div>');

        // Plex section (detailed; shown on hover as requested)
        pop.push('<h4 style="margin-top:0.5rem">Plex</h4>');
        pop.push('<div class="health-grid">');
        pop.push(`<div class="health-item"><strong>Status:</strong> ${plex.status || '-'}</div>`);
        pop.push(`<div class="health-item"><strong>Resp:</strong> ${plex.responseTime ?? '-'} ms</div>`);
        pop.push(`<div class="health-item" style="grid-column: span 2;"><strong>URL:</strong> ${plex.url || '-'}</div>`);
        const psv = plex.server || {};
        pop.push(`<div class="health-item"><strong>Version:</strong> ${psv.version || '-'}</div>`);
        pop.push(`<div class="health-item"><strong>Platform:</strong> ${psv.platform || '-'}</div>`);
        pop.push(`<div class="health-item" style="grid-column: span 2;"><strong>ID:</strong> ${psv.machineIdentifier || '-'}</div>`);
        pop.push('</div>');

        // APIs section
        pop.push('<h4 style="margin-top:0.5rem">APIs</h4>');
        pop.push('<div class="health-grid">');
        pop.push(`<div class="health-item"><strong>TMDB:</strong> ${tmdb.status || (tmdb.configured ? 'configured' : 'n/a')}</div>`);
        pop.push(`<div class="health-item"><strong>RTT:</strong> ${tmdb.responseTime ?? '-'} ms</div>`);
        pop.push(`<div class="health-item"><strong>OMDb:</strong> ${omdb.status || (omdb.configured ? 'configured' : 'n/a')}</div>`);
        pop.push(`<div class="health-item"><strong>RTT:</strong> ${omdb.responseTime ?? '-'} ms</div>`);
        pop.push('</div>');

        popover.innerHTML = pop.join('');
        popover.setAttribute('aria-hidden', 'false');
    } catch (e) {
        console.error('Health poll failed:', e);
        badge.classList.add('error');
        label.textContent = 'Server: Down';
        popover.innerHTML = '<div class="health-item">Cannot reach health endpoint.</div>';
        popover.setAttribute('aria-hidden', 'false');
    }
}

async function fetchPlexData() {
    // Check if data is already cached in localStorage
    const cachedData = localStorage.getItem('librariesData');
    
    if (cachedData) {
        try {
            librariesData = JSON.parse(cachedData);
            console.log("Data loaded from cache.");
            populateLibraries();
            return;
        } catch (error) {
            console.error("Error parsing cached data:", error);
            localStorage.removeItem('librariesData'); // Remove corrupted cache
        }
    }
    
    // Fetch from server if no cached data
    try {
        console.log("Fetching data from server...");
        
        // Check server health first
        const isServerHealthy = await checkServerHealth();
        if (!isServerHealthy) {
            throw new Error('Server is not responding. Please check your connection.');
        }
        
        const librariesEndpoint = CONFIG.getEndpointUrl('libraries');
        const fetchOptions = CONFIG.getFetchOptions();
        const response = await fetch(librariesEndpoint, fetchOptions);
        if (!response.ok) throw new Error(`Server responded with status: ${response.status}`);
        
        const fullData = await response.json();
        
        // Create a lightweight version for caching (remove heavy metadata)
        const lightweightData = createLightweightData(fullData);
        
        // Store the full data in memory for current session
        librariesData = fullData;
        
        // Try to cache the lightweight version
        try {
            localStorage.setItem('librariesData', JSON.stringify(lightweightData));
            console.log("Lightweight data cached successfully.");
        } catch (quotaError) {
            console.warn("localStorage quota exceeded. Running without cache:", quotaError.message);
            // Clear some space by removing old poster cache
            clearOldPosterCache();
            // Try again with even more minimal data
            try {
                const minimalData = createMinimalData(fullData);
                localStorage.setItem('librariesData', JSON.stringify(minimalData));
                console.log("Minimal data cached successfully.");
            } catch (error) {
                console.warn("Could not cache any data. Running in memory only mode.");
            }
        }
        
        populateLibraries();
    } catch (error) {
        console.error('Error fetching data:', error);
        document.getElementById('content').innerHTML = `<p>Error loading data: ${error.message}</p>`;
    }
}

// Create a lightweight version of data for caching
function createLightweightData(fullData) {
    return fullData.map(library => ({
        library: library.library,
        type: library.type,
        key: library.key,
        items: library.items.map(item => ({
            ratingKey: item.ratingKey,
            full_metadata: {
                ratingKey: item.full_metadata.ratingKey,
                title: item.full_metadata.title,
                originalTitle: item.full_metadata.originalTitle,
                year: item.full_metadata.year,
                summary: item.full_metadata.summary,
                rating: item.full_metadata.rating,
                audienceRating: item.full_metadata.audienceRating,
                studio: item.full_metadata.studio,
                contentRating: item.full_metadata.contentRating,
                Genre: item.full_metadata.Genre,
                Director: item.full_metadata.Director,
                Writer: item.full_metadata.Writer,
                Role: item.full_metadata.Role,
                Media: item.full_metadata.Media ? [{
                    videoCodec: item.full_metadata.Media[0]?.videoCodec,
                    audioChannels: item.full_metadata.Media[0]?.audioChannels,
                    width: item.full_metadata.Media[0]?.width,
                    height: item.full_metadata.Media[0]?.height
                }] : undefined
            }
        }))
    }));
}

// Create an even more minimal version for caching
function createMinimalData(fullData) {
    return fullData.map(library => ({
        library: library.library,
        type: library.type,
        key: library.key,
        items: library.items.map(item => ({
            ratingKey: item.ratingKey,
            full_metadata: {
                title: item.full_metadata.title,
                originalTitle: item.full_metadata.originalTitle,
                year: item.full_metadata.year,
                rating: item.full_metadata.rating,
                Genre: item.full_metadata.Genre?.slice(0, 3), // Limit genres
                contentRating: item.full_metadata.contentRating
            }
        }))
    }));
}

// Clear old poster cache to free up space
function clearOldPosterCache() {
    const keys = Object.keys(localStorage);
    const posterKeys = keys.filter(key => key.startsWith('poster_'));
    
    // Remove oldest poster cache entries (keep only recent ones)
    if (posterKeys.length > 50) {
        const keysToRemove = posterKeys.slice(0, posterKeys.length - 50);
        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
        });
        console.log(`Cleared ${keysToRemove.length} old poster cache entries.`);
    }
}

function populateLibraries() {
    const libraryList = document.getElementById('library-list');
    libraryList.innerHTML = '';
    librariesData.forEach(library => {
        const li = document.createElement('li');
        li.textContent = library.library;
        li.addEventListener('click', () => displayLibrary(library));
        libraryList.appendChild(li);
    });

    // Display "Movies" library by default, or first library if not found
    const moviesLibrary = librariesData.find(library => library.library === "Movies");
    if (moviesLibrary) {
        displayLibrary(moviesLibrary);
    } else if (librariesData.length > 0) {
        displayLibrary(librariesData[0]);
    }
}

// Display Movies from a Library
async function displayLibrary(library) {
    document.getElementById('content').innerHTML = '';
    
    // Ensure 'loading-spinner' exists before accessing its style property
    const loadingSpinner = document.getElementById('loading-spinner');
    if (loadingSpinner) {
        loadingSpinner.style.display = 'block';
    }

    currentLibraryItems = library.items;
    filteredItems = currentLibraryItems.slice(); // Clone the array
    extractFilters();
    renderMovies(filteredItems);
    
    // Ensure 'loading-spinner' exists before setting its display to 'none'
    if (loadingSpinner) {
        loadingSpinner.style.display = 'none';
    }
}

// Extract Genres and Content Ratings for Filters
function extractFilters() {
    genresSet.clear();
    contentRatingsSet.clear();
    currentLibraryItems.forEach(item => {
        const movieData = item.full_metadata;
        if (movieData.Genre) {
            movieData.Genre.forEach(g => genresSet.add(g.tag));
        }
        if (movieData.contentRating) {
            contentRatingsSet.add(movieData.contentRating);
        }
    });
    populateFilters();
}

// Populate Genre and Content Rating Filters
function populateFilters() {
    const genreFilter = document.getElementById('genre-filter');
    const contentRatingFilter = document.getElementById('content-rating-filter');

    genreFilter.innerHTML = '<option value="">All Genres</option>';
    contentRatingFilter.innerHTML = '<option value="">All Ratings</option>';

    genresSet.forEach(genre => {
        const option = document.createElement('option');
        option.value = genre;
        option.textContent = genre;
        genreFilter.appendChild(option);
    });

    contentRatingsSet.forEach(rating => {
        const option = document.createElement('option');
        option.value = rating;
        option.textContent = rating;
        contentRatingFilter.appendChild(option);
    });
}

// Render Movies Function
async function renderMovies(items) {
    const content = document.getElementById('content');
    content.innerHTML = ''; // Clear previous content

    for (const item of items) {

        const movieData = item.full_metadata;
        const movieTitleForPoster = movieData.originalTitle || movieData.title;

        const movieTitle = movieData.title || movieData.originalTitle;
        const movieYear = movieData.year || '';
        const movieId = movieData.ratingKey;

        // Fetch Poster from OMDb API
        const posterUrl = await fetchPoster(movieTitleForPoster, movieYear);

        // Create Movie Card
        const movieCard = document.createElement('div');
        movieCard.classList.add('movie-card');

        // Poster Section
        const posterDiv = document.createElement('div');
        posterDiv.classList.add('movie-poster');
        const posterImg = document.createElement('img');
        posterImg.src = posterUrl || 'https://i.imgur.com/opmOlZ5.png';
        posterImg.alt = movieTitle;
        posterDiv.appendChild(posterImg);
        //if(movieTitle == "אגתה לאורך כל הדרך")
        //    console.table(movieData)
        // Details Section
        const detailsDiv = document.createElement('div');
        detailsDiv.classList.add('movie-details');
        detailsDiv.innerHTML = `
            <h2>${movieTitle} (${movieYear})</h2>
            <p><strong>Rating:</strong> ${movieData.rating || movieData.audienceRating|| 'N/A'}</p>
            <p><strong>Studio:</strong> ${movieData.studio || 'N/A'}</p>
            <p><strong>Summary:</strong> ${movieData.summary || 'N/A'}</p>
            <p><strong>Genres:</strong> ${movieData.Genre ? movieData.Genre.map(g => g.tag).join(', ') : 'N/A'}</p>
            <p><strong>Director:</strong> ${movieData.Director ? movieData.Director.map(d => d.tag).join(', ') : 'N/A'}</p>
            <p><strong>Writers:</strong> ${movieData.Writer ? movieData.Writer.map(w => w.tag).join(', ') : 'N/A'}</p>
            <p><strong>Actors:</strong> ${movieData.Role ? movieData.Role.map(r => r.tag).join(', ') : 'N/A'}</p>
            <p><strong>Content Rating:</strong> ${movieData.contentRating  || 'N/A'}</p>
            <p><strong>Video Codec:</strong> ${getVideoCodec(movieData) || 'N/A'}</p>
            <p><strong>Audio Channels:</strong> ${getAudioChannels(movieData) || 'N/A'}</p>
            <p><strong>Resolution:</strong> ${getResolution(movieData) || 'N/A'}</p>
        `;

        // Actions Section
        const actionsDiv = document.createElement('div');
        actionsDiv.classList.add('movie-actions');

        const favoriteBtn = document.createElement('button');
        favoriteBtn.textContent = favorites.includes(movieId) ? '★ Favorited' : '☆ Favorite';
        favoriteBtn.addEventListener('click', () => toggleFavorite(movieId, favoriteBtn));

        const watchLaterBtn = document.createElement('button');
        watchLaterBtn.textContent = watchLater.includes(movieId) ? '✓ In Watch Later' : '+ Watch Later';
        watchLaterBtn.addEventListener('click', () => toggleWatchLater(movieId, watchLaterBtn));

        actionsDiv.appendChild(favoriteBtn);
        actionsDiv.appendChild(watchLaterBtn);
        detailsDiv.appendChild(actionsDiv);

        // Append to Movie Card
        movieCard.appendChild(posterDiv);
        movieCard.appendChild(detailsDiv);

        // Append to Content
        content.appendChild(movieCard);
    }
}

// Fetch Poster from Server API
async function fetchPoster(title, year) {
    const cacheKey = `poster_${title}_${year}`;
    const cachedPoster = localStorage.getItem(cacheKey);

    if (cachedPoster) {
        console.log(`Loaded poster from cache for ${title} (${year})`);
        return cachedPoster;
    }

    // If not cached, fetch from server API
    try {
        console.log(`Fetching poster from server for ${title} (${year})`);
        
        const posterUrl = CONFIG.getPosterUrl(title, year);
        const response = await fetch(posterUrl);
        const data = await response.json();
        
        if (data.posterUrl) {
            // Try to cache the poster URL with quota handling
            try {
                localStorage.setItem(cacheKey, data.posterUrl);
            } catch (quotaError) {
                console.warn("Cannot cache poster due to storage quota:", quotaError.message);
                // Clear some old poster cache and try again
                clearOldPosterCache();
                try {
                    localStorage.setItem(cacheKey, data.posterUrl);
                } catch (error) {
                    console.warn("Still cannot cache poster after cleanup");
                }
            }
            return data.posterUrl;
        } else {
            return 'https://i.imgur.com/opmOlZ5.png';
        }
    } catch (error) {
        console.error('Error fetching poster:', error);
        return 'https://i.imgur.com/opmOlZ5.png';
    }
}

// Monitor localStorage usage
function getStorageUsage() {
    let totalSize = 0;
    const usage = {};
    
    for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
            const size = localStorage[key].length;
            totalSize += size;
            
            if (key.startsWith('poster_')) {
                usage.posters = (usage.posters || 0) + size;
            } else if (key === 'librariesData') {
                usage.libraries = size;
            } else {
                usage.other = (usage.other || 0) + size;
            }
        }
    }
    
    return {
        total: totalSize,
        totalMB: (totalSize / 1024 / 1024).toFixed(2),
        breakdown: usage
    };
}

// Convenience logger for storage usage and footer badge update
function logStorageUsage() {
    const usage = getStorageUsage();
    console.log(`localStorage usage: ${usage.totalMB} MB`, usage.breakdown);
    const usageEl = document.getElementById('storage-usage');
    if (usageEl) usageEl.textContent = `Cache: ${usage.totalMB} MB`;
}

// Get Video Codec
function getVideoCodec(movieData) {
    if (movieData.Media && movieData.Media.length > 0) {
        return movieData.Media[0].videoCodec;
    }
    return null;
}

// Get Audio Channels
function getAudioChannels(movieData) {
    if (movieData.Media && movieData.Media.length > 0) {
        return movieData.Media[0].audioChannels;
    }
    return null;
}

// Get Resolution
function getResolution(movieData) {
    if (movieData.Media && movieData.Media.length > 0) {
        return `${movieData.Media[0].width}x${movieData.Media[0].height}`;
    }
    return null;
}

// Event Listeners for Search and Sort
document.getElementById('search-bar').addEventListener('input', handleSearch);
document.getElementById('sort-options').addEventListener('change', handleSort);
document.getElementById('genre-filter').addEventListener('change', handleFilter);
document.getElementById('content-rating-filter').addEventListener('change', handleFilter);

// Password input event listeners
document.getElementById('password-input').addEventListener('input', async (event) => {
    const password = event.target.value.trim();
    if (password) {
        const isValid = await testPassword(password);
        if (isValid) {
            // Refresh data with new password
            fetchPlexData();
        }
    } else {
        CONFIG.setPassword('');
        updatePasswordStatus('error');
    }
});

// Password toggle visibility
document.getElementById('password-toggle').addEventListener('click', () => {
    const passwordInput = document.getElementById('password-input');
    const toggleBtn = document.getElementById('password-toggle');
    
    if (passwordInput.type === 'text') {
        passwordInput.type = 'password';
        toggleBtn.textContent = '👁️';
        toggleBtn.title = 'Show Password';
    } else {
        passwordInput.type = 'text';
        toggleBtn.textContent = '🙈';
        toggleBtn.title = 'Hide Password';
    }
});

// Search Function
function handleSearch(event) {
    const query = event.target.value.toLowerCase();
    filterAndRender(query);
}

// Sort Function
function handleSort(event) {
    const sortBy = event.target.value;
    sortItems(sortBy);
    renderMovies(filteredItems);
}

// Filter Function
function handleFilter() {
    const genre = document.getElementById('genre-filter').value;
    const contentRating = document.getElementById('content-rating-filter').value;
    filterAndRender(document.getElementById('search-bar').value.toLowerCase(), genre, contentRating);
}

// Filter and Render Items
function filterAndRender(query, genreFilter = '', contentRatingFilter = '') {
    filteredItems = currentLibraryItems.filter(item => {
        const movieData = item.full_metadata;
        const title = movieData.title.toLowerCase();
        const genres = movieData.Genre ? movieData.Genre.map(g => g.tag.toLowerCase()) : [];
        const year = movieData.year ? movieData.year.toString() : '';
        const contentRating = movieData.contentRating || '';

        const matchesQuery = title.includes(query) || genres.some(g => g.includes(query)) || year.includes(query);
        const matchesGenre = genreFilter === '' || genres.includes(genreFilter.toLowerCase());
        const matchesContentRating = contentRatingFilter === '' || contentRating === contentRatingFilter;

        return matchesQuery && matchesGenre && matchesContentRating;
    });
    sortItems(document.getElementById('sort-options').value);
    renderMovies(filteredItems);
}

// Sort Items
function sortItems(sortBy) {
    filteredItems.sort((a, b) => {
        const movieA = a.full_metadata;
        const movieB = b.full_metadata;
        if (sortBy === 'title') {
            return movieA.title.localeCompare(movieB.title);
        } else if (sortBy === 'year') {
            return (movieB.year || 0) - (movieA.year || 0);
        } else if (sortBy === 'rating') {
            return (movieB.rating || 0) - (movieA.rating || 0);
        }
    });
}

// Toggle Favorite
function toggleFavorite(movieId, button) {
    if (favorites.includes(movieId)) {
        favorites = favorites.filter(id => id !== movieId);
        button.textContent = '☆ Favorite';
    } else {
        favorites.push(movieId);
        button.textContent = '★ Favorited';
    }
    localStorage.setItem('favorites', JSON.stringify(favorites));
}

// Toggle Watch Later
function toggleWatchLater(movieId, button) {
    if (watchLater.includes(movieId)) {
        watchLater = watchLater.filter(id => id !== movieId);
        button.textContent = '+ Watch Later';
    } else {
        watchLater.push(movieId);
        button.textContent = '✓ In Watch Later';
    }
    localStorage.setItem('watchLater', JSON.stringify(watchLater));
}

// Back to Top Button Functionality
window.addEventListener('scroll', () => {
    const backToTopBtn = document.getElementById('back-to-top');
    if (window.pageYOffset > 300) {
        backToTopBtn.style.display = 'block';
    } else {
        backToTopBtn.style.display = 'none';
    }
});

document.getElementById('back-to-top').addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

// Initialize
document.addEventListener("DOMContentLoaded", () => {
    // Set initial theme based on saved preference or default to dark
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "light") {
        document.body.classList.remove("dark-mode");
    } else {
        document.body.classList.add("dark-mode");
        localStorage.setItem("theme", "dark");
    }

    // Initialize password from cache
    initializePassword();

    logStorageUsage();
    // Kick off initial health status and schedule periodic refresh
    updateHealthBadge();
    window.__healthInterval = setInterval(updateHealthBadge, 60000); // every 60s
    const usage = getStorageUsage();
    console.log(`localStorage usage: ${usage.totalMB} MB`, usage.breakdown);
    const usageEl = document.getElementById('storage-usage');
    if (usageEl) usageEl.textContent = `Cache: ${usage.totalMB} MB`;

    // Fetch Plex data once page is ready
    fetchPlexData();
});

document.getElementById("clear-cache").addEventListener("click", clearCache);

// Function to clear cached data
function clearCache() {
    // Clear libraries data and any other relevant cached data
    localStorage.removeItem("librariesData");
    localStorage.removeItem("favorites");
    localStorage.removeItem("watchLater");

    // Clear poster cache by removing items with keys that start with "poster_"
    const keys = Object.keys(localStorage);
    const posterKeys = keys.filter(key => key.startsWith('poster_'));
    posterKeys.forEach(key => {
        localStorage.removeItem(key);
    });
    console.log(`Cleared ${posterKeys.length} poster cache entries.`);

    // Ask user if they want to clear the saved password too
    const clearPassword = confirm("Do you also want to clear the saved password?");
    if (clearPassword) {
        localStorage.removeItem("serverPassword");
        CONFIG.setPassword('');
        document.getElementById('password-input').value = '';
        updatePasswordStatus('error');
    }

    // Notify user and refresh library list
    alert("Cache cleared successfully!");
    librariesData = [];
    
    // Show storage usage info
    const storageUsed = new Blob(Object.values(localStorage)).size;
    console.log(`localStorage usage after clear: ${(storageUsed / 1024 / 1024).toFixed(2)} MB`);
    const usageEl2 = document.getElementById('storage-usage');
    if (usageEl2) usageEl2.textContent = `Cache: ${(storageUsed / 1024 / 1024).toFixed(2)} MB`;
    
    fetchPlexData();
}
