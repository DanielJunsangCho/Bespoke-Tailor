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
      try {
        if (request.action === 'showResumeWidget') {
          this.showWidget();
          sendResponse({ success: true });
        } else if (request.action === 'getJobData') {
          const jobData = this.jobDetector.getJobData();
          sendResponse({ jobData });
        } else {
          sendResponse({ success: false, error: 'Unknown action' });
        }
      } catch (error) {
        console.error('Content script message error:', error);
        sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
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
          this.showWidget();
        }
        console.log('Job data updated:', currentJobData);
      }
    }, 500);
  }

  private async showWidget(): Promise<void> {
    if (this.widgetContainer) {
      // Widget already exists
      return;
    }

    await this.createWidget();
  }

  private async createWidget(): Promise<void> {
    // Create widget host container
    this.widgetContainer = document.createElement('div');
    this.widgetContainer.id = 'bespoke-resume-widget-host';
    this.widgetContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 999999;
    `;
    
    // Create shadow DOM for complete CSS isolation
    const shadowRoot = this.widgetContainer.attachShadow({ mode: 'closed' });
    
    // Create shadow container for React
    const shadowContainer = document.createElement('div');
    shadowContainer.style.cssText = `
      width: 100%;
      height: 100%;
      pointer-events: none;
    `;
    
    // Inject CSS into shadow DOM
    const style = document.createElement('style');
    style.textContent = this.getWidgetCSS();
    shadowRoot.appendChild(style);
    shadowRoot.appendChild(shadowContainer);
    
    document.body.appendChild(this.widgetContainer);

    // Create React root in shadow DOM
    this.widgetRoot = ReactDOM.createRoot(shadowContainer);
    this.renderWidget();
  }

  private getWidgetCSS(): string {
    return `
      /* Bespoke Resume Widget Styles */
      .ai-resume-tailor-widget {
        position: fixed !important;
        top: 120px !important;
        right: 20px !important;
        width: 340px !important;
        max-height: calc(100vh - 140px) !important;
        background: rgba(255, 255, 255, 0.98) !important;
        backdrop-filter: blur(20px) !important;
        border: 1px solid rgba(255, 255, 255, 0.2) !important;
        border-radius: 20px !important;
        box-shadow: 
          0 25px 50px rgba(0, 0, 0, 0.15),
          0 0 0 1px rgba(255, 255, 255, 0.05) !important;
        z-index: 999999 !important;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif !important;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
        overflow-y: auto !important;
        box-sizing: border-box !important;
      }

      .ai-resume-tailor-widget:hover {
        box-shadow: 
          0 32px 64px rgba(0, 0, 0, 0.18),
          0 0 0 1px rgba(255, 255, 255, 0.1);
      }

      .widget-container {
        display: flex;
        flex-direction: column;
        height: 100%;
      }

      .widget-header {
        background: linear-gradient(300deg, 
          #c4a381 0%, 
          #8b7db8 50%,
          #d49cb8 100%);
        color: white;
        padding: 24px 20px;
        position: relative;
        overflow: hidden;
      }

      .widget-close-btn {
        position: absolute;
        top: -5px;
        right: 8px;
        background: rgba(255, 255, 255, 0.2);
        border: none;
        border-radius: 50%;
        width: 28px;
        min-height: 28px;
        color: white;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        z-index: 10;
        backdrop-filter: blur(10px);
      }

      .widget-close-btn:hover {
        background: rgba(255, 255, 255, 0.3);
        transform: scale(1.1);
      }

      .widget-close-btn:active {
        transform: scale(0.95);
      }

      .widget-close-btn svg {
        width: 14px;
        height: 14px;
      }

      .widget-header::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.1);
        backdrop-filter: blur(10px);
      }

      .widget-header > * {
        position: relative;
        z-index: 1;
      }

      .widget-header h3 {            
        height 60px;                                                                            
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        font-size: 22px;
        font-weight: 700;
        letter-spacing: -0.5px;
        color: rgba(255, 255, 255, 0.95);
        text-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        position: relative;
      }

      .job-detection {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 10px;
        padding: 8px 12px;
        background: rgba(255, 255, 255, 0.15);
        border-radius: 12px;
        backdrop-filter: blur(10px);
        min-height: 24px;
      }

      .job-detection-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #10b981;
        box-shadow: 0 0 8px rgba(16, 185, 129, 0.4);
      }

      .job-detection-dot.inactive {
        background: #ef4444;
        box-shadow: 0 0 8px rgba(239, 68, 68, 0.4);
      }

      #jobDetectionText {
        font-size: 14px;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.95);
      }

      #jobDetectionDetail {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.8);
        font-weight: 400;
        line-height: 1.4;
        min-height: 20px;
        overflow-wrap: break-word;
        word-wrap: break-word;
      }

      .widget-content {
        padding: 24px 20px;
        flex: 1;
        overflow-y: auto;
        background: linear-gradient(180deg, 
          rgba(248, 250, 252, 0.8) 0%, 
          rgba(255, 255, 255, 0.9) 100%);
      }

      .resume-status {
        background: linear-gradient(135deg, 
          rgba(99, 102, 241, 0.1) 0%, 
          rgba(139, 92, 246, 0.1) 100%);
        border: 1px solid rgba(99, 102, 241, 0.2);
        border-radius: 16px;
        padding: 16px;
        margin-bottom: 20px;
        font-size: 13px;
        font-weight: 500;
        color: #4f46e5;
        line-height: 1.5;
        position: relative;
        overflow: hidden;
      }

      .resume-status::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, 
          transparent, 
          rgba(255, 255, 255, 0.2), 
          transparent);
        animation: shimmer 3s ease-in-out infinite;
      }

      @keyframes shimmer {
        0% { left: -100%; }
        100% { left: 100%; }
      }

      .action-buttons {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .btn {
        padding: 16px 24px;
        border: none;
        border-radius: 25px;
        font-size: 14px;
        font-weight: 500;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        cursor: pointer;
        transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        text-align: center;
        position: relative;
        overflow: hidden;
        letter-spacing: 0.3px;
        backdrop-filter: blur(10px);
      }

      .btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none !important;
      }

      .btn-primary {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: 1px solid rgba(255, 255, 255, 0.2);
        box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3), 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      .btn-primary:hover:not(:disabled) {
        transform: translateY(-3px) scale(1.02);
        box-shadow: 0 12px 40px rgba(102, 126, 234, 0.4), 0 4px 12px rgba(0, 0, 0, 0.15);
        background: linear-gradient(135deg, #5a6fd8 0%, #6a4c93 100%);
      }

      .btn-primary:active:not(:disabled) {
        transform: translateY(0);
      }

      .btn-secondary {
        background: rgba(255, 255, 255, 0.9);
        color: #6b7280;
        border: 1px solid rgba(156, 163, 175, 0.2);
        backdrop-filter: blur(15px);
        box-shadow: 
          0 4px 20px rgba(0, 0, 0, 0.08),
          0 2px 8px rgba(0, 0, 0, 0.05);
      }

      .btn-secondary:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.95);
        color: #374151;
        border-color: rgba(156, 163, 175, 0.3);
        transform: translateY(-2px) scale(1.01);
        box-shadow: 
          0 8px 25px rgba(0, 0, 0, 0.12),
          0 4px 12px rgba(0, 0, 0, 0.08);
      }

      .btn::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, 
          transparent, 
          rgba(255, 255, 255, 0.1), 
          transparent);
        transition: left 0.6s ease;
      }

      .btn:hover::before {
        left: 100%;
      }

      .loading-section {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px;
        background: linear-gradient(135deg, 
          rgba(251, 191, 36, 0.1) 0%, 
          rgba(245, 158, 11, 0.1) 100%);
        border: 2px solid rgba(251, 191, 36, 0.3);
        border-radius: 16px;
        margin-top: 16px;
        backdrop-filter: blur(10px);
      }

      .spinner {
        width: 20px;
        height: 20px;
        border: 3px solid rgba(245, 158, 11, 0.2);
        border-top: 3px solid #f59e0b;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      .loading-section.hidden {
        display: none;
      }

      #loadingText {
        font-size: 14px;
        color: #d97706;
        font-weight: 600;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      }

      .error-message {
        background: linear-gradient(135deg, 
          rgba(239, 68, 68, 0.1) 0%, 
          rgba(220, 38, 38, 0.1) 100%);
        border: 2px solid rgba(239, 68, 68, 0.3);
        border-radius: 16px;
        padding: 16px;
        margin-top: 16px;
        font-size: 14px;
        color: #dc2626;
        font-weight: 500;
        backdrop-filter: blur(10px);
      }

      /* TailoredResumeDisplay styles */
      .tailored-resume-display {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 12px;
        padding: 16px;
        margin: 12px 0;
        color: white;
        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
        animation: slideIn 0.3s ease-out;
      }

      .tailored-resume-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }

      .tailored-resume-header h4 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: rgb(255, 255, 255);
      }

      .company-name {
        background: rgba(255, 255, 255, 0.2);
        padding: 4px 8px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 500;
      }

      .tailored-resume-item {
        display: flex;
        align-items: center;
        background: rgba(220, 212, 212, 0.1);
        border-radius: 8px;
        padding: 12px;
        cursor: grab;
        transition: all 0.2s ease;
        border: 2px dashed transparent;
      }

      .tailored-resume-item:hover {
        background: rgba(255, 255, 255, 0.15);
        transform: translateY(-1px);
      }

      .tailored-resume-item:active {
        cursor: grabbing;
      }

      .tailored-resume-item[draggable="true"] {
        border-color: rgba(255, 255, 255, 0.3);
      }

      .resume-icon {
        font-size: 24px;
        margin-right: 12px;
        opacity: 0.9;
      }

      .resume-info {
        flex: 1;
      }

      .resume-title {
        font-weight: 600;
        font-size: 14px;
        margin-bottom: 2px;
      }

      .resume-date {
        font-size: 12px;
        opacity: 0.8;
      }

      .resume-actions {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .download-btn {
        background: rgba(255, 255, 255, 0.2);
        border: none;
        border-radius: 6px;
        padding: 8px;
        cursor: pointer;
        font-size: 14px;
        color: white;
        transition: background 0.2s ease;
      }

      .download-btn:hover {
        background: rgba(255, 255, 255, 0.3);
      }

      .drag-indicator {
        font-size: 14px;
        opacity: 0.7;
        cursor: grab;
      }

      .usage-hint {
        text-align: center;
        font-size: 11px;
        opacity: 0.8;
        margin-top: 8px;
      }

      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      /* Mobile responsiveness */
      @media (max-width: 768px) {
        .ai-resume-tailor-widget {
          width: 300px;
          right: 10px;
          top: 60px;
          border-radius: 16px;
        }
        
        .widget-header {
          padding: 20px 16px;
        }
        
        .widget-header h3 {
          font-size: 20px;
        }
        
        .widget-content {
          padding: 20px 16px;
        }
        
        .btn {
          padding: 12px 16px;
          font-size: 13px;
        }
      }

      @media (max-width: 1024px) {
        .ai-resume-tailor-widget {
          width: 320px;
        }
      }

      @media (min-width: 1400px) {
        .ai-resume-tailor-widget {
          width: 360px;
          right: 30px;
        }
      }
    `;
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