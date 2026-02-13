/**
 * 3DOM - Core Module
 * Handles core functionality and initialization
 */

// Main variables
let scene, camera, renderer;
let domElements = [];

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

  // Create pan/zoom controls
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

// Set up pan/zoom controls for top-down view
function setupPanZoomControls() {
  const canvas = renderer.domElement;
  let isDragging = false;
  let previousMousePosition = { x: 0, y: 0 };
  let cameraTarget = { x: 0, z: 0 };

  // Mouse down - start dragging
  canvas.addEventListener('mousedown', (event) => {
    isDragging = true;
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
  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();

    // Zoom by adjusting camera height
    const zoomSpeed = 5;
    const delta = event.deltaY > 0 ? zoomSpeed : -zoomSpeed;

    // Clamp camera height between min and max
    const newHeight = Math.max(20, Math.min(200, camera.position.y + delta));
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
