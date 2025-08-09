class JobPageDetector {
  constructor() {
    this.isJobPage = false;
    this.jobData = null;
    this.debugMode = localStorage.getItem('aiResumeDebug') === 'true';
    this.init();
  }

  init() {
    this.detectJobPage();
    this.injectResumeWidget();
    this.observePageChanges();
  }

  detectJobPage() {
    const url = window.location.href.toLowerCase();
    const hostname = window.location.hostname.toLowerCase();
    
    // First check specific job board patterns
    const jobBoardPatterns = {
      'linkedin.com': {
        patterns: ['/jobs/view/', '/jobs/collections/'],
        selectors: {
          title: 'h1.t-24, .jobs-unified-top-card__job-title',
          company: '.jobs-unified-top-card__company-name, .job-details-jobs-unified-top-card__company-name',
          description: '.jobs-description-content__text, .jobs-box__html-content'
        }
      },
      'indeed.com': {
        patterns: ['/viewjob?', '/jobs/'],
        selectors: {
          title: '[data-testid="jobsearch-JobInfoHeader-title"], h1.jobsearch-JobInfoHeader-title',
          company: '[data-testid="inlineHeader-companyName"], .jobsearch-CompanyInfoContainer',
          description: '#jobDescriptionText, .jobsearch-jobDescriptionText'
        }
      },
      'glassdoor.com': {
        patterns: ['/job-listing/', '/jobs/'],
        selectors: {
          title: '[data-test="job-title"], .jobHeader',
          company: '[data-test="employer-name"], .employerName',
          description: '#JobDescriptionContainer, .jobDescriptionContent'
        }
      },
      'workday.com': {
        patterns: ['/job/', '/jobs/'],
        selectors: {
          title: '[data-automation-id="jobPostingHeader"], h1',
          company: '[data-automation-id="company"], .company-name',
          description: '[data-automation-id="jobPostingDescription"], .job-description'
        }
      },
      'greenhouse.io': {
        patterns: ['/jobs/', '/job/'],
        selectors: {
          title: '.app-title, h1',
          company: '.company-name, .app-company',
          description: '#content, .job-post-content'
        }
      },
      'lever.co': {
        patterns: ['/jobs/', '/job/'],
        selectors: {
          title: '.posting-headline h2, h2',
          company: '.company-name, .main-header-text',
          description: '.posting-content, .job-description'
        }
      }
    };

    // Check known job boards first
    for (const [domain, config] of Object.entries(jobBoardPatterns)) {
      if (hostname.includes(domain)) {
        const isMatch = config.patterns.some(pattern => url.includes(pattern));
        if (isMatch) {
          this.isJobPage = true;
          this.extractJobData(config.selectors);
          return;
        } else {
          this.isJobPage = false;
          this.jobData = null;
        }
      }
    }

    // Enhanced generic detection for company websites
    this.detectCompanyJobPage();
  }

  detectCompanyJobPage() {
    const url = window.location.href.toLowerCase();
    const hostname = window.location.hostname.toLowerCase();
    const text = document.body.textContent.toLowerCase();
    
    // URL patterns that suggest job postings
    const jobUrlPatterns = [
      '/career', '/careers', '/job', '/jobs', '/positions', '/openings',
      '/opportunities', '/apply', '/hiring', '/work-with-us', '/join-us',
      '/employment', '/vacancy', '/vacancies', '/job-board', '/open-roles',
      '/current-openings', '/job-listing', '/position', '/role'
    ];
    
    // Content keywords that indicate job postings
    const jobKeywords = [
      'job description', 'responsibilities', 'requirements', 'qualifications',
      'apply now', 'job posting', 'position', 'role', 'career opportunity',
      'we are hiring', 'join our team', 'employment', 'full time', 'part time',
      'remote work', 'on-site', 'hybrid', 'salary', 'benefits', 'experience required',
      'skills needed', 'job summary', 'about the role', 'what you\'ll do',
      'who you are', 'minimum qualifications', 'preferred qualifications',
      'education required', 'years of experience', 'job type', 'location',
      'reports to', 'team', 'department', 'apply for this job', 'submit application'
    ];

    // Meta tags and structured data indicators
    // const hasJobMetadata = this.checkJobMetadata();
    
    // Check URL patterns
    const urlMatch = jobUrlPatterns.some(pattern => url.includes(pattern));
    
    // Check content keywords (need at least 4 for stronger confidence)
    const keywordCount = jobKeywords.filter(keyword => text.includes(keyword)).length;
    
    // Check page structure
    const hasJobStructure = this.checkJobPageStructure();
    
    // Check for application forms or buttons
    const hasApplicationElements = this.checkApplicationElements();
    
    // Combine all signals for detection
    const confidence = this.calculateJobPageConfidence({
      urlMatch,
      keywordCount,
      hasJobStructure,
      hasApplicationElements,
      // hasJobMetadata,
      textLength: text.length
    });
    
    if (this.debugMode) {
      console.log('Bespoke Resume Debug:', {
        url: window.location.href,
        urlMatch,
        keywordCount,
        hasJobStructure,
        hasApplicationElements,
        // hasJobMetadata,
        confidence
      });
    }
    
    if (confidence >= 0.6) { // 60% confidence threshold
      this.isJobPage = true;
      this.extractCompanyJobData();
      
      if (this.debugMode) {
        console.log('Job page detected!', this.jobData);
      }
    }
  }

  // checkJobMetadata() {
  //   // Check for job-related meta tags or structured data
  //   const metaTags = document.querySelectorAll('meta[property*="job"], meta[name*="job"], script[type="application/ld+json"]');
  //   const hasJobSchema = Array.from(document.scripts).some(script => 
  //     script.textContent.includes('JobPosting') || script.textContent.includes('"@type":"Job"')
  //   );
    
  //   return metaTags.length > 0 || hasJobSchema;
  // }

  checkJobPageStructure() {
    // Look for common job page elements
    const jobSelectors = [
      'h1[class*="job"], h1[class*="position"], h1[class*="role"], h1[class*="title"]',
      '.job-title, .position-title, .role-title, .job-header',
      '.job-description, .job-details, .position-description, .role-description',
      '.requirements, .qualifications, .responsibilities, .job-requirements',
      '.apply-button, .application-button, [class*="apply"], [href*="apply"]',
      '.job-meta, .job-info, .position-info, .job-summary',
      '.salary, .compensation, .benefits, .job-benefits'
    ];
    
    const foundElements = jobSelectors.filter(selector => 
      document.querySelector(selector)
    ).length;
    
    return foundElements >= 3; // Need at least 3 structural elements
  }

  checkApplicationElements() {
    // Look for application-related elements
    const applicationSelectors = [
      'button[class*="apply"], a[class*="apply"]',
      'button[href*="apply"], a[href*="apply"]',
      'form[class*="application"], form[class*="apply"]',
      'input[type="file"][accept*="pdf"], input[type="file"][accept*="doc"]',
      '.apply-now, .submit-application, .job-application',
      '[class*="upload"][class*="resume"], [class*="upload"][class*="cv"]'
    ];
    
    return applicationSelectors.some(selector => document.querySelector(selector));
  }

  calculateJobPageConfidence(signals) {
    let confidence = 0;
    
    // URL pattern match (strong signal)
    if (signals.urlMatch) confidence += 0.3;
    
    // Keyword density
    if (signals.keywordCount >= 8) confidence += 0.25;
    else if (signals.keywordCount >= 5) confidence += 0.15;
    else if (signals.keywordCount >= 3) confidence += 0.1;
    
    // Page structure (strong signal)
    if (signals.hasJobStructure) confidence += 0.25;
    
    // Application elements
    if (signals.hasApplicationElements) confidence += 0.15;
    
    // Metadata
    // if (signals.hasJobMetadata) confidence += 0.2;
    
    // Text length (job descriptions are usually substantial)
    if (signals.textLength > 2000) confidence += 0.05;
    
    return Math.min(confidence, 1.0); // Cap at 100%
  }

  extractCompanyJobData() {
    // Generic extraction for company websites
    const title = this.extractJobTitle();
    const company = this.extractCompanyName();
    const description = this.extractJobDescription();

    this.jobData = {
      title,
      company,
      description,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      source: 'company_website'
    };
  }

  extractJobTitle() {
    // Try multiple strategies to find job title
    const titleSelectors = [
      'h1[class*="job"], h1[class*="position"], h1[class*="role"], h1[class*="title"]',
      '.job-title, .position-title, .role-title, .job-header h1',
      'h1.title, h1.heading, .page-title h1, .content-title h1',
      'h1', 'h2[class*="job"], h2[class*="position"], h2[class*="role"]'
    ];

    for (const selector of titleSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim().length > 5) {
        const title = element.textContent.trim();
        // Filter out obviously non-job titles
        if (!title.toLowerCase().includes('cookie') && 
            !title.toLowerCase().includes('privacy') &&
            !title.toLowerCase().includes('terms')) {
          return title;
        }
      }
    }

    // Fallback to page title
    const pageTitle = document.title;
    return pageTitle.includes(' - ') ? pageTitle.split(' - ')[0] : pageTitle;
  }

  extractCompanyName() {
    // Try to extract company name from various sources
    const hostname = window.location.hostname;
    
    // Try meta tags first
    const companyMeta = document.querySelector('meta[property="og:site_name"], meta[name="author"], meta[name="company"]');
    if (companyMeta) {
      return companyMeta.getAttribute('content');
    }

    // Try common selectors
    const companySelectors = [
      '.company-name, .organization, .employer, .brand-name',
      'header .logo img[alt], .header .logo img[alt]',
      '.site-title, .site-name, .brand-title'
    ];

    for (const selector of companySelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent || element.getAttribute('alt') || '';
        if (text.trim().length > 0) {
          return text.trim();
        }
      }
    }

    // Extract from hostname as fallback
    return hostname.replace('www.', '').split('.')[0]
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  extractJobDescription() {
    // Try to find the main job description content
    const descriptionSelectors = [
      '.job-description, .position-description, .role-description',
      '.job-details, .job-content, .position-details',
      '.description, .content, .details',
      'main, .main-content, .page-content, .content-area',
      '.requirements, .responsibilities, .qualifications'
    ];

    let description = '';
    
    for (const selector of descriptionSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim().length > 200) {
        description = element.textContent.trim();
        break;
      }
    }

    // If no specific description found, use body content but filter out nav/footer
    if (!description) {
      const bodyText = document.body.textContent;
      const nav = document.querySelector('nav')?.textContent || '';
      const footer = document.querySelector('footer')?.textContent || '';
      
      description = bodyText
        .replace(nav, '')
        .replace(footer, '')
        .trim()
        .substring(0, 5000); // Limit to reasonable length
    }

    return description;
  }

  extractJobData(selectors) {
    this.jobData = {
      title: this.getElementText(selectors.title),
      company: this.getElementText(selectors.company),
      description: this.getElementText(selectors.description),
      url: window.location.href,
      timestamp: new Date().toISOString()
    };
  }


  getElementText(selector) {
    const element = document.querySelector(selector);
    return element ? element.textContent.trim() : '';
  }

  injectResumeWidget() {
    // if (!this.isJobPage) return;

    const existingWidget = document.getElementById('ai-resume-tailor-widget');
    if (existingWidget) return;

    const widget = document.createElement('div');
    widget.id = 'ai-resume-tailor-widget';
    widget.className = 'ai-resume-tailor-widget';
    
    this.createWidgetHTML(widget);
    this.setupWidgetEvents(widget);

    const targetElement = this.findBestInsertionPoint();
    if (targetElement) {
      targetElement.appendChild(widget);
    } else {
      document.body.appendChild(widget);
    }
  }

  createWidgetHTML(widget) {
    widget.innerHTML = `
      <div class="widget-container">
        <div class="widget-header">
          <button class="widget-close-btn" id="widgetCloseBtn" title="Close widget">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
          <h3>Bespoke Resume</h3>
          <div class="job-detection">
            <div class="job-detection-dot" id="jobDetectionDot"></div>
            <span id="jobDetectionText">Job page detected</span>
          </div>
          <div id="jobDetectionDetail">${this.jobData?.title || 'Finding opportunity...'} ${this.jobData?.company ? 'at ' + this.jobData?.company : ''}</div>
        </div>

        <div class="widget-content">
          <div class="resume-status" id="resumeStatus">
            Checking resume status...
          </div>

          <div class="action-buttons">
            <button id="tailorResumeBtn" class="btn btn-primary" disabled>
              Tailor Resume
            </button>
            <button id="uploadResumeBtn" class="btn btn-secondary">
              Upload Resume
            </button>
            <button id="viewHistoryBtn" class="btn btn-secondary">
              View History
            </button>
          </div>

          <div id="loadingSection" class="loading-section hidden">
            <div class="spinner"></div>
            <span id="loadingText">Processing...</span>
          </div>
        </div>
      </div>
    `;
  }

  setupWidgetEvents(widget) {
    const tailorBtn = widget.querySelector('#tailorResumeBtn');
    const uploadBtn = widget.querySelector('#uploadResumeBtn');
    const historyBtn = widget.querySelector('#viewHistoryBtn');
    const closeBtn = widget.querySelector('#widgetCloseBtn');

    tailorBtn?.addEventListener('click', () => this.handleTailorResume());
    uploadBtn?.addEventListener('click', () => this.handleUploadResume());
    historyBtn?.addEventListener('click', () => this.handleViewHistory());
    closeBtn?.addEventListener('click', () => this.handleCloseWidget());

    // Initialize widget state once
    // this.checkResumeStatus();
    // this.updateJobDetectionDisplay();
  }

  handleCloseWidget() {
    const widget = document.getElementById('ai-resume-tailor-widget');
    if (widget) {
      this.cleanup(); // Clean up any timers
      widget.remove();
    }
  }

  updateJobDetectionDisplay() {
    const jobDetectionText = document.getElementById('jobDetectionText');
    const jobDetectionDetail = document.getElementById('jobDetectionDetail');
    const jobDetectionDot = document.getElementById('jobDetectionDot');
    
    if (!jobDetectionText || !jobDetectionDetail || !jobDetectionDot) return;
    
    // Re-extract job data if it's not available or incomplete
    if (!this.jobData || !this.jobData.title || !this.jobData.company || 
        this.jobData.title === 'Loading...' || this.jobData.company === '...') {
      this.extractJobDataFromPage();
    }
    
    if (this.isJobPage && this.jobData && this.jobData.title && this.jobData.company) {
      jobDetectionText.textContent = 'Job page detected';
      jobDetectionDetail.textContent = `${this.jobData.title} at ${this.jobData.company}`;
      jobDetectionDot.classList.remove('inactive');
    } else if (this.isJobPage) {
      jobDetectionText.textContent = 'Job page detected';
      jobDetectionDetail.textContent = 'Extracting job details...';
      jobDetectionDot.classList.remove('inactive');
    } else {
      jobDetectionText.textContent = 'No job page detected';
      jobDetectionDetail.textContent = 'Navigate to a job posting to tailor your resume';
      jobDetectionDot.classList.add('inactive');
    }
  }

  extractJobDataFromPage() {
    if (!this.isJobPage) return;
    
    // Re-run the job data extraction
    if (this.jobData) {
      const title = this.extractJobTitle();
      const company = this.extractCompanyName();
      const description = this.extractJobDescription();
      
      if (title && title !== 'Loading...' && company && company !== '...') {
        this.jobData = {
          title,
          company,
          description,
          url: window.location.href,
          timestamp: new Date().toISOString(),
          source: this.jobData.source || 'company_website'
        };
      }
    }
  }

  async checkResumeStatus() {
    // Prevent multiple simultaneous calls
    if (this.isCheckingResumeStatus) return;
    this.isCheckingResumeStatus = true;
    
    try {
      const result = await chrome.storage.sync.get(['baseResume', 'resumeHistory']);
      const statusElement = document.getElementById('resumeStatus');
      const tailorBtn = document.getElementById('tailorResumeBtn');
      
      if (!statusElement) {
        this.isCheckingResumeStatus = false;
        return;
      }
      
      if (result.baseResume) {
        statusElement.textContent = `Base resume uploaded (${new Date(result.baseResume.uploadDate).toLocaleDateString()})`;
        if (tailorBtn) tailorBtn.disabled = false;
      } else {
        statusElement.textContent = 'No base resume uploaded yet';
      }

      if (result.resumeHistory && result.resumeHistory.length > 0) {
        const historyCount = result.resumeHistory.length;
        statusElement.textContent += ` • ${historyCount} tailored resume${historyCount > 1 ? 's' : ''}`;
      }
    } catch (error) {
      console.error('Error checking resume status:', error);
      const statusElement = document.getElementById('resumeStatus');
      if (statusElement) {
        statusElement.textContent = 'Error checking resume status';
      }
    } finally {
      this.isCheckingResumeStatus = false;
    }
  }

  async handleTailorResume() {
    if (!this.jobData) return;

    this.showLoading('Analyzing job description...');
    
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'tailorResume',
        jobData: this.jobData
      });

      if (response.success) {
        this.showLoading('Resume tailored successfully!');
        setTimeout(() => {
          this.hideLoading();
          this.checkResumeStatus();
        }, 1000);
      } else {
        throw new Error(response.error || 'Failed to tailor resume');
      }
    } catch (error) {
      console.error('Error tailoring resume:', error);
      this.showLoading('Error: ' + error.message);
      setTimeout(() => this.hideLoading(), 2000);
    }
  }

  handleUploadResume() {
    this.showLoading('Select your resume file...');
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx,.txt';
    input.style.position = 'absolute';
    input.style.left = '-9999px';
    input.style.opacity = '0';
    
    const processFile = async (file) => {
      try {
        if (!file) {
          this.hideLoading();
          return;
        }

        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
          this.showLoading('Error: File too large (max 10MB)');
          setTimeout(() => this.hideLoading(), 2000);
          return;
        }

        const allowedTypes = ['application/pdf', 'application/msword', 
                             'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
                             'text/plain'];
        if (!allowedTypes.includes(file.type) && !file.name.match(/\.(pdf|doc|docx|txt)$/i)) {
          this.showLoading('Error: Unsupported file type');
          setTimeout(() => this.hideLoading(), 2000);
          return;
        }

        this.showLoading('Reading file...');
        const fileData = await this.fileToBase64(file);
        
        this.showLoading('Uploading resume...');
        
        const response = await chrome.runtime.sendMessage({
          action: 'uploadResume',
          file: fileData,
          fileName: file.name,
          fileType: file.type
        });

        if (response && response.success) {
          this.showLoading('Resume uploaded successfully!');
          setTimeout(() => {
            this.hideLoading();
            this.checkResumeStatus();
          }, 1000);
        } else {
          throw new Error(response?.error || 'Failed to upload resume');
        }
      } catch (error) {
        console.error('Error uploading resume:', error);
        this.showLoading('Error: ' + (error.message || 'Upload failed'));
        setTimeout(() => this.hideLoading(), 5000);
      }
    };

    input.onchange = async (event) => {
      const file = event.target.files[0];
      await processFile(file);
      document.body.removeChild(input);
    };
    
    document.body.appendChild(input);
    setTimeout(() => input.click(), 10);
  }

  handleViewHistory() {
    chrome.runtime.sendMessage({ action: 'openHistoryPage' });
  }

  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  showLoading(message) {
    const loadingText = document.getElementById('loadingText');
    const loadingSection = document.getElementById('loadingSection');
    
    if (loadingText) loadingText.textContent = message;
    if (loadingSection) loadingSection.classList.remove('hidden');
  }

  hideLoading() {
    const loadingSection = document.getElementById('loadingSection');
    if (loadingSection) loadingSection.classList.add('hidden');
  }

  findBestInsertionPoint() {
    const selectors = [
      '.jobs-apply-button',
      '.apply-button',
      '[class*="apply"]',
      '.job-actions',
      '.job-header',
      'h1'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        return element.parentElement || element;
      }
    }
    return null;
  }

  handleResumeButtonClick() {
    try {
      if (!chrome.runtime?.id) {
        console.log('Extension context invalidated, please refresh the page');
        return;
      }
      
      chrome.runtime.sendMessage({
        action: 'tailorResume',
        jobData: this.jobData
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Message sending failed:', chrome.runtime.lastError.message);
        }
      });
    } catch (error) {
      console.error('Error sending tailor resume message:', error);
    }
  }

  handleUploadButtonClick() {
    try {
      if (!chrome.runtime?.id) {
        console.log('Extension context invalidated, please refresh the page');
        return;
      }
      
      // Open the extension popup to handle file upload
      chrome.runtime.sendMessage({
        action: 'uploadResume'
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Message sending failed:', chrome.runtime.lastError.message);
        }
      });
    } catch (error) {
      console.error('Error sending upload resume message:', error);
    }
  }

  observePageChanges() {
    const observer = new MutationObserver((mutations) => {
      let shouldRecheck = false;
      let significantChange = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // Only trigger on significant changes (new content, not just styling)
          for (let node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE && 
                (node.textContent?.length > 50 || // Substantial text content
                 node.querySelector && (
                   node.querySelector('h1, h2, .job-title, .position-title') || // Job title elements
                   node.querySelector('[class*="job"], [class*="position"], [class*="role"]') // Job-related classes
                 ))) {
              significantChange = true;
              shouldRecheck = true;
              break;
            }
          }
        }
      });

      if (shouldRecheck && significantChange) {
        // Debounce the recheck to avoid multiple rapid updates
        clearTimeout(this.recheckTimeout);
        this.recheckTimeout = setTimeout(() => {
          console.log('Significant page change detected, updating job detection...');
          
          // Only update job data, don't recreate the entire widget
          const previousJobData = this.jobData ? {...this.jobData} : null;
          this.detectJobPage();
          
          // Only update display if job data actually changed
          if (!previousJobData || 
              previousJobData.title !== this.jobData?.title || 
              previousJobData.company !== this.jobData?.company) {
            this.updateJobDetectionDisplay();
          }
        }, 500); // 0.5 second debounce
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // Clean up timers when needed
  cleanup() {
    if (this.recheckTimeout) {
      clearTimeout(this.recheckTimeout);
      this.recheckTimeout = null;
    }
  }
}

let jobPageDetector;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'showResumeWidget') {
    jobPageDetector.injectResumeWidget();
  };
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    jobPageDetector = new JobPageDetector();
    window.jobPageDetector = jobPageDetector;
  })
} else {
  jobPageDetector = new JobPageDetector();
  window.jobPageDetector = jobPageDetector;
}