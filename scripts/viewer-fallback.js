/**
 * 3DOM - Viewer Fallback Script
 * Checks if all modules loaded properly and falls back to the original script if needed
 */

// Load the modules in the correct order
const modules = [
  "/scripts/viewer/utils.js",
  "/scripts/viewer/images.js",
  "/scripts/viewer/museum.js",
  "/scripts/viewer/exhibits.js",
  "/scripts/viewer/core.js",
];

// Function to load scripts sequentially
function loadScriptsSequentially(scripts, index = 0) {
  if (index < scripts.length) {
    const script = document.createElement("script");
    script.src = scripts[index];
    script.onload = () => loadScriptsSequentially(scripts, index + 1);
    script.onerror = (error) => {
      console.error(`Error loading module ${scripts[index]}:`, error);
      loadScriptsSequentially(scripts, index + 1);
    };
    document.body.appendChild(script);
  }
}

// Check if the modular scripts loaded properly
window.addEventListener("DOMContentLoaded", function () {
  setTimeout(function () {
    if (typeof initScene !== "function") {
      console.warn(
        "Modular scripts not loaded properly, falling back to original script"
      );

      // Try loading scripts sequentially
      loadScriptsSequentially(modules);

      // If that doesn't work, fallback to the original script as a last resort
      setTimeout(function () {
        if (typeof initScene !== "function") {
          const script = document.createElement("script");
          script.src = "/scripts/viewer.js";
          document.body.appendChild(script);
        }
      }, 1000);
    } else {
      console.log("All viewer modules loaded successfully");
    }
  }, 500); // Short delay to ensure all scripts have had a chance to load
});
