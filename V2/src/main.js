const { app, BrowserWindow, globalShortcut, ipcMain, screen } = require('electron');
const path = require('path');
const { captureScreenshot, getAllScreenshots, resetScreenshots } = require('./utils/screenshot');
const { initAI, setApiKey, getCurrentProvider, extractProblemFromScreenshots, generateSolution, optimizeSolution, extractCodeFromScreenshot } = require('./utils/openai');
const { exec } = require('child_process');
const fs = require('fs');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

// Keep a global reference of the window object to prevent garbage collection
let mainWindow;
let isVisible = true;
let isHiddenFromCapture = false;

// Path to Invisiwind executable
const invisiwindPath = app.isPackaged
  ? path.join(process.resourcesPath, 'Invisiwind.exe')
  : path.join(__dirname, '..', 'Invisiwind.exe');

// Alternative paths to try if the main path fails
const alternativePaths = [
  path.join(__dirname, '..', 'Invisiwind.exe'),
  path.join(app.getAppPath(), 'Invisiwind.exe'),
  path.join(path.dirname(app.getPath('exe')), 'Invisiwind.exe')
];


// Helper function to find the Invisiwind executable
function findInvisiwindExecutable() {
  // First check the primary path
  if (fs.existsSync(invisiwindPath)) {
    console.log(`Invisiwind found at primary path: ${invisiwindPath}`);
    return invisiwindPath;
  }

  // Try alternative paths
  for (const altPath of alternativePaths) {
    if (fs.existsSync(altPath)) {
      console.log(`Invisiwind found at alternative path: ${altPath}`);
      return altPath;
    }
  }

  console.error('Invisiwind executable not found in any expected location');
  return null;
}

// Automatically hide this application from screen capture
function hideFromScreenCapture() {
  const pid = process.pid;
  console.log(`Attempting to hide application with PID: ${pid}`);

  // Find the Invisiwind executable
  const execPath = findInvisiwindExecutable();
  if (!execPath) {
    console.error('Cannot hide application: Invisiwind executable not found');
    return;
  }

  // Execute Invisiwind to hide the current process
  exec(`"${execPath}" --hide ${pid}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error hiding application: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`Invisiwind stderr: ${stderr}`);
      return;
    }
    console.log(`Application hidden from screen recording successfully.`);
  });
}

// Unhide application from screen capture
function showInScreenCapture() {
  const pid = process.pid;
  console.log(`Attempting to unhide application with PID: ${pid}`);

  // Find the Invisiwind executable
  const execPath = findInvisiwindExecutable();
  if (!execPath) {
    console.error('Cannot unhide application: Invisiwind executable not found');
    return;
  }

  // Execute Invisiwind to unhide the current process
  exec(`"${execPath}" --unhide ${pid}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error unhiding application: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`Invisiwind stderr: ${stderr}`);
      return;
    }
    console.log(`Application unhidden from screen recording successfully.`);
  });
}

// Track initialization state
let aiInitialized = false;

function createWindow() {
  console.log('Creating application window...');
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  console.log('Screen dimensions:', { width, height });

  // Create the browser window with maximum stealth settings
  mainWindow = new BrowserWindow({
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      preload: path.join(__dirname, 'preload.js')
    },
    // Enhanced stealth settings
    backgroundColor: '#00000000',
    opacity: 0.9,
    focusable: false,
    // Maximum stealth configuration
    type: 'toolbar',
    titleBarStyle: 'hidden',
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    show: false, // Start hidden
    width: Math.round(width * 0.4),
    height: Math.round(height * 0.8)
  });

  // Enhanced stealth mode
  // mainWindow.setIgnoreMouseEvents(true, { forward: true });
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

  // Load the app
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

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

  // Hide application from screen recording
  hideFromScreenCapture();
  isHiddenFromCapture = true;

  // Register global shortcuts for key functionality
  console.log('Registering global shortcuts...');

  // Toggle visibility (Ctrl+B)
  globalShortcut.register('CommandOrControl+B', () => {
    toggleVisibility();
  });

  // Toggle hiding from capture (Ctrl+Alt+H)
  globalShortcut.register('CommandOrControl+Alt+H', () => {
    if (isHiddenFromCapture) {
      showInScreenCapture();
      isHiddenFromCapture = false;
    } else {
      hideFromScreenCapture();
      isHiddenFromCapture = true;
    }
  });

  // Take screenshot (Ctrl+H)
  globalShortcut.register('CommandOrControl+H', async () => {
    const screenshotPath = await captureScreenshot();
    mainWindow.webContents.send('screenshot-taken', screenshotPath);
  });

  // Add new listener for screenshot-event
  ipcMain.on('screenshot-event', async () => {
    const screenshotPath = await captureScreenshot();
    mainWindow.webContents.send('screenshot-taken', screenshotPath);
  });

  // Generate solution (Ctrl+Enter)
  globalShortcut.register('CommandOrControl+Enter', () => {
    mainWindow.webContents.send('generate-solution');
  });

  // Reset app (Shift+R)
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

  // Quit application (Ctrl+Q)
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
  console.log('[Main] Registering IPC handlers...');

  // Handle API key setting
  ipcMain.on('set-api-key', (event, apiKey, provider = 'gemini') => {
    console.log(`[Main] IPC: set-api-key called for provider: ${provider}`);
    try {
      setApiKey(apiKey, provider);
      console.log(`[Main] API key for ${provider} set successfully`);
    } catch (error) {
      console.error(`[Main] Error setting API key for ${provider}:`, error);
    }
  });

  // Get current provider
  ipcMain.handle('get-current-provider', () => {
    console.log('[Main] IPC: get-current-provider called');
    const provider = getCurrentProvider();
    console.log('[Main] Returning current provider:', provider);
    return provider;
  });

  // Handle reset screenshots
  ipcMain.on('reset-screenshots', () => {
    console.log('[Main] IPC: reset-screenshots called');
    resetScreenshots();
  });

  // Extract problem from screenshots
  ipcMain.handle('extract-problem', async (event, screenshotPaths) => {
    console.log('[Main] IPC: extract-problem called with paths:', screenshotPaths);
    console.log('[Main] Number of screenshots:', screenshotPaths?.length || 0);

    try {
      // Verify paths exist
      if (!screenshotPaths || screenshotPaths.length === 0) {
        console.error('[Main] No screenshot paths provided');
        return 'Error: No screenshot paths provided';
      }

      for (const path of screenshotPaths) {
        console.log(`[Main] Verifying screenshot path: ${path}`);
        if (!fs.existsSync(path)) {
          console.error(`[Main] Screenshot file not found: ${path}`);
          return `Error: Screenshot file not found: ${path}`;
        }
      }

      console.log('[Main] All screenshot paths verified, calling extractProblemFromScreenshots...');
      const result = await extractProblemFromScreenshots(screenshotPaths);
      console.log('[Main] Problem extraction completed, result length:', result?.length);
      console.log('[Main] Problem extraction result preview:', result?.substring(0, 100) + '...');
      return result;
    } catch (error) {
      console.error('[Main] Error in extract-problem handler:', error);
      console.error('[Main] Error stack:', error.stack);
      return `Error: ${error.message}`;
    }
  });

  // Generate solution for problem
  ipcMain.handle('generate-solution', async (event, problemStatement) => {
    console.log('[Main] IPC: generate-solution called with problem statement length:', problemStatement?.length);
    console.log('[Main] Problem statement preview:', problemStatement?.substring(0, 100) + '...');

    try {
      // Validate input
      if (!problemStatement) {
        console.error('[Main] No problem statement provided');
        return { error: true, message: 'Error: No problem statement provided' };
      }

      console.log('[Main] Calling generateSolution...');
      const result = await generateSolution(problemStatement);
      console.log('[Main] Solution generation completed, success:', !result.error);

      if (result.error) {
        console.error('[Main] Error in solution generation:', result.message);
      } else {
        console.log('[Main] Solution preview:', result.fullSolution?.substring(0, 100) + '...');
        console.log('[Main] Code preview:', result.code?.substring(0, 100) + '...');
      }

      return result;
    } catch (error) {
      console.error('[Main] Error in generate-solution handler:', error);
      console.error('[Main] Error stack:', error.stack);
      return { error: true, message: `Error: ${error.message}` };
    }
  });

  // Extract code from screenshot for optimization
  ipcMain.handle('extract-code', async (event, screenshotPath) => {
    console.log('[Main] IPC: extract-code called with path:', screenshotPath);

    try {
      // Verify path exists
      if (!screenshotPath) {
        console.error('[Main] No screenshot path provided');
        return 'Error: No screenshot path provided';
      }

      if (!fs.existsSync(screenshotPath)) {
        console.error(`[Main] Screenshot file not found: ${screenshotPath}`);
        return `Error: Screenshot file not found: ${screenshotPath}`;
      }

      console.log('[Main] Calling extractCodeFromScreenshot...');
      const result = await extractCodeFromScreenshot(screenshotPath);
      console.log('[Main] Code extraction completed, result length:', result?.length);
      console.log('[Main] Code extraction result preview:', result?.substring(0, 100) + '...');
      return result;
    } catch (error) {
      console.error('[Main] Error in extract-code handler:', error);
      console.error('[Main] Error stack:', error.stack);
      return `Error: ${error.message}`;
    }
  });

  // Optimize solution
  ipcMain.handle('optimize-solution', async (event, problemStatement, codeToOptimize) => {
    console.log('[Main] IPC: optimize-solution called');
    console.log('[Main] - Problem statement length:', problemStatement?.length);
    console.log('[Main] - Code to optimize length:', codeToOptimize?.length);
    console.log('[Main] - Problem preview:', problemStatement?.substring(0, 100) + '...');
    console.log('[Main] - Code preview:', codeToOptimize?.substring(0, 100) + '...');

    try {
      // Validate inputs
      if (!problemStatement) {
        console.error('[Main] No problem statement provided');
        return { error: true, message: 'Error: No problem statement provided' };
      }

      if (!codeToOptimize) {
        console.error('[Main] No code provided to optimize');
        return { error: true, message: 'Error: No code provided to optimize' };
      }

      console.log('[Main] Calling optimizeSolution...');
      const result = await optimizeSolution(problemStatement, codeToOptimize);
      console.log('[Main] Solution optimization completed, success:', !result.error);

      if (result.error) {
        console.error('[Main] Error in solution optimization:', result.message);
      } else {
        console.log('[Main] Optimization result preview:', result.fullAnalysis?.substring(0, 100) + '...');
      }

      return result;
    } catch (error) {
      console.error('[Main] Error in optimize-solution handler:', error);
      console.error('[Main] Error stack:', error.stack);
      return { error: true, message: `Error: ${error.message}` };
    }
  });

  console.log('[Main] All IPC handlers registered');
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
