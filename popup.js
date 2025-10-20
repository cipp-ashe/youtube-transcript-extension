// YouTube Transcript Extractor - Popup Script (2025 Enhanced)
class YouTubeTranscriptPopup {
  constructor() {
    this.currentVideoData = null;
    this.currentTranscript = null;
    this.isTimestampMode = false;
    this.hasCapturedTranscript = false;

    // Bind handlers (critical for MV3 message handling)
    this.handlePopupUnload = this.handlePopupUnload.bind(this);
    this.dismissCapturedTranscript = this.dismissCapturedTranscript.bind(this);
    this.enableAutoCapture = this.enableAutoCapture.bind(this);
    this.handleBackgroundMessages = this.handleBackgroundMessages.bind(this);

    this.init();
  }

  // -----------------------------------------------------------
  // Initialization
  async init() {
    console.log("🚀 Popup initialization starting");
    console.log("� CSP Debug - document.location:", document.location.href);
    console.log("🔍 CSP Debug - checking for inline handlers in DOM");

    // Check for any inline event handlers that might cause CSP violations
    const elementsWithInlineHandlers = document.querySelectorAll(
      "[onclick], [onload], [onerror]"
    );
    if (elementsWithInlineHandlers.length > 0) {
      console.warn(
        "⚠️ Found elements with inline event handlers:",
        elementsWithInlineHandlers
      );
    } else {
      console.log("✅ No inline event handlers found in popup.html");
    }

    this.bindEvents();
    this.setupBackgroundMessageListener();

    // Improved flow: Check for any transcripts first, then current video
    try {
      // First, check if we have any captured transcripts at all
      const allTranscriptsResponse = await this.safeSendMessage({
        action: "getAllCapturedTranscripts",
      });

      const hasAnyTranscripts =
        allTranscriptsResponse?.success &&
        allTranscriptsResponse.transcripts &&
        Object.keys(allTranscriptsResponse.transcripts).length > 0;

      const videoId = await this.getCurrentVideoId();

      if (!videoId) {
        // Not on a video page - show transcript list if available, otherwise show navigation message
        if (hasAnyTranscripts) {
          console.log(
            "📋 Not on video page but have transcripts - showing list"
          );
          this.showTranscriptList();
        } else {
          this.showSection("not-youtube");
        }
        return;
      }

      console.log(`🎯 Popup opened for video: ${videoId}`);

      // Check for captured transcript for current video
      const hasCurrentTranscript = await this.checkForCapturedTranscript(
        videoId
      );
      if (hasCurrentTranscript) {
        console.log("📋 Showing current video transcript");
        return; // Already displayed
      }

      // No current transcript - show overview with options
      await this.showVideoOverview(videoId, hasAnyTranscripts);
    } catch (error) {
      console.error("Error during popup initialization:", error);
      this.showError("Extension initialization failed. Please try again.");
    }
  }

  // Simple method to get current video ID from URL
  async getCurrentVideoId() {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab?.url?.includes("youtube.com/watch")) {
        return null;
      }

      const urlParams = new URLSearchParams(new URL(tab.url).search);
      return urlParams.get("v");
    } catch (error) {
      console.error("Error getting video ID:", error);
      return null;
    }
  }

  // Setup listener for messages from background service worker
  setupBackgroundMessageListener() {
    chrome.runtime.onMessage.addListener(this.handleBackgroundMessages);
  }

  // Handle messages from background service worker
  handleBackgroundMessages(message, sender, sendResponse) {
    // Currently no background messages needed since inject.js handles auto-capture automatically
    console.log("📡 Received background message:", message.action);
  }

  // -----------------------------------------------------------
  // Event bindings
  bindEvents() {
    console.log("🔗 Binding popup events via addEventListener (CSP compliant)");
    const byId = (id) => document.getElementById(id);

    const clickMap = {
      "retry-btn": () => this.init(),
      "refresh-btn": () => this.init(),
      "enable-auto-capture": this.enableAutoCapture,
      "extract-btn": () => this.extractTranscript(),
      // Note: download-btn and copy-btn are handled in bindResultsEvents()
      "extract-another": () => this.showTranscriptList(), // Show list instead of restarting
      "refresh-list": () => this.showTranscriptList(),
      "download-all-btn": () => this.showDownloadAllModal(),
      "confirm-download-all": () => this.executeDownloadAll(),
      "cancel-download-all": () => this.hideDownloadAllModal(),
      "confirm-single-download": () => this.executeSingleDownload(),
      "cancel-single-download": () => this.hideSingleDownloadModal(),
      "clear-all-transcripts": () => this.clearAllTranscripts(),
    };

    for (const [id, handler] of Object.entries(clickMap)) {
      const el = byId(id);
      if (el) {
        console.log(`✅ Bound event listener for: ${id}`);
        el.addEventListener("click", handler);
      } else {
        console.log(`⚠️ Element not found for ID: ${id}`);
      }
    }

    // Timestamp toggle
    byId("timestamp-toggle")?.addEventListener("change", (e) => {
      this.isTimestampMode = e.target.checked;
      this.updateTranscriptDisplay();
    });

    // Language select
    byId("language-select")?.addEventListener("change", (e) => {
      const extractBtn = byId("extract-btn");
      if (extractBtn) {
        const disabled = !e.target.value;
        extractBtn.disabled = disabled;
        extractBtn.setAttribute("aria-disabled", disabled);
      }
    });

    // Dismiss captured banner
    const dismissButton = byId("dismiss-captured");
    if (dismissButton) {
      dismissButton.addEventListener("click", this.dismissCapturedTranscript);
    }

    // Hide success banner when user clicks elsewhere
    document.addEventListener("click", (e) => {
      const msg = document.getElementById("copy-success");
      if (!msg || msg.classList.contains("hidden")) return;

      // Don’t hide if clicking the Copy button itself
      if (!e.target.closest("#copy-btn")) {
        msg.classList.add("hidden");
      }
    });

    window.addEventListener("unload", this.handlePopupUnload);
  }

  // -----------------------------------------------------------
  // Section visibility
  showSection(sectionId) {
    const sections = [
      "loading",
      "error",
      "video-info",
      "no-transcripts",
      "results",
      "transcript-list",
      "not-youtube",
    ];

    // Hide all main sections
    for (const id of sections) {
      const el = document.getElementById(id);
      if (!el) continue;
      el.classList.toggle("hidden", id !== sectionId);
    }

    // Always hide all modals when switching sections
    const modals = ["single-download-modal", "download-all-modal"];

    for (const modalId of modals) {
      const modal = document.getElementById(modalId);
      if (modal) {
        modal.classList.add("hidden");
      }
    }

    // Clear any pending download state when switching sections
    this.pendingDownloadTranscript = null;
    this.pendingDownloadTranscripts = null;
    this.downloadMode = null;
  }

  showLoading(message = "Loading video information...") {
    this.showSection("loading");
    const p = document.querySelector("#loading p");
    if (!p) return;
    p.textContent = message;
  }

  showError(message) {
    this.showSection("error");
    const msg = document.getElementById("error-message");
    if (msg) msg.textContent = message || "Something went wrong";
  }

  // -----------------------------------------------------------
  // Captured transcript handling
  // Simplified: Check for captured transcript for specific video ID
  async checkForCapturedTranscript(videoId) {
    try {
      console.log(`🔍 Checking for captured transcript for video: ${videoId}`);

      const response = await this.safeSendMessage({
        action: "getCapturedTranscript",
        videoId: videoId,
      });

      console.log(`📋 Background response:`, response);

      if (response?.success && response.transcript) {
        console.log("✅ Found captured transcript, displaying results");
        this.currentTranscript = response.transcript;
        this.currentVideoData = {
          videoId: videoId,
          title: response.transcript.title || "Auto-captured Video",
        };
        this.hasCapturedTranscript = true;
        this.displayTranscriptResults(response.transcript);
        return true;
      }

      console.log("❌ No captured transcript found");
      return false;
    } catch (error) {
      console.error("Error checking for captured transcript:", error);
      return false;
    }
  }

  // Show video overview with better UX
  async showVideoOverview(videoId, hasOtherTranscripts) {
    try {
      console.log(`🎯 Showing video overview for: ${videoId}`);

      // Try to get video info from content script
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      let videoTitle = "YouTube Video";
      let hasManualTranscripts = false;

      try {
        const videoResponse = await chrome.tabs.sendMessage(tab.id, {
          action: "getVideoInfo",
        });

        if (videoResponse?.success && videoResponse.data) {
          videoTitle = videoResponse.data.title || videoTitle;
          hasManualTranscripts = videoResponse.data.hasTranscripts;

          if (hasManualTranscripts) {
            console.log("✅ Manual extraction possible, showing video info");
            this.currentVideoData = videoResponse.data;
            this.displayVideoInfo(videoResponse.data);
            return;
          }
        }
      } catch (error) {
        console.log("Content script not ready or manual extraction failed");
      }

      // Set current video data
      this.currentVideoData = { videoId: videoId, title: videoTitle };

      // Show overview with auto-capture option and navigation
      this.showVideoOverviewUI(hasOtherTranscripts);
    } catch (error) {
      console.error("Error showing video overview:", error);
      this.showError("Failed to load video information");
    }
  }

  // Show improved video overview UI
  showVideoOverviewUI(hasOtherTranscripts) {
    // Update the no-transcripts section to be more helpful
    const noTranscriptsSection = document.getElementById("no-transcripts");
    if (!noTranscriptsSection) return;

    // Add navigation to transcript list if user has other transcripts
    const existingNavigation = noTranscriptsSection.querySelector(
      ".transcript-navigation"
    );
    if (hasOtherTranscripts && !existingNavigation) {
      const navigation = document.createElement("div");
      navigation.className = "transcript-navigation";
      navigation.innerHTML = `
        <div class="info-notice" style="margin-bottom: 20px; background: var(--blue-50); border-left: 4px solid var(--primary);">
          <p><strong>💡 You have captured transcripts!</strong></p>
          <p>View your previously captured transcripts while this video loads auto-capture.</p>
          <button id="view-transcript-list-btn" class="btn btn-primary" style="margin-top: 10px;">
            View Transcript List
          </button>
        </div>
      `;

      // Insert at the top of the section
      const emptyState = noTranscriptsSection.querySelector(".empty-state");
      if (emptyState) {
        emptyState.insertBefore(navigation, emptyState.firstChild);

        // Bind the button
        const viewListBtn = navigation.querySelector(
          "#view-transcript-list-btn"
        );
        if (viewListBtn) {
          viewListBtn.addEventListener("click", () =>
            this.showTranscriptList()
          );
        }
      }
    }

    this.showSection("no-transcripts");
  }

  // Legacy method - kept for compatibility
  async checkManualExtraction(videoId) {
    await this.showVideoOverview(videoId, false);
  }

  // MV3-compliant utility for safe message sending
  async safeSendMessage(message) {
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
  }

  showCapturedBanner() {
    document
      .getElementById("transcript-captured-banner")
      ?.classList.remove("hidden");
    document.querySelector(".info-notice")?.classList.add("hidden");
  }

  hideCapturedBanner() {
    document
      .getElementById("transcript-captured-banner")
      ?.classList.add("hidden");
    document.querySelector(".info-notice")?.classList.remove("hidden");
  }

  dismissCapturedTranscript() {
    if (!this.hasCapturedTranscript) return;
    try {
      chrome.runtime.sendMessage({
        action: "clearCapturedTranscript",
        videoId: this.currentVideoData?.videoId,
      });
    } catch (_) {}
    this.hasCapturedTranscript = false;
    this.hideCapturedBanner();
  }

  handlePopupUnload() {
    try {
      // Clean up background message listener
      chrome.runtime.onMessage.removeListener(this.handleBackgroundMessages);

      // Auto-capture is always-on via inject.js; no background cleanup needed
    } catch (_) {
      /* ignore unload errors */
    }
  }

  // -----------------------------------------------------------
  // Video info display with automatic extraction handling
  displayVideoInfo(videoData) {
    // Auto-capture is always-on via inject.js; nothing to stop between videos

    // Set basic video info
    document.getElementById("video-title").textContent =
      videoData.title || "Unknown Title";
    document.getElementById("video-id-display").textContent =
      videoData.videoId || "-";

    // Handle case where manual extraction succeeded automatically
    if (videoData.extractedTranscript) {
      console.log(
        "✅ Manual extraction succeeded automatically, showing results"
      );
      this.currentTranscript = videoData.extractedTranscript;
      this.displayTranscriptResults(videoData.extractedTranscript);
      return;
    }

    // Handle case where no caption tracks were found or manual extraction failed
    if (
      videoData.noTracksFound ||
      videoData.manualExtractionFailed ||
      !videoData.hasTranscripts
    ) {
      console.log("❌ Manual extraction not possible, guiding to auto-capture");
      this.showSection("no-transcripts");
      return;
    }

    // Traditional manual extraction flow (if somehow we get here)
    const languageSelect = document.getElementById("language-select");
    const languageSelection = document.getElementById("language-selection");

    if (!languageSelect) return;

    languageSelect.innerHTML = '<option value="">Select a language…</option>';

    videoData.captionTracks.forEach((track) => {
      const option = document.createElement("option");
      option.value = JSON.stringify(track);
      option.textContent = `${track.name} ${
        track.isAutoGenerated ? "(Auto)" : "(Manual)"
      }`;
      languageSelect.appendChild(option);
    });

    if (videoData.captionTracks.length > 1) {
      languageSelection.classList.remove("hidden");
      document.getElementById("extract-btn").disabled = true;
    } else {
      languageSelection.classList.add("hidden");
      languageSelect.value = JSON.stringify(videoData.captionTracks[0]);
      document.getElementById("extract-btn").disabled = false;
    }

    this.showVideoInfo();
  }

  showVideoInfo() {
    this.showSection("video-info");
  }

  // -----------------------------------------------------------
  // Transcript extraction
  async extractTranscript() {
    try {
      const languageSelect = document.getElementById("language-select");
      if (!languageSelect?.value) {
        this.showError("Please select a language first");
        return;
      }

      const selectedTrack = JSON.parse(languageSelect.value);
      if (!selectedTrack) {
        this.showError("Invalid language track selected");
        return;
      }

      this.showLoading("Extracting transcript…");

      const [currentTab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!currentTab?.id) {
        this.showError("Unable to access current YouTube tab");
        return;
      }

      const response = await chrome.tabs.sendMessage(currentTab.id, {
        action: "fetchTranscript",
        captionTrack: selectedTrack,
      });

      if (response?.success) {
        this.currentTranscript = response.data;
        this.displayTranscriptResults(response.data);
      } else {
        this.showError(response?.error || "Failed to extract transcript");
      }
    } catch (error) {
      console.error("Error extracting transcript:", error);
      this.showError("Failed to extract transcript: " + error.message);
    }
  }

  // -----------------------------------------------------------
  // Transcript display
  displayTranscriptResults(transcriptData) {
    console.log("📄 Displaying transcript results:", transcriptData);

    try {
      document.getElementById("language-info").textContent =
        transcriptData.language || "Unknown";
      document.getElementById("type-info").textContent =
        transcriptData.isAutoGenerated ? "Auto-generated" : "Manual";
      document.getElementById("word-count").textContent = `${
        transcriptData.wordCount || 0
      } words`;

      this.updateTranscriptDisplay();
      document.getElementById("timestamp-toggle").checked = false;
      this.isTimestampMode = false;

      console.log("✅ Showing results section");
      this.showSection("results");

      // Ensure download button event is bound after section is shown
      this.bindResultsEvents();
    } catch (error) {
      console.error("❌ Error displaying transcript results:", error);
      this.showError("Failed to display transcript results");
    }
  }

  // Bind events specific to results section
  bindResultsEvents() {
    const downloadBtn = document.getElementById("download-btn");
    const copyBtn = document.getElementById("copy-btn");
    const timestampToggle = document.getElementById("timestamp-toggle");

    if (downloadBtn && !downloadBtn.hasAttribute("data-bound")) {
      downloadBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.showDownloadModal();
      });
      downloadBtn.setAttribute("data-bound", "true");
    }

    if (copyBtn && !copyBtn.hasAttribute("data-bound")) {
      copyBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.copyToClipboard();
      });
      copyBtn.setAttribute("data-bound", "true");
    }

    if (timestampToggle && !timestampToggle.hasAttribute("data-bound")) {
      timestampToggle.addEventListener("change", () => {
        this.isTimestampMode = timestampToggle.checked;
        this.updateTranscriptDisplay();
      });
      timestampToggle.setAttribute("data-bound", "true");
    }
  }

  updateTranscriptDisplay() {
    if (!this.currentTranscript) return;

    const textarea = document.getElementById("transcript-text");
    const text = this.isTimestampMode
      ? this.currentTranscript.timestampedTranscript
      : this.currentTranscript.transcript;

    textarea.value = text || "";
    textarea.style.height = "auto";
    textarea.style.height = textarea.scrollHeight + "px";
  }

  // -----------------------------------------------------------
  // Clipboard + file ops
  async copyToClipboard() {
    try {
      const transcriptText = document.getElementById("transcript-text").value;
      await navigator.clipboard.writeText(transcriptText);

      const msg = document.getElementById("copy-success");
      msg.classList.remove("hidden");
      msg.setAttribute("aria-live", "polite");

      setTimeout(() => msg.classList.add("hidden"), 2000);
    } catch (error) {
      console.error("Clipboard API failed:", error);
      this.fallbackCopyToClipboard();
    }
  }

  fallbackCopyToClipboard() {
    const textarea = document.getElementById("transcript-text");
    textarea.select();
    textarea.setSelectionRange(0, 99999);

    try {
      document.execCommand("copy");
      const msg = document.getElementById("copy-success");
      msg.classList.remove("hidden");
      setTimeout(() => msg.classList.add("hidden"), 2000);
    } catch (error) {
      console.error("Fallback copy failed:", error);
      alert("Copy failed. Please select the text and copy manually.");
    }
  }

  // Show download modal for individual transcript
  showDownloadModal() {
    console.log("🔘 Individual download button clicked");

    if (!this.currentTranscript || !this.currentVideoData) {
      this.showError("No transcript available to download");
      return;
    }

    // Set up pending download data (required for executeSingleDownload)
    this.pendingDownloadTranscript = {
      videoId: this.currentVideoData.videoId,
      title: this.currentVideoData.title,
      transcript: this.currentTranscript,
    };
    this.downloadMode = "single";

    // Update modal text
    document.getElementById(
      "single-download-text"
    ).textContent = `Ready to download "${this.currentVideoData.title}"`;

    // Show individual download modal
    document.getElementById("single-download-modal").classList.remove("hidden");
  }

  // Hide individual download modal
  hideSingleDownloadModal() {
    document.getElementById("single-download-modal").classList.add("hidden");
    this.pendingDownloadTranscript = null;
    this.downloadMode = null;
  }

  // Execute single transcript download
  async executeSingleDownload() {
    try {
      if (!this.pendingDownloadTranscript) {
        this.showError("No transcript prepared for download");
        return;
      }

      // Get user selections from SINGLE download modal
      const format = document.getElementById("single-format-select").value;
      const includeTimestamps = document.getElementById(
        "single-include-timestamps"
      ).checked;

      console.log(
        `📥 Downloading single transcript as ${format.toUpperCase()}, timestamps: ${includeTimestamps}`
      );

      // Create single transcript object in the format expected by generators
      const transcripts = {
        [this.pendingDownloadTranscript.videoId]:
          this.pendingDownloadTranscript.transcript,
      };

      // Generate download content based on format
      let content;
      let filename;
      let mimeType;

      const safeTitle = (
        this.pendingDownloadTranscript.title || "youtube_transcript"
      )
        .replace(/[^a-z0-9]/gi, "_")
        .replace(/_+/g, "_")
        .toLowerCase()
        .substring(0, 50);

      switch (format) {
        case "json":
          content = this.generateJSONDownload(transcripts, includeTimestamps);
          filename = `${safeTitle}_${this.pendingDownloadTranscript.videoId}.json`;
          mimeType = "application/json";
          break;
        case "md":
          content = this.generateMarkdownDownload(
            transcripts,
            includeTimestamps
          );
          filename = `${safeTitle}_${this.pendingDownloadTranscript.videoId}.md`;
          mimeType = "text/markdown";
          break;
        case "txt":
        default:
          content = this.generateTextDownload(transcripts, includeTimestamps);
          filename = `${safeTitle}_${this.pendingDownloadTranscript.videoId}.txt`;
          mimeType = "text/plain";
          break;
      }

      // Trigger download
      this.triggerDownload(content, filename, mimeType);

      // Hide modal and clean up
      this.hideSingleDownloadModal();

      console.log(`✅ Downloaded single transcript as ${format.toUpperCase()}`);
    } catch (error) {
      console.error("Error downloading transcript:", error);
      this.showError("Failed to download transcript");
    }
  }

  // -----------------------------------------------------------
  // Auto-capture functionality

  // Auto-capture: Close popup and guide user to CC button (can't programmatically click due to security)
  // Better UX: Provide feedback and set waiting badge
  async enableAutoCapture() {
    if (!this.currentVideoData?.videoId) {
      console.error("No video ID available for auto-capture");
      return;
    }

    console.log("🎯 Starting auto-capture with clear user feedback");

    try {
      // Show loading state immediately
      this.showLoading("Setting up auto-capture...");

      // Set badge to indicate waiting state
      await this.safeSendMessage({
        action: "setBadgeWaiting",
        videoId: this.currentVideoData.videoId,
      });

      // Give more time for background setup and content script readiness
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Show immediate notification that auto-capture is active
      if (chrome.notifications) {
        chrome.notifications.create("auto-capture-started", {
          type: "basic",
          iconUrl: "icons/icon128.png",
          title: "Auto-Capture Ready",
          message:
            "Enable CC on the video player. The transcript will be captured automatically.",
          priority: 1,
        });
      }

      // Show success state briefly before closing
      const successEl = document.createElement("div");
      successEl.innerHTML = `
        <div style="text-align: center; padding: 20px;">
          <p style="color: var(--success); font-weight: 600;">🎯 Auto-capture is now active!</p>
          <p style="font-size: 14px; margin-top: 10px;">Enable CC on the video player to capture the transcript.</p>
        </div>
      `;

      const loadingSection = document.getElementById("loading");
      loadingSection.innerHTML = "";
      loadingSection.appendChild(successEl);

      // Close popup after user sees success message
      setTimeout(() => {
        window.close();
      }, 1500);
    } catch (error) {
      console.error("Error starting auto-capture:", error);
      this.showError("Failed to start auto-capture");
    }
  }

  // Show list of all captured transcripts
  async showTranscriptList() {
    try {
      console.log("📋 Showing transcript list");

      const response = await this.safeSendMessage({
        action: "getAllCapturedTranscripts",
      });

      if (response?.success) {
        this.displayTranscriptList(response.transcripts, response.count);
      } else {
        this.showError("Failed to load transcript list");
      }
    } catch (error) {
      console.error("Error loading transcript list:", error);
      this.showError("Failed to load transcript list");
    }
  }

  // Display the transcript list
  displayTranscriptList(transcripts, count) {
    console.log("📋 Displaying transcript list - count:", count);
    console.log("📋 Transcript data:", transcripts);

    const container = document.getElementById("transcript-items");

    if (count === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>No transcripts captured yet.</p>
          <p>Navigate to a YouTube video and use auto-capture to collect transcripts.</p>
        </div>
      `;
    } else {
      // Log each transcript structure to understand data format
      Object.entries(transcripts).forEach(([videoId, transcript]) => {
        console.log(`📋 Video ${videoId} transcript structure:`, transcript);
        console.log(`📋 Available properties:`, Object.keys(transcript));
        console.log(`📋 Title property:`, transcript.title);
      });

      container.innerHTML = Object.entries(transcripts)
        .map(([videoId, transcript]) => {
          // Use title if available, fallback to videoId
          const displayTitle = transcript.title || `Video: ${videoId}`;
          console.log(`📋 Display title for ${videoId}:`, displayTitle);

          return `
        <div class="transcript-item" data-video-id="${videoId}">
          <div class="transcript-meta">
            <h4>${displayTitle}</h4>
            <span class="transcript-info">${transcript.language} • ${transcript.wordCount} words</span>
          </div>
          <div class="transcript-actions">
            <button class="btn-small btn-primary view-transcript-btn" data-video-id="${videoId}">View</button>
            <button class="btn-small btn-secondary clear-transcript-btn" data-video-id="${videoId}">Clear</button>
          </div>
        </div>
      `;
        })
        .join("");

      // Add CSP-compliant event listeners after DOM insertion
      this.attachTranscriptListEventListeners();
    }

    this.showSection("transcript-list");
  }

  // Attach event listeners to transcript list buttons (CSP compliant)
  attachTranscriptListEventListeners() {
    console.log("🔗 Attaching transcript list event listeners (CSP compliant)");

    // View transcript buttons
    document.querySelectorAll(".view-transcript-btn").forEach((btn) => {
      const videoId = btn.dataset.videoId;
      console.log(`✅ Attaching view listener for video: ${videoId}`);
      btn.addEventListener("click", () => this.viewTranscript(videoId));
    });

    // Clear transcript buttons
    document.querySelectorAll(".clear-transcript-btn").forEach((btn) => {
      const videoId = btn.dataset.videoId;
      console.log(`✅ Attaching clear listener for video: ${videoId}`);
      btn.addEventListener("click", () => this.clearTranscript(videoId));
    });
  }

  // Clear all transcripts
  async clearAllTranscripts() {
    try {
      const response = await this.safeSendMessage({
        action: "clearAllTranscripts",
      });

      if (response?.success) {
        this.showTranscriptList(); // Refresh the list
      } else {
        this.showError("Failed to clear transcripts");
      }
    } catch (error) {
      console.error("Error clearing all transcripts:", error);
      this.showError("Failed to clear transcripts");
    }
  }

  // View specific transcript
  async viewTranscript(videoId) {
    try {
      const response = await this.safeSendMessage({
        action: "getCapturedTranscript",
        videoId: videoId,
      });

      if (response?.success && response.transcript) {
        this.currentTranscript = response.transcript;
        this.currentVideoData = {
          videoId: videoId,
          title: response.transcript.title || `Video ${videoId}`,
        };
        this.displayTranscriptResults(response.transcript);
      }
    } catch (error) {
      console.error("Error viewing transcript:", error);
    }
  }

  // Clear specific transcript
  async clearTranscript(videoId) {
    try {
      const response = await this.safeSendMessage({
        action: "clearCapturedTranscript",
        videoId: videoId,
      });

      if (response?.success) {
        this.showTranscriptList(); // Refresh the list
      }
    } catch (error) {
      console.error("Error clearing transcript:", error);
    }
  }

  // Show download all modal
  async showDownloadAllModal() {
    try {
      console.log("📥 Preparing download all modal");

      // Get all transcripts
      const response = await this.safeSendMessage({
        action: "getAllCapturedTranscripts",
      });

      if (!response?.success || !response.transcripts) {
        this.showError("No transcripts available to download");
        return;
      }

      const transcripts = response.transcripts;
      const transcriptCount = Object.keys(transcripts).length;

      if (transcriptCount === 0) {
        this.showError("No transcripts available to download");
        return;
      }

      // Store transcripts for download execution
      this.pendingDownloadTranscripts = transcripts;
      this.downloadMode = "multiple";

      // Update modal content
      document.getElementById(
        "download-all-count-text"
      ).textContent = `Ready to download ${transcriptCount} transcript${
        transcriptCount > 1 ? "s" : ""
      }`;

      // Show modal
      document.getElementById("download-all-modal").classList.remove("hidden");
    } catch (error) {
      console.error("Error preparing download modal:", error);
      this.showError("Failed to prepare download");
    }
  }

  // Hide download all modal
  hideDownloadAllModal() {
    document.getElementById("download-all-modal").classList.add("hidden");
    this.pendingDownloadTranscripts = null;
    this.downloadMode = null;
  }

  // Hide download modal (general method that works for both single and multiple)
  hideDownloadModal() {
    document.getElementById("download-all-modal").classList.add("hidden");
    document.getElementById("single-download-modal").classList.add("hidden");
    this.pendingDownloadTranscripts = null;
    this.pendingDownloadTranscript = null;
    this.downloadMode = null;
  }

  // Execute download all with selected options
  async executeDownloadAll() {
    try {
      if (!this.pendingDownloadTranscripts) {
        this.showError("No transcripts prepared for download");
        return;
      }

      // Get user selections from DOWNLOAD ALL modal
      const format = document.getElementById(
        "download-all-format-select"
      ).value;
      const includeTimestamps = document.getElementById(
        "download-all-timestamps"
      ).checked;
      const transcriptCount = Object.keys(
        this.pendingDownloadTranscripts
      ).length;

      console.log(
        `📥 Downloading ${transcriptCount} transcripts as ${format.toUpperCase()}, timestamps: ${includeTimestamps}`
      );

      // Generate download content based on format
      let content;
      let filename;
      let mimeType;

      switch (format) {
        case "json":
          content = this.generateJSONDownload(
            this.pendingDownloadTranscripts,
            includeTimestamps
          );
          filename = `youtube-transcripts-${
            new Date().toISOString().split("T")[0]
          }.json`;
          mimeType = "application/json";
          break;
        case "md":
          content = this.generateMarkdownDownload(
            this.pendingDownloadTranscripts,
            includeTimestamps
          );
          filename = `youtube-transcripts-${
            new Date().toISOString().split("T")[0]
          }.md`;
          mimeType = "text/markdown";
          break;
        case "txt":
        default:
          content = this.generateTextDownload(
            this.pendingDownloadTranscripts,
            includeTimestamps
          );
          filename = `youtube-transcripts-${
            new Date().toISOString().split("T")[0]
          }.txt`;
          mimeType = "text/plain";
          break;
      }

      // Trigger download
      this.triggerDownload(content, filename, mimeType);

      // Hide modal and clean up
      this.hideDownloadAllModal();

      console.log(
        `✅ Downloaded ${transcriptCount} transcripts as ${format.toUpperCase()}`
      );
    } catch (error) {
      console.error("Error downloading all transcripts:", error);
      this.showError("Failed to download transcripts");
    }
  }

  // Generate text format download
  generateTextDownload(transcripts, includeTimestamps) {
    let content = `YouTube Transcripts Export\nGenerated: ${new Date().toLocaleString()}\n\n`;
    content += `Total Videos: ${Object.keys(transcripts).length}\n`;
    content += "=".repeat(50) + "\n\n";

    Object.entries(transcripts).forEach(([videoId, transcript]) => {
      content += `Title: ${transcript.title || `Video ${videoId}`}\n`;
      content += `Video ID: ${videoId}\n`;
      content += `Language: ${transcript.language}\n`;
      content += `Word Count: ${transcript.wordCount}\n`;
      content += `Auto-generated: ${
        transcript.isAutoGenerated ? "Yes" : "No"
      }\n`;
      content += "-".repeat(30) + "\n";

      const text = includeTimestamps
        ? transcript.timestampedTranscript
        : transcript.transcript;

      content += text + "\n\n";
      content += "=".repeat(50) + "\n\n";
    });

    return content;
  }

  // Generate JSON format download with improved structure
  generateJSONDownload(transcripts, includeTimestamps) {
    const exportData = {
      metadata: {
        exportDate: new Date().toISOString(),
        totalVideos: Object.keys(transcripts).length,
        includeTimestamps: includeTimestamps,
        format: "YouTube Transcript Export v2.0",
      },
      videos: {},
    };

    Object.entries(transcripts).forEach(([videoId, transcript]) => {
      const videoData = {
        title: transcript.title || `Video ${videoId}`,
        videoId: videoId,
        metadata: {
          language: transcript.language,
          wordCount: transcript.wordCount,
          isAutoGenerated: transcript.isAutoGenerated,
          captureMethod: transcript.captureMethod || "Auto-capture",
        },
        content:
          includeTimestamps && transcript.segments
            ? {
                // Structured timeline format for timestamps
                timeline: transcript.segments.map((segment) => ({
                  timestamp: segment.start,
                  duration: segment.duration,
                  text: segment.text,
                  formatted: `${Math.floor(segment.start / 60)}:${Math.floor(
                    segment.start % 60
                  )
                    .toString()
                    .padStart(2, "0")}`,
                })),
                fullText: transcript.transcript,
              }
            : {
                // Simple text format without timestamps
                fullText: transcript.transcript,
              },
      };

      exportData.videos[videoId] = videoData;
    });

    return JSON.stringify(exportData, null, 2);
  }

  // Generate Markdown format download
  generateMarkdownDownload(transcripts, includeTimestamps) {
    let markdown = `# YouTube Transcripts Export\n\n`;
    markdown += `**Generated:** ${new Date().toLocaleString()}  \n`;
    markdown += `**Total Videos:** ${Object.keys(transcripts).length}  \n`;
    markdown += `**Include Timestamps:** ${
      includeTimestamps ? "Yes" : "No"
    }\n\n`;
    markdown += `---\n\n`;

    Object.entries(transcripts).forEach(([videoId, transcript]) => {
      const title = transcript.title || `Video ${videoId}`;

      markdown += `## ${title}\n\n`;
      markdown += `**Video ID:** \`${videoId}\`  \n`;
      markdown += `**Language:** ${transcript.language}  \n`;
      markdown += `**Word Count:** ${transcript.wordCount}  \n`;
      markdown += `**Auto-generated:** ${
        transcript.isAutoGenerated ? "Yes" : "No"
      }  \n`;
      markdown += `**YouTube URL:** https://www.youtube.com/watch?v=${videoId}\n\n`;

      if (includeTimestamps && transcript.segments) {
        markdown += `### Transcript with Timestamps\n\n`;
        transcript.segments.forEach((segment) => {
          const minutes = Math.floor(segment.start / 60);
          const seconds = Math.floor(segment.start % 60);
          const timestamp = `${minutes}:${seconds.toString().padStart(2, "0")}`;
          markdown += `**[${timestamp}]** ${segment.text}\n\n`;
        });
      } else {
        markdown += `### Transcript\n\n`;
        markdown += `${transcript.transcript}\n\n`;
      }

      markdown += `---\n\n`;
    });

    return markdown;
  }

  // Trigger file download
  triggerDownload(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.style.display = "none";

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
  }
}

window.transcriptPopup = null;

// -----------------------------------------------------------
// Initialize popup
document.addEventListener("DOMContentLoaded", () => {
  window.transcriptPopup = new YouTubeTranscriptPopup();
});
