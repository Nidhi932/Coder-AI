import React, { useState, useEffect, useRef } from 'react';
import { Code, Zap, Download, RotateCcw, Camera, Send, FileCode, BrainCircuit, AlarmClock, Eye, EyeOff, X, Settings, AlertCircle, CheckCircle } from 'lucide-react';
import './index.css';

// Safely access Electron IPC
const ipcRenderer = window.require ? window.require('electron').ipcRenderer : null;

const App = () => {
    // State management 
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
    const [showQuestionSection, setShowQuestionSection] = useState(false); // Hide Question section by default
    const [showImageModal, setShowImageModal] = useState(false);
    const [modalImage, setModalImage] = useState('');

    // References
    const problemRef = useRef(null);

    // Handle visibility toggle
    const toggleVisibility = () => {
        setIsVisible(!isVisible);
        if (ipcRenderer) {
            ipcRenderer.send('toggle-visibility');
        }
    };

    // Toggle question section visibility
    const toggleQuestionSection = () => {
        setShowQuestionSection(!showQuestionSection);
    };

    // Initialize with event listeners
    useEffect(() => {
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

        // Load placeholder images if no screenshots available
        if (screenshots.length === 0) {
            const placeholders = [
                'https://via.placeholder.com/140x95/f0f0f0/909090?text=Problem+1',
                'https://via.placeholder.com/140x95/f0f0f0/909090?text=Problem+2',
                'https://via.placeholder.com/140x95/f0f0f0/909090?text=Problem+3'
            ];
            setScreenshots(placeholders);
        }



        // Add keyboard shortcuts 
        const handleKeyDown = (e) => {
            // Check for keyboard shortcuts
            if (e.ctrlKey || e.metaKey) {
                switch (e.key.toLowerCase()) {
                    case 'q': // Toggle question section
                        e.preventDefault();
                        toggleQuestionSection();
                        break;
                    case 'h': // Take screenshot
                        e.preventDefault();
                        takeScreenshot();
                        break;
                    case 'r': // Reset app
                        e.preventDefault();
                        resetApp();
                        break;
                }
            }
        };

        // Add keyboard event listener
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            if (ipcRenderer) {
                ipcRenderer.removeAllListeners('screenshot-taken');
                ipcRenderer.removeAllListeners('generate-solution');
                ipcRenderer.removeAllListeners('reset-app');
            }
            // Remove keyboard event listener
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    // Split solution code into lines with syntax highlighting
    const renderCodeWithLineNumbers = () => {
        if (!solutionCode) return null;

        // Just split by lines without any cleaning to preserve the original code exactly
        const lines = solutionCode.split('\n');

        return (
            <div className="code-container">
                <div className="line-numbers">
                    {lines.map((_, index) => (
                        <div key={index} className="line-number">{index + 1}</div>
                    ))}
                </div>
                <div className="code-content">
                    {lines.map((line, index) => (
                        <div key={index}>{line}</div>
                    ))}
                </div>
            </div>
        );
    };

    // Java-specific syntax highlighting - not used in direct rendering anymore
    const highlightJava = (line) => {
        // Function retained but not used
        return line;
    };

    // Python-specific syntax highlighting - not used in direct rendering anymore
    const highlightPython = (line) => {
        // Function retained but not used
        return line;
    };

    // JavaScript-specific syntax highlighting - not used in direct rendering anymore
    const highlightJavaScript = (line) => {
        // Function retained but not used
        return line;
    };

    // Function to parse and structure Gemini API response
    const formatGeminiResponse = (response) => {
        if (!response) return { question: '', thoughts: [], code: '', complexity: { time: 'O(n)', space: 'O(n)' } };

        // Just return the raw response for processing elsewhere
        return response;
    };

    // Process incoming solution
    const processGeminiSolution = (solution) => {
        if (!solution) return;

        // Store the full solution as-is
        setThoughtProcess(solution.fullSolution || '');

        // Set code from solution.code if available
        setSolutionCode(solution.code || '');

        // Keep original complexity text including superscripts
        const timeComplexityMatch = solution.fullSolution?.match(/Time Complexity:?\s*(.*?)(?=\n|$)/i);
        const spaceComplexityMatch = solution.fullSolution?.match(/Space Complexity:?\s*(.*?)(?=\n|$)/i);

        setComplexity({
            time: timeComplexityMatch ? timeComplexityMatch[1].trim() : "O(n)",
            space: spaceComplexityMatch ? spaceComplexityMatch[1].trim() : "O(n)"
        });

        // Detect language from the code
        if (solution.code && (solution.code.includes('public class') || solution.code.includes('import java'))) {
            setLanguage('java');
        } else if (solution.code && solution.code.includes('function')) {
            setLanguage('javascript');
        } else if (solution.code && solution.code.includes('def ')) {
            setLanguage('python');
        }
    };

    // Modify the analyzeScreenshot function to use the new processing
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

                        // Extract code block from full solution if it exists
                        const codeBlockRegex = /```(?:java|python|javascript)?\s*([\s\S]*?)```/;
                        const codeBlockMatch = solution.fullSolution.match(codeBlockRegex);

                        // Use extracted code or solution.code
                        const code = codeBlockMatch ? codeBlockMatch[1].trim() : (solution.code || '');
                        setSolutionCode(code);

                        // Set thought process - use the fullSolution
                        setThoughtProcess(solution.fullSolution || '');

                        // Extract complexity information
                        const timeComplexityMatch = solution.fullSolution.match(/[Tt]ime [Cc]omplexity:?\s*(.*?)(?=\n|$)/);
                        const spaceComplexityMatch = solution.fullSolution.match(/[Ss]pace [Cc]omplexity:?\s*(.*?)(?=\n|$)/);

                        setComplexity({
                            time: timeComplexityMatch ? timeComplexityMatch[1].trim() : "O(n)",
                            space: spaceComplexityMatch ? spaceComplexityMatch[1].trim() : "O(n)"
                        });

                        // Detect language based on code
                        if (code.includes('import java') || code.includes('public class')) {
                            setLanguage('java');
                        } else if (code.includes('def ') && code.includes(':')) {
                            setLanguage('python');
                        } else {
                            setLanguage('javascript');
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

    // Also update the generateSolution function to use the new processor
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
                        // Extract code block from full solution if it exists
                        const codeBlockRegex = /```(?:java|python|javascript)?\s*([\s\S]*?)```/;
                        const codeBlockMatch = solution.fullSolution.match(codeBlockRegex);

                        // Use extracted code or solution.code
                        const code = codeBlockMatch ? codeBlockMatch[1].trim() : (solution.code || '');
                        setSolutionCode(code);

                        // Set thought process - use the fullSolution
                        setThoughtProcess(solution.fullSolution || '');

                        // Extract complexity information
                        const timeComplexityMatch = solution.fullSolution.match(/[Tt]ime [Cc]omplexity:?\s*(.*?)(?=\n|$)/);
                        const spaceComplexityMatch = solution.fullSolution.match(/[Ss]pace [Cc]omplexity:?\s*(.*?)(?=\n|$)/);

                        setComplexity({
                            time: timeComplexityMatch ? timeComplexityMatch[1].trim() : "O(n)",
                            space: spaceComplexityMatch ? spaceComplexityMatch[1].trim() : "O(n)"
                        });

                        // Detect language based on code
                        if (code.includes('import java') || code.includes('public class')) {
                            setLanguage('java');
                        } else if (code.includes('def ') && code.includes(':')) {
                            setLanguage('python');
                        } else {
                            setLanguage('javascript');
                        }

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

    // Open image in modal
    const openImageModal = (src) => {
        setModalImage(src);
        setShowImageModal(true);
    };

    // Close image modal
    const closeImageModal = () => {
        setShowImageModal(false);
    };

    // Remove screenshot
    const removeScreenshot = (index) => {
        const updatedScreenshots = [...screenshots];
        updatedScreenshots.splice(index, 1);
        setScreenshots(updatedScreenshots);
    };

    return (
        <div className="container">
            <div className="toolbar">
                <button className="toolbar-button" id="toggle-btn" onClick={toggleQuestionSection}>
                    {showQuestionSection ? "Hide Question" : "Show Question"}
                    <span className="shortcut">⌘</span>
                    <span className="shortcut">Q</span>
                </button>
                <button className="toolbar-button" id="screenshot-btn" onClick={takeScreenshot}>
                    Screenshot your code
                    <span className="shortcut">⌘</span>
                    <span className="shortcut">H</span>
                </button>
                <button className="toolbar-button" id="restart-btn" onClick={resetApp}>
                    Start Over
                    <span className="shortcut">⌘</span>
                    <span className="shortcut">R</span>
                </button>
                <div className="toolbar-divider"></div>
                <button className="toolbar-button" id="settings-btn" onClick={() => setShowSettings(!showSettings)}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                        <path
                            d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z" />
                        <path
                            d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115l.094-.319z" />
                    </svg>
                </button>
            </div>

            <div className="content all-sections">
                {/* Question Section (conditionally shown) */}
                {showQuestionSection && (
                    <div className="section" id="question-section">
                        <div className="section-title">Question</div>
                        <div className="question-images">
                            {screenshots.map((screenshot, index) => (
                                <div className="question-image" key={index}>
                                    <img
                                        src={screenshot}
                                        alt={`Problem screenshot ${index + 1}`}
                                        className="preview-image"
                                        onClick={() => openImageModal(screenshot)}
                                    />
                                    <button className="close-btn" onClick={() => removeScreenshot(index)}>×</button>
                                </div>
                            ))}
                            {screenshots.length === 0 && isLoading && (
                                <div className="question-image skeleton-loading"></div>
                            )}
                        </div>
                        <div>{problemText || (
                            isLoading ?
                                <div className="skeleton-loading">
                                    <div className="skeleton-line"></div>
                                    <div className="skeleton-line"></div>
                                    <div className="skeleton-line"></div>
                                </div>
                                :
                                'Click "Screenshot your code" to capture a coding problem'
                        )}</div>
                    </div>
                )}

                {/* Always shown sections */}
                <div className="section" id="thoughts-section">
                    <div className="section-title">My Thoughts</div>
                    {thoughtProcess ? (
                        <ul className="thoughts-list">
                            {thoughtProcess.split('\n')
                                .filter(line => line.trim().length > 0)
                                .filter(line => !line.includes("```"))
                                .filter(line => !line.toLowerCase().includes("time complexity") && !line.toLowerCase().includes("space complexity"))
                                .map((line, index) => (
                                    <li key={index}>{line.trim().startsWith('-') ? line.trim().substring(1).trim() : line.trim()}</li>
                                ))
                            }
                        </ul>
                    ) : (
                        isLoading ?
                            <div className="skeleton-loading">
                                <div className="skeleton-line"></div>
                                <div className="skeleton-line"></div>
                                <div className="skeleton-line"></div>
                            </div>
                            :
                            <div>Generate a solution to see the thought process</div>
                    )}
                </div>

                <div className="section" id="solution-section">
                    <div className="section-title">Solution</div>
                    <div className="solution-actions">
                        <button className="copy-btn" onClick={copyToClipboard}>Copy Code</button>
                    </div>
                    {solutionCode ? (
                        <div className="code-block">
                            {renderCodeWithLineNumbers()}
                        </div>
                    ) : (
                        isLoading ?
                            <div className="skeleton-loading">
                                <div className="skeleton-line"></div>
                                <div className="skeleton-line"></div>
                                <div className="skeleton-line"></div>
                            </div>
                            :
                            <div>Generate a solution to see the code</div>
                    )}
                </div>

                <div className="section" id="complexity-section">
                    <div className="section-title">Complexity</div>
                    {complexity ? (
                        <ul className="complexity-list">
                            <li dangerouslySetInnerHTML={{ __html: `Time Complexity: ${complexity.time}` }}></li>
                            <li dangerouslySetInnerHTML={{ __html: `Space Complexity: ${complexity.space}` }}></li>
                        </ul>
                    ) : (
                        isLoading ?
                            <div className="skeleton-loading">
                                <div className="skeleton-line"></div>
                                <div className="skeleton-line"></div>
                            </div>
                            :
                            <div>Generate a solution to see complexity analysis</div>
                    )}
                </div>
            </div>

            {/* Image Preview Modal */}
            {showImageModal && (
                <div className="modal" id="image-modal" onClick={closeImageModal}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <button className="modal-close" onClick={closeImageModal}>&times;</button>
                        <img src={modalImage} alt="Full size image" className="modal-image" id="modal-image" />
                    </div>
                </div>
            )}

            {/* Settings Modal */}
            {showSettings && (
                <div className="modal">
                    <div className="modal-content">
                        <button className="modal-close" onClick={() => setShowSettings(false)}>&times;</button>
                        <h2>Settings</h2>
                        <div className="settings-section">
                            <h3>Keyboard Shortcuts</h3>
                            <div className="shortcuts-list">
                                <div className="shortcut-item">
                                    <span className="shortcut-key">Ctrl+Q</span>
                                    <span className="shortcut-desc">Toggle question section</span>
                                </div>
                                <div className="shortcut-item">
                                    <span className="shortcut-key">Ctrl+H</span>
                                    <span className="shortcut-desc">Take screenshot</span>
                                </div>
                                <div className="shortcut-item">
                                    <span className="shortcut-key">Ctrl+R</span>
                                    <span className="shortcut-desc">Reset app</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
        </div>
    );
};

export default App;