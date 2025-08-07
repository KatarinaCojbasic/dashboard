import React, { useState, useEffect } from 'react';
import { History, Clock, FileText, Trash2, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SavedAnalysis {
  id: string;
  question: string;
  created_at: string;
  charts_generated: number;
  data_summary: any;
}

interface SavedAnalysesProps {
  onLoadAnalysis: (id: string) => void;
}

const SavedAnalyses: React.FC<SavedAnalysesProps> = ({ onLoadAnalysis }) => {
  const [savedAnalyses, setSavedAnalyses] = useState<SavedAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSavedAnalyses();
  }, []);

  const loadSavedAnalyses = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setError('Please sign in to view saved analyses');
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('analysis_logs')
        .select('id, question, created_at, charts_generated, data_summary')
        .eq('user_id', session.user.id)
        .eq('is_saved', true)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setSavedAnalyses(data || []);
    } catch (err: any) {
      console.error('Failed to load saved analyses:', err);
      setError('Failed to load saved analyses');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAnalysis = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the load analysis
    
    if (!confirm('Are you sure you want to delete this saved analysis?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('analysis_logs')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSavedAnalyses(prev => prev.filter(analysis => analysis.id !== id));
    } catch (err: any) {
      console.error('Failed to delete analysis:', err);
      alert('Failed to delete analysis');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
        <div className="flex items-center space-x-3 mb-4">
          <History className="h-6 w-6 text-green-400" />
          <h3 className="text-lg font-semibold text-white">Saved Analyses</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
        <div className="flex items-center space-x-3 mb-4">
          <History className="h-6 w-6 text-green-400" />
          <h3 className="text-lg font-semibold text-white">Saved Analyses</h3>
        </div>
        <div className="text-center py-8 text-red-400">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
      <div className="flex items-center space-x-3 mb-4">
        <History className="h-6 w-6 text-green-400" />
        <h3 className="text-lg font-semibold text-white">Saved Analyses</h3>
        <span className="text-sm text-white/60">({savedAnalyses.length})</span>
      </div>

      {savedAnalyses.length === 0 ? (
        <div className="text-center py-8 text-white/60">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No saved analyses yet</p>
          <p className="text-sm mt-2">Upload data and save your analysis results</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {savedAnalyses.map((analysis) => (
            <div
              key={analysis.id}
              onClick={() => onLoadAnalysis(analysis.id)}
              className="group p-4 bg-white/5 hover:bg-white/10 rounded-lg cursor-pointer transition-all duration-200 border border-white/10 hover:border-white/20"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h4 className="text-white font-medium text-sm mb-2 line-clamp-2">
                    {analysis.question}
                  </h4>
                  <div className="flex items-center space-x-4 text-xs text-white/60">
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>{formatDate(analysis.created_at)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <FileText className="h-3 w-3" />
                      <span>{analysis.charts_generated} charts</span>
                    </div>
                    {analysis.data_summary?.records && (
                      <div className="flex items-center space-x-1">
                        <span>{analysis.data_summary.records.toLocaleString()} records</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onLoadAnalysis(analysis.id);
                    }}
                    className="p-1 text-white/60 hover:text-blue-400 transition-colors"
                    title="Load analysis"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => handleDeleteAnalysis(analysis.id, e)}
                    className="p-1 text-white/60 hover:text-red-400 transition-colors"
                    title="Delete analysis"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SavedAnalyses;