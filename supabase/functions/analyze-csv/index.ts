const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface CSVAnalysisRequest {
  data: Record<string, string>[];
  headers: string[];
  question: string;
  user_id?: string;
}

interface ChartData {
  type: 'bar' | 'line' | 'pie' | 'doughnut';
  title: string;
  data: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      backgroundColor: string | string[];
      borderColor: string | string[];
      borderWidth?: number;
    }[];
  };
}

interface AnalysisResult {
  summary: string;
  charts: ChartData[];
  insights: string[];
}

// OpenManus-inspired autonomous analysis
const autonomousAnalyzer = {
  analyzeDataStructure: (data: Record<string, string>[], headers: string[]) => {
    const analysis = {
      numericColumns: [] as string[],
      categoricalColumns: [] as string[],
      dateColumns: [] as string[],
      totalRecords: data.length,
      columnStats: {} as Record<string, any>
    };

    headers.forEach(header => {
      const values = data.map(row => row[header]).filter(val => val && val.trim());
      if (values.length === 0) return;

      const uniqueValues = new Set(values);
      const uniqueCount = uniqueValues.size;
      const uniqueRatio = uniqueCount / values.length;

      // Check if numeric
      const numericValues = values.filter(val => !isNaN(parseFloat(val)));
      if (numericValues.length > values.length * 0.7) {
        const nums = numericValues.map(val => parseFloat(val));
        analysis.numericColumns.push(header);
        analysis.columnStats[header] = {
          type: 'numeric',
          min: Math.min(...nums),
          max: Math.max(...nums),
          avg: nums.reduce((sum, val) => sum + val, 0) / nums.length,
          uniqueCount
        };
        return;
      }

      // Check if date
      const dateValues = values.filter(val => !isNaN(Date.parse(val)));
      if (dateValues.length > values.length * 0.5) {
        analysis.dateColumns.push(header);
        analysis.columnStats[header] = {
          type: 'date',
          uniqueCount,
          dateRange: {
            start: new Date(Math.min(...dateValues.map(d => Date.parse(d)))),
            end: new Date(Math.max(...dateValues.map(d => Date.parse(d))))
          }
        };
        return;
      }

      // Categorical
      analysis.categoricalColumns.push(header);
      analysis.columnStats[header] = {
        type: 'categorical',
        uniqueCount,
        uniqueRatio,
        topValues: Array.from(uniqueValues).slice(0, 10)
      };
    });

    return analysis;
  },

  parseQuestionIntent: (question: string, headers: string[]) => {
    const lowerQuestion = question.toLowerCase();
    const intent = {
      type: 'general' as 'trend' | 'distribution' | 'comparison' | 'top' | 'correlation' | 'summary' | 'general',
      mentionedColumns: [] as string[],
      keywords: [] as string[],
      timeframe: null as string | null,
      priority: 'medium' as 'high' | 'medium' | 'low'
    };

    // Find mentioned columns (case insensitive)
    headers.forEach(header => {
      const headerLower = header.toLowerCase();
      if (lowerQuestion.includes(headerLower)) {
        intent.mentionedColumns.push(header);
      }
    });

    // Detect intent types based on keywords
    const trendKeywords = ['trend', 'over time', 'timeline', 'change', 'growth', 'decline', 'evolution', 'progression'];
    const distributionKeywords = ['distribution', 'breakdown', 'proportion', 'percentage', 'share', 'split', 'composition'];
    const comparisonKeywords = ['compare', 'comparison', 'versus', 'vs', 'difference', 'between', 'against'];
    const topKeywords = ['top', 'highest', 'lowest', 'best', 'worst', 'maximum', 'minimum', 'most', 'least'];
    const correlationKeywords = ['correlation', 'relationship', 'related', 'connection', 'impact', 'affect', 'influence'];
    const summaryKeywords = ['summary', 'overview', 'general', 'main', 'key', 'important', 'insights'];

    if (trendKeywords.some(keyword => lowerQuestion.includes(keyword))) {
      intent.type = 'trend';
      intent.priority = 'high';
      intent.keywords.push(...trendKeywords.filter(k => lowerQuestion.includes(k)));
    } else if (distributionKeywords.some(keyword => lowerQuestion.includes(keyword))) {
      intent.type = 'distribution';
      intent.priority = 'high';
      intent.keywords.push(...distributionKeywords.filter(k => lowerQuestion.includes(k)));
    } else if (comparisonKeywords.some(keyword => lowerQuestion.includes(keyword))) {
      intent.type = 'comparison';
      intent.priority = 'high';
      intent.keywords.push(...comparisonKeywords.filter(k => lowerQuestion.includes(k)));
    } else if (topKeywords.some(keyword => lowerQuestion.includes(keyword))) {
      intent.type = 'top';
      intent.priority = 'high';
      intent.keywords.push(...topKeywords.filter(k => lowerQuestion.includes(k)));
    } else if (correlationKeywords.some(keyword => lowerQuestion.includes(keyword))) {
      intent.type = 'correlation';
      intent.priority = 'high';
      intent.keywords.push(...correlationKeywords.filter(k => lowerQuestion.includes(k)));
    } else if (summaryKeywords.some(keyword => lowerQuestion.includes(keyword))) {
      intent.type = 'summary';
      intent.priority = 'medium';
      intent.keywords.push(...summaryKeywords.filter(k => lowerQuestion.includes(k)));
    }

    // Detect timeframe mentions
    const timeframes = ['daily', 'weekly', 'monthly', 'yearly', 'annual', 'quarterly'];
    timeframes.forEach(timeframe => {
      if (lowerQuestion.includes(timeframe)) {
        intent.timeframe = timeframe;
      }
    });

    return intent;
  },
  generateAutonomousInsights: (data: Record<string, string>[], analysis: any) => {
    const insights = [];
    
    insights.push(`Dataset contains ${analysis.totalRecords.toLocaleString()} records across ${data.length > 0 ? Object.keys(data[0]).length : 0} columns`);
    
    if (analysis.numericColumns.length > 0) {
      insights.push(`Found ${analysis.numericColumns.length} numeric columns suitable for quantitative analysis`);
      
      // Add insights about numeric ranges
      const numericInsights = analysis.numericColumns.slice(0, 2).map(col => {
        const stats = analysis.columnStats[col];
        return `${col}: ranges from ${stats.min.toFixed(2)} to ${stats.max.toFixed(2)} (avg: ${stats.avg.toFixed(2)})`;
      });
      insights.push(...numericInsights);
    }
    
    if (analysis.categoricalColumns.length > 0) {
      insights.push(`Identified ${analysis.categoricalColumns.length} categorical columns for segmentation analysis`);
      
      // Add insights about categorical diversity
      const categoricalInsights = analysis.categoricalColumns.slice(0, 2).map(col => {
        const stats = analysis.columnStats[col];
        return `${col}: ${stats.uniqueCount} unique values (${(stats.uniqueRatio * 100).toFixed(1)}% diversity)`;
      });
      insights.push(...categoricalInsights);
    }
    
    if (analysis.dateColumns.length > 0) {
      insights.push(`Detected ${analysis.dateColumns.length} date columns enabling time-series analysis`);
    }

    // Add correlation insights if multiple numeric columns exist
    if (analysis.numericColumns.length >= 2) {
      insights.push('Multiple numeric columns detected - correlation analysis opportunities available');
    }

    return insights;
  },

  createAdaptiveCharts: (data: Record<string, string>[], analysis: any, question: string, headers: string[]) => {
    const intent = autonomousAnalyzer.parseQuestionIntent(question, headers);
    const charts: ChartData[] = [];
    const colors = [
      'rgba(59, 130, 246, 0.8)',   // Blue
      'rgba(147, 51, 234, 0.8)',   // Purple
      'rgba(34, 197, 94, 0.8)',    // Green
      'rgba(249, 115, 22, 0.8)',   // Orange
      'rgba(236, 72, 153, 0.8)',   // Pink
      'rgba(14, 165, 233, 0.8)',   // Sky
      'rgba(168, 85, 247, 0.8)',   // Violet
      'rgba(34, 211, 238, 0.8)',   // Cyan
      'rgba(251, 191, 36, 0.8)',   // Amber
      'rgba(239, 68, 68, 0.8)',    // Red
      'rgba(16, 185, 129, 0.8)',   // Emerald
      'rgba(139, 92, 246, 0.8)'    // Indigo
    ];

    const borderColors = colors.map(color => color.replace('0.8', '1'));

    // Helper function to get relevant columns based on intent
    const getRelevantColumns = (type: 'numeric' | 'categorical' | 'date') => {
      const availableColumns = analysis[`${type}Columns`] || [];
      const mentionedRelevant = intent.mentionedColumns.filter(col => 
        availableColumns.includes(col)
      );
      
      // Prioritize mentioned columns, then fall back to all available
      return mentionedRelevant.length > 0 ? mentionedRelevant : availableColumns;
    };

    // Generate charts based on detected intent
    switch (intent.type) {
      case 'trend':
        // Prioritize time-series charts
        if (analysis.dateColumns.length > 0 && analysis.numericColumns.length > 0) {
          const dateColumn = getRelevantColumns('date')[0] || analysis.dateColumns[0];
          const numericColumns = getRelevantColumns('numeric').slice(0, 2);
          
          numericColumns.forEach((numericColumn, index) => {
            const dateGroups: Record<string, number[]> = {};
            
            data.forEach(row => {
              const dateValue = row[dateColumn];
              const numericValue = parseFloat(row[numericColumn]);
              
              if (dateValue && !isNaN(numericValue)) {
                const dateKey = new Date(dateValue).toISOString().split('T')[0];
                if (!dateGroups[dateKey]) {
                  dateGroups[dateKey] = [];
                }
                dateGroups[dateKey].push(numericValue);
              }
            });

            const sortedDates = Object.keys(dateGroups)
              .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
              .slice(0, 30);

            const averageValues = sortedDates.map(date => {
              const values = dateGroups[date];
              return values.reduce((sum, val) => sum + val, 0) / values.length;
            });

            if (sortedDates.length > 1) {
              charts.push({
                type: 'line',
                title: `${numericColumn} Trend Analysis`,
                data: {
                  labels: sortedDates.map(date => new Date(date).toLocaleDateString()),
                  datasets: [{
                    label: `${numericColumn} Over Time`,
                    data: averageValues,
                    backgroundColor: colors[index],
                    borderColor: borderColors[index],
                    borderWidth: 3,
                    fill: false
                  }]
                }
              });
            }
          });
        }
        break;

      case 'distribution':
        // Prioritize distribution charts (pie/doughnut)
        const categoricalColumns = getRelevantColumns('categorical').slice(0, 2);
        categoricalColumns.forEach((column, index) => {
          const valueCounts: Record<string, number> = {};
          
          data.forEach(row => {
            const value = row[column];
            if (value && value.trim()) {
              valueCounts[value] = (valueCounts[value] || 0) + 1;
            }
          });

          const sortedEntries = Object.entries(valueCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10);

          if (sortedEntries.length > 0) {
            charts.push({
              type: index === 0 ? 'pie' : 'doughnut',
              title: `${column} Distribution`,
              data: {
                labels: sortedEntries.map(([key]) => key),
                datasets: [{
                  label: 'Count',
                  data: sortedEntries.map(([, value]) => value),
                  backgroundColor: colors.slice(index * 6, (index + 1) * 6),
                  borderColor: borderColors.slice(index * 6, (index + 1) * 6),
                  borderWidth: 2
                }]
              }
            });
          }
        });
        break;

      case 'comparison':
        // Create comparison charts
        const numericForComparison = getRelevantColumns('numeric').slice(0, 4);
        if (numericForComparison.length >= 2) {
          const comparisonData = numericForComparison.map(col => {
            const values = data.map(row => parseFloat(row[col]) || 0).filter(val => !isNaN(val));
            return {
              column: col,
              avg: values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0,
              max: values.length > 0 ? Math.max(...values) : 0,
              min: values.length > 0 ? Math.min(...values) : 0
            };
          });

          charts.push({
            type: 'bar',
            title: 'Column Comparison - Average Values',
            data: {
              labels: comparisonData.map(item => item.column),
              datasets: [{
                label: 'Average Values',
                data: comparisonData.map(item => item.avg),
                backgroundColor: colors.slice(0, comparisonData.length),
                borderColor: borderColors.slice(0, comparisonData.length),
                borderWidth: 2
              }]
            }
          });

          // Add range comparison
          charts.push({
            type: 'bar',
            title: 'Column Comparison - Value Ranges',
            data: {
              labels: comparisonData.map(item => item.column),
              datasets: [{
                label: 'Value Range (Max - Min)',
                data: comparisonData.map(item => item.max - item.min),
                backgroundColor: colors.slice(4, 4 + comparisonData.length),
                borderColor: borderColors.slice(4, 4 + comparisonData.length),
                borderWidth: 2
              }]
            }
          });
        }
        break;

      case 'top':
        // Create top N charts
        if (analysis.categoricalColumns.length > 0 && analysis.numericColumns.length > 0) {
          const categoricalColumn = getRelevantColumns('categorical')[0] || analysis.categoricalColumns[0];
          const numericColumn = getRelevantColumns('numeric')[0] || analysis.numericColumns[0];
          
          const categoryTotals: Record<string, number> = {};
          const categoryCounts: Record<string, number> = {};
          
          data.forEach(row => {
            const category = row[categoricalColumn];
            const value = parseFloat(row[numericColumn]);
            
            if (category && !isNaN(value)) {
              categoryTotals[category] = (categoryTotals[category] || 0) + value;
              categoryCounts[category] = (categoryCounts[category] || 0) + 1;
            }
          });

          const topEntries = Object.entries(categoryTotals)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10);

          if (topEntries.length > 0) {
            charts.push({
              type: 'bar',
              title: `Top ${categoricalColumn} by ${numericColumn}`,
              data: {
                labels: topEntries.map(([key]) => key),
                datasets: [{
                  label: `Total ${numericColumn}`,
                  data: topEntries.map(([, value]) => value),
                  backgroundColor: colors.slice(0, topEntries.length),
                  borderColor: borderColors.slice(0, topEntries.length),
                  borderWidth: 2
                }]
              }
            });
          }
        }
        break;

      case 'correlation':
        // Create correlation-focused charts
        if (analysis.numericColumns.length >= 2) {
          const numericCols = getRelevantColumns('numeric').slice(0, 2);
          if (numericCols.length >= 2) {
            // Create scatter-like representation using grouped data
            const correlationData: Record<string, { x: number[], y: number[] }> = {};
            
            data.forEach(row => {
              const xVal = parseFloat(row[numericCols[0]]);
              const yVal = parseFloat(row[numericCols[1]]);
              
              if (!isNaN(xVal) && !isNaN(yVal)) {
                const xRange = Math.floor(xVal / 10) * 10; // Group by ranges
                const key = `${xRange}-${xRange + 10}`;
                
                if (!correlationData[key]) {
                  correlationData[key] = { x: [], y: [] };
                }
                correlationData[key].x.push(xVal);
                correlationData[key].y.push(yVal);
              }
            });

            const correlationEntries = Object.entries(correlationData).map(([range, values]) => ({
              range,
              avgX: values.x.reduce((sum, val) => sum + val, 0) / values.x.length,
              avgY: values.y.reduce((sum, val) => sum + val, 0) / values.y.length,
              count: values.x.length
            }));

            if (correlationEntries.length > 0) {
              charts.push({
                type: 'line',
                title: `${numericCols[0]} vs ${numericCols[1]} Relationship`,
                data: {
                  labels: correlationEntries.map(item => item.range),
                  datasets: [{
                    label: `Average ${numericCols[1]}`,
                    data: correlationEntries.map(item => item.avgY),
                    backgroundColor: colors[0],
                    borderColor: borderColors[0],
                    borderWidth: 3
                  }]
                }
              });
            }
          }
        }
        break;

      default:
        // Default case - generate general overview charts
        break;
    }

    // Fill remaining slots with general charts if needed
    while (charts.length < 4) {
      if (charts.length === 0 && analysis.numericColumns.length > 0) {
        // Primary numeric overview
        const topColumns = analysis.numericColumns.slice(0, 6);
        const averages = topColumns.map(col => {
          const values = data.map(row => parseFloat(row[col]) || 0).filter(val => !isNaN(val));
          return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
        });

        charts.push({
          type: 'bar',
          title: 'Numeric Data Overview',
          data: {
            labels: topColumns,
            datasets: [{
              label: 'Average Values',
              data: averages,
              backgroundColor: colors.slice(0, topColumns.length),
              borderColor: borderColors.slice(0, topColumns.length),
              borderWidth: 2
            }]
          }
        });
      } else if (analysis.categoricalColumns.length > 0 && !charts.some(c => c.type === 'pie')) {
        // Add categorical distribution
        const categoricalColumn = analysis.categoricalColumns[0];
        const valueCounts: Record<string, number> = {};
        
        data.forEach(row => {
          const value = row[categoricalColumn];
          if (value && value.trim()) {
            valueCounts[value] = (valueCounts[value] || 0) + 1;
          }
        });

        const sortedEntries = Object.entries(valueCounts)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 8);

        if (sortedEntries.length > 0) {
          charts.push({
            type: 'pie',
            title: `${categoricalColumn} Distribution`,
            data: {
              labels: sortedEntries.map(([key]) => key),
              datasets: [{
                label: 'Count',
                data: sortedEntries.map(([, value]) => value),
                backgroundColor: colors.slice(2, 2 + sortedEntries.length),
                borderColor: borderColors.slice(2, 2 + sortedEntries.length),
                borderWidth: 2
              }]
            }
          });
        } else {
          break; // No more meaningful charts to add
        }
      } else if (analysis.dateColumns.length > 0 && analysis.numericColumns.length > 0 && !charts.some(c => c.type === 'line')) {
        // Add time series if not already present
        const dateColumn = analysis.dateColumns[0];
        const numericColumn = analysis.numericColumns[0];
        
        const dateGroups: Record<string, number[]> = {};
        
        data.forEach(row => {
          const dateValue = row[dateColumn];
          const numericValue = parseFloat(row[numericColumn]);
          
          if (dateValue && !isNaN(numericValue)) {
            const dateKey = new Date(dateValue).toISOString().split('T')[0];
            if (!dateGroups[dateKey]) {
              dateGroups[dateKey] = [];
            }
            dateGroups[dateKey].push(numericValue);
          }
        });

        const sortedDates = Object.keys(dateGroups)
          .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
          .slice(0, 20);

        const averageValues = sortedDates.map(date => {
          const values = dateGroups[date];
          return values.reduce((sum, val) => sum + val, 0) / values.length;
        });

        if (sortedDates.length > 1) {
          charts.push({
            type: 'line',
            title: `${numericColumn} Over Time`,
            data: {
              labels: sortedDates.map(date => new Date(date).toLocaleDateString()),
              datasets: [{
                label: `${numericColumn}`,
                data: averageValues,
                backgroundColor: colors[charts.length],
                borderColor: borderColors[charts.length],
                borderWidth: 3
              }]
            }
          });
        } else {
          break;
        }
      } else {
        break; // No more meaningful charts to add
      }
    }

    return charts.slice(0, 4);
  }
};

async function callClaudeAPI(prompt: string): Promise<string> {
  try {
    const claudeApiKey = Deno.env.get('CLAUDE_API_KEY');
    if (!claudeApiKey) {
      throw new Error('Claude API key not configured');
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': claudeApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API response:', response.status, errorText);
      throw new Error(`Claude API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    return result.content[0].text;
  } catch (error) {
    console.error('Claude API call failed:', error);
    return 'AI analysis temporarily unavailable. Using autonomous analysis instead.';
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { data, headers, question, user_id }: CSVAnalysisRequest = await req.json();
    
    if (!data || !headers || !question) {
      throw new Error('Missing required fields');
    }

    // OpenManus autonomous analysis
    const dataAnalysis = autonomousAnalyzer.analyzeDataStructure(data, headers);
    const autonomousInsights = autonomousAnalyzer.generateAutonomousInsights(data, dataAnalysis);
    const charts = autonomousAnalyzer.createAdaptiveCharts(data, dataAnalysis, question, headers);

    // Enhanced analysis with Claude AI
    let aiSummary = '';
    const claudeApiKey = Deno.env.get('CLAUDE_API_KEY');
    
    if (claudeApiKey && user_id) {
      // Only use Claude API for authenticated users
      const prompt = `Analyze this CSV data and provide insights for the question: "${question}"

Data structure:
- Total records: ${dataAnalysis.totalRecords}
- Numeric columns: ${dataAnalysis.numericColumns.join(', ')}
- Categorical columns: ${dataAnalysis.categoricalColumns.join(', ')}
- Date columns: ${dataAnalysis.dateColumns.join(', ')}

Column statistics:
${Object.entries(dataAnalysis.columnStats).map(([col, stats]) => 
  `${col}: ${JSON.stringify(stats, null, 2)}`
).join('\n')}

Sample data (first 3 rows):
${JSON.stringify(data.slice(0, 3), null, 2)}

Please provide a comprehensive analysis summary in 2-3 sentences focusing on the most interesting patterns and insights.`;

      aiSummary = await callClaudeAPI(prompt);
    }

    const result: AnalysisResult = {
      summary: aiSummary || `Autonomous analysis of your dataset reveals ${dataAnalysis.totalRecords} records with ${dataAnalysis.numericColumns.length} numeric and ${dataAnalysis.categoricalColumns.length} categorical columns. Generated ${charts.length} adaptive visualizations based on data characteristics and OpenManus decision logic. The analysis identifies key patterns in ${dataAnalysis.numericColumns.concat(dataAnalysis.categoricalColumns).slice(0, 3).join(', ')} for comprehensive insights.`,
      charts: charts,
      insights: [
        ...autonomousInsights,
        `Generated ${charts.length} adaptive charts using OpenManus autonomous selection`,
        'Chart types automatically selected based on data characteristics',
        aiSummary ? 'Enhanced with Claude AI insights' : user_id ? 'Connect Claude API for enhanced AI analysis' : 'Sign in for AI-enhanced analysis'
      ]
    };

    return new Response(
      JSON.stringify(result),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        }
      }
    );
  } catch (error) {
    console.error('Analysis error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Analysis failed',
        message: error.message
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        }
      }
    );
  }
});