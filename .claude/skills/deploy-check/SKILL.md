---
name: deploy-check
description: Pre-deployment checklist and build preparation for ConvoQuest
---

# Deploy Check

This skill runs through a deployment readiness checklist for ConvoQuest.

## Checklist

### 1. Code Quality
- [ ] No console.log statements in production code
- [ ] No hardcoded API keys (except BUILTIN_MODELS embedded key)
- [ ] No TODO/FIXME comments left
- [ ] All script tags present in index.html
- [ ] No unused CSS classes

### 2. Functionality
- [ ] Server starts without errors: `npm start`
- [ ] Built-in GLM model works (no key needed)
- [ ] All game modes accessible from game hall
- [ ] All screens transition correctly
- [ ] Scoring and titles work
- [ ] Review phase streams correctly
- [ ] Result screen shows accurate stats

### 3. Model Compatibility
- [ ] Works with GLM (built-in)
- [ ] Works with DeepSeek (if key available)
- [ ] Works with OpenAI-compatible APIs
- [ ] Custom API endpoint works

### 4. Responsive Design
- [ ] Mobile (375px): layout usable
- [ ] Tablet (768px): two-column works
- [ ] Desktop (1024px+): full layout
- [ ] Touch targets adequate on mobile

### 5. Error Handling
- [ ] Invalid API key shows error
- [ ] Network failure handled gracefully
- [ ] AI timeout doesn't hang UI
- [ ] Malformed AI response handled
- [ ] Empty input not processed

### 6. Performance
- [ ] No memory leaks (long games)
- [ ] Streaming doesn't lag
- [ ] DOM updates efficient (scrollTop)
- [ ] No unnecessary re-renders

### 7. Security
- [ ] API keys not logged
- [ ] User input sanitized for display (textContent, not innerHTML for user input)
- [ ] No eval() or similar
- [ ] CORS configured if needed

### 8. Browser Compatibility
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile Safari / Chrome

## Build Preparation

### For Local Testing
```bash
cd ConvoQuest
npm install
npm start
# Open http://localhost:3000
```

### For Deployment
1. Set `PORT` environment variable if not 3000
2. Ensure `BUILTIN_MODELS` API key is valid
3. Consider adding rate limiting middleware
4. Add production error handling
5. Set up HTTPS if deploying publicly

### For Packaging (Electron/Capacitor)
1. Ensure all paths are relative (no absolute URLs)
2. API calls must handle local vs remote server
3. Test offline behavior
4. Handle platform-specific quirks

## Quick Smoke Test

Run through one complete game in each mode:
1. AI Host (easy) - ask questions, guess, complete
2. AI Guess - ready, answer questions, complete
3. Turtle Host (medium) - ask, guess, complete
4. Turtle Guess - submit surface, answer, complete