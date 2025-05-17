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
let moveUp = false; // Add global move up variable
let moveDown = false; // Add global move down variable
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

      // Initialize scene first
      initScene();

      // Once scene is ready, update the entrance gate with website info
      updateEntranceGate(result.current3DOMData);

      // Create DOM elements
      createDOMElements(result.current3DOMData);

      // Set up animation and controls
      animate();
      setupControls();

      // Display initial speed
      updateSpeedDisplay();

      // Add website info panel
      addWebsiteInfoPanel(result.current3DOMData);
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
  scene.fog = new THREE.Fog(0x121212, 50, 1000);

  // Create camera
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    2000
  );
  camera.position.set(0, 2, 50); // Lower starting position for better viewing

  // Create renderer with optimized settings
  renderer = new THREE.WebGLRenderer({
    antialias: false, // Disable antialiasing for performance
    precision: "mediump", // Use medium precision for better performance
    powerPreference: "high-performance",
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // Limit pixel ratio
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.BasicShadowMap; // Use basic shadow maps for performance
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
  directionalLight.shadow.mapSize.width = 1024; // Reduced shadow map size
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
  ground.rotation.x = -Math.PI / 2; // Rotate to be horizontal
  ground.position.y = -0.1; // Position just below objects to reduce z-fighting
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

  // Remove loading message
  document.querySelector(".loading").style.display = "none";
}

// Create entrance gate with website name
function createEntranceGate(domData) {
  const websiteName = domData?.pageMetrics?.title || "Welcome to 3DOM";
  const websiteUrl = domData?.pageMetrics?.url || "";

  // Create gate structure
  const gateGroup = new THREE.Group();

  // Left pillar
  const pillarGeometry = new THREE.BoxGeometry(3, 15, 3);
  const pillarMaterial = new THREE.MeshStandardMaterial({
    color: 0x808080,
    roughness: 0.6,
    metalness: 0.4,
  });

  const leftPillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
  leftPillar.position.set(-15, 7.5, 40);
  leftPillar.castShadow = true;

  // Right pillar
  const rightPillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
  rightPillar.position.set(15, 7.5, 40);
  rightPillar.castShadow = true;

  // Top bar
  const topBarGeometry = new THREE.BoxGeometry(35, 2, 2);
  const topBarMaterial = new THREE.MeshStandardMaterial({
    color: 0x606060,
    roughness: 0.5,
    metalness: 0.5,
  });

  const topBar = new THREE.Mesh(topBarGeometry, topBarMaterial);
  topBar.position.set(0, 15.5, 40);
  topBar.castShadow = true;

  // Website name sign
  const signGeometry = new THREE.BoxGeometry(30, 4, 0.5);
  const signMaterial = new THREE.MeshStandardMaterial({
    color: 0x2c3e50,
    roughness: 0.4,
    metalness: 0.3,
  });

  const sign = new THREE.Mesh(signGeometry, signMaterial);
  sign.position.set(0, 12, 40);
  sign.castShadow = true;

  // Add website name text - will add dynamic Canvas texture later

  gateGroup.add(leftPillar);
  gateGroup.add(rightPillar);
  gateGroup.add(topBar);
  gateGroup.add(sign);

  scene.add(gateGroup);

  // Store reference for later to update text
  window.entranceGate = gateGroup;
}

// Create 3D elements from DOM data
function createDOMElements(domData) {
  console.log("3DOM Viewer: Creating 3D elements...");

  // Update entrance gate with website info
  updateEntranceGate(domData);

  // Get page metrics
  const pageWidth = domData.pageMetrics.width;
  const pageHeight = domData.pageMetrics.height;

  // Scale factor for 3D space (adjust as needed)
  const scaleX = 30 / pageWidth;
  const scaleY = 30 / pageHeight;

  // MUSEUM GALLERY APPROACH

  // First, identify major sections of the page that will become rooms
  const sections = identifyPageSections(domData.elements);

  // Create the museum structure first (walls, floors, entrances)
  createMuseumStructure(domData, sections);

  // Now place elements within their corresponding museum rooms as exhibits
  createMuseumExhibits(domData, sections, scaleX, scaleY);
}

// Function to identify major sections of the page
function identifyPageSections(elements) {
  // This will return an array of section objects with their elements
  const sections = [];
  const mainContainers = [];

  // First, find all elements marked as section containers in our metadata
  const sectionContainers = elements.filter(
    (element) => element.sectionData && element.sectionData.isSectionContainer
  );

  // If we found section containers from metadata, prioritize those
  if (sectionContainers.length >= 2) {
    mainContainers.push(...sectionContainers);
  } else {
    // Otherwise, use our heuristic approach as a fallback
    elements.forEach((element) => {
      // Skip tiny elements
      if (element.dimensions.width < 20 || element.dimensions.height < 20) {
        return;
      }

      // Headers, navigation bars, and large containers are potential rooms
      if (
        element.type === "container" ||
        element.type === "navigation" ||
        element.tagName === "SECTION" ||
        element.tagName === "ARTICLE" ||
        element.tagName === "DIV"
      ) {
        // Check if it has a meaningful ID or class
        if (
          (element.id && element.id.length > 0) ||
          (element.classes && element.classes.length > 0)
        ) {
          mainContainers.push(element);
        }
        // Or if it's very large
        else if (
          element.dimensions.width > 300 &&
          element.dimensions.height > 300
        ) {
          mainContainers.push(element);
        }
      }
    });
  }

  // If we found too many containers, keep only the largest ones
  if (mainContainers.length > 10) {
    mainContainers.sort(
      (a, b) =>
        b.dimensions.width * b.dimensions.height -
        a.dimensions.width * a.dimensions.height
    );
    mainContainers.length = 10; // Keep only the 10 largest containers
  }

  // If we found too few, create a default single room
  if (mainContainers.length < 2) {
    sections.push({
      name: "Main Gallery",
      element: null,
      childElements: elements,
    });
    return sections;
  }

  // For each main container, create a section and assign child elements
  mainContainers.forEach((container) => {
    // Determine a name for this section using the sectionData if available
    let sectionName = "Gallery";

    if (container.sectionData && container.sectionData.sectionName) {
      sectionName = formatSectionName(container.sectionData.sectionName);
    } else if (container.id) {
      sectionName = formatSectionName(container.id);
    } else if (container.classes && container.classes.length > 0) {
      sectionName = formatSectionName(container.classes[0]);
    }

    // Find all elements that are visually contained in this container
    const childElements = elements.filter((element) => {
      return isVisuallyContained(element, container);
    });

    // If this section has enough elements, add it
    if (childElements.length > 3) {
      sections.push({
        name: sectionName,
        element: container,
        childElements: childElements,
        type:
          container.sectionData?.sectionType || container.type || "container",
      });
    }
  });

  // If no valid sections were created, create a default section
  if (sections.length === 0) {
    sections.push({
      name: "Main Gallery",
      element: null,
      childElements: elements,
    });
  }

  return sections;
}

// Helper function to check if an element is visually contained in a container
function isVisuallyContained(element, container) {
  // Check if element's position is within the container's boundaries
  return (
    element.position.x >= container.position.x &&
    element.position.x + element.dimensions.width <=
      container.position.x + container.dimensions.width &&
    element.position.y >= container.position.y &&
    element.position.y + element.dimensions.height <=
      container.position.y + container.dimensions.height
  );
}

// Helper function to format a section name
function formatSectionName(name) {
  // Remove common prefixes and clean up
  const cleaned = name
    .replace(/^(js-|container-|section-|main-|layout-)/g, "")
    .replace(/-/g, " ")
    .replace(/_/g, " ");

  // Capitalize words
  return (
    cleaned
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ") + " Gallery"
  );
}

// Create the main museum structure
function createMuseumStructure(domData, sections) {
  // Create museum walls and floor
  const museumGroup = new THREE.Group();

  // Create museum floor
  const floorGeometry = new THREE.PlaneGeometry(300, 300);
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0xf5f5f5,
    roughness: 0.8,
    metalness: 0.2,
  });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.1;
  floor.receiveShadow = true;
  museumGroup.add(floor);

  // Create entrance hall
  createEntranceHall(museumGroup, domData);

  // Store room positions for later use when placing exhibits
  window.museumRooms = [];

  // Calculate layout for rooms
  layoutRooms(sections, museumGroup);

  scene.add(museumGroup);
}

// Create the museum entrance hall
function createEntranceHall(museumGroup, domData) {
  const roomSize = 50;
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.9,
    metalness: 0.1,
    side: THREE.BackSide, // Render inside of the box
  });

  // Create entrance hall with information about the website
  const entranceHallGeometry = new THREE.BoxGeometry(roomSize, 12, roomSize);

  const entranceHall = new THREE.Mesh(entranceHallGeometry, wallMaterial);
  entranceHall.position.set(0, 6, 20);
  museumGroup.add(entranceHall);

  // Add welcome sign
  const websiteName = domData.pageMetrics.title || "3DOM Museum";
  const welcomeTexture = createTextTexture("Welcome to " + websiteName, {
    width: 1024,
    height: 256,
    fontColor: "#000000",
    backgroundColor: "#f0f0f0",
    fontSize: 64,
    fontWeight: "bold",
  });

  const welcomeGeometry = new THREE.PlaneGeometry(20, 5);
  const welcomeMaterial = new THREE.MeshBasicMaterial({
    map: welcomeTexture,
    side: THREE.DoubleSide,
  });

  const welcomeSign = new THREE.Mesh(welcomeGeometry, welcomeMaterial);
  welcomeSign.position.set(0, 9, -5);
  entranceHall.add(welcomeSign);

  // Add URL display
  const urlTexture = createTextTexture(domData.pageMetrics.url || "", {
    width: 1024,
    height: 128,
    fontColor: "#666666",
    backgroundColor: "rgba(240,240,240,0.8)",
    fontSize: 32,
  });

  const urlGeometry = new THREE.PlaneGeometry(25, 3);
  const urlMaterial = new THREE.MeshBasicMaterial({
    map: urlTexture,
    side: THREE.DoubleSide,
    transparent: true,
  });

  const urlSign = new THREE.Mesh(urlGeometry, urlMaterial);
  urlSign.position.set(0, 5, -5);
  entranceHall.add(urlSign);

  // Add information sign
  const infoTexture = createTextTexture(
    "This is a 3D representation of the webpage's structure. " +
      "Explore each gallery to see different sections of the page.",
    {
      width: 1024,
      height: 384,
      fontColor: "#333333",
      backgroundColor: "rgba(240,240,240,0.6)",
      fontSize: 32,
    }
  );

  const infoGeometry = new THREE.PlaneGeometry(15, 5);
  const infoMaterial = new THREE.MeshBasicMaterial({
    map: infoTexture,
    side: THREE.DoubleSide,
    transparent: true,
  });

  const infoSign = new THREE.Mesh(infoGeometry, infoMaterial);
  infoSign.position.set(-15, 5, 0);
  infoSign.rotation.y = Math.PI / 4;
  entranceHall.add(infoSign);

  // Add controls sign
  const controlsTexture = createTextTexture(
    "Controls: WASD to move, SPACE to fly up, SHIFT to fly down, Mouse to look around",
    {
      width: 1024,
      height: 256,
      fontColor: "#333333",
      backgroundColor: "rgba(240,240,240,0.6)",
      fontSize: 32,
    }
  );

  const controlsGeometry = new THREE.PlaneGeometry(15, 3);
  const controlsMaterial = new THREE.MeshBasicMaterial({
    map: controlsTexture,
    side: THREE.DoubleSide,
    transparent: true,
  });

  const controlsSign = new THREE.Mesh(controlsGeometry, controlsMaterial);
  controlsSign.position.set(15, 5, 0);
  controlsSign.rotation.y = -Math.PI / 4;
  entranceHall.add(controlsSign);
}

// Layout the museum rooms
function layoutRooms(sections, museumGroup) {
  const roomSize = 40;
  const corridorWidth = 15;
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.9,
    metalness: 0.1,
    side: THREE.BackSide, // Render inside of the box
  });

  // Create rooms for each section
  sections.forEach((section, index) => {
    // Calculate room position in a grid, circle, or linear layout
    let x, z;
    const numRooms = sections.length;

    // Choose layout based on number of sections
    if (numRooms <= 1) {
      // Single room, put behind entrance
      x = 0;
      z = 100;
    } else if (numRooms <= 6) {
      // Circle layout for 6 or fewer rooms
      const radius = roomSize + corridorWidth;
      const angle = (index / numRooms) * Math.PI * 2;
      x = Math.sin(angle) * radius;
      z = Math.cos(angle) * radius + 80; // Offset to put entrance hall at front
    } else {
      // Grid layout for more rooms
      const roomsPerRow = Math.ceil(Math.sqrt(numRooms));
      const row = Math.floor(index / roomsPerRow);
      const col = index % roomsPerRow;
      x = (col - Math.floor(roomsPerRow / 2)) * (roomSize + corridorWidth);
      z = row * (roomSize + corridorWidth) + 80; // First row behind entrance
    }

    // Determine room style based on section type
    let roomHeight, roomColor, roomTexture;

    switch (section.type) {
      case "header":
        roomHeight = 15; // Taller room for headers
        roomColor = 0xf0e9d2; // Warm color for headers
        break;
      case "nav":
      case "navigation":
        roomHeight = 10;
        roomColor = 0xe3f2fd; // Light blue for navigation
        break;
      case "article":
        roomHeight = 12;
        roomColor = 0xffffff; // Clean white for articles
        break;
      case "aside":
        roomHeight = 8;
        roomColor = 0xf5f5f5; // Light gray for asides
        break;
      case "footer":
        roomHeight = 8;
        roomColor = 0xeeeeee; // Light gray for footer
        break;
      default:
        roomHeight = 10;
        roomColor = 0xffffff; // Default white
    }

    // Create custom wall material for this room type
    const customWallMaterial = new THREE.MeshStandardMaterial({
      color: roomColor,
      roughness: 0.9,
      metalness: 0.1,
      side: THREE.BackSide,
    });

    // Create room with custom height and color
    const roomGeometry = new THREE.BoxGeometry(roomSize, roomHeight, roomSize);
    const room = new THREE.Mesh(roomGeometry, customWallMaterial);
    room.position.set(x, roomHeight / 2, z);

    // Add room index for efficient reference in LOD system
    room.userData.roomIndex = index;

    museumGroup.add(room);

    // Create decorative pedestal or floor texture
    createRoomFloor(museumGroup, x, z, roomSize, section.type);

    // Create corridor connecting to entrance hall
    if (numRooms > 1) {
      createCorridor(museumGroup, x, z, roomSize, section.type);
    }

    // Create door/entrance to the room
    const doorGeometry = new THREE.BoxGeometry(5, 7, 0.5);
    const doorMaterial = new THREE.MeshStandardMaterial({
      color: selectDoorColor(section.type),
      roughness: 0.7,
      metalness: 0.3,
    });
    const door = new THREE.Mesh(doorGeometry, doorMaterial);

    // Position door on the appropriate wall facing the entrance hall
    const doorDirection = calculateDoorDirection(x, z);
    const { doorX, doorZ, doorRotation } = doorDirection;
    door.position.set(x + doorX, 3.5, z + doorZ);
    door.rotation.y = doorRotation;
    museumGroup.add(door);

    // Create room label
    const labelTexture = createTextTexture(section.name, {
      width: 512,
      height: 128,
      fontColor: "#000000",
      backgroundColor: "rgba(240,240,240,0.8)",
      fontSize: 36,
      fontWeight: "bold",
    });

    const labelGeometry = new THREE.PlaneGeometry(10, 2.5);
    const labelMaterial = new THREE.MeshBasicMaterial({
      map: labelTexture,
      side: THREE.DoubleSide,
      transparent: true,
    });

    const label = new THREE.Mesh(labelGeometry, labelMaterial);
    label.position.set(x + doorX * 0.8, 8, z + doorZ * 0.8);
    label.rotation.y = doorRotation;
    museumGroup.add(label);

    // Store room information for exhibit placement
    window.museumRooms.push({
      section: section,
      position: { x, y: roomHeight / 2, z },
      size: roomSize,
      height: roomHeight,
      index: index,
    });
  });
}

// Helper function to create specialized floor for each room type
function createRoomFloor(museumGroup, x, z, roomSize, type) {
  let floorColor, floorTexture;

  switch (type) {
    case "header":
      floorColor = 0xe6d7b9;
      break;
    case "navigation":
      floorColor = 0xd4e6f7;
      break;
    case "article":
      floorColor = 0xf7f7f7;
      break;
    case "aside":
      floorColor = 0xececec;
      break;
    case "footer":
      floorColor = 0xdddddd;
      break;
    default:
      floorColor = 0xeeeeee;
  }

  const floorGeometry = new THREE.PlaneGeometry(roomSize, roomSize);
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: floorColor,
    roughness: 0.8,
    metalness: 0.2,
  });

  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(x, 0.01, z); // Slightly above the main floor
  floor.receiveShadow = true;
  museumGroup.add(floor);
}

// Create corridor connecting to the main entrance
function createCorridor(museumGroup, x, z, roomSize, type) {
  // Calculate direction to entrance hall
  const entranceX = 0;
  const entranceZ = 20;

  // Get normalized direction
  const dx = entranceX - x;
  const dz = entranceZ - z;
  const dist = Math.sqrt(dx * dx + dz * dz);
  const ndx = dx / dist;
  const ndz = dz / dist;

  // Skip if too close to entrance
  if (dist < 50) return;

  // Corridor dimensions
  const corridorWidth = 8;
  const corridorHeight = 6;

  // Length is distance minus room radius and entrance radius
  const length = dist - roomSize / 2 - 30;

  // Create corridor geometry aligned with direction
  const corridorGeometry = new THREE.BoxGeometry(
    corridorWidth,
    corridorHeight,
    length
  );
  const corridorMaterial = new THREE.MeshStandardMaterial({
    color: 0xeeeeee,
    roughness: 0.9,
    metalness: 0.1,
    side: THREE.BackSide,
  });

  const corridor = new THREE.Mesh(corridorGeometry, corridorMaterial);

  // Position halfway between room and entrance
  const midX = x + ndx * (roomSize / 2 + length / 2);
  const midZ = z + ndz * (roomSize / 2 + length / 2);
  corridor.position.set(midX, corridorHeight / 2, midZ);

  // Rotate to point toward entrance
  const angle = Math.atan2(dx, dz);
  corridor.rotation.y = angle;

  museumGroup.add(corridor);
}

// Calculate door direction and position
function calculateDoorDirection(roomX, roomZ) {
  // Reference point (entrance hall)
  const referenceX = 0;
  const referenceZ = 20;

  // Calculate direction to entrance hall
  const dx = referenceX - roomX;
  const dz = referenceZ - roomZ;

  // Determine which wall to place the door on based on direction
  let doorX = 0,
    doorZ = 0,
    doorRotation = 0;

  // Check which direction is stronger
  if (Math.abs(dx) > Math.abs(dz)) {
    // Door on east or west wall
    doorX = Math.sign(dx) * 20; // half room size
    doorZ = 0;
    doorRotation = Math.sign(dx) > 0 ? Math.PI / 2 : -Math.PI / 2;
  } else {
    // Door on north or south wall
    doorX = 0;
    doorZ = Math.sign(dz) * 20; // half room size
    doorRotation = Math.sign(dz) > 0 ? 0 : Math.PI;
  }

  return { doorX, doorZ, doorRotation };
}

// Select door color based on section type
function selectDoorColor(type) {
  switch (type) {
    case "header":
      return 0xd4a76a;
    case "navigation":
      return 0x4a91e2;
    case "article":
      return 0x8b5a2b;
    case "aside":
      return 0x607d8b;
    case "footer":
      return 0x757575;
    default:
      return 0x8b4513;
  }
}

// Create exhibits inside each museum room
function createMuseumExhibits(domData, sections, scaleX, scaleY) {
  if (!window.museumRooms || window.museumRooms.length === 0) return;

  window.museumRooms.forEach((room) => {
    const { section, position, size } = room;

    // Sort elements by type and importance
    const exhibits = sortExhibitsByImportance(section.childElements);

    // Calculate available wall space
    const wallLength = size - 4; // Leave some space at corners
    const wallHeight = 8; // Room height is 10

    // Distribute exhibits around the four walls
    placeExhibitsOnWalls(exhibits, position, wallLength, wallHeight);
  });
}

// Sort exhibits by importance
function sortExhibitsByImportance(elements) {
  // Define importance by element type
  const typeImportance = {
    image: 10,
    header: 9,
    interactive: 8,
    media: 7,
    form: 6,
    navigation: 5,
    text: 4,
    container: 3,
    other: 1,
  };

  // Filter out small elements
  const validElements = elements.filter(
    (element) => element.dimensions.width > 10 && element.dimensions.height > 10
  );

  // Sort by importance and size
  return validElements.sort((a, b) => {
    const importanceDiff =
      (typeImportance[b.type] || 0) - (typeImportance[a.type] || 0);
    if (importanceDiff !== 0) return importanceDiff;

    // If same importance, sort by size
    const aSize = a.dimensions.width * a.dimensions.height;
    const bSize = b.dimensions.width * b.dimensions.height;
    return bSize - aSize;
  });
}

// Place exhibits on the walls of a room
function placeExhibitsOnWalls(exhibits, roomPosition, wallLength, wallHeight) {
  if (exhibits.length === 0) return;
  
  // Get room index from the room position - compare with stored room positions
  let roomIndex = -1;
  if (window.museumRooms) {
    window.museumRooms.forEach((room, index) => {
      if (room.position.x === roomPosition.x && 
          room.position.z === roomPosition.z) {
        roomIndex = index;
      }
    });
  }
  
  // Create 4 walls with their exhibits
  const walls = [
    { name: "north", exhibits: [] },
    { name: "east", exhibits: [] },
    { name: "south", exhibits: [] },
    { name: "west", exhibits: [] }
  ];
  
  // Limit the number of exhibits per room for performance
  const maxExhibitsPerRoom = 20;
  const totalExhibits = Math.min(exhibits.length, maxExhibitsPerRoom);
  
  // Process only the most important exhibits
  const limitedExhibits = exhibits.slice(0, totalExhibits);
  
  // Distribute exhibits among walls
  limitedExhibits.forEach((exhibit, index) => {
    const wallIndex = index % walls.length;
    walls[wallIndex].exhibits.push(exhibit);
  });
  
  // Place exhibits on each wall
  walls.forEach((wall, wallIndex) => {
    if (wall.exhibits.length === 0) return;
    
    // Calculate wall direction and position
    let wallDir, baseX, baseZ;
    const { x, y, z } = roomPosition;
    const halfWall = wallLength / 2;
    
    switch (wall.name) {
      case "north":
        wallDir = 0; // Facing south (0 degrees)
        baseX = x - halfWall;
        baseZ = z - halfWall;
        break;
      case "east":
        wallDir = Math.PI / 2; // Facing west (90 degrees)
        baseX = x + halfWall;
        baseZ = z - halfWall;
        break;
      case "south":
        wallDir = Math.PI; // Facing north (180 degrees)
        baseX = x + halfWall;
        baseZ = z + halfWall;
        break;
      case "west":
        wallDir = -Math.PI / 2; // Facing east (270 degrees)
        baseX = x - halfWall;
        baseZ = z + halfWall;
        break;
    }
    
    // Calculate spacing between exhibits
    const availableWallWidth = wallLength;
    const spacing = availableWallWidth / (wall.exhibits.length + 1);
    
    // Place each exhibit on the wall
    wall.exhibits.forEach((element, index) => {
      // Calculate position along the wall
      const offset = spacing * (index + 1);
      let exhibitX, exhibitZ;
      
      switch (wall.name) {
        case "north":
          exhibitX = baseX + offset;
          exhibitZ = baseZ;
          break;
        case "east":
          exhibitX = baseX;
          exhibitZ = baseZ + offset;
          break;
        case "south":
          exhibitX = baseX - offset;
          exhibitZ = baseZ;
          break;
        case "west":
          exhibitX = baseX;
          exhibitZ = baseZ - offset;
          break;
      }
      
      // Create the exhibit based on element type
      let exhibit;
      
      // Create simplified exhibits for distant viewing
      const isDistant = index % 2 === 1; // Every other exhibit will be simplified
      
      if (isDistant) {
        // Create a simpler version for performance
        exhibit = createSimplifiedExhibit(element);
      } else {
        // Create full detailed exhibit
        switch (element.type) {
          case "image":
            exhibit = createMuseumImage(element);
            break;
          case "header":
            exhibit = createMuseumHeader(element);
            break;
          case "text":
            exhibit = createMuseumText(element);
            break;
          case "interactive":
            exhibit = createMuseumInteractive(element);
            break;
          default:
            exhibit = createMuseumDefault(element);
        }
      }
      
      if (exhibit) {
        // Position the exhibit
        exhibit.position.set(exhibitX, y, exhibitZ);
        exhibit.rotation.y = wallDir;
        
        // Store original DOM data and room index
        exhibit.userData = {
          domElement: element,
          originalPosition: { x: exhibitX, y, z: exhibitZ },
          roomIndex: roomIndex,
          simplifiedVersion: isDistant
        };
        
        // Add to scene
        scene.add(exhibit);
        domElements.push(exhibit);
      }
    });
  });
}

// Create a simplified exhibit for better performance when viewing from a distance
function createSimplifiedExhibit(element) {
  const group = new THREE.Group();
  
  // Determine color based on element type
  let color;
  switch (element.type) {
    case "image":
      color = 0x3498db; // Blue for images
      break;
    case "header":
      color = 0xf39c12; // Orange for headers
      break;
    case "text":
      color = 0xecf0f1; // White for text
      break;
    case "interactive":
      color = 0x2ecc71; // Green for interactive elements
      break;
    default:
      color = 0xbdc3c7; // Gray for others
  }
  
  // Create a simple plane with appropriate color
  const geometry = new THREE.PlaneGeometry(3, 2);
  const material = new THREE.MeshBasicMaterial({
    color: color,
    side: THREE.DoubleSide
  });
  
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.z = 0.05;
  mesh.position.y = 4;
  group.add(mesh);
  
  return group;
}

// Update entrance gate with website info
function updateEntranceGate(domData) {
  if (!window.entranceGate) return;

  const websiteName = domData.pageMetrics.title || "3DOM Website";
  const sign = window.entranceGate.children[3]; // The sign is the 4th child

  // Create canvas for text
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  canvas.width = 512;
  canvas.height = 128;

  // Fill background
  context.fillStyle = "#2c3e50";
  context.fillRect(0, 0, canvas.width, canvas.height);

  // Add text
  context.font = "bold 40px Arial";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "#ffffff";

  // Handle long titles
  if (websiteName.length > 20) {
    context.fillText(
      websiteName.substring(0, 20) + "...",
      canvas.width / 2,
      canvas.height / 2
    );
  } else {
    context.fillText(websiteName, canvas.width / 2, canvas.height / 2);
  }

  // Create texture from canvas
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.4,
    metalness: 0.3,
  });

  // Apply to sign
  sign.material = material;
}

// Helper function for creating text textures
function createTextTexture(text, options = {}) {
  const {
    width = 256,
    height = 128,
    fontColor = "#ffffff",
    backgroundColor = "rgba(0,0,0,0.8)",
    fontSize = 24,
    fontWeight = "bold",
  } = options;

  // Create canvas
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  canvas.width = width;
  canvas.height = height;

  // Fill background if needed
  if (backgroundColor) {
    context.fillStyle = backgroundColor;
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Add text
  context.font = `${fontWeight} ${fontSize}px Arial`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = fontColor;

  // Handle text wrapping for long text
  const maxLineWidth = width - 20;
  const words = text.split(" ");
  const lines = [];
  let currentLine = "";

  words.forEach((word) => {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = context.measureText(testLine);

    if (metrics.width > maxLineWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  // Limit to 3 lines maximum
  const maxLines = 3;
  if (lines.length > maxLines) {
    lines.length = maxLines - 1;
    lines.push("...");
  }

  // Calculate line height
  const lineHeight = fontSize * 1.2;
  const startY = canvas.height / 2 - ((lines.length - 1) * lineHeight) / 2;

  // Draw each line
  lines.forEach((line, index) => {
    context.fillText(line, canvas.width / 2, startY + index * lineHeight);
  });

  // Create texture from canvas
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  return texture;
}

// Create an image exhibit for the museum
function createMuseumImage(element) {
  const group = new THREE.Group();

  // Calculate size - maintain aspect ratio
  const aspectRatio = element.dimensions.width / element.dimensions.height;
  let width = 6;
  let height = width / aspectRatio;

  if (height > 4) {
    height = 4;
    width = height * aspectRatio;
  }

  // Create wall frame
  const frameGeometry = new THREE.BoxGeometry(width + 0.5, height + 0.5, 0.2);
  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0x5e3a08, // Wood brown
    roughness: 0.7,
    metalness: 0.2,
  });
  const frame = new THREE.Mesh(frameGeometry, frameMaterial);
  frame.position.z = 0.1;
  frame.position.y = 4; // Position at eye level
  group.add(frame);

  // Create image canvas
  const imageGeometry = new THREE.PlaneGeometry(width, height);

  // Try to use actual image or fallback
  if (element.imageData && element.imageData.src) {
    // Create a placeholder material first
    const placeholderMaterial = new THREE.MeshBasicMaterial({
      color: 0x3498db,
    });

    const imageMesh = new THREE.Mesh(imageGeometry, placeholderMaterial);
    imageMesh.position.z = 0.21;
    imageMesh.position.y = 4;
    group.add(imageMesh);

    // Try to load actual image
    try {
      const textureLoader = new THREE.TextureLoader();

      if (
        element.imageData.src.startsWith("data:") ||
        element.imageData.src.startsWith("blob:")
      ) {
        textureLoader.load(
          element.imageData.src,
          (texture) => {
            imageMesh.material = new THREE.MeshBasicMaterial({
              map: texture,
              side: THREE.DoubleSide,
            });
          },
          undefined,
          (err) => {
            console.log("Error loading image:", element.imageData.src);
          }
        );
      } else {
        // Create a text label with image info
        const caption = element.imageData.alt || "Exhibition Image";
        const imageTextTexture = createTextTexture(caption, {
          width: 512,
          height: 256,
          fontColor: "#ffffff",
          backgroundColor: "#3498db",
          fontSize: 32,
        });

        imageMesh.material = new THREE.MeshBasicMaterial({
          map: imageTextTexture,
          side: THREE.DoubleSide,
        });
      }
    } catch (error) {
      console.error("Error loading image:", error);
    }
  } else {
    // Just a colored panel if no image
    const color =
      element.styles.backgroundColor !== "rgba(0, 0, 0, 0)"
        ? new THREE.Color(element.styles.backgroundColor)
        : 0x3498db;

    const material = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.5,
      metalness: 0.3,
    });

    const imageMesh = new THREE.Mesh(imageGeometry, material);
    imageMesh.position.z = 0.21;
    imageMesh.position.y = 4;
    group.add(imageMesh);
  }

  // Add caption
  const captionText =
    element.imageData?.alt || element.textContent || "Exhibition Piece";
  if (captionText) {
    const captionTexture = createTextTexture(captionText, {
      width: 512,
      height: 128,
      fontColor: "#000000",
      backgroundColor: "#f0f0f0",
      fontSize: 24,
    });

    const captionGeometry = new THREE.PlaneGeometry(width, 1);
    const captionMaterial = new THREE.MeshBasicMaterial({
      map: captionTexture,
      side: THREE.DoubleSide,
    });

    const caption = new THREE.Mesh(captionGeometry, captionMaterial);
    caption.position.z = 0.21;
    caption.position.y = 2;
    group.add(caption);
  }

  return group;
}

// Create a header exhibit for the museum
function createMuseumHeader(element) {
  const group = new THREE.Group();

  // Header is like a wall plaque
  const width = 6;
  const height = 2;

  // Create plaque
  const plaqueGeometry = new THREE.BoxGeometry(width, height, 0.1);
  const plaqueMaterial = new THREE.MeshStandardMaterial({
    color: 0xbe8a59, // Bronze color
    roughness: 0.4,
    metalness: 0.6,
  });
  const plaque = new THREE.Mesh(plaqueGeometry, plaqueMaterial);
  plaque.position.z = 0.05;
  plaque.position.y = 6; // Higher than normal exhibits
  group.add(plaque);

  // Clean up header text
  const cleanText = (text) => {
    if (!text) return "";
    let cleaned = text.replace(/^#+\s+/, "");
    cleaned = cleaned.replace(/[*_`#]/g, "");
    cleaned = cleaned.replace(/\s+/g, " ");
    return cleaned.trim();
  };

  const headerText = cleanText(element.textContent || element.id || "Exhibit");

  // Create text on plaque
  const textTexture = createTextTexture(headerText, {
    width: 512,
    height: 192,
    fontColor: "#000000",
    backgroundColor: "rgba(0,0,0,0)", // Transparent
    fontSize: 40,
    fontWeight: "bold",
  });

  const textGeometry = new THREE.PlaneGeometry(width - 0.2, height - 0.2);
  const textMaterial = new THREE.MeshBasicMaterial({
    map: textTexture,
    side: THREE.DoubleSide,
    transparent: true,
  });

  const text = new THREE.Mesh(textGeometry, textMaterial);
  text.position.z = 0.16;
  text.position.y = 6;
  group.add(text);

  return group;
}

// Create a text exhibit for the museum
function createMuseumText(element) {
  const group = new THREE.Group();

  // Calculate size
  const width = 5;
  const height = 4;

  // Create a paper/document look
  const paperGeometry = new THREE.PlaneGeometry(width, height);
  const paperMaterial = new THREE.MeshStandardMaterial({
    color: 0xf8f8f8, // Off-white
    roughness: 0.9,
    metalness: 0.1,
  });

  const paper = new THREE.Mesh(paperGeometry, paperMaterial);
  paper.position.z = 0.05;
  paper.position.y = 4;
  group.add(paper);

  // Clean up text content
  const cleanText = (text) => {
    if (!text) return "";
    let cleaned = text.replace(
      /\b(d-flex|d-none|d-block|d-inline|js-|wb-|text-center)\b/g,
      ""
    );
    cleaned = cleaned.replace(/[*_`#]/g, "");
    cleaned = cleaned.replace(/\s+/g, " ");
    return cleaned.trim();
  };

  const displayText = cleanText(element.textContent) || "Exhibit Text";

  // Add actual text content
  const textTexture = createTextTexture(displayText, {
    width: 512,
    height: 512,
    fontColor: "#000000",
    backgroundColor: "rgba(0,0,0,0)",
    fontSize: 24,
    fontWeight: "normal",
  });

  const textGeometry = new THREE.PlaneGeometry(width - 0.2, height - 0.2);
  const textMaterial = new THREE.MeshBasicMaterial({
    map: textTexture,
    side: THREE.DoubleSide,
    transparent: true,
  });

  const text = new THREE.Mesh(textGeometry, textMaterial);
  text.position.z = 0.06;
  text.position.y = 4;
  group.add(text);

  return group;
}

// Create an interactive element for the museum
function createMuseumInteractive(element) {
  const group = new THREE.Group();

  // Interactive elements are like digital displays or buttons
  const width = 4;
  const height = 3;
  const depth = 0.3;

  // Create display frame
  const frameGeometry = new THREE.BoxGeometry(width + 0.4, height + 0.4, depth);
  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0x2c3e50, // Dark blue
    roughness: 0.5,
    metalness: 0.7,
  });

  const frame = new THREE.Mesh(frameGeometry, frameMaterial);
  frame.position.z = depth / 2;
  frame.position.y = 4;
  group.add(frame);

  // Clean up text
  const cleanText = (text) => {
    if (!text) return "";
    let cleaned = text.replace(
      /\b(d-flex|d-none|d-block|d-inline|js-|wb-|text-center)\b/g,
      ""
    );
    cleaned = cleaned.replace(/[*_`#]/g, "");
    cleaned = cleaned.replace(/\s+/g, " ");
    return cleaned.trim();
  };

  const buttonText = cleanText(element.textContent) || "Interactive Exhibit";

  // Create interactive display
  const buttonGeometry = new THREE.PlaneGeometry(width, height);
  const buttonColor =
    element.styles.backgroundColor !== "rgba(0, 0, 0, 0)"
      ? new THREE.Color(element.styles.backgroundColor)
      : 0x3498db;

  const textTexture = createTextTexture(buttonText, {
    width: 512,
    height: 384,
    fontColor: "#ffffff",
    backgroundColor: buttonColor.getStyle
      ? buttonColor.getStyle()
      : buttonColor,
    fontSize: 32,
    fontWeight: "bold",
  });

  const buttonMaterial = new THREE.MeshBasicMaterial({
    map: textTexture,
    side: THREE.DoubleSide,
  });

  const button = new THREE.Mesh(buttonGeometry, buttonMaterial);
  button.position.z = depth / 2 + 0.01;
  button.position.y = 4;
  group.add(button);

  // Add glow effect for interactivity
  const glowGeometry = new THREE.PlaneGeometry(width + 0.6, height + 0.6);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.3,
  });

  const glow = new THREE.Mesh(glowGeometry, glowMaterial);
  glow.position.z = depth / 2 - 0.01;
  glow.position.y = 4;
  group.add(glow);

  return group;
}

// Default exhibit for other element types
function createMuseumDefault(element) {
  const group = new THREE.Group();

  // Simple display for other element types
  const width = 4;
  const height = 3;

  // Create a simple surface
  const geometry = new THREE.PlaneGeometry(width, height);
  const material = new THREE.MeshStandardMaterial({
    color: 0xbdc3c7,
    roughness: 0.9,
    metalness: 0.1,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.z = 0.05;
  mesh.position.y = 4;
  group.add(mesh);

  // Add text if available
  if (element.textContent && element.textContent.trim()) {
    const textTexture = createTextTexture(element.textContent.trim(), {
      width: 512,
      height: 384,
      fontColor: "#000000",
      backgroundColor: "rgba(255,255,255,0.8)",
      fontSize: 24,
    });

    const textGeometry = new THREE.PlaneGeometry(width - 0.2, height - 0.2);
    const textMaterial = new THREE.MeshBasicMaterial({
      map: textTexture,
      side: THREE.DoubleSide,
      transparent: true,
    });

    const text = new THREE.Mesh(textGeometry, textMaterial);
    text.position.z = 0.06;
    text.position.y = 4;
    group.add(text);
  }

  return group;
}

// Adjust element heights based on their nesting and type
function adjustElementHeights(domData) {
  // Simple algorithm to prevent z-fighting and create a more layered look

  // Sort elements by their type importance
  const typeHeightMapping = {
    header: 2.5, // Reduced from 5
    navigation: 2, // Reduced from 4
    interactive: 1.5, // Reduced from 3
    image: 1.2, // Reduced from 2.5
    form: 1, // Reduced from 2
    media: 0.8, // Reduced from 1.5
    text: 0.5, // Reduced from 1
    container: 0.2, // Reduced from 0.5
    other: 0.1,
  };

  // First collect all positions to find overlaps
  const positions = [];

  domElements.forEach((element) => {
    if (element.userData && element.userData.domElement) {
      const elementType = element.userData.domElement.type;
      const baseHeight = typeHeightMapping[elementType] || 0;

      // Get dimensions in 3D space
      const pageWidth = domData.pageMetrics.width;
      const pageHeight = domData.pageMetrics.height;
      const scaleX = 30 / pageWidth; // Use the same scale as in createDOMElements
      const scaleY = 30 / pageHeight;

      positions.push({
        element: element,
        baseHeight: baseHeight,
        x: element.position.x,
        z: element.position.z,
        width: element.userData.domElement.dimensions.width * scaleX,
        height: element.userData.domElement.dimensions.height * scaleY,
      });
    }
  });

  // Function to check if elements overlap
  const checkOverlap = (a, b) => {
    // Expand slightly to ensure spacing
    const buffer = 1;
    return (
      Math.abs(a.x - b.x) < a.width / 2 + b.width / 2 + buffer &&
      Math.abs(a.z - b.z) < a.height / 2 + b.height / 2 + buffer
    );
  };

  // Apply heights and adjust for overlaps
  domElements.forEach((element, index) => {
    if (element.userData && element.userData.domElement) {
      const elementType = element.userData.domElement.type;
      let baseHeight = typeHeightMapping[elementType] || 0;

      // Check for overlaps with elements that have already been positioned
      for (let i = 0; i < index; i++) {
        const otherElement = domElements[i];
        if (otherElement.userData && otherElement.userData.domElement) {
          // Check if elements overlap in x-z plane
          if (checkOverlap(positions[index], positions[i])) {
            // If overlap, stack on top with a small gap
            baseHeight = Math.max(baseHeight, otherElement.position.y + 0.1);
          }
        }
      }

      // Add the type-based height to the element's y position
      element.position.y = baseHeight;

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

// Animation loop
function animate() {
  requestAnimationFrame(animate);

  if (controls.isLocked) {
    const time = performance.now();
    const delta = (time - prevTime) / 1000;

    // Apply drag to slow down
    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;
    velocity.y -= velocity.y * 10.0 * delta; // Add Y-axis drag

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

    // PERFORMANCE OPTIMIZATION: Apply level of detail management
    updateLevelOfDetail();

    prevTime = time;
  }

  // PERFORMANCE OPTIMIZATION: Use lower rendering quality for better performance
  renderer.render(scene, camera);
}

// Level of Detail Management for Performance
function updateLevelOfDetail() {
  // Only run this optimization every few frames
  if (window.lodCounter === undefined) window.lodCounter = 0;
  window.lodCounter = (window.lodCounter + 1) % 10; // Only check every 10 frames
  if (window.lodCounter !== 0) return;

  // Get camera position
  const cameraPosition = camera.position.clone();

  // LOD: Only show exhibits within a reasonable distance
  const maxExhibitDistance = 80; // Maximum distance to show detailed exhibits
  const maxRoomDistance = 150; // Maximum distance to show rooms

  // Process museum rooms and their exhibits
  if (window.museumRooms) {
    window.museumRooms.forEach((room) => {
      const roomPosition = new THREE.Vector3(
        room.position.x,
        room.position.y,
        room.position.z
      );

      // Calculate distance to this room
      const distanceToRoom = roomPosition.distanceTo(cameraPosition);

      // Process room's visibility
      if (distanceToRoom > maxRoomDistance) {
        // Room is too far away - hide all exhibits in this room
        domElements.forEach((exhibit) => {
          if (exhibit.userData && exhibit.userData.roomIndex === room.index) {
            exhibit.visible = false;
          }
        });
      } else {
        // Room is visible - check individual exhibits
        domElements.forEach((exhibit) => {
          if (exhibit.userData && exhibit.userData.originalPosition) {
            const exhibitPosition = new THREE.Vector3(
              exhibit.userData.originalPosition.x,
              exhibit.userData.originalPosition.y,
              exhibit.userData.originalPosition.z
            );

            // Calculate distance to camera
            const distance = exhibitPosition.distanceTo(cameraPosition);

            // Apply LOD based on distance
            if (distance > maxExhibitDistance) {
              // Far away - hide the exhibit
              exhibit.visible = false;
            } else if (distance > maxExhibitDistance * 0.6) {
              // Medium distance - show simplified version
              exhibit.visible = true;
              simplifyExhibit(exhibit);
            } else {
              // Close enough - show full detail
              exhibit.visible = true;
              restoreExhibit(exhibit);
            }
          }
        });
      }
    });
  }
}

// Simplify an exhibit for performance
function simplifyExhibit(exhibit) {
  // If we've already processed this exhibit, skip
  if (exhibit.userData.simplifiedState !== undefined) return;

  // Store original materials for later restoration
  if (!exhibit.userData.originalMaterials && exhibit.material) {
    // Store original materials
    exhibit.userData.originalMaterials = Array.isArray(exhibit.material)
      ? [...exhibit.material]
      : exhibit.material;

    // Create simplified material
    const simpleMaterial = new THREE.MeshBasicMaterial({
      color: exhibit.material.color || 0xcccccc,
      transparent: true,
      opacity: 0.8,
    });

    // Apply simplified material
    exhibit.material = simpleMaterial;
    exhibit.userData.simplifiedState = true;
  }

  // Hide any children for further performance improvement
  if (exhibit.children && exhibit.children.length > 3) {
    // Hide all but the main parts
    for (let i = 2; i < exhibit.children.length; i++) {
      if (!exhibit.children[i].userData.originalVisibility) {
        exhibit.children[i].userData.originalVisibility =
          exhibit.children[i].visible;
      }
      exhibit.children[i].visible = false;
    }
  }
}

// Restore an exhibit to full detail
function restoreExhibit(exhibit) {
  // Only process if we've simplified this exhibit before
  if (exhibit.userData.simplifiedState === true) {
    // Restore original materials
    if (exhibit.userData.originalMaterials) {
      exhibit.material = exhibit.userData.originalMaterials;
    }

    // Restore children visibility
    if (exhibit.children) {
      for (let i = 0; i < exhibit.children.length; i++) {
        if (exhibit.children[i].userData.originalVisibility !== undefined) {
          exhibit.children[i].visible =
            exhibit.children[i].userData.originalVisibility;
        }
      }
    }

    // Mark as restored
    exhibit.userData.simplifiedState = false;
  }
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
