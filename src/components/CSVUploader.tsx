import React, { useCallback, useState } from 'react';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import Papa from 'papaparse';
import { CSVData } from '../types';

interface CSVUploaderProps {
  onUpload: (data: CSVData) => void;
}

const CSVUploader: React.FC<CSVUploaderProps> = ({ onUpload }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processFile = useCallback((file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please upload a CSV file');
      return;
    }

    setIsProcessing(true);
    setError(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setError('Error parsing CSV file');
          setIsProcessing(false);
          return;
        }

        const headers = results.meta.fields || [];
        const data = results.data as Record<string, string>[];

        if (headers.length === 0 || data.length === 0) {
          setError('CSV file is empty or invalid');
          setIsProcessing(false);
          return;
        }

        onUpload({ headers, data });
        setIsProcessing(false);
      },
      error: () => {
        setError('Failed to process CSV file');
        setIsProcessing(false);
      }
    });
  }, [onUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  }, [processFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  }, [processFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  return (
    <div className="max-w-md mx-auto">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
          isDragOver
            ? 'border-blue-400 bg-blue-500/10 scale-105'
            : 'border-white/30 bg-white/5 hover:bg-white/10'
        } ${isProcessing ? 'pointer-events-none opacity-70' : 'cursor-pointer'}`}
      >
        <input
          type="file"
          accept=".csv"
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isProcessing}
        />
        
        <div className="space-y-4">
          {isProcessing ? (
            <div className="animate-spin mx-auto h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          ) : (
            <div className="flex flex-col items-center space-y-3">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full">
                <Upload className="h-8 w-8 text-white" />
              </div>
              <FileText className="h-16 w-16 text-white/50" />
            </div>
          )}
          
          <div className="text-white">
            {isProcessing ? (
              <p className="text-lg font-medium">Processing CSV file...</p>
            ) : (
              <>
                <h3 className="text-xl font-semibold mb-2">Upload CSV File</h3>
                <p className="text-white/70 mb-4">
                  Drag and drop your CSV file here, or click to browse
                </p>
                <div className="text-sm text-white/50">
                  Supported format: .csv files
                </div>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center space-x-2 text-red-400">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default CSVUploader;