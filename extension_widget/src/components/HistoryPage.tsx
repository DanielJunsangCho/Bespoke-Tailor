import { useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import { useResumeUpload } from '../hooks/useResumeUpload';
import { loadResumeHistory, deleteResumeFromHistory, clearAllResumes } from '../store/slices/resumeSlice';
import { TailoredResume } from '../types/resume';
import './HistoryPage.css';

export const HistoryPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { tailoredResumes, isLoading } = useAppSelector(state => state.resume);
  const [filteredResumes, setFilteredResumes] = useState<TailoredResume[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const { handleUploadResume, isUploading } = useResumeUpload();
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'company' | 'title'>('newest');

  useEffect(() => {
    dispatch(loadResumeHistory());
  }, [dispatch]);

  useEffect(() => {
    setFilteredResumes(tailoredResumes);
    filterAndSortResumes(searchTerm, sortBy, tailoredResumes);
  }, [tailoredResumes, searchTerm, sortBy]);

  const filterAndSortResumes = (search: string, sort: string, resumes: TailoredResume[]) => {
    let filtered = resumes;

    // Apply search filter
    if (search) {
      const term = search.toLowerCase();
      filtered = resumes.filter(resume => 
        resume.jobTitle.toLowerCase().includes(term) ||
        resume.company.toLowerCase().includes(term) ||
        resume.aiAnalysis?.keywords?.some(keyword => 
          keyword.toLowerCase().includes(term)
        )
      );
    }

    // Apply sorting
    switch (sort) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime());
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.createdDate).getTime() - new Date(b.createdDate).getTime());
        break;
      case 'company':
        filtered.sort((a, b) => a.company.localeCompare(b.company));
        break;
      case 'title':
        filtered.sort((a, b) => a.jobTitle.localeCompare(b.jobTitle));
        break;
    }

    setFilteredResumes(filtered);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSearchTerm(value);
  };

  const handleSortChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value as 'newest' | 'oldest' | 'company' | 'title';
    setSortBy(value);
  };

  const handleDeleteResume = async (resumeId: string) => {
    if (!confirm('Are you sure you want to delete this resume from your history? This action cannot be undone.')) {
      return;
    }
    dispatch(deleteResumeFromHistory(resumeId));
  };

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to clear all resume history? This action cannot be undone.')) {
      return;
    }
    dispatch(clearAllResumes());
    await chrome.storage.sync.set({ resumeHistory: [] });
  };

  const openGoogleDoc = (jobUrl: string) => {
    if (jobUrl && jobUrl !== 'undefined') {
      chrome.tabs.create({ url: jobUrl });
    } else {
      alert('Job URL not available');
    }
  };

  const downloadResume = (resumeId: string) => {
    // Placeholder for MCP server integration
    alert(`Download functionality for ${resumeId} will be handled by MCP server`);
  };

  const viewJobPosting = (jobUrl: string) => {
    if (jobUrl && jobUrl !== 'undefined') {
      chrome.tabs.create({ url: jobUrl });
    } else {
      alert('Job posting URL not available');
    }
  };

  const getStats = () => {
    const totalResumes = tailoredResumes.length;
    const now = new Date();
    const thisMonth = tailoredResumes.filter(resume => {
      const resumeDate = new Date(resume.createdDate);
      return resumeDate.getMonth() === now.getMonth() && 
             resumeDate.getFullYear() === now.getFullYear();
    }).length;

    const uniqueCompanies = new Set(tailoredResumes.map(r => r.company)).size;
    const avgKeywords = totalResumes > 0 
      ? Math.round(tailoredResumes.reduce((acc, r) => 
          acc + (r.aiAnalysis?.keywords?.length || 0), 0) / totalResumes)
      : 0;

    return { totalResumes, thisMonth, uniqueCompanies, avgKeywords };
  };

  const stats = getStats();

  if (isLoading) {
    return (
      <div className="history-page">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading your resume history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="history-page">
      <div className="header">
        <h1>Resume History</h1>
        <p>Manage your tailored resumes and track your applications</p>
      </div>

      <div className="container">
        <div className="controls">
          <div className="search-box">
            <input 
              type="text" 
              placeholder="Search by company, job title, or keywords..."
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>
          <div className="filter-controls">
            <select value={sortBy} onChange={handleSortChange} className="filter-select">
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="company">By Company</option>
              <option value="title">By Job Title</option>
            </select>
            <button className="btn btn-secondary" onClick={handleClearAll}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" stroke="currentColor" strokeWidth="2"/>
              </svg>
              Clear All
            </button>
            <button className="btn btn-primary" 
                    onClick={handleUploadResume}
                    disabled={isUploading}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2"/>
              </svg>
              New Resume
            </button>
          </div>
        </div>

        {tailoredResumes.length > 0 && (
          <div className="stats">
            <div className="stat-item">
              <div className="stat-number">{stats.totalResumes}</div>
              <div className="stat-label">Total Resumes</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">{stats.thisMonth}</div>
              <div className="stat-label">This Month</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">{stats.uniqueCompanies}</div>
              <div className="stat-label">Companies</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">{stats.avgKeywords}</div>
              <div className="stat-label">Avg Keywords</div>
            </div>
          </div>
        )}

        {filteredResumes.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📄</div>
            <h3>{tailoredResumes.length === 0 ? 'No Resumes Yet' : 'No matching resumes found'}</h3>
            <p>
              {tailoredResumes.length === 0 
                ? 'Start tailoring your resume for job applications to see them here.'
                : 'Try adjusting your search terms or filters.'
              }
            </p>
            {tailoredResumes.length === 0 && (
              <button 
                className="btn btn-primary" 
                onClick={() => chrome.tabs.create({ url: chrome.runtime.getURL('src/popup/index.html') })}
              >
                Create Your First Resume
              </button>
            )}
          </div>
        ) : (
          <div className="resume-grid">
            {filteredResumes.map((resume) => (
              <div key={`${resume.company}-${resume.createdDate}`} className="resume-card">
                <div className="resume-header">
                  <div className="job-title">{resume.jobTitle}</div>
                  <div className="company-name">{resume.company}</div>
                  <div className="date-created">
                    {new Date(resume.createdDate).toLocaleDateString()}
                  </div>
                </div>

                <div className="resume-details">
                  <div className="detail-item">
                    <span className="detail-label">Experience Level:</span>
                    <span className="detail-value">{resume.aiAnalysis?.experienceLevel || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Keywords Found:</span>
                    <span className="detail-value">{resume.aiAnalysis?.keywords?.length || 0}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Job URL:</span>
                    <span className="detail-value">{resume.jobUrl ? 'Available' : 'N/A'}</span>
                  </div>
                </div>

                {resume.aiAnalysis?.keywords && resume.aiAnalysis.keywords.length > 0 && (
                  <div className="keywords">
                    {resume.aiAnalysis.keywords.slice(0, 8).map((keyword, index) => (
                      <span key={index} className="keyword-tag">{keyword}</span>
                    ))}
                    {resume.aiAnalysis.keywords.length > 8 && (
                      <span className="keyword-tag">+{resume.aiAnalysis.keywords.length - 8} more</span>
                    )}
                  </div>
                )}

                <div className="resume-actions">
                  <button 
                    className="btn btn-primary" 
                    onClick={() => openGoogleDoc(resume.jobUrl)}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" stroke="currentColor" strokeWidth="2"/>
                      <polyline points="15,3 21,3 21,9" stroke="currentColor" strokeWidth="2"/>
                      <line x1="10" y1="14" x2="21" y2="3" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    Open Job
                  </button>
                  
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => downloadResume(`${resume.company}-${resume.jobTitle}`)}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" stroke="currentColor" strokeWidth="2"/>
                      <polyline points="7,10 12,15 17,10" stroke="currentColor" strokeWidth="2"/>
                      <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    Download
                  </button>
                  
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => viewJobPosting(resume.jobUrl)}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
                      <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    View Job
                  </button>
                  
                  <button 
                    className="btn btn-secondary delete-btn" 
                    onClick={() => handleDeleteResume(`${resume.company}-${resume.createdDate}`)}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};