const fs = require('fs');
const path = require('path');

// Build directory path
const buildDir = path.join(__dirname, 'build');

// Create build directory if it doesn't exist
if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir);
}

// List of files to copy
const filesToCopy = [
    'index.html',
    'login.html',
    'manifest.json',
    'pages/add-material.html',
    'pages/product-price.html',
    'pages/all-materials.html',
    'pages/all-product-prices.html',
    'pages/drug-entry.html',
    'pages/all-drugs.html',
    'js/firebase-config.js',
    'js/add-material.js',
    'js/product-price.js',
    'js/all-materials.js',
    'js/all-product-prices.js',
    'js/all-drugs.js',
    'js/app.js',
    'js/service-worker.js',
    'css/styles.css'
];

// Copy files to build directory
filesToCopy.forEach(file => {
    try {
        const destDir = path.dirname(path.join(buildDir, file));
        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
        }
        
        fs.copyFileSync(
            path.join(__dirname, file),
            path.join(buildDir, file)
        );
        console.log(`✓ Copied ${file}`);
    } catch (err) {
        console.error(`× Error copying ${file}:`, err.message);
    }
});

// Copy assets directory
const assetsSource = path.join(__dirname, 'assets');
const assetsDestination = path.join(buildDir, 'assets');

if (fs.existsSync(assetsSource)) {
    if (!fs.existsSync(assetsDestination)) {
        fs.mkdirSync(assetsDestination, { recursive: true });
    }
    
    // Copy all files in assets directory
    const assetFiles = fs.readdirSync(assetsSource);
    assetFiles.forEach(assetFile => {
        try {
            fs.copyFileSync(
                path.join(assetsSource, assetFile),
                path.join(assetsDestination, assetFile)
            );
            console.log(`✓ Copied assets/${assetFile}`);
        } catch (err) {
            console.error(`× Error copying assets/${assetFile}:`, err.message);
        }
    });
}

// Create .htaccess for Apache servers
const htaccess = `
# Enable CORS
Header set Access-Control-Allow-Origin "*"

# Ensure correct MIME types
AddType application/javascript .js
AddType text/css .css

# Enable compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/plain text/css application/javascript
</IfModule>

# Set caching
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType text/css "access plus 1 week"
    ExpiresByType application/javascript "access plus 1 week"
    ExpiresByType text/html "access plus 0 seconds"
</IfModule>

# Handle single page app routing
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ /index.html [L,QSA]
`;

fs.writeFileSync(path.join(buildDir, '.htaccess'), htaccess.trim());
console.log('✓ Created .htaccess file');

console.log('\n✨ Build completed successfully! Your app is ready for deployment.');
console.log('\nTo deploy:');
console.log('1. Upload all files from the "build" folder to your web hosting');
console.log('2. Ensure your hosting has HTTPS enabled');
console.log('3. Point your domain to the uploaded files\n');
