/**
 * 3DOM - Content Script
 * This script analyzes the current webpage's DOM structure and extracts relevant information
 * for 3D representation.
 */

// Store the extracted DOM data
// Check if domData is already defined to prevent redeclaration errors
if (typeof window.domData === "undefined") {
  window.domData = {
    elements: [],
    pageMetrics: {
      width: 0,
      height: 0,
      title: "",
      url: "",
    },
  };
}

// Main function to scan the DOM
function scanDOM() {
  console.log("3DOM: Scanning DOM...");

  // Reset the data for a fresh scan
  window.domData = {
    elements: [],
    pageMetrics: {
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
      title: document.title,
      url: window.location.href,
    },
  };

  // Start traversing from the body
  traverseNode(document.body, 0);

  // Log the results (for development)
  console.log("3DOM: DOM Scan complete", window.domData);

  // Process images to avoid CORS issues
  proxyImages(window.domData).then(() => {
    console.log("3DOM: Image proxying complete");

    // Optimize the data size before sending
    const optimizedData = optimizeDOMData(window.domData);

    // Check if data is still too large
    const dataSize = JSON.stringify(optimizedData).length;
    const MAX_MESSAGE_SIZE = 10 * 1024 * 1024; // 10MB rough limit

    if (dataSize > MAX_MESSAGE_SIZE) {
      console.warn(
        `3DOM: Data still too large (${(dataSize / 1024 / 1024).toFixed(
          2
        )}MB), applying more aggressive optimization`
      );
      // Apply more aggressive optimization
      optimizedData.elements = optimizedData.elements.slice(0, 100);
    }

    // Send the optimized data to the background script
    chrome.runtime.sendMessage({
      action: "domScanComplete",
      data: optimizedData,
    });
  });
}

// Recursive function to traverse the DOM tree
function traverseNode(node, depth) {
  // Skip script, style, and hidden elements
  if (
    node.nodeName === "SCRIPT" ||
    node.nodeName === "STYLE" ||
    node.nodeName === "META" ||
    node.nodeName === "LINK" ||
    isHidden(node)
  ) {
    return;
  }

  // Get element data
  const elementData = extractElementData(node, depth);

  // Add to elements array if it's a valid element
  if (elementData) {
    window.domData.elements.push(elementData);
  }

  // Traverse child nodes
  for (let i = 0; i < node.childNodes.length; i++) {
    if (node.childNodes[i].nodeType === Node.ELEMENT_NODE) {
      traverseNode(node.childNodes[i], depth + 1);
    }
  }
}

// Extract relevant data from a DOM element
function extractElementData(element, depth) {
  // Get element's computed style
  const style = window.getComputedStyle(element);

  // Skip elements with no dimensions or that are hidden
  if (
    element.offsetWidth === 0 ||
    element.offsetHeight === 0 ||
    style.display === "none" ||
    style.visibility === "hidden"
  ) {
    return null;
  }

  // Get element's position and size
  const rect = element.getBoundingClientRect();
  const computedStyle = window.getComputedStyle(element);

  // Determine element type and interactivity
  const interactiveTypes = [
    "A",
    "BUTTON",
    "INPUT",
    "SELECT",
    "TEXTAREA",
    "VIDEO",
    "AUDIO",
  ];
  const isInteractive =
    interactiveTypes.includes(element.nodeName) ||
    element.onclick !== null ||
    computedStyle.cursor === "pointer";

  // Extract text content if appropriate - filter out whitespace-only text
  let textContent = "";
  if (element.textContent) {
    textContent = element.textContent.trim();

    // Filter out technical-looking text that's not meaningful to users
    textContent = cleanTextContent(textContent);
  }

  // Filter out elements with technical utility classes only
  const technicalClassPrefixes = [
    "d-",
    "position-",
    "display-",
    "flex-",
    "float-",
    "js-",
    "wb-",
    "rounded",
    "shadow",
    "p-",
    "m-",
    "text-",
    "font-",
    "bg-",
    "container-",
    "layout",
    "grid-",
    "col-",
    "row-",
    "fe",
    "anim",
  ];
  const technicalClassRegexes = [
    /^col-/,
    /^row-/,
    /^mt-/,
    /^mb-/,
    /^ml-/,
    /^mr-/,
    /^pt-/,
    /^pb-/,
    /^pl-/,
    /^pr-/,
    /^align-/,
    /^justify-/,
    /^w-/,
    /^h-/,
    /^border/,
    /^rounded/,
    /^position-/,
    /^layout/,
    /^main/,
    /^wrapper/,
    /^inner/,
    /^outer/,
    /^container/,
    /^fe[A-Z]/, // SVG elements like feMerge, feGaussianBlur
    /^svg/,
    /^ui-/,
    /^color-/,
    /^size-/,
    /^width-/,
    /^height-/,
  ];

  // Functions to check if a class is technical
  const isTechnicalClass = (className) => {
    if (technicalClassPrefixes.some((prefix) => className.startsWith(prefix)))
      return true;
    if (technicalClassRegexes.some((regex) => regex.test(className)))
      return true;
    return false;
  };

  // Extract image data if it's an image
  let imageData = null;
  if (element.nodeName === "IMG" && element.src) {
    imageData = {
      src: element.src,
      alt: element.alt || "",
      width: element.width,
      height: element.height,
    };

    // Try to proxy the image if it's from an external source
    if (imageData.src.startsWith("http")) {
      // Mark that this image might need proxying
      imageData.needsProxy = true;
    }
  } else if (
    element.nodeName === "DIV" ||
    element.nodeName === "A" ||
    element.nodeName === "FIGURE"
  ) {
    // Check for background image
    const bgImage = style.backgroundImage;
    if (bgImage && bgImage !== "none") {
      // Extract URL from the background-image property
      const urlMatch = bgImage.match(/url\(['"]?(.*?)['"]?\)/);
      if (urlMatch && urlMatch[1]) {
        imageData = {
          src: urlMatch[1],
          alt: element.getAttribute("aria-label") || "",
          width: element.offsetWidth,
          height: element.offsetHeight,
          isBackground: true,
        };

        // Mark external images for proxying
        if (imageData.src.startsWith("http")) {
          imageData.needsProxy = true;
        }
      }
    }

    // If this is a container, check for image children
    const imgChild = element.querySelector("img");
    if (!imageData && imgChild && imgChild.src) {
      imageData = {
        src: imgChild.src,
        alt: imgChild.alt || element.getAttribute("aria-label") || "",
        width: imgChild.width || element.offsetWidth,
        height: imgChild.height || element.offsetHeight,
        isChild: true,
      };

      // Mark external images for proxying
      if (imageData.src.startsWith("http")) {
        imageData.needsProxy = true;
      }
    }
  }

  // Check article content for related image and text
  let articleData = null;
  if (
    element.nodeName === "ARTICLE" ||
    (element.classList &&
      (element.classList.contains("article") ||
        element.classList.contains("story") ||
        element.classList.contains("post")))
  ) {
    articleData = extractArticleData(element);
  }

  // Classify the element
  let elementType = classifyElement(element);

  // Get background color
  const bgColor = computedStyle.backgroundColor;
  const textColor = computedStyle.color;

  // Filter meaningful classes - remove technical/utility classes
  const meaningfulClasses = Array.from(element.classList).filter(
    (cls) => !isTechnicalClass(cls)
  );

  // Get parent ID for hierarchy tracking
  const parentElement = element.parentElement;
  const parentId = parentElement ? parentElement.id || null : null;

  // Extract additional metadata for museum organization
  const sectionData = extractSectionData(element);

  return {
    id: element.id || null,
    tagName: element.tagName,
    type: elementType,
    classes: meaningfulClasses,
    parentId: parentId,
    position: {
      x: rect.left + window.scrollX,
      y: rect.top + window.scrollY,
      z: depth,
    },
    dimensions: {
      width: rect.width,
      height: rect.height,
    },
    zIndex: computedStyle.zIndex !== 'auto' ? (parseInt(computedStyle.zIndex, 10) || 0) : 0,
    styles: {
      backgroundColor: bgColor !== "rgba(0, 0, 0, 0)" ? bgColor : null,
      color: textColor,
      fontSize: computedStyle.fontSize,
      fontWeight: computedStyle.fontWeight,
      borderRadius: computedStyle.borderRadius,
      boxShadow:
        computedStyle.boxShadow !== "none" ? computedStyle.boxShadow : null,
    },
    isInteractive: isInteractive,
    textContent: textContent,
    imageData: imageData,
    articleData: articleData,
    href: element.href || null,
    sectionData: sectionData,
  };
}

// Extract article data including image and text content
function extractArticleData(element) {
  // Initialize article data
  const articleData = {
    title: "",
    image: null,
    summary: "",
    content: "",
  };

  // Look for title in various elements
  const titleElement =
    element.querySelector("h1, h2, h3") ||
    element.querySelector("[class*='title'], [class*='heading']");

  if (titleElement) {
    articleData.title = titleElement.textContent.trim();
  }

  // Look for main image
  const imgElement = element.querySelector("img");
  if (imgElement && imgElement.src) {
    articleData.image = {
      src: imgElement.src,
      alt: imgElement.alt || articleData.title || "",
      width: imgElement.width || imgElement.offsetWidth,
      height: imgElement.height || imgElement.offsetHeight,
    };

    // Mark external images for proxying
    if (articleData.image.src.startsWith("http")) {
      articleData.image.needsProxy = true;
    }
  } else {
    // Check for a figure with background image
    const figureElement = element.querySelector(
      "figure, [class*='image'], [class*='media']"
    );
    if (figureElement) {
      const style = window.getComputedStyle(figureElement);
      const bgImage = style.backgroundImage;
      if (bgImage && bgImage !== "none") {
        const urlMatch = bgImage.match(/url\(['"]?(.*?)['"]?\)/);
        if (urlMatch && urlMatch[1]) {
          articleData.image = {
            src: urlMatch[1],
            alt: articleData.title || "",
            width: figureElement.offsetWidth,
            height: figureElement.offsetHeight,
            isBackground: true,
          };

          // Mark external images for proxying
          if (articleData.image.src.startsWith("http")) {
            articleData.image.needsProxy = true;
          }
        }
      }
    }
  }

  // Look for article summary/excerpt
  const summaryElement = element.querySelector(
    "[class*='summary'], [class*='excerpt'], [class*='desc'], p:first-of-type"
  );

  if (summaryElement) {
    articleData.summary = summaryElement.textContent.trim();
  }

  // Get main content text, excluding title and image captions
  let contentText = "";
  const contentElements = element.querySelectorAll("p");

  contentElements.forEach((p) => {
    // Skip if this is the title or looks like an image caption
    if (
      p === titleElement ||
      p.parentElement.tagName === "FIGCAPTION" ||
      p.classList.contains("caption") ||
      (p.textContent.length < 100 && p === contentElements[0])
    ) {
      return;
    }

    contentText += p.textContent.trim() + " ";
  });

  articleData.content = contentText.trim();

  // If we have content but no summary, use the first part as summary
  if (!articleData.summary && articleData.content) {
    articleData.summary = articleData.content.split(". ")[0] + ".";
  }

  return articleData;
}

// Helper function to clean text content that contains technical gibberish
function cleanTextContent(text) {
  if (!text) return "";

  // Skip technical-looking text entirely (common auto-generated IDs)
  if (/^[a-zA-Z0-9_-]{5,}$/.test(text) && !text.match(/\s/)) {
    return "";
  }

  // Remove anything that looks like a technical ID (common in minified code/CSS)
  if (/^[a-zA-Z]{1,2}[0-9]{3,}$/.test(text)) {
    return "";
  }

  // Remove technical SVG element names
  if (/^fe[A-Z][a-zA-Z]*$/.test(text)) {
    return "";
  }

  // Remove layout/container gibberish
  if (
    /^(container|layout|wrapper|inner|outer|main)(-|\s)?[a-zA-Z0-9]*$/.test(
      text
    ) &&
    text.length < 20
  ) {
    return "";
  }

  // Remove typical technical class names that might appear as text
  let cleaned = text.replace(/\b(js-|wb-|css-|svg-|anim-|ui-)\w+\b/g, "");

  // Remove excessive whitespace
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  // If after cleaning we're left with very short text (likely not meaningful)
  if (cleaned.length < 3) {
    return "";
  }

  return cleaned;
}

// Helper function to classify elements
function classifyElement(element) {
  const tagName = element.tagName.toLowerCase();

  // Check for navigation elements
  if (
    tagName === "nav" ||
    element.id?.includes("nav") ||
    Array.from(element.classList).some((c) => c.includes("nav"))
  ) {
    return "navigation";
  }

  // Check for headers
  if (tagName.match(/^h[1-6]$/)) {
    return "header";
  }

  // Check for lists
  if (tagName === "ul" || tagName === "ol") {
    return "list";
  }

  // Check for images
  if (tagName === "img" || element.style.backgroundImage) {
    return "image";
  }

  // Check for buttons or links
  if (tagName === "button" || tagName === "a") {
    return "interactive";
  }

  // Check for form elements
  if (["input", "textarea", "select", "form"].includes(tagName)) {
    return "form";
  }

  // Check for media elements
  if (["video", "audio", "canvas"].includes(tagName)) {
    return "media";
  }

  // Default classification
  if (tagName === "div" || tagName === "section" || tagName === "article") {
    return "container";
  }

  if (tagName === "p" || tagName === "span") {
    return "text";
  }

  // Default
  return "other";
}

// Check if an element is hidden
function isHidden(element) {
  const style = window.getComputedStyle(element);
  return (
    style.display === "none" ||
    style.visibility === "hidden" ||
    style.opacity === "0" ||
    (element.offsetWidth === 0 && element.offsetHeight === 0)
  );
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "scanDOM") {
    scanDOM();
    sendResponse({ status: "scanning" });
    return true;
  }
});

// Also scan on page load
document.addEventListener("DOMContentLoaded", () => {
  console.log("3DOM: Content script loaded");
});

// Initial message to background script that we're ready
chrome.runtime.sendMessage({ action: "contentScriptReady" });

// Extract section information to help with museum organization
function extractSectionData(element) {
  // Default section data
  const sectionData = {
    isSectionContainer: false,
    sectionName: null,
    sectionType: null,
  };

  // Check if this is likely a section container
  const sectionTags = [
    "SECTION",
    "ARTICLE",
    "MAIN",
    "ASIDE",
    "NAV",
    "HEADER",
    "FOOTER",
  ];
  if (sectionTags.includes(element.tagName)) {
    sectionData.isSectionContainer = true;
    sectionData.sectionType = element.tagName.toLowerCase();
  }

  // Check for common section class names
  const sectionClassNames = [
    "section",
    "panel",
    "container",
    "article",
    "card",
    "page",
    "module",
    "gallery",
    "feed",
    "list",
    "grid",
    "hero",
    "banner",
    "feature",
  ];

  if (element.classList) {
    // Check if any of the classes suggest this is a section
    const matchingClasses = Array.from(element.classList).filter((cls) =>
      sectionClassNames.some(
        (sectionClass) =>
          cls.includes(sectionClass) &&
          !cls.startsWith("d-") &&
          !cls.startsWith("p-")
      )
    );

    if (matchingClasses.length > 0) {
      sectionData.isSectionContainer = true;
      sectionData.sectionName = matchingClasses[0];
    }
  }

  // Check for section/article role attributes
  if (
    element.getAttribute("role") === "region" ||
    element.getAttribute("role") === "article" ||
    element.getAttribute("role") === "main"
  ) {
    sectionData.isSectionContainer = true;
    sectionData.sectionType = element.getAttribute("role");
  }

  // If this has a heading element as its first child, it's likely a section
  const firstHeading = element.querySelector("h1, h2, h3, h4, h5, h6");
  if (
    firstHeading &&
    element.contains(firstHeading) &&
    element.firstElementChild === firstHeading
  ) {
    sectionData.isSectionContainer = true;
    sectionData.sectionName = firstHeading.textContent.trim();
  }

  // Large divs with an ID and sufficient content are often sections
  if (
    element.tagName === "DIV" &&
    element.id &&
    element.offsetWidth > 200 &&
    element.offsetHeight > 200 &&
    element.childElementCount > 3
  ) {
    sectionData.isSectionContainer = true;
    sectionData.sectionName = element.id;
  }

  return sectionData;
}

// Function to proxy images to avoid CORS issues
function proxyImages(domData) {
  console.log("3DOM: Proxying external images to avoid CORS issues...");

  const pendingPromises = [];

  // Process main elements with images
  domData.elements.forEach((element) => {
    if (element.imageData && element.imageData.needsProxy) {
      console.log("Processing image:", element.imageData.src);

      // Store the original URL immediately as a backup
      element.imageData.originalSrc = element.imageData.src;

      const promise = fetchImageAsDataUrl(element.imageData.src)
        .then((result) => {
          if (result) {
            // Handle different result types
            if (typeof result === "string") {
              // Simple data URL string
              element.imageData.src = result;
            } else if (result.dataUrl) {
              // Enhanced result object with metadata
              element.imageData.src = result.dataUrl;
              element.imageData.isPlaceholder = result.isPlaceholder || false;
            }
          } else {
            // Ensure we at least have a placeholder
            element.imageData.isPlaceholder = true;
          }
          delete element.imageData.needsProxy;
        })
        .catch((err) => {
          console.error("Failed to proxy image:", err);
          // Ensure the original source is preserved for fallback
          element.imageData.isPlaceholder = true;
          delete element.imageData.needsProxy;
        });

      pendingPromises.push(promise);
    }

    // Process article images
    if (
      element.articleData &&
      element.articleData.image &&
      element.articleData.image.needsProxy
    ) {
      // Store the original URL immediately as a backup
      element.articleData.image.originalSrc = element.articleData.image.src;

      const promise = fetchImageAsDataUrl(element.articleData.image.src)
        .then((result) => {
          if (result) {
            // Handle different result types
            if (typeof result === "string") {
              // Simple data URL string
              element.articleData.image.src = result;
            } else if (result.dataUrl) {
              // Enhanced result object with metadata
              element.articleData.image.src = result.dataUrl;
              element.articleData.image.isPlaceholder =
                result.isPlaceholder || false;
            }
          } else {
            // Ensure we at least have a placeholder
            element.articleData.image.isPlaceholder = true;
          }
          delete element.articleData.image.needsProxy;
        })
        .catch((err) => {
          console.error("Failed to proxy article image:", err);
          // Ensure the original source is preserved for fallback
          element.articleData.image.isPlaceholder = true;
          delete element.articleData.image.needsProxy;
        });

      pendingPromises.push(promise);
    }
  });

  return Promise.all(pendingPromises);
}

// Fetch an image and convert it to a data URL
function fetchImageAsDataUrl(url) {
  return new Promise((resolve, reject) => {
    // Try the direct approach first
    tryDirectFetch(url)
      .then(resolve)
      .catch((err) => {
        console.log("Direct fetch failed, trying alternative approach:", err);
        // If direct fetch fails, try alternative approach
        tryAlternativeFetch(url).then(resolve).catch(reject);
      });
  });
}

// Direct approach - load the image with crossOrigin
function tryDirectFetch(url) {
  return new Promise((resolve, reject) => {
    console.log("Trying direct fetch for:", url);

    // Skip unnecessary processing for data URLs
    if (url.startsWith("data:")) {
      console.log("URL is already a data URL, returning as is");
      return resolve(url);
    }

    // Create a canvas to draw the image
    const img = new Image();

    // Set up cross-origin handling
    img.crossOrigin = "anonymous";

    img.onload = function () {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.width || 400;
        canvas.height = img.height || 300;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);

        // Try to convert to data URL, with fallback to blob URL
        try {
          // Convert to data URL
          const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
          console.log("Successfully created data URL from image");
          resolve(dataUrl);
        } catch (canvasErr) {
          console.warn(
            "Canvas tainted by CORS, trying blob approach:",
            canvasErr
          );
          // If toDataURL fails due to CORS, try blob
          canvas.toBlob(
            function (blob) {
              if (blob) {
                const blobUrl = URL.createObjectURL(blob);
                console.log("Successfully created blob URL from image");
                resolve({
                  dataUrl: blobUrl,
                  originalUrl: url,
                  isPlaceholder: false,
                });
              } else {
                reject(new Error("Failed to create blob from canvas"));
              }
            },
            "image/jpeg",
            0.7
          );
        }
      } catch (err) {
        console.error("Error converting image to data URL:", err);
        reject(err);
      }
    };

    img.onerror = function (err) {
      console.warn("Failed to load image with crossOrigin:", url, err);
      reject(err);
    };

    // Try to load with credentials
    img.src = url;

    // Set a timeout to avoid hanging
    setTimeout(() => {
      if (!img.complete) {
        console.warn("Image loading timed out:", url);
        reject(new Error("Image loading timed out"));
      }
    }, 5000); // Increased timeout for better chances
  });
}

// Alternative approach - try using a blob URL and XHR
function tryAlternativeFetch(url) {
  return new Promise((resolve, reject) => {
    console.log("Trying alternative fetch for:", url);

    // Skip unnecessary processing for data URLs
    if (url.startsWith("data:")) {
      console.log("URL is already a data URL, returning as is");
      return resolve(url);
    }

    // Try using XHR to get image with correct CORS headers
    const xhr = new XMLHttpRequest();
    xhr.responseType = "blob";
    xhr.timeout = 5000; // 5 second timeout

    xhr.onload = function () {
      if (xhr.status === 200) {
        const blob = xhr.response;
        const blobUrl = URL.createObjectURL(blob);
        console.log("Successfully retrieved image via XHR");

        // We can use the blob URL directly in most cases
        resolve({
          dataUrl: blobUrl,
          originalUrl: url,
          isPlaceholder: false,
        });
      } else {
        console.warn("XHR request failed with status:", xhr.status);
        createPlaceholderDataUrl(url).then(resolve).catch(reject);
      }
    };

    xhr.ontimeout = function () {
      console.warn("XHR request timed out for:", url);
      createPlaceholderDataUrl(url).then(resolve).catch(reject);
    };

    xhr.onerror = function () {
      console.warn("XHR failed for:", url);
      createPlaceholderDataUrl(url).then(resolve).catch(reject);
    };

    // Open and send the request
    try {
      xhr.open("GET", url, true);
      xhr.send();
    } catch (err) {
      console.error("Failed to initialize XHR:", err);
      createPlaceholderDataUrl(url).then(resolve).catch(reject);
    }
  });
}

// Create a fallback placeholder image with the URL text
function createPlaceholderDataUrl(url) {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 400;
      canvas.height = 300;

      const ctx = canvas.getContext("2d");

      // Draw a nicer placeholder with gradient background
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, "#3498db");
      gradient.addColorStop(1, "#2980b9");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Add border
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 10;
      ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

      // Add image icon
      ctx.fillStyle = "#ffffff";
      // Draw a simplified camera/image icon
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2 - 40, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(canvas.width / 2 - 60, canvas.height / 2, 120, 60);

      // Add text
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 20px Arial";
      ctx.textAlign = "center";
      ctx.fillText("External Image", canvas.width / 2, canvas.height / 2 + 40);

      // Display the URL (shortened if needed)
      let displayUrl = url;
      if (url.length > 40) {
        displayUrl =
          url.substring(0, 20) + "..." + url.substring(url.length - 20);
      }
      ctx.font = "14px Arial";
      ctx.fillText(displayUrl, canvas.width / 2, canvas.height / 2 + 70);

      // Store the original URL in metadata
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      resolve({
        dataUrl: dataUrl,
        originalUrl: url,
        isPlaceholder: true,
      });
    } catch (err) {
      reject(err);
    }
  });
}

// Function to reduce data size for larger webpages
function optimizeDOMData(domData) {
  console.log("3DOM: Optimizing DOM data size...");
  const originalSize = JSON.stringify(domData).length / 1024;
  console.log(`Original size: ${originalSize.toFixed(2)} KB`);

  // 1. Limit the number of elements to the most important ones
  if (domData.elements.length > 300) {
    console.log(`Reducing elements from ${domData.elements.length} to 300`);

    // Sort elements by importance
    domData.elements.sort((a, b) => {
      // Prioritize elements with images
      if (a.imageData && !b.imageData) return -1;
      if (!a.imageData && b.imageData) return 1;

      // Prioritize articles
      if (a.articleData && !b.articleData) return -1;
      if (!a.articleData && b.articleData) return 1;

      // Prioritize meaningful elements
      const aHasText = a.textContent && a.textContent.length > 10;
      const bHasText = b.textContent && b.textContent.length > 10;
      if (aHasText && !bHasText) return -1;
      if (!aHasText && bHasText) return 1;

      // Prioritize larger elements as they're more visible
      const aSize = a.dimensions.width * a.dimensions.height;
      const bSize = b.dimensions.width * b.dimensions.height;
      return bSize - aSize;
    });

    // Keep only the top elements
    domData.elements = domData.elements.slice(0, 300);
  }

  // 2. Truncate large text content
  domData.elements.forEach((element) => {
    if (element.textContent && element.textContent.length > 500) {
      element.textContent = element.textContent.substring(0, 500) + "...";
    }

    if (element.articleData) {
      if (
        element.articleData.content &&
        element.articleData.content.length > 1000
      ) {
        element.articleData.content =
          element.articleData.content.substring(0, 1000) + "...";
      }

      if (
        element.articleData.summary &&
        element.articleData.summary.length > 300
      ) {
        element.articleData.summary =
          element.articleData.summary.substring(0, 300) + "...";
      }
    }
  });

  // 3. Skip small or insignificant elements
  domData.elements = domData.elements.filter((element) => {
    // Remove tiny elements
    if (element.dimensions.width < 10 || element.dimensions.height < 10) {
      return false;
    }

    // Remove elements without meaningful content or visual aspects
    if (
      !element.imageData &&
      !element.textContent &&
      !element.articleData &&
      element.type !== "header" &&
      element.type !== "navigation"
    ) {
      return false;
    }

    return true;
  });

  // 4. Reduce quality of data URLs for images
  domData.elements.forEach((element) => {
    if (
      element.imageData &&
      element.imageData.src &&
      element.imageData.src.startsWith("data:image")
    ) {
      // Reduce data URL quality by recreating with lower quality
      const originalSrc = element.imageData.src;
      try {
        const img = new Image();
        img.src = originalSrc;

        // Create a smaller version of the image
        const canvas = document.createElement("canvas");
        const maxSize = 400; // Limit dimensions to 400px

        if (
          element.imageData.width > maxSize ||
          element.imageData.height > maxSize
        ) {
          const scale = Math.min(
            maxSize / element.imageData.width,
            maxSize / element.imageData.height
          );

          canvas.width = element.imageData.width * scale;
          canvas.height = element.imageData.height * scale;

          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          // Create a lower quality data URL
          element.imageData.src = canvas.toDataURL("image/jpeg", 0.6); // Lower quality
        }
      } catch (err) {
        console.warn("Failed to optimize image data URL", err);
      }
    }

    // Similarly for article images
    if (
      element.articleData &&
      element.articleData.image &&
      element.articleData.image.src &&
      element.articleData.image.src.startsWith("data:image")
    ) {
      try {
        const img = new Image();
        img.src = element.articleData.image.src;

        const canvas = document.createElement("canvas");
        const maxSize = 400;

        if (
          element.articleData.image.width > maxSize ||
          element.articleData.image.height > maxSize
        ) {
          const scale = Math.min(
            maxSize / element.articleData.image.width,
            maxSize / element.articleData.image.height
          );

          canvas.width = element.articleData.image.width * scale;
          canvas.height = element.articleData.image.height * scale;

          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          element.articleData.image.src = canvas.toDataURL("image/jpeg", 0.6);
        }
      } catch (err) {
        console.warn("Failed to optimize article image data URL", err);
      }
    }
  });

  const optimizedSize = JSON.stringify(domData).length / 1024;
  console.log(
    `Optimized size: ${optimizedSize.toFixed(2)} KB, reduced by ${(
      ((originalSize - optimizedSize) / originalSize) *
      100
    ).toFixed(2)}%`
  );

  return domData;
}
