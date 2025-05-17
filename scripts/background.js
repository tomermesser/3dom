/**
 * 3DOM - Background Script
 * Handles extension events and communication between components
 */

// Store DOM data from the content script
let currentDomData = null;
let contentScriptActive = {};

// Listen for extension icon click
chrome.action.onClicked.addListener((tab) => {
  console.log("3DOM: Extension icon clicked, scanning DOM...");

  // Check if the content script is already active in this tab
  if (contentScriptActive[tab.id]) {
    // Content script is already running, just send message to scan DOM
    chrome.tabs.sendMessage(tab.id, { action: "scanDOM" }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("Error sending message:", chrome.runtime.lastError);
        return;
      }
      console.log("3DOM: DOM scanning initiated", response);
    });
  } else {
    // Inject the content script if it's not already active
    chrome.scripting
      .executeScript({
        target: { tabId: tab.id },
        files: ["scripts/content.js"],
      })
      .then(() => {
        // Mark this tab as having the content script active
        contentScriptActive[tab.id] = true;

        // Send message to content script to scan the DOM
        chrome.tabs.sendMessage(tab.id, { action: "scanDOM" }, (response) => {
          if (chrome.runtime.lastError) {
            console.error("Error sending message:", chrome.runtime.lastError);
            return;
          }
          console.log("3DOM: DOM scanning initiated", response);
        });
      })
      .catch((err) => {
        console.error("3DOM: Error injecting content script:", err);
      });
  }
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Content script ready notification
  if (message.action === "contentScriptReady") {
    console.log("3DOM: Content script ready in tab", sender.tab?.id);
    if (sender.tab?.id) {
      contentScriptActive[sender.tab.id] = true;
    }
    sendResponse({ status: "acknowledged" });
    return true;
  }

  // DOM scan complete with data
  if (message.action === "domScanComplete") {
    console.log("3DOM: DOM scan complete", message.data);
    currentDomData = message.data;

    // Open the 3D viewer page with the data
    open3DViewer(sender.tab?.id, message.data);

    sendResponse({ status: "received" });
    return true;
  }
});

// Clean up when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
  if (contentScriptActive[tabId]) {
    delete contentScriptActive[tabId];
  }
});

// Function to open the 3D viewer
function open3DViewer(tabId, domData) {
  // Store the DOM data in local storage for the viewer page to access
  chrome.storage.local.set({ current3DOMData: domData }, () => {
    // Open the viewer in a new tab
    chrome.tabs.create({
      url: chrome.runtime.getURL("viewer.html"),
      active: true,
    });
  });
}
