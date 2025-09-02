import { JobData } from '../types/resume';


export class JobPageDetector {
  private isJobPage: boolean = false;
  private jobData: JobData | null = null;
  private debugMode: boolean = false;
  private recheckTimeout: number | null = null;

  constructor() {
    this.debugMode = false;
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
    // Route everything through the improved generic detection
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
    
    if (confidence >= 0.6) {
      this.isJobPage = true;
      this.extractCompanyJobData();
      
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
    
    // Try meta tags first for official company name
    const metaSelectors = [
      'meta[property="og:site_name"]',
      'meta[name="author"]',
      'meta[name="company"]',
      'meta[name="application-name"]',
      'meta[property="og:title"]'
    ];
    
    for (const selector of metaSelectors) {
      const metaElement = document.querySelector(selector);
      if (metaElement) {
        const content = metaElement.getAttribute('content');
        if (content && content.trim().length > 0 && !content.toLowerCase().includes('job') && !content.toLowerCase().includes('career')) {
          return content.trim();
        }
      }
    }

    // Try hostname first for Greenhouse and similar job boards
    if (hostname.includes('greenhouse.io')) {
      // For Greenhouse, company name is usually in the subdomain
      const subdomain = hostname.split('.')[0];
      if (subdomain !== 'job-boards' && subdomain !== 'www') {
        return this.cleanCompanyName(subdomain.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));
      }
    }

    // Company-specific selectors ordered by reliability
    const companySelectors = [
      // Highly specific company name selectors
      '.company-name, .companyName, .company_name, .organization-name',
      '.employer, .employer-name, .employerName, .brand-name, .brandName',
      
      // Logo and header company identification
      'header .logo img[alt], .header .logo img[alt], .brand img[alt]',
      'header .company img[alt], .header .brand img[alt]',
      '.logo img[alt], .brand img[alt], .company-logo img[alt]',
      
      // Title and navigation elements
      '.site-title, .site-name, .brand-title, .company-title',
      'header h1, .header h1, .masthead h1',
      '.navbar-brand, .nav-brand, .site-brand',
      
      // Data attributes
      '[data-testid*="company"], [data-test*="company"]',
      '[data-cy*="company"], [data-automation-id*="company"]',
      
      // Breadcrumb and navigation context
      '.breadcrumb a:first-child, nav a:first-child',
      '.home-link, .brand-link, [href="/"] img[alt]',
      
      // Footer company info
      'footer .company, .footer .company, footer .brand',
      
      // Greenhouse-specific patterns
      '.company, .app-title, .header-company, h1 a',
      '.board-header, .board-title, .job-board-header'
    ];

    let bestMatch = { text: '', score: 0 };
    
    for (const selector of companySelectors) {
      const elements = document.querySelectorAll(selector);

      elements.forEach(element => {
        const text = element.textContent?.trim() || element.getAttribute('alt')?.trim() || '';
        if (text.length > 0) {
          const score = this.scoreCompanyName(text, selector, element);
          if (this.debugMode) {
            console.log('Company candidate:', { selector, text, score });
          }
          if (score > bestMatch.score) {
            bestMatch = { text, score };
          }
        }
      });
    }
    
    if (bestMatch.text && bestMatch.score > 10) {
      return this.cleanCompanyName(bestMatch.text);
    }

    // Try to extract from page title
    const pageTitle = document.title;
    if (pageTitle.includes(' - ')) {
      const parts = pageTitle.split(' - ');
      // Usually company name is last part or first part
      const lastPart = parts[parts.length - 1].trim();
      const firstPart = parts[0].trim();
      
      if (!this.isJobRelatedTitle(lastPart)) {
        return this.cleanCompanyName(lastPart);
      } else if (!this.isJobRelatedTitle(firstPart)) {
        return this.cleanCompanyName(firstPart);
      }
    }

    // Fallback to hostname-based company name
    return this.cleanCompanyName(
      hostname.replace('www.', '').replace('careers.', '').replace('jobs.', '')
        .split('.')[0]
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase())
    );
  }

  private scoreCompanyName(text: string, selector: string, element: Element): number {
    let score = 0;
    
    // Length scoring (sweet spot is 2-30 characters)
    if (text.length >= 2 && text.length <= 30) score += 20;
    else if (text.length <= 50) score += 10;
    
    // Selector specificity scoring
    if (selector.includes('company') || selector.includes('brand')) score += 30;
    else if (selector.includes('logo') || selector.includes('site-title')) score += 25;
    else if (selector.includes('header') || selector.includes('nav')) score += 15;
    
    // Position scoring (header elements more likely to be company name)
    if (element.closest('header, .header, .masthead, nav, .nav')) score += 15;
    if (element.closest('footer, .footer')) score += 5; // footer less reliable
    
    // Content quality scoring
    if (text.match(/^[A-Z][a-zA-Z\s&.,'-]+$/)) score += 10; // proper capitalization
    if (!text.toLowerCase().includes('job') && !text.toLowerCase().includes('career') && !text.toLowerCase().includes('hire')) score += 15;
    
    // Penalty for generic terms
    const genericTerms = ['home', 'welcome', 'menu', 'navigation', 'search', 'login', 'sign', 'apply'];
    if (genericTerms.some(term => text.toLowerCase().includes(term))) score -= 20;
    
    return score;
  }

  private isJobRelatedTitle(title: string): boolean {
    const jobTerms = ['job', 'career', 'position', 'role', 'hiring', 'employment', 'vacancy', 'opening'];
    return jobTerms.some(term => title.toLowerCase().includes(term));
  }

  private cleanCompanyName(name: string): string {
    return name
      .replace(/\s*[-|].*$/, '') // Remove everything after dash or pipe
      .replace(/\s*(inc|llc|corp|ltd|co)\b\.?\s*$/i, '') // Remove corporate suffixes
      .replace(/\s+careers?\b/i, '') // Remove 'career' or 'careers'
      .replace(/\s+jobs?\b/i, '') // Remove 'job' or 'jobs'
      .trim();
  }

  private extractJobDescription(): string {
    // Get clean body text first
    document.querySelectorAll('script, style, noscript, form').forEach(el => el.remove());
    const bodyText = document.body.textContent || '';
    
    // Remove noise elements
    const elementsToRemove = [
      'nav', 'header', 'footer', '.nav', '.header', '.footer',
      '.menu', '.navigation', '.breadcrumb', '.sidebar', '.ads',
      '.cookie-banner', '.privacy-notice', '.modal', '.popup'
    ];
    
    let cleanText = bodyText;
    elementsToRemove.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        if (element.textContent) {
          cleanText = cleanText.replace(element.textContent, '');
        }
      });
    });

    // Remove AudioEye accessibility scripts (most aggressive first)
    cleanText = cleanText.replace(/This website is AudioEye enabled.*?activate the button labeled[^.]*\./g, '');
    cleanText = cleanText.replace(/!function\(\w*\)\{[^}]*\}\([^)]*\);/g, '');
    cleanText = cleanText.replace(/var ae_f = function[^;]*;/g, '');
    cleanText = cleanText.replace(/ae_f\.[^;]*;/g, '');
    cleanText = cleanText.replace(/window\.AudioEye[^;]*;/g, '');
    cleanText = cleanText.replace(/AudioEye\.[^;]*;/g, '');
    cleanText = cleanText.replace(/\$ae\([^)]*\)[^;]*;/g, '');
    cleanText = cleanText.replace(/ele\.outerFind\([^;]*;/g, '');
    cleanText = cleanText.replace(/api\.\w+\([^;]*;/g, '');
    
    // Remove JSON-LD structured data blocks
    cleanText = cleanText.replace(/\{\s*"@context":\s*"[^"]*"[^}]*\}(?:\s*\})*[^}]*\}/g, '');
    cleanText = cleanText.replace(/"[^"]*":\s*\{[^}]*\}/g, '');
    cleanText = cleanText.replace(/"[^"]*":\s*\[[^\]]*\]/g, '');
    
    // Remove large form configuration blocks
    cleanText = cleanText.replace(/gform[^}]*\}[^}]*\}/g, '');
    cleanText = cleanText.replace(/wp\.i18n[^}]*\}/g, '');
    cleanText = cleanText.replace(/var\s+gform_theme_config\s*=[^;]*;/g, '');
    cleanText = cleanText.replace(/angular\.module\([^}]*\}[^}]*\}/g, '');
    
    // Remove accessibility enhancement scripts (ae_f blocks)
    cleanText = cleanText.replace(/!\s*\}\s*\(ae_f\)[^}]*$/gm, '');
    cleanText = cleanText.replace(/\/\/#\s*sourceURL=[^\n]*\n/g, '');
    cleanText = cleanText.replace(/\[AEI-\d+\][^}]*/g, '');
    cleanText = cleanText.replace(/\/\/\s*Commented out line[^}]*/g, '');
    
    // Remove CSS variable blocks and inline styles
    cleanText = cleanText.replace(/--[\w-]+:\s*[^;]*;/g, '');
    cleanText = cleanText.replace(/style=\\?"[^"]*\\?"/g, '');
    
    // Remove navigation and interface noise
    cleanText = cleanText.replace(/Skip to Main Content/g, '');
    cleanText = cleanText.replace(/Opens in new window/g, '');
    cleanText = cleanText.replace(/Bespoke Resume.*?Processing\.\.\./g, '');
    cleanText = cleanText.replace(/© \d{4} [^\.]*\. All rights reserved\./g, '');
    cleanText = cleanText.replace(/Attachment Options/g, '');
    cleanText = cleanText.replace(/Explore your accessibility options/g, '');
    cleanText = cleanText.replace(/close carousel/g, '');
    
    // Remove URLs and technical artifacts
    cleanText = cleanText.replace(/https?:\/\/[^\s]+/g, '');
    cleanText = cleanText.replace(/Jobvite\s*=[^}]*\}/g, '');
    
    // Clean up whitespace and get substantial content
    cleanText = cleanText
      .replace(/\s+/g, ' ') // normalize whitespace
      .replace(/^\s*,\s*/g, '') // remove leading commas
      .replace(/\s*;\s*/g, ' ') // remove semicolons
      .replace(/\s*\.\s*\./g, '.') // fix double periods
      .trim();
    
    if (this.debugMode) {
      console.log('Body text length after cleanup:', cleanText.length);
      console.log('Preview:', cleanText.substring(0, 200) + '...');
    }
    
    return cleanText.substring(0, 100000);
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