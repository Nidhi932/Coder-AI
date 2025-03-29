const screenshot = require('screenshot-desktop');
const path = require('path');
const fs = require('fs-extra');
const { BrowserWindow, screen } = require('electron');

// Ensure screenshots directory exists
const screenshotsDir = path.join(__dirname, '../../screenshots');
console.log('Screenshots directory path:', screenshotsDir);

try {
    if (!fs.existsSync(screenshotsDir)) {
        console.log('Screenshots directory does not exist, creating it...');
        fs.mkdirSync(screenshotsDir, { recursive: true });
        console.log('Screenshots directory created successfully');
    } else {
        console.log('Screenshots directory already exists');
    }
} catch (error) {
    console.error('Error creating screenshots directory:', error);
    // Try an alternative approach
    try {
        console.log('Trying alternative method to create directory...');
        const alternativePath = path.resolve('./screenshots');
        console.log('Alternative path:', alternativePath);
        fs.mkdirSync(alternativePath, { recursive: true });
        console.log('Created alternative screenshots directory');
    } catch (altError) {
        console.error('Failed to create alternative directory:', altError);
    }
}

// Counter to keep track of screenshots
let screenshotCounter = 0;
const MAX_SCREENSHOTS = 2;
let screenshotPaths = [];

/**
 * Enhanced stealth screenshot capture
 * @returns {Promise<string>} Path to the saved screenshot
 */
async function captureScreenshot() {
    console.log('captureScreenshot called');
    try {
        // Get all windows and displays
        const windows = BrowserWindow.getAllWindows();
        const mainWindow = windows[0];
        const display = screen.getPrimaryDisplay();
        console.log('Display info:', {
            width: display.bounds.width,
            height: display.bounds.height
        });

        // Store current window state
        const wasVisible = mainWindow.isVisible();
        const [currentX, currentY] = mainWindow.getPosition();
        console.log('Current window position:', { x: currentX, y: currentY });

        // Temporarily move window off-screen and hide it
        mainWindow.setPosition(display.bounds.width + 100, display.bounds.height + 100);
        mainWindow.hide();
        console.log('Window hidden for screenshot capture');

        // Wait for any animations or transitions
        await new Promise(resolve => setTimeout(resolve, 150));

        // Take the screenshot
        const timestamp = Date.now();
        const filename = `screenshot_${timestamp}_${screenshotCounter++}.png`;
        const filepath = path.join(screenshotsDir, filename);
        console.log('Will save screenshot to:', filepath);

        // Capture with maximum stealth
        console.log('Taking screenshot...');
        await screenshot({
            filename: filepath,
            screen: 0, // Primary screen
            format: 'png'
        });
        console.log('Screenshot taken successfully');

        // Restore window state with a slight delay
        setTimeout(() => {
            mainWindow.setPosition(currentX, currentY);
            if (wasVisible) {
                mainWindow.show();
            }
            console.log('Window restored');
        }, 100);

        // Clean up old screenshots if needed
        if (screenshotCounter >= MAX_SCREENSHOTS) {
            screenshotCounter = 0;
            console.log('Max screenshots reached, cleaning up old ones');
            await cleanupOldScreenshots();
        }

        screenshotPaths.push(filepath);
        console.log('Added screenshot path to tracked paths');

        // Verify the file exists
        if (fs.existsSync(filepath)) {
            console.log('Screenshot file verified to exist');
            const stats = fs.statSync(filepath);
            console.log('File size:', stats.size, 'bytes');
        } else {
            console.warn('Warning: Screenshot file does not exist at expected path');
        }

        return filepath;
    } catch (error) {
        console.error('Screenshot error:', error);
        console.error('Error stack:', error.stack);
        throw error;
    }
}

/**
 * Clean up old screenshots
 */
async function cleanupOldScreenshots() {
    console.log('cleanupOldScreenshots called');
    try {
        for (const filepath of screenshotPaths) {
            console.log('Checking filepath:', filepath);
            if (await fs.pathExists(filepath)) {
                console.log('Removing file:', filepath);
                await fs.remove(filepath);
            } else {
                console.log('File no longer exists:', filepath);
            }
        }
        screenshotPaths = [];
        console.log('Screenshot paths array cleared');
    } catch (error) {
        console.error('Error cleaning up screenshots:', error);
    }
}

/**
 * Get all current screenshot paths
 * @returns {Array<string>} Array of screenshot paths
 */
function getAllScreenshots() {
    console.log('getAllScreenshots called');
    try {
        const files = fs.readdirSync(screenshotsDir)
            .filter(file => file.startsWith('screenshot_'))
            .sort((a, b) => {
                // Sort by timestamp in filename
                const timeA = parseInt(a.split('_')[1]);
                const timeB = parseInt(b.split('_')[1]);
                return timeB - timeA;
            })
            .map(file => path.join(screenshotsDir, file));

        console.log('Found', files.length, 'screenshot files');
        return files;
    } catch (error) {
        console.error('Error getting screenshots:', error);
        return [];
    }
}

/**
 * Reset and clear all screenshots
 */
async function resetScreenshots() {
    console.log('resetScreenshots called');
    try {
        const files = getAllScreenshots();
        console.log('Removing', files.length, 'screenshot files');
        await Promise.all(files.map(file => fs.remove(file)));
        screenshotCounter = 0;
        screenshotPaths = [];
        console.log('All screenshots cleared');
    } catch (error) {
        console.error('Error resetting screenshots:', error);
    }
}

module.exports = {
    captureScreenshot,
    getAllScreenshots,
    resetScreenshots
};