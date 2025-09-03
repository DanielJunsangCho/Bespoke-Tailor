import { useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import { loadResumeHistory, tailorResume } from '../store/slices/resumeSlice';
import { useResumeUpload } from '../hooks/useResumeUpload';
import TailoredResumeDisplay from './TailoredResumeDisplay';

interface ResumeWidgetProps {
  jobData: any; // Keep for backwards compatibility but use Redux data
  onClose: () => void;
}

export const ResumeWidget: React.FC<ResumeWidgetProps> = ({ onClose }) => {
  const dispatch = useAppDispatch();
  const { baseResume, isLoading, error, tailoredResumes } = useAppSelector(state => state.resume);
  const { currentJob: jobData } = useAppSelector(state => state.job); // Get job data from Redux
  const { handleUploadResume, loadingMessage, showLoading, isUploading } = useResumeUpload();
  const [tailorLoadingMessage, setTailorLoadingMessage] = useState<string>('');
  const [showTailorLoading, setShowTailorLoading] = useState(false);

  useEffect(() => {
    dispatch(loadResumeHistory());
  }, [dispatch]);

  const handleTailorResume = async () => {
    if (!jobData) return;

    setTailorLoadingMessage('Tailoring your resume...');
    setShowTailorLoading(true);
    setTimeout(() => setShowTailorLoading(false), 2000);

    dispatch(tailorResume(jobData));
  };

  const handleViewHistory = () => {
    chrome.runtime.sendMessage({ action: 'openHistoryPage' });
  };

  const getResumeStatusText = () => {
    if (baseResume) {
      const uploadDate = new Date(baseResume.uploadDate).toLocaleDateString();
      let statusText = `Base resume uploaded (${uploadDate})`;
      
      if (tailoredResumes.length > 0) {
        statusText += ` • ${tailoredResumes.length} tailored resume${tailoredResumes.length > 1 ? 's' : ''}`;
      }
      
      return statusText;
    }
    return 'Please upload a resume to get started';
  };

  // Get tailored resume for the current job page
  const getCurrentPageTailoredResume = () => {
    if (!jobData || tailoredResumes.length === 0) return null;
    console.log("yuuuuuup",tailoredResumes.find(resume => 
      resume.jobTitle === jobData.title && 
      resume.jobUrl === jobData.url
    ) || tailoredResumes.find(resume => 
      resume.jobTitle === jobData.title
    ));
    // Find the most recent tailored resume for this job title/URL
    return tailoredResumes.find(resume => 
      resume.jobTitle === jobData.title && 
      resume.jobUrl === jobData.url
    ) || tailoredResumes.find(resume => 
      resume.jobTitle === jobData.title
    );
  };

  const currentPageTailoredResume = getCurrentPageTailoredResume();

  return (
    <div className="ai-resume-tailor-widget">
      <div className="widget-container">
        <div className="widget-header">
          <div className="top-row">
            <img src={chrome.runtime.getURL("public/48-logo.png")} alt="Bespoke Resume" className="widget-logo" />
            <button className="widget-close-btn" id="widgetCloseBtn" onClick={onClose} title="Close widget">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
          <h3>Bespoke Resume</h3>
          <div className="job-detection">
            <div className={`job-detection-dot ${!jobData ? 'inactive' : ''}`} id="jobDetectionDot"></div>
            <span id="jobDetectionText">
              {jobData ? 'Job page detected' : 'No job page detected'}
            </span>
          </div>
          <div id="jobDetectionDetail">
            {jobData 
              ? `${jobData.title}`
              : 'Finding opportunity...'
            }
          </div>
        </div>

        <div className="widget-content">
          <div className="resume-status" id="resumeStatus">
            {getResumeStatusText()}
          </div>

          {currentPageTailoredResume && (
            <TailoredResumeDisplay tailoredResume={currentPageTailoredResume} />
          )}

          <div className="action-buttons">
            <button 
              id="tailorResumeBtn"
              className="btn btn-primary" 
              onClick={handleTailorResume}
              disabled={!baseResume || !jobData || isLoading}
            >
              Tailor Resume
            </button>
            <button 
              id="uploadResumeBtn"
              className="btn btn-secondary" 
              onClick={handleUploadResume}
              disabled={isUploading}
            >
              Upload Resume
            </button>
            <button 
              id="viewHistoryBtn"
              className="btn btn-secondary" 
              onClick={handleViewHistory}
            >
              View History
            </button>
          </div>

          <div id="loadingSection" className={`loading-section ${!showLoading && !showTailorLoading && !isLoading ? 'hidden' : ''}`}>
            <div className="spinner"></div>
            <span id="loadingText">{tailorLoadingMessage || loadingMessage || 'Processing...'}</span>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};