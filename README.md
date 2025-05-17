# 3DOM - 3D Webpage Viewer

A Chrome extension that transforms regular webpages into interactive 3D environments using Three.js.

## Features

- Scans the current webpage's DOM structure
- Transforms 2D elements into 3D objects
- Navigate the 3D space using first-person controls
- Explore webpages in a completely new way

## Installation

1. Clone this repository or download the ZIP file
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer Mode" in the top right corner
4. Click "Load Unpacked" and select the extension directory
5. The 3DOM extension should now be installed and visible in your Chrome toolbar

## Usage

1. Navigate to any webpage you want to view in 3D
2. Click the 3DOM icon in your Chrome toolbar
3. The extension will scan the webpage and open a new tab with the 3D view
4. Use WASD keys to move around and mouse to look around
5. Click on the 3D view to enable controls

## Customization

This extension is highly customizable. You can modify the following files to change its behavior:

- `scripts/content.js`: Change how the DOM is scanned and analyzed
- `scripts/viewer.js`: Modify the 3D rendering and object representations
- `viewer.html`: Customize the viewer interface

## Creating Icons

To create your own icons, replace the placeholder images in the `images` directory:

- `icon16.png`: 16x16 pixels
- `icon48.png`: 48x48 pixels
- `icon128.png`: 128x128 pixels

## Future Development

- Texture mapping based on actual webpage content
- Interactive elements in 3D space
- Improved performance for complex webpages
- Enhanced visual effects and transitions

## License

MIT License
