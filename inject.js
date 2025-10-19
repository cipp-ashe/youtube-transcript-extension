// YouTube Transcript Injected Script
// This script runs in the page context before YouTube's scripts load

(function () {
  console.log("🎯 Injected script running - intercepting XMLHttpRequest");

  // Store original XMLHttpRequest
  const OriginalXHR = window.XMLHttpRequest;

  // Override XMLHttpRequest in page context
  window.XMLHttpRequest = function () {
    const xhr = new OriginalXHR();
    const originalOpen = xhr.open;
    const originalSend = xhr.send;

    let requestUrl = "";

    xhr.open = function (method, url, ...args) {
      requestUrl = url;
      return originalOpen.apply(this, [method, url, ...args]);
    };

    xhr.send = function (...args) {
      // Listen for response
      this.addEventListener("readystatechange", function () {
        if (this.readyState === 4 && this.status === 200) {
          // cSpell:ignore timedtext
          if (requestUrl && requestUrl.includes("/api/timedtext")) {
            console.log("🎯 Captured timedtext request:", requestUrl);

            // Dispatch custom event with transcript data
            const event = new CustomEvent("youtubeTranscriptCaptured", {
              detail: {
                url: requestUrl,
                response: this.responseText,
                timestamp: Date.now(),
              },
            });
            document.dispatchEvent(event);
          }
        }
      });

      return originalSend.apply(this, args);
    };

    return xhr;
  };

  // Copy static properties and prototype
  Object.setPrototypeOf(window.XMLHttpRequest, OriginalXHR);
  Object.setPrototypeOf(window.XMLHttpRequest.prototype, OriginalXHR.prototype);

  console.log("✅ XMLHttpRequest override installed");
})();
