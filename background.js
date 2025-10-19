// YouTube Transcript Extractor - Background Service Worker
// Handles automatic transcript capture, storage, and notifications

class TranscriptExtractorBackground {
  constructor() {
    this.capturedTranscript = null;
    this.setupMessageHandlers();
  }

  setupMessageHandlers() {
    // Handle messages from popup and content scripts
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log("Background received message:", message.action);

      switch (message.action) {
        case "transcriptCaptured":
          this.handleCapturedTranscript(message.data, sendResponse);
          return true;

        case "getCapturedTranscript":
          this.getCapturedTranscript(sendResponse);
          return true;

        case "clearCapturedTranscript":
          this.clearCapturedTranscript(sendResponse);
          return true;

        default:
          console.log("Unknown message action:", message.action);
          return false;
      }
    });

    // Handle notification clicks
    chrome.notifications.onClicked.addListener((notificationId) => {
      if (notificationId === "transcript-captured") {
        // Clear the notification
        chrome.notifications.clear(notificationId);

        // Open the extension popup by opening action (this will show the popup)
        chrome.action.openPopup().catch(() => {
          // Fallback: open transcript viewer in new tab
          console.log(
            "Opening popup failed, opening transcript viewer in new tab"
          );
          chrome.tabs.create({
            url: chrome.runtime.getURL("popup.html?notification=true"),
            active: true,
          });
        });
      }
    });
  }

  // Handle captured transcript from content script
  handleCapturedTranscript(transcriptData, sendResponse) {
    console.log("📡 Background received captured transcript:", transcriptData);

    // Store the captured transcript
    this.capturedTranscript = {
      ...transcriptData,
      capturedAt: Date.now(),
      captureMethod: "Auto-capture",
    };

    // Store in chrome.storage for persistence across service worker restarts
    chrome.storage.local.set(
      {
        capturedTranscript: this.capturedTranscript,
      },
      () => {
        console.log("✅ Transcript stored in chrome.storage");
      }
    );

    // Set badge to notify user transcript was captured
    chrome.action.setBadgeText({ text: "1" });
    chrome.action.setBadgeBackgroundColor({ color: "#4CAF50" });
    chrome.action.setTitle({ title: "Transcript captured! Click to view" });

    // Request permission and create toast notification
    chrome.notifications.getPermissionLevel((level) => {
      console.log("📋 Current notification permission level:", level);

      if (level === "granted") {
        // Create notification
        chrome.notifications.create(
          "transcript-captured",
          {
            type: "basic",
            iconUrl: "icons/icon128.png",
            title: "Transcript Captured!",
            message: "Auto-captured from video captions. Click to view.",
            priority: 2,
          },
          (notificationId) => {
            if (chrome.runtime.lastError) {
              console.error(
                "❌ Notification failed:",
                chrome.runtime.lastError.message
              );
            } else {
              console.log(
                "✅ Toast notification created successfully:",
                notificationId
              );
            }
          }
        );
      } else {
        console.log(
          "📋 Notification permission not granted, only badge will show"
        );
      }
    });

    if (sendResponse) {
      sendResponse({ success: true });
    }

    // Notify any open popups about the captured transcript
    this.notifyPopupsTranscriptReady();
  }

  // Get captured transcript
  getCapturedTranscript(sendResponse) {
    // First try memory, then fall back to storage
    if (this.capturedTranscript) {
      console.log("📋 Returning captured transcript from memory");
      if (sendResponse) {
        sendResponse({
          success: true,
          transcript: this.capturedTranscript,
        });
      }
      return;
    }

    // Check chrome.storage as fallback
    chrome.storage.local.get(["capturedTranscript"], (result) => {
      if (result.capturedTranscript) {
        console.log("📋 Returning captured transcript from storage");
        this.capturedTranscript = result.capturedTranscript;
        if (sendResponse) {
          sendResponse({
            success: true,
            transcript: result.capturedTranscript,
          });
        }
      } else {
        console.log("❌ No captured transcript available");
        if (sendResponse) {
          sendResponse({ success: false, error: "No captured transcript" });
        }
      }
    });
  }

  // Clear captured transcript
  clearCapturedTranscript(sendResponse) {
    this.capturedTranscript = null;

    // Clear badge notification
    chrome.action.setBadgeText({ text: "" });
    chrome.action.setTitle({ title: "Extract YouTube Transcript" });

    // Clear from storage too
    chrome.storage.local.remove(["capturedTranscript"], () => {
      console.log("🗑️ Cleared captured transcript from storage");
    });

    if (sendResponse) {
      sendResponse({ success: true });
    }
  }

  // Notify any open popups that transcript is ready
  notifyPopupsTranscriptReady() {
    // This will be received by popup.js if it's open
    chrome.runtime
      .sendMessage({
        action: "transcriptReady",
        source: "background",
      })
      .catch(() => {
        // Popup might not be open, which is fine
        console.log("No popup open to notify (this is normal)");
      });
  }

  // Initialize from storage on startup
  async initialize() {
    try {
      const result = await chrome.storage.local.get(["capturedTranscript"]);

      if (result.capturedTranscript) {
        this.capturedTranscript = result.capturedTranscript;
        console.log("Restored captured transcript from storage");
      }
    } catch (error) {
      console.error("Error initializing background:", error);
    }
  }
}

// Initialize the background service worker
console.log("🚀 Background service worker starting...");
const backgroundService = new TranscriptExtractorBackground();
backgroundService.initialize();

// Handle service worker lifecycle
chrome.runtime.onStartup.addListener(() => {
  console.log("🔄 Background service worker restarted");
  backgroundService.initialize();
});

chrome.runtime.onInstalled.addListener(() => {
  console.log("📦 Extension installed/updated");
});
