# 3DOM - 3D Webpage Viewer

A Chrome extension that transforms webpages into interactive 3D city landscapes using Three.js. View any webpage from a bird's-eye perspective where DOM elements become geometric buildings with heights based on their CSS z-index.

## Features

### Core City View
- **Bird's-Eye Perspective**: Orthographic top-down camera view like Google Maps
- **3D Element Shapes**: DOM elements rendered as geometric shapes (boxes, cylinders, rounded boxes)
- **Z-Index Heights**: Element height determined by CSS z-index (higher z-index = taller buildings)
- **Colored Districts**: Container backgrounds become colored ground planes
- **Glass-Like Materials**: Semi-transparent shapes with transmission effects for visual layering

### Navigation & Controls
- **Pan**: Click and drag to move the camera horizontally across the city
- **Zoom**: Mouse wheel to zoom in/out (with visual zoom percentage indicator)
- **Drag Detection**: Smart distinction between panning and clicking elements

### Interactive Elements
- **Click Detection**: Raycasting-based element selection from top-down view
- **Hover Effects**: Interactive elements (links, buttons, inputs) highlight on hover
- **Element-Specific Behaviors**:
  - **Links**: Pulse animation on click
  - **Buttons**: 500ms bright glow effect that fades out
  - **Input Fields**: Continuous cyan glow when focused, clears when clicking another input
  - **Selects**: Console logging (floating bridge UI planned for future)

### Visibility Controls
- **Collapsible UI Panel**: Top-right corner with 9 element type filters
- **Element Categories**: Headers, Images, Text/Paragraphs, Links, Buttons, Forms, Containers, Navigation, Other
- **Instant Filtering**: Check/uncheck to immediately show/hide element types
- **Bulk Actions**: "Select All" / "Deselect All" buttons
- **Smart DIV Classification**: Distinguishes between text-containing DIVs and structural container DIVs

### Accessibility & Mobile
- **Keyboard Navigation**: Full Tab, Enter, Space support with visible focus indicators
- **Screen Reader Compatible**: ARIA attributes (aria-expanded, aria-controls, role="region")
- **Mobile Responsive**: Adaptive layouts for tablets and phones with touch-friendly controls
- **CSS Variables**: Maintainable theming system with centralized design tokens

## Installation

1. Clone this repository or download the ZIP file
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer Mode" in the top right corner
4. Click "Load Unpacked" and select the extension directory
5. The 3DOM extension should now be installed and visible in your Chrome toolbar

## Usage

1. Navigate to any webpage you want to view in 3D
2. Click the 3DOM icon in your Chrome toolbar
3. The extension will scan the webpage and open a new tab with the 3D city view
4. **Controls**:
   - **Pan**: Click and drag to move around the city
   - **Zoom**: Mouse wheel to zoom in/out
   - **Click Elements**: Click any shape to interact with it
   - **Visibility**: Use the top-right panel to filter element types
   - **Keyboard**: Tab through controls, Enter/Space to activate

## Architecture

### File Structure
```
3dom/
├── manifest.json          # Chrome extension configuration
├── background.js          # Background service worker for messaging
├── scripts/
│   ├── content.js         # DOM scanning and data extraction
│   └── viewer/
│       ├── core.js        # Camera, controls, raycasting, visibility
│       ├── city.js        # Ground plane and districts
│       ├── elements.js    # 3D shape generation
│       ├── images.js      # Image texture handling
│       └── utils.js       # Helper functions
├── viewer.html            # Main viewer page with UI controls
└── demo.html              # Test page with sample content
```

### Data Flow
1. User clicks extension icon on a webpage
2. `content.js` scans DOM → extracts elements, positions, styles, z-index
3. `background.js` stores data in memory
4. Viewer opens in new tab
5. Viewer requests data from background script
6. City view renders with Three.js:
   - `city.js` creates ground plane and colored districts
   - `elements.js` generates 3D shapes for all elements
   - `core.js` sets up camera, controls, and interactions

## Customization

### Modifying Element Colors
Edit `scripts/viewer/elements.js` → `getElementColor()` function

### Adjusting Camera Behavior
Edit `scripts/viewer/core.js` → `MIN_CAMERA_HEIGHT` and `MAX_CAMERA_HEIGHT` constants

### Changing Visibility Categories
Edit `scripts/viewer/core.js` → `setupVisibilityControls()` → `controlMap` object

### Styling UI Controls
Edit `viewer.html` → CSS variables in `:root` block (lines 10-32)

## Performance Optimizations

### Element Filtering (content.js)
- Prioritizes visible, meaningful elements (~300 max)
- Skips elements < 10x10 pixels
- Optimizes image data (resolution & compression)

### Rendering (viewer)
- Uses `visible` flag instead of geometry disposal/recreation
- Frustum culling (automatic Three.js feature)
- Shared materials for same element types
- No shadows (not beneficial for top-down view)
- Efficient raycasting with drag detection

### Memory Management
- Animation cleanup with `cancelAnimationFrame`
- Event listener deduplication with initialization flags
- userData cleanup after animations
- Proper disposal on page navigation

## Known Limitations

- **Select/Dropdown Elements**: Currently only log to console; floating bridge UI not yet implemented
- **Link Navigation**: Links are detected and animated but don't yet navigate to href targets
- **Text Rendering**: Large blocks of text may be truncated for performance
- **CORS Restrictions**: Some external images may not load due to browser security policies

## Future Development

- Implement "floating bridge" UI for select/dropdown elements
- Add actual link navigation (navigate to href and rebuild scene)
- Display clicked element details in info panel
- Enhanced text rendering with better typography
- VR/AR support for immersive exploration
- Export city view as 3D model (glTF, OBJ)
- Animation system for page transitions

## Technical Details

### Three.js Components
- **Camera**: `OrthographicCamera` for true top-down view
- **Materials**: `MeshPhysicalMaterial` with transmission for glass effect
- **Controls**: Custom pan/zoom implementation (not using OrbitControls)
- **Raycasting**: For click detection and hover effects

### Browser Compatibility
- Chrome/Edge: Full support (Manifest V3)
- Firefox: Not tested (would require Manifest V2 adaptation)
- Safari: Not supported (no extension support for Manifest V3)

### Performance Targets
- 60fps panning and zooming
- < 2 second load time for typical webpages
- Support up to 300 elements smoothly
- Stable memory usage (no leaks)

## Troubleshooting

### "No webpage data found" error
- Make sure you clicked the extension icon while on an actual webpage (not chrome:// or about: pages)
- Try refreshing the page and clicking the icon again

### Elements not appearing
- Check the visibility controls panel - some element types may be hidden
- Click "Select All" to show all element types

### Poor performance
- Large webpages with many elements may cause slowdown
- Try toggling off unused element types to improve performance
- The extension automatically limits elements to ~300 for performance

### Images not loading
- Some images are blocked by CORS policies
- The extension includes fallback mechanisms for external images
- Check browser console for detailed error messages

## Development

### Prerequisites
- Chrome browser (version 88+)
- Basic knowledge of JavaScript and Three.js
- Understanding of Chrome Extension Manifest V3

### Testing
Run the extension on `demo.html` for a controlled test environment with various element types.

### Building
No build step required - load directly as unpacked extension in Chrome.

## License

MIT License

## Credits

Developed with Claude Sonnet 4.5 as a demonstration of modern Chrome extension development with Three.js.

## Version History

### v2.0.0 (2026-02-13) - City View Redesign
- Complete redesign from first-person museum to bird's-eye city view
- Orthographic top-down camera with pan/zoom controls
- Z-index-based element heights
- Interactive element behaviors (pulse, glow, focus)
- Visibility controls with 9 element type filters
- Accessibility improvements (keyboard nav, ARIA, focus indicators)
- Mobile responsive design
- Performance optimizations (animation cleanup, memory management)

### v1.0.0 - Museum View (Legacy)
- First-person museum navigation
- WASD + mouse controls
- Exhibit-style element placement
- Room-based layout system
