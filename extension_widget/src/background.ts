import { JobData, BaseResume, ChromeMessage, ChromeMessageResponse } from './types/resume';

declare const __API_URL__: string;

class BackgroundService {
  constructor() {
    this.init();
  }

  private init(): void {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    chrome.runtime.onInstalled.addListener(() => {
      console.log('Bespoke Resume extension installed');
    });

    chrome.action.onClicked.addListener(async (tab) => {
      if (tab.id) {
        try {
          await chrome.tabs.sendMessage(tab.id, { action: 'showResumeWidget' });
        } catch (error) {
          console.log('Content script not ready, ignoring message send error:', error);
        }
      }
    });

    chrome.runtime.onMessage.addListener((request: ChromeMessage, sender, sendResponse) => {
      // Handle async messages properly
      this.handleMessage(request, sender, sendResponse).catch(error => {
        console.error('Message handling error:', error);
        sendResponse({ success: false, error: error.message });
      });
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
        case 'uploadResume':
          if (!request.file || !request.fileName) {
            sendResponse({ success: false, error: 'File data and name are required' });
            return;
          }
          const uploadResult = await this.uploadResume(request.file, request.fileName, request.fileType || 'application/pdf');
          sendResponse({ success: true, data: uploadResult });
          break;

        case 'tailorResume':
          if (!request.jobData || !request.baseResume) {
            sendResponse({ success: false, error: 'Job data and base resume are required'})
            return;
          }

          const tailorResult = await this.tailorResume(request.jobData, request.baseResume);
          sendResponse({ success: true, data: tailorResult});
          break;

        case 'downloadPDF':
          if (!request.pdfUrl || !request.fileName) {
            sendResponse({ success: false, error: 'PDF URL and filename are required' });
            return;
          }
          const downloadResult = await this.downloadPDF(request.pdfUrl, request.fileName);
          sendResponse({ success: true, data: downloadResult });
          break;

        case 'openHistoryPage':
          await chrome.tabs.create({ url: chrome.runtime.getURL('src/pages/history.html') });
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


  private async uploadResume(fileData: string, fileName: string, fileType: string): Promise<BaseResume> {
    try {
      const base64Data = fileData.split(',')[1];
      const resumeData: BaseResume = {
        fileName,
        fileType,
        uploadDate: new Date().toISOString(),
        originalContent: base64Data
      };

      // Use local storage instead of sync storage for larger files
      await chrome.storage.local.set({ baseResume: resumeData });
      return resumeData;
    } catch (error) {
      console.error('Error uploading resume:', error);
      throw new Error('Failed to upload resume');
    }
  }

  private async tailorResume(jobData: JobData, baseResume: BaseResume) {
    const apiUrl = `${__API_URL__}/api/tailor_resume`
    if (!apiUrl) {
      throw new Error("API URL is not defined in environment variables");
    }

    try {
      if (!baseResume.originalContent) {
        throw new Error('Resume content is missing');
      }

      const requestBody = { resume_data: baseResume.originalContent, job_description: jobData.description };
      console.log('Request body:', JSON.stringify(requestBody, null, 2));
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        mode: 'cors',
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`HTTP ${response.status} error:`, errorText);
        throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
      }

      const data = await response.json();

      if (data.result.includes("Error")) {
        console.error('Backend error: ', data.result);
        throw new Error(`Backend error, status: ${data.result}`);
      } else if (data.result === '') {
        throw new Error("Unsuccessful tailoring.")
      }
      
      return data.result;
    } catch (error) {
      console.error('Fetch error:', error);
      throw error;
    }
  }

  private async downloadPDF(pdfUrl: string, fileName: string): Promise<string> {
    try {
      // Fetch directly from your Railway domain (no CORS issues)
      const response = await fetch(pdfUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch PDF: ${response.status}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      // Use Chrome downloads API to save the file
      await chrome.downloads.download({
        url: url,
        filename: fileName,
        saveAs: true
      });

      // Clean up the blob URL
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return `Download started: ${fileName}`;
    } catch (error) {
      console.error('Error downloading PDF:', error);
      throw new Error('Failed to download tailored resume');
    }
  }
}

// Initialize the background service
new BackgroundService();