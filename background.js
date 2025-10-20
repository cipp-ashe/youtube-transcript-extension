// YouTube Transcript Extractor - Background Service Worker
// MV3-native event-driven architecture with lifecycle awareness

// Message action constants
const ACTIONS = {
  TRANSCRIPT_CAPTURED: "transcriptCaptured",
  GET_CAPTURED_TRANSCRIPT: "getCapturedTranscript",
  CLEAR_CAPTURED_TRANSCRIPT: "clearCapturedTranscript",
  CLEAR_PREVIOUS_VIDEO_TRANSCRIPTS: "clearPreviousVideoTranscripts",
  GET_ALL_CAPTURED_TRANSCRIPTS: "getAllCapturedTranscripts",
  CLEAR_ALL_TRANSCRIPTS: "clearAllTranscripts",
};

// Storage keys for chrome.storage.session (lifecycle-persistent)
const STORAGE_KEYS = {
  CAPTURED_TRANSCRIPTS: "capturedTranscripts",
};

// Utility: Safe message sending with proper error handling
const safeSendMessage = async (message) => {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        console.log("Message send failed:", chrome.runtime.lastError.message);
        resolve({ success: false, error: chrome.runtime.lastError.message });
      } else {
        resolve(response || { success: true });
      }
    });
  });
};

// Storage initialization guard (prevent duplicate calls from lifecycle events)
let storageInitialized = false;

const ensureStorage = async () => {
  if (storageInitialized) return;
  await initializeStorage();
  storageInitialized = true;
};

// Initialize session storage
const initializeStorage = async () => {
  try {
    const sessions = await chrome.storage.session.get([
      STORAGE_KEYS.CAPTURED_TRANSCRIPTS,
    ]);

    // Initialize empty structures if they don't exist
    const updates = {};
    if (!sessions[STORAGE_KEYS.CAPTURED_TRANSCRIPTS]) {
      updates[STORAGE_KEYS.CAPTURED_TRANSCRIPTS] = {};
    }

    if (Object.keys(updates).length > 0) {
      await chrome.storage.session.set(updates);
    }

    // Clean up old persistent storage
    chrome.storage.local.remove(["capturedTranscript"], () => {
      console.log("🧹 Cleaned up old persistent storage");
    });

    console.log("✅ MV3 session storage initialized");
  } catch (error) {
    console.error("Error initializing storage:", error);
  }
};

// Atomic storage operations (prevent race conditions)
const updateTranscripts = async (mutator) => {
  const { [STORAGE_KEYS.CAPTURED_TRANSCRIPTS]: transcripts } =
    await chrome.storage.session.get([STORAGE_KEYS.CAPTURED_TRANSCRIPTS]);

  const updatedTranscripts = mutator(transcripts || {});
  await chrome.storage.session.set({
    [STORAGE_KEYS.CAPTURED_TRANSCRIPTS]: updatedTranscripts,
  });
  return updatedTranscripts;
};

// -----------------------------------------------------------
// Transcript Management

const handleCapturedTranscript = async (
  transcriptData,
  videoId,
  sendResponse
) => {
  console.log("📡 Background received captured transcript for video:", videoId);

  if (!videoId) {
    console.error("❌ No video ID provided for captured transcript");
    if (sendResponse)
      sendResponse({ success: false, error: "No video ID provided" });
    return;
  }

  try {
    const capturedTranscript = {
      ...transcriptData,
      capturedAt: Date.now(),
      captureMethod: "Auto-capture",
      videoId: videoId,
    };

    // Store using atomic operation
    await updateTranscripts((transcripts) => ({
      ...transcripts,
      [videoId]: capturedTranscript,
    }));

    console.log(`✅ Transcript stored for video ${videoId} (session storage)`);

    // Update badge to show total transcript count
    await updateBadgeForAllVideos();

    // Create notification if permitted
    chrome.notifications.getPermissionLevel((level) => {
      if (level === "granted") {
        chrome.notifications.create("transcript-captured", {
          type: "basic",
          iconUrl: "icons/icon128.png",
          title: "Transcript Captured!",
          message: "Auto-captured from video captions. Click to view.",
          priority: 2,
        });
      }
    });

    if (sendResponse) sendResponse({ success: true });
  } catch (error) {
    console.error("Error handling captured transcript:", error);
    if (sendResponse) sendResponse({ success: false, error: error.message });
  }
};

const getCapturedTranscript = async (videoId, sendResponse) => {
  if (!videoId) {
    console.log("❌ No video ID provided for transcript retrieval");
    if (sendResponse)
      sendResponse({ success: false, error: "No video ID provided" });
    return;
  }

  try {
    const { [STORAGE_KEYS.CAPTURED_TRANSCRIPTS]: transcripts } =
      await chrome.storage.session.get([STORAGE_KEYS.CAPTURED_TRANSCRIPTS]);

    const transcript = transcripts?.[videoId];
    if (transcript) {
      console.log(`📋 Returning captured transcript for video ${videoId}`);
      if (sendResponse) {
        sendResponse({ success: true, transcript: transcript });
      }
    } else {
      console.log(`❌ No captured transcript available for video ${videoId}`);
      if (sendResponse) {
        sendResponse({
          success: false,
          error: "No captured transcript for this video",
        });
      }
    }
  } catch (error) {
    console.error("Error retrieving transcript:", error);
    if (sendResponse) sendResponse({ success: false, error: error.message });
  }
};

const clearCapturedTranscript = async (videoId, sendResponse) => {
  try {
    const updatedTranscripts = await updateTranscripts((transcripts) => {
      if (videoId && transcripts[videoId]) {
        const updated = { ...transcripts };
        delete updated[videoId];
        console.log(`🗑️ Cleared captured transcript for video ${videoId}`);
        return updated;
      }
      return transcripts;
    });

    // Clear badge if no transcripts remain
    if (Object.keys(updatedTranscripts).length === 0) {
      await chrome.action.setBadgeText({ text: "" });
      await chrome.action.setTitle({ title: "Extract YouTube Transcript" });
    }

    if (sendResponse) sendResponse({ success: true });
  } catch (error) {
    console.error("Error clearing transcript:", error);
    if (sendResponse) sendResponse({ success: false, error: error.message });
  }
};

const clearPreviousVideoTranscripts = async (currentVideoId, sendResponse) => {
  try {
    await updateTranscripts((transcripts) => {
      if (currentVideoId && transcripts[currentVideoId]) {
        console.log(
          `🗑️ Cleared previous video transcripts, kept ${currentVideoId}`
        );
        return { [currentVideoId]: transcripts[currentVideoId] };
      } else {
        console.log("🗑️ Cleared all video transcripts");
        return {};
      }
    });

    // Update badge after clearing transcripts
    await updateBadgeForAllVideos();

    if (sendResponse) sendResponse({ success: true });
  } catch (error) {
    console.error("Error clearing previous transcripts:", error);
    if (sendResponse) sendResponse({ success: false, error: error.message });
  }
};

// Set badge to waiting state during auto-capture
const setBadgeWaiting = async (videoId, sendResponse) => {
  try {
    await chrome.action.setBadgeText({ text: "..." });
    await chrome.action.setBadgeBackgroundColor({ color: "#FFA500" });
    await chrome.action.setTitle({
      title: "Auto-capture active - enable CC on video",
    });

    if (sendResponse) sendResponse({ success: true });
  } catch (error) {
    console.error("Error setting badge waiting state:", error);
    if (sendResponse) sendResponse({ success: false, error: error.message });
  }
};

// Update badge to reflect overall transcript availability
const updateBadgeForAllVideos = async () => {
  try {
    const { [STORAGE_KEYS.CAPTURED_TRANSCRIPTS]: transcripts } =
      await chrome.storage.session.get([STORAGE_KEYS.CAPTURED_TRANSCRIPTS]);

    const transcriptCount = Object.keys(transcripts || {}).length;
    if (transcriptCount > 0) {
      await chrome.action.setBadgeText({ text: transcriptCount.toString() });
      await chrome.action.setBadgeBackgroundColor({ color: "#4CAF50" });
      await chrome.action.setTitle({
        title: `${transcriptCount} transcript(s) captured - click to view`,
      });
    } else {
      await chrome.action.setBadgeText({ text: "" });
      await chrome.action.setTitle({ title: "Extract YouTube Transcript" });
    }
  } catch (error) {
    console.error("Error updating badge for all videos:", error);
  }
};

// Get all captured transcripts for transcript list view
const getAllCapturedTranscripts = async (sendResponse) => {
  try {
    const { [STORAGE_KEYS.CAPTURED_TRANSCRIPTS]: transcripts } =
      await chrome.storage.session.get([STORAGE_KEYS.CAPTURED_TRANSCRIPTS]);

    if (sendResponse) {
      sendResponse({
        success: true,
        transcripts: transcripts || {},
        count: Object.keys(transcripts || {}).length,
      });
    }
  } catch (error) {
    console.error("Error getting all transcripts:", error);
    if (sendResponse) sendResponse({ success: false, error: error.message });
  }
};

// Clear all captured transcripts
const clearAllTranscripts = async (sendResponse) => {
  try {
    await updateTranscripts(() => ({}));
    await chrome.action.setBadgeText({ text: "" });
    await chrome.action.setTitle({ title: "Extract YouTube Transcript" });

    if (sendResponse) sendResponse({ success: true });
  } catch (error) {
    console.error("Error clearing all transcripts:", error);
    if (sendResponse) sendResponse({ success: false, error: error.message });
  }
};

// -----------------------------------------------------------
// MV3-native: Message listener at module level

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Background received message:", message.action);

  // Handle messages asynchronously (with one-time initialization guard)
  (async () => {
    await ensureStorage();

    switch (message.action) {
      case ACTIONS.TRANSCRIPT_CAPTURED:
        await handleCapturedTranscript(
          message.data,
          message.videoId,
          sendResponse
        );
        break;

      case ACTIONS.GET_CAPTURED_TRANSCRIPT:
        await getCapturedTranscript(message.videoId, sendResponse);
        break;

      case ACTIONS.CLEAR_CAPTURED_TRANSCRIPT:
        await clearCapturedTranscript(message.videoId, sendResponse);
        break;

      case ACTIONS.CLEAR_PREVIOUS_VIDEO_TRANSCRIPTS:
        await clearPreviousVideoTranscripts(
          message.currentVideoId,
          sendResponse
        );
        break;

      case "setBadgeWaiting":
        await setBadgeWaiting(message.videoId, sendResponse);
        break;

      case ACTIONS.GET_ALL_CAPTURED_TRANSCRIPTS:
        await getAllCapturedTranscripts(sendResponse);
        break;

      case ACTIONS.CLEAR_ALL_TRANSCRIPTS:
        await clearAllTranscripts(sendResponse);
        break;

      default:
        console.log("Unknown message action:", message.action);
        if (sendResponse)
          sendResponse({ success: false, error: "Unknown action" });
    }
  })();

  return true; // Will respond asynchronously
});

// Handle notification clicks
chrome.notifications.onClicked.addListener((notificationId) => {
  if (notificationId === "transcript-captured") {
    chrome.notifications.clear(notificationId);
    chrome.action.openPopup().catch(() => {
      chrome.tabs.create({
        url: chrome.runtime.getURL("popup.html?notification=true"),
        active: true,
      });
    });
  }
});

// Initialize only on lifecycle events (prevents race condition)
console.log("🚀 MV3-native background service worker loaded");

// Handle service worker lifecycle
chrome.runtime.onStartup.addListener(ensureStorage);
chrome.runtime.onInstalled.addListener((details) => {
  console.log("📦 Extension installed/updated");
  ensureStorage();

  // Show helpful tip on first install about pinning to toolbar
  if (details.reason === "install") {
    chrome.notifications.getPermissionLevel((level) => {
      if (level === "granted") {
        chrome.notifications.create("pin-tip", {
          type: "basic",
          iconUrl: "icons/icon128.png",
          title: "YouTube Transcript Extractor Installed!",
          message:
            "Tip: Pin this extension to your toolbar for quick access. Click the puzzle piece icon → pin icon.",
          priority: 1,
        });
      }
    });
  }
});
