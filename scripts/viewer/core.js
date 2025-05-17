/**
 * 3DOM - Core Module
 * Handles core functionality and initialization
 */

// Main variables
let scene, camera, renderer, controls;
let domElements = [];
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let moveUp = false;
let moveDown = false;
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();
let prevTime = performance.now();
let movementSpeed = 100.0;

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

  updateLoadingStatus("Building museum environment...");

  // Once scene is ready, update the entrance gate with website info
  updateEntranceGate(domData);

  updateLoadingStatus("Creating exhibits...");
  // Create DOM elements
  createDOMElements(domData);

  updateLoadingStatus("Setting up controls...");
  // Set up animation and controls
  animate();
  setupControls();

  // Display initial speed
  updateSpeedDisplay();

  // Add website info panel
  addWebsiteInfoPanel(domData);

  // Remove loading screen
  updateLoadingStatus("Ready!");
  setTimeout(() => {
    document.querySelector(".loading").style.display = "none";
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

// Function to update speed display
function updateSpeedDisplay() {
  // Create or update speed display
  let speedDisplay = document.getElementById("speed-display");
  if (!speedDisplay) {
    speedDisplay = document.createElement("div");
    speedDisplay.id = "speed-display";
    speedDisplay.style.position = "fixed";
    speedDisplay.style.bottom = "10px";
    speedDisplay.style.right = "10px";
    speedDisplay.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
    speedDisplay.style.color = "white";
    speedDisplay.style.padding = "5px 10px";
    speedDisplay.style.borderRadius = "5px";
    speedDisplay.style.fontFamily = "Arial, sans-serif";
    speedDisplay.style.zIndex = "1000";
    document.body.appendChild(speedDisplay);
  }

  speedDisplay.textContent = `Speed: ${movementSpeed.toFixed(1)}`;
}

// Initialize the 3D scene
function initScene() {
  // Create scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x121212);
  scene.fog = new THREE.Fog(0x121212, 50, 1000);

  // Create camera with adjusted near plane to reduce clipping
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.5,
    2000
  );
  camera.position.set(0, 5, 50);

  // Create renderer with optimized settings
  renderer = new THREE.WebGLRenderer({
    antialias: false,
    precision: "mediump",
    powerPreference: "high-performance",
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.BasicShadowMap;
  document.getElementById("viewer-container").appendChild(renderer.domElement);

  // Create controls
  controls = new THREE.PointerLockControls(camera, document.body);

  // Add basic lighting - simplified for performance
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  // Use a single directional light for better performance
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(0, 100, 0);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 1024;
  directionalLight.shadow.mapSize.height = 1024;
  directionalLight.shadow.camera.far = 500;
  scene.add(directionalLight);

  // Add a ground plane
  const groundGeometry = new THREE.PlaneGeometry(5000, 5000);
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x333333,
    roughness: 0.8,
    metalness: 0.2,
  });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.5;
  ground.receiveShadow = true;
  scene.add(ground);

  // Add website entrance gate
  createEntranceGate();

  // Handle window resize
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

// Animation loop
function animate() {
  requestAnimationFrame(animate);

  if (controls.isLocked) {
    const time = performance.now();
    const delta = (time - prevTime) / 1000;

    // Apply drag to slow down
    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;
    velocity.y -= velocity.y * 10.0 * delta;

    // Set direction based on controls
    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize();

    // Move in the correct direction
    if (moveForward || moveBackward)
      velocity.z -= direction.z * movementSpeed * delta;
    if (moveLeft || moveRight)
      velocity.x -= direction.x * movementSpeed * delta;

    // Handle flying controls
    if (moveUp) {
      velocity.y += movementSpeed * delta * 2;
    }
    if (moveDown) {
      velocity.y -= movementSpeed * delta * 2;
    }

    // Update controls for horizontal movement
    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);

    // Update camera position for vertical movement
    camera.position.y += velocity.y * delta;

    // Apply level of detail management
    updateLevelOfDetail();

    prevTime = time;
  }

  renderer.render(scene, camera);
}

// Function to update level of detail for objects based on distance from camera
function updateLevelOfDetail() {
  // Get camera position
  const cameraPosition = camera.position.clone();

  // Define LOD thresholds
  const NEAR_THRESHOLD = 20;
  const MID_THRESHOLD = 50;
  const FAR_THRESHOLD = 100;

  // Check each DOM element in the scene
  for (let i = 0; i < domElements.length; i++) {
    const element = domElements[i];
    if (!element || !element.object) continue;

    // Calculate distance to camera
    const distance = cameraPosition.distanceTo(element.object.position);

    // Apply LOD based on distance
    if (distance < NEAR_THRESHOLD) {
      // Near objects - full detail
      if (element.detailLevel !== "high") {
        element.detailLevel = "high";
        if (element.highDetailParts) {
          element.highDetailParts.forEach((part) => {
            if (part) part.visible = true;
          });
        }
      }
    } else if (distance < MID_THRESHOLD) {
      // Medium distance - medium detail
      if (element.detailLevel !== "medium") {
        element.detailLevel = "medium";
        if (element.highDetailParts) {
          element.highDetailParts.forEach((part) => {
            if (part) part.visible = false;
          });
        }
      }
    } else if (distance < FAR_THRESHOLD) {
      // Far objects - low detail but still visible
      if (element.detailLevel !== "low") {
        element.detailLevel = "low";
      }
    } else {
      // Very far objects - may be culled entirely
      if (element.object.visible) {
        element.object.visible = false;
      }
    }
  }
}

// Set up controls and event listeners
function setupControls() {
  // Pointer lock event listeners
  const element = document.body;

  element.addEventListener("click", () => {
    controls.lock();
  });

  controls.addEventListener("lock", () => {
    console.log("Controls locked");
  });

  controls.addEventListener("unlock", () => {
    console.log("Controls unlocked");
  });

  // Keyboard controls
  const onKeyDown = function (event) {
    switch (event.code) {
      case "KeyW":
      case "ArrowUp":
        moveForward = true;
        break;
      case "KeyA":
      case "ArrowLeft":
        moveLeft = true;
        break;
      case "KeyS":
      case "ArrowDown":
        moveBackward = true;
        break;
      case "KeyD":
      case "ArrowRight":
        moveRight = true;
        break;
      case "Space": // Space to fly up
        moveUp = true;
        break;
      case "ShiftLeft": // Shift to fly down
      case "ShiftRight":
        moveDown = true;
        break;
      case "Equal": // Plus key
        if (event.ctrlKey) {
          event.preventDefault();
          movementSpeed += 5.0;
          updateSpeedDisplay();
        }
        break;
      case "Minus": // Minus key
        if (event.ctrlKey) {
          event.preventDefault();
          movementSpeed = Math.max(5.0, movementSpeed - 5.0);
          updateSpeedDisplay();
        }
        break;
    }
  };

  const onKeyUp = function (event) {
    switch (event.code) {
      case "KeyW":
      case "ArrowUp":
        moveForward = false;
        break;
      case "KeyA":
      case "ArrowLeft":
        moveLeft = false;
        break;
      case "KeyS":
      case "ArrowDown":
        moveBackward = false;
        break;
      case "KeyD":
      case "ArrowRight":
        moveRight = false;
        break;
      case "Space":
        moveUp = false;
        break;
      case "ShiftLeft":
      case "ShiftRight":
        moveDown = false;
        break;
    }
  };

  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);
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
      WASD: Move horizontally<br>
      Space: Fly up, Shift: Fly down<br>
      Mouse: Look around<br>
      Ctrl+/-: Adjust speed
    </p>
  `;

  document.body.appendChild(infoPanel);
}
