import { useState } from 'react';
import { useAppDispatch, useAppSelector } from './redux';
import { uploadResume } from '../store/slices/resumeSlice';

export const useResumeUpload = () => {
  const dispatch = useAppDispatch();
  const { uploadStatus } = useAppSelector(state => state.resume);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [showLoading, setShowLoading] = useState(false);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

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

    // Handle file selection or cancellation
    const handleFileSelection = async (event: Event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        await processFile(file);
      } else {
        // User cancelled - hide loading state
        setShowLoading(false);
      }
      // Remove from Shadow DOM or body based on where it was added
      const widgetHost = document.getElementById('bespoke-resume-widget-host');
      const shadowRoot = widgetHost?.shadowRoot;
      if (shadowRoot && shadowRoot.contains(input)) {
        shadowRoot.removeChild(input);
      } else if (document.body.contains(input)) {
        document.body.removeChild(input);
      }
    };

    // Detect cancellation using focus events as fallback
    const handleCancel = () => {
      setTimeout(() => {
        // Check if input still exists and no file was selected
        const widgetHost = document.getElementById('bespoke-resume-widget-host');
        const shadowRoot = widgetHost?.shadowRoot;
        const inputExists = (shadowRoot && shadowRoot.contains(input)) || document.body.contains(input);
        
        if (inputExists && !input.files?.length) {
          setShowLoading(false);
          if (shadowRoot && shadowRoot.contains(input)) {
            shadowRoot.removeChild(input);
          } else if (document.body.contains(input)) {
            document.body.removeChild(input);
          }
        }
      }, 100);
    };

    input.onchange = handleFileSelection;
    
    // Add focus event listener to detect when dialog is closed without selection
    window.addEventListener('focus', handleCancel, { once: true });
    
    // Append to Shadow DOM root if available, otherwise fallback to body
    const widgetHost = document.getElementById('bespoke-resume-widget-host');
    const shadowRoot = widgetHost?.shadowRoot;
    if (shadowRoot) {
      shadowRoot.appendChild(input);
    } else {
      document.body.appendChild(input);
    }
    setTimeout(() => input.click(), 10);
  };

  return {
    handleUploadResume,
    loadingMessage,
    showLoading,
    uploadStatus,
    isUploading: uploadStatus === 'uploading'
  };
};