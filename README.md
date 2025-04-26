# Bend: Arc-like Vertical Tab Spaces for Chrome

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

A Chrome extension that replicates Arc browser's tab management system with vertical tab grouping, sub-grouping, and virtual spaces.

![Demo](assets/extension.gif)

## Features

- Vertical tab management
- Tab grouping and sub-grouping
- Virtual spaces for better tab organization
- Pinned tabs with favicon display
- Bookmark integration
- Drag and drop functionality
- Keyboard shortcuts

## Development

### Prerequisites

- Node.js (v14 or higher)
- npm

### Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/bend.git
cd bend
```

2. Install dependencies:
```bash
npm install
```

3. Build the extension:
```bash
npm run setup-dev
```

This will:
- Compile TypeScript files to JavaScript
- Copy HTML, CSS, and assets to the dist directory
- Create a production-ready extension in the dist directory

### Development Workflow

1. Make changes to files in the `src` directory
2. Run the build script:
```bash
npm run build
```
3. Load the `dist` directory as an unpacked extension in Chrome

### Loading the Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked" and select the `dist` directory

## Usage

- Use Ctrl/Cmd+K to toggle the side panel
- Use Ctrl/Cmd+D to quickly pin/unpin tabs
- Drag and drop tabs to organize them
- Create new spaces with the + button
- Create sub-groups within spaces

## Issues and Feature Requests

We use GitHub Issues to track bugs and feature requests. Before creating a new issue:

1. Search existing issues to avoid duplicates
2. Use our issue templates when available

### Reporting Bugs 🐛

1. Go to the [Issues](https://github.com/platinummonkey/bend/issues) page
2. Click "New Issue"
3. Choose "Bug Report" template if available
4. Include:
   - Clear description of the bug
   - Steps to reproduce
   - Expected vs actual behavior
   - Browser version and OS
   - Screenshots if applicable

### Feature Requests 💡

1. Go to the [Issues](https://github.com/platinummonkey/bend/issues) page
2. Click "New Issue"
3. Choose "Feature Request" template if available
4. Include:
   - Clear description of the feature
   - Use cases
   - Potential implementation ideas (optional)
   - Mock-ups or examples (if applicable)

## Contributing


We welcome contributions! Here's how you can help:

1. Fork the Repository
   - Create a fork of this repository on GitHub

2. Create a Branch
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. Make Your Changes
   - Write clean, documented code
   - Follow existing code style
   - Test your changes thoroughly

4. Commit Your Changes
   ```bash
   git commit -m "Add: brief description of your changes"
   ```

5. Push to Your Fork
   ```bash
   git push origin feature/your-feature-name
   ```

6. Submit a Pull Request
   - Create a Pull Request from your fork to our main repository
   - Provide a clear description of the changes
   - Reference any related issues

### Contribution Guidelines

- Write meaningful commit messages
- Update documentation as needed
- Add comments to your code where necessary
- Test your changes before submitting
- Follow existing code style and conventions

## License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

### What this means:

- You can freely use, modify, and distribute this software
- If you modify and distribute this software, you must:
  - Make your modifications available under the GPL
  - Include the original copyright notice
  - Provide access to the source code
  - Include the full license text

## Contact

If you have any questions or suggestions, please open an issue on GitHub.

## Acknowledgments

- Inspired by the Arc Browser's innovative tab management system. Huge thanks to the Arc team for coming up with the system we've all grown to love!
- Thanks to all contributors who help improve this project 