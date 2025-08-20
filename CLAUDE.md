# Bespoke Resume Extension

<!-- Workflow Overview -->
The crxjs-project uses React/TypeScript with Redux for state management. Key components:
- `background.ts`: Service worker with chrome.action.onClicked listener for widget injection
- `content/main.tsx`: React content script with JobPageDetector and Redux-based ResumeWidget updates
- `components/ResumeWidget.tsx`: React widget using Redux store for reactive job data updates  
- `pages/history.tsx`: Full-page interface for managing tailored resume history
- `services/jobDetector.ts`: MutationObserver for real-time job page detection with periodic checks
- `store/`: Redux slices for resume, job, and settings state with reactive updates

## 2025-08-08  Compact Session

### #CurrentFocus
Implemented chrome extension popup trigger to show resume widget when user clicks extension icon

### #SessionChanges  
" Added chrome.action.onClicked listener to background.js for extension icon clicks
" Added message listener to content.js to handle showResumeWidget action
" Fixed widget z-index (999999) and positioning (top: 120px) to avoid LinkedIn top bar overlap
" Updated manifest.json to remove popup reference after realizing existing widget approach was better

### #NextSteps
" Test widget display on various job sites beyond LinkedIn
" Verify widget positioning across different screen sizes
" Test extension reload and message passing functionality

### #BugsAndTheories
" LinkedIn top bar coverage � insufficient z-index and top positioning too low

### #Background
Extension uses existing content.js injectResumeWidget() method rather than separate popup.html for better UX integration

## 2025-08-19  Compact Session

### #CurrentFocus
Migrated vanilla JS Chrome extension to React/TypeScript/Redux architecture and fixed HTML/CSS styling issues

### #SessionChanges  
" Migrated ai-service.js to TypeScript with proper type definitions and error handling
" Created Redux store with slices for resume, job detection, and settings management
" Converted background.js to TypeScript service worker with async message handling
" Migrated content.js to React component with JobPageDetector service and widget injection
" Built React popup component replacing static HTML with Redux state management
" Created React history page with filtering, sorting, and resume management functionality
" Fixed popup styling conflicts by removing default Vite styles overriding custom gradient design
" Added multi-page Vite build configuration for proper history page bundling and script references
" Restructured CSS architecture with isolated files preventing global style conflicts

### #NextSteps #Deprecated
" Update ResumeWidget.css to match exact styling provided by user with beautiful gradient design
" Test extension loading in Chrome to verify all functionality works correctly
" Validate job page detection across different career sites (LinkedIn, Indeed, Glassdoor)
" Verify Google OAuth authentication and resume upload functionality

### #BugsAndTheories
" Popup terrible styling ⇒ Default Vite CSS overriding custom popup styles with conflicting flexbox/sizing
" History page not loading ⇒ Broken script references and missing Vite multi-page build configuration

### #Background
Successfully preserved all original extension functionality while modernizing to React/TypeScript architecture with proper Redux state management

## 2025-08-19 – Compact Session

### #CurrentFocus
Removed popup entirely and implemented Redux-based reactive job data updates to prevent widget re-rendering

### #SessionChanges  
" Updated ResumeWidget.css to match original content.css styling with proper ID selectors and CSS variables
" Removed popup from manifest.config.ts and enabled chrome.action.onClicked listener in background.ts
" Removed popup build configuration from vite.config.ts to eliminate popup entirely
" Refactored content script to use Redux store updates instead of widget re-rendering for job data changes
" Modified ResumeWidget to subscribe to Redux job state instead of accepting jobData props
" Added JobPageDetector MutationObserver with periodic checks every 500ms for real-time job data monitoring
" Implemented JSON comparison tracking to detect job data changes and update Redux store reactively

### #NextSteps
" Test extension with click-to-inject functionality on various websites
" Verify smooth job data updates without widget flickering on dynamic job sites
" Validate JobPageDetector accuracy across different career platforms

### #BugsAndTheories
" Popup styling issues ⇒ Fixed by removing popup entirely and using click-to-inject pattern
" Widget re-rendering causing flickering ⇒ Solved with Redux-based reactive updates instead of component re-mounting

### #Background  
Extension now uses click-to-inject pattern with Redux reactive updates, eliminating re-rendering flicker while maintaining real-time job detection