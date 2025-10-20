// YouTube Transcript Extractor - Popup Script
class YouTubeTranscriptPopup {
  constructor() {
    this.currentVideoData = null;
    this.currentTranscript = null;
    this.isTimestampMode = false;
    this.hasCapturedTranscript = false;
    this.handlePopupUnload = this.handlePopupUnload.bind(this);
    this.dismissCapturedTranscript = this.dismissCapturedTranscript.bind(this);
    this.init();
  }

  init() {
    this.bindEvents();
    this.checkForCapturedTranscript();
    this.checkCurrentPage();
  }

  // Bind all event listeners
  bindEvents() {
    // Button events
    document.getElementById("retry-btn").addEventListener("click", () => {
      this.checkCurrentPage();
    });

    document.getElementById("refresh-btn").addEventListener("click", () => {
      this.checkCurrentPage();
    });

    document
      .getElementById("refresh-no-transcripts")
      .addEventListener("click", () => {
        this.checkCurrentPage();
      });

    document.getElementById("extract-btn").addEventListener("click", () => {
      this.extractTranscript();
    });

    document.getElementById("copy-btn").addEventListener("click", () => {
      this.copyToClipboard();
    });

    document.getElementById("download-btn").addEventListener("click", () => {
      this.downloadTranscript();
    });

    document.getElementById("extract-another").addEventListener("click", () => {
      this.showVideoInfo();
    });

    // Timestamp toggle
    document
      .getElementById("timestamp-toggle")
      .addEventListener("change", (e) => {
        this.isTimestampMode = e.target.checked;
        this.updateTranscriptDisplay();
      });

    // Language selection
    document
      .getElementById("language-select")
      .addEventListener("change", (e) => {
        const extractBtn = document.getElementById("extract-btn");
        extractBtn.disabled = !e.target.value;
      });

    const dismissButton = document.getElementById("dismiss-captured");
    if (dismissButton) {
      dismissButton.addEventListener("click", this.dismissCapturedTranscript);
    }

    window.addEventListener("unload", this.handlePopupUnload);
  }

  // Show/hide different sections
  showSection(sectionId) {
    const sections = [
      "loading",
      "error",
      "video-info",
      "no-transcripts",
      "results",
      "not-youtube",
    ];

    sections.forEach((id) => {
      const element = document.getElementById(id);
      if (element) {
        if (id === sectionId) {
          element.classList.remove("hidden");
        } else {
          element.classList.add("hidden");
        }
      }
    });
  }

  // Show loading state
  showLoading(message = "Loading video information...") {
    this.showSection("loading");
    const loadingText = document.querySelector("#loading p");
    if (loadingText) {
      loadingText.textContent = message;
    }
  }

  // Show error state
  showError(message) {
    this.showSection("error");
    document.getElementById("error-message").textContent = message;
  }

  // Check for previously captured transcripts when popup opens
  async checkForCapturedTranscript() {
    try {
      const response = await chrome.runtime.sendMessage({
        action: "getCapturedTranscript",
      });

      if (response && response.success && response.transcript) {
        console.log("📋 Found captured transcript on popup open");

        // Store and display the captured transcript
        this.currentTranscript = response.transcript;
        this.hasCapturedTranscript = true;

        // Show the captured banner
        this.showCapturedBanner();

        // We need video data to display properly, so let's get it first
        const tabs = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });

        if (tabs[0] && tabs[0].url.includes("youtube.com/watch")) {
          const videoResponse = await chrome.tabs.sendMessage(tabs[0].id, {
            action: "getVideoInfo",
          });

          if (videoResponse && videoResponse.success) {
            this.currentVideoData = videoResponse.data;
            this.displayTranscriptResults(response.transcript);
            return; // Skip normal page checking
          }
        }
      }
    } catch (error) {
      // No captured transcript or error - this is normal
      console.log("No captured transcript found");
    }
  }

  // Show the transcript captured banner
  showCapturedBanner() {
    const banner = document.getElementById("transcript-captured-banner");
    const infoNotice = document.querySelector(".info-notice");

    if (banner) {
      banner.classList.remove("hidden");
    }

    // Hide the tip notice when transcript is captured
    if (infoNotice) {
      infoNotice.classList.add("hidden");
    }
  }

  // Hide the transcript captured banner
  hideCapturedBanner() {
    const banner = document.getElementById("transcript-captured-banner");
    const infoNotice = document.querySelector(".info-notice");

    if (banner) {
      banner.classList.add("hidden");
    }

    // Show the tip notice again
    if (infoNotice) {
      infoNotice.classList.remove("hidden");
    }
  }

  dismissCapturedTranscript() {
    if (!this.hasCapturedTranscript) {
      return;
    }

    chrome.runtime.sendMessage({ action: "clearCapturedTranscript" });
    this.hasCapturedTranscript = false;
    this.hideCapturedBanner();
  }

  handlePopupUnload() {
    if (this.hasCapturedTranscript) {
      this.dismissCapturedTranscript();
    }
  }

  // Check if current page is YouTube and get video info
  async checkCurrentPage() {
    try {
      this.showLoading();

      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      const currentTab = tabs[0];

      if (!currentTab.url.includes("youtube.com/watch")) {
        this.showSection("not-youtube");
        return;
      }

      // Send message to content script to get video info
      const response = await chrome.tabs.sendMessage(currentTab.id, {
        action: "getVideoInfo",
      });

      if (response && response.success) {
        this.currentVideoData = response.data;
        this.displayVideoInfo(response.data);
      } else {
        this.showError(response?.error || "Failed to get video information");
      }
    } catch (error) {
      console.error("Error checking current page:", error);
      this.showError(
        "Unable to connect to YouTube page. Please refresh the page and try again."
      );
    }
  }

  // Display video information and language options
  displayVideoInfo(videoData) {
    document.getElementById("video-title").textContent = videoData.title;
    document.getElementById("video-id-display").textContent = videoData.videoId;

    if (!videoData.hasTranscripts) {
      this.showSection("no-transcripts");
      return;
    }

    // Populate language selector
    const languageSelect = document.getElementById("language-select");
    const languageSelection = document.getElementById("language-selection");

    // Clear existing options
    languageSelect.innerHTML = '<option value="">Select a language...</option>';

    // Add available languages
    videoData.captionTracks.forEach((track) => {
      const option = document.createElement("option");
      option.value = JSON.stringify(track);
      option.textContent = `${track.name} ${
        track.isAutoGenerated ? "(Auto-generated)" : "(Manual)"
      }`;
      languageSelect.appendChild(option);
    });

    // Show/hide language selector based on available options
    if (videoData.captionTracks.length > 1) {
      languageSelection.classList.remove("hidden");
      document.getElementById("extract-btn").disabled = true;
    } else {
      languageSelection.classList.add("hidden");
      // Auto-select the only available language
      languageSelect.value = JSON.stringify(videoData.captionTracks[0]);
      document.getElementById("extract-btn").disabled = false;
    }

    this.showVideoInfo();
  }

  // Show video info section
  showVideoInfo() {
    this.showSection("video-info");
  }

  // Extract transcript from selected language
  async extractTranscript() {
    try {
      const languageSelect = document.getElementById("language-select");
      const selectedTrack = JSON.parse(languageSelect.value);

      if (!selectedTrack) {
        this.showError("Please select a language first");
        return;
      }

      this.showLoading("Extracting transcript...");

      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      const currentTab = tabs[0];

      const response = await chrome.tabs.sendMessage(currentTab.id, {
        action: "fetchTranscript",
        captionTrack: selectedTrack,
      });

      if (response && response.success) {
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

  // Display transcript results
  displayTranscriptResults(transcriptData) {
    // Update info badges
    document.getElementById("language-info").textContent =
      transcriptData.language;
    document.getElementById("type-info").textContent =
      transcriptData.isAutoGenerated ? "Auto-generated" : "Manual";
    document.getElementById(
      "word-count"
    ).textContent = `${transcriptData.wordCount} words`;

    // Set transcript text
    this.updateTranscriptDisplay();

    // Reset timestamp toggle
    document.getElementById("timestamp-toggle").checked = false;
    this.isTimestampMode = false;

    this.showSection("results");
  }

  // Update transcript display based on timestamp toggle
  updateTranscriptDisplay() {
    if (!this.currentTranscript) return;

    const transcriptTextarea = document.getElementById("transcript-text");
    const text = this.isTimestampMode
      ? this.currentTranscript.timestampedTranscript
      : this.currentTranscript.transcript;

    transcriptTextarea.value = text;

    // Auto-resize textarea
    transcriptTextarea.style.height = "auto";
    transcriptTextarea.style.height = transcriptTextarea.scrollHeight + "px";
  }

  // Copy transcript to clipboard
  async copyToClipboard() {
    try {
      const transcriptText = document.getElementById("transcript-text").value;
      await navigator.clipboard.writeText(transcriptText);

      // Show success message
      const successMsg = document.getElementById("copy-success");
      successMsg.classList.remove("hidden");
      setTimeout(() => {
        successMsg.classList.add("hidden");
      }, 2000);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
      // Fallback for older browsers
      this.fallbackCopyToClipboard();
    }
  }

  // Fallback copy method for older browsers
  fallbackCopyToClipboard() {
    const transcriptTextarea = document.getElementById("transcript-text");
    transcriptTextarea.select();
    transcriptTextarea.setSelectionRange(0, 99999); // For mobile devices

    try {
      document.execCommand("copy");
      const successMsg = document.getElementById("copy-success");
      successMsg.classList.remove("hidden");
      setTimeout(() => {
        successMsg.classList.add("hidden");
      }, 2000);
    } catch (error) {
      console.error("Fallback copy failed:", error);
      alert("Copy failed. Please select the text and copy manually.");
    }
  }

  // Download transcript as text file
  downloadTranscript() {
    if (!this.currentTranscript || !this.currentVideoData) return;

    const transcriptText = this.isTimestampMode
      ? this.currentTranscript.timestampedTranscript
      : this.currentTranscript.transcript;

    // Create file content with metadata
    const metadata = [
      `YouTube Transcript`,
      `Video: ${this.currentVideoData.title}`,
      `Video ID: ${this.currentVideoData.videoId}`,
      `Language: ${this.currentTranscript.language}`,
      `Type: ${
        this.currentTranscript.isAutoGenerated ? "Auto-generated" : "Manual"
      }`,
      `Word Count: ${this.currentTranscript.wordCount}`,
      `Extracted: ${new Date().toLocaleString()}`,
      "",
      "--- TRANSCRIPT ---",
      "",
    ].join("\n");

    const fullContent = metadata + transcriptText;

    // Create and download file
    const blob = new Blob([fullContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    // Create safe filename
    const safeTitle = this.currentVideoData.title
      .replace(/[^a-z0-9]/gi, "_")
      .toLowerCase()
      .substring(0, 50);

    const filename = `youtube_transcript_${safeTitle}_${this.currentVideoData.videoId}.txt`;

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// Initialize popup when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new YouTubeTranscriptPopup();
});
