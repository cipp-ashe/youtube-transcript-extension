# YouTube Transcript Extractor

A Chrome extension that captures and extracts transcripts from YouTube videos, including auto-generated captions and unlisted videos.

## Features

### Auto-Capture Functionality

- **XHR/Fetch Interception**: Monitors YouTube's `/api/timedtext` API calls in real-time
- **Automatic Detection**: Captures transcripts when CC (closed captions) is enabled on videos
- **Background Notifications**: Shows browser notifications when transcripts are auto-captured
- **Badge Indicator**: Extension icon shows badge count when transcripts are available

### Manual Extraction

- **Video Information**: Extracts video ID, title, and available caption tracks from YouTube DOM
- **Language Selection**: Choose from available caption tracks (manual vs auto-generated)
- **Multiple Formats**: Supports both JSON3 (modern) and XML (legacy) transcript formats
- **Smart Parsing**: Automatically falls back to XML parsing if JSON parsing fails

### Transcript Processing

- **Format Options**: Plain text or timestamped versions (MM:SS format)
- **Word Count**: Displays total word count for extracted transcripts
- **Language Detection**: Shows language and type (manual/auto-generated) information
- **HTML Entity Decoding**: Properly decodes HTML entities in transcript text

### Export Options

- **Copy to Clipboard**: One-click copy with fallback for older browsers
- **Download as TXT**: Downloads formatted file with metadata header including video title, ID, language, type, word count, and extraction timestamp
- **Filename Format**: `youtube_transcript_[safe_title]_[video_id].txt`

## Architecture

### Component Structure

```
manifest.json          → Extension configuration (MV3)
├── background.js      → Service worker for storage/notifications
├── content.js         → Content script for YouTube DOM interaction
├── inject.js          → Page context script for API interception
├── popup.html/js/css  → Extension UI (500px fixed width)
└── icons/             → Extension icons (16, 48, 128px)
```

### Data Flow

1. **inject.js** runs in page context, overrides `XMLHttpRequest` and `fetch`
2. When YouTube requests `/api/timedtext`, inject.js captures the response
3. Custom DOM event `youtubeTranscriptCaptured` sent to content script
4. **content.js** processes transcript data and forwards to background
5. **background.js** stores transcript and creates notification/badge
6. **popup.js** retrieves stored transcript or manually fetches via content script

### Message Passing

- `getVideoInfo`: popup → content (get video details and caption tracks)
- `fetchTranscript`: popup → content (manual transcript extraction)
- `transcriptCaptured`: content → background (auto-captured transcript data)
- `getCapturedTranscript`: popup → background (retrieve stored transcript)
- `clearCapturedTranscript`: popup → background (clear stored data)

## Technical Implementation

### YouTube Integration

- **DOM Selectors**: Multiple fallback selectors for video title extraction
- **ytInitialPlayerResponse**: Extracts caption tracks from YouTube's player data
- **SPA Navigation**: Uses History API hooks (`pushState`, `replaceState`, `popstate`) instead of MutationObserver for better performance
- **URL Parameters**: Only adds `fmt=json3` parameter, preserves YouTube's original auth parameters

### Storage Strategy

- **Dual Storage**: Memory (`this.capturedTranscript`) + persistent (`chrome.storage.local`)
- **Service Worker Compatibility**: Handles service worker termination/restart
- **State Management**: Maintains video ID and caption tracks in content script

### UI States

- `loading`: Video information extraction
- `error`: Error display with retry option
- `video-info`: Video details and language selection
- `no-transcripts`: No captions available message
- `results`: Transcript display with options
- `not-youtube`: Non-YouTube page message

### Notification Handling

- **Popup Fallback**: If `chrome.action.openPopup()` fails, opens transcript viewer in new tab
- **Notification ID**: Uses `"transcript-captured"` identifier
- **Auto-Clear**: Notifications cleared on click

### Error Handling

- **Async Responses**: All message handlers return `true` for asynchronous responses
- **Fetch Failures**: Graceful fallback with HTTP status error messages
- **Parse Failures**: JSON parse errors fall back to XML parsing
- **Missing Elements**: Null checks for DOM elements and API responses

## Installation

This is a development extension that loads directly into Chrome:

1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the extension directory

## Permissions

- `activeTab`: Access current YouTube tab
- `storage`: Store captured transcripts
- `notifications`: Show capture notifications
- `*://*.youtube.com/*`: YouTube domain access

## File Structure

- **manifest.json**: MV3 configuration, runs content script at `document_start`
- **inject.js**: 86 lines, runs in page context via web_accessible_resources
- **content.js**: 420 lines, handles YouTube DOM interaction and API calls
- **background.js**: 213 lines, service worker for storage and notifications
- **popup.js**: 420 lines, manages UI state and user interactions
- **popup.html**: 146 lines, structured UI with 6 distinct states
- **popup.css**: 516 lines, responsive design with YouTube red theme

## Browser Compatibility

Requires Chrome/Chromium with Manifest V3 support. Uses modern APIs:

- `chrome.action` (MV3 replacement for `chrome.browserAction`)
- Service workers instead of background pages
- `chrome.storage.local` for persistence
- History API for SPA navigation detection
- Modern `fetch` and `XMLHttpRequest` interception
