class HistoryManager {
  constructor() {
    this.resumes = [];
    this.filteredResumes = [];
    this.init();
  }

  async init() {
    await this.loadResumes();
    this.bindEvents();
    this.renderStats();
    this.renderResumes();
  }

  async loadResumes() {
    try {
      const result = await chrome.storage.sync.get(['resumeHistory']);
      this.resumes = result.resumeHistory || [];
      this.filteredResumes = [...this.resumes];
      
      document.getElementById('loadingSection').style.display = 'none';
      
      if (this.resumes.length === 0) {
        document.getElementById('emptyState').style.display = 'block';
      } else {
        document.getElementById('resumeGrid').style.display = 'grid';
        document.getElementById('statsSection').style.display = 'grid';
      }
    } catch (error) {
      console.error('Error loading resumes:', error);
      document.getElementById('loadingSection').innerHTML = '<p>Error loading resume history</p>';
    }
  }

  bindEvents() {
    document.getElementById('searchInput').addEventListener('input', (e) => {
      this.filterResumes(e.target.value);
    });

    document.getElementById('sortSelect').addEventListener('change', (e) => {
      this.sortResumes(e.target.value);
    });

    document.getElementById('clearAllBtn').addEventListener('click', () => {
      this.clearAllResumes();
    });
  }

  filterResumes(searchTerm) {
    const term = searchTerm.toLowerCase();
    this.filteredResumes = this.resumes.filter(resume => 
      resume.jobTitle.toLowerCase().includes(term) ||
      resume.company.toLowerCase().includes(term) ||
      resume.aiAnalysis?.keywords?.some(keyword => 
        keyword.toLowerCase().includes(term)
      )
    );
    this.renderResumes();
  }

  sortResumes(sortBy) {
    switch (sortBy) {
      case 'newest':
        this.filteredResumes.sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate));
        break;
      case 'oldest':
        this.filteredResumes.sort((a, b) => new Date(a.createdDate) - new Date(b.createdDate));
        break;
      case 'company':
        this.filteredResumes.sort((a, b) => a.company.localeCompare(b.company));
        break;
      case 'title':
        this.filteredResumes.sort((a, b) => a.jobTitle.localeCompare(b.jobTitle));
        break;
    }
    this.renderResumes();
  }

  renderStats() {
    const totalResumes = this.resumes.length;
    const thisMonth = this.resumes.filter(resume => {
      const resumeDate = new Date(resume.createdDate);
      const now = new Date();
      return resumeDate.getMonth() === now.getMonth() && 
             resumeDate.getFullYear() === now.getFullYear();
    }).length;

    const uniqueCompanies = new Set(this.resumes.map(r => r.company)).size;
    
    const avgKeywords = this.resumes.length > 0 
      ? Math.round(this.resumes.reduce((acc, r) => 
          acc + (r.aiAnalysis?.keywords?.length || 0), 0) / this.resumes.length)
      : 0;

    document.getElementById('totalResumes').textContent = totalResumes;
    document.getElementById('thisMonth').textContent = thisMonth;
    document.getElementById('uniqueCompanies').textContent = uniqueCompanies;
    document.getElementById('avgKeywords').textContent = avgKeywords;
  }

  renderResumes() {
    const grid = document.getElementById('resumeGrid');
    
    if (this.filteredResumes.length === 0) {
      grid.innerHTML = '<div class="empty-state"><h3>No matching resumes found</h3></div>';
      return;
    }

    grid.innerHTML = this.filteredResumes.map(resume => this.createResumeCard(resume)).join('');
  }

  createResumeCard(resume) {
    const date = new Date(resume.createdDate).toLocaleDateString();
    const keywords = resume.aiAnalysis?.keywords || [];
    const experienceLevel = resume.aiAnalysis?.experienceLevel || 'N/A';
    
    return `
      <div class="resume-card" data-doc-id="${resume.docId}">
        <div class="resume-header">
          <div class="job-title">${this.escapeHtml(resume.jobTitle)}</div>
          <div class="company-name">${this.escapeHtml(resume.company)}</div>
          <div class="date-created">${date}</div>
        </div>

        <div class="resume-details">
          <div class="detail-item">
            <span class="detail-label">Experience Level:</span>
            <span class="detail-value">${experienceLevel}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Keywords Found:</span>
            <span class="detail-value">${keywords.length}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Google Doc ID:</span>
            <span class="detail-value">${resume.docId.substring(0, 12)}...</span>
          </div>
        </div>

        ${keywords.length > 0 ? `
          <div class="keywords">
            ${keywords.slice(0, 8).map(keyword => 
              `<span class="keyword-tag">${this.escapeHtml(keyword)}</span>`
            ).join('')}
            ${keywords.length > 8 ? `<span class="keyword-tag">+${keywords.length - 8} more</span>` : ''}
          </div>
        ` : ''}

        <div class="resume-actions">
          <button class="btn btn-primary" onclick="historyManager.openGoogleDoc('${resume.docId}')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" stroke="currentColor" stroke-width="2"/>
              <polyline points="15,3 21,3 21,9" stroke="currentColor" stroke-width="2"/>
              <line x1="10" y1="14" x2="21" y2="3" stroke="currentColor" stroke-width="2"/>
            </svg>
            Open Doc
          </button>
          
          <button class="btn btn-secondary" onclick="historyManager.downloadResume('${resume.docId}')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" stroke="currentColor" stroke-width="2"/>
              <polyline points="7,10 12,15 17,10" stroke="currentColor" stroke-width="2"/>
              <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" stroke-width="2"/>
            </svg>
            Download
          </button>
          
          <button class="btn btn-secondary" onclick="historyManager.viewJobPosting('${resume.jobUrl}')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"/>
              <path d="M21 21l-4.35-4.35" stroke="currentColor" stroke-width="2"/>
            </svg>
            View Job
          </button>
          
          <button class="btn btn-secondary" onclick="historyManager.deleteResume('${resume.docId}')" style="color: #e74c3c;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" stroke="currentColor" stroke-width="2"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  }

  escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  openGoogleDoc(docId) {
    const url = `https://docs.google.com/document/d/${docId}/edit`;
    chrome.tabs.create({ url });
  }

  async downloadResume(docId) {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'downloadResume',
        docId: docId
      });

      if (response.success) {
        console.log('Resume download initiated');
      } else {
        alert('Failed to download resume: ' + response.error);
      }
    } catch (error) {
      console.error('Error downloading resume:', error);
      alert('Error downloading resume. Please try opening the Google Doc directly.');
    }
  }

  viewJobPosting(jobUrl) {
    if (jobUrl && jobUrl !== 'undefined') {
      chrome.tabs.create({ url: jobUrl });
    } else {
      alert('Job posting URL not available');
    }
  }

  async deleteResume(docId) {
    if (!confirm('Are you sure you want to delete this resume from your history? This action cannot be undone.')) {
      return;
    }

    try {
      const result = await chrome.storage.sync.get(['resumeHistory']);
      const resumeHistory = result.resumeHistory || [];
      
      const updatedHistory = resumeHistory.filter(resume => resume.docId !== docId);
      
      await chrome.storage.sync.set({ resumeHistory: updatedHistory });
      
      this.resumes = updatedHistory;
      this.filteredResumes = [...this.resumes];
      
      this.renderStats();
      this.renderResumes();
      
      if (this.resumes.length === 0) {
        document.getElementById('resumeGrid').style.display = 'none';
        document.getElementById('statsSection').style.display = 'none';
        document.getElementById('emptyState').style.display = 'block';
      }
      
    } catch (error) {
      console.error('Error deleting resume:', error);
      alert('Failed to delete resume');
    }
  }

  async clearAllResumes() {
    if (!confirm('Are you sure you want to clear all resume history? This action cannot be undone.')) {
      return;
    }

    try {
      await chrome.storage.sync.set({ resumeHistory: [] });
      
      this.resumes = [];
      this.filteredResumes = [];
      
      document.getElementById('resumeGrid').style.display = 'none';
      document.getElementById('statsSection').style.display = 'none';
      document.getElementById('emptyState').style.display = 'block';
      
    } catch (error) {
      console.error('Error clearing resumes:', error);
      alert('Failed to clear resume history');
    }
  }

  async exportHistory() {
    try {
      const dataStr = JSON.stringify(this.resumes, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `resume-history-${new Date().toISOString().split('T')[0]}.json`;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting history:', error);
      alert('Failed to export history');
    }
  }
}

let historyManager;

document.addEventListener('DOMContentLoaded', () => {
  historyManager = new HistoryManager();
});