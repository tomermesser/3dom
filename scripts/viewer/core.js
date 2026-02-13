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

// Camera height constants
const MIN_CAMERA_HEIGHT = 20;
const MAX_CAMERA_HEIGHT = 200;

// Hover effect constants
const HOVER_OPACITY_INCREASE = 0.2;

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  console.log("3DOM Viewer: Initializing...");
  updateLoadingStatus("Requesting page data...");

  // Check if we're in loading mode from URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const isLoading = urlParams.get("loading") === "true";

  // Set up listener for messages from background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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

  // Set up animation
  animate();

  // Display zoom level
  updateZoomDisplay(camera.position.y);

  // Add website info panel
  addWebsiteInfoPanel(domData);

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

  // Initialize raycaster for interaction
  raycaster = new THREE.Raycaster();

  // Create pan/zoom controls
  setupPanZoomControls();

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

    // Check intersections with domElements
    if (domElements && domElements.length > 0) {
      const intersects = raycaster.intersectObjects(domElements, true);

      if (intersects.length > 0) {
        const clickedObject = intersects[0].object;
        handleElementClick(clickedObject);
      }
    }
  });

  // Hover detection
  canvas.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    if (domElements && domElements.length > 0) {
      const intersects = raycaster.intersectObjects(domElements, true);

      if (intersects.length > 0) {
        const object = intersects[0].object;
        handleElementHover(object);
        canvas.style.cursor = 'pointer';
      } else {
        clearHoverEffects();
        canvas.style.cursor = 'default';
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
    console.log('3DOM Core: Clicked element', element.userData.domElement);
    // Element-specific behaviors will be added in next task
  }
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
