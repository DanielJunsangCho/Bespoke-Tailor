import { useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import { uploadResume, loadResumeHistory, tailorResume } from '../store/slices/resumeSlice';
import './ResumeWidget.css';

interface ResumeWidgetProps {
  jobData: any; // Keep for backwards compatibility but use Redux data
  onClose: () => void;
}

export const ResumeWidget: React.FC<ResumeWidgetProps> = ({ onClose }) => {
  const dispatch = useAppDispatch();
  const { baseResume, isLoading, error, uploadStatus, tailoredResumes } = useAppSelector(state => state.resume);
  const { currentJob: jobData } = useAppSelector(state => state.job); // Get job data from Redux
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [showLoading, setShowLoading] = useState(false);

  useEffect(() => {
    dispatch(loadResumeHistory());
  }, [dispatch]);

  const handleUploadResume = async () => {
    setLoadingMessage('Select your resume file...');
    setShowLoading(true);
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx,.txt';
    input.style.position = 'absolute';
    input.style.left = '-9999px';
    input.style.opacity = '0';
    
    const processFile = async (file: File) => {
      try {
        if (!file) {
          setShowLoading(false);
          return;
        }

        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
          setLoadingMessage('Error: File too large (max 10MB)');
          setTimeout(() => setShowLoading(false), 2000);
          return;
        }

        const allowedTypes = ['application/pdf', 'application/msword', 
                             'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
                             'text/plain'];
        if (!allowedTypes.includes(file.type) && !file.name.match(/\.(pdf|doc|docx|txt)$/i)) {
          setLoadingMessage('Error: Unsupported file type');
          setTimeout(() => setShowLoading(false), 2000);
          return;
        }

        setLoadingMessage('Reading file...');
        const fileData = await fileToBase64(file);
        
        setLoadingMessage('Uploading resume...');
        
        const result = await dispatch(uploadResume({
          file: fileData,
          fileName: file.name,
          fileType: file.type
        }));

        if (uploadResume.fulfilled.match(result)) {
          setLoadingMessage('Resume uploaded successfully!');
          setTimeout(() => setShowLoading(false), 1000);
        } else {
          throw new Error('Upload failed');
        }
      } catch (error) {
        console.error('Error uploading resume:', error);
        setLoadingMessage(`Error: ${error instanceof Error ? error.message : 'Upload failed'}`);
        setTimeout(() => setShowLoading(false), 2000);
      }
    };

    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        await processFile(file);
      }
      document.body.removeChild(input);
    };
    
    document.body.appendChild(input);
    setTimeout(() => input.click(), 10);
  };

  const handleTailorResume = async () => {
    if (!jobData) return;

    setLoadingMessage('Tailoring your resume...');
    setShowLoading(true);
    setTimeout(() => setShowLoading(false), 2000);

    const result = await(dispatch(tailorResume(jobData)));
    
  };

  const handleViewHistory = () => {
    chrome.runtime.sendMessage({ action: 'openHistoryPage' });
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
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

  return (
    <div className="ai-resume-tailor-widget">
      <div className="widget-container">
        <div className="widget-header">
          <button className="widget-close-btn" id="widgetCloseBtn" onClick={onClose} title="Close widget">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
          <h3>Bespoke Resume</h3>
          <div className="job-detection">
            <div className={`job-detection-dot ${!jobData ? 'inactive' : ''}`} id="jobDetectionDot"></div>
            <span id="jobDetectionText">
              {jobData ? 'Job page detected' : 'No job page detected'}
            </span>
          </div>
          <div id="jobDetectionDetail">
            {jobData 
              ? `${jobData.title}${jobData.company ? ' at ' + jobData.company : ''}`
              : 'Finding opportunity...'
            }
          </div>
        </div>

        <div className="widget-content">
          <div className="resume-status" id="resumeStatus">
            {getResumeStatusText()}
          </div>

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
              disabled={uploadStatus === 'uploading'}
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

          <div id="loadingSection" className={`loading-section ${!showLoading && !isLoading ? 'hidden' : ''}`}>
            <div className="spinner"></div>
            <span id="loadingText">{loadingMessage || 'Processing...'}</span>
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