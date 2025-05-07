import React, { useState, useEffect, useRef } from 'react';
import { Code, Zap, Download, RotateCcw, Camera, Send, FileCode, BrainCircuit, AlarmClock, Eye, EyeOff, X, Settings, AlertCircle, CheckCircle } from 'lucide-react';
import './index.css';

// Safely access Electron IPC
const ipcRenderer = window.require ? window.require('electron').ipcRenderer : null;

const App = () => {
    // State management
    const [theme, setTheme] = useState('dark');
    const [isLoading, setIsLoading] = useState(false);
    const [screenshots, setScreenshots] = useState([]);
    const [problemText, setProblemText] = useState('');
    const [thoughtProcess, setThoughtProcess] = useState('');
    const [solutionCode, setSolutionCode] = useState('');
    const [language, setLanguage] = useState('javascript');
    const [complexity, setComplexity] = useState({ time: 'O(n)', space: 'O(1)' });
    const [notification, setNotification] = useState(null);
    const [showSettings, setShowSettings] = useState(false);
    const [isVisible, setIsVisible] = useState(true);

    // References
    const problemRef = useRef(null);

    // Handle theme toggle
    const toggleTheme = () => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
        document.body.className = theme === 'dark' ? 'light-theme' : 'dark-theme';
    };

    // Handle visibility toggle
    const toggleVisibility = () => {
        setIsVisible(!isVisible);
        if (ipcRenderer) {
            ipcRenderer.send('toggle-visibility');
        }
    };

    // Initialize with theme and event listeners
    useEffect(() => {
        document.body.className = theme === 'dark' ? 'dark-theme' : 'light-theme';

        // Safety check for Electron environment
        if (!ipcRenderer) {
            console.log("Electron IPC not available");
            return;
        }

        // Set up IPC listeners
        const handleScreenshot = (event, path) => {
            console.log("Screenshot received:", path);
            showNotification('Screenshot captured', 'success');
            analyzeScreenshot(path);
        };

        const handleGenerateSolution = () => generateSolution();
        const handleResetApp = () => resetApp();

        ipcRenderer.on('screenshot-taken', handleScreenshot);
        ipcRenderer.on('generate-solution', handleGenerateSolution);
        ipcRenderer.on('reset-app', handleResetApp);

        // Set Gemini API key
        const geminiKey = 'AIzaSyDMov4SIWiLYrlee_2MnWt-Bhcl2kDlPLI';
        ipcRenderer.send('set-api-key', geminiKey, 'gemini');

        return () => {
            if (ipcRenderer) {
                ipcRenderer.removeAllListeners('screenshot-taken');
                ipcRenderer.removeAllListeners('generate-solution');
                ipcRenderer.removeAllListeners('reset-app');
            }
        };
    }, []);

    // Analyze screenshot and extract problem
    const analyzeScreenshot = (screenshotPath) => {
        setIsLoading(true);
        showNotification('Analyzing screenshot...', 'info');
        console.log(`[App] Analyzing screenshot from path: ${screenshotPath}`);

        // Get screenshots and extract problem using AI service
        if (ipcRenderer) {
            console.log('[App] Getting all screenshots from IPC...');
            ipcRenderer.invoke('extract-problem', [screenshotPath])
                .then(result => {
                    console.log('[App] Problem extraction result received:', result ? result.substring(0, 50) + '...' : 'No result');
                    setProblemText(result);
                    // After getting the problem, generate a solution
                    return ipcRenderer.invoke('generate-solution', result);
                })
                .then(solution => {
                    console.log('[App] Solution generation result received:', solution);
                    if (solution && !solution.error) {
                        console.log('[App] Setting solution data in state');
                        // The solution contains both thought process and code
                        setThoughtProcess(solution.fullSolution);
                        setSolutionCode(solution.code || '');

                        // Try to parse complexity from the solution
                        const timeComplexityMatch = solution.fullSolution.match(/[Tt]ime [Cc]omplexity.*?O\([^)]+\)/);
                        const spaceComplexityMatch = solution.fullSolution.match(/[Ss]pace [Cc]omplexity.*?O\([^)]+\)/);

                        setComplexity({
                            time: timeComplexityMatch ? timeComplexityMatch[0].match(/O\([^)]+\)/)[0] : "O(n)",
                            space: spaceComplexityMatch ? spaceComplexityMatch[0].match(/O\([^)]+\)/)[0] : "O(n)"
                        });

                        // Try to detect the language from the code
                        if (solution.code && solution.code.includes('function')) {
                            setLanguage('javascript');
                        } else if (solution.code && solution.code.includes('def ')) {
                            setLanguage('python');
                        } else if (solution.code && (solution.code.includes('public class') || solution.code.includes('private '))) {
                            setLanguage('java');
                        }
                    } else {
                        console.error('[App] Error generating solution:', solution?.message || 'Unknown error');
                        showNotification(solution?.message || 'Error generating solution', 'error');
                    }

                    setIsLoading(false);
                    showNotification('Problem analysis complete', 'success');
                })
                .catch(error => {
                    console.error('[App] Error during problem analysis:', error);
                    setIsLoading(false);
                    showNotification('Error analyzing the problem: ' + error.message, 'error');
                });
        } else {
            console.log('[App] IPC renderer not available, running in non-electron environment');
            setIsLoading(false);
            showNotification('Electron environment not available', 'error');
        }
    };

    // Generate solution for the problem
    const generateSolution = () => {
        if (!problemText) {
            showNotification('Please capture a problem first', 'warning');
            return;
        }

        console.log('[App] Generating solution for problem:', problemText.substring(0, 50) + '...');
        setIsLoading(true);
        showNotification('Generating solution...', 'info');

        if (ipcRenderer) {
            console.log('[App] Sending problem to AI service for solution generation');
            ipcRenderer.invoke('generate-solution', problemText)
                .then(solution => {
                    console.log('[App] Solution received from AI service:', solution);
                    if (solution && !solution.error) {
                        // If solution is successful, update the UI
                        setThoughtProcess(solution.fullSolution);
                        setSolutionCode(solution.code || '');

                        // Update complexity if available in the solution
                        const timeComplexityMatch = solution.fullSolution.match(/[Tt]ime [Cc]omplexity.*?O\([^)]+\)/);
                        const spaceComplexityMatch = solution.fullSolution.match(/[Ss]pace [Cc]omplexity.*?O\([^)]+\)/);

                        setComplexity({
                            time: timeComplexityMatch ? timeComplexityMatch[0].match(/O\([^)]+\)/)[0] : "O(n)",
                            space: spaceComplexityMatch ? spaceComplexityMatch[0].match(/O\([^)]+\)/)[0] : "O(n)"
                        });

                        showNotification('Solution generated successfully', 'success');
                    } else {
                        console.error('[App] Error generating solution:', solution?.message || 'Unknown error');
                        showNotification(solution?.message || 'Error generating solution', 'error');
                    }
                    setIsLoading(false);
                })
                .catch(error => {
                    console.error('[App] Error during solution generation:', error);
                    setIsLoading(false);
                    showNotification('Error generating solution: ' + error.message, 'error');
                });
        } else {
            console.log('[App] IPC renderer not available, running in non-electron environment');
            setIsLoading(false);
            showNotification('Electron environment not available', 'error');
        }
    };

    // Reset the app
    const resetApp = () => {
        setScreenshots([]);
        setProblemText('');
        setThoughtProcess('');
        setSolutionCode('');
        setComplexity({ time: 'O(n)', space: 'O(1)' });

        // Reset screenshots on backend
        if (ipcRenderer) {
            ipcRenderer.send('reset-screenshots');
        }

        showNotification('App reset complete', 'success');
    };

    // Show notification
    const showNotification = (message, type = 'info') => {
        setNotification({ message, type });

        // Auto-dismiss after 3 seconds
        setTimeout(() => {
            setNotification(null);
        }, 3000);
    };

    // Copy code to clipboard
    const copyToClipboard = () => {
        if (navigator.clipboard && solutionCode) {
            navigator.clipboard.writeText(solutionCode)
                .then(() => showNotification('Code copied to clipboard', 'success'))
                .catch(err => showNotification('Failed to copy code', 'error'));
        }
    };

    // Take screenshot
    const takeScreenshot = () => {
        if (ipcRenderer) {
            ipcRenderer.send('screenshot-event');
        } else {
            // Demo mode - use sample data
            analyzeScreenshot('sample-screenshot.png');
        }
    };

    return (
        <div className={`app-container ${theme} ${isVisible ? 'visible' : 'hidden'}`}>
            {/* Header */}
            <header className="app-header">
                <div className="logo-container">
                    <div className="logo-icon">
                        <Code size={24} />
                    </div>
                    <h1>Interview Coder</h1>
                </div>

                <div className="shortcuts">
                    <div className="shortcut-badge">
                        <span className="key">Ctrl+B</span>
                        <span className="description">Toggle Panel</span>
                    </div>
                    <div className="shortcut-badge">
                        <span className="key">Ctrl+H</span>
                        <span className="description">Screenshot</span>
                    </div>
                </div>

                <div className="header-actions">
                    <button onClick={toggleTheme} className="icon-button theme-toggle" title="Toggle Theme">
                        <Zap size={18} />
                    </button>
                    <button onClick={toggleVisibility} className="icon-button" title="Toggle Visibility">
                        {isVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                    <button onClick={takeScreenshot} className="icon-button" title="Take Screenshot">
                        <Camera size={18} />
                    </button>
                    <button onClick={generateSolution} className="primary-button" disabled={isLoading || !problemText}>
                        <Send size={18} />
                        <span>Generate</span>
                    </button>
                    <button onClick={resetApp} className="icon-button" title="Reset">
                        <RotateCcw size={18} />
                    </button>
                    <button onClick={() => setShowSettings(!showSettings)} className="icon-button" title="Settings">
                        <Settings size={18} />
                    </button>
                </div>
            </header>

            {/* Main Content - Split View */}
            <main className="split-view-container">
                {/* Problem Panel */}
                <div className="panel problem-panel">
                    <div className="panel-header">
                        <div className="section-header">
                            <FileCode size={18} />
                            <h2>Problem Statement</h2>
                        </div>
                    </div>
                    <div className="panel-content" ref={problemRef}>
                        {isLoading ? (
                            <div className="skeleton-loading">
                                <div className="skeleton-title"></div>
                                <div className="skeleton-line"></div>
                                <div className="skeleton-line"></div>
                                <div className="skeleton-line"></div>
                            </div>
                        ) : !problemText ? (
                            <div className="empty-state">
                                <Camera size={48} />
                                <h3>Capture Problem</h3>
                                <p>Use Ctrl+H to take a screenshot of your coding problem</p>
                            </div>
                        ) : (
                            <div className="problem-content">
                                <div className="problem-description">{problemText}</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Solution Panel */}
                <div className="panel solution-panel">
                    <div className="panel-header">
                        <div className="section-header">
                            <BrainCircuit size={18} />
                            <h2>Solution</h2>
                        </div>
                    </div>
                    <div className="panel-content">
                        {isLoading ? (
                            <div className="skeleton-loading">
                                <div className="skeleton-title"></div>
                                <div className="skeleton-line"></div>
                                <div className="skeleton-line"></div>
                                <div className="skeleton-line"></div>
                            </div>
                        ) : !solutionCode ? (
                            <div className="empty-state">
                                <BrainCircuit size={48} />
                                <h3>Generate Solution</h3>
                                <p>Click the Generate button to create a solution</p>
                            </div>
                        ) : (
                            <div className="solution-content">
                                {/* Thought Process */}
                                <div className="solution-section thought-process">
                                    <div className="section-header">
                                        <BrainCircuit size={18} />
                                        <h3>Approach</h3>
                                    </div>
                                    <div className="approach-content">
                                        {thoughtProcess}
                                    </div>
                                </div>

                                {/* Code Section */}
                                <div className="solution-section code-section">
                                    <div className="code-header">
                                        <div className="code-header-left">
                                            <span className="language-badge">{language}</span>
                                            <span className="provider-badge gemini">Gemini</span>
                                        </div>
                                        <div className="code-header-actions">
                                            <button className="icon-button" onClick={copyToClipboard} title="Copy Code">
                                                <Download size={18} />
                                            </button>
                                        </div>
                                    </div>
                                    <pre className="code-container">
                                        <code>{solutionCode}</code>
                                    </pre>
                                </div>

                                {/* Complexity Analysis */}
                                <div className="solution-section complexity-section">
                                    <div className="section-header">
                                        <AlarmClock size={18} />
                                        <h3>Complexity</h3>
                                    </div>
                                    <div className="complexity-grid">
                                        <div className="complexity-card">
                                            <span className="complexity-title">Time:</span> {complexity.time}
                                        </div>
                                        <div className="complexity-card">
                                            <span className="complexity-title">Space:</span> {complexity.space}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Notification */}
            {notification && (
                <div className={`notification ${notification.type}`}>
                    {notification.type === 'success' && <CheckCircle size={18} />}
                    {notification.type === 'error' && <AlertCircle size={18} />}
                    {notification.type === 'warning' && <AlertCircle size={18} />}
                    {notification.type === 'info' && <AlertCircle size={18} />}
                    <span>{notification.message}</span>
                    <button onClick={() => setNotification(null)} className="icon-button">
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* Settings Modal */}
            {showSettings && (
                <div className="settings-modal">
                    <div className="settings-content">
                        <div className="settings-header">
                            <h2>Settings</h2>
                            <button onClick={() => setShowSettings(false)} className="icon-button">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="settings-body">
                            <div className="settings-section">
                                <h3>Keyboard Shortcuts</h3>
                                <div className="shortcuts-list">
                                    <div className="shortcut-item">
                                        <span className="shortcut-key">Ctrl+B</span>
                                        <span className="shortcut-desc">Toggle panel visibility</span>
                                    </div>
                                    <div className="shortcut-item">
                                        <span className="shortcut-key">Ctrl+H</span>
                                        <span className="shortcut-desc">Take screenshot</span>
                                    </div>
                                    <div className="shortcut-item">
                                        <span className="shortcut-key">Ctrl+Enter</span>
                                        <span className="shortcut-desc">Generate solution</span>
                                    </div>
                                    <div className="shortcut-item">
                                        <span className="shortcut-key">Ctrl+Arrow Keys</span>
                                        <span className="shortcut-desc">Move window</span>
                                    </div>
                                </div>
                            </div>
                            <div className="settings-section">
                                <h3>About</h3>
                                <p>Interview Coder v1.0.0</p>
                                <p>An invisible AI assistant for technical coding interviews</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;