# Contributing

Thanks for your interest in contributing to the YouTube Transcript Extractor!

## How to Contribute

### Reporting Issues

Found a bug? Include these details:

1. **Video URL** where it failed (if public)
2. **Browser**: Chrome version + OS
3. **What happened**: Screenshot of error or unexpected behavior
4. **Expected**: What should have happened instead
5. **Extension logs**: Open DevTools → Console → copy any red errors

### Contributing Code

**Quick setup:**

1. Fork this repo
2. Clone: `git clone your-fork-url`
3. Load extension: chrome://extensions → Developer mode → Load unpacked → select folder
4. Make changes to `.js` files
5. Test on YouTube videos
6. Submit PR

### Testing Checklist

Test these scenarios before submitting:

**Auto-capture:**

- [ ] Enable CC on popular video → notification appears → transcript available
- [ ] Try videos with multiple languages → correct language selected
- [ ] Test unlisted video (if you have one)

**Manual extraction:**

- [ ] Extension popup opens on YouTube page
- [ ] Can select different caption languages
- [ ] Both plain text and timestamped formats work
- [ ] Copy to clipboard functions
- [ ] Download creates proper `.txt` file

**Edge cases:**

- [ ] Videos without captions show "No transcripts available"
- [ ] Very long videos (>2 hours) don't crash
- [ ] Non-YouTube pages show "not-youtube" message

### Code Guidelines

**File structure you'll work with:**

- `background.js`: Storage and notifications (213 lines)
- `content.js`: YouTube page interaction (420 lines)
- `popup.js`: Extension UI logic (420 lines)
- `inject.js`: Caption API interception (86 lines)

**Before changing code:**

- Check existing error handling patterns
- Don't break the message passing between scripts
- Test storage cleanup (transcripts should clear properly)
- Verify manifest.json permissions if adding features

### Priority Contributions

**Known issues that need fixing:**

- Some auto-generated captions have HTML encoding issues
- Extension sometimes misses caption requests on slow connections
- Popup occasionally shows "loading" indefinitely
- Downloaded filenames could handle special characters better

**Wanted improvements:**

- Better handling of live stream captions
- Support for community-contributed captions
- Bulk export for multiple videos
- Improved error messages for debugging

### Questions?

Open an issue for discussion before starting major changes.
