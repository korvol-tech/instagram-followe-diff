# Future Improvements

## High Priority

### 1. Persistence & Reliability
- [x] Save queue to `chrome.storage` so it survives browser restarts
- [x] Resume incomplete actions after crash/restart
- [x] Better retry logic with exponential backoff

### 2. Rate Limiting Protection
- [ ] Detect Instagram's rate limit responses (429, action blocked)
- [ ] Auto-pause and show warning when limits are hit
- [ ] Daily/hourly action limits configurable by user

### 3. User Authentication
- [ ] Detect if user is logged into Instagram before processing
- [ ] Prompt to login if session expired mid-queue

## Medium Priority

### 4. Better UI/UX
- [ ] Progress bar instead of just status text
- [ ] History of completed actions with timestamps
- [ ] Export results to CSV
- [ ] Dark mode toggle

### 5. Smarter Processing
- [ ] Randomize delays more naturally (human-like patterns)
- [ ] Process during specific hours only (optional schedule)
- [ ] Pause when user is actively browsing Instagram

### 6. Multi-file Support
- [ ] Handle multiple Instagram account exports
- [ ] Compare across time (who unfollowed since last export)

## Nice to Have

### 7. Analytics Dashboard
- [ ] Track follow/unfollow trends over time
- [ ] Visualize follower growth

### 8. Browser Support
- [ ] Firefox extension (Manifest V3 differences)
- [ ] Edge extension
