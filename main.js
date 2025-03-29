const { app, BrowserWindow, globalShortcut, ipcMain, screen } = require('electron');
const path = require('path');
const { captureScreenshot, getAllScreenshots, resetScreenshots } = require('./src/utils/screenshot');
const { initAI, setApiKey, getCurrentProvider, extractProblemFromScreenshots, generateSolution, optimizeSolution, extractCodeFromScreenshot } = require('./src/utils/openai');

// Keep a global reference of the window object to prevent garbage collection
let mainWindow;
let isVisible = true;
let preferredProvider = 'gemini';

// Track initialization state
let aiInitialized = false;

function createWindow() {
    console.log('Creating application window...');
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    console.log('Screen dimensions:', { width, height });

    // Create the browser window with maximum stealth settings
    mainWindow = new BrowserWindow({
        width: Math.round(width * 0.25),
        height: Math.round(height * 0.6),
        transparent: true,
        frame: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        hasShadow: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true
        },
        // Enhanced stealth settings
        backgroundColor: '#00000000',
        opacity: 0.8,
        focusable: false,
        // Maximum stealth configuration
        type: 'toolbar',
        titleBarStyle: 'hidden',
        minimizable: false,
        maximizable: false,
        fullscreenable: false,
        show: false // Start hidden
    });

    // Enhanced stealth mode
    mainWindow.setIgnoreMouseEvents(true, { forward: true });
    mainWindow.setAlwaysOnTop(true, 'pop-up-menu', 1);

    if (process.platform === 'darwin') {
        mainWindow.setWindowButtonVisibility(false);
        app.dock.hide(); // Hide from dock on macOS
    }

    mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

    // Prevent focus stealing
    mainWindow.on('focus', () => {
        if (!isVisible) {
            mainWindow.hide();
        }
    });

    // Load the index.html file
    mainWindow.loadFile(path.join(__dirname, 'src/index.html'));

    // Show window only after it's fully loaded
    mainWindow.webContents.on('did-finish-load', () => {
        if (isVisible) {
            mainWindow.show();
        }
    });

    // Position window on the right side by default
    positionWindow(mainWindow, 'right');

    // Initialize AI service
    if (!aiInitialized) {
        console.log('Initializing AI services from createWindow...');
        initAI();
        aiInitialized = true;
    }

    console.log('Window creation complete');
}

// Position window function (left, right, top, bottom)
function positionWindow(window, position) {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    let x, y;

    switch (position) {
        case 'left':
            x = 0;
            y = Math.round(height * 0.1);
            break;
        case 'right':
            x = Math.round(width * 0.7);
            y = Math.round(height * 0.1);
            break;
        case 'top':
            x = Math.round(width * 0.35);
            y = 0;
            break;
        case 'bottom':
            x = Math.round(width * 0.35);
            y = Math.round(height * 0.6);
            break;
        default:
            x = Math.round(width * 0.7);
            y = Math.round(height * 0.1);
    }

    window.setPosition(x, y);
}

// Toggle window visibility
function toggleVisibility() {
    if (isVisible) {
        mainWindow.hide();
    } else {
        mainWindow.show();
    }
    isVisible = !isVisible;
}

// Move window function
function moveWindow(direction) {
    const [x, y] = mainWindow.getPosition();
    const moveStep = 30;

    switch (direction) {
        case 'up':
            mainWindow.setPosition(x, y - moveStep);
            break;
        case 'down':
            mainWindow.setPosition(x, y + moveStep);
            break;
        case 'left':
            mainWindow.setPosition(x - moveStep, y);
            break;
        case 'right':
            mainWindow.setPosition(x + moveStep, y);
            break;
    }
}

// App ready event
app.whenReady().then(() => {
    console.log('Application ready, creating window...');
    createWindow();

    // Initialize with Gemini as default
    console.log('Getting current provider...');
    const currentProvider = getCurrentProvider();
    console.log('Current provider:', currentProvider);
    if (currentProvider !== 'gemini') {
        console.log('Setting Gemini as default provider...');
        setApiKey(null, 'gemini');
    }

    // Register global shortcuts for key functionality
    console.log('Registering global shortcuts...');

    globalShortcut.register('CommandOrControl+B', () => {
        toggleVisibility();
    });

    globalShortcut.register('CommandOrControl+H', async () => {
        const screenshotPath = await captureScreenshot();
        mainWindow.webContents.send('screenshot-taken', screenshotPath);
    });

    globalShortcut.register('CommandOrControl+Enter', () => {
        mainWindow.webContents.send('generate-solution');
    });

    globalShortcut.register('Shift+R', () => {
        mainWindow.webContents.send('reset-app');
    });

    // Arrow key navigation with Command/Control key
    globalShortcut.register('CommandOrControl+Up', () => {
        moveWindow('up');
    });

    globalShortcut.register('CommandOrControl+Down', () => {
        moveWindow('down');
    });

    globalShortcut.register('CommandOrControl+Left', () => {
        moveWindow('left');
    });

    globalShortcut.register('CommandOrControl+Right', () => {
        moveWindow('right');
    });

    // Add scrolling shortcuts for problem statement
    globalShortcut.register('Shift+Space+Up', () => {
        mainWindow.webContents.send('scroll-problem', 'up');
    });

    globalShortcut.register('Shift+Space+Down', () => {
        mainWindow.webContents.send('scroll-problem', 'down');
    });

    // Quit application
    globalShortcut.register('CommandOrControl+Q', () => {
        app.quit();
    });

    // Set up IPC handlers
    console.log('Setting up IPC handlers...');
    setupIpcHandlers();

    console.log('Application initialization complete');
});

// Set up IPC handlers for renderer communication
function setupIpcHandlers() {
    console.log('Registering IPC handlers...');

    // Handle API key setting
    ipcMain.on('set-api-key', (event, apiKey, provider = 'gemini') => {
        console.log(`IPC: set-api-key called for provider: ${provider}`);
        setApiKey(apiKey, provider);
    });

    // Handle provider preference
    ipcMain.on('set-preferred-provider', (event, provider) => {
        console.log(`IPC: set-preferred-provider called with: ${provider}`);
        // Always use Gemini
        console.log('Setting preferred provider:', provider);
    });

    // Get current provider 
    ipcMain.handle('get-current-provider', () => {
        console.log('IPC: get-current-provider called');
        const provider = getCurrentProvider();
        console.log('Returning current provider:', provider);
        return provider;
    });

    // Handle reset screenshots
    ipcMain.on('reset-screenshots', () => {
        console.log('IPC: reset-screenshots called');
        resetScreenshots();
    });

    // Extract problem from screenshots
    ipcMain.handle('extract-problem', async (event, screenshotPaths) => {
        console.log('IPC: extract-problem called with paths:', screenshotPaths);
        try {
            console.log('Calling extractProblemFromScreenshots...');
            const result = await extractProblemFromScreenshots(screenshotPaths);
            console.log('Problem extraction completed, result length:', result?.length);
            return result;
        } catch (error) {
            console.error('Error in extract-problem handler:', error);
            console.error('Error stack:', error.stack);
            return `Error: ${error.message}`;
        }
    });

    // Generate solution for problem
    ipcMain.handle('generate-solution', async (event, problemStatement) => {
        console.log('IPC: generate-solution called with problem statement length:', problemStatement?.length);
        try {
            console.log('Calling generateSolution...');
            const result = await generateSolution(problemStatement);
            console.log('Solution generation completed, success:', !result.error);
            return result;
        } catch (error) {
            console.error('Error in generate-solution handler:', error);
            console.error('Error stack:', error.stack);
            return { error: true, message: `Error: ${error.message}` };
        }
    });

    // Extract code from screenshot for optimization
    ipcMain.handle('extract-code', async (event, screenshotPath) => {
        console.log('IPC: extract-code called with path:', screenshotPath);
        try {
            console.log('Calling extractCodeFromScreenshot...');
            const result = await extractCodeFromScreenshot(screenshotPath);
            console.log('Code extraction completed, result length:', result?.length);
            return result;
        } catch (error) {
            console.error('Error in extract-code handler:', error);
            console.error('Error stack:', error.stack);
            return `Error: ${error.message}`;
        }
    });

    // Optimize solution
    ipcMain.handle('optimize-solution', async (event, problemStatement, codeToOptimize) => {
        console.log('IPC: optimize-solution called');
        console.log('- Problem statement length:', problemStatement?.length);
        console.log('- Code to optimize length:', codeToOptimize?.length);
        try {
            console.log('Calling optimizeSolution...');
            const result = await optimizeSolution(problemStatement, codeToOptimize);
            console.log('Solution optimization completed, success:', !result.error);
            return result;
        } catch (error) {
            console.error('Error in optimize-solution handler:', error);
            console.error('Error stack:', error.stack);
            return { error: true, message: `Error: ${error.message}` };
        }
    });

    console.log('All IPC handlers registered');
}

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// Unregister all shortcuts when app is about to quit
app.on('will-quit', () => {
    globalShortcut.unregisterAll();
});

// IPC events for communication between renderer and main processes
ipcMain.on('toggle-visibility', toggleVisibility);
ipcMain.on('move-window', (event, direction) => moveWindow(direction));
ipcMain.on('quit-app', () => app.quit());