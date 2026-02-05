import React from 'react';
import { Upload, Bot } from 'lucide-react';
import CSVUploader from './CSVUploader';
import { CSVData } from '../types';
import type { AIProvider } from '../lib/aiAnalysis';

export interface AISettings {
  provider: AIProvider;
  token: string;
}

interface DataSourceSelectorProps {
  onCSVUpload: (data: CSVData) => void;
  aiProvider: AIProvider;
  apiToken: string;
  onAISettingsChange: (settings: AISettings) => void;
}

const DataSourceSelector: React.FC<DataSourceSelectorProps> = ({
  onCSVUpload,
  aiProvider,
  apiToken,
  onAISettingsChange
}) => {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
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

      <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
        <div className="flex items-center space-x-3 mb-4">
          <Bot className="h-5 w-5 text-purple-400" />
          <h3 className="text-lg font-semibold text-white">AI for analysis</h3>
        </div>
        <p className="text-white/70 text-sm mb-4">
          Choose the model and enter your API token. Questions about your data will be sent to this API.
          Leave token empty to use local analysis only.
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">Model</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="aiProvider"
                  checked={aiProvider === 'gpt'}
                  onChange={() => onAISettingsChange({ provider: 'gpt', token: apiToken })}
                  className="rounded border-white/30 bg-white/10 text-blue-500 focus:ring-blue-500"
                />
                <span className="text-white">GPT (OpenAI)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="aiProvider"
                  checked={aiProvider === 'claude'}
                  onChange={() => onAISettingsChange({ provider: 'claude', token: apiToken })}
                  className="rounded border-white/30 bg-white/10 text-purple-500 focus:ring-purple-500"
                />
                <span className="text-white">Claude (Anthropic)</span>
              </label>
            </div>
          </div>
          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">API token</label>
            <input
              type="password"
              value={apiToken}
              onChange={(e) => onAISettingsChange({ provider: aiProvider, token: e.target.value })}
              placeholder={aiProvider === 'gpt' ? 'sk-...' : 'sk-ant-...'}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataSourceSelector;
