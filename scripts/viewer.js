/**
 * 3DOM - 3D Viewer Script
 * Renders the 3D representation of the webpage using Three.js
 */

// Main variables
let scene, camera, renderer, controls;
let domElements = [];
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();
let prevTime = performance.now();
let movementSpeed = 20.0; // Default speed, now adjustable

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  console.log("3DOM Viewer: Initializing...");

  // Get DOM data from storage
  chrome.storage.local.get(["current3DOMData"], function (result) {
    if (result.current3DOMData) {
      console.log("3DOM Viewer: DOM data received", result.current3DOMData);
      initScene();
      createDOMElements(result.current3DOMData);
      animate();
      setupControls();

      // Display initial speed
      updateSpeedDisplay();
    } else {
      console.error("3DOM Viewer: No DOM data found");
      document.querySelector(".loading").textContent =
        "Error: No webpage data found";
    }
  });
});

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
  scene.fog = new THREE.Fog(0x121212, 10, 500);

  // Create camera
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 10, 20);

  // Create renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  document.getElementById("viewer-container").appendChild(renderer.domElement);

  // Create controls
  controls = new THREE.PointerLockControls(camera, document.body);

  // Add basic lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(0, 50, 0);
  directionalLight.castShadow = true;
  scene.add(directionalLight);

  // Add a ground plane
  const groundGeometry = new THREE.PlaneGeometry(2000, 2000);
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x333333,
    roughness: 0.8,
    metalness: 0.2,
  });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2; // Rotate to be horizontal
  ground.position.y = -10;
  ground.receiveShadow = true;
  scene.add(ground);

  // Handle window resize
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // Remove loading message
  document.querySelector(".loading").style.display = "none";
}

// Create 3D elements from DOM data
function createDOMElements(domData) {
  console.log("3DOM Viewer: Creating 3D elements...");

  // Get page metrics
  const pageWidth = domData.pageMetrics.width;
  const pageHeight = domData.pageMetrics.height;

  // Scale factor for 3D space (adjust as needed)
  const scaleX = 100 / pageWidth;
  const scaleY = 100 / pageHeight;

  // Process elements
  domData.elements.forEach((element) => {
    // Skip elements that are too small
    if (element.dimensions.width < 5 || element.dimensions.height < 5) {
      return;
    }

    // Calculate position in 3D space
    // Center the webpage and scale positions
    const x = (element.position.x - pageWidth / 2) * scaleX;
    const z = (element.position.y - pageHeight / 2) * scaleY;
    const y = 0; // Base height

    // Create different 3D representations based on element type
    let mesh;

    switch (element.type) {
      case "header":
        mesh = createHeader(element, scaleX, scaleY);
        break;
      case "navigation":
        mesh = createNavigation(element, scaleX, scaleY);
        break;
      case "interactive":
        mesh = createInteractive(element, scaleX, scaleY);
        break;
      case "image":
        mesh = createImage(element, scaleX, scaleY);
        break;
      case "text":
        // Only create text elements that are standalone (not part of another element)
        if (
          !element.textContent ||
          element.tagName === "SPAN" ||
          element.tagName === "P"
        ) {
          mesh = createText(element, scaleX, scaleY);
        }
        break;
      case "container":
        mesh = createContainer(element, scaleX, scaleY);
        break;
      default:
        mesh = createDefault(element, scaleX, scaleY);
    }

    if (mesh) {
      // Position the mesh
      mesh.position.set(x, y, z);

      // Store original DOM data with the mesh
      mesh.userData = {
        domElement: element,
        originalPosition: { x, y, z },
      };

      // Add to scene and track
      scene.add(mesh);
      domElements.push(mesh);
    }
  });

  // Add some visual separation between elements by adjusting y positions
  adjustElementHeights();
}

// Create a header element (large flag or signpost)
function createHeader(element, scaleX, scaleY) {
  const width = element.dimensions.width * scaleX;
  const height = element.dimensions.height * scaleY;
  const depth = 2;

  // Create a group for header elements
  const group = new THREE.Group();

  // Create a flagpole or signpost
  const poleGeometry = new THREE.CylinderGeometry(0.5, 0.5, 15, 8);
  const poleMaterial = new THREE.MeshStandardMaterial({
    color: 0xdddddd,
    roughness: 0.5,
    metalness: 0.8,
  });
  const pole = new THREE.Mesh(poleGeometry, poleMaterial);
  pole.position.y = 7.5; // Half the height of the pole
  pole.castShadow = true;
  group.add(pole);

  // Create a flag/sign
  const geometry = new THREE.BoxGeometry(width, depth, height);

  // Extract color from element or use default
  let color = 0x3498db; // Default blue
  if (
    element.styles.backgroundColor &&
    element.styles.backgroundColor !== "rgba(0, 0, 0, 0)"
  ) {
    color = new THREE.Color(element.styles.backgroundColor);
  }

  const material = new THREE.MeshStandardMaterial({
    color: color,
    roughness: 0.7,
    metalness: 0.3,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(width / 4, 15, 0); // Position to the side of the pole
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);

  // Add text if available
  if (element.textContent) {
    const textDiv = document.createElement("div");
    textDiv.textContent =
      element.textContent.substring(0, 25) +
      (element.textContent.length > 25 ? "..." : "");
    textDiv.style.width = "100px";
    textDiv.style.height = "auto";
    textDiv.style.color = element.styles.color || "#ffffff";
    textDiv.style.fontSize = "10px";
    textDiv.style.fontWeight = "bold";
    textDiv.style.textAlign = "center";
    textDiv.style.fontFamily = "Arial, sans-serif";
    textDiv.style.padding = "5px";

    const textTexture = new THREE.Texture();
    const textMaterial = new THREE.SpriteMaterial({ map: textTexture });
    const textSprite = new THREE.Sprite(textMaterial);
    textSprite.scale.set(5, 2.5, 1);
    textSprite.position.set(width / 4, 16, 0);
    group.add(textSprite);
  }

  return group;
}

// Create a navigation element (long connected platform)
function createNavigation(element, scaleX, scaleY) {
  const width = element.dimensions.width * scaleX;
  const height = element.dimensions.height * scaleY;
  const depth = 1.5;

  // Create a group for navigation elements
  const group = new THREE.Group();

  // Create a raised platform
  const geometry = new THREE.BoxGeometry(width, depth, height);

  // Extract color from element or use default
  let color = 0xe74c3c; // Default red for navigation
  if (
    element.styles.backgroundColor &&
    element.styles.backgroundColor !== "rgba(0, 0, 0, 0)"
  ) {
    color = new THREE.Color(element.styles.backgroundColor);
  }

  const material = new THREE.MeshStandardMaterial({
    color: color,
    roughness: 0.7,
    metalness: 0.2,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = depth / 2;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);

  // Add some railings or markers along the edge
  const railingHeight = 0.5;
  const railingGeometry = new THREE.BoxGeometry(width, railingHeight, 0.2);
  const railingMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.7,
    metalness: 0.5,
  });

  // Front railing
  const frontRailing = new THREE.Mesh(railingGeometry, railingMaterial);
  frontRailing.position.set(0, depth + railingHeight / 2, height / 2);
  group.add(frontRailing);

  // Back railing
  const backRailing = new THREE.Mesh(railingGeometry, railingMaterial);
  backRailing.position.set(0, depth + railingHeight / 2, -height / 2);
  group.add(backRailing);

  return group;
}

// Create an interactive element (button/link as a building)
function createInteractive(element, scaleX, scaleY) {
  const width = element.dimensions.width * scaleX;
  const height = element.dimensions.height * scaleY;
  const depth = element.isInteractive ? 4 : 2; // Taller for interactive elements

  // Create a group for this element
  const group = new THREE.Group();

  // Create a building
  const buildingGeometry = new THREE.BoxGeometry(width, depth, height);

  // Extract color from element or use default
  let color = 0x2ecc71; // Default green for interactive elements
  if (
    element.styles.backgroundColor &&
    element.styles.backgroundColor !== "rgba(0, 0, 0, 0)"
  ) {
    color = new THREE.Color(element.styles.backgroundColor);
  }

  const buildingMaterial = new THREE.MeshStandardMaterial({
    color: color,
    roughness: 0.7,
    metalness: 0.3,
  });

  const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
  building.position.y = depth / 2; // Half the height to sit on ground
  building.castShadow = true;
  building.receiveShadow = true;
  group.add(building);

  // If the element has text, add it as a sign on top of the building
  if (element.textContent) {
    // Add a sign on top
    const signDepth = 0.2;
    const signWidth = width * 0.8;
    const signHeight = height * 0.3;

    const signGeometry = new THREE.BoxGeometry(
      signWidth,
      signDepth,
      signHeight
    );
    const signMaterial = new THREE.MeshStandardMaterial({
      color: 0xf1c40f, // Yellow for signs
      roughness: 0.5,
      metalness: 0.2,
    });

    const sign = new THREE.Mesh(signGeometry, signMaterial);
    sign.position.set(0, depth + signDepth / 2, 0);
    sign.castShadow = true;
    group.add(sign);

    // TODO: Implement actual text rendering when supported
  }

  // If it's a button or link, add some decorative elements
  if (element.isInteractive) {
    // Add a small antenna or decoration on top
    const antennaGeometry = new THREE.CylinderGeometry(0.1, 0.1, 2, 8);
    const antennaMaterial = new THREE.MeshStandardMaterial({
      color: 0xbdc3c7,
      roughness: 0.5,
      metalness: 0.8,
    });

    const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
    antenna.position.set(width / 4, depth + 1, height / 4);
    group.add(antenna);
  }

  return group;
}

// Create an image element
function createImage(element, scaleX, scaleY) {
  const width = element.dimensions.width * scaleX;
  const height = element.dimensions.height * scaleY;
  const depth = 0.1;

  // Create a group for the image
  const group = new THREE.Group();

  // Create a billboard/screen frame
  const frameDepth = 0.5;
  const frameGeometry = new THREE.BoxGeometry(
    width + 1,
    height + 1,
    frameDepth
  );
  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0x34495e,
    roughness: 0.7,
    metalness: 0.3,
  });
  const frame = new THREE.Mesh(frameGeometry, frameMaterial);
  frame.position.y = 3 + height / 2; // Position at appropriate height
  frame.castShadow = true;
  frame.receiveShadow = true;
  group.add(frame);

  // Create a support stand
  const standGeometry = new THREE.BoxGeometry(width / 5, 3, width / 5);
  const standMaterial = new THREE.MeshStandardMaterial({
    color: 0x7f8c8d, // Gray for stand
    roughness: 0.8,
    metalness: 0.2,
  });
  const stand = new THREE.Mesh(standGeometry, standMaterial);
  stand.position.y = 1.5; // Half the height of the stand
  stand.castShadow = true;
  stand.receiveShadow = true;
  group.add(stand);

  // Create the actual image display area
  const geometry = new THREE.PlaneGeometry(width, height);

  // Determine color or use image color
  let material;
  if (element.imageData && element.imageData.src) {
    // If we wanted to load actual images, we would use THREE.TextureLoader
    // But for simplicity and performance, use a colored material
    material = new THREE.MeshStandardMaterial({
      color: 0x3498db, // Blue for image placeholder
      roughness: 0.2,
      metalness: 0.5,
      emissive: 0x1a5276,
      emissiveIntensity: 0.2,
    });
  } else {
    // Just a colored panel if no image
    const color =
      element.styles.backgroundColor !== "rgba(0, 0, 0, 0)"
        ? new THREE.Color(element.styles.backgroundColor)
        : 0x3498db;

    material = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.5,
      metalness: 0.3,
    });
  }

  const imageMesh = new THREE.Mesh(geometry, material);
  imageMesh.position.set(0, 3 + height / 2, -frameDepth / 2 - 0.05); // Position slightly in front of frame
  group.add(imageMesh);

  return group;
}

// Create a text element
function createText(element, scaleX, scaleY) {
  const width = element.dimensions.width * scaleX;
  const height = element.dimensions.height * scaleY;
  const depth = 0.2;

  // Create a simple plane to represent text
  const geometry = new THREE.PlaneGeometry(width, height);

  // Extract color or use default
  let color = 0xecf0f1; // Light color for text
  if (
    element.styles.backgroundColor &&
    element.styles.backgroundColor !== "rgba(0, 0, 0, 0)"
  ) {
    color = new THREE.Color(element.styles.backgroundColor);
  }

  const material = new THREE.MeshStandardMaterial({
    color: color,
    roughness: 0.9,
    metalness: 0.1,
    transparent: true,
    opacity: 0.8,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;

  // Make text float slightly
  mesh.position.y = 0.5;
  // Rotate to face camera
  mesh.rotation.x = -Math.PI / 2;

  return mesh;
}

// Create a container element (representing a street or block)
function createContainer(element, scaleX, scaleY) {
  const width = element.dimensions.width * scaleX;
  const height = element.dimensions.height * scaleY;
  const depth = 0.5;

  // Create a group for the street/block
  const group = new THREE.Group();

  // Create a street/block base
  const geometry = new THREE.BoxGeometry(width, depth, height);

  // Extract color or use default with texture
  let color = 0x95a5a6; // Gray for containers/streets
  if (
    element.styles.backgroundColor &&
    element.styles.backgroundColor !== "rgba(0, 0, 0, 0)"
  ) {
    color = new THREE.Color(element.styles.backgroundColor);
  }

  const material = new THREE.MeshStandardMaterial({
    color: color,
    roughness: 0.9,
    metalness: 0.1,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;

  // Position at ground level
  mesh.position.y = depth / 2;
  group.add(mesh);

  // Add street markings if it's a large container
  if (width > 20 && height > 20) {
    // Add center line if it's a wide street
    if (width > 30) {
      const centerLineGeometry = new THREE.PlaneGeometry(
        width * 0.8,
        height / 20
      );
      const centerLineMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
      });
      const centerLine = new THREE.Mesh(centerLineGeometry, centerLineMaterial);
      centerLine.rotation.x = -Math.PI / 2;
      centerLine.position.y = depth / 2 + 0.01; // Slightly above street
      group.add(centerLine);
    }

    // Add side markings for long streets
    if (height > 30) {
      const sideMarkingGeometry = new THREE.PlaneGeometry(
        width / 20,
        height * 0.8
      );
      const sideMarkingMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
      });

      // Left side
      const leftMarking = new THREE.Mesh(
        sideMarkingGeometry,
        sideMarkingMaterial
      );
      leftMarking.rotation.x = -Math.PI / 2;
      leftMarking.position.set(-width / 2 + width / 20, depth / 2 + 0.01, 0);
      group.add(leftMarking);

      // Right side
      const rightMarking = new THREE.Mesh(
        sideMarkingGeometry,
        sideMarkingMaterial
      );
      rightMarking.rotation.x = -Math.PI / 2;
      rightMarking.position.set(width / 2 - width / 20, depth / 2 + 0.01, 0);
      group.add(rightMarking);
    }
  }

  return group;
}

// Create a default element for anything else
function createDefault(element, scaleX, scaleY) {
  const width = element.dimensions.width * scaleX;
  const height = element.dimensions.height * scaleY;
  const depth = 0.1;

  // Create a simple flat surface
  const geometry = new THREE.PlaneGeometry(width, height);

  const material = new THREE.MeshStandardMaterial({
    color: 0xbdc3c7,
    roughness: 0.9,
    transparent: true,
    opacity: 0.3,
  });

  const mesh = new THREE.Mesh(geometry, material);

  // Rotate to be horizontal
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.05;

  return mesh;
}

// Adjust element heights based on their nesting and type
function adjustElementHeights() {
  // Simple algorithm to prevent z-fighting and create a more layered look

  // Sort elements by their type importance
  const typeHeightMapping = {
    header: 5,
    navigation: 4,
    interactive: 3,
    image: 2.5,
    form: 2,
    media: 1.5,
    text: 1,
    container: 0.5,
    other: 0.1,
  };

  domElements.forEach((element) => {
    if (element.userData && element.userData.domElement) {
      const elementType = element.userData.domElement.type;
      const baseHeight = typeHeightMapping[elementType] || 0;

      // Add the type-based height to the element's y position
      element.position.y += baseHeight;

      // If it's a group, adjust all children
      if (element.children && element.children.length > 0) {
        element.children.forEach((child) => {
          // Keep relative positioning within the group
          const originalY = child.position.y;
          child.position.y = originalY;
        });
      }
    }
  });
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
    }
  };

  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);
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

    // Set direction based on controls
    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize();

    // Move in the correct direction
    if (moveForward || moveBackward)
      velocity.z -= direction.z * movementSpeed * delta;
    if (moveLeft || moveRight)
      velocity.x -= direction.x * movementSpeed * delta;

    // Update controls
    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);

    prevTime = time;
  }

  // Render the scene
  renderer.render(scene, camera);
}
