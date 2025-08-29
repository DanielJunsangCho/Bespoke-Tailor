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

  return {
    handleUploadResume,
    loadingMessage,
    showLoading,
    uploadStatus,
    isUploading: uploadStatus === 'uploading'
  };
};