import React, { useState } from 'react';
import { Upload, Globe, ChevronDown } from 'lucide-react';
import CSVUploader from './CSVUploader';
import APIConfigurator from './APIConfigurator';
import { CSVData, APIData } from '../types';

type DataSource = 'csv' | 'api';

interface DataSourceSelectorProps {
  onCSVUpload: (data: CSVData) => void;
  onAPIData: (data: APIData) => void;
}

const DataSourceSelector: React.FC<DataSourceSelectorProps> = ({ onCSVUpload, onAPIData }) => {
  const [selectedSource, setSelectedSource] = useState<DataSource>('csv');
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSourceChange = (source: DataSource) => {
    setSelectedSource(source);
    setIsExpanded(false);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">Choose Data Source</h2>
          <p className="text-white/70">Select how you want to import your data</p>
        </div>

        {/* Source Selection Tabs */}
        <div className="flex space-x-2 mb-6">
          <button
            onClick={() => handleSourceChange('csv')}
            className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
              selectedSource === 'csv'
                ? 'bg-blue-500/20 border border-blue-500/30 text-blue-400'
                : 'bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Upload className="h-5 w-5" />
            <span>CSV Upload</span>
          </button>
          
          <button
            onClick={() => handleSourceChange('api')}
            className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
              selectedSource === 'api'
                ? 'bg-green-500/20 border border-green-500/30 text-green-400'
                : 'bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Globe className="h-5 w-5" />
            <span>API Integration</span>
          </button>
        </div>

        {/* Source Description */}
        <div className="mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
          {selectedSource === 'csv' ? (
            <div className="flex items-start space-x-3">
              <Upload className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-white font-medium mb-1">CSV File Upload</h3>
                <p className="text-white/70 text-sm">
                  Upload a CSV file from your computer. Drag and drop or click to browse files.
                  Perfect for local data analysis and one-time imports.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start space-x-3">
              <Globe className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-white font-medium mb-1">API Integration</h3>
                <p className="text-white/70 text-sm">
                  Connect to external APIs to fetch real-time data. Configure parameters and
                  access tokens for live data integration.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Data Source Component */}
        <div className="space-y-4">
          {selectedSource === 'csv' ? (
            <CSVUploader onUpload={onCSVUpload} />
          ) : (
            <APIConfigurator onDataReceived={onAPIData} />
          )}
        </div>

        {/* Quick Tips */}
        <div className="mt-6 p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-500/20">
          <h4 className="text-white font-medium mb-2">💡 Quick Tips</h4>
          <ul className="text-white/70 text-sm space-y-1">
            {selectedSource === 'csv' ? (
              <>
                <li>• Ensure your CSV has headers in the first row</li>
                <li>• Remove any empty rows before uploading</li>
                <li>• Large files may take a moment to process</li>
              </>
            ) : (
              <>
                <li>• Keep your access token secure</li>
                <li>• Use proper date format: YYYY-MM-DD HH:MM:SS</li>
                <li>• Device types should be comma-separated</li>
              </>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DataSourceSelector;
