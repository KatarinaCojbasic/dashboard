import React, { useState } from 'react';
import { Globe, Send, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { APIConfig, APIData } from '../types';

interface APIConfiguratorProps {
  onDataReceived: (data: APIData) => void;
}

const APIConfigurator: React.FC<APIConfiguratorProps> = ({ onDataReceived }) => {
  const [config, setConfig] = useState<APIConfig>({
    dateFrom: '2024-12-31 20:00:00',
    dateTo: '2025-01-01 19:59:59',
    locations: '130',
    panels: '60',
    deviceTypes: '2,4,6,8,9,12'
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleInputChange = (field: keyof APIConfig, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    setError(null);
    setSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    // Check if API token is configured
    const apiToken = import.meta.env.VITE_API_ACCESS_TOKEN;
    if (!apiToken) {
      setError('API access token not configured. Please check your environment variables.');
      setIsLoading(false);
      return;
    }

    try {
      const url = new URL('https://ampenergy-backend.azurewebsites.net/api/locations-equipments');
      url.searchParams.set('date_from', config.dateFrom);
      url.searchParams.set('date_to', config.dateTo);
      url.searchParams.set('locations', config.locations);
      url.searchParams.set('panels', config.panels);
      url.searchParams.set('device_types', config.deviceTypes);

      console.log('🔍 API Request URL:', url.toString());
      console.log('🔍 API Config:', config);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'x-access-token': import.meta.env.VITE_API_ACCESS_TOKEN || '',
          'Content-Type': 'application/json',
        },
      });

      console.log('🔍 Response status:', response.status);
      console.log('🔍 Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('🔍 Error response body:', errorText);
        throw new Error(`API request failed: ${response.status} ${response.statusText}. Response: ${errorText}`);
      }

      const responseData = await response.json();
      console.log('🔍 Raw API response:', responseData);
      console.log('🔍 Response type:', typeof responseData);
      console.log('🔍 Response keys:', Object.keys(responseData));
      
      // Handle different response structures
      let data: any[];
      if (Array.isArray(responseData)) {
        // Direct array response
        data = responseData;
        console.log('🔍 Direct array response detected');
      } else if (responseData.results && Array.isArray(responseData.results)) {
        // Object with results array
        data = responseData.results;
        console.log('🔍 Results array detected in response object');
      } else if (responseData.data && Array.isArray(responseData.data)) {
        // Object with data array
        data = responseData.data;
        console.log('🔍 Data array detected in response object');
      } else {
        console.error('🔍 Unexpected response structure:', responseData);
        throw new Error(`Unexpected response structure. Expected array or object with results/data array. Got: ${JSON.stringify(responseData)}`);
      }
      
      console.log('🔍 Extracted data array:', data);
      console.log('🔍 Data length:', data.length);
      
      if (data.length === 0) {
        console.warn('🔍 Empty array received from API');
        throw new Error('API returned an empty array - no data available for the specified parameters');
      }

      console.log('🔍 First data item:', data[0]);
      console.log('🔍 Data item keys:', Object.keys(data[0]));

      // Convert API response to our data format
      const headers = Object.keys(data[0]);
      const apiData: APIData = {
        headers,
        data: data.map(item => {
          const row: Record<string, any> = {};
          headers.forEach(header => {
            row[header] = item[header]?.toString() || '';
          });
          return row;
        }),
        source: 'api'
      };

      console.log('🔍 Processed API data:', apiData);
      console.log('🔍 Headers count:', apiData.headers.length);
      console.log('🔍 Data rows count:', apiData.data.length);

      onDataReceived(apiData);
      setSuccess(true);
    } catch (err) {
      console.error('🔍 API Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data from API');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-gradient-to-r from-green-500 to-blue-600 rounded-lg">
            <Globe className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-white">API Configuration</h3>
            <p className="text-white/70 text-sm">Configure and fetch data from API</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Date From
            </label>
            <input
              type="text"
              value={config.dateFrom}
              onChange={(e) => handleInputChange('dateFrom', e.target.value)}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="2024-12-31 20:00:00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Date To
            </label>
            <input
              type="text"
              value={config.dateTo}
              onChange={(e) => handleInputChange('dateTo', e.target.value)}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="2025-01-01 19:59:59"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Locations
            </label>
            <input
              type="text"
              value={config.locations}
              onChange={(e) => handleInputChange('locations', e.target.value)}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="130"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Panels
            </label>
            <input
              type="text"
              value={config.panels}
              onChange={(e) => handleInputChange('panels', e.target.value)}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="60"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Device Types
            </label>
            <input
              type="text"
              value={config.deviceTypes}
              onChange={(e) => handleInputChange('deviceTypes', e.target.value)}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="2,4,6,8,9,12"
            />
          </div>



          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white font-medium rounded-lg transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Fetching Data...</span>
              </>
            ) : (
              <>
                <Send className="h-5 w-5" />
                <span>Fetch from API</span>
              </>
            )}
          </button>
        </form>

        {error && (
          <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center space-x-2 text-red-400">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

                 {success && (
           <div className="mt-4 p-3 bg-green-500/20 border border-green-500/30 rounded-lg flex items-center space-x-2 text-green-400">
             <CheckCircle className="h-5 w-5 flex-shrink-0" />
             <span className="text-sm">Data fetched successfully!</span>
           </div>
         )}

         {/* API Token Info */}
         <div className="mt-4 p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg">
           <h4 className="text-blue-400 font-medium mb-2">🔑 API Configuration</h4>
           <p className="text-blue-400/80 text-sm mb-2">
             API access token is configured via environment variable <code className="bg-blue-500/30 px-1 rounded">VITE_API_ACCESS_TOKEN</code>
           </p>
           <p className="text-blue-400/70 text-xs">
             Token status: {import.meta.env.VITE_API_ACCESS_TOKEN ? '✅ Configured' : '❌ Not configured'}
           </p>
         </div>

         {/* Debug Test Button */}
         <div className="mt-4 p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
           <h4 className="text-yellow-400 font-medium mb-2">🐛 Debug Test</h4>
           <button
             onClick={() => {
               console.log('🔍 Testing with sample data...');
               const testData: APIData = {
                 headers: ['id', 'name', 'value', 'date'],
                 data: [
                   { id: '1', name: 'Test Item 1', value: '100', date: '2024-01-01' },
                   { id: '2', name: 'Test Item 2', value: '200', date: '2024-01-02' },
                   { id: '3', name: 'Test Item 3', value: '300', date: '2024-01-03' },
                 ],
                 source: 'api'
               };
               console.log('🔍 Sending test data:', testData);
               onDataReceived(testData);
               setSuccess(true);
             }}
             className="w-full px-3 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/30 rounded-lg text-yellow-400 hover:text-yellow-300 transition-all duration-200"
           >
             Test with Sample Data
           </button>
         </div>
      </div>
    </div>
  );
};

export default APIConfigurator;
