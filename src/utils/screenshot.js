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
    console.log('[Screenshot] captureScreenshot called');
    try {
        // Get all windows and displays
        const windows = BrowserWindow.getAllWindows();
        const mainWindow = windows[0];
        const display = screen.getPrimaryDisplay();
        console.log('[Screenshot] Display info:', {
            id: display.id,
            width: display.bounds.width,
            height: display.bounds.height,
            scaleFactor: display.scaleFactor
        });

        // Store current window state
        const wasVisible = mainWindow.isVisible();
        const [currentX, currentY] = mainWindow.getPosition();
        const [width, height] = mainWindow.getSize();
        console.log('[Screenshot] Current window state:', {
            visible: wasVisible,
            position: { x: currentX, y: currentY },
            size: { width, height }
        });

        // Temporarily move window off-screen and hide it
        console.log('[Screenshot] Moving window off-screen');
        mainWindow.setPosition(display.bounds.width + 100, display.bounds.height + 100);
        mainWindow.hide();
        console.log('[Screenshot] Window hidden for screenshot capture');

        // Wait for any animations or transitions
        await new Promise(resolve => setTimeout(resolve, 150));

        // Take the screenshot
        const timestamp = Date.now();
        const filename = `screenshot_${timestamp}_${screenshotCounter++}.png`;
        const filepath = path.join(screenshotsDir, filename);
        console.log('[Screenshot] Will save screenshot to:', filepath);

        // Capture with maximum stealth
        console.log('[Screenshot] Taking screenshot...');
        try {
            await screenshot({
                filename: filepath,
                screen: 0, // Primary screen
                format: 'png'
            });
            console.log('[Screenshot] Screenshot taken successfully');
        } catch (screenshotError) {
            console.error('[Screenshot] Error taking screenshot:', screenshotError);
            console.error('[Screenshot] Error stack:', screenshotError.stack);

            // Try alternative capture method
            console.log('[Screenshot] Attempting alternative capture method...');
            await screenshot().then(img => {
                console.log('[Screenshot] Alternative capture successful, saving to file');
                fs.writeFileSync(filepath, img);
                console.log('[Screenshot] Screenshot saved using alternative method');
            });
        }

        // Restore window state with a slight delay
        setTimeout(() => {
            console.log('[Screenshot] Restoring window position:', { x: currentX, y: currentY });
            mainWindow.setPosition(currentX, currentY);
            if (wasVisible) {
                console.log('[Screenshot] Restoring window visibility');
                mainWindow.show();
            }
            console.log('[Screenshot] Window restored');
        }, 100);

        // Clean up old screenshots if needed
        if (screenshotCounter >= MAX_SCREENSHOTS) {
            screenshotCounter = 0;
            console.log('[Screenshot] Max screenshots reached, cleaning up old ones');
            await cleanupOldScreenshots();
        }

        // Add screenshot to tracked paths
        screenshotPaths.push(filepath);
        console.log('[Screenshot] Added screenshot path to tracked paths:', filepath);

        // Verify the file exists
        if (fs.existsSync(filepath)) {
            console.log('[Screenshot] Screenshot file verified to exist');
            const stats = fs.statSync(filepath);
            console.log('[Screenshot] File size:', stats.size, 'bytes');

            // Verify file is not empty or corrupt
            if (stats.size < 100) {
                console.error('[Screenshot] Warning: Screenshot file is suspiciously small:', stats.size, 'bytes');
            }
        } else {
            console.error('[Screenshot] Error: Screenshot file does not exist at expected path');
            throw new Error('Screenshot file does not exist after capture');
        }

        return filepath;
    } catch (error) {
        console.error('[Screenshot] Fatal error during screenshot capture:', error);
        console.error('[Screenshot] Error stack:', error.stack);
        throw error;
    }
}

/**
 * Clean up old screenshots
 */
async function cleanupOldScreenshots() {
    console.log('[Screenshot] cleanupOldScreenshots called');
    try {
        console.log('[Screenshot] Number of paths to clean up:', screenshotPaths.length);
        for (const filepath of screenshotPaths) {
            console.log('[Screenshot] Checking filepath:', filepath);
            if (await fs.pathExists(filepath)) {
                console.log('[Screenshot] Removing file:', filepath);
                await fs.remove(filepath);
            } else {
                console.log('[Screenshot] File no longer exists:', filepath);
            }
        }
        screenshotPaths = [];
        console.log('[Screenshot] Screenshot paths array cleared');
    } catch (error) {
        console.error('[Screenshot] Error cleaning up screenshots:', error);
        console.error('[Screenshot] Error stack:', error.stack);
    }
}

/**
 * Get all current screenshot paths
 * @returns {Array<string>} Array of screenshot paths
 */
function getAllScreenshots() {
    console.log('[Screenshot] getAllScreenshots called');
    try {
        if (!fs.existsSync(screenshotsDir)) {
            console.error('[Screenshot] Screenshots directory does not exist:', screenshotsDir);
            return [];
        }

        const files = fs.readdirSync(screenshotsDir)
            .filter(file => file.startsWith('screenshot_'))
            .sort((a, b) => {
                // Sort by timestamp in filename
                const timeA = parseInt(a.split('_')[1]);
                const timeB = parseInt(b.split('_')[1]);
                return timeB - timeA;
            })
            .map(file => path.join(screenshotsDir, file));

        console.log('[Screenshot] Found', files.length, 'screenshot files');
        files.forEach((file, index) => {
            console.log(`[Screenshot] File ${index + 1}:`, file);
            if (fs.existsSync(file)) {
                const stats = fs.statSync(file);
                console.log(`[Screenshot] File ${index + 1} size:`, stats.size, 'bytes');
            } else {
                console.error(`[Screenshot] File ${index + 1} does not exist:`, file);
            }
        });

        return files;
    } catch (error) {
        console.error('[Screenshot] Error getting screenshots:', error);
        console.error('[Screenshot] Error stack:', error.stack);
        return [];
    }
}

/**
 * Reset and clear all screenshots
 */
async function resetScreenshots() {
    console.log('[Screenshot] resetScreenshots called');
    try {
        const files = getAllScreenshots();
        console.log('[Screenshot] Removing', files.length, 'screenshot files');

        for (const file of files) {
            try {
                console.log('[Screenshot] Removing file:', file);
                await fs.remove(file);
            } catch (removeError) {
                console.error('[Screenshot] Error removing file:', file, removeError);
            }
        }

        screenshotCounter = 0;
        screenshotPaths = [];
        console.log('[Screenshot] All screenshots cleared');
    } catch (error) {
        console.error('[Screenshot] Error resetting screenshots:', error);
        console.error('[Screenshot] Error stack:', error.stack);
    }
}

module.exports = {
    captureScreenshot,
    getAllScreenshots,
    resetScreenshots
};