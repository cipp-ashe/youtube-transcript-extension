---
version: 1.0.0
date: 2024-10-20
status: released
---

# Changelog

## [1.0.0] - 2024-10-20

**Summary:** Major architectural refactor introducing modular download system, session-based storage, and enhanced modal management. Adds multi-format export capabilities (TXT/JSON/Markdown), transcript list management, and resolves critical download functionality bugs that prevented proper modal workflows. Includes enhanced accessibility with ARIA labels and full CSP compliance for security.

Commit: 5ed2c02 (initial public release)

### popup.js

> Focus: UI architecture and modal logic improvements

**Added**

- [Core] Implements `getCurrentVideoId()` method extracting video ID from active tab URL with validation
- [Core] Adds `safeSendMessage()` utility handling background script communication with error handling
- [Feature] Creates `showTranscriptList()` displaying captured transcripts with view/clear actions per item
- [UX] Implements `attachTranscriptListEventListeners()` binding CSP-compliant event handlers to dynamic transcript list
- [Feature] Adds `showDownloadAllModal()` preparing bulk download with transcript count validation
- [Feature] Implements `executeDownloadAll()` processing multiple transcripts with format selection (TXT/JSON/MD)
- [Feature] Creates `generateTextDownload()`, `generateJSONDownload()`, `generateMarkdownDownload()` generating formatted exports
- [Feature] Adds `executeSingleDownload()` handling individual transcript downloads with metadata
- [Core] Implements `hideSingleDownloadModal()` and `hideDownloadAllModal()` managing modal state cleanup
- [Feature] Creates `viewTranscript()` and `clearTranscript()` enabling individual transcript management
- [UX] Enhances `enableAutoCapture()` including loading states and extended timing for reliability
- [Debug] Adds CSP violation detection checking DOM for inline event handlers during initialization

**Changed**

- [Core] Converts `init()` method to async with comprehensive error handling and fallback logic
- [UX] Enhances `showSection()` automatically hiding all modals and clearing download state when switching views
- [UX] Updates `bindEvents()` removing emoji icons from button text throughout interface
- [Perf] Extends auto-capture timing from 500ms to 1.5s with loading state feedback
- [Core] Updates `showDownloadModal()` setting up `pendingDownloadTranscript` data required for execution
- [Fix] Updates modal ID references from `download-options-modal` to `download-all-modal`
- [Fix] Changes element ID references from `download-count-text` to `download-all-count-text`
- [UX] Enhances download success messaging showing clear confirmation before popup closes

**Fixed**

- [‼️ Critical] Resolves individual download button creating proper `pendingDownloadTranscript` object instead of failing silently
- [‼️ Critical] Fixes "Extract Another" button navigating to transcript list without triggering download modal
- [‼️ Critical] Corrects Download All button using correct modal ID instead of non-existent `download-options-modal`
- [🔧 Fix] Updates modal element references using correct IDs matching HTML structure
- [🔧 Fix] Eliminates auto-capture timing race condition between popup close and background setup
- [🔧 Fix] Prevents modal state conflicts causing unexpected modal appearances when switching sections

### popup.html

> Focus: UI structure expansion and accessibility enhancements

**Added**

- [Feature] Creates transcript list section (`#transcript-list`) displaying all captured transcripts from session
- [UX] Adds individual transcript items with title, language, word count, and action buttons
- [Feature] Implements Download All modal (`#download-all-modal`) with format selection and timestamp options
- [Fix] Relocates single download modal (`#single-download-modal`) to global scope outside sections
- [UX] Creates step-by-step auto-capture guidance with numbered instructions (1-4)
- [UX] Enhances error section with proper error container and retry button
- [Feature] Builds modal system with form controls for format selection (TXT, JSON, Markdown)
- [Accessibility] Redesigns toggle switch with proper slider container for timestamp options

**Changed**

- [UX] Updates header text from "📝 YouTube Transcript" to "YouTube Transcript Extractor"
- [UX] Changes subtitle from "Extract transcripts from any YouTube video" to "Extract and download video transcripts"
- [UX] Removes emoji prefixes from button labels: "📝 Extract" → "Extract", "🔄 Refresh" → "Refresh"
- [UX] Simplifies info notice text from emoji-heavy to clean professional language
- [UX] Restructures error section with proper error content container
- [UX] Replaces simple "No transcripts available" with detailed 4-step auto-capture process
- [Accessibility] Enhances toggle switch structure with proper slider container for better styling
- [UX] Simplifies results header from "📄 Transcript Results" to "Transcript"

**Fixed**

- [‼️ Critical] Moves single download modal outside section containers enabling cross-section access
- [Accessibility] Includes proper form labels and ARIA attributes for accessibility
- [Security] Implements CSP-compliant addEventListener instead of inline handlers

### content.js

> Focus: Enhanced processing logic and error handling

**Added**

- [Feature] Implements `attemptTranscriptExtraction()` trying manual extraction before guiding to auto-capture
- [Perf] Adds early exit logic preventing processing on YouTube homepage, search, and channel pages
- [Debug] Creates comprehensive video ID validation with diagnostic logging throughout extraction flow
- [Reliability] Implements extension context invalidation detection handling graceful degradation when extension reloads
- [Reliability] Enhances error handling for background script communication failures
- [Feature] Adds navigation cleanup automatically clearing previous video transcripts when switching videos
- [Feature] Implements `getVideoTitle()` extraction for storing transcript metadata with proper fallbacks

**Changed**

- [Core] Updates `handleCapturedTranscript()` including early exit for non-video pages before processing
- [Reliability] Modifies JSON/XML parsing attempting JSON first with XML fallback for better format support
- [Debug] Enhances `getVideoId()` including comprehensive logging for debugging video ID extraction issues
- [Core] Updates background message sending including video ID and title metadata for storage
- [Fix] Improves navigation detection properly updating `currentVideoId` instead of just clearing state
- [Core] Enhances transcript processing validating current video context before attempting extraction

**Fixed**

- [‼️ Critical] Handles extension context invalidation with try-catch blocks instead of causing console errors
- [Reliability] Prevents video ID validation causing transcript processing on invalid page types
- [Reliability] Includes proper error handling for disconnected contexts in background script communication
- [🔧 Fix] Clears previous video data instead of accumulating stale references in navigation state management

### background.js

> Focus: Storage strategy overhaul and session management

**Added**

- [Core] Implements session storage strategy using `chrome.storage.session` instead of persistent storage
- [Feature] Creates `clearPreviousVideoTranscripts()` removing old transcripts when navigating between videos
- [UX] Adds `setBadgeWaiting()` setting orange badge with "..." text during auto-capture setup
- [UX] Implements `updateBadgeForAllVideos()` reflecting actual transcript count with green badge
- [Feature] Creates `getAllCapturedTranscripts()` returning all session transcripts with count for list view
- [Feature] Adds `clearAllTranscripts()` enabling bulk removal of all captured transcripts
- [Reliability] Implements atomic storage operations with `updateTranscripts()` mutator preventing race conditions
- [UX] Creates installation tip notification guiding users to pin extension to toolbar

**Changed**

- [Core] Updates storage initialization using session storage instead of persistent local storage
- [UX] Enhances badge management reflecting actual transcript counts instead of simple on/off states
- [Core] Updates transcript storage including video ID as key with structured metadata
- [Reliability] Improves message handling including proper error responses for failed operations

### README.md

> Focus: Documentation simplification and feature updates

**Changed**

- [Documentation] Condenses installation instructions from verbose 6 paragraphs to concise 6 steps
- [Documentation] Simplifies technical explanation from complex multi-step process to clear mechanics description
- [Documentation] Updates feature descriptions reflecting multi-format downloads and session storage
- [Documentation] Expands export options including JSON and Markdown formats with metadata details

### Removed

**Interface Elements**

- [UX] Removes emoji icons from all button text and headers throughout popup interface
- [UX] Replaces emoji-based visual indicators with clean text labels
- [Privacy] Eliminates persistent storage across browser sessions for enhanced privacy

---

## [0.9.0] - 2024-10-19

Commit: 57a36009d10d7e1638958c7124751450a274f5c5
Base functionality before major architectural overhaul and critical bug fixes.

---

## [Next Release] - TBD

> ⚠️ This version is under active development and not yet published to the Chrome Web Store.

> Placeholder for upcoming patch notes

---

## Release Links

- [Compare v0.9.0 → v1.0.0](https://github.com/cipp-ashe/youtube-transcript-extension/compare/v0.9.0...v1.0.0) (Major architectural changes)
- [View v1.0.0 Release](https://github.com/cipp-ashe/youtube-transcript-extension/releases/tag/v1.0.0)
- [View v0.9.0 Release](https://github.com/cipp-ashe/youtube-transcript-extension/releases/tag/v0.9.0)
