import { JobData } from '../types/resume';

interface JobBoardConfig {
  patterns: string[];
  selectors: {
    title: string;
    company: string;
    description: string;
  };
}

export class JobPageDetector {
  private isJobPage: boolean = false;
  private jobData: JobData | null = null;
  private debugMode: boolean = false;
  private recheckTimeout: number | null = null;

  constructor() {
    this.debugMode = localStorage.getItem('aiResumeDebug') === 'true';
    this.init();
  }

  private init(): void {
    this.detectJobPage();
    this.observePageChanges();
  }

  public getJobData(): JobData | null {
    return this.jobData;
  }

  public isOnJobPage(): boolean {
    return this.isJobPage;
  }

  private detectJobPage(): void {
    const url = window.location.href.toLowerCase();
    const hostname = window.location.hostname.toLowerCase();
    
    const jobBoardPatterns: Record<string, JobBoardConfig> = {
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

  private detectCompanyJobPage(): void {
    const url = window.location.href.toLowerCase();
    const text = document.body.textContent?.toLowerCase() || '';
    
    const jobUrlPatterns = [
      '/career', '/careers', '/job', '/jobs', '/positions', '/openings',
      '/opportunities', '/apply', '/hiring', '/work-with-us', '/join-us',
      '/employment', '/vacancy', '/vacancies', '/job-board', '/open-roles',
      '/current-openings', '/job-listing', '/position', '/role'
    ];
    
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

    const urlMatch = jobUrlPatterns.some(pattern => url.includes(pattern));
    const keywordCount = jobKeywords.filter(keyword => text.includes(keyword)).length;
    const hasJobStructure = this.checkJobPageStructure();
    const hasApplicationElements = this.checkApplicationElements();
    
    const confidence = this.calculateJobPageConfidence({
      urlMatch,
      keywordCount,
      hasJobStructure,
      hasApplicationElements,
      textLength: text.length
    });
    
    if (this.debugMode) {
      console.log('Bespoke Resume Debug:', {
        url: window.location.href,
        urlMatch,
        keywordCount,
        hasJobStructure,
        hasApplicationElements,
        confidence
      });
    }
    
    if (confidence >= 0.6) {
      this.isJobPage = true;
      this.extractCompanyJobData();
      
      if (this.debugMode) {
        console.log('Job page detected!', this.jobData);
      }
    }
  }

  private checkJobPageStructure(): boolean {
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
    
    return foundElements >= 3;
  }

  private checkApplicationElements(): boolean {
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

  private calculateJobPageConfidence(signals: {
    urlMatch: boolean;
    keywordCount: number;
    hasJobStructure: boolean;
    hasApplicationElements: boolean;
    textLength: number;
  }): number {
    let confidence = 0;
    
    if (signals.urlMatch) confidence += 0.3;
    
    if (signals.keywordCount >= 8) confidence += 0.25;
    else if (signals.keywordCount >= 5) confidence += 0.15;
    else if (signals.keywordCount >= 3) confidence += 0.1;
    
    if (signals.hasJobStructure) confidence += 0.25;
    if (signals.hasApplicationElements) confidence += 0.15;
    if (signals.textLength > 2000) confidence += 0.05;
    
    return Math.min(confidence, 1.0);
  }

  private extractJobData(selectors: JobBoardConfig['selectors']): void {
    this.jobData = {
      title: this.getElementText(selectors.title),
      company: this.getElementText(selectors.company),
      description: this.getElementText(selectors.description),
      url: window.location.href,
      timestamp: new Date().toISOString()
    };
  }

  private extractCompanyJobData(): void {
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

  private extractJobTitle(): string {
    const titleSelectors = [
      'h1[class*="job"], h1[class*="position"], h1[class*="role"], h1[class*="title"]',
      '.job-title, .position-title, .role-title, .job-header h1',
      'h1.title, h1.heading, .page-title h1, .content-title h1',
      'h1', 'h2[class*="job"], h2[class*="position"], h2[class*="role"]'
    ];

    for (const selector of titleSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent && element.textContent.trim().length > 5) {
        const title = element.textContent.trim();
        if (!title.toLowerCase().includes('cookie') && 
            !title.toLowerCase().includes('privacy') &&
            !title.toLowerCase().includes('terms')) {
          return title;
        }
      }
    }

    const pageTitle = document.title;
    return pageTitle.includes(' - ') ? pageTitle.split(' - ')[0] : pageTitle;
  }

  private extractCompanyName(): string {
    const hostname = window.location.hostname;
    
    // const companyMeta = document.querySelector('meta[property="og:site_name"], meta[name="author"], meta[name="company"]');
    // if (companyMeta) {
    //   return companyMeta.getAttribute('content') || '';
    // }

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

    return hostname.replace('www.', '').split('.')[0]
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  private extractJobDescription(): string {
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
      if (element && element.textContent && element.textContent.trim().length > 200) {
        description = element.textContent.trim();
        break;
      }
    }

    if (!description) {
      const bodyText = document.body.textContent || '';
      const nav = document.querySelector('nav')?.textContent || '';
      const footer = document.querySelector('footer')?.textContent || '';
      
      description = bodyText
        .replace(nav, '')
        .replace(footer, '')
        .trim()
        .substring(0, 5000);
    }

    return description;
  }

  private getElementText(selector: string): string {
    const element = document.querySelector(selector);
    return element?.textContent?.trim() || '';
  }

  private observePageChanges(): void {
    const observer = new MutationObserver((mutations) => {
      let shouldRecheck = false;
      let significantChange = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          for (let node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              if (element.textContent && element.textContent.length > 50 ||
                  element.querySelector && (
                    element.querySelector('h1, h2, .job-title, .position-title') ||
                    element.querySelector('[class*="job"], [class*="position"], [class*="role"]')
                  )) {
                significantChange = true;
                shouldRecheck = true;
                break;
              }
            }
          }
        }
      });

      if (shouldRecheck && significantChange) {
        if (this.recheckTimeout) {
          clearTimeout(this.recheckTimeout);
        }
        this.recheckTimeout = window.setTimeout(() => {
          console.log('Significant page change detected, updating job detection...');
          this.detectJobPage();
        }, 500);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  public cleanup(): void {
    if (this.recheckTimeout) {
      clearTimeout(this.recheckTimeout);
      this.recheckTimeout = null;
    }
  }

  public redetect(): void {
    this.detectJobPage();
  }
}