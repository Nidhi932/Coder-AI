# myapp

A stealth application for capturing and analyzing screenshots.

## Features

- Capture screenshots with keyboard shortcuts
- AI-powered problem solving and code analysis
- Stealth mode to hide from screen recording
- Customizable positioning on screen

## Building for Production

To build the application for production:

```bash
# Install dependencies
npm install

# Create production build for all platforms
npm run make

# Create production build for Windows only
npm run package-win
```

The production build will be available in the `out` directory.

## Keyboard Shortcuts

- `Ctrl+B`: Toggle visibility
- `Ctrl+H`: Take screenshot
- `Ctrl+Alt+H`: Toggle hiding from screen capture
- `Ctrl+Enter`: Generate solution
- `Shift+R`: Reset app
- `Ctrl+Arrow Keys`: Move window
- `Ctrl+Q`: Quit application

## Requirements

- Windows 10+
- Node.js 18+ (for development)
- Electron 35+

## License

MIT 