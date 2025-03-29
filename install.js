/**
 * Installation helper script for Interview Coder
 * This script helps users set up the application properly
 */

const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

console.log('Starting Interview Coder installation process...');

// Check Node.js version
const nodeVersion = process.version.match(/^v(\d+)/)[1];
if (parseInt(nodeVersion) < 16) {
    console.error('Error: Node.js v16 or higher is required.');
    console.error(`Your current version is ${process.version}`);
    console.error('Please update Node.js and try again.');
    process.exit(1);
}

// Create screenshots directory if it doesn't exist
const screenshotsDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
    console.log('Creating screenshots directory...');
    fs.mkdirSync(screenshotsDir);
}

// Create assets directory if it doesn't exist
const assetsDir = path.join(__dirname, 'assets');
if (!fs.existsSync(assetsDir)) {
    console.log('Creating assets directory...');
    fs.mkdirSync(assetsDir);
}

// Install dependencies
try {
    console.log('Installing dependencies...');
    execSync('npm install', { stdio: 'inherit' });
} catch (error) {
    console.error('Failed to install dependencies:', error.message);
    process.exit(1);
}

console.log('\n✅ Installation complete!');
console.log('\nTo start the application, run:');
console.log('npm start');
console.log('\nRemember to set your API keys in the Settings tab when the application starts.');
console.log('You can use either OpenAI or Google Gemini API keys, or both.');