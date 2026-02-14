/**
 * 3DOM - Core Module
 * Handles core functionality and initialization
 */

// Main variables
let scene, camera, renderer;
let domElements = [];

// Track if scene is initialized
let sceneInitialized = false;

// Cache zoom display element
let zoomDisplayElement = null;

// Raycasting for interaction
let raycaster = null;
let mouse = new THREE.Vector2();
let hoveredElement = null;
let clickHandlerInitialized = false;
let focusedInput = null;
let visibilityControlsInitialized = false;

// Camera height constants (increased for larger scene)
const MIN_CAMERA_HEIGHT = 25;
const MAX_CAMERA_HEIGHT = 1000;

// Hover effect constants
const HOVER_OPACITY_INCREASE = 0.2;

// Animation constants
const PULSE_DURATION = 300;
const GLOW_DURATION = 500;
const PULSE_MAX_INTENSITY = 0.5;
const GLOW_MAX_INTENSITY = 1.0;
const INPUT_FOCUS_INTENSITY = 0.8;
const INPUT_FOCUS_COLOR = 0x00ffff;

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  console.log("3DOM Viewer: Initializing...");
  updateLoadingStatus("Requesting page data...");

  // Check if we're in loading mode from URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const isLoading = urlParams.get("loading") === "true";

  // Set up listener for messages from background script
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.action === "domDataReady" && message.data) {
      console.log("3DOM Viewer: DOM data received directly");
      updateLoadingStatus("Processing DOM data...");
      processReceivedData(message.data);
      sendResponse({ status: "processing" });
      return true;
    }

    if (message.action === "scanError") {
      console.error("3DOM Viewer: Error during scanning:", message.error);
      updateLoadingStatus(`Error: ${message.error}. Please try again.`, true);
      sendResponse({ status: "error_acknowledged" });
      return true;
    }
  });

  // If not loading mode, request data immediately
  if (!isLoading) {
    requestDOMData();
  } else {
    updateLoadingStatus("Waiting for page scan to complete...");
  }
});

// Function to request DOM data from background script
function requestDOMData() {
  // Get DOM data from background script
  chrome.runtime.sendMessage({ action: "requestDOMData" }, function (response) {
    if (response && response.status === "success" && response.data) {
      console.log("3DOM Viewer: DOM data received via request");
      processReceivedData(response.data);
    } else {
      console.error("3DOM Viewer: No DOM data found in background script");
      updateLoadingStatus(
        "Error: No webpage data found. Please try scanning the page again.",
        true
      );
    }
  });
}

// Process the received DOM data
function processReceivedData(domData) {
  updateLoadingStatus("Processing DOM data...");

  // Initialize scene first
  initScene();

  updateLoadingStatus("Building city environment...");

  // Initialize city (ground and districts)
  initCityScene(domData);

  updateLoadingStatus("Creating element shapes...");

  // Create element shapes
  domElements = createCityElements(domData);

  updateLoadingStatus("Setting up controls...");

  // Position camera based on user's scroll position
  if (domData.pageMetrics && window.cityData) {
    const scrollX = domData.pageMetrics.scrollX || 0;
    const scrollY = domData.pageMetrics.scrollY || 0;
    const scale = window.cityData.scale;

    // Convert scroll position to 3D coordinates
    const pageWidth = domData.pageMetrics.width;
    const pageHeight = domData.pageMetrics.height;

    // Calculate center of viewport in page coordinates
    const viewportCenterX = scrollX + (window.innerWidth / 2);
    const viewportCenterY = scrollY + (window.innerHeight / 2);

    // Convert to 3D scene coordinates
    const sceneCenterX = (viewportCenterX * scale) - (pageWidth * scale) / 2;
    const sceneCenterZ = (viewportCenterY * scale) - (pageHeight * scale) / 2;

    // Position camera directly above the scroll position for top-down view
    const cameraHeight = 400; // Height above the scene
    camera.position.set(sceneCenterX, cameraHeight, sceneCenterZ);
    camera.lookAt(sceneCenterX, 0, sceneCenterZ);

    console.log('3DOM Core: Positioned camera at scroll position:', {scrollX, scrollY, sceneCenterX, sceneCenterZ, cameraHeight});
  }

  // Set up animation
  animate();

  // Display zoom level
  updateZoomDisplay(camera.position.y);

  // Log scene info for debugging
  console.log('3DOM Core: Scene initialized with', domElements.length, 'elements');
  console.log('3DOM Core: Camera at height:', camera.position.y, 'viewSize:', 400);

  // Add website info panel
  addWebsiteInfoPanel(domData);

  // Setup visibility controls
  setupVisibilityControls();

  // Remove loading screen
  updateLoadingStatus("Ready!");
  setTimeout(() => {
    const loadingEl = document.querySelector(".loading");
    if (loadingEl) loadingEl.style.display = "none";
  }, 500);
}

// Update loading status
function updateLoadingStatus(message, isError = false) {
  const statusElement = document.getElementById("loading-status");
  if (statusElement) {
    statusElement.textContent = message;
    if (isError) {
      statusElement.style.color = "#e74c3c";
      document.querySelector(".loading-message").textContent = "Failed to load";
    }
  }
}


// Initialize the 3D scene
function initScene() {
  // Prevent re-initialization
  if (sceneInitialized) {
    console.warn('3DOM Core: Scene already initialized');
    return;
  }
  sceneInitialized = true;

  // Create scene
  scene = new THREE.Scene();
  window.scene = scene; // Expose globally for city.js and elements.js
  scene.background = new THREE.Color(0x1a1a1a); // Darker background for city view
  scene.fog = null; // Remove fog for top-down view

  // Create perspective camera for 3D view with depth perception
  const aspect = window.innerWidth / window.innerHeight;
  camera = new THREE.PerspectiveCamera(
    60,     // Field of view
    aspect, // Aspect ratio
    0.1,    // Near plane
    5000    // Far plane
  );

  // Position camera at an angle for better 3D perspective
  camera.position.set(600, 500, 600); // Angled view from corner
  camera.lookAt(0, 0, 0);

  // Create renderer with optimized settings
  renderer = new THREE.WebGLRenderer({
    antialias: false,
    precision: 'mediump',
    powerPreference: 'high-performance',
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true; // Enable shadows for 3D depth
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.getElementById('viewer-container').appendChild(renderer.domElement);

  // Enhanced lighting for 3D perspective with shadows
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4); // Reduced for better shadows
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(500, 1000, 500); // Angled from above
  directionalLight.castShadow = true;

  // Shadow camera settings for better quality
  directionalLight.shadow.camera.left = -1000;
  directionalLight.shadow.camera.right = 1000;
  directionalLight.shadow.camera.top = 1000;
  directionalLight.shadow.camera.bottom = -1000;
  directionalLight.shadow.camera.near = 0.1;
  directionalLight.shadow.camera.far = 3000;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;

  scene.add(directionalLight);

  // Add a second fill light for better illumination
  const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
  fillLight.position.set(-500, 800, -500);
  scene.add(fillLight);

  // Handle window resize
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // Initialize raycaster for interaction
  raycaster = new THREE.Raycaster();

  // Create pan/zoom controls
  setupPanZoomControls();

  // Setup keyboard controls for WASD movement
  setupKeyboardControls();

  // Setup click handler after controls
  setupClickHandler();
}

// Set up pan/zoom controls for top-down view
function setupPanZoomControls() {
  const canvas = renderer.domElement;
  let isDragging = false;
  let hasDragged = false;
  let previousMousePosition = { x: 0, y: 0 };
  let cameraTarget = { x: 0, z: 0 };

  // Mouse down - start dragging
  canvas.addEventListener('mousedown', (event) => {
    isDragging = true;
    hasDragged = false;
    previousMousePosition = {
      x: event.clientX,
      y: event.clientY
    };
  });

  // Mouse move - pan camera
  canvas.addEventListener('mousemove', (event) => {
    if (!isDragging) return;

    const deltaX = event.clientX - previousMousePosition.x;
    const deltaY = event.clientY - previousMousePosition.y;

    // Mark that we've actually dragged
    hasDragged = true;

    // Pan speed based on camera height (zoom level)
    const panSpeed = camera.position.y / 1000; // Adaptive to zoom
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
    // Reset drag flag so subsequent clicks work
    hasDragged = false;
  });

  // Make hasDragged accessible to click handler
  canvas.hasDragged = () => hasDragged;

  // Mouse wheel - zoom
  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();

    // Zoom by adjusting camera height
    const zoomSpeed = 5;
    const delta = event.deltaY > 0 ? zoomSpeed : -zoomSpeed;

    // Clamp camera height between min and max
    const newHeight = Math.max(MIN_CAMERA_HEIGHT, Math.min(MAX_CAMERA_HEIGHT, camera.position.y + delta));
    camera.position.y = newHeight;

    // Update zoom level display
    updateZoomDisplay(newHeight);
  });

  // Initialize camera target
  cameraTarget.x = camera.position.x;
  cameraTarget.z = camera.position.z;
}

// Set up keyboard controls for WASD movement
function setupKeyboardControls() {
  const keysPressed = {};
  const moveSpeed = 10; // Units per frame

  // Track which keys are pressed
  document.addEventListener('keydown', (event) => {
    // Don't capture keyboard if user is typing in input field
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
      return;
    }

    const key = event.key.toLowerCase();
    if (['w', 'a', 's', 'd', ' ', 'shift'].includes(key)) {
      event.preventDefault();
      keysPressed[key] = true;
    }
  });

  document.addEventListener('keyup', (event) => {
    const key = event.key.toLowerCase();
    if (['w', 'a', 's', 'd', ' ', 'shift'].includes(key)) {
      keysPressed[key] = false;
    }
  });

  // Apply movement in animation loop
  function applyKeyboardMovement() {
    // Get camera's forward and right vectors
    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();

    // For perspective camera, get actual forward direction
    camera.getWorldDirection(forward);
    forward.y = 0; // Keep movement on horizontal plane
    forward.normalize();

    // Right is perpendicular to forward
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    // Apply WASD movement
    if (keysPressed['w']) {
      camera.position.add(forward.multiplyScalar(moveSpeed));
    }
    if (keysPressed['s']) {
      camera.position.add(forward.multiplyScalar(-moveSpeed));
    }
    if (keysPressed['a']) {
      camera.position.add(right.multiplyScalar(-moveSpeed));
    }
    if (keysPressed['d']) {
      camera.position.add(right.multiplyScalar(moveSpeed));
    }

    // Space to fly up, Shift to fly down
    if (keysPressed[' ']) {
      camera.position.y = Math.min(camera.position.y + moveSpeed, MAX_CAMERA_HEIGHT);
    }
    if (keysPressed['shift']) {
      camera.position.y = Math.max(camera.position.y - moveSpeed, MIN_CAMERA_HEIGHT);
    }
  }

  // Store the function globally so animation loop can call it
  window.applyKeyboardMovement = applyKeyboardMovement;
}

// Update zoom level display
function updateZoomDisplay(height) {
  if (!zoomDisplayElement) {
    zoomDisplayElement = document.createElement('div');
    zoomDisplayElement.id = 'zoom-display';
    zoomDisplayElement.style.position = 'fixed';
    zoomDisplayElement.style.bottom = '10px';
    zoomDisplayElement.style.right = '10px';
    zoomDisplayElement.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    zoomDisplayElement.style.color = 'white';
    zoomDisplayElement.style.padding = '5px 10px';
    zoomDisplayElement.style.borderRadius = '5px';
    zoomDisplayElement.style.fontFamily = 'Arial, sans-serif';
    zoomDisplayElement.style.zIndex = '1000';
    zoomDisplayElement.style.fontSize = '12px';
    document.body.appendChild(zoomDisplayElement);
  }

  const zoomPercent = Math.round((MAX_CAMERA_HEIGHT - height) / (MAX_CAMERA_HEIGHT - MIN_CAMERA_HEIGHT) * 100);
  zoomDisplayElement.textContent = `Zoom: ${zoomPercent}%`;
}

// Animation loop
function animate() {
  requestAnimationFrame(animate);

  // Apply keyboard movement if function is available
  if (window.applyKeyboardMovement) {
    window.applyKeyboardMovement();
  }

  renderer.render(scene, camera);
}

// Add website info panel
function addWebsiteInfoPanel(domData) {
  if (!domData || !domData.pageMetrics) return;

  const infoPanel = document.createElement("div");
  infoPanel.style.position = "fixed";
  infoPanel.style.top = "10px";
  infoPanel.style.left = "10px";
  infoPanel.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
  infoPanel.style.color = "white";
  infoPanel.style.padding = "10px";
  infoPanel.style.borderRadius = "5px";
  infoPanel.style.fontFamily = "Arial, sans-serif";
  infoPanel.style.zIndex = "1000";
  infoPanel.style.fontSize = "12px";
  infoPanel.style.maxWidth = "300px";

  // Add website info
  infoPanel.innerHTML = `
    <h3 style="margin: 0 0 5px 0;">${
      domData.pageMetrics.title || "Website"
    }</h3>
    <p style="margin: 0 0 5px 0;">${domData.pageMetrics.url || ""}</p>
    <p style="margin: 0;">Elements: ${domData.elements.length}</p>
    <p style="margin: 5px 0 0 0; font-size: 10px;">
      Click + Drag: Pan view<br>
      Mouse Wheel: Zoom in/out<br>
      Click element: View details
    </p>
  `;

  document.body.appendChild(infoPanel);
}

// Set up click and hover handlers for raycasting
function setupClickHandler() {
  // Prevent duplicate initialization
  if (clickHandlerInitialized) {
    console.warn('3DOM Core: Click handler already initialized');
    return;
  }
  clickHandlerInitialized = true;

  const canvas = renderer.domElement;

  // Click detection
  canvas.addEventListener('click', (event) => {
    // Ignore clicks that follow a drag
    if (canvas.hasDragged && canvas.hasDragged()) {
      return;
    }

    // Calculate mouse position in normalized device coordinates
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Update raycaster
    raycaster.setFromCamera(mouse, camera);

    // Check intersections with domElements (filter out invalid objects)
    if (domElements && domElements.length > 0) {
      const validElements = domElements.filter(el => el && el.geometry && el.material && el.visible);
      if (validElements.length > 0) {
        const intersects = raycaster.intersectObjects(validElements, true);

        if (intersects.length > 0) {
          const clickedObject = intersects[0].object;
          handleElementClick(clickedObject);
        }
      }
    }
  });

  // Hover detection
  canvas.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    if (domElements && domElements.length > 0) {
      const validElements = domElements.filter(el => el && el.geometry && el.material && el.visible);
      if (validElements.length > 0) {
        const intersects = raycaster.intersectObjects(validElements, true);

        if (intersects.length > 0) {
          const object = intersects[0].object;
          handleElementHover(object);
          canvas.style.cursor = 'pointer';
        } else {
          clearHoverEffects();
          canvas.style.cursor = 'default';
        }
      }
    }
  });
}

// Handle element click
function handleElementClick(object) {
  // Find the root element group (with scene boundary check)
  let element = object;
  while (element.parent && element.parent !== scene && !element.userData.domElement) {
    element = element.parent;
  }

  if (element.userData && element.userData.domElement) {
    const domElement = element.userData.domElement;
    console.log('3DOM Core: Clicked element', domElement);

    // Handle different element types
    switch (domElement.tagName) {
      case 'A':
        handleLinkClick(element, domElement);
        break;
      case 'BUTTON':
        handleButtonClick(element);
        break;
      case 'INPUT':
      case 'TEXTAREA':
        handleInputClick(element);
        break;
      case 'SELECT':
        handleSelectClick(element, domElement);
        break;
      default:
        console.log('3DOM Core: Non-interactive element clicked');
    }
  }
}

// Handle link click
function handleLinkClick(element, domElement) {
  console.log('3DOM Core: Link clicked ->', domElement.href || 'no href');
  // Pulse animation (brief highlight)
  animatePulse(element);
}

// Handle button click
function handleButtonClick(element) {
  console.log('3DOM Core: Button clicked');
  // Glow/shine effect with 500ms fade
  animateGlow(element, 500);
}

// Handle input click
function handleInputClick(element) {
  console.log('3DOM Core: Input clicked');
  // Clear previous focus (validate element still exists in scene)
  if (focusedInput && focusedInput !== element && focusedInput.parent) {
    clearInputFocus(focusedInput);
  }
  // Apply glowing border
  applyInputFocus(element);
  focusedInput = element;
}

// Handle select click
function handleSelectClick(_element, domElement) {
  console.log('3DOM Core: Select clicked');
  // Placeholder for future floating bridge implementation
  // For now, just log the options
  if (domElement.options) {
    console.log('3DOM Core: Select has', domElement.options.length, 'options');
  }
}

// Animation helper: pulse effect for links
function animatePulse(element) {
  // Brief pulse: increase emissive intensity and fade back
  const startTime = performance.now();

  element.traverse((child) => {
    if (child.material && child.material.emissive && 'emissiveIntensity' in child.material) {
      // Prevent overlapping animations
      if (child.userData.isAnimating) {
        // Cancel existing animation
        if (child.userData.animationId) {
          cancelAnimationFrame(child.userData.animationId);
        }
      }

      child.userData.isAnimating = true;
      const originalIntensity = child.material.emissiveIntensity || 0;

      const animate = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / PULSE_DURATION, 1);

        // Pulse: go up then down (sine wave)
        const intensity = Math.sin(progress * Math.PI) * PULSE_MAX_INTENSITY;
        child.material.emissiveIntensity = originalIntensity + intensity;

        if (progress < 1) {
          child.userData.animationId = requestAnimationFrame(animate);
        } else {
          child.material.emissiveIntensity = originalIntensity;
          child.userData.isAnimating = false;
          if (child.userData.animationId) {
            delete child.userData.animationId;
          }
        }
      };
      animate();
    }
  });
}

// Animation helper: glow effect for buttons
function animateGlow(element, duration) {
  // Glow effect: bright emissive that fades to 0
  const startTime = performance.now();

  element.traverse((child) => {
    if (child.material && child.material.emissive && 'emissiveIntensity' in child.material) {
      // Prevent overlapping animations
      if (child.userData.isAnimating) {
        // Cancel existing animation
        if (child.userData.animationId) {
          cancelAnimationFrame(child.userData.animationId);
        }
      }

      child.userData.isAnimating = true;
      const originalIntensity = child.material.emissiveIntensity || 0;

      const animate = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Fade from GLOW_MAX_INTENSITY to original
        const intensity = GLOW_MAX_INTENSITY * (1 - progress) + originalIntensity * progress;
        child.material.emissiveIntensity = intensity;

        if (progress < 1) {
          child.userData.animationId = requestAnimationFrame(animate);
        } else {
          child.material.emissiveIntensity = originalIntensity;
          child.userData.isAnimating = false;
          if (child.userData.animationId) {
            delete child.userData.animationId;
          }
        }
      };
      animate();
    }
  });
}

// Apply focus effect to input elements
function applyInputFocus(element) {
  // Create glowing border effect using emissive
  element.traverse((child) => {
    if (child.material && child.material.emissive && 'emissiveIntensity' in child.material) {
      child.userData.inputFocused = true;
      child.userData.originalEmissiveIntensity = child.material.emissiveIntensity || 0;
      child.userData.originalEmissiveColor = child.material.emissive.clone();
      child.material.emissiveIntensity = INPUT_FOCUS_INTENSITY;
      child.material.emissive.setHex(INPUT_FOCUS_COLOR);
    }
  });
}

// Clear focus effect from input elements
function clearInputFocus(element) {
  // Remove glowing border
  element.traverse((child) => {
    if (child.material && child.userData.inputFocused && 'emissiveIntensity' in child.material) {
      child.material.emissiveIntensity = child.userData.originalEmissiveIntensity || 0;
      if (child.userData.originalEmissiveColor) {
        child.material.emissive.copy(child.userData.originalEmissiveColor);
      } else {
        child.material.emissive.setHex(0x000000); // Reset to black
      }
      delete child.userData.inputFocused;
      delete child.userData.originalEmissiveIntensity;
      delete child.userData.originalEmissiveColor;
    }
  });
}

// Handle element hover
function handleElementHover(object) {
  // Find the root element group (with scene boundary check)
  let element = object;
  while (element.parent && element.parent !== scene && !element.userData.domElement) {
    element = element.parent;
  }

  // Only apply hover to interactive elements
  if (element.userData && element.userData.domElement) {
    const domElement = element.userData.domElement;
    const isInteractive = ['A', 'BUTTON', 'INPUT', 'TEXTAREA', 'SELECT'].includes(domElement.tagName);

    if (isInteractive && element !== hoveredElement) {
      clearHoverEffects();
      hoveredElement = element;

      // Increase opacity for hover effect
      element.traverse((child) => {
        if (child.material && child.material.opacity !== undefined) {
          child.userData.originalOpacity = child.material.opacity;
          child.userData.originalTransparent = child.material.transparent;
          child.material.transparent = true;
          child.material.opacity = Math.min(1.0, child.material.opacity + HOVER_OPACITY_INCREASE);
        }
      });
    } else if (!isInteractive) {
      // Clear hover effects when moving to non-interactive elements
      clearHoverEffects();
    }
  }
}

// Clear hover effects
function clearHoverEffects() {
  if (hoveredElement) {
    hoveredElement.traverse((child) => {
      if (child.material && child.userData.originalOpacity !== undefined) {
        child.material.opacity = child.userData.originalOpacity;
        delete child.userData.originalOpacity;
      }
      if (child.material && child.userData.originalTransparent !== undefined) {
        child.material.transparent = child.userData.originalTransparent;
        delete child.userData.originalTransparent;
      }
    });
    hoveredElement = null;
  }
}

// Helper function to classify DIV elements
function classifyDIV(el) {
  const hasText = el.textContent && el.textContent.trim().length > 0;
  const hasContainerClass = el.classList && (
    el.classList.contains('container') ||
    el.classList.contains('wrapper') ||
    el.classList.contains('section')
  );

  return {
    isTextDiv: hasText && !hasContainerClass,
    isContainerDiv: !hasText || hasContainerClass
  };
}

// Visibility control management
function setupVisibilityControls(retryCount = 0) {
  const MAX_RETRIES = 50; // 5 seconds max

  // Prevent duplicate initialization
  if (visibilityControlsInitialized) {
    console.warn('3DOM Core: Visibility controls already initialized');
    return;
  }
  // Wait for DOM to be ready
  if (!document.getElementById('toggle-headers')) {
    if (retryCount >= MAX_RETRIES) {
      console.error('3DOM Core: Visibility controls not found after maximum retries');
      return;
    }
    console.warn(`3DOM Core: Visibility controls not found, retrying... (${retryCount + 1}/${MAX_RETRIES})`);
    setTimeout(() => setupVisibilityControls(retryCount + 1), 100);
    return;
  }

  // Map checkbox IDs to element type filters
  const controlMap = {
    'toggle-headers': (el) => ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(el.tagName),
    'toggle-images': (el) => el.tagName === 'IMG',
    'toggle-text': (el) => {
      if (el.tagName === 'DIV') {
        return classifyDIV(el).isTextDiv;
      }
      return ['P', 'SPAN'].includes(el.tagName);
    },
    'toggle-links': (el) => el.tagName === 'A',
    'toggle-buttons': (el) => el.tagName === 'BUTTON',
    'toggle-forms': (el) => ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName),
    'toggle-containers': (el) => {
      if (el.tagName === 'DIV') {
        return classifyDIV(el).isContainerDiv;
      }
      return ['SECTION', 'ARTICLE'].includes(el.tagName);
    },
    'toggle-navigation': (el) => {
      if (el.tagName === 'NAV') return true;
      if (el.classList && (
        el.classList.contains('nav') ||
        el.classList.contains('navigation') ||
        el.classList.contains('navbar') ||
        el.classList.contains('menu')
      )) return true;
      return false;
    },
    'toggle-other': (el) => {
      // All other element types not covered above
      const coveredTags = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'IMG', 'P', 'SPAN', 'A', 'BUTTON', 'INPUT', 'TEXTAREA', 'SELECT', 'DIV', 'SECTION', 'ARTICLE', 'NAV'];
      return !coveredTags.includes(el.tagName);
    }
  };

  // Add change listeners to all checkboxes
  Object.keys(controlMap).forEach(checkboxId => {
    const checkbox = document.getElementById(checkboxId);
    if (checkbox) {
      checkbox.addEventListener('change', (event) => {
        updateElementVisibility(checkboxId, event.target.checked, controlMap[checkboxId]);
      });
    }
  });

  visibilityControlsInitialized = true;
  console.log('3DOM Core: Visibility controls initialized');

  // Hide text and other elements by default (since their checkboxes are unchecked)
  // This needs to run after controls are initialized
  setTimeout(() => {
    updateElementVisibility('toggle-text', false, controlMap['toggle-text']);
    updateElementVisibility('toggle-other', false, controlMap['toggle-other']);
  }, 100);
}

function updateElementVisibility(controlId, visible, filterFunction) {
  if (!domElements || domElements.length === 0) {
    console.warn('3DOM Core: No domElements to filter');
    return;
  }

  let count = 0;

  // Iterate through all 3D elements
  domElements.forEach(element3D => {
    // Get the original DOM element data
    const domElement = element3D.userData?.domElement;

    if (domElement) {
      try {
        if (filterFunction(domElement)) {
          // Set visibility on the 3D object
          element3D.visible = visible;
          count++;
        }
      } catch (error) {
        console.warn('3DOM Core: Error filtering element', error);
      }
    }
  });

  console.log(`3DOM Core: ${visible ? 'Showed' : 'Hid'} ${count} elements for ${controlId}`);
}
