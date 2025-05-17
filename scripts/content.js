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
    };
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
    sectionData: sectionData,
  };
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
