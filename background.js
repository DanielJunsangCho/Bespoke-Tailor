class BackgroundService {
  constructor() {
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.initializeAuth();
  }

  setupEventListeners() {
    chrome.runtime.onInstalled.addListener(() => {
      console.log('Bespoke Resume extension installed');
    });

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true;
    });
  }

  async handleMessage(request, sender, sendResponse) {
    try {
      if (!request || !request.action) {
        sendResponse({ success: false, error: 'Invalid request format' });
        return;
      }

      switch (request.action) {
        case 'tailorResume':
          if (!request.jobData) {
            sendResponse({ success: false, error: 'Job data is required' });
            return;
          }
          const result = await this.tailorResume(request.jobData);
          sendResponse({ success: true, data: result });
          break;
          
        case 'uploadResume':
          if (!request.file || !request.fileName) {
            sendResponse({ success: false, error: 'File data and name are required' });
            return;
          }
          console.log('Uploading resume...');
          const uploadResult = await this.uploadResume(request.file, request.fileName, request.fileType);
          sendResponse({ success: true, data: uploadResult });
          break;
          
        case 'authenticateGoogle':
          const authResult = await this.authenticateGoogle();
          sendResponse({ success: true, data: authResult });
          break;
          
        case 'openHistoryPage':
          chrome.tabs.create({ url: 'history.html' });
          sendResponse({ success: true });
          break;
          
        default:
          sendResponse({ success: false, error: 'Unknown action: ' + request.action });
      }
    } catch (error) {
      console.error('Background service error:', error);
      const errorMessage = error.message || 'Unknown error occurred';
      sendResponse({ success: false, error: errorMessage });
    }
  }

  async initializeAuth() {
    try {
      const token = await chrome.storage.sync.get(['googleToken']);
      if (token.googleToken) {
        console.log('Google authentication token found');
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
    }
  }

  async authenticateGoogle() {
    try {
      const token = await chrome.identity.getAuthToken({ 
        interactive: true,
        scopes: [
          'https://www.googleapis.com/auth/documents',
          'https://www.googleapis.com/auth/drive.file'
        ]
      });

      await chrome.storage.sync.set({ googleToken: token });
      return { token, authenticated: true };
    } catch (error) {
      console.error('Google authentication failed:', error);
      throw new Error('Failed to authenticate with Google');
    }
  }

  async uploadResume(fileData, fileName, fileType) {
    try {
      // Skip Google Docs creation for now, just store locally
      const base64Data = fileData.split(',')[1];
      // const docId = await this.createGoogleDoc(token, fileName, base64Data, fileType);
      
      const resumeData = {
        docId: 'local-' + Date.now(), // Generate local ID
        fileName,
        fileType,
        uploadDate: new Date().toISOString(),
        originalContent: base64Data
      };

      await chrome.storage.sync.set({ baseResume: resumeData });
      return resumeData;
    } catch (error) {
      console.error('Error uploading resume:', error);
      throw new Error('Failed to upload resume to Google Docs');
    }
  }

  async createGoogleDoc(token, title, content, fileType) {
    try {
      let docContent = '';
      
      if (fileType === 'application/pdf') {
        docContent = 'PDF content will be processed by AI service';
      } else if (fileType.includes('text')) {
        docContent = atob(content);
      } else {
        docContent = 'Document uploaded - content will be processed by AI service';
      }

      const createResponse = await fetch('https://docs.googleapis.com/v1/documents', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: `Resume - ${title}`
        })
      });

      if (!createResponse.ok) {
        throw new Error('Failed to create Google Doc');
      }

      const doc = await createResponse.json();
      
      const updateResponse = await fetch(`https://docs.googleapis.com/v1/documents/${doc.documentId}:batchUpdate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requests: [{
            insertText: {
              location: { index: 1 },
              text: docContent
            }
          }]
        })
      });

      if (!updateResponse.ok) {
        throw new Error('Failed to update Google Doc with content');
      }

      return doc.documentId;
    } catch (error) {
      console.error('Error creating Google Doc:', error);
      throw error;
    }
  }

  async tailorResume(jobData) {
    try {
      const baseResume = await chrome.storage.sync.get(['baseResume']);
      if (!baseResume.baseResume) {
        throw new Error('No base resume found. Please upload a resume first.');
      }

      const token = await this.ensureAuthenticated();
      
      const aiAnalysis = await this.analyzeJobDescription(jobData);
      const tailoredContent = await this.generateTailoredResume(baseResume.baseResume, jobData, aiAnalysis);
      
      const tailoredDocId = await this.createTailoredDocument(token, tailoredContent, jobData);
      
      const tailoredResume = {
        docId: tailoredDocId,
        jobTitle: jobData.title,
        company: jobData.company,
        jobUrl: jobData.url,
        createdDate: new Date().toISOString(),
        aiAnalysis
      };

      await this.saveToHistory(tailoredResume);
      
      return tailoredResume;
    } catch (error) {
      console.error('Error tailoring resume:', error);
      throw error;
    }
  }

  async analyzeJobDescription(jobData) {
    const analysis = {
      keywords: this.extractKeywords(jobData.description),
      requiredSkills: this.extractSkills(jobData.description),
      experienceLevel: this.determineExperienceLevel(jobData.description),
      companyInfo: {
        name: jobData.company,
        industry: 'To be determined by AI service'
      }
    };

    return analysis;
  }

  extractKeywords(description) {
    const commonKeywords = [
      'javascript', 'python', 'java', 'react', 'angular', 'vue', 'node.js',
      'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'sql', 'nosql',
      'agile', 'scrum', 'ci/cd', 'git', 'leadership', 'management',
      'machine learning', 'ai', 'data science', 'analytics'
    ];

    const text = description.toLowerCase();
    return commonKeywords.filter(keyword => text.includes(keyword.toLowerCase()));
  }

  extractSkills(description) {
    const skillPatterns = [
      /(\d+)\+?\s*years?\s*(?:of\s*)?experience/gi,
      /experience\s*(?:with|in)\s*([^,.]+)/gi,
      /proficient\s*(?:with|in)\s*([^,.]+)/gi,
      /knowledge\s*(?:of|in)\s*([^,.]+)/gi
    ];

    const skills = [];
    skillPatterns.forEach(pattern => {
      const matches = description.match(pattern);
      if (matches) {
        skills.push(...matches);
      }
    });

    return skills.slice(0, 10);
  }

  determineExperienceLevel(description) {
    const text = description.toLowerCase();
    if (text.includes('entry level') || text.includes('junior') || text.includes('0-2 years')) {
      return 'entry';
    } else if (text.includes('senior') || text.includes('5+ years') || text.includes('lead')) {
      return 'senior';
    } else {
      return 'mid';
    }
  }

  async generateTailoredResume(baseResume, jobData, analysis) {
    return `TAILORED RESUME FOR: ${jobData.title} at ${jobData.company}

Generated on: ${new Date().toLocaleDateString()}

KEY OPTIMIZATIONS BASED ON JOB ANALYSIS:
- Highlighted keywords: ${analysis.keywords.join(', ')}
- Emphasized relevant skills: ${analysis.requiredSkills.slice(0, 5).join(', ')}
- Adjusted for ${analysis.experienceLevel} level position

[Original resume content would be processed and tailored here by AI service]

This is a placeholder for the AI-tailored resume content.
The actual implementation would integrate with Claude or another AI service
to intelligently modify the resume based on the job requirements.`;
  }

  async createTailoredDocument(token, content, jobData) {
    const title = `Tailored Resume - ${jobData.company} - ${jobData.title} - ${new Date().toLocaleDateString()}`;
    return await this.createGoogleDoc(token, title, btoa(content), 'text/plain');
  }

  async saveToHistory(tailoredResume) {
    const history = await chrome.storage.sync.get(['resumeHistory']);
    const resumeHistory = history.resumeHistory || [];
    
    resumeHistory.unshift(tailoredResume);
    
    if (resumeHistory.length > 50) {
      resumeHistory.splice(50);
    }

    await chrome.storage.sync.set({ resumeHistory });
  }


  async ensureAuthenticated() {
    try {
      const tokenData = await chrome.storage.sync.get(['googleToken']);
      if (!tokenData.googleToken) {
        console.log('No token found, attempting authentication...');
        const auth = await this.authenticateGoogle();
        return auth.token;
      }
      return tokenData.googleToken;
    } catch (error) {
      console.error('Authentication failed:', error);
      throw new Error('Authentication required. Please try again and allow Google access.');
    }
  }
}

new BackgroundService();