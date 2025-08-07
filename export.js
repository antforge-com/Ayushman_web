const fs = require('fs');
const path = require('path');

// Create ProductApp directory
const exportDir = path.join(__dirname, '..', 'ProductApp');
if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir);
}

// List of files to copy
const files = [
    'index.html',
    'add-material.html',
    'product-price.html',
    'all-materials.html',
    'styles.css',
    'firebase-config.js',
    'add-material.js',
    'product-price.js',
    'all-materials.js'
];

// Copy each file
files.forEach(file => {
    try {
        fs.copyFileSync(
            path.join(__dirname, file),
            path.join(exportDir, file)
        );
        console.log(`✓ Copied ${file}`);
    } catch (err) {
        console.error(`Error copying ${file}:`, err.message);
    }
});

console.log('\n✅ App exported to ProductApp folder');
console.log('\nTo use the app:');
console.log('1. Copy the ProductApp folder to where you want to use it');
console.log('2. Open index.html in your browser\n');
