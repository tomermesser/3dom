/**
 * 3DOM - Elements Module
 * Creates geometric shapes for DOM elements in city view
 */

// Configuration constants
const BASE_HEIGHT = 0.5; // Base height unit for z-index calculation
const MIN_ELEMENT_SIZE = 10; // Minimum element size in pixels
const MAX_TEXT_LENGTH = 100; // Maximum text length for textures
const CANVAS_SIZE = 512; // Canvas size for text textures

// Create all element shapes
function createCityElements(domData) {
  console.log('3DOM City: Creating element shapes...');

  // Validate dependencies
  if (!window.cityData || !window.cityData.scale || !window.cityData.pageMetrics) {
    console.error('3DOM Elements: cityData not initialized. Make sure city.js has run first.');
    return [];
  }

  if (!window.scene || typeof window.scene.add !== 'function') {
    console.error('3DOM Elements: Scene not initialized.');
    return [];
  }

  const elements = domData.elements;
  const scale = window.cityData.scale;
  const pageMetrics = window.cityData.pageMetrics;
  const elementObjects = [];

  elements.forEach((element, index) => {
    // Skip tiny elements
    if (element.dimensions.width < MIN_ELEMENT_SIZE || element.dimensions.height < MIN_ELEMENT_SIZE) {
      return;
    }

    let elementShape;
    try {
      elementShape = createElementShape(element, scale, pageMetrics);
    } catch (error) {
      console.warn('3DOM Elements: Failed to create shape for element:', element.tagName, element.id || '(no id)', error.message);
      return; // Skip this element
    }

    if (elementShape) {
      scene.add(elementShape);
      // Push the mesh directly (userData already contains domElement)
      elementObjects.push(elementShape);
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
  // Validate zIndex is a valid number
  const zIndex = typeof element.zIndex === 'number' && !isNaN(element.zIndex) ? Math.max(0, element.zIndex) : 0;
  const height = (zIndex + 1) * BASE_HEIGHT;

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
      radiusValue = Math.min(parseInt(match[1], 10) * (window.cityData.scale || 0.2), Math.min(width, depth) / 4);
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
      // Convert rgba() to rgb() since THREE.Color doesn't support alpha
      let colorStr = element.styles.backgroundColor;
      if (colorStr.startsWith('rgba(')) {
        colorStr = colorStr.replace(/rgba\(([^)]+)\)/, (match, values) => {
          const parts = values.split(',').slice(0, 3); // Take only RGB, ignore alpha
          return `rgb(${parts.join(',')})`;
        });
      }
      return new THREE.Color(colorStr);
    } catch (e) {
      console.warn('3DOM Elements: Failed to parse color:', element.styles.backgroundColor, 'for element:', element.tagName, element.id || '(no id)');
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
  const displayText = text.length > MAX_TEXT_LENGTH ? text.substring(0, MAX_TEXT_LENGTH) + '...' : text;

  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_SIZE;
  canvas.height = CANVAS_SIZE;
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
