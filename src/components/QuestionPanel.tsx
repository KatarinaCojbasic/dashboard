import React, { useState } from 'react';
import { Send, Loader2, Database, FileText, Lightbulb, History } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database as SupabaseDatabase } from '../lib/supabase';

interface QuestionPanelProps {
  onSubmit: (question: string) => void;
  isAnalyzing: boolean;
  dataInfo: {
    records: number;
    columns: number;
  };
}

const QuestionPanel: React.FC<QuestionPanelProps> = ({ onSubmit, isAnalyzing, dataInfo }) => {
  const [question, setQuestion] = useState('');
  const [recentQuestions, setRecentQuestions] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Load recent questions when component mounts
  React.useEffect(() => {
    loadRecentQuestions();
  }, []);

  const loadRecentQuestions = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data, error } = await supabase
        .from('analysis_logs')
        .select('question')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      
      const questions = data?.map(log => log.question) || [];
      setRecentQuestions([...new Set(questions)]); // Remove duplicates
    } catch (error) {
      console.warn('Failed to load recent questions:', error);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim() && !isAnalyzing) {
      onSubmit(question.trim());
    }
  };

  const suggestedQuestions = [
    "What are the main trends in this data?",
    "Show me the distribution of values",
    "What correlations exist between columns?",
    "Identify any outliers or anomalies",
    "Create a summary dashboard"
  ];

  const handleSuggestionClick = (suggestion: string) => {
    setQuestion(suggestion);
  };

  return (
    <div className="space-y-6">
      {/* Data Info Card */}
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
        <div className="flex items-center space-x-3 mb-4">
          <Database className="h-6 w-6 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Dataset Overview</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-white/5 rounded-lg">
            <div className="text-2xl font-bold text-white">{dataInfo.records.toLocaleString()}</div>
            <div className="text-sm text-white/70">Records</div>
          </div>
          <div className="text-center p-3 bg-white/5 rounded-lg">
            <div className="text-2xl font-bold text-white">{dataInfo.columns}</div>
            <div className="text-sm text-white/70">Columns</div>
          </div>
        </div>
      </div>

      {/* Recent Questions */}
      {recentQuestions.length > 0 && (
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <History className="h-6 w-6 text-orange-400" />
              <h3 className="text-lg font-semibold text-white">Recent Questions</h3>
            </div>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="text-white/60 hover:text-white text-sm"
            >
              {showHistory ? 'Hide' : 'Show'}
            </button>
          </div>
          
          {showHistory && (
            <div className="space-y-2">
              {recentQuestions.map((recentQuestion, index) => (
                <button
                  key={index}
                  onClick={() => setQuestion(recentQuestion)}
                  className="w-full text-left p-3 bg-white/5 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition-all duration-200 text-sm"
                  disabled={isAnalyzing}
                >
                  {recentQuestion}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Question Input */}
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
        <div className="flex items-center space-x-3 mb-4">
          <FileText className="h-6 w-6 text-purple-400" />
          <h3 className="text-lg font-semibold text-white">Ask a Question</h3>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What insights would you like to discover from your data?"
              className="w-full h-24 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              disabled={isAnalyzing}
            />
          </div>
          
          <button
            type="submit"
            disabled={!question.trim() || isAnalyzing}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-lg font-medium transition-all duration-200 hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <Send className="h-5 w-5" />
                <span>Generate Insights</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Suggested Questions */}
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
        <div className="flex items-center space-x-3 mb-4">
          <Lightbulb className="h-6 w-6 text-yellow-400" />
          <h3 className="text-lg font-semibold text-white">Suggested Questions</h3>
        </div>
        
        <div className="space-y-2">
          {suggestedQuestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleSuggestionClick(suggestion)}
              className="w-full text-left p-3 bg-white/5 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition-all duration-200 text-sm"
              disabled={isAnalyzing}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default QuestionPanel;