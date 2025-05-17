/**
 * 3DOM - Utilities Module
 * Contains helper functions for text and other utilities
 */

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
    element.styles && element.styles.backgroundColor !== "rgba(0, 0, 0, 0)"
      ? new THREE.Color(element.styles.backgroundColor)
      : new THREE.Color(0x3498db);

  const textTexture = createTextTexture(buttonText, {
    width: 512,
    height: 384,
    fontColor: "#ffffff",
    backgroundColor: buttonColor.getStyle ? buttonColor.getStyle() : "#3498db",
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
