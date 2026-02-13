/**
 * 3DOM - Visibility Controls Script
 * Handles UI interactions for the visibility controls panel
 */

// Visibility controls toggle functionality
document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.getElementById('toggle-controls');
  const controlsContent = document.getElementById('controls-content');

  // Toggle collapse/expand with proper ARIA state management
  const toggleControls = () => {
    const isCollapsed = controlsContent.classList.toggle('collapsed');
    toggleBtn.textContent = isCollapsed ? '▶' : '▼';
    toggleBtn.setAttribute('aria-expanded', !isCollapsed);
  };

  // Only handle clicks on the toggle button to avoid keyboard navigation conflict
  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleControls();
  });

  // Select All functionality
  document.getElementById('select-all-btn').addEventListener('click', () => {
    document.querySelectorAll('.control-item input[type="checkbox"]').forEach(checkbox => {
      checkbox.checked = true;
      checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });

  // Deselect All functionality
  document.getElementById('deselect-all-btn').addEventListener('click', () => {
    document.querySelectorAll('.control-item input[type="checkbox"]').forEach(checkbox => {
      checkbox.checked = false;
      checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });
});
