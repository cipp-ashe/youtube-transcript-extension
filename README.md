# YouTube Transcript Extractor

Get text from any YouTube video, including unlisted and auto-generated captions. Works automatically in the background or on-demand with one click.

## Quick Start

Install this extension in 6 simple steps:

1. **Get the code**: Click the green "Code" button on this GitHub page
2. **Download**: Select "Download ZIP" from the dropdown
3. **Extract**: Unzip the downloaded file to a folder on your computer
4. **Open Chrome extensions**: Go to `chrome://extensions/` in your browser
5. **Enable developer mode**: Click the toggle for "Developer mode" (top right)
6. **Load extension**: Click "Load unpacked" and select the extracted folder

That's it. The extension starts working immediately on YouTube.

> **Note**: You need the extracted folder (not the ZIP file) when clicking "Load unpacked"

## How It Works

### Technical Method

This extension uses **JavaScript interception** to capture YouTube's internal caption requests:

1. **XMLHttpRequest & Fetch Override**: The extension injects code that monitors all network requests YouTube makes
2. **API Pattern Detection**: When YouTube requests `/api/timedtext` (their caption API), the extension captures the response
3. **Data Extraction**: Pulls transcript text from YouTube's JSON3 or XML formats
4. **Browser Storage**: Stores the cleaned transcript data locally using Chrome's storage API

### What Happens Step by Step

1. **Page Load**: Extension injects monitoring code into YouTube pages
2. **Caption Request Detection**: YouTube requests captions → Extension copies the request
3. **Response Capture**: YouTube receives caption data → Extension processes the same data
4. **Format Parsing**: Extension converts YouTube's format to plain text
5. **Local Storage**: Saves processed transcript in your browser
6. **User Access**: Extension popup displays the formatted text

### No External Servers

The extension never sends data anywhere. It only:
- Reads YouTube's existing API calls (same data YouTube already loads)
- Processes that data locally in your browser
- Stores results in Chrome's local storage system

This is like having a "copy machine" that duplicates YouTube's caption requests for your own use.

## What It Does

### Automatic Capture

- Grabs transcripts when you enable captions (CC button) on YouTube
- Shows a notification when transcript is ready
- Adds a number badge to the extension icon

### Manual Extract

- Click the extension icon on any YouTube page
- Choose your language if multiple options exist
- Get clean text in seconds

### Export Options

- Copy text to clipboard
- Download as text file with video details
- Choose plain text or timestamped format

## How to Use

### Method 1: Auto-Capture (Easiest)

1. Go to any YouTube video
2. Click the CC (captions) button on the video player
3. Watch for the browser notification
4. Click the extension icon to view the transcript

### Method 2: Manual Extract

1. Go to any YouTube video
2. Click the extension icon
3. Select language if prompted
4. Copy or download the transcript

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
