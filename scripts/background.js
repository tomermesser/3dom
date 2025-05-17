/**
 * 3DOM - Background Script
 * Handles extension events and communication between components
 */

// Store DOM data from the content script
let currentDomData = null;
let contentScriptActive = {};
let viewerTabId = null; // Track the viewer tab
let scanningTabId = null; // Track which tab is currently being scanned

// Listen for extension icon click
chrome.action.onClicked.addListener((tab) => {
  console.log("3DOM: Extension icon clicked, scanning DOM...");

  // Remember which tab we're scanning
  scanningTabId = tab.id;

  // Change the icon to indicate scanning
  chrome.action.setIcon({
    path: {
      16: "/images/icon16_scanning.png",
      48: "/images/icon48_scanning.png",
      128: "/images/icon128_scanning.png",
    },
    tabId: tab.id,
  });

  // Show a popup to indicate scanning
  try {
    chrome.notifications.create({
      type: "basic",
      iconUrl: "/images/icon128_scanning.png",
      title: "3DOM Scanner",
      message:
        "Scanning webpage... Please wait while we analyze the DOM structure.",
      priority: 2,
    });
  } catch (error) {
    console.warn("Notifications API not available:", error);
  }

  // Immediately create the viewer tab with a loading screen
  chrome.tabs.create(
    {
      url: chrome.runtime.getURL("viewer.html?loading=true"),
      active: true,
    },
    (newTab) => {
      // Store the viewer tab ID
      viewerTabId = newTab.id;

      // Check if the content script is already active in this tab
      if (contentScriptActive[tab.id]) {
        // Content script is already running, just send message to scan DOM
        chrome.tabs.sendMessage(tab.id, { action: "scanDOM" }, (response) => {
          if (chrome.runtime.lastError) {
            console.error("Error sending message:", chrome.runtime.lastError);
            notifyViewerOfError(
              "Failed to communicate with the content script"
            );
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
            chrome.tabs.sendMessage(
              tab.id,
              { action: "scanDOM" },
              (response) => {
                if (chrome.runtime.lastError) {
                  console.error(
                    "Error sending message:",
                    chrome.runtime.lastError
                  );
                  notifyViewerOfError(
                    "Failed to communicate with the content script"
                  );
                  return;
                }
                console.log("3DOM: DOM scanning initiated", response);
              }
            );
          })
          .catch((err) => {
            console.error("3DOM: Error injecting content script:", err);
            // Reset icon if there's an error
            chrome.action.setIcon({
              path: {
                16: "/images/icon16.png",
                48: "/images/icon48.png",
                128: "/images/icon128.png",
              },
              tabId: tab.id,
            });
            notifyViewerOfError("Failed to inject the content script");
          });
      }
    }
  );
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
    console.log(
      "3DOM: DOM scan complete, data size:",
      JSON.stringify(message.data).length / 1024,
      "KB"
    );

    // Store the data in memory
    currentDomData = message.data;

    // Reset the browser action icon
    if (scanningTabId) {
      chrome.action.setIcon({
        path: {
          16: "/images/icon16.png",
          48: "/images/icon48.png",
          128: "/images/icon128.png",
        },
        tabId: scanningTabId,
      });

      // Clear scanning state
      scanningTabId = null;
    }

    // If we already have a viewer tab open, send the data to it
    if (viewerTabId) {
      chrome.tabs.sendMessage(
        viewerTabId,
        {
          action: "domDataReady",
          data: currentDomData,
        },
        (response) => {
          if (chrome.runtime.lastError) {
            // If there was an error communicating with the tab, it might have been closed
            console.error(
              "Error sending data to viewer tab:",
              chrome.runtime.lastError
            );
            viewerTabId = null;
            // Open a new viewer tab
            open3DViewer();
          }
        }
      );
    } else {
      // Open a new viewer tab if one doesn't exist
      open3DViewer();
    }

    sendResponse({ status: "received" });
    return true;
  }

  // Request for DOM data from viewer page
  if (message.action === "requestDOMData") {
    console.log("3DOM: Viewer requested DOM data");

    // Store the viewer tab ID for future communications
    if (sender.tab?.id) {
      viewerTabId = sender.tab.id;
    }

    // Send the DOM data to the viewer
    sendResponse({
      status: "success",
      data: currentDomData,
    });

    return true;
  }
});

// Clean up when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
  if (contentScriptActive[tabId]) {
    delete contentScriptActive[tabId];
  }

  // If viewer tab is closed, clear the DOM data
  if (tabId === viewerTabId) {
    currentDomData = null;
    viewerTabId = null;
  }

  // If scanning tab is closed, reset state
  if (tabId === scanningTabId) {
    scanningTabId = null;
  }
});

// Function to open the 3D viewer
function open3DViewer() {
  // Simply open the viewer page - it will request data from background
  chrome.tabs.create(
    {
      url: chrome.runtime.getURL("viewer.html"),
      active: true,
    },
    (newTab) => {
      // Store the viewer tab ID
      viewerTabId = newTab.id;
    }
  );
}

// Function to notify the viewer tab of an error
function notifyViewerOfError(errorMessage) {
  if (viewerTabId) {
    chrome.tabs.sendMessage(viewerTabId, {
      action: "scanError",
      error: errorMessage,
    });
  }
}
