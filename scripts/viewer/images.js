/**
 * 3DOM - Image Module
 * Handles image loading and rendering functions
 */

// Helper function to create an image display from image data
function createImageDisplay(imageData, geometry) {
  // Create a placeholder material first
  const placeholderMaterial = new THREE.MeshBasicMaterial({
    color: 0x3498db,
  });

  const imageMesh = new THREE.Mesh(geometry, placeholderMaterial);

  // Try to load actual image
  try {
    const textureLoader = new THREE.TextureLoader();
    textureLoader.setCrossOrigin("anonymous");

    // Check if we're dealing with a placeholder and show appropriate image
    if (imageData.isPlaceholder && imageData.originalSrc) {
      console.log(
        "Using placeholder with original URL:",
        imageData.originalSrc
      );
      createFallbackImage(imageData.originalSrc);
      return imageMesh;
    }

    // Use the image source directly
    let imageSrc = imageData.src;
    console.log(
      "Loading image from source:",
      imageSrc ? imageSrc.substring(0, 50) + "..." : "undefined"
    );

    // If it's a blob URL or data URL, try direct loading
    if (
      imageSrc &&
      (imageSrc.startsWith("blob:") || imageSrc.startsWith("data:"))
    ) {
      console.log("Loading from blob/data URL");
      loadImageTexture(imageSrc);
    }
    // If it has original source as fallback, try that next
    else if (imageData.originalSrc) {
      console.log("Trying original source as fallback");
      loadImageTexture(imageSrc, imageData.originalSrc);
    }
    // Last resort
    else {
      loadImageTexture(imageSrc);
    }

    // Function to load the image texture
    function loadImageTexture(src, fallbackSrc) {
      if (!src) {
        console.error("Empty image source");
        createFallbackImage(fallbackSrc || "No image source");
        return;
      }

      textureLoader.load(
        src,
        (texture) => {
          // Success - create material with loaded texture
          const imgMaterial = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.DoubleSide,
          });
          imageMesh.material = imgMaterial;
          console.log("Successfully loaded image texture");
        },
        (progress) => {
          // Loading progress - could add a progress indicator here
        },
        (err) => {
          console.log(
            "Error loading image:",
            src.substring(0, 50) + "...",
            err
          );

          // Try fallback source if provided
          if (fallbackSrc && fallbackSrc !== src) {
            console.log("Trying fallback source:", fallbackSrc);
            textureLoader.load(
              fallbackSrc,
              (texture) => {
                const imgMaterial = new THREE.MeshBasicMaterial({
                  map: texture,
                  side: THREE.DoubleSide,
                });
                imageMesh.material = imgMaterial;
                console.log("Successfully loaded fallback image");
              },
              null,
              (fallbackErr) => {
                console.log("Fallback also failed, using text placeholder");
                createFallbackImage(imageData.alt || fallbackSrc || "Image");
              }
            );
          } else {
            createFallbackImage(imageData.alt || "Image");
          }
        }
      );
    }

    // Create a fallback image with the URL shown
    function createFallbackImage(text) {
      console.log("Creating fallback image with text:", text);

      // Create a canvas for our fallback
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 384;
      const ctx = canvas.getContext("2d");

      // Fill with a gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, "#3498db"); // Start with blue
      gradient.addColorStop(1, "#2980b9"); // End with darker blue
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Add a border
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 20;
      ctx.strokeRect(25, 25, canvas.width - 50, canvas.height - 50);

      // Add a camera icon
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2 - 60, 40, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(canvas.width / 2 - 80, canvas.height / 2 - 20, 160, 100);

      // Add text labels
      ctx.font = "bold 28px Arial";
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.fillText("IMAGE", canvas.width / 2, canvas.height / 2 + 100);

      // Add the url or description
      ctx.font = "16px Arial";
      let displayText = text;
      if (text && text.length > 40) {
        displayText =
          text.substring(0, 18) + "..." + text.substring(text.length - 18);
      }
      ctx.fillText(
        displayText || "Image",
        canvas.width / 2,
        canvas.height / 2 + 140
      );

      // Convert to a texture
      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;

      // Update the mesh material
      imageMesh.material = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.DoubleSide,
      });
    }
  } catch (error) {
    console.error("Error processing image:", error);
  }

  return imageMesh;
}

// Create an image exhibit for the museum
function createMuseumImage(element) {
  const group = new THREE.Group();

  // Calculate size - maintain aspect ratio
  const aspectRatio =
    element.dimensions.width / element.dimensions.height || 1.5;
  let width = 6;
  let height = width / aspectRatio;

  if (height > 4) {
    height = 4;
    width = height * aspectRatio;
  }

  // Increase frame depth to prevent z-fighting
  const frameGeometry = new THREE.BoxGeometry(width + 0.5, height + 0.5, 0.3);
  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0x5e3a08, // Wood brown
    roughness: 0.7,
    metalness: 0.2,
  });
  const frame = new THREE.Mesh(frameGeometry, frameMaterial);
  frame.position.z = 0.15; // Increased depth
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
    imageMesh.position.z = 0.31; // Ensure it's in front of the frame
    imageMesh.position.y = 4;
    group.add(imageMesh);

    // Try to load actual image
    try {
      const textureLoader = new THREE.TextureLoader();
      textureLoader.setCrossOrigin("anonymous");

      // Check if we're dealing with a placeholder and show appropriate image
      if (element.imageData.isPlaceholder && element.imageData.originalSrc) {
        console.log(
          "Using placeholder with original URL:",
          element.imageData.originalSrc
        );
        createFallbackImage(element.imageData.originalSrc);
        // Add caption and return early
        addCaption();
        return group;
      }

      let imageSrc = element.imageData.src;
      console.log(
        "Museum Image - Loading from source:",
        imageSrc ? imageSrc.substring(0, 50) + "..." : "undefined"
      );

      // If it's a blob URL or data URL, try direct loading
      if (
        imageSrc &&
        (imageSrc.startsWith("blob:") || imageSrc.startsWith("data:"))
      ) {
        console.log("Loading from blob/data URL");
        loadImageTexture(imageSrc);
      }
      // If it has original source as fallback, try that next
      else if (element.imageData.originalSrc) {
        console.log("Trying original source as fallback");
        loadImageTexture(imageSrc, element.imageData.originalSrc);
      }
      // Last resort
      else {
        loadImageTexture(imageSrc);
      }

      // Function to load the image texture
      function loadImageTexture(src, fallbackSrc) {
        if (!src) {
          console.error("Empty image source in museum exhibit");
          createFallbackImage(fallbackSrc || "No image source");
          return;
        }

        textureLoader.load(
          src,
          (texture) => {
            // Success - create material with loaded texture
            const imgMaterial = new THREE.MeshBasicMaterial({
              map: texture,
              side: THREE.DoubleSide,
            });
            imageMesh.material = imgMaterial;
            console.log("Successfully loaded museum image texture");
          },
          (progress) => {
            // Loading progress - could add a progress indicator here
          },
          (err) => {
            console.log(
              "Error loading museum image:",
              src.substring(0, 50) + "...",
              err
            );

            // Try fallback source if provided
            if (fallbackSrc && fallbackSrc !== src) {
              console.log("Trying fallback source:", fallbackSrc);
              textureLoader.load(
                fallbackSrc,
                (texture) => {
                  const imgMaterial = new THREE.MeshBasicMaterial({
                    map: texture,
                    side: THREE.DoubleSide,
                  });
                  imageMesh.material = imgMaterial;
                  console.log("Successfully loaded fallback image");
                },
                null,
                (fallbackErr) => {
                  console.log("Fallback also failed, using text placeholder");
                  createFallbackImage(
                    element.imageData.alt || fallbackSrc || "Image"
                  );
                }
              );
            } else {
              createFallbackImage(element.imageData.alt || "Image");
            }
          }
        );
      }

      // Create a fallback image with the URL shown
      function createFallbackImage(text) {
        console.log("Creating fallback museum image with text:", text);

        // Create a canvas for our fallback
        const canvas = document.createElement("canvas");
        canvas.width = 512;
        canvas.height = 384;
        const ctx = canvas.getContext("2d");

        // Fill with a gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, "#3498db"); // Start with blue
        gradient.addColorStop(1, "#2980b9"); // End with darker blue
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Add a border
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 20;
        ctx.strokeRect(25, 25, canvas.width - 50, canvas.height - 50);

        // Add a camera icon
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2 - 60, 40, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(canvas.width / 2 - 80, canvas.height / 2 - 20, 160, 100);

        // Add text labels
        ctx.font = "bold 28px Arial";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.fillText("IMAGE", canvas.width / 2, canvas.height / 2 + 100);

        // Add the url or description
        ctx.font = "16px Arial";
        let displayText = text;
        if (text && text.length > 40) {
          displayText =
            text.substring(0, 18) + "..." + text.substring(text.length - 18);
        }
        ctx.fillText(
          displayText || "Image",
          canvas.width / 2,
          canvas.height / 2 + 140
        );

        // Convert to a texture
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;

        // Update the mesh material
        imageMesh.material = new THREE.MeshBasicMaterial({
          map: texture,
          side: THREE.DoubleSide,
        });
      }
    } catch (error) {
      console.error("Error processing museum image:", error);
    }
  } else {
    // Just a colored panel if no image
    const color =
      element.styles.backgroundColor !== "rgba(0, 0, 0, 0)"
        ? new THREE.Color(element.styles.backgroundColor)
        : 0x3498db;

    // Create a demo pattern material
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    canvas.width = 256;
    canvas.height = 256;

    // Fill with base color
    context.fillStyle = new THREE.Color(color).getStyle();
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Draw a simple picture-like pattern
    context.strokeStyle = "#ffffff";
    context.lineWidth = 10;
    context.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

    // Add some image-like content
    context.fillStyle = "#ffffff";
    context.fillRect(50, 50, 156, 156);

    // Create texture from the canvas
    const texture = new THREE.CanvasTexture(canvas);

    const material = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.DoubleSide,
    });

    const imageMesh = new THREE.Mesh(imageGeometry, material);
    imageMesh.position.z = 0.31;
    imageMesh.position.y = 4;
    group.add(imageMesh);
  }

  // Add caption
  addCaption();

  function addCaption() {
    const captionText =
      element.imageData?.alt || element.textContent || "Exhibition Piece";

    if (captionText && captionText.trim().length > 0) {
      const captionWidth = Math.min(width, 5);
      const captionBackGeometry = new THREE.BoxGeometry(
        captionWidth + 0.4,
        0.8,
        0.05
      );
      const captionBackMaterial = new THREE.MeshStandardMaterial({
        color: 0x222222,
        metalness: 0.3,
        roughness: 0.8,
      });
      const captionBack = new THREE.Mesh(
        captionBackGeometry,
        captionBackMaterial
      );
      captionBack.position.y = 4 - height / 2 - 0.4;
      captionBack.position.z = 0.32;
      group.add(captionBack);

      // Generate caption text texture
      const captionTexture = createTextTexture(captionText, {
        fontSize: 24,
        fontColor: "#ffffff",
        backgroundColor: "transparent",
        width: 512,
        height: 128,
      });

      const captionGeometry = new THREE.PlaneGeometry(captionWidth, 0.6);
      const captionMaterial = new THREE.MeshBasicMaterial({
        map: captionTexture,
        transparent: true,
        side: THREE.FrontSide,
      });
      const caption = new THREE.Mesh(captionGeometry, captionMaterial);
      caption.position.y = 4 - height / 2 - 0.4;
      caption.position.z = 0.35;
      group.add(caption);
    }
  }

  return group;
}

// Create an article exhibit with image and text
function createArticleExhibit(element) {
  const group = new THREE.Group();

  // Determine what data to use
  const articleData = element.articleData || {
    title: element.textContent?.substring(0, 50) || "Article",
    image: element.imageData,
    summary: element.textContent?.substring(0, 200) || "",
  };

  // 1. Create image part
  const imageData = articleData.image || element.imageData;
  if (imageData && imageData.src) {
    const aspectRatio =
      imageData.width && imageData.height
        ? imageData.width / imageData.height
        : 1.5;

    let width = 5;
    let height = width / aspectRatio;

    if (height > 4) {
      height = 4;
      width = height * aspectRatio;
    }

    // Create frame
    const frameGeometry = new THREE.BoxGeometry(width + 0.5, height + 0.5, 0.3);
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: 0x5e3a08, // Wood brown
      roughness: 0.7,
      metalness: 0.2,
    });
    const frame = new THREE.Mesh(frameGeometry, frameMaterial);
    frame.position.set(-2.5, 5, 0.15); // Left side of the exhibit
    group.add(frame);

    // Create image
    const imageGeometry = new THREE.PlaneGeometry(width, height);

    // If the image is a placeholder, pass that information to the image display function
    if (imageData.isPlaceholder) {
      imageData.alt = articleData.title || "Article Image";
    }
    const imageMesh = createImageDisplay(imageData, imageGeometry);
    imageMesh.position.set(-2.5, 5, 0.31); // Just in front of frame
    group.add(imageMesh);

    // Add caption
    if (articleData.title) {
      const captionGeometry = new THREE.PlaneGeometry(width, 0.8);
      const captionTexture = createTextTexture(articleData.title, {
        width: 512,
        height: 96,
        fontColor: "#ffffff",
        backgroundColor: "#333333",
        fontSize: 24,
      });

      const captionMaterial = new THREE.MeshBasicMaterial({
        map: captionTexture,
        side: THREE.DoubleSide,
      });

      const caption = new THREE.Mesh(captionGeometry, captionMaterial);
      caption.position.set(-2.5, 3, 0.31);
      group.add(caption);
    }
  }

  // 2. Create text part
  if (articleData.title || articleData.summary) {
    // Title
    if (articleData.title) {
      const titleGeometry = new THREE.PlaneGeometry(5, 1);
      const titleTexture = createTextTexture(articleData.title, {
        width: 512,
        height: 128,
        fontColor: "#000000",
        backgroundColor: "#f0f0f0",
        fontSize: 32,
        fontWeight: "bold",
      });

      const titleMaterial = new THREE.MeshBasicMaterial({
        map: titleTexture,
        side: THREE.DoubleSide,
      });

      const titleMesh = new THREE.Mesh(titleGeometry, titleMaterial);
      titleMesh.position.set(2.5, 6, 0.31);
      group.add(titleMesh);
    }

    // Summary text
    if (articleData.summary) {
      // Limit summary length
      const summary =
        articleData.summary.length > 300
          ? articleData.summary.substring(0, 300) + "..."
          : articleData.summary;

      const textGeometry = new THREE.PlaneGeometry(5, 5);
      const textTexture = createTextTexture(summary, {
        width: 512,
        height: 512,
        fontColor: "#000000",
        backgroundColor: "#ffffff",
        fontSize: 20,
        fontWeight: "normal",
      });

      const textMaterial = new THREE.MeshBasicMaterial({
        map: textTexture,
        side: THREE.DoubleSide,
      });

      const textMesh = new THREE.Mesh(textGeometry, textMaterial);
      textMesh.position.set(2.5, 4, 0.31);
      group.add(textMesh);
    }
  }

  return group;
}
