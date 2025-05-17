/**
 * 3DOM - Exhibits Module
 * Handles DOM elements creation and placement in museum
 */

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

// Create exhibits inside each museum room
function createMuseumExhibits(domData, sections, scaleX, scaleY) {
  if (!window.museumRooms || window.museumRooms.length === 0) return;

  window.museumRooms.forEach((room) => {
    const { section, position, size } = room;

    // Sort elements by type and importance
    const exhibits = sortExhibitsByImportance(section.childElements);

    // Extract articles first - they get special treatment
    const articleElements = exhibits.filter(
      (element) =>
        element.articleData ||
        element.tagName === "ARTICLE" ||
        (element.classes &&
          (element.classes.includes("article") ||
            element.classes.includes("post") ||
            element.classes.includes("story")))
    );

    // Handle remaining elements
    const standardElements = exhibits.filter(
      (element) => !articleElements.includes(element)
    );

    // Calculate available wall space
    const wallLength = size - 4; // Leave some space at corners
    const wallHeight = 8; // Room height is 10

    // Place article exhibits first - they deserve prime spots
    if (articleElements.length > 0) {
      placeArticleExhibits(articleElements, position, wallLength, wallHeight);
    }

    // Distribute remaining exhibits around the walls
    placeExhibitsOnWalls(standardElements, position, wallLength, wallHeight);
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
      if (
        room.position.x === roomPosition.x &&
        room.position.z === roomPosition.z
      ) {
        roomIndex = index;
      }
    });
  }

  // Create 4 walls with their exhibits
  const walls = [
    { name: "north", exhibits: [] },
    { name: "east", exhibits: [] },
    { name: "south", exhibits: [] },
    { name: "west", exhibits: [] },
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
    const wallOffset = 0.8; // Increased distance from wall to prevent clipping

    switch (wall.name) {
      case "north":
        wallDir = 0; // Facing south (0 degrees)
        baseX = x - halfWall;
        baseZ = z - halfWall + wallOffset; // Move away from wall
        break;
      case "east":
        wallDir = Math.PI / 2; // Facing west (90 degrees)
        baseX = x + halfWall - wallOffset; // Move away from wall
        baseZ = z - halfWall;
        break;
      case "south":
        wallDir = Math.PI; // Facing north (180 degrees)
        baseX = x + halfWall;
        baseZ = z + halfWall - wallOffset; // Move away from wall
        break;
      case "west":
        wallDir = -Math.PI / 2; // Facing east (270 degrees)
        baseX = x - halfWall + wallOffset; // Move away from wall
        baseZ = z + halfWall;
        break;
    }

    // Calculate spacing between exhibits
    const availableWallWidth = wallLength - 4; // Reduce available space to prevent edge clipping
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
          simplifiedVersion: isDistant,
        };

        // Add to scene
        scene.add(exhibit);
        domElements.push(exhibit);
      }
    });
  });
}

// Create and place article exhibits with their images
function placeArticleExhibits(articles, roomPosition, wallLength, wallHeight) {
  if (articles.length === 0) return;

  // Get room index from the room position
  let roomIndex = -1;
  if (window.museumRooms) {
    window.museumRooms.forEach((room, index) => {
      if (
        room.position.x === roomPosition.x &&
        room.position.z === roomPosition.z
      ) {
        roomIndex = index;
      }
    });
  }

  // Limit number of articles per room
  const maxArticles = Math.min(articles.length, 4); // Max 4 articles per room
  const mainArticles = articles.slice(0, maxArticles);

  // Place exhibits on the north and south walls (usually the prominent walls)
  const { x, y, z } = roomPosition;
  const halfWall = wallLength / 2;
  const wallOffset = 1.0; // Increased distance from wall to prevent clipping

  // North wall (first 2 articles)
  const northArticles = mainArticles.slice(0, 2);
  northArticles.forEach((article, index) => {
    // Calculate position
    const spacing = wallLength / 3;
    const offset = spacing * (index + 1);
    const exhibitX = x - halfWall + offset;
    const exhibitZ = z - halfWall + wallOffset;

    // Create article exhibit with image and text
    const exhibit = createArticleExhibit(article);

    if (exhibit) {
      // Position the exhibit
      exhibit.position.set(exhibitX, y, exhibitZ);
      exhibit.rotation.y = 0; // Facing south

      // Store data
      exhibit.userData = {
        domElement: article,
        originalPosition: { x: exhibitX, y, z: exhibitZ },
        roomIndex: roomIndex,
      };

      // Add to scene
      scene.add(exhibit);
      domElements.push(exhibit);
    }
  });

  // South wall (next 2 articles if available)
  const southArticles = mainArticles.slice(2, 4);
  southArticles.forEach((article, index) => {
    // Calculate position
    const spacing = wallLength / 3;
    const offset = spacing * (index + 1);
    const exhibitX = x + halfWall - offset;
    const exhibitZ = z + halfWall - wallOffset;

    // Create article exhibit with image and text
    const exhibit = createArticleExhibit(article);

    if (exhibit) {
      // Position the exhibit
      exhibit.position.set(exhibitX, y, exhibitZ);
      exhibit.rotation.y = Math.PI; // Facing north

      // Store data
      exhibit.userData = {
        domElement: article,
        originalPosition: { x: exhibitX, y, z: exhibitZ },
        roomIndex: roomIndex,
      };

      // Add to scene
      scene.add(exhibit);
      domElements.push(exhibit);
    }
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
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.z = 0.05;
  mesh.position.y = 4;
  group.add(mesh);

  return group;
}
