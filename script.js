// script.js

const plexEndpoint = 'https://majestic-infrequent-calcium.glitch.me/libraries';
let librariesData = [];
let currentLibraryItems = [];
let filteredItems = [];
let genresSet = new Set();
let contentRatingsSet = new Set();
let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
let watchLater = JSON.parse(localStorage.getItem('watchLater')) || [];

async function fetchPlexData() {
    // Check if data is already cached in localStorage
    const cachedData = localStorage.getItem('librariesData');
    
    if (cachedData) {
        librariesData = JSON.parse(cachedData);
        console.log("Data loaded from cache.");
        populateLibraries();
    } else {
        // Fetch from server if no cached data
        try {
            console.log("Fetching data from server...");
            const response = await fetch(plexEndpoint);
            if (!response.ok) throw new Error('Network response was not ok');
            librariesData = await response.json();
            
            // Cache the data in localStorage
            localStorage.setItem('librariesData', JSON.stringify(librariesData));
            populateLibraries();
        } catch (error) {
            document.getElementById('content').innerHTML = `<p>Error loading data: ${error.message}</p>`;
        }
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

        // Details Section
        const detailsDiv = document.createElement('div');
        detailsDiv.classList.add('movie-details');
        detailsDiv.innerHTML = `
            <h2>${movieTitle} (${movieYear})</h2>
            <p><strong>Rating:</strong> ${movieData.rating || 'N/A'}</p>
            <p><strong>Studio:</strong> ${movieData.studio || 'N/A'}</p>
            <p><strong>Summary:</strong> ${movieData.summary || 'N/A'}</p>
            <p><strong>Genres:</strong> ${movieData.Genre ? movieData.Genre.map(g => g.tag).join(', ') : 'N/A'}</p>
            <p><strong>Director:</strong> ${movieData.Director ? movieData.Director.map(d => d.tag).join(', ') : 'N/A'}</p>
            <p><strong>Writers:</strong> ${movieData.Writer ? movieData.Writer.map(w => w.tag).join(', ') : 'N/A'}</p>
            <p><strong>Actors:</strong> ${movieData.Role ? movieData.Role.map(r => r.tag).join(', ') : 'N/A'}</p>
            <p><strong>Content Rating:</strong> ${movieData.contentRating || 'N/A'}</p>
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

// Fetch Poster from OMDb API
async function fetchPoster(title, year) {
    const cacheKey = `poster_${title}_${year}`; // Unique key for each movie based on title and year
    const cachedPoster = localStorage.getItem(cacheKey);

    if (cachedPoster) {
        // If the poster is already cached, return it
        console.log(`Loaded poster from cache for ${title} (${year})`);
        return cachedPoster;
    }

    // If not cached, fetch from OMDb API
    try {
        console.log(`Fetching poster from OMDb for ${title} (${year})`);
        
        const response = await fetch(`https://majestic-infrequent-calcium.glitch.me/poster?title=${encodeURIComponent(title)}&year=${year}`);
        const data = await response.json();
        
        if (data.posterUrl) {
            localStorage.setItem(cacheKey, data.posterUrl); // Cache the poster URL
            return data.posterUrl;
        } else {
            return 'https://i.imgur.com/opmOlZ5.png'; // Default placeholder if poster not available
        }
    } catch (error) {
        console.error('Error fetching poster:', error);
        return 'https://i.imgur.com/opmOlZ5.png'; // Fallback placeholder on error
    }
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

// Theme Toggle
document.getElementById('theme-toggle').addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
});

// Language Toggle
/*
document.getElementById('language-toggle').addEventListener('click', () => {
    const currentDirection = document.body.style.direction;
    document.body.style.direction = currentDirection === 'rtl' ? 'ltr' : 'rtl';
    const textAlign = currentDirection === 'rtl' ? 'left' : 'right';
    document.querySelectorAll('.movie-details').forEach(div => {
        div.style.textAlign = textAlign;
    });
});
*/
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
        localStorage.setItem("theme", "dark"); // Default to dark if not set
    }

    // Fetch Plex data once page is ready
    fetchPlexData();
});

// Theme Toggle with Local Storage Save
document.getElementById("theme-toggle").addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");

    // Save the current theme in localStorage
    const currentTheme = document.body.classList.contains("dark-mode") ? "dark" : "light";
    localStorage.setItem("theme", currentTheme);
});
