# YouTube Transcript Extractor

Grabs text from YouTube videos (including unlisted ones and auto-generated captions). Works automatically or on-demand.

## Quick Start

Install in 6 steps:

1. **Get the code**: Click green "Code" button → "Download ZIP"
2. **Extract**: Unzip to a folder somewhere on your computer
3. **Open Chrome extensions**: Go to `chrome://extensions/`
4. **Enable developer mode**: Toggle "Developer mode" (top right)
5. **Load extension**: Click "Load unpacked" → select your extracted folder
6. Done. Works immediately on YouTube.

> **Note**: Use the extracted folder, not the ZIP file (obviously)

## How It Works

### Technical Method

This extension intercepts YouTube's internal caption requests with JavaScript:

**The mechanics**: Overrides `XMLHttpRequest` and `fetch` to monitor YouTube's network calls. When YouTube hits `/api/timedtext` (their caption API), the extension grabs a copy of the response and processes it locally.

**What actually happens:**

1. Extension injects monitoring code into YouTube pages
2. YouTube requests captions → extension copies the request
3. YouTube gets caption data → extension processes the same data
4. Extension converts YouTube's format to clean text
5. Stores result in your browser (Chrome's local storage)
6. You access it through the popup

**No external servers involved**. Just local JavaScript doing its thing based on what YouTube already loads in your browser.

## What It Does

### Automatic Capture

- Grabs transcripts when you turn on captions (CC button)
- Shows browser notification when ready
- Badge appears on extension icon

### Manual Extract

- Click extension icon on any YouTube page
- Pick language if multiple options available
- Get clean text

### Export Options

- Copy to clipboard
- Download as text file (includes video metadata)
- Plain text or timestamped format

## How to Use

### Method 1: Auto-Capture (Easiest)

1. Go to any YouTube video
2. Turn on captions (CC button)
3. Wait for notification
4. Click extension icon to see transcript

### Method 2: Manual Extract

1. Go to YouTube video
2. Click extension icon
3. Pick language if needed
4. Copy or download

## What You Get

The extension creates clean, formatted text files with:

- Video title and ID
- Language and caption type (manual vs auto-generated)
- Word count
- Timestamp of when you extracted it
- Option for timestamps (MM:SS format)

Example filename: `youtube_transcript_How_to_Learn_Programming_abc123xyz.txt`

## Supported Videos

✅ **Works with:**

- Public videos with captions
- Unlisted videos you have access to
- Auto-generated captions
- Multiple languages (when available)
- Live streams with captions

❌ **Does not work with:**

- Private videos
- Videos without any captions
- Copyright-protected content without captions

## Browser Support

Requires Chrome or Chromium-based browsers (Edge, Brave, Opera). Uses modern web features that need Manifest V3 support.

## Permissions Explained

This extension needs permission to:

- **YouTube access**: Read video information and captions
- **Storage**: Save transcripts temporarily
- **Notifications**: Alert you when auto-capture works
- **Active tab**: Know which YouTube video you're watching

No data is sent to external servers. Everything stays in your browser.

## Troubleshooting

### Extension icon shows no badge

- Make sure captions (CC) are enabled on the video
- Try refreshing the YouTube page
- Check that the video actually has captions available

### "No transcripts available" message

- Verify the video has captions (look for CC button)
- Try selecting a different language if multiple are available
- Some videos may have restricted caption access

### Copied text looks messy

- Choose the "Plain text" option instead of timestamped
- The text includes automatic cleanup of HTML formatting

## Advanced Features

<details>
<summary>Click to see technical details</summary>

### How It Works Behind the Scenes

The extension uses three main components:

- **Background script**: Stores transcripts and shows notifications
- **Content script**: Reads YouTube page information
- **Page injection**: Captures YouTube's internal caption requests

### Caption Format Support

- **JSON3**: Modern YouTube format (preferred)
- **XML**: Legacy format (automatic fallback)
- **Multiple languages**: Supports all YouTube-available languages

### Storage Strategy

Transcripts are stored in two places:

- Browser memory (for current session)
- Local browser storage (survives browser restart)

Your data never leaves your device.

</details>

## File Structure Reference

<details>
<summary>For developers: Extension architecture</summary>

```
manifest.json          → Extension configuration
├── background.js      → Handles storage and notifications
├── content.js         → Interacts with YouTube pages
├── inject.js          → Captures YouTube's caption API calls
├── popup.html/js/css  → Extension interface
└── icons/             → Extension icons
```

**Component Communication:**

- Extension popup ↔ Content script (video info requests)
- Content script ↔ Background script (transcript storage)
- Injected script → Content script (captured transcript data)

**Technical Implementation:**

- Intercepts YouTube's `/api/timedtext` requests
- Parses both modern (JSON3) and legacy (XML) caption formats
- Uses Chrome's Manifest V3 service worker architecture
- Handles YouTube's single-page application navigation

</details>
