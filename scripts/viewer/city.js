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
