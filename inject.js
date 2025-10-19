// YouTube Transcript Injected Script
// This script runs in the page context before YouTube's scripts load

(function () {
  console.log(
    "🎯 Injected script running - intercepting XMLHttpRequest and fetch"
  );

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
            console.log("🎯 Captured timedtext XHR request:", requestUrl);

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

  // Store original fetch
  const OriginalFetch = window.fetch;

  // Override fetch in page context
  window.fetch = async function (input, init) {
    const url = typeof input === "string" ? input : input.url;
    const response = await OriginalFetch.apply(this, arguments);

    // Intercept timedtext API calls
    if (url && url.includes("/api/timedtext") && response.ok) {
      try {
        const clone = response.clone();
        const text = await clone.text();

        console.log("🎯 Captured timedtext fetch request:", url);

        // Dispatch custom event with transcript data
        const event = new CustomEvent("youtubeTranscriptCaptured", {
          detail: {
            url: url,
            response: text,
            timestamp: Date.now(),
          },
        });
        document.dispatchEvent(event);
      } catch (error) {
        console.warn("Failed to capture fetch response:", error);
      }
    }

    return response;
  };

  console.log("✅ XMLHttpRequest and fetch overrides installed");
})();
