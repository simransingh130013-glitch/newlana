# Lana — iPhone AI

A futuristic browser/PWA personal assistant designed for iPhone.

## Included
- Voice recognition in supported browsers
- Spoken responses
- Lana wake phrase
- Google and YouTube search
- YouTube music search
- Local tasks and notes using localStorage
- Focus timer
- Battery/network/time dashboard
- Share button
- PWA/service-worker support
- Responsive iPhone-first interface
- No API key required

## GitHub Pages
Upload all files to the root of a GitHub repository, then enable:
Settings → Pages → Deploy from branch → main → / (root)

## Important
This is a browser-first assistant. It does not directly run Python, Ollama, or control iOS system functions that Safari does not expose. A secure backend can be added later for real LLM conversations.


## Female Robotic Voice

Lana uses the browser's speech synthesis voices and prefers available female English voices such as Samantha, Ava, Karen, Moira, Victoria, Allison, or Zoe. It applies a slightly slower rate and higher pitch for a futuristic AI character. The exact voice depends on the voices available on the device/browser.


## Text Command + Voice Reply
Voice recognition is disabled in this build. Tap **Talk to Lana** to focus the text command field. Type a command and press Send; Lana uses the available iPhone/browser Speech Synthesis voice to speak her response.


## Lana 2.2 — reliable iPhone speech
Talk to Lana uses text only. Send is a direct tap action, and Lana speaks the response immediately without waiting for Safari voice-list loading. The service-worker cache was bumped so GitHub Pages receives the updated JavaScript.
