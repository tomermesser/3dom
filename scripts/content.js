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

  // Send the data to the background script
  chrome.runtime.sendMessage({
    action: "domScanComplete",
    data: window.domData,
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

  // Extract text content if appropriate
  let textContent = "";
  if (
    element.textContent &&
    element.childNodes.length === 1 &&
    element.childNodes[0].nodeType === Node.TEXT_NODE
  ) {
    textContent = element.textContent.trim();
  }

  // Extract image data if it's an image
  let imageData = null;
  if (element.nodeName === "IMG" && element.src) {
    imageData = {
      src: element.src,
      alt: element.alt || "",
    };
  }

  // Classify the element
  let elementType = classifyElement(element);

  // Get background color
  const bgColor = computedStyle.backgroundColor;
  const textColor = computedStyle.color;

  return {
    id: element.id || null,
    tagName: element.tagName,
    type: elementType,
    classes: Array.from(element.classList),
    position: {
      x: rect.left + window.scrollX,
      y: rect.top + window.scrollY,
      z: depth,
    },
    dimensions: {
      width: rect.width,
      height: rect.height,
    },
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
    href: element.href || null,
  };
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
