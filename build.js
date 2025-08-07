const fs = require('fs');
const path = require('path');
const distDir = path.join(__dirname, 'dist');

// Create dist directory
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir);
}

// Copy files function
function copyFile(src, dest) {
    fs.copyFileSync(src, dest);
    console.log(`Copied ${src} to ${dest}`);
}

// Main build function
function build() {
    // Create dist directory if it doesn't exist
    if (!fs.existsSync(distDir)) {
        fs.mkdirSync(distDir);
        console.log('Created dist directory');
    }

    // List of files to copy
    const filesToCopy = [
        'index.html',
        'add-material.html',
        'product-price.html',
        'all-materials.html',
        'firebase-config.js',
        'add-material.js',
        'product-price.js',
        'all-materials.js',
        'styles.css',
        'service-worker.js',
        'manifest.json'
    ];

    // Copy each file
    filesToCopy.forEach(file => {
        try {
            copyFile(file, path.join(distDir, file));
        } catch (err) {
            console.error(`Error copying ${file}:`, err.message);
        }
    });

    console.log('Build completed successfully!');
}

build();
