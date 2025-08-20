import { AIResumeService } from './services/aiService';
import { JobData, BaseResume, TailoredResume, ChromeMessage, ChromeMessageResponse } from './types/resume';

class BackgroundService {
  private aiService: AIResumeService;

  constructor() {
    this.aiService = new AIResumeService();
    this.init();
  }

  private init(): void {
    this.setupEventListeners();
    this.initializeAuth();
  }

  private setupEventListeners(): void {
    chrome.runtime.onInstalled.addListener(() => {
      console.log('Bespoke Resume extension installed');
    });

    chrome.action.onClicked.addListener((tab) => {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, { action: 'showResumeWidget' });
      }
    });

    chrome.runtime.onMessage.addListener((request: ChromeMessage, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // Keep message channel open for async responses
    });
  }

  private async handleMessage(request: ChromeMessage, _sender: chrome.runtime.MessageSender, sendResponse: (response: ChromeMessageResponse) => void): Promise<void> {
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
          const uploadResult = await this.uploadResume(request.file, request.fileName, request.fileType || 'application/pdf');
          sendResponse({ success: true, data: uploadResult });
          break;
          
        case 'authenticateGoogle':
          const authResult = await this.authenticateGoogle();
          sendResponse({ success: true, data: authResult });
          break;
          
        case 'openHistoryPage':
          await chrome.tabs.create({ url: chrome.runtime.getURL('src/pages/history.html') });
          sendResponse({ success: true });
          break;

        case 'downloadResume':
          if (!request.docId) {
            sendResponse({ success: false, error: 'Document ID is required' });
            return;
          }
          await this.downloadResume(request.docId);
          sendResponse({ success: true });
          break;
          
        default:
          sendResponse({ success: false, error: 'Unknown action: ' + request.action });
      }
    } catch (error) {
      console.error('Background service error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      sendResponse({ success: false, error: errorMessage });
    }
  }

  private async initializeAuth(): Promise<void> {
    try {
      const result = await chrome.storage.sync.get(['googleToken']);
      if (result.googleToken) {
        console.log('Google authentication token found');
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
    }
  }

  private async authenticateGoogle(): Promise<{ token: string; authenticated: boolean }> {
    try {
      const result = await chrome.identity.getAuthToken({ 
        interactive: true,
        scopes: [
          'https://www.googleapis.com/auth/documents',
          'https://www.googleapis.com/auth/drive.file'
        ]
      });

      const token = typeof result === 'string' ? result : result.token || '';
      if (!token) {
        throw new Error('Failed to obtain authentication token');
      }
      await chrome.storage.sync.set({ googleToken: token });
      return { token, authenticated: true };
    } catch (error) {
      console.error('Google authentication failed:', error);
      throw new Error('Failed to authenticate with Google');
    }
  }

  private async uploadResume(fileData: string, fileName: string, fileType: string): Promise<BaseResume> {
    try {
      const base64Data = fileData.split(',')[1];
      const token = await this.ensureAuthenticated();
      const docId = await this.createGoogleDoc(token, fileName, base64Data, fileType);
      
      const resumeData: BaseResume = {
        docId: docId,
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

  private async createGoogleDoc(token: string, title: string, content: string, fileType: string): Promise<string> {
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

  private async tailorResume(jobData: JobData): Promise<TailoredResume> {
    try {
      const result = await chrome.storage.sync.get(['baseResume']);
      if (!result.baseResume) {
        throw new Error('No base resume found. Please upload a resume first.');
      }

      const token = await this.ensureAuthenticated();
      
      const aiAnalysis = await this.aiService.analyzeJobDescription(jobData);
      const tailoredContent = await this.aiService.tailorResume(result.baseResume, jobData, aiAnalysis);
      
      const tailoredDocId = await this.createTailoredDocument(token, tailoredContent, jobData);
      
      const tailoredResume: TailoredResume = {
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

  private async createTailoredDocument(token: string, content: string, jobData: JobData): Promise<string> {
    const title = `Tailored Resume - ${jobData.company} - ${jobData.title} - ${new Date().toLocaleDateString()}`;
    return await this.createGoogleDoc(token, title, btoa(content), 'text/plain');
  }

  private async saveToHistory(tailoredResume: TailoredResume): Promise<void> {
    const result = await chrome.storage.sync.get(['resumeHistory']);
    const resumeHistory = result.resumeHistory || [];
    
    resumeHistory.unshift(tailoredResume);
    
    if (resumeHistory.length > 50) {
      resumeHistory.splice(50);
    }

    await chrome.storage.sync.set({ resumeHistory });
  }

  private async ensureAuthenticated(): Promise<string> {
    try {
      const result = await chrome.storage.sync.get(['googleToken']);
      if (!result.googleToken) {
        console.log('No token found, attempting authentication...');
        const auth = await this.authenticateGoogle();
        return auth.token;
      }
      return result.googleToken;
    } catch (error) {
      console.error('Authentication failed:', error);
      throw new Error('Authentication required. Please try again and allow Google access.');
    }
  }

  private async downloadResume(docId: string): Promise<void> {
    const url = `https://docs.google.com/document/d/${docId}/export?format=pdf`;
    await chrome.tabs.create({ url });
  }
}

// Initialize the background service
new BackgroundService();