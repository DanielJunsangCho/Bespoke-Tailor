import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from '../store';
import { setCurrentJob } from '../store/slices/jobSlice';
import { JobPageDetector } from '../services/jobDetector';
import { ResumeWidget } from '../components/ResumeWidget';

class ContentScript {
  private jobDetector: JobPageDetector;
  private widgetRoot: ReactDOM.Root | null = null;
  private widgetContainer: HTMLDivElement | null = null;
  private lastJobData: string | null = null; // Track job data changes

  constructor() {
    this.jobDetector = new JobPageDetector();
    this.init();
  }

  private init(): void {
    this.setupMessageListener();
    this.checkAndShowWidget();
  }

  private setupMessageListener(): void {
    chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
      if (request.action === 'showResumeWidget') {
        this.showWidget();
      } else if (request.action === 'getJobData') {
        const jobData = this.jobDetector.getJobData();
        sendResponse({ jobData });
      }
      return true; // Keep message channel open for async responses
    });
  }

  private checkAndShowWidget(): void {
    // Auto-show widget if on job page
    if (this.jobDetector.isOnJobPage()) {
      setTimeout(() => this.showWidget(), 1000); // Delay to ensure page is fully loaded
    }

    // Set up periodic checks for job data changes
    setInterval(() => {
      const isCurrentlyOnJobPage = this.jobDetector.isOnJobPage();
      const currentJobData = this.jobDetector.getJobData();
      const currentJobDataString = JSON.stringify(currentJobData);
      
      // If job data changed, update Redux store (widget will update reactively)
      if (currentJobDataString !== this.lastJobData) {
        this.lastJobData = currentJobDataString;
        store.dispatch(setCurrentJob(currentJobData));

        if (isCurrentlyOnJobPage && !this.widgetContainer) {
          console.log("yay");
          this.showWidget();
        }
        console.log('Job data updated:', currentJobData);
      }
      
      // Show/hide widget based on job page status
      // if (isCurrentlyOnJobPage && !this.widgetContainer) {
      //   this.showWidget(); // Show widget if job page detected and widget not shown
      // } else
      //  if (!isCurrentlyOnJobPage && this.widgetContainer) {
      //   this.hideWidget(); // Hide widget if no longer on job page
      // }
    }, 500);
  }

  private showWidget(): void {
    if (this.widgetContainer) {
      // Widget already exists
      return;
    }

    this.createWidget();
  }

  private createWidget(): void {
    // Create widget container
    this.widgetContainer = document.createElement('div');
    this.widgetContainer.id = 'bespoke-resume-widget-container';
    this.widgetContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 999999;
    `;
    
    document.body.appendChild(this.widgetContainer);

    // Create React root and render widget
    this.widgetRoot = ReactDOM.createRoot(this.widgetContainer);
    this.renderWidget();
  }

  private renderWidget(): void {
    if (!this.widgetRoot) return;

    const jobData = this.jobDetector.getJobData();
    
    // Update Redux store with initial job data
    store.dispatch(setCurrentJob(jobData));
    this.lastJobData = JSON.stringify(jobData);
    
    // Render widget once - it will get updates via Redux
    this.widgetRoot.render(
      <Provider store={store}>
        <div style={{ pointerEvents: 'none', width: '100%', height: '100%' }}>
          <div style={{ pointerEvents: 'auto' }}>
            <ResumeWidget 
              jobData={null} // Deprecated - widget uses Redux data
              onClose={this.hideWidget.bind(this)}
            />
          </div>
        </div>
      </Provider>
    );
  }

  private hideWidget(): void {
    if (this.widgetRoot) {
      this.widgetRoot.unmount();
      this.widgetRoot = null;
    }

    if (this.widgetContainer) {
      document.body.removeChild(this.widgetContainer);
      this.widgetContainer = null;
    }
  }

  public cleanup(): void {
    this.hideWidget();
    this.jobDetector.cleanup();
  }

  public redetect(): void {
    this.jobDetector.redetect();
  }
}

// Initialize content script
let contentScript: ContentScript | undefined;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    contentScript = new ContentScript();
  });
} else {
  contentScript = new ContentScript();
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (contentScript) {
    contentScript.cleanup();
  }
});

// Make available globally for debugging
(window as any).bespokeResumeContentScript = contentScript;