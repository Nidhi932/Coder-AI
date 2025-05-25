// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

// Preload script for Electron
const { contextBridge, ipcRenderer } = require('electron');

console.log('[Preload] Initializing preload script');

// Expose ipcRenderer to window to use directly - for development only
// This will make the application work without the security layer
if (process.env.NODE_ENV !== 'production') {
    console.log('[Preload] Running in development mode, exposing ipcRenderer directly');
    window.ipcRenderer = ipcRenderer;
} else {
    console.log('[Preload] Running in production mode, using secure contextBridge');
}

// List of valid channels for security
const validSendChannels = [
    'toggle-visibility',
    'move-window',
    'screenshot-event',
    'set-api-key',
    'set-preferred-provider',
    'reset-screenshots',
    'quit-app'
];

const validReceiveChannels = [
    'screenshot-taken',
    'generate-solution',
    'reset-app',
    'scroll-problem',
    'extraction-complete'
];

const validInvokeChannels = [
    'extract-problem',
    'generate-solution',
    'extract-code',
    'optimize-solution',
    'get-current-provider'
];

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
console.log('[Preload] Exposing secure API through contextBridge');
contextBridge.exposeInMainWorld(
    'api', {
    // Send methods
    send: (channel, data) => {
        // Check if the channel is valid
        if (validSendChannels.includes(channel)) {
            console.log(`[Preload] Sending message to channel: ${channel}`, data ? 'with data' : 'without data');
            ipcRenderer.send(channel, data);
        } else {
            console.error(`[Preload] Attempted to send to invalid channel: ${channel}`);
        }
    },

    // Receive methods
    receive: (channel, func) => {
        // Check if the channel is valid
        if (validReceiveChannels.includes(channel)) {
            console.log(`[Preload] Setting up listener for channel: ${channel}`);
            // Create a wrapper function to provide debug logging
            const wrappedFunc = (event, ...args) => {
                console.log(`[Preload] Received message on channel: ${channel}`);
                func(...args);
            };
            ipcRenderer.on(channel, wrappedFunc);

            // Return a function to remove the event listener
            return () => {
                console.log(`[Preload] Removing listener for channel: ${channel}`);
                ipcRenderer.removeListener(channel, wrappedFunc);
            };
        } else {
            console.error(`[Preload] Attempted to listen to invalid channel: ${channel}`);
        }
    },

    // Invoke methods (with response)
    invoke: (channel, data) => {
        // Check if the channel is valid
        if (validInvokeChannels.includes(channel)) {
            console.log(`[Preload] Invoking channel: ${channel}`, data ? 'with data' : 'without data');
            return ipcRenderer.invoke(channel, data)
                .then(result => {
                    console.log(`[Preload] Received response from channel: ${channel}`);
                    return result;
                })
                .catch(error => {
                    console.error(`[Preload] Error in invoke to channel ${channel}:`, error);
                    throw error;
                });
        }
        console.error(`[Preload] Attempted to invoke invalid channel: ${channel}`);
        return Promise.reject(new Error(`Invoke to ${channel} is not allowed`));
    }
});

console.log('[Preload] Preload script initialization complete');
