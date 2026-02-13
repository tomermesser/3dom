# 3DOM City View Redesign

**Date:** 2026-02-13
**Status:** Approved
**Approach:** Targeted Refactor (Approach 1)

## Overview

Transform 3DOM from a first-person museum experience to a bird's-eye city view. Users will see webpages as cities viewed from above, with DOM elements represented as geometric shapes positioned by their actual coordinates and heights determined by CSS z-index.

## Vision

- **Perspective:** Fixed top-down view (like Google Maps)
- **Metaphor:** Webpage as a city, elements as buildings/structures
- **Navigation:** Pan and zoom controls
- **Visual Style:** Semi-transparent geometric shapes with webpage colors as ground districts

## Architecture

### Files to Keep (Minimal Changes)
- `background.js` - Chrome extension messaging (unchanged)
- `content.js` - DOM scanning and data extraction (unchanged)
- `viewer.html` - Main viewer page (add visibility controls UI)
- `scripts/viewer/utils.js` - Helper functions (unchanged)
- `scripts/viewer/images.js` - Image handling (unchanged)

### Files to Replace
- `scripts/viewer/museum.js` → `scripts/viewer/city.js` - New city rendering logic
- `scripts/viewer/exhibits.js` → `scripts/viewer/elements.js` - Shape creation based on DOM elements

### Files to Modify
- `scripts/viewer/core.js` - Replace FPS camera/controls with top-down OrbitControls, update scene initialization
- `scripts/viewer.js` - Update module loading to reference new files

### Data Flow
1. User clicks extension icon
2. content.js scans DOM → extracts elements, positions, styles, z-index
3. background.js stores data
4. Viewer opens in new tab
5. Viewer requests data → renders as city

## Camera & Controls

### Camera Setup
- **Type:** `THREE.OrthographicCamera` (better for pure top-down than perspective)
- **Position:** Fixed top-down angle looking straight down
- **Height:** Positioned high above scene (y-axis), centered on webpage bounds

### Controls
- **Type:** `THREE.OrthographicControls` or custom pan/zoom implementation
- **Pan:** Click and drag to move camera horizontally
- **Zoom:** Mouse wheel or pinch to zoom in/out
- **Constraints:**
  - Disable rotation (strictly top-down)
  - Min/max zoom limits
  - Camera bounded to webpage dimensions

### Initial View
Camera positioned to show entire "city" (full webpage) on load.

### UI Elements
- Remove speed indicator (not needed)
- Optional zoom level indicator
- Keep website info panel (top-left)

## City Rendering

### Ground Plane
- **Base Layer:** Large plane matching webpage dimensions from `domData.pageMetrics`
- **Position:** y = 0 (ground level)

### Districts/Zones
For each container element with background color:
- Create plane geometry matching container dimensions
- Position at y = 0.01 (prevent z-fighting)
- Apply actual `backgroundColor` from webpage
- Semi-transparent (opacity ~0.7) for blending overlapping districts

### Element Shapes

**Position (X, Z):**
- X: element.position.x (scaled to 3D space)
- Z: element.position.y (webpage Y → 3D Z for top-down)

**Height (Y):**
- Formula: `height = (zIndex + 1) * baseHeight`
- Default baseHeight: 0.5 units
- No z-index = default 0.5 height

**Geometry:**
- Rectangular → BoxGeometry
- Border-radius → RoundedBoxGeometry
- Circular (border-radius: 50%) → CylinderGeometry
- Parse border-radius CSS to determine shape

**Material:**
- `MeshPhysicalMaterial`
- `transparent: true`
- `opacity: 0.6-0.8`
- `transmission: 0.5` (glass-like)
- Color: Slight tint based on element type or background color

**Text Texture:**
- Canvas texture with element's text content
- Scale text to fit shape surface
- Apply as texture map on top face

## Interactive Elements

### Click Detection
Use raycasting to detect clicked shape from top-down view, route to handler based on element type.

### Element-Specific Behaviors

**Links (`<a>`):**
- Navigate to href URL
- Send message to open URL in current tab
- Rebuild entire city scene for new page

**Buttons (`<button>`):**
- Emit bright glow/shine on click
- Use emissive material property
- Duration: ~500ms fade out

**Input Fields (`<input>`, `<textarea>`):**
- Border shines continuously on click/focus
- Glowing outline using second geometry with emissive material
- Remains until blur/click elsewhere

**Dropdown/Select (`<select>`):**
- Create "floating bridge" extending horizontally
- Bridge: Thin rectangular plane from dropdown
- Options rendered as small shapes along bridge
- Clickable to select value
- Bridge retracts on selection or outside click

### Hover Effects
- Interactive elements: Subtle highlight (increase opacity)
- Cursor changes to pointer

### Non-Interactive Elements
- No click/hover behavior
- Remain glass-like and static

## Visibility Controls

### Control Panel UI
- **Location:** Fixed overlay (top-right corner)
- **Structure:** Collapsible panel with checkboxes:
  - ☑ Headers (H1-H6)
  - ☑ Images
  - ☑ Text/Paragraphs
  - ☑ Links
  - ☑ Buttons
  - ☑ Forms (inputs, selects, textareas)
  - ☑ Containers/Divs
  - ☑ Navigation elements
  - ☑ Other elements
- "Select All" / "Deselect All" buttons

### Behavior
- Toggle off: Hide shapes (`visible = false`)
- Toggle on: Show shapes
- Immediate application (no "Apply" button)
- State persists during session (not across reloads)

### Performance
- Don't destroy/recreate geometries
- Set visibility flag only
- Stable memory footprint

### Default State
All checkboxes checked on initial load.

## Performance Considerations

### Optimizations

**Level of Detail (LOD):**
- Zoomed out: Simplify shapes (lower polygon count)
- Zoomed in: Full detail with text textures
- Use Three.js LOD system

**Element Filtering:**
- Reuse content.js optimization (~300 elements max)
- Skip elements < 10x10 pixels
- Prioritize visible, meaningful elements

**Rendering:**
- Frustum culling (automatic)
- Shared materials for same element types
- Texture atlasing for small text textures
- Disable shadows (not beneficial for top-down)

**Memory Management:**
- Clean up geometries/materials on page navigation
- Dispose textures on transitions
- Use `renderer.dispose()` before rebuilding

**Minimal Animations:**
- Simple fade-in on load (300ms)
- No complex transitions
- Immediate interaction feedback (shader-based)

### Performance Targets
- 60fps panning and zooming
- < 2 second load time for typical webpage
- Support up to 300 elements smoothly

## Implementation Notes

### Content.js Additions
Ensure z-index is captured during DOM scanning:
```javascript
zIndex: computedStyle.zIndex !== 'auto' ? parseInt(computedStyle.zIndex) : 0
```

### Three.js Dependencies
- OrthographicCamera
- OrthographicControls (or custom implementation)
- RoundedBoxGeometry (from three/examples or custom)
- MeshPhysicalMaterial for glass effect

### Testing Considerations
- Test with various webpage layouts (news sites, blogs, e-commerce)
- Verify z-index stacking renders correctly
- Test interactive elements (dropdowns, inputs, links)
- Performance test with element-heavy pages
- Verify visibility controls work across all element types

## Success Criteria

1. Users can view any webpage as a city from above
2. Element positions match actual webpage layout
3. Z-index heights are visually clear and accurate
4. All interactive elements work as specified
5. Visibility controls filter elements correctly
6. Smooth 60fps navigation with pan/zoom
7. Links navigate to new pages and rebuild scene
8. Glass-like transparency shows layering clearly

## Open Questions

None - design is approved and ready for implementation.
