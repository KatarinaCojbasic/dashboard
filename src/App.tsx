import React, { useState, useEffect } from 'react';
import { Upload, BarChart3, PieChart, TrendingUp, Brain, RotateCcw, Save, CheckCircle } from 'lucide-react';
import DataSourceSelector from './components/DataSourceSelector';
import Dashboard from './components/Dashboard';
import QuestionPanel from './components/QuestionPanel';
import AuthButton from './components/AuthButton';
import LoginForm from './components/LoginForm';
import SavedAnalyses from './components/SavedAnalyses';
import { CSVData, AnalysisResult, ChartData } from './types';
import { updateAnalysisLog, saveAnalysisLog, getAnalysisLog } from './lib/analysisLogs';
import { supabase, isSupabaseConfigured } from './lib/supabase';

const USER_STORAGE_KEY = 'user';

function getStoredUser(): { id: string; email: string } | null {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed.id === 'string' && typeof parsed.email === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

function App() {
  const [data, setData] = useState<CSVData | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [user, setUser] = useState<{ id: string; email: string } | null>(getStoredUser);
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured());

  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) {
      setAuthReady(true);
      return;
    }
    const setUserFromSession = (session: { user: { id: string; email?: string } } | null) => {
      if (session?.user?.email) {
        const u = { id: session.user.id, email: session.user.email };
        setUser(u);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(u));
      } else {
        setUser(null);
        localStorage.removeItem(USER_STORAGE_KEY);
      }
      setAuthReady(true);
    };
    supabase.auth.getSession().then(({ data: { session } }) => setUserFromSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setUserFromSession(session));
    return () => subscription.unsubscribe();
  }, []);
  const [currentAnalysisLogId, setCurrentAnalysisLogId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [customCharts, setCustomCharts] = useState<ChartData[]>([]);
  const [isLoadedAnalysis, setIsLoadedAnalysis] = useState(false);

  const handleSaveAnalysis = async () => {
    if (!currentAnalysisLogId || !analysisResult || !user) return;

    setIsSaving(true);
    try {
      await updateAnalysisLog(currentAnalysisLogId, {
        analysis_details: {
          charts: analysisResult.charts,
          customCharts: customCharts,
          insights: analysisResult.insights
        },
        charts_generated: (analysisResult.charts?.length || 0) + customCharts.length,
        is_saved: true
      }, user.id);
      setIsSaved(true);
    } catch (error) {
      console.error('Failed to save analysis:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCSVUpload = (csvData: CSVData) => {
    setData(csvData);
    setAnalysisResult(null);
  };

  const handleNewUpload = () => {
    setData(null);
    setAnalysisResult(null);
    setCurrentAnalysisLogId(null);
    setIsSaved(false);
    setCustomCharts([]);
    setIsLoadedAnalysis(false);
  };

  const handleQuestionSubmit = async (question: string) => {
    if (!data) return;

    setIsAnalyzing(true);
    setIsLoadedAnalysis(false);
    try {
      const result = generateFallbackAnalysis(data, question);
      setAnalysisResult(result);
      setIsSaved(false);

      const id = await saveAnalysisLog({
        question,
        data_summary: {
          records: data.data.length,
          columns: data.headers.length,
          headers: data.headers,
          source: 'csv'
        },
        result_summary: result.summary,
        charts_generated: result.charts?.length || 0,
        analysis_details: { charts: result.charts, insights: result.insights },
        is_saved: false
      }, user.id);
      setCurrentAnalysisLogId(id);
    } catch (error) {
      console.error('Analysis error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCustomChartsChange = (charts: ChartData[]) => {
    setCustomCharts(charts);
  };

  const handleLoadAnalysis = async (id: string) => {
    if (!user) return;
    try {
      const analysisData = await getAnalysisLog(id, user.id);
      if (!analysisData?.analysis_details) return;

      const dataSummary = analysisData.data_summary || {};
      const headers = dataSummary.headers || [];
      const recordCount = dataSummary.records || 0;
      const dummyData = Array(recordCount).fill(null).map(() => {
        const row: { [key: string]: string } = {};
        headers.forEach((header: string) => {
          row[header] = '';
        });
        return row;
      });

      setData({ headers, data: dummyData });

      setAnalysisResult({
        summary: analysisData.result_summary || '',
        charts: analysisData.analysis_details.charts || [],
        insights: analysisData.analysis_details.insights || []
      });

      if (analysisData.analysis_details.customCharts) {
        setCustomCharts(analysisData.analysis_details.customCharts);
      } else {
        setCustomCharts([]);
      }

      setCurrentAnalysisLogId(id);
      setIsSaved(analysisData.is_saved ?? true);
      setIsLoadedAnalysis(true);
    } catch (error) {
      console.error('Failed to load analysis:', error);
    }
  };

  const generateFallbackAnalysis = (data: CSVData, question: string): AnalysisResult => {
    const numericColumns = data.headers.filter(header => {
      return data.data.some(row => !isNaN(parseFloat(String(row[header]))));
    });
    const palette = [
      'rgba(59, 130, 246, 0.7)', 'rgba(34, 197, 94, 0.7)', 'rgba(249, 115, 22, 0.7)',
      'rgba(236, 72, 153, 0.7)', 'rgba(168, 85, 247, 0.7)', 'rgba(14, 165, 233, 0.7)',
      'rgba(251, 191, 36, 0.7)', 'rgba(20, 184, 166, 0.7)'
    ];
    const borderPalette = palette.map(c => c.replace('0.7', '1'));
    const cols = numericColumns.slice(0, 8);
    const avgData = cols.map(col => {
      const values = data.data.map(row => parseFloat(String(row[col])) || 0);
      return values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0;
    });

    return {
      summary: `Analysis for: "${question}". Found ${data.data.length} records with ${numericColumns.length} numeric columns from CSV.`,
      charts: [
        {
          type: 'bar',
          title: 'Data Overview',
          data: {
            labels: cols,
            datasets: [{
              label: 'Average',
              data: avgData,
              backgroundColor: palette.slice(0, cols.length),
              borderColor: borderPalette.slice(0, cols.length),
              borderWidth: 2
            }]
          }
        }
      ],
      insights: [
        `Dataset contains ${data.data.length} records from CSV`,
        `Found ${numericColumns.length} numeric columns for analysis`,
        'Local analysis – all processing runs in your browser'
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
              <h1 className="text-2xl font-bold text-white">Data AI Dashboard</h1>
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
              {data && (
                <button
                  onClick={handleNewUpload}
                  className="flex items-center space-x-2 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-lg text-white transition-all duration-200 hover:scale-105"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span className="text-sm font-medium">New Data Source</span>
                </button>
              )}
              <div className="flex items-center space-x-4 text-white/70">
                {user && (
                  <AuthButton
                    user={user}
                    onSignOut={async () => {
                      if (isSupabaseConfigured() && supabase) await supabase.auth.signOut();
                      setUser(null);
                      localStorage.removeItem(USER_STORAGE_KEY);
                    }}
                  />
                )}
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
        {!authReady ? (
          <div className="flex items-center justify-center py-24">
            <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full" />
          </div>
        ) : !user ? (
          <div className="text-center py-16">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 max-w-md mx-auto border border-white/20">
              <Brain className="h-16 w-16 mx-auto mb-6 text-blue-400" />
              <h2 className="text-2xl font-bold text-white mb-4">Welcome to Data AI Dashboard</h2>
              <p className="text-white/70 mb-6">
                Sign in or create an account to start analyzing your data.
              </p>
              <LoginForm
                onSuccess={(u) => {
                  setUser(u);
                  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(u));
                }}
              />
            </div>
          </div>
        ) : !data ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <div className="text-center py-8">
                <DataSourceSelector onCSVUpload={handleCSVUpload} />
              </div>
            </div>
            <div>
              <SavedAnalyses onLoadAnalysis={handleLoadAnalysis} userId={user?.id} />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <QuestionPanel 
                onSubmit={handleQuestionSubmit}
                isAnalyzing={isAnalyzing}
                dataInfo={{
                  records: data.data.length,
                  columns: data.headers.length,
                  source: 'csv'
                }}
                userId={user?.id}
              />
            </div>
            <div className="lg:col-span-2">
              {analysisResult ? (
                <Dashboard 
                  result={analysisResult} 
                  csvData={data} 
                  onCustomChartsChange={handleCustomChartsChange}
                  initialCustomCharts={customCharts}
                  canAddCharts={!isLoadedAnalysis}
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