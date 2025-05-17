/**
 * 3DOM - Museum Module
 * Handles museum structure and exhibit layouts
 */

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
  let floorColor;

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

  // Make floor slightly smaller than the room to prevent clipping
  const floorGeometry = new THREE.PlaneGeometry(roomSize - 0.5, roomSize - 0.5);
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: floorColor,
    roughness: 0.8,
    metalness: 0.2,
  });

  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(x, 0.02, z); // Raised slightly to prevent z-fighting with main floor
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
