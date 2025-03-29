const { ipcRenderer } = require('electron');
const fs = require('fs-extra');
const path = require('path');

// DOM Elements
const toggleButton = document.getElementById('toggleButton');
const quitButton = document.getElementById('quitButton');
const tabButtons = document.querySelectorAll('.tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');
const screenshotsContainer = document.getElementById('screenshotsContainer');
const problemStatement = document.getElementById('problemStatement');
const generateSolutionBtn = document.getElementById('generateSolutionBtn');
const resetBtn = document.getElementById('resetBtn');
const solutionContent = document.getElementsByClassName('solution-content');
const solutionProvider = document.getElementById('solutionProvider');
const optimizationContent = document.getElementById('optimizationContent');
const providerRadios = document.querySelectorAll('input[name="ai-provider"]');
const openaiKeyInput = document.getElementById('openaiKey');
const geminiKeyInput = document.getElementById('geminiKey');
const saveOpenaiKeyBtn = document.getElementById('saveOpenaiKey');
const saveGeminiKeyBtn = document.getElementById('saveGeminiKey');
const currentProviderDisplay = document.getElementById('currentProvider');
const statusMessage = document.getElementById('statusMessage');

// State variables
let currentProblemStatement = '';
let currentSolution = '';
let openaiKey = localStorage.getItem('openai_api_key') || '';
let geminiKey = localStorage.getItem('gemini_api_key') || 'AIzaSyDMov4SIWiLYrlee_2MnWt-Bhcl2kDlPLI';
let preferredProvider = localStorage.getItem('preferred_provider') || 'gemini';
let screenshotPaths = [];
let isInProblemMode = true;

// Initialize
function init() {
    // Load API keys from localStorage if available
    if (openaiKey) {
        openaiKeyInput.value = '••••••••••••••••••••••••••';
    }

    if (geminiKey) {
        geminiKeyInput.value = 'AIzaSyDMov4SIWiLYrlee_2MnWt-Bhcl2kDlPLI';
    }

    // Set the preferred provider radio
    document.querySelector(`input[name="ai-provider"][value="${preferredProvider}"]`).checked = true;

    // Update provider display
    updateProviderDisplay();

    // Register event listeners
    registerEventListeners();

    // Request current provider from main process
    ipcRenderer.invoke('get-current-provider').then(provider => {
        updateProviderDisplay(provider);
    });
}

// Event listeners
function registerEventListeners() {
    // Tab switching
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            switchTab(tabId);
        });
    });

    // Toggle visibility button
    toggleButton.addEventListener('click', () => {
        ipcRenderer.send('toggle-visibility');
    });

    // Quit button
    quitButton.addEventListener('click', () => {
        ipcRenderer.send('quit-app');
    });

    // Generate solution button
    generateSolutionBtn.addEventListener('click', () => {
        handleGenerateSolution();
    });

    // Reset button
    resetBtn.addEventListener('click', () => {
        resetApp();
    });

    // Provider selection radios
    providerRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            preferredProvider = e.target.value;
            localStorage.setItem('preferred_provider', preferredProvider);
            ipcRenderer.send('set-preferred-provider', preferredProvider);
            updateProviderDisplay();
        });
    });

    // Save OpenAI API key button
    saveOpenaiKeyBtn.addEventListener('click', () => {
        saveApiKey('openai');
    });

    // Save Gemini API key button
    saveGeminiKeyBtn.addEventListener('click', () => {
        saveApiKey('gemini');
    });

    // IPC events from main process
    ipcRenderer.on('screenshot-taken', (event, screenshotPath) => {
        handleScreenshotTaken(screenshotPath);
    });

    ipcRenderer.on('generate-solution', () => {
        handleGenerateSolution();
    });

    ipcRenderer.on('reset-app', () => {
        resetApp();
    });

    ipcRenderer.on('provider-changed', (event, provider) => {
        updateProviderDisplay(provider);
    });

    // Add scroll-problem event listener
    ipcRenderer.on('scroll-problem', (event, direction) => {
        const problemStatement = document.getElementById('problemStatement');
        if (problemStatement) {
            const scrollAmount = 100; // Adjust this value to control scroll speed
            if (direction === 'up') {
                problemStatement.scrollTop -= scrollAmount;
            } else if (direction === 'down') {
                problemStatement.scrollTop += scrollAmount;
            }
        }
    });
}

// Update the provider display
function updateProviderDisplay(provider = null) {
    if (provider) {
        currentProviderDisplay.textContent = provider === 'openai' ? 'OpenAI' : 'Google Gemini';
    } else {
        currentProviderDisplay.textContent = preferredProvider === 'openai' ? 'OpenAI' : 'Google Gemini';
    }
}

// Switch between tabs
function switchTab(tabId) {
    tabButtons.forEach(button => {
        if (button.getAttribute('data-tab') === tabId) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });

    tabPanes.forEach(pane => {
        if (pane.id === tabId) {
            pane.classList.add('active');
        } else {
            pane.classList.remove('active');
        }
    });

    // Update mode
    isInProblemMode = tabId === 'problem';
    setStatusMessage(isInProblemMode ? 'Problem Mode' : 'Solution Mode');
}

// Handle screenshot taken
function handleScreenshotTaken(screenshotPath) {
    console.log('handleScreenshotTaken called with path:', screenshotPath);

    if (!screenshotPath) {
        console.error('Failed to capture screenshot - path is empty');
        setStatusMessage('Failed to capture screenshot', 'error');
        return;
    }

    // Verify the screenshot file exists
    try {
        if (!fs.existsSync(screenshotPath)) {
            console.error('Screenshot file does not exist at path:', screenshotPath);
            setStatusMessage('Screenshot file not found at expected location', 'error');
            return;
        }
        console.log('Screenshot file verified to exist');
    } catch (error) {
        console.error('Error checking screenshot file:', error);
    }

    setStatusMessage('Screenshot captured!', 'success');

    // Add to our array of screenshots
    screenshotPaths.push(screenshotPath);
    console.log('Added screenshot path. Current paths:', screenshotPaths);

    // Update UI to show screenshots
    updateScreenshotsUI();

    // If we're in problem mode, extract problem after screenshot
    if (isInProblemMode && screenshotPaths.length >= 1) {
        console.log('Automatically extracting problem from screenshots');
        extractProblem();
    }

    // If we're in solution mode, try to optimize the solution
    if (!isInProblemMode && screenshotPaths.length > 0) {
        // Wait for the next generate command to optimize
        setStatusMessage('Code screenshot captured. Press ⌘+Enter to optimize.', 'success');
    }
}

// Update the screenshots UI
function updateScreenshotsUI() {
    // Clear container
    screenshotsContainer.innerHTML = '';

    if (screenshotPaths.length === 0) {
        screenshotsContainer.innerHTML = '<div class="placeholder">No screenshots yet</div>';
        return;
    }

    // Add each screenshot as an image
    screenshotPaths.forEach((path, index) => {
        const img = document.createElement('img');
        img.src = path;
        img.className = 'screenshot';
        img.alt = `Screenshot ${index + 1}`;
        screenshotsContainer.appendChild(img);
    });
}

// Extract problem from screenshots
async function extractProblem() {
    console.log('Extracting problem from screenshots...');
    console.log('Current screenshot paths:', screenshotPaths);

    if (screenshotPaths.length === 0) {
        console.log('No screenshots available');
        setStatusMessage('No screenshots available. Please capture screenshots first.', 'error');
        return;
    }

    setStatusMessage('Extracting problem from screenshots...', 'info');

    try {
        // Call the backend function to extract problem using AI
        console.log('Calling extractProblemFromScreenshots with paths:', screenshotPaths);
        const problemText = await window.extractProblemFromScreenshots(screenshotPaths);
        console.log('Received problem text, length:', problemText?.length);

        if (problemText.startsWith('Error:')) {
            console.error('Error extracting problem:', problemText);
            setStatusMessage(problemText, 'error');
            return;
        }

        // Update UI with extracted problem
        console.log('Updating UI with extracted problem');
        problemStatement.innerHTML = problemText;
        currentProblemStatement = problemText;

        setStatusMessage('Problem extracted successfully! Press ⌘+Enter to generate solution.', 'success');
        return problemText;
    } catch (error) {
        console.error('Error extracting problem:', error);
        setStatusMessage('Failed to extract problem', 'error');
        return null;
    }
}

// Handle generate solution button click or keyboard shortcut
async function handleGenerateSolution() {
    console.log('handleGenerateSolution called');

    if (isInProblemMode) {
        console.log('In problem mode, generating solution');
        await generateSolution();
    } else {
        console.log('In solution mode, optimizing solution');
        await optimizeSolution();
    }
}

// Generate solution when button is clicked or keyboard shortcut is used
async function generateSolution() {
    console.log('generateSolution called');

    if (!currentProblemStatement) {
        setStatusMessage('No problem statement available. Please capture screenshots first.', 'error');
        return;
    }

    setStatusMessage('Generating solution...', 'info');

    try {
        // Make request to backend
        const response = await fetch('http://localhost:3000/api/generate-solution', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ problemStatement: currentProblemStatement })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to generate solution');
        }

        const solution = await response.json();

        if (solution.error) {
            throw new Error(solution.message || 'Failed to generate solution');
        }

        // Update UI with solution
        solutionContent[0].innerHTML = formatWithHighlighting(solution.fullSolution);
        currentSolution = solution.code;

        setStatusMessage('Solution generated successfully! Press Shift+R to reset and try again.', 'success');

        // Update solution provider badge
        updateSolutionProviderBadge(solution.provider || 'gemini');
    } catch (error) {
        console.error('Error generating solution:', error);
        setStatusMessage('Failed to generate solution', 'error');
    }
}

// Update the solution provider badge
function updateSolutionProviderBadge(provider) {
    solutionProvider.className = 'provider-badge';
    solutionProvider.classList.add(provider);
    solutionProvider.textContent = provider === 'openai' ? 'OpenAI' : 'Gemini';
}

// Optimize existing solution
async function optimizeSolution() {
    if (!currentProblemStatement) {
        setStatusMessage('No problem statement available.', 'error');
        return;
    }

    if (screenshotPaths.length === 0) {
        setStatusMessage('No code screenshots to optimize. Capture your code first.', 'error');
        return;
    }

    setStatusMessage('Optimizing solution...', 'info');

    try {
        // Extract code from screenshot first
        const extractedCode = await window.extractCodeFromScreenshot(screenshotPaths[screenshotPaths.length - 1]);

        if (extractedCode.startsWith('Error:')) {
            setStatusMessage(extractedCode, 'error');
            return;
        }

        // Call the backend function to optimize solution
        const optimization = await window.optimizeSolution(currentProblemStatement, extractedCode);

        if (optimization.error) {
            setStatusMessage(optimization.message, 'error');
            return;
        }

        // Update UI with optimization
        optimizationContent.innerHTML = formatWithHighlighting(optimization.fullAnalysis);

        setStatusMessage('Solution optimized successfully!', 'success');
    } catch (error) {
        console.error('Error optimizing solution:', error);
        setStatusMessage('Failed to optimize solution', 'error');
    }
}

// Format code with syntax highlighting (simple version)
function formatWithHighlighting(text) {
    // Replace markdown code blocks with HTML
    return text.replace(/```([\w]*)\n([\s\S]*?)```/g, (match, language, code) => {
        return `<pre><code class="${language}">${escapeHtml(code)}</code></pre>`;
    });
}

// Escape HTML entities
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Save API key
function saveApiKey(provider) {
    let keyInput, keyVar;

    if (provider === 'openai') {
        keyInput = openaiKeyInput;
        keyVar = 'openai_api_key';
    } else if (provider === 'gemini') {
        keyInput = geminiKeyInput;
        keyVar = 'gemini_api_key';
    } else {
        return;
    }

    const newApiKey = keyInput.value;

    if (!newApiKey || newApiKey === '••••••••••••••••••••••••••') {
        setStatusMessage(`Please enter a valid ${provider === 'openai' ? 'OpenAI' : 'Gemini'} API key`, 'error');
        return;
    }

    // Save to localStorage
    localStorage.setItem(keyVar, newApiKey);
    if (provider === 'openai') {
        openaiKey = newApiKey;
    } else {
        geminiKey = newApiKey;
    }

    // Mask the input
    keyInput.value = '••••••••••••••••••••••••••';

    // Notify main process to update API key
    ipcRenderer.send('set-api-key', newApiKey, provider);

    setStatusMessage(`${provider === 'openai' ? 'OpenAI' : 'Gemini'} API key saved successfully!`, 'success');

    // If this is the preferred provider, set it as active
    if (provider === preferredProvider) {
        ipcRenderer.send('set-preferred-provider', provider);
    }
}

// Reset the app
function resetApp() {
    // Clear screenshots
    screenshotPaths = [];
    updateScreenshotsUI();

    // Clear problem statement
    problemStatement.innerHTML = '<p class="placeholder">Problem will be extracted from screenshots...</p>';
    currentProblemStatement = '';

    // Clear solution
    solutionContent.innerHTML = '<p class="placeholder">Solution will appear here after analyzing the problem...</p>';
    solutionProvider.className = 'provider-badge';
    solutionProvider.textContent = '';
    currentSolution = '';

    // Clear optimization
    optimizationContent.innerHTML = '<p class="placeholder">Optimizations will appear here...</p>';

    // Switch to problem tab
    switchTab('problem');

    // Tell main process to reset
    ipcRenderer.send('reset-screenshots');

    setStatusMessage('Application reset. Ready for new problem.', 'success');
}

// Set status message with optional type (success, error, info)
function setStatusMessage(message, type = '') {
    statusMessage.textContent = message;

    // Reset classes
    statusMessage.className = '';

    if (type) {
        statusMessage.classList.add(type);
    }

    // Clear message after 5 seconds if it's a status update
    if (type === 'success' || type === 'error') {
        setTimeout(() => {
            statusMessage.textContent = isInProblemMode ? 'Problem Mode' : 'Solution Mode';
            statusMessage.className = '';
        }, 5000);
    }
}

// Initialize preload bridge for safer IPC
window.extractProblemFromScreenshots = async (paths) => {
    console.log('Bridge: extractProblemFromScreenshots called with paths:', paths);
    try {
        const result = await ipcRenderer.invoke('extract-problem', paths);
        console.log('Bridge: extractProblemFromScreenshots result:', result);
        console.log('Bridge: extractProblemFromScreenshots result length:', result?.length);
        return result;
    } catch (error) {
        console.error('Bridge: Error in extractProblemFromScreenshots:', error);
        throw error;
    }
};

window.generateSolution = async (problem) => {
    console.log('Bridge: generateSolution called with problem length:', problem?.length);
    try {
        const result = await ipcRenderer.invoke('generate-solution', problem);
        console.log('Bridge: generateSolution result:', result?.error ? 'error' : 'success');
        return result;
    } catch (error) {
        console.error('Bridge: Error in generateSolution:', error);
        throw error;
    }
};

window.extractCodeFromScreenshot = async (path) => {
    console.log('Bridge: extractCodeFromScreenshot called with path:', path);
    try {
        const result = await ipcRenderer.invoke('extract-code', path);
        console.log('Bridge: extractCodeFromScreenshot result length:', result?.length);
        return result;
    } catch (error) {
        console.error('Bridge: Error in extractCodeFromScreenshot:', error);
        throw error;
    }
};

window.optimizeSolution = async (problem, code) => {
    console.log('Bridge: optimizeSolution called');
    console.log('- Problem length:', problem?.length);
    console.log('- Code length:', code?.length);
    try {
        const result = await ipcRenderer.invoke('optimize-solution', problem, code);
        console.log('Bridge: optimizeSolution result:', result?.error ? 'error' : 'success');
        return result;
    } catch (error) {
        console.error('Bridge: Error in optimizeSolution:', error);
        throw error;
    }
};

// Initialize the app
init(); 