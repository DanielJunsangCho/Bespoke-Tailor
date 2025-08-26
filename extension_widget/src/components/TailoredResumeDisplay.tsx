import React from 'react';
import { TailoredResume } from '../types/resume';
import './TailoredResumeDisplay.css';

interface TailoredResumeDisplayProps {
  tailoredResume: TailoredResume;
}

const TailoredResumeDisplay: React.FC<TailoredResumeDisplayProps> = ({ tailoredResume }) => {
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = tailoredResume.pdfUrl;
    link.download = `${tailoredResume.company}_${tailoredResume.jobTitle}_Resume.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('text/uri-list', tailoredResume.pdfUrl);
    e.dataTransfer.setData('application/pdf', tailoredResume.pdfUrl);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="tailored-resume-display">
      <div className="tailored-resume-header">
        <h4>Tailored Resume Ready</h4>
        <span className="company-name">{tailoredResume.company}</span>
      </div>
      
      <div 
        className="tailored-resume-item"
        draggable
        onDragStart={handleDragStart}
        title="Drag to upload or click download button"
      >
        <div className="resume-icon">📄</div>
        <div className="resume-info">
          <div className="resume-title">{tailoredResume.jobTitle}</div>
          <div className="resume-date">
            {new Date(tailoredResume.createdDate).toLocaleDateString()}
          </div>
        </div>
        <div className="resume-actions">
          <button 
            className="download-btn"
            onClick={handleDownload}
            title="Download PDF"
          >
            ⬇️
          </button>
          <div className="drag-indicator" title="Drag to upload">
            ↕️
          </div>
        </div>
      </div>
      
      <div className="usage-hint">
        Drag the resume to upload fields or click download
      </div>
    </div>
  );
};

export default TailoredResumeDisplay;