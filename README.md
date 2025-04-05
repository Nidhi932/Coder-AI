
## TODO 

- **Voice-to-Text Conversion**: 
  - Converts the interviewer's spoken questions into text using **Web Speech API** (or a similar tool).
  - Sends the transcribed text to an AI model for generating answers.
  
- **Image Input for Diagrammatic Questions**:
  - Users can upload images or screenshots that contain diagrams (e.g., aptitude questions with graphs) to be sent to the AI for analysis.

- **Customizable Keyboard Shortcuts**:
  - Disable default browser hotkeys to avoid unwanted behaviors (e.g., Shift + R for reset, Ctrl + Arrow keys for resizing).

- **Automatic Screenshot Reset**:
  - Screenshots will be automatically reset once the task is completed.

- **Code Display Enhancement**:
  - Code snippets are displayed with syntax highlighting using **Prism.js** or **highlight.js** for better readability.

- **Minimalistic and Clean UI**:
  - User-friendly and modern design using **Tailwind CSS** or **Material UI** for a seamless experience.


# Interview Coder

Interview Coder is an Electron-based desktop application that provides an invisible AI assistant for technical coding interviews. It helps you solve coding problems in real-time while remaining undetectable during screen sharing sessions.

## Features

- **Invisible Operation**: Designed to be undetectable during screen sharing and remote interviews
- **Problem Analysis**: Capture screenshots of coding problems for AI analysis
- **Solution Generation**: Get optimized solutions with detailed explanations
- **Code Optimization**: Improve your existing code with AI suggestions
- **Global Shortcuts**: Control the app entirely through keyboard shortcuts
- **Multiple Modes**: Problem mode and Solution mode for different stages of the interview
- **Dual AI Options**: Supports both OpenAI GPT-4 and Google Gemini with automatic fallback

## Installation

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- OpenAI API key (optional if using Gemini)
- Google Gemini API key (optional if using OpenAI)

### Setup

1. Clone the repository:
   ```
   git clone <repository-url>
   cd interview-coder
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Invisiwind Integration:
   - Make sure the Invisiwind folder is in the root directory of the application
   - The application will automatically hide itself from screen recording by default
   - Use Ctrl+Alt+H (or Command+Alt+H on macOS) to toggle screen recording visibility

4. Start the application:
   ```
   npm start
   ```

5. Enter your API keys in the Settings tab (OpenAI, Gemini, or both).

## Building for Distribution

To create executable files for your platform:

### For Windows:
```
npm run package-win
```

### For macOS:
```
npm run package-mac
```

The built applications will be available in the `dist` folder.

## Usage

### Keyboard Shortcuts

- **⌘/Ctrl + B**: Hide/Show the application window
- **⌘/Ctrl + H**: Capture a screenshot of the problem or your code
- **⌘/Ctrl + Enter**: Generate a solution or optimize your code
- **⌘/Ctrl + Arrow Keys**: Move the application window around the screen
- **⌘/Ctrl + R**: Reset the application for a new problem
- **⌘/Ctrl + Q**: Quit the application

### Workflow

1. **Capture the Problem**: Use ⌘/Ctrl + H to take screenshots of the coding problem.
2. **Generate a Solution**: After capturing the problem, press ⌘/Ctrl + Enter to generate a solution.
3. **Debug Your Code**: In Solution mode, take screenshots of your code and press ⌘/Ctrl + Enter to get optimization suggestions.

### AI Provider Selection

The application supports two AI providers:

1. **OpenAI (GPT-4)**: Provides high-quality solutions with detailed explanations.
2. **Google Gemini**: An alternative option that works well for many coding problems.

You can select your preferred AI provider in the Settings tab. The application will automatically fall back to the alternative provider if the primary one fails or isn't configured.

## Security & Privacy

- Your API keys are stored locally and are only used to communicate with the respective AI services.
- Screenshots are stored temporarily in the application's directory and are deleted when you reset or quit the application.
- No data is sent to any server other than the selected AI provider for processing.

## Disclaimer

This tool is intended for learning and practice purposes. Using such tools during actual interviews may violate the terms and conditions of the interview process. Use responsibly and ethically.

## License

[MIT License](LICENSE)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
