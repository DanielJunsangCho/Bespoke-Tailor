import React from 'react';
import { TailoredResume } from '../types/resume';

interface TailoredResumeDisplayProps {
  tailoredResume: TailoredResume;
}

const TailoredResumeDisplay: React.FC<TailoredResumeDisplayProps> = ({ tailoredResume }) => {
  console.log("this is happening here", tailoredResume);

  const date = new Date(tailoredResume.createdDate).toISOString().split('T')[0];
  console.log("this is happening here", date);
  const fileName = `${tailoredResume.jobTitle}_${date}_Resume.pdf`;

  const handleDownload = async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'downloadPDF',
        pdfUrl: tailoredResume.pdfUrl,
        fileName: fileName
      });

      if (!response.success) {
        throw new Error(response.error || 'Download failed');
      }

      console.log('Download initiated:', response.data);
    } catch (error) {
      console.error('Error downloading PDF:', error);
    }
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
      </div>
      
      <div 
        className="tailored-resume-item"
        draggable
        onDragStart={handleDragStart}
        title="Drag to upload or click download button"
      >
        <div className="resume-icon">📄</div>
        <div className="resume-info">
          <div className="resume-title">{fileName}</div>
        </div>
        <div className="resume-actions">
          <button 
            className="download-btn"
            onClick={handleDownload}
            title="Download PDF"
          >
            ⬇️
          </button>
        </div>
      </div>
      
      <div className="usage-hint">
        Drag the resume or click download
      </div>
    </div>
  );
};

export default TailoredResumeDisplay;