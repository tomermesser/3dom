/**
 * 3DOM - 3D Viewer Script
 * This is now a wrapper that loads the modular components
 */

console.log("3DOM Viewer: Loading modular components...");

// Check if modules have loaded
if (
  typeof createTextTexture !== "function" ||
  typeof createCityElements !== "function" ||
  typeof initScene !== "function"
) {
  console.error(
    "3DOM Viewer: Modular components not detected, trying to load them directly"
  );

  // Load the modules in the correct order
  const modules = [
    "scripts/viewer/utils.js",
    "scripts/viewer/images.js",
    "scripts/viewer/city.js",
    "scripts/viewer/elements.js",
    "scripts/viewer/core.js",
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

  // Start loading scripts
  loadScriptsSequentially(modules);
} else {
  console.log("3DOM Viewer: Modular components already loaded");
}
