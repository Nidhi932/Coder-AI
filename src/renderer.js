/**
 * This file will automatically be loaded by webpack and run in the "renderer" context.
 * To learn more about the differences between the "main" and the "renderer" context in
 * Electron, visit:
 *
 * https://electronjs.org/docs/tutorial/process-model
 *
 * By default, Node.js integration in this file is disabled. When enabling Node.js integration
 * in a renderer process, please be aware of potential security implications. You can read
 * more about security risks here:
 *
 * https://electronjs.org/docs/tutorial/security
 *
 * To enable Node.js integration in this file, open up `main.js` and enable the `nodeIntegration`
 * flag:
 *
 * ```
 *  // Create the browser window.
 *  mainWindow = new BrowserWindow({
 *    width: 800,
 *    height: 600,
 *    webPreferences: {
 *      nodeIntegration: true
 *    }
 *  });
 * ```
 */

import './index.css';
import App from './App';
import React from 'react';
import { createRoot } from 'react-dom/client';

console.log('[Renderer] Starting Interview Coder application...');
console.log('[Renderer] React version:', React.version);
console.log('[Renderer] Environment:', process.env.NODE_ENV);

// Initialize the app
const container = document.getElementById('root');
if (!container) {
    console.error('[Renderer] Fatal: Root container not found in the DOM');
} else {
    console.log('[Renderer] Root container found, initializing React application');
    try {
        const root = createRoot(container);
        console.log('[Renderer] React root created successfully');

        // Render the application
        console.log('[Renderer] Rendering App component...');
        root.render(<App />);
        console.log('[Renderer] App component rendered successfully');
    } catch (error) {
        console.error('[Renderer] Error initializing React application:', error);
    }
}

// Register error handlers for uncaught exceptions
window.addEventListener('error', (event) => {
    console.error('[Renderer] Uncaught error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('[Renderer] Unhandled promise rejection:', event.reason);
});

console.log('[Renderer] Initialization complete');

console.log('👋 This message is being logged by "renderer.js", included via webpack');
