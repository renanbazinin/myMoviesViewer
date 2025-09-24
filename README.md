# Plex Movies Viewer

A web-based browser for your Plex media libraries, allowing you to explore movies with detailed metadata, filtering, and easy poster viewing.

## Configuration

The application uses a configuration file (`config.js`) to manage server endpoints for different environments.

### Server Configuration

To switch between local development and production environments, edit the `config.js` file:

```javascript
const CONFIG = {
    // Change this to 'local' for local development or 'production' for live server
    ENVIRONMENT: 'local', 
    
    SERVERS: {
        local: 'http://localhost:5050',        // Your local server port
        production: 'https://majestic-infrequent-calcium.glitch.me'
    },
    
    // Add your server password here if authentication is enabled
    PASSWORD: 'your_server_password_here'
};
```

### Authentication Setup

If your server requires a password (using the `PASSWORD` environment variable), you need to:

1. Set the password in your server's `.env` file:
   ```
   PASSWORD=your_secret_password
   ```

2. Add the same password to the `config.js` file:
   ```javascript
   PASSWORD: 'your_secret_password'
   ```

⚠️ **Security Note**: Never commit passwords to version control. Consider using different approaches for production.

### Available Endpoints

The server provides the following endpoints:

- `GET /health` - Health check to verify server status
- `GET /libraries` - Get all libraries with items
- `GET /libraries/:key` - Get specific library by key
- `GET /poster?title=...&year=...` - Get movie poster by title and year

### Features

- **Caching**: Both library data and movie posters are cached locally to improve performance
- **Search & Filter**: Search by title, genre, or year with additional filtering options
- **Favorites & Watch Later**: Mark movies as favorites or add to watch later list
- **Theme Toggle**: Switch between light and dark modes
- **Responsive Design**: Works on desktop and mobile devices

### Local Development

1. Ensure your local server is running on `http://localhost:5050`
2. Change the `ENVIRONMENT` setting in `config.js` to `'local'`  
3. If your server requires authentication, add your password to `config.js`
4. Open `index.html` in your browser

### Production Deployment

1. Set `ENVIRONMENT` to `'production'` in `config.js`
2. Configure the production password if needed
3. Deploy the files to your web server
4. Ensure the production server URL in `config.js` matches your deployed server

### Cache Management

- Use the "Clear Cache" button to remove stored library data and poster cache
- Cache is automatically used to improve loading times on subsequent visits
- Poster images are cached indefinitely until manually cleared

## File Structure

```
myMoviesViewer/
├── index.html          # Main HTML file
├── script.js           # Main JavaScript application logic
├── styles.css          # CSS styling
├── config.js           # Server configuration
└── README.md           # This file
```