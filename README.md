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

## Image Handling Improvements

To fix issues with images not appearing on museum walls:

1. **Image Proxying**: The content script now converts external images to data URLs before sending to the 3D viewer

   - Uses multiple approaches to handle CORS restrictions:
     - Direct loading with crossOrigin="anonymous"
     - Fallback to fetch API with blob URLs
     - Final fallback to informative placeholders

2. **Enhanced Image Display**:

   - Better fallback displays that show the original image URL
   - Improved placeholder graphics when images can't be loaded
   - Proper handling of data URLs in the viewer

3. **CORS Issue Resolution**:
   - Images from external domains (like newspaper sites) now display correctly
   - Maintains original image URLs for reference

This allows the 3DOM extension to properly display images from sites like the New York Times without being blocked by CORS policies.

## Storage Quota and Performance Optimizations

To handle large webpages with many elements and images:

1. **Message-based Data Transfer**: Switched from Chrome's storage API to direct message passing between background script and viewer

   - Avoids the `QUOTA_BYTES` limit in Chrome storage
   - Maintains the DOM data in memory rather than persisting it

2. **Data Optimization Pipeline**:

   - Automatically reduces DOM data size for large pages
   - Prioritizes important elements (images, articles, larger visible elements)
   - Limits the total number of elements to improve performance
   - Truncates excessively long text content
   - Optimizes image data by reducing resolution and compression quality

3. **Progressive Loading**:
   - Implements fallback mechanisms when data exceeds maximum message size
   - Falls back to showing fewer elements rather than failing entirely

These optimizations ensure the extension can handle complex modern websites without hitting Chrome's built-in quota limitations.

## User Experience Improvements

To enhance user experience with the 3DOM extension:

1. **Improved Loading Experience**:

   - Added a stylish loading indicator with progress updates
   - Shows the current step being executed during initialization
   - Provides clear instructions on how to use the controls

2. **Better Image Handling**:

   - Enhanced image proxying system with multiple fallback mechanisms
   - More reliable loading of external images with proper error handling
   - Improved placeholders that display the original image URLs
   - Support for both data URLs and blob URLs depending on browser capabilities

3. **Improved Error Handling**:
   - Clearer error messages when something goes wrong
   - More graceful fallbacks instead of failing completely

These improvements create a more polished user experience with fewer blank walls in the museum and clearer visual feedback during loading.

## License

MIT License
