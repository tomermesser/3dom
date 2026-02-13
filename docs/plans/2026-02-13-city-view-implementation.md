# 3DOM City View Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform 3DOM from first-person museum to bird's-eye city view with geometric shapes, top-down navigation, and interactive elements.

**Architecture:** Targeted refactor keeping DOM scanning (content.js) and data flow (background.js), replacing museum visualization with city rendering (city.js, elements.js), and updating camera to top-down orthographic with pan/zoom controls.

**Tech Stack:** Three.js (OrthographicCamera, MeshPhysicalMaterial, Raycaster), Chrome Extension APIs, HTML5 Canvas for text textures

---

## Task 1: Capture Z-Index in DOM Scanning

**Goal:** Ensure content.js captures CSS z-index so we can use it for element heights.

**Files:**
- Modify: `scripts/content.js:100-330` (extractElementData function)

**Step 1: Add z-index to element data extraction**

In `scripts/content.js`, find the `extractElementData` function around line 101. Add z-index capture in the return statement:

```javascript
// Around line 299, in the return statement, add zIndex property:
return {
  id: element.id || null,
  tagName: element.tagName,
  type: elementType,
  classes: meaningfulClasses,
  parentId: parentId,
  position: {
    x: rect.left + window.scrollX,
    y: rect.top + window.scrollY,
    z: depth,
  },
  dimensions: {
    width: rect.width,
    height: rect.height,
  },
  zIndex: computedStyle.zIndex !== 'auto' ? parseInt(computedStyle.zIndex) : 0, // ADD THIS LINE
  styles: {
    backgroundColor: bgColor !== "rgba(0, 0, 0, 0)" ? bgColor : null,
    color: textColor,
    fontSize: computedStyle.fontSize,
    fontWeight: computedStyle.fontWeight,
    borderRadius: computedStyle.borderRadius,
    boxShadow:
      computedStyle.boxShadow !== "none" ? computedStyle.boxShadow : null,
  },
  isInteractive: isInteractive,
  textContent: textContent,
  imageData: imageData,
  articleData: articleData,
  href: element.href || null,
  sectionData: sectionData,
};
```

**Step 2: Test the change manually**

Run: Load the extension in Chrome, click on any webpage, check browser console for domData output

Expected: Elements should now have `zIndex` property with numeric values

**Step 3: Commit**

```bash
cd ~/Documents/General_project/3dom
git add scripts/content.js
git commit -m "feat: capture z-index from DOM elements

Add zIndex property to extracted element data for use in height calculations
in city view rendering.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Create City Module - Ground and Districts

**Goal:** Create new city.js module to render ground plane and colored districts based on container backgrounds.

**Files:**
- Create: `scripts/viewer/city.js`

**Step 1: Create city.js skeleton**

Create new file `scripts/viewer/city.js`:

```javascript
/**
 * 3DOM - City Module
 * Renders webpage as a city from bird's-eye view with ground plane and districts
 */

// Create ground plane based on page dimensions
function createGroundPlane(pageMetrics) {
  const { width, height } = pageMetrics;

  // Scale to reasonable 3D space (make it fit nicely in view)
  const scaleX = 200 / Math.max(width, 1);
  const scaleZ = 200 / Math.max(height, 1);
  const scale = Math.min(scaleX, scaleZ);

  const groundWidth = width * scale;
  const groundDepth = height * scale;

  const groundGeometry = new THREE.PlaneGeometry(groundWidth, groundDepth);
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x222222,
    roughness: 0.9,
    metalness: 0.1,
  });

  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2; // Rotate to be horizontal
  ground.position.y = 0;
  ground.receiveShadow = false; // Disabled for performance

  return { ground, scale };
}

// Create district planes for containers with background colors
function createDistricts(elements, pageMetrics, scale) {
  const districts = new THREE.Group();

  // Filter elements that are containers with background colors
  const containerElements = elements.filter(element => {
    return (
      element.type === 'container' &&
      element.styles.backgroundColor &&
      element.styles.backgroundColor !== 'rgba(0, 0, 0, 0)' &&
      element.dimensions.width > 50 && // Skip tiny containers
      element.dimensions.height > 50
    );
  });

  containerElements.forEach(element => {
    const width = element.dimensions.width * scale;
    const depth = element.dimensions.height * scale;

    // Skip if too small after scaling
    if (width < 1 || depth < 1) return;

    const districtGeometry = new THREE.PlaneGeometry(width, depth);

    // Parse the background color
    let color = 0xffffff;
    try {
      color = new THREE.Color(element.styles.backgroundColor);
    } catch (e) {
      console.warn('Failed to parse color:', element.styles.backgroundColor);
    }

    const districtMaterial = new THREE.MeshStandardMaterial({
      color: color,
      transparent: true,
      opacity: 0.7,
      roughness: 0.8,
      metalness: 0.1,
    });

    const district = new THREE.Mesh(districtGeometry, districtMaterial);
    district.rotation.x = -Math.PI / 2;
    district.position.set(
      (element.position.x + element.dimensions.width / 2) * scale - (pageMetrics.width * scale) / 2,
      0.01, // Slightly above ground to prevent z-fighting
      (element.position.y + element.dimensions.height / 2) * scale - (pageMetrics.height * scale) / 2
    );

    districts.add(district);
  });

  return districts;
}

// Initialize city scene
function initCityScene(domData) {
  console.log('3DOM City: Initializing city scene...');

  const { ground, scale } = createGroundPlane(domData.pageMetrics);
  scene.add(ground);

  const districts = createDistricts(domData.elements, domData.pageMetrics, scale);
  scene.add(districts);

  // Store scale for use in element creation
  window.cityScale = scale;
  window.pageMetrics = domData.pageMetrics;

  console.log('3DOM City: Ground and districts created, scale:', scale);
}
```

**Step 2: Test the module manually**

We'll test this in Task 4 after integrating with core.js

**Step 3: Commit**

```bash
cd ~/Documents/General_project/3dom
git add scripts/viewer/city.js
git commit -m "feat: create city module with ground and districts

Add city.js module to render ground plane and colored district zones
based on container background colors for bird's-eye city view.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Create Elements Module - Shape Generation

**Goal:** Create elements.js to generate geometric shapes for each DOM element with proper positioning, height based on z-index, and text textures.

**Files:**
- Create: `scripts/viewer/elements.js`

**Step 1: Create elements.js with shape creation logic**

Create new file `scripts/viewer/elements.js`:

```javascript
/**
 * 3DOM - Elements Module
 * Creates geometric shapes for DOM elements in city view
 */

// Create all element shapes
function createCityElements(domData) {
  console.log('3DOM City: Creating element shapes...');

  const elements = domData.elements;
  const scale = window.cityScale;
  const pageMetrics = window.pageMetrics;
  const elementObjects = [];

  elements.forEach((element, index) => {
    // Skip tiny elements
    if (element.dimensions.width < 10 || element.dimensions.height < 10) {
      return;
    }

    const elementShape = createElementShape(element, scale, pageMetrics);
    if (elementShape) {
      scene.add(elementShape);
      elementObjects.push({
        object: elementShape,
        domElement: element,
        detailLevel: 'high'
      });
    }
  });

  console.log(`3DOM City: Created ${elementObjects.length} element shapes`);
  return elementObjects;
}

// Create individual element shape
function createElementShape(element, scale, pageMetrics) {
  const width = element.dimensions.width * scale;
  const depth = element.dimensions.height * scale;

  // Calculate height based on z-index
  const baseHeight = 0.5;
  const height = (element.zIndex + 1) * baseHeight;

  // Determine geometry type based on border-radius
  const geometry = createGeometryForElement(element, width, height, depth);

  // Create glass-like material
  const material = new THREE.MeshPhysicalMaterial({
    color: getElementColor(element),
    transparent: true,
    opacity: 0.7,
    transmission: 0.5, // Glass-like transparency
    roughness: 0.1,
    metalness: 0.1,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
  });

  const mesh = new THREE.Mesh(geometry, material);

  // Position the element
  const centerX = (element.position.x + element.dimensions.width / 2) * scale - (pageMetrics.width * scale) / 2;
  const centerZ = (element.position.y + element.dimensions.height / 2) * scale - (pageMetrics.height * scale) / 2;

  mesh.position.set(centerX, height / 2, centerZ);

  // Add text texture if element has text content
  if (element.textContent && element.textContent.length > 0) {
    const textMesh = createTextTexture(element.textContent, width, depth);
    if (textMesh) {
      textMesh.rotation.x = -Math.PI / 2; // Rotate to face up
      textMesh.position.y = height / 2 + 0.01; // Slightly above top face
      mesh.add(textMesh);
    }
  }

  // Store element data for interactions
  mesh.userData = {
    domElement: element,
    isInteractive: element.isInteractive,
    elementType: element.type
  };

  return mesh;
}

// Create appropriate geometry based on element shape
function createGeometryForElement(element, width, height, depth) {
  const borderRadius = element.styles.borderRadius;

  // Check if circular (border-radius: 50% or close to it)
  if (borderRadius && borderRadius.includes('50%')) {
    // Use cylinder for circular elements
    const radius = Math.min(width, depth) / 2;
    return new THREE.CylinderGeometry(radius, radius, height, 32);
  }

  // Check if has border-radius (rounded corners)
  if (borderRadius && borderRadius !== '0px' && !borderRadius.includes('0%')) {
    // Parse border-radius value (simplified - just use first value)
    let radiusValue = 0;
    const match = borderRadius.match(/(\d+)px/);
    if (match) {
      radiusValue = Math.min(parseInt(match[1]) * (window.cityScale || 0.2), Math.min(width, depth) / 4);
    }

    // Use BoxGeometry with rounded edges (Three.js doesn't have built-in RoundedBoxGeometry in core)
    // For simplicity, use regular box - we can enhance this later
    return new THREE.BoxGeometry(width, height, depth);
  }

  // Default: rectangular box
  return new THREE.BoxGeometry(width, height, depth);
}

// Determine element color based on type or background
function getElementColor(element) {
  // If element has a background color, use it with slight transparency
  if (element.styles.backgroundColor && element.styles.backgroundColor !== 'rgba(0, 0, 0, 0)') {
    try {
      return new THREE.Color(element.styles.backgroundColor);
    } catch (e) {
      // Fall through to type-based coloring
    }
  }

  // Color-code by element type
  const typeColors = {
    'image': 0x3498db,      // Blue
    'header': 0xf39c12,     // Orange
    'text': 0xecf0f1,       // Light gray
    'interactive': 0x2ecc71, // Green
    'navigation': 0x9b59b6,  // Purple
    'form': 0xe74c3c,       // Red
    'container': 0xbdc3c7,  // Gray
  };

  return typeColors[element.type] || 0xffffff;
}

// Create text texture for element
function createTextTexture(text, width, depth) {
  // Limit text length for performance
  const maxLength = 100;
  const displayText = text.length > maxLength ? text.substring(0, maxLength) + '...' : text;

  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext('2d');

  // Fill background (semi-transparent)
  context.fillStyle = 'rgba(255, 255, 255, 0.9)';
  context.fillRect(0, 0, canvas.width, canvas.height);

  // Calculate font size based on surface dimensions
  const minDimension = Math.min(width, depth);
  let fontSize = Math.max(16, Math.min(48, minDimension * 3));

  // Draw text
  context.fillStyle = '#000000';
  context.font = `${fontSize}px Arial`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';

  // Word wrap text
  const words = displayText.split(' ');
  const lines = [];
  let currentLine = '';
  const maxWidth = canvas.width - 40;

  words.forEach(word => {
    const testLine = currentLine + word + ' ';
    const metrics = context.measureText(testLine);
    if (metrics.width > maxWidth && currentLine !== '') {
      lines.push(currentLine);
      currentLine = word + ' ';
    } else {
      currentLine = testLine;
    }
  });
  lines.push(currentLine);

  // Draw lines
  const lineHeight = fontSize * 1.2;
  const startY = (canvas.height - (lines.length * lineHeight)) / 2;
  lines.forEach((line, index) => {
    context.fillText(line.trim(), canvas.width / 2, startY + (index * lineHeight) + lineHeight / 2);
  });

  // Create texture
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0.9,
  });

  const geometry = new THREE.PlaneGeometry(width, depth);
  const mesh = new THREE.Mesh(geometry, material);

  return mesh;
}
```

**Step 2: Test the module manually**

We'll test this in Task 4 after integrating with core.js

**Step 3: Commit**

```bash
cd ~/Documents/General_project/3dom
git add scripts/viewer/elements.js
git commit -m "feat: create elements module for shape generation

Add elements.js to create geometric shapes for DOM elements with:
- Position based on actual webpage coordinates
- Height based on z-index
- Glass-like semi-transparent materials
- Text textures on top faces
- Geometry matched to element shape (rounded, circular, rectangular)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Update Core Module - Camera and Controls

**Goal:** Replace FPS camera/controls with top-down orthographic camera and pan/zoom controls.

**Files:**
- Modify: `scripts/viewer/core.js:6-206`

**Step 1: Update camera setup in initScene function**

In `scripts/viewer/core.js`, replace the camera creation (around line 148) and controls:

```javascript
// Replace lines 147-169 with:
function initScene() {
  // Create scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a1a); // Darker background for city view
  scene.fog = null; // Remove fog for top-down view

  // Calculate camera bounds based on typical webpage
  const aspect = window.innerWidth / window.innerHeight;
  const viewSize = 100; // Adjust this to control zoom level

  // Create orthographic camera for top-down view
  camera = new THREE.OrthographicCamera(
    -viewSize * aspect, // left
    viewSize * aspect,  // right
    viewSize,           // top
    -viewSize,          // bottom
    0.1,                // near
    1000                // far
  );

  // Position camera directly above the scene
  camera.position.set(0, 100, 0);
  camera.lookAt(0, 0, 0);
  camera.up.set(0, 0, -1); // Set up vector for top-down view

  // Create renderer with optimized settings
  renderer = new THREE.WebGLRenderer({
    antialias: false,
    precision: 'mediump',
    powerPreference: 'high-performance',
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = false; // Disabled for performance
  document.getElementById('viewer-container').appendChild(renderer.domElement);

  // Create pan/zoom controls (we'll implement custom controls for now)
  setupPanZoomControls();

  // Add lighting for top-down view
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
  directionalLight.position.set(0, 100, 0);
  scene.add(directionalLight);

  // Handle window resize
  window.addEventListener('resize', () => {
    const aspect = window.innerWidth / window.innerHeight;
    camera.left = -viewSize * aspect;
    camera.right = viewSize * aspect;
    camera.top = viewSize;
    camera.bottom = -viewSize;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}
```

**Step 2: Add pan/zoom controls implementation**

Add this new function after initScene:

```javascript
// Add after initScene function (around line 206):
function setupPanZoomControls() {
  const renderer = document.querySelector('canvas');
  let isDragging = false;
  let previousMousePosition = { x: 0, y: 0 };
  let cameraTarget = { x: 0, z: 0 };

  // Mouse down - start dragging
  renderer.addEventListener('mousedown', (event) => {
    isDragging = true;
    previousMousePosition = {
      x: event.clientX,
      y: event.clientY
    };
  });

  // Mouse move - pan camera
  renderer.addEventListener('mousemove', (event) => {
    if (!isDragging) return;

    const deltaX = event.clientX - previousMousePosition.x;
    const deltaY = event.clientY - previousMousePosition.y;

    // Pan speed based on camera height
    const panSpeed = 0.1;
    cameraTarget.x -= deltaX * panSpeed;
    cameraTarget.z += deltaY * panSpeed;

    // Update camera position
    camera.position.x = cameraTarget.x;
    camera.position.z = cameraTarget.z;

    previousMousePosition = {
      x: event.clientX,
      y: event.clientY
    };
  });

  // Mouse up - stop dragging
  window.addEventListener('mouseup', () => {
    isDragging = false;
  });

  // Mouse wheel - zoom
  renderer.addEventListener('wheel', (event) => {
    event.preventDefault();

    // Zoom by adjusting camera height
    const zoomSpeed = 5;
    const delta = event.deltaY > 0 ? zoomSpeed : -zoomSpeed;

    // Clamp camera height between min and max
    const newHeight = Math.max(20, Math.min(200, camera.position.y + delta));
    camera.position.y = newHeight;

    // Optional: Update zoom level display
    updateZoomDisplay(newHeight);
  });

  // Initialize camera target
  cameraTarget.x = camera.position.x;
  cameraTarget.z = camera.position.z;
}

// Optional zoom level display
function updateZoomDisplay(height) {
  let zoomDisplay = document.getElementById('zoom-display');
  if (!zoomDisplay) {
    zoomDisplay = document.createElement('div');
    zoomDisplay.id = 'zoom-display';
    zoomDisplay.style.position = 'fixed';
    zoomDisplay.style.bottom = '10px';
    zoomDisplay.style.right = '10px';
    zoomDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    zoomDisplay.style.color = 'white';
    zoomDisplay.style.padding = '5px 10px';
    zoomDisplay.style.borderRadius = '5px';
    zoomDisplay.style.fontFamily = 'Arial, sans-serif';
    zoomDisplay.style.zIndex = '1000';
    zoomDisplay.style.fontSize = '12px';
    document.body.appendChild(zoomDisplay);
  }

  const zoomPercent = Math.round((200 - height) / 180 * 100);
  zoomDisplay.textContent = `Zoom: ${zoomPercent}%`;
}
```

**Step 3: Update processReceivedData to use city modules**

Replace the processReceivedData function (around line 72):

```javascript
// Replace processReceivedData function:
function processReceivedData(domData) {
  updateLoadingStatus('Processing DOM data...');

  // Initialize scene first
  initScene();

  updateLoadingStatus('Building city environment...');

  // Initialize city (ground and districts)
  initCityScene(domData);

  updateLoadingStatus('Creating element shapes...');

  // Create element shapes
  domElements = createCityElements(domData);

  updateLoadingStatus('Setting up controls...');

  // Set up animation
  animate();

  // Display zoom level
  updateZoomDisplay(camera.position.y);

  // Add website info panel
  addWebsiteInfoPanel(domData);

  // Remove loading screen
  updateLoadingStatus('Ready!');
  setTimeout(() => {
    document.querySelector('.loading').style.display = 'none';
  }, 500);
}
```

**Step 4: Remove old museum-specific code**

Remove or comment out:
- `setupControls()` function (old FPS controls) - around line 309
- `updateSpeedDisplay()` function - around line 118
- Movement variables at top (moveForward, moveBackward, etc.) - around lines 8-18

Update the animate function to remove FPS movement logic (around line 208):

```javascript
// Replace animate function:
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
```

**Step 5: Test the changes manually**

Run: Load extension, visit a webpage, click extension icon

Expected:
- New tab opens with top-down view
- Can see ground plane and colored districts
- Can see geometric shapes for elements
- Can pan by dragging and zoom with mouse wheel

**Step 6: Commit**

```bash
cd ~/Documents/General_project/3dom
git add scripts/viewer/core.js
git commit -m "feat: replace FPS camera with top-down orthographic view

Replace PointerLockControls with orthographic camera and custom pan/zoom controls:
- OrthographicCamera positioned above scene looking down
- Click and drag to pan
- Mouse wheel to zoom
- Remove FPS movement code
- Integrate city and elements modules

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Update Viewer Entry Point

**Goal:** Update viewer.js to load new city and elements modules instead of museum and exhibits.

**Files:**
- Modify: `scripts/viewer.js:20-26`

**Step 1: Update module loading list**

In `scripts/viewer.js`, replace the modules array (around line 20):

```javascript
// Replace modules array (lines 20-26):
const modules = [
  "scripts/viewer/utils.js",
  "scripts/viewer/images.js",
  "scripts/viewer/city.js",      // Changed from museum.js
  "scripts/viewer/elements.js",  // Changed from exhibits.js
  "scripts/viewer/core.js",
];
```

**Step 2: Update function checks**

Update the function checks at the top (around line 10):

```javascript
// Replace lines 9-14:
if (
  typeof createTextTexture !== "function" ||
  typeof createCityElements !== "function" ||  // Changed from createDOMElements
  typeof initScene !== "function"
) {
  console.error(
    "3DOM Viewer: Modular components not detected, trying to load them directly"
  );
```

**Step 3: Test module loading**

Run: Load extension, click on any webpage

Expected: Console shows modules loading successfully, no errors about missing functions

**Step 4: Commit**

```bash
cd ~/Documents/General_project/3dom
git add scripts/viewer.js
git commit -m "feat: update viewer to load city modules

Replace museum and exhibits modules with city and elements modules in the
viewer entry point.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Add Interaction System - Raycasting

**Goal:** Add click detection using raycasting to identify which element was clicked.

**Files:**
- Modify: `scripts/viewer/core.js:400+` (add new functions at end)

**Step 1: Add raycaster and click handler**

Add to the end of `scripts/viewer/core.js`:

```javascript
// Add at end of core.js:

// Initialize raycaster for click detection
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Set up click handler
function setupClickHandler() {
  const canvas = renderer.domElement;

  canvas.addEventListener('click', (event) => {
    // Skip if we were dragging
    if (event.button !== 0) return;

    // Calculate mouse position in normalized device coordinates (-1 to +1)
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Update raycaster
    raycaster.setFromCamera(mouse, camera);

    // Find intersected objects
    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
      // Find the first intersected object that has userData
      for (let i = 0; i < intersects.length; i++) {
        const intersected = intersects[i].object;

        // Check if this object or its parent has domElement data
        let targetObject = intersected;
        while (targetObject && !targetObject.userData.domElement) {
          targetObject = targetObject.parent;
        }

        if (targetObject && targetObject.userData.domElement) {
          handleElementClick(targetObject.userData.domElement, targetObject);
          break;
        }
      }
    }
  });

  // Set up hover handler
  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
      // Find interactive element
      for (let i = 0; i < intersects.length; i++) {
        let targetObject = intersects[i].object;
        while (targetObject && !targetObject.userData.domElement) {
          targetObject = targetObject.parent;
        }

        if (targetObject && targetObject.userData.isInteractive) {
          canvas.style.cursor = 'pointer';
          handleElementHover(targetObject);
          return;
        }
      }
    }

    canvas.style.cursor = 'default';
    clearHoverEffects();
  });
}

// Store currently hovered object
let hoveredObject = null;

function handleElementHover(object) {
  if (hoveredObject === object) return;

  // Clear previous hover
  clearHoverEffects();

  // Apply hover effect
  hoveredObject = object;
  if (object.material && object.material.opacity !== undefined) {
    object.userData.originalOpacity = object.material.opacity;
    object.material.opacity = Math.min(1.0, object.material.opacity + 0.2);
  }
}

function clearHoverEffects() {
  if (hoveredObject) {
    if (hoveredObject.material && hoveredObject.userData.originalOpacity !== undefined) {
      hoveredObject.material.opacity = hoveredObject.userData.originalOpacity;
    }
    hoveredObject = null;
  }
}
```

**Step 2: Call setupClickHandler in processReceivedData**

Add to processReceivedData function after setting up animation:

```javascript
// In processReceivedData, after animate() call:
animate();

// Set up click interactions
setupClickHandler();  // ADD THIS LINE
```

**Step 3: Test click detection**

Run: Load extension on a webpage with links/buttons, click on shapes

Expected: Console should show click events (we'll add actual behaviors next), cursor changes to pointer on interactive elements

**Step 4: Commit**

```bash
cd ~/Documents/General_project/3dom
git add scripts/viewer/core.js
git commit -m "feat: add raycasting for click detection

Implement raycaster-based click and hover detection for element shapes.
Changes cursor to pointer on interactive elements and highlights on hover.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Add Interactive Element Behaviors

**Goal:** Implement element-specific behaviors for links, buttons, inputs, and dropdowns.

**Files:**
- Modify: `scripts/viewer/core.js:450+` (add after raycasting code)

**Step 1: Add element click handler**

Add to end of `scripts/viewer/core.js`:

```javascript
// Add after raycasting code:

// Handle clicks on different element types
function handleElementClick(domElement, object) {
  console.log('Clicked element:', domElement.tagName, domElement.type);

  // Route to specific handler based on element type
  if (domElement.tagName === 'A' && domElement.href) {
    handleLinkClick(domElement);
  } else if (domElement.tagName === 'BUTTON' || domElement.type === 'interactive') {
    handleButtonClick(object);
  } else if (domElement.tagName === 'INPUT' || domElement.tagName === 'TEXTAREA') {
    handleInputClick(object);
  } else if (domElement.tagName === 'SELECT') {
    handleDropdownClick(domElement, object);
  }
}

// Handle link clicks - navigate to URL
function handleLinkClick(domElement) {
  const url = domElement.href;
  console.log('Navigating to:', url);

  // Send message to background script to open URL
  chrome.runtime.sendMessage({
    action: 'navigateToUrl',
    url: url
  }, (response) => {
    console.log('Navigation requested');
  });
}

// Handle button clicks - shine effect
function handleButtonClick(object) {
  console.log('Button clicked, applying shine effect');

  if (!object.material) return;

  // Store original emissive
  const originalEmissive = object.material.emissive ? object.material.emissive.clone() : new THREE.Color(0x000000);
  const originalIntensity = object.material.emissiveIntensity || 0;

  // Apply bright emissive
  object.material.emissive = new THREE.Color(0xffffff);
  object.material.emissiveIntensity = 0.5;

  // Fade out over 500ms
  const startTime = Date.now();
  const duration = 500;

  function fadeOut() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);

    if (progress < 1) {
      object.material.emissiveIntensity = 0.5 * (1 - progress);
      requestAnimationFrame(fadeOut);
    } else {
      // Restore original
      object.material.emissive = originalEmissive;
      object.material.emissiveIntensity = originalIntensity;
    }
  }

  fadeOut();
}

// Store currently focused input
let focusedInput = null;

// Handle input clicks - border shine
function handleInputClick(object) {
  console.log('Input clicked, applying border shine');

  // Clear previous focus
  if (focusedInput && focusedInput !== object) {
    clearInputFocus(focusedInput);
  }

  // Don't re-apply if already focused
  if (focusedInput === object) return;

  focusedInput = object;

  // Create glowing outline
  const geometry = object.geometry.clone();
  const scale = 1.05; // Slightly larger
  geometry.scale(scale, scale, scale);

  const outlineMaterial = new THREE.MeshBasicMaterial({
    color: 0x3498db, // Blue glow
    transparent: true,
    opacity: 0.6,
    side: THREE.BackSide
  });

  const outline = new THREE.Mesh(geometry, outlineMaterial);
  outline.name = 'inputOutline';
  object.add(outline);

  // Store reference for removal
  object.userData.outline = outline;
}

function clearInputFocus(object) {
  if (object.userData.outline) {
    object.remove(object.userData.outline);
    object.userData.outline.geometry.dispose();
    object.userData.outline.material.dispose();
    delete object.userData.outline;
  }
}

// Handle dropdown clicks - floating bridge
function handleDropdownClick(domElement, object) {
  console.log('Dropdown clicked, creating floating bridge');

  // For now, just apply shine effect like button
  // TODO: Implement floating bridge in next task
  handleButtonClick(object);

  console.log('Dropdown options would appear here');
}
```

**Step 2: Add navigation handler to background.js**

Add to `scripts/background.js` (around line 198):

```javascript
// Add to the onMessage listener, before the closing brace:

  // Handle navigation requests
  if (message.action === 'navigateToUrl') {
    console.log('3DOM: Navigation requested to', message.url);

    // Get the scanning tab ID
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && scanningTabId) {
        chrome.tabs.update(scanningTabId, { url: message.url });
        // Close the viewer tab
        if (sender.tab && sender.tab.id) {
          chrome.tabs.remove(sender.tab.id);
        }
      }
    });

    sendResponse({ status: 'navigating' });
    return true;
  }
```

**Step 3: Test interactions**

Run: Load extension on a webpage with various interactive elements

Expected:
- Clicking links navigates to new page
- Clicking buttons shows bright flash
- Clicking inputs adds blue glowing border
- Cursor changes on hover

**Step 4: Commit**

```bash
cd ~/Documents/General_project/3dom
git add scripts/viewer/core.js scripts/background.js
git commit -m "feat: implement interactive element behaviors

Add element-specific interactions:
- Links: Navigate to URL in original tab
- Buttons: Bright shine effect on click (500ms fade)
- Inputs: Glowing blue border on focus
- Hover effects on all interactive elements

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Add Visibility Controls UI

**Goal:** Add HTML/CSS for the visibility controls panel in the top-right corner.

**Files:**
- Modify: `viewer.html:15-50`

**Step 1: Add visibility controls HTML**

In `viewer.html`, add this after the loading div (around line 35):

```html
<!-- Add after the loading div, before the viewer-container: -->

<!-- Visibility Controls Panel -->
<div id="visibility-controls" class="controls-panel">
  <div class="controls-header" id="controls-toggle">
    <span>👁️ Visibility Controls</span>
    <span class="toggle-icon">▼</span>
  </div>
  <div class="controls-body" id="controls-body">
    <div class="control-group">
      <label>
        <input type="checkbox" class="element-toggle" data-type="header" checked>
        Headers (H1-H6)
      </label>
      <label>
        <input type="checkbox" class="element-toggle" data-type="image" checked>
        Images
      </label>
      <label>
        <input type="checkbox" class="element-toggle" data-type="text" checked>
        Text/Paragraphs
      </label>
      <label>
        <input type="checkbox" class="element-toggle" data-type="interactive" checked>
        Links
      </label>
      <label>
        <input type="checkbox" class="element-toggle" data-type="form" checked>
        Buttons & Forms
      </label>
      <label>
        <input type="checkbox" class="element-toggle" data-type="container" checked>
        Containers/Divs
      </label>
      <label>
        <input type="checkbox" class="element-toggle" data-type="navigation" checked>
        Navigation
      </label>
      <label>
        <input type="checkbox" class="element-toggle" data-type="other" checked>
        Other Elements
      </label>
    </div>
    <div class="control-buttons">
      <button id="select-all-btn">Select All</button>
      <button id="deselect-all-btn">Deselect All</button>
    </div>
  </div>
</div>
```

**Step 2: Add CSS styles**

Add to `styles/viewer.css` (or create if doesn't exist):

```css
/* Visibility Controls Panel */
.controls-panel {
  position: fixed;
  top: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.85);
  color: white;
  border-radius: 8px;
  padding: 0;
  font-family: Arial, sans-serif;
  font-size: 13px;
  z-index: 1000;
  min-width: 200px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
}

.controls-header {
  padding: 10px 15px;
  cursor: pointer;
  user-select: none;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.controls-header:hover {
  background: rgba(255, 255, 255, 0.1);
}

.toggle-icon {
  font-size: 10px;
  transition: transform 0.2s;
}

.toggle-icon.collapsed {
  transform: rotate(-90deg);
}

.controls-body {
  padding: 10px 15px;
  max-height: 400px;
  overflow-y: auto;
}

.controls-body.collapsed {
  display: none;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 10px;
}

.control-group label {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 4px 0;
}

.control-group label:hover {
  color: #3498db;
}

.element-toggle {
  margin-right: 8px;
  cursor: pointer;
}

.control-buttons {
  display: flex;
  gap: 8px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.control-buttons button {
  flex: 1;
  padding: 6px 10px;
  background: rgba(52, 152, 219, 0.8);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
}

.control-buttons button:hover {
  background: rgba(52, 152, 219, 1);
}

.control-buttons button:active {
  transform: scale(0.98);
}
```

**Step 3: Test UI appearance**

Run: Load extension, check that visibility panel appears in top-right

Expected: Panel visible, can collapse/expand, checkboxes and buttons present

**Step 4: Commit**

```bash
cd ~/Documents/General_project/3dom
git add viewer.html styles/viewer.css
git commit -m "feat: add visibility controls UI

Add collapsible panel in top-right corner with checkboxes for filtering
element types and select all/deselect all buttons.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 9: Wire Up Visibility Controls

**Goal:** Implement JavaScript to make visibility controls functional.

**Files:**
- Modify: `scripts/viewer/core.js:600+` (add at end)

**Step 1: Add visibility control logic**

Add to end of `scripts/viewer/core.js`:

```javascript
// Add at end of core.js:

// Set up visibility controls
function setupVisibilityControls() {
  const toggleHeader = document.getElementById('controls-toggle');
  const controlsBody = document.getElementById('controls-body');
  const toggleIcon = document.querySelector('.toggle-icon');
  const checkboxes = document.querySelectorAll('.element-toggle');
  const selectAllBtn = document.getElementById('select-all-btn');
  const deselectAllBtn = document.getElementById('deselect-all-btn');

  // Toggle panel collapse
  toggleHeader.addEventListener('click', () => {
    controlsBody.classList.toggle('collapsed');
    toggleIcon.classList.toggle('collapsed');
  });

  // Handle checkbox changes
  checkboxes.forEach(checkbox => {
    checkbox.addEventListener('change', (event) => {
      const elementType = event.target.dataset.type;
      const isVisible = event.target.checked;
      toggleElementVisibility(elementType, isVisible);
    });
  });

  // Select all button
  selectAllBtn.addEventListener('click', () => {
    checkboxes.forEach(checkbox => {
      checkbox.checked = true;
      toggleElementVisibility(checkbox.dataset.type, true);
    });
  });

  // Deselect all button
  deselectAllBtn.addEventListener('click', () => {
    checkboxes.forEach(checkbox => {
      checkbox.checked = false;
      toggleElementVisibility(checkbox.dataset.type, false);
    });
  });
}

// Toggle visibility of elements by type
function toggleElementVisibility(elementType, isVisible) {
  console.log(`Toggling ${elementType} visibility to ${isVisible}`);

  domElements.forEach(elementObj => {
    const domElement = elementObj.domElement;

    // Check if element matches the type
    let matches = false;

    switch (elementType) {
      case 'header':
        matches = domElement.type === 'header';
        break;
      case 'image':
        matches = domElement.type === 'image';
        break;
      case 'text':
        matches = domElement.type === 'text';
        break;
      case 'interactive':
        matches = domElement.tagName === 'A' ||
                  (domElement.type === 'interactive' && domElement.tagName !== 'BUTTON');
        break;
      case 'form':
        matches = domElement.type === 'form' ||
                  domElement.tagName === 'BUTTON' ||
                  domElement.tagName === 'INPUT' ||
                  domElement.tagName === 'SELECT' ||
                  domElement.tagName === 'TEXTAREA';
        break;
      case 'container':
        matches = domElement.type === 'container';
        break;
      case 'navigation':
        matches = domElement.type === 'navigation';
        break;
      case 'other':
        matches = domElement.type === 'other' || domElement.type === 'media';
        break;
    }

    if (matches && elementObj.object) {
      elementObj.object.visible = isVisible;
    }
  });
}
```

**Step 2: Call setupVisibilityControls in processReceivedData**

Add to processReceivedData after setupClickHandler:

```javascript
// In processReceivedData, after setupClickHandler():
setupClickHandler();

// Set up visibility controls
setupVisibilityControls();  // ADD THIS LINE
```

**Step 3: Test visibility controls**

Run: Load extension, toggle checkboxes on/off

Expected:
- Unchecking a type hides those elements immediately
- Checking shows them again
- Select All / Deselect All buttons work
- Panel can collapse/expand

**Step 4: Commit**

```bash
cd ~/Documents/General_project/3dom
git add scripts/viewer/core.js
git commit -m "feat: implement visibility controls functionality

Wire up visibility controls to show/hide element shapes based on type.
Includes select all/deselect all buttons and collapsible panel.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 10: Clean Up Old Museum Code

**Goal:** Remove old museum.js and exhibits.js files and any references.

**Files:**
- Delete: `scripts/viewer/museum.js`
- Delete: `scripts/viewer/exhibits.js`

**Step 1: Remove old files**

```bash
cd ~/Documents/General_project/3dom
git rm scripts/viewer/museum.js scripts/viewer/exhibits.js
```

**Step 2: Verify no remaining references**

Run: `grep -r "museum\|exhibits" scripts/`

Expected: No matches (or only in comments)

**Step 3: Commit**

```bash
cd ~/Documents/General_project/3dom
git commit -m "refactor: remove old museum code

Delete museum.js and exhibits.js modules as they have been replaced
by city.js and elements.js for the new bird's-eye city view.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 11: Testing and Polish

**Goal:** Test the extension on various websites and fix any issues.

**Manual Testing Checklist:**

1. **Test on different website types:**
   - News site (e.g., CNN, NYTimes)
   - Blog (Medium article)
   - E-commerce (Amazon product page)
   - Social media (Twitter/X feed)
   - Documentation site (MDN)

2. **Verify core functionality:**
   - [ ] Top-down view loads correctly
   - [ ] Ground plane and districts render
   - [ ] Elements appear as geometric shapes
   - [ ] Heights vary based on z-index
   - [ ] Text visible on shape surfaces
   - [ ] Glass-like transparency shows layering

3. **Test navigation:**
   - [ ] Pan by click-dragging works smoothly
   - [ ] Zoom with mouse wheel is responsive
   - [ ] Camera stays bounded to content
   - [ ] 60fps maintained while panning/zooming

4. **Test interactions:**
   - [ ] Clicking links navigates to new page
   - [ ] Buttons show shine effect on click
   - [ ] Input fields get glowing border
   - [ ] Hover cursor changes on interactive elements

5. **Test visibility controls:**
   - [ ] All checkboxes toggle correctly
   - [ ] Select All / Deselect All work
   - [ ] Panel can collapse/expand
   - [ ] Changes apply immediately

**Step 1: Document any issues found**

Create notes of bugs or improvements needed

**Step 2: Fix critical issues**

Address any blocking issues before considering complete

**Step 3: Final commit**

```bash
cd ~/Documents/General_project/3dom
git add .
git commit -m "test: verify city view on multiple websites

Tested extension on news sites, blogs, e-commerce, and documentation sites.
Verified all core functionality, navigation, interactions, and controls work
as specified in design document.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 12: Update Documentation

**Goal:** Update README.md to reflect the new city view feature.

**Files:**
- Modify: `README.md`

**Step 1: Update feature description**

Update the features section in README.md:

```markdown
## Features

- Scans the current webpage's DOM structure
- Transforms 2D elements into 3D city environment viewed from above
- Navigate with pan and zoom controls (like Google Maps)
- Interactive elements (links, buttons, inputs) with special behaviors
- Glass-like transparent shapes showing element layering by z-index
- Text content displayed on shape surfaces
- Visibility controls to filter element types
- Explore webpages in a completely new way

## Usage

1. Navigate to any webpage you want to view in 3D
2. Click the 3DOM icon in your Chrome toolbar
3. The extension will scan the webpage and open a new tab with the bird's-eye city view
4. Click and drag to pan, scroll to zoom
5. Use the visibility controls (top-right) to filter element types
6. Click on links to navigate, click on buttons to see interactions

## Navigation

- **Pan:** Click and drag to move around the city
- **Zoom:** Mouse wheel to zoom in/out
- **Click:** Click on links to navigate, interact with buttons and forms
- **Visibility:** Use top-right panel to show/hide element types
```

**Step 2: Commit**

```bash
cd ~/Documents/General_project/3dom
git add README.md
git commit -m "docs: update README for city view feature

Update feature list and usage instructions to reflect the new bird's-eye
city view instead of first-person museum experience.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Success Criteria Verification

Before marking this plan complete, verify all success criteria from the design document:

- [ ] Users can view any webpage as a city from above
- [ ] Element positions match actual webpage layout
- [ ] Z-index heights are visually clear and accurate
- [ ] All interactive elements work as specified
- [ ] Visibility controls filter elements correctly
- [ ] Smooth 60fps navigation with pan/zoom
- [ ] Links navigate to new pages and rebuild scene
- [ ] Glass-like transparency shows layering clearly

## Notes

- This plan focuses on core functionality first, then adds interactions and polish
- Some advanced features (LOD system, dropdown floating bridge) can be enhanced later
- Performance should be monitored during testing
- Consider adding keyboard shortcuts for common actions in future iterations

## Future Enhancements

Not in this plan, but could be added later:
- Floating bridge for dropdown options (currently just shines like button)
- Advanced LOD system for better performance with many elements
- Keyboard shortcuts for navigation
- Export city as image/screenshot
- Different color schemes or themes
- Animation when loading page (shapes rising from ground)
