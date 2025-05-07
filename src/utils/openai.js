const { OpenAI } = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs-extra');
const path = require('path');
const { getAllScreenshots } = require('./screenshot');

// Initialize AI clients
let openai;
let gemini;
let currentProvider = 'openai'; // Track which provider is active

// Gemini API keys array with fallback options
const geminiApiKeys = [
    'AIzaSyA_FlnLi1o3T_KtSqgHwvzRCTDQi4EhAis', // collegemailid
    'AIzaSyDNwpWdyh3oi4181eRWrgqRmJaUYEq1xmQ', // choicecomplaint
    'AIzaSyDMov4SIWiLYrlee_2MnWt-Bhcl2kDlPLI', // Default key
    'AIzaSyAzv_BWS77Ao4Le5cCsik8-CbNq5SmZYnY', // Fallback key 1
    'AIzaSyACIxS-peJlcLYgzRtjjsLnboDYXxyOK44'  // Fallback key 2
];
let currentKeyIndex = 0; // Current key index in the array

/**
 * Get the next available Gemini API key
 * @returns {string} The next API key
 */
function getNextGeminiApiKey() {
    // Move to the next key in the array
    currentKeyIndex = (currentKeyIndex + 1) % geminiApiKeys.length;
    console.log(`Switching to Gemini API key at index ${currentKeyIndex}`);
    return geminiApiKeys[currentKeyIndex];
}

/**
 * Get the current Gemini API key
 * @returns {string} The current API key
 */
function getCurrentGeminiApiKey() {
    return geminiApiKeys[currentKeyIndex];
}

/**
 * Initialize AI services
 */
function initAI() {
    console.log('Initializing AI services...');
    // The API keys should be stored securely in environment variables or a secure config file
    try {
        console.log('Attempting to initialize OpenAI client...');
        openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY || '', // Replace with your API key or load from env
        });
        console.log('OpenAI client initialized');
    } catch (error) {
        console.warn('Failed to initialize OpenAI:', error.message);
        console.error('OpenAI initialization error:', error);
    }

    try {
        // Initialize Gemini as primary provider with the current API key
        console.log('Attempting to initialize Gemini client...');
        const geminiApiKey = getCurrentGeminiApiKey();
        console.log('Using Gemini API key:', geminiApiKey);
        gemini = new GoogleGenerativeAI(geminiApiKey);
        currentProvider = 'gemini'; // Set Gemini as the default provider
        console.log('Gemini client initialized successfully');
        console.log('Current provider set to:', currentProvider);
    } catch (error) {
        console.warn('Failed to initialize Gemini:', error.message);
        console.error('Gemini initialization error:', error);
    }

    console.log('AI services initialization complete');
    console.log('Current provider:', currentProvider);
    console.log('OpenAI available:', !!openai);
    console.log('Gemini available:', !!gemini);
}

/**
 * Set the OpenAI API key
 * @param {string} apiKey - The OpenAI API key
 */
function setApiKey(apiKey, provider = 'gemini') {
    console.log(`Setting API key for provider: ${provider}`);

    if (provider === 'openai') {
        try {
            console.log('Setting OpenAI API key...');
            if (!openai) {
                console.log('Creating new OpenAI instance');
                openai = new OpenAI({ apiKey });
            } else {
                console.log('Updating existing OpenAI instance');
                openai.apiKey = apiKey;
            }
            // Don't set as current provider by default anymore
            console.log('OpenAI API key set successfully');
        } catch (error) {
            console.error('Failed to set OpenAI API key:', error.message);
            console.error('Error details:', error);
            throw error;
        }
    } else if (provider === 'gemini') {
        try {
            console.log('Setting Gemini API key...');
            // Use the current Gemini API key from our array
            const geminiApiKey = getCurrentGeminiApiKey();
            console.log('Using Gemini API key:', geminiApiKey);
            gemini = new GoogleGenerativeAI(geminiApiKey);
            currentProvider = 'gemini';
            console.log('Gemini API key set successfully');
            console.log('Current provider set to:', currentProvider);
        } catch (error) {
            console.error('Failed to set Gemini API key:', error.message);
            console.error('Error details:', error);
            throw error;
        }
    }
}

/**
 * Check if any AI provider is available
 * @returns {boolean} True if at least one provider is available
 */
function isAIAvailable() {
    console.log('isAIAvailable called');
    console.log('Current provider:', currentProvider);
    console.log('OpenAI available:', !!openai);
    console.log('OpenAI API key set:', openai?.apiKey ? 'yes' : 'no');
    console.log('Gemini available:', !!gemini);

    if (openai && openai.apiKey) {
        console.log('Using OpenAI as provider');
        currentProvider = 'openai';
        return true;
    } else if (gemini) {
        console.log('Using Gemini as provider');
        currentProvider = 'gemini';
        return true;
    }
    console.log('No AI provider available');
    return false;
}

/**
 * Get the current AI provider name
 * @returns {string} Name of the current provider
 */
function getCurrentProvider() {
    return currentProvider;
}

/**
 * Convert image file to base64
 * @param {string} filePath - Path to image file
 * @returns {string} Base64 encoded image
 */
function imageToBase64(filePath) {
    const base64Image = fs.readFileSync(filePath, { encoding: 'base64' });
    const mimeType = 'image/png'; // Assuming PNG format
    return `data:${mimeType};base64,${base64Image}`;
}

/**
 * Try to execute a Gemini API request with fallback mechanisms
 * @param {Function} apiCallFn - The function that makes the actual API call
 * @returns {Promise<any>} The result of the API call
 */
async function executeGeminiRequestWithFallback(apiCallFn) {
    // Try each key in sequence until one works
    let lastError = null;
    const initialKeyIndex = currentKeyIndex;

    // First try with current key
    try {
        return await apiCallFn(getCurrentGeminiApiKey());
    } catch (error) {
        console.error('Error with current Gemini API key:', error);
        lastError = error;
    }

    // If failed, try with remaining keys
    for (let attempt = 0; attempt < geminiApiKeys.length - 1; attempt++) {
        const nextKey = getNextGeminiApiKey();
        console.log(`Attempt ${attempt + 1}: Trying next Gemini API key...`);

        try {
            // Reinitialize Gemini with the new key
            gemini = new GoogleGenerativeAI(nextKey);
            return await apiCallFn(nextKey);
        } catch (error) {
            console.error(`Error with Gemini API key attempt ${attempt + 1}:`, error);
            lastError = error;

            // If we've tried all keys and are back to the initial one, break the loop
            if (currentKeyIndex === initialKeyIndex) {
                console.error('All Gemini API keys have failed');
                break;
            }
        }
    }

    // If we get here, all keys failed
    throw lastError || new Error('All Gemini API keys failed');
}

/**
 * Extract text from a coding problem screenshot using OCR through AI
 * @param {Array<string>} screenshotPaths - Paths to screenshots
 * @returns {Promise<string>} Extracted problem statement
 */
async function extractProblemFromScreenshots(screenshotPaths) {
    console.log('extractProblemFromScreenshots called with paths:', screenshotPaths);

    if (!isAIAvailable()) {
        console.log('No AI service available');
        return 'Error: No AI service available. Please set your OpenAI or Gemini API key.';
    }

    try {
        if (!screenshotPaths || screenshotPaths.length === 0) {
            console.log('No screenshots provided');
            return 'No screenshots provided. Please capture the problem using Cmd/Ctrl+H';
        }

        if (currentProvider === 'openai') {
            console.log('Using OpenAI provider for image processing');
            // OpenAI approach
            // Prepare the screenshots
            const images = screenshotPaths.map(screenshotPath => {
                const base64Image = fs.readFileSync(screenshotPath, { encoding: 'base64' });
                return `data:image/png;base64,${base64Image}`;
            });

            // Send request to OpenAI for analysis - improved prompt for all question types
            const response = await openai.chat.completions.create({
                model: 'gpt-4-vision-preview',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a specialized OCR expert focusing on programming problems, technical interviews, and assessment questions. Extract the complete content with perfect accuracy, maintaining original formatting, mathematical notation, code samples, and all question details. If the content spans multiple images, ensure coherent and complete extraction across all images.'
                    },
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: 'Extract the complete content from these screenshots with 100% accuracy. Preserve all formatting, code blocks, mathematical notation, bullet points, and question options. If this is a programming problem, include all constraints, examples, and edge cases. If it\'s an MCQ, clearly list all options. Ensure your extraction is complete and properly structured:' },
                            ...images.map(image => ({ type: 'image_url', image_url: { url: image } }))
                        ]
                    }
                ],
                max_tokens: 1500
            });

            return response.choices[0].message.content;
        } else {
            console.log('Using Gemini provider for image processing');

            // Use the Gemini API with fallback mechanism
            return await executeGeminiRequestWithFallback(async (apiKey) => {
                console.log('Using Gemini API key:', apiKey);
                const generativeAI = new GoogleGenerativeAI(apiKey);
                const model = generativeAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

                // Load image data directly as base64 strings
                console.log('Processing screenshot files...');
                const imageContents = [];
                for (const path of screenshotPaths) {
                    console.log('Processing screenshot path:', path);
                    if (fs.existsSync(path)) {
                        console.log('Screenshot file exists, reading data');
                        const base64Data = fs.readFileSync(path, { encoding: 'base64' });
                        console.log('Base64 data length:', base64Data.length);
                        imageContents.push({
                            inlineData: {
                                data: base64Data,
                                mimeType: 'image/png'
                            }
                        });
                        console.log('Added image content to the array');
                    } else {
                        console.warn(`Screenshot file not found: ${path}`);
                        // Instead of failing, create a placeholder message
                        return "Please capture a screenshot of the coding problem first.";
                    }
                }

                if (imageContents.length === 0) {
                    console.log('No valid screenshots found');
                    return "No valid screenshots found. Please capture the problem again.";
                }

                const prompt = "You are an expert at extracting and understanding programming problems from screenshots. Extract the coding problem, including any constraints, input/output examples, and requirements.";
                console.log('Preparing Gemini API request with prompt and images');
                console.log('Number of images being sent:', imageContents.length);

                console.log('Sending request to Gemini API...');
                const result = await model.generateContent([
                    prompt,
                    ...imageContents
                ]);

                console.log('Received response from Gemini API');
                const response = result.response;
                const responseText = response.text();
                // generate solution from responseText
                const solution = await generateSolution(responseText);

                // If we get here, this key works well, so we keep using it
                return solution.fullSolution;
            });
        }
    } catch (error) {
        console.error(`Error extracting problem using ${currentProvider}:`, error);
        console.error("Error stack:", error.stack);
        console.error("Error details:", JSON.stringify(error, null, 2));

        // Try the other provider if all Gemini keys fail
        if (currentProvider === 'gemini' && openai && openai.apiKey) {
            currentProvider = 'openai';
            console.log('Falling back to OpenAI API');
            return extractProblemFromScreenshots(screenshotPaths);
        }

        return `Error analyzing screenshots. All Gemini API keys failed, and OpenAI fallback is not available. Please check your API keys.`;
    }
}

/**
 * Generate a solution for a coding problem
 * @param {string} problemStatement - The problem statement
 * @returns {Promise<Object>} Solution object with code and explanation
 */
async function generateSolution(problemStatement) {
    console.log('generateSolution called with problem statement length:', problemStatement?.length);

    if (!isAIAvailable()) {
        console.log('No AI service available');
        return { error: true, message: 'No AI service available. Please set your API key.' };
    }

    try {
        if (!problemStatement) {
            return { error: true, message: 'No problem statement provided' };
        }

        // Detect problem type
        const isProgrammingProblem = problemStatement.match(/code|algorithm|function|class|program|implement/i);
        const isMCQ = problemStatement.match(/\([A-D]\)/) || problemStatement.match(/[A-D]\)/) ||
            problemStatement.match(/Option [A-D]/i);
        const isNumerical = problemStatement.match(/calculate|compute|find the value/i) ||
            problemStatement.match(/\d+(\.\d+)?[×÷\+\-=]/);

        let prompt;

        if (isMCQ) {
            prompt = `This is a multiple choice question. Analyze it carefully and determine the correct answer.
                     Only provide the letter of the correct answer (A, B, C, or D) without explanation.
                     Question: ${problemStatement}`;
        } else if (isNumerical) {
            prompt = `This is a numerical/mathematical problem. Solve it step by step and provide the final answer.
                     Keep your solution clear and concise.
                     Problem: ${problemStatement}`;
        } else if (isProgrammingProblem) {
            prompt = `You are a skilled programmer. Solve this coding problem with the most efficient and clear approach.
                     First, analyze the problem.
                     Then, develop an efficient algorithm.
                     Finally, write clean implementation code.
                     Problem: ${problemStatement}`;
        } else {
            // General problem
            prompt = `Analyze and solve the following problem with 100% accuracy and optimal efficiency:
                     ${problemStatement}
                     
                     Provide a detailed, step-by-step solution that addresses all requirements and edge cases.
                     Ensure your solution is correct, efficient, and well-explained.`;
        }

        if (currentProvider === 'openai') {
            // OpenAI approach
            const response = await openai.chat.completions.create({
                model: 'gpt-4-turbo',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a technical interview expert with deep knowledge of algorithms, data structures, and optimal problem-solving techniques. Your solutions must be 100% accurate, efficient, and address all edge cases. For multiple choice questions, provide only the final answer letter without explanation. For programming problems, focus on correctness first, then optimization.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 2500
            });

            const solution = response.choices[0].message.content;

            // For MCQs, ensure we only return the answer letter
            if (isMCQ) {
                const answerMatch = solution.match(/^[A-D]$/) ||
                    solution.match(/^The answer is ([A-D])\.?$/i) ||
                    solution.match(/^Option ([A-D])\.?$/i);

                if (answerMatch) {
                    const answer = answerMatch[1] || answerMatch[0];
                    return {
                        fullSolution: answer,
                        code: answer
                    };
                }
            }

            return {
                fullSolution: solution,
                code: extractCodeFromSolution(solution)
            };
        } else {
            // Use Gemini with fallback mechanism
            return await executeGeminiRequestWithFallback(async (apiKey) => {
                console.log('Setting up Gemini for solution generation');
                console.log('Using Gemini API key:', apiKey);
                const generativeAI = new GoogleGenerativeAI(apiKey);
                const model = generativeAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

                console.log('Creating prompt for solution generation based on problem type');
                console.log('Sending request to Gemini API...');
                const result = await model.generateContent(prompt);
                console.log('Received response from Gemini API');

                const solutionText = result.response.text();
                console.log('Solution text length:', solutionText.length);
                console.log('Solution preview:', solutionText.substring(0, 100) + '...');

                // For MCQs, ensure we only return the answer letter
                if (isMCQ) {
                    const answerMatch = solutionText.match(/^[A-D]$/) ||
                        solutionText.match(/^The answer is ([A-D])\.?$/i) ||
                        solutionText.match(/^Option ([A-D])\.?$/i);

                    if (answerMatch) {
                        const answer = answerMatch[1] || answerMatch[0];
                        return {
                            fullSolution: answer,
                            code: answer,
                            error: false,
                            provider: 'gemini'
                        };
                    }
                }

                // Parse solution to extract code section for programming problems
                let codeSection = '';
                if (isProgrammingProblem) {
                    console.log('Extracting code section from solution text');
                    const codeSectionMatch = solutionText.match(/```(?:\w+)?\s*([\s\S]*?)```/);
                    codeSection = codeSectionMatch ? codeSectionMatch[1].trim() : '';
                    console.log('Extracted code section length:', codeSection.length);
                }

                console.log('Solution generation completed successfully');
                return {
                    fullSolution: solutionText,
                    code: codeSection || solutionText,
                    error: false,
                    provider: 'gemini'
                };
            });
        }
    } catch (error) {
        console.error('Error generating solution:', error);
        console.error('Error stack:', error.stack);
        console.error('Error details:', JSON.stringify(error, null, 2));

        return {
            error: true,
            message: `Error generating solution: ${error.message}`
        };
    }
}

/**
 * Optimize a solution using AI
 * @param {string} problemStatement - The original problem
 * @param {string} code - The code to optimize
 * @returns {Promise<Object>} Optimized solution data
 */
async function optimizeSolution(problemStatement, code) {
    console.log('optimizeSolution called');
    console.log('- Problem statement length:', problemStatement?.length);
    console.log('- Code length:', code?.length);

    if (!isAIAvailable()) {
        console.log('No AI service available');
        return {
            error: true,
            message: 'Error: No AI service available. Please set your API key.'
        };
    }

    try {
        if (!problemStatement) {
            console.log('No problem statement provided');
            return {
                error: true,
                message: 'Error: No problem statement provided'
            };
        }

        if (!code) {
            console.log('No code provided to optimize');
            return {
                error: true,
                message: 'Error: No code provided to optimize'
            };
        }

        // Use Gemini with fallback mechanism
        return await executeGeminiRequestWithFallback(async (apiKey) => {
            console.log('Setting up Gemini for solution optimization');
            console.log('Using Gemini API key:', apiKey);
            const generativeAI = new GoogleGenerativeAI(apiKey);
            const model = generativeAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

            console.log('Creating prompt for solution optimization');
            const prompt = `You are a senior technical interviewer and code optimization expert with extensive knowledge of algorithms, data structures, and software engineering best practices.
            
Problem Statement:
${problemStatement}

Current Solution:
\`\`\`
${code}
\`\`\`

Provide a comprehensive analysis including:

1. Precise time complexity with detailed explanation (best, average, and worst cases)
2. Exact space complexity with detailed explanation
3. Correctness verification (does it handle all edge cases and requirements)
4. Specific optimizations with code examples (if possible)
5. Alternative approaches with their time/space tradeoffs
6. Any bugs or logical errors in the current implementation with fixes
7. Code quality assessment and suggestions for improvement

Your analysis must be 100% accurate, with concrete examples where applicable.`;

            console.log('Prompt created with length:', prompt.length);
            console.log('Sending request to Gemini API...');

            const result = await model.generateContent(prompt);
            console.log('Received response from Gemini API');

            const analysisText = result.response.text();
            console.log('Analysis text length:', analysisText.length);
            console.log('Analysis preview:', analysisText.substring(0, 100) + '...');

            console.log('Solution optimization completed successfully');
            return {
                fullAnalysis: analysisText,
                error: false,
                provider: 'gemini'
            };
        });
    } catch (error) {
        console.error('Error optimizing solution:', error);
        console.error('Error stack:', error.stack);
        console.error('Error details:', JSON.stringify(error, null, 2));

        return {
            error: true,
            message: `Error optimizing solution: ${error.message}`
        };
    }
}

/**
 * Extract code from a screenshot
 * @param {string} screenshotPath - Path to screenshot
 * @returns {Promise<string>} Extracted code
 */
async function extractCodeFromScreenshot(screenshotPath) {
    if (!isAIAvailable()) {
        return 'Error: No AI service available. Please set your API key.';
    }

    try {
        if (!screenshotPath) {
            return 'No screenshot provided';
        }

        // Use Gemini with fallback mechanism
        return await executeGeminiRequestWithFallback(async (apiKey) => {
            console.log('Setting up Gemini for code extraction');
            console.log('Using Gemini API key:', apiKey);
            const generativeAI = new GoogleGenerativeAI(apiKey);
            const model = generativeAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

            // Handle image data
            let imageContent;
            if (fs.existsSync(screenshotPath)) {
                const base64Data = fs.readFileSync(screenshotPath, { encoding: 'base64' });
                imageContent = {
                    inlineData: {
                        data: base64Data,
                        mimeType: 'image/png'
                    }
                };
            } else {
                console.warn(`Screenshot file not found: ${screenshotPath}`);
                return "Screenshot file not found. Please capture your code first.";
            }

            const prompt = "Extract the exact source code from this screenshot with 100% accuracy. Preserve all syntax, indentation, comments, variable names, and formatting exactly as shown. Return only the code without any explanations, markdown formatting, or modifications. This is for exact code reproduction.";

            const result = await model.generateContent([
                prompt,
                imageContent
            ]);

            const response = result.response;
            return response.text();
        });
    } catch (error) {
        console.error('Error extracting code from screenshot:', error);
        return `Error extracting code: ${error.message}`;
    }
}

module.exports = {
    initAI,
    setApiKey,
    getCurrentProvider,
    extractProblemFromScreenshots,
    generateSolution,
    optimizeSolution,
    extractCodeFromScreenshot,
    // Export these for testing purposes
    getNextGeminiApiKey,
    getCurrentGeminiApiKey
};