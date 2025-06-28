// Simple build script to copy files to public directory for Vercel
const fs = require('fs');
const path = require('path');

// Create public directory if it doesn't exist
if (!fs.existsSync('public')) {
    fs.mkdirSync('public');
}

// List of files to copy to public directory
const filesToCopy = [
    'index.html',
    'demo.html',
    'styles.css',
    'script.js',
    'README.md'
];

// Copy each file to public directory
filesToCopy.forEach(file => {
    if (fs.existsSync(file)) {
        fs.copyFileSync(file, path.join('public', file));
        console.log(`Copied ${file} to public/`);
    }
});

console.log('Build completed - all files copied to public directory');
