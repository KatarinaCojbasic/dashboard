import React, { useState, useEffect } from 'react';
import { Upload, BarChart3, PieChart, TrendingUp, Brain, RotateCcw, Save, CheckCircle } from 'lucide-react';
import CSVUploader from './components/CSVUploader';
import Dashboard from './components/Dashboard';
import QuestionPanel from './components/QuestionPanel';
import AuthButton from './components/AuthButton';
import LoginForm from './components/LoginForm';
import SavedAnalyses from './components/SavedAnalyses';
import { CSVData, AnalysisResult } from './types';
import { supabase } from './lib/supabase';
import type { User } from '@supabase/supabase-js';

function App() {
  const [csvData, setCsvData] = useState<CSVData | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [currentAnalysisLogId, setCurrentAnalysisLogId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [customCharts, setCustomCharts] = useState<ChartData[]>([]);

  const handleSaveAnalysis = async () => {
    if (!currentAnalysisLogId || !analysisResult || !user) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('analysis_logs')
        .update({
          analysis_details: {
            charts: analysisResult.charts,
            customCharts: customCharts,
            insights: analysisResult.insights
          },
          charts_generated: (analysisResult.charts?.length || 0) + customCharts.length,
          is_saved: true
        })
        .eq('id', currentAnalysisLogId);

      if (error) throw error;
      setIsSaved(true);
    } catch (error) {
      console.error('Failed to save analysis:', error);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setIsLoadingAuth(false);
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        setIsLoadingAuth(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleCSVUpload = (data: CSVData) => {
    setCsvData(data);
    setAnalysisResult(null);
  };

  const handleNewUpload = () => {
    setCsvData(null);
    setAnalysisResult(null);
    setCurrentAnalysisLogId(null);
    setIsSaved(false);
    setCustomCharts([]);
  };

  const handleQuestionSubmit = async (question: string) => {
    if (!csvData) return;

    setIsAnalyzing(true);
    try {
      // Get current user session
      const { data: { session } } = await supabase.auth.getSession();
      
      // Call our edge function for analysis
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase configuration missing');
      }
      
      const response = await fetch(`${supabaseUrl}/functions/v1/analyze-csv`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token || supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: csvData.data,
          headers: csvData.headers,
          question: question,
          user_id: session?.user?.id
        })
      });

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      const result = await response.json();
      setAnalysisResult(result);
      setIsSaved(false);
      
      // Log the analysis if user is authenticated
      if (session?.user) {
        try {
          const { data: logData, error: logError } = await supabase
            .from('analysis_logs')
            .insert({
            user_id: session.user.id,
            question: question,
            data_summary: {
              records: csvData.data.length,
              columns: csvData.headers.length,
              headers: csvData.headers
            },
            result_summary: result.summary,
            charts_generated: result.charts?.length || 0
          })
            .select('id')
            .single();

          if (logError) throw logError;
          setCurrentAnalysisLogId(logData?.id || null);
        } catch (logError) {
          console.warn('Failed to log analysis:', logError);
        }
      }
    } catch (error) {
      console.error('Analysis error:', error);
      // Fallback to local analysis if edge function fails
      const fallbackResult = generateFallbackAnalysis(csvData, question);
      setAnalysisResult(fallbackResult);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCustomChartsChange = (charts: ChartData[]) => {
    setCustomCharts(charts);
  };

  const handleLoadAnalysis = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('analysis_logs')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data && data.analysis_details) {
        // Reconstruct basic csvData from stored summary
        const dataSummary = data.data_summary || {};
        const headers = dataSummary.headers || [];
        const recordCount = dataSummary.records || 0;
        
        // Create dummy data array with correct length
        const dummyData = Array(recordCount).fill(null).map(() => {
          const row: { [key: string]: string } = {};
          headers.forEach((header: string) => {
            row[header] = '';
          });
          return row;
        });

        setCsvData({
          headers,
          data: dummyData
        });

        // Set the analysis result from stored details
        setAnalysisResult({
          summary: data.result_summary || '',
          charts: data.analysis_details.charts || [],
          insights: data.analysis_details.insights || []
        });

        // Set custom charts if they exist
        if (data.analysis_details.customCharts) {
          setCustomCharts(data.analysis_details.customCharts);
        } else {
          setCustomCharts([]);
        }

        setCurrentAnalysisLogId(id);
        setIsSaved(true);
      }
    } catch (error) {
      console.error('Failed to load analysis:', error);
    }
  };

  const generateFallbackAnalysis = (data: CSVData, question: string): AnalysisResult => {
    // Simple fallback analysis
    const numericColumns = data.headers.filter(header => {
      return data.data.some(row => !isNaN(parseFloat(row[header])));
    });

    return {
      summary: `Analysis for: "${question}". Found ${data.data.length} records with ${numericColumns.length} numeric columns.`,
      charts: [
        {
          type: 'bar',
          title: 'Data Overview',
          data: {
            labels: numericColumns.slice(0, 5),
            datasets: [{
              label: 'Values',
              data: numericColumns.slice(0, 5).map(col => {
                const values = data.data.map(row => parseFloat(row[col]) || 0);
                return values.reduce((sum, val) => sum + val, 0) / values.length;
              }),
              backgroundColor: 'rgba(59, 130, 246, 0.6)',
              borderColor: 'rgba(59, 130, 246, 1)',
              borderWidth: 2
            }]
          }
        }
      ],
      insights: [
        `Dataset contains ${data.data.length} records`,
        `Found ${numericColumns.length} numeric columns for analysis`,
        'This is a basic analysis - connect to Supabase for AI-powered insights'
      ]
    };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-md border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white">CSV AI Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              {analysisResult && currentAnalysisLogId && !isSaved && (
                <button
                  onClick={handleSaveAnalysis}
                  disabled={isSaving}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 backdrop-blur-md border border-green-500/30 rounded-lg text-green-400 hover:text-green-300 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <div className="animate-spin h-4 w-4 border-2 border-green-400 border-t-transparent rounded-full"></div>
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  <span className="text-sm font-medium">
                    {isSaving ? 'Saving...' : 'Save Analysis'}
                  </span>
                </button>
              )}
              {isSaved && (
                <div className="flex items-center space-x-2 px-4 py-2 bg-green-500/20 backdrop-blur-md border border-green-500/30 rounded-lg text-green-400">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">Saved</span>
                </div>
              )}
              {csvData && (
                <button
                  onClick={handleNewUpload}
                  className="flex items-center space-x-2 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-lg text-white transition-all duration-200 hover:scale-105"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span className="text-sm font-medium">New Upload</span>
                </button>
              )}
              <div className="flex items-center space-x-4 text-white/70">
                <AuthButton />
                <div className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span className="text-sm">Analytics</span>
                </div>
                <div className="flex items-center space-x-2">
                  <PieChart className="h-5 w-5" />
                  <span className="text-sm">Insights</span>
                </div>
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5" />
                  <span className="text-sm">AI-Powered</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoadingAuth ? (
          <div className="text-center py-16">
            <div className="animate-spin mx-auto h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mb-4"></div>
            <p className="text-white/70 text-lg">Loading...</p>
          </div>
        ) : !user ? (
          <div className="text-center py-16">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 max-w-md mx-auto border border-white/20">
              <Brain className="h-16 w-16 mx-auto mb-6 text-blue-400" />
              <h2 className="text-2xl font-bold text-white mb-4">Welcome to CSV AI Dashboard</h2>
              <p className="text-white/70 mb-6">
                Sign in to start analyzing your CSV data with AI-powered insights and autonomous analysis.
              </p>
              
              {/* Inline Login Form */}
              <LoginForm />
            </div>
          </div>
        ) : !csvData ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <div className="text-center py-8">
                <CSVUploader onUpload={handleCSVUpload} />
              </div>
            </div>
            <div>
              <SavedAnalyses onLoadAnalysis={handleLoadAnalysis} />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <QuestionPanel 
                onSubmit={handleQuestionSubmit}
                isAnalyzing={isAnalyzing}
                dataInfo={{
                  records: csvData.data.length,
                  columns: csvData.headers.length
                }}
              />
            </div>
            <div className="lg:col-span-2">
              {analysisResult ? (
                <Dashboard 
                  result={analysisResult} 
                  csvData={csvData} 
                  onCustomChartsChange={handleCustomChartsChange}
                  initialCustomCharts={customCharts}
                />
              ) : (
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 text-center text-white/70">
                  <Upload className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">Ask a question about your data to generate insights</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;