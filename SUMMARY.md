# Interview Coder - Project Summary

## Project Structure
```
InterviewCoder/
├── assets/            # Application icons and assets
├── screenshots/       # Temporary storage for screenshots
├── src/               # Application source code
│   ├── components/    # UI components
│   ├── utils/         # Utility functions
│   │   ├── screenshot.js    # Screenshot capture utilities
│   │   └── openai.js        # AI integration with OpenAI and Gemini
│   ├── index.html     # Main application HTML
│   ├── renderer.js    # Renderer process code
│   └── styles.css     # Application styles
├── main.js            # Main process entry point
├── install.js         # Installation helper script
├── package.json       # Project dependencies and scripts
├── README.md          # Documentation
└── .gitignore         # Git ignore configuration
```

## Key Components

### Main Process (main.js)
- Manages the application lifecycle (start, quit)
- Creates the transparent, frameless window
- Registers global keyboard shortcuts using Electron's globalShortcut API
- Handles IPC communication with the renderer process
- Coordinates with AI services and screenshot utilities

### Renderer Process (renderer.js)
- Manages the UI interactions
- Communicates with the main process via IPC
- Displays AI-generated solutions and optimizations
- Handles tab switching and mode changes
- Manages API provider selection and preferences

### Screenshot Utility (screenshot.js)
- Captures screenshots of the current screen
- Manages storage and cleanup of screenshot files using fs-extra
- Provides methods to access screenshot paths

### AI Integration (openai.js)
- Initializes and manages connections to AI services (OpenAI and Gemini)
- Extracts coding problems from screenshots
- Generates solutions for coding problems
- Optimizes existing code with suggestions
- Handles fallback between providers when one fails

### User Interface (index.html, styles.css)
- Provides tabs for Problem Mode and Solution Mode
- Displays screenshots, problem statements, and solutions
- Offers settings for API configuration with provider selection
- Shows keyboard shortcuts and status messages
- Indicates which AI provider was used for solutions

### Installation Helper (install.js)
- Automates the installation process
- Creates required directories
- Verifies system requirements
- Installs dependencies

## Application Flow

1. User starts the application
2. Application creates a transparent window
3. User captures screenshots of a coding problem (⌘/Ctrl+H)
4. AI extracts the problem statement from screenshots using either OpenAI or Gemini
5. User requests a solution (⌘/Ctrl+Enter)
6. AI generates an optimized solution with explanations
7. User can switch to Solution mode to view the solution
8. User can capture screenshots of their code for optimization
9. AI provides optimization suggestions and improvements

## Security Features

- The application window can be hidden instantly (⌘/Ctrl+B)
- The app is transparent and can be positioned anywhere on screen
- The window has no frame, making it less noticeable
- Keyboard shortcuts allow full control without mouse clicks

## Dual AI Provider Support

The application supports two AI providers:
1. **OpenAI (GPT-4)** - For high-quality solutions and optimizations
2. **Google Gemini** - As an alternative option with different capabilities

Key features of the dual provider system:
- User can select preferred provider in settings
- Application stores API keys for both services securely
- Automatic fallback to alternative provider if primary one fails
- Visual indicator shows which provider generated each solution
- Each provider optimized for coding problem analysis and solution

## Modern Dependencies

The application uses modern, well-maintained dependencies:
- fs-extra instead of fs for enhanced file operations
- Electron's built-in globalShortcut API for keyboard shortcuts
- electron-rebuild for proper native module integration
- screenshot-desktop for reliable screenshot capturing
- Latest versions of OpenAI and Google Generative AI SDKs

## Configuration

The application requires at least one AI API key (either OpenAI or Gemini) for functionality. These keys are stored locally in the user's localStorage.

## Build and Distribution

The application can be packaged for distribution on Windows and macOS using Electron Builder.