// config.js - Configuration file for server endpoints

const CONFIG = {
    // Environment settings
    ENVIRONMENT: 'production', // Change to 'local' for local development
    
    // Server URLs
    SERVERS: {
        local: 'http://localhost:3000',
        production: 'https://mymovies-latest.onrender.com'
    },
    
    // Authentication (set your server password here)
    PASSWORD: '', // This will be dynamically set from user input
    
    // Set password dynamically
    setPassword(password) {
        this.PASSWORD = password;
        // Save to localStorage for persistence
        if (password) {
            localStorage.setItem('serverPassword', password);
        } else {
            localStorage.removeItem('serverPassword');
        }
    },
    
    // Load password from localStorage
    loadPassword() {
        const savedPassword = localStorage.getItem('serverPassword');
        if (savedPassword) {
            this.PASSWORD = savedPassword;
        }
        return this.PASSWORD;
    },
    
    // API Endpoints
    ENDPOINTS: {
        health: '/health',
        libraries: '/libraries',
        library: '/libraries', // For specific library: /libraries/:key
        poster: '/poster' // Query params: ?title=...&year=...
    },
    
    // Get current server URL based on environment
    getServerUrl() {
        return this.SERVERS[this.ENVIRONMENT];
    },
    
    // Get full endpoint URL
    getEndpointUrl(endpoint) {
        const baseUrl = this.getServerUrl();
        return `${baseUrl}${this.ENDPOINTS[endpoint]}`;
    },
    
    // Get poster URL with parameters
    getPosterUrl(title, year) {
        const baseUrl = this.getServerUrl();
        const url = `${baseUrl}${this.ENDPOINTS.poster}?title=${encodeURIComponent(title)}&year=${year}`;
        return this.PASSWORD ? `${url}&password=${encodeURIComponent(this.PASSWORD)}` : url;
    },
    
    // Get fetch options with authentication
    getFetchOptions() {
        const options = {
            headers: {}
        };
        
        if (this.PASSWORD) {
            options.headers['x-password'] = this.PASSWORD;
        }
        
        return options;
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
} else {
    window.CONFIG = CONFIG;
}