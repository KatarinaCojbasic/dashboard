import React from 'react';
import { Upload } from 'lucide-react';
import CSVUploader from './CSVUploader';
import { CSVData } from '../types';

interface DataSourceSelectorProps {
  onCSVUpload: (data: CSVData) => void;
}

const DataSourceSelector: React.FC<DataSourceSelectorProps> = ({ onCSVUpload }) => {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">Choose Data Source</h2>
          <p className="text-white/70">Upload a CSV file to analyze your data</p>
        </div>

        <div className="mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
          <div className="flex items-start space-x-3">
            <Upload className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-white font-medium mb-1">CSV File Upload</h3>
              <p className="text-white/70 text-sm">
                Upload a CSV file from your computer. Drag and drop or click to browse files.
                Ensure your CSV has headers in the first row.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <CSVUploader onUpload={onCSVUpload} />
        </div>

        <div className="mt-6 p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-500/20">
          <h4 className="text-white font-medium mb-2">Quick tips</h4>
          <ul className="text-white/70 text-sm space-y-1">
            <li>• Ensure your CSV has headers in the first row</li>
            <li>• Remove any empty rows before uploading</li>
            <li>• Large files may take a moment to process</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DataSourceSelector;
