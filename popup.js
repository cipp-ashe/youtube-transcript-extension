// YouTube Transcript Extractor - Popup Script (2025 Enhanced)
class YouTubeTranscriptPopup {
  constructor() {
    this.currentVideoData = null;
    this.currentTranscript = null;
    this.isTimestampMode = false;
    this.hasCapturedTranscript = false;

    // Bind handlers
    this.handlePopupUnload = this.handlePopupUnload.bind(this);
    this.dismissCapturedTranscript = this.dismissCapturedTranscript.bind(this);

    this.init();
  }

  // -----------------------------------------------------------
  // Initialization
  init() {
    this.bindEvents();
    this.checkForCapturedTranscript();
    this.checkCurrentPage();
  }

  // -----------------------------------------------------------
  // Event bindings
  bindEvents() {
    const byId = (id) => document.getElementById(id);

    const clickMap = {
      "retry-btn": () => this.checkCurrentPage(),
      "refresh-btn": () => this.checkCurrentPage(),
      "refresh-no-transcripts": () => this.checkCurrentPage(),
      "extract-btn": () => this.extractTranscript(),
      "copy-btn": () => this.copyToClipboard(),
      "download-btn": () => this.downloadTranscript(),
      "extract-another": () => this.showVideoInfo(),
    };

    for (const [id, handler] of Object.entries(clickMap)) {
      const el = byId(id);
      if (el) el.addEventListener("click", handler);
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
      "not-youtube",
    ];

    for (const id of sections) {
      const el = document.getElementById(id);
      if (!el) continue;
      el.classList.toggle("hidden", id !== sectionId);
    }
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
  async checkForCapturedTranscript() {
    try {
      const response = await chrome.runtime.sendMessage({
        action: "getCapturedTranscript",
      });

      if (response?.success && response.transcript) {
        console.log("📋 Found captured transcript on popup open");
        this.currentTranscript = response.transcript;
        this.hasCapturedTranscript = true;

        this.showCapturedBanner();

        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });

        if (tab?.url?.includes("youtube.com/watch")) {
          const videoResponse = await chrome.tabs.sendMessage(tab.id, {
            action: "getVideoInfo",
          });

          if (videoResponse?.success) {
            this.currentVideoData = videoResponse.data;
            this.displayTranscriptResults(response.transcript);
            return;
          }
        }
      }
    } catch {
      console.log("No captured transcript found");
    }
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
      chrome.runtime.sendMessage({ action: "clearCapturedTranscript" });
    } catch (_) {}
    this.hasCapturedTranscript = false;
    this.hideCapturedBanner();
  }

  handlePopupUnload() {
    try {
      if (this.hasCapturedTranscript) {
        // More reliable unload signaling
        if (navigator.sendBeacon) {
          navigator.sendBeacon(
            "chrome-extension://" + chrome.runtime.id + "/",
            JSON.stringify({ action: "clearCapturedTranscript" })
          );
        } else {
          this.dismissCapturedTranscript();
        }
      }
    } catch (_) {
      /* ignore unload errors */
    }
  }

  // -----------------------------------------------------------
  // YouTube page + video info
  async checkCurrentPage() {
    try {
      this.showLoading();
      const [currentTab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!currentTab?.url?.includes("youtube.com/watch")) {
        this.showSection("not-youtube");
        return;
      }

      const response = await chrome.tabs.sendMessage(currentTab.id, {
        action: "getVideoInfo",
      });

      if (response?.success) {
        this.currentVideoData = response.data;
        this.displayVideoInfo(response.data);
      } else {
        this.showError(response?.error || "Failed to get video information");
      }
    } catch (error) {
      console.error("Error checking current page:", error);
      this.showError(
        "Unable to connect to YouTube. Refresh the video page and try again."
      );
    }
  }

  // -----------------------------------------------------------
  // Video info display
  displayVideoInfo(videoData) {
    // ✅ NEW: guard against missing captionTracks
    if (
      !Array.isArray(videoData.captionTracks) ||
      !videoData.captionTracks.length
    ) {
      this.showSection("no-transcripts");
      return;
    }

    // existing logic continues as-is below
    document.getElementById("video-title").textContent =
      videoData.title || "Unknown Title";
    document.getElementById("video-id-display").textContent =
      videoData.videoId || "-";

    if (!videoData.hasTranscripts) {
      this.showSection("no-transcripts");
      return;
    }

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
    document.getElementById("language-info").textContent =
      transcriptData.language;
    document.getElementById("type-info").textContent =
      transcriptData.isAutoGenerated ? "Auto-generated" : "Manual";
    document.getElementById(
      "word-count"
    ).textContent = `${transcriptData.wordCount} words`;

    this.updateTranscriptDisplay();
    document.getElementById("timestamp-toggle").checked = false;
    this.isTimestampMode = false;

    this.showSection("results");
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

  downloadTranscript() {
    if (!this.currentTranscript || !this.currentVideoData) return;

    const transcriptText = this.isTimestampMode
      ? this.currentTranscript.timestampedTranscript
      : this.currentTranscript.transcript;

    const metadata = [
      "YouTube Transcript",
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

    const blob = new Blob([metadata + transcriptText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const safeTitle = (this.currentVideoData.title || "youtube_transcript")
      .replace(/[^a-z0-9]/gi, "_")
      .replace(/_+/g, "_") // collapse double underscores
      .toLowerCase()
      .substring(0, 50);

    const filename = `youtube_transcript_${safeTitle}_${this.currentVideoData.videoId}.txt`;

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
}

// -----------------------------------------------------------
// Initialize popup
document.addEventListener("DOMContentLoaded", () => {
  new YouTubeTranscriptPopup();
});
