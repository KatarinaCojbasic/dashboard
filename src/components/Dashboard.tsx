import React from 'react';
import { Bar, Line, Pie, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { AnalysisResult, CSVData, ChartData } from '../types';
import { TrendingUp, BarChart3, Eye, Zap, Settings, Plus, X, Play } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface DashboardProps {
  result: AnalysisResult;
  csvData: CSVData;
  onCustomChartsChange?: (customCharts: ChartData[]) => void;
  initialCustomCharts?: ChartData[];
}

const Dashboard: React.FC<DashboardProps> = ({ result, csvData, onCustomChartsChange, initialCustomCharts }) => {
  const [editableCharts, setEditableCharts] = React.useState<ChartData[]>(result.charts);
  const [customCharts, setCustomCharts] = React.useState<ChartData[]>(initialCustomCharts || []);
  const [showCustomBuilder, setShowCustomBuilder] = React.useState(false);
  const [newChart, setNewChart] = React.useState({
    type: 'bar' as 'bar' | 'line' | 'pie' | 'doughnut',
    title: '',
    xColumn: '',
    yColumn: '',
    aggregation: 'sum' as 'sum' | 'avg' | 'count' | 'max' | 'min'
  });

  // Update editable charts when result changes
  React.useEffect(() => {
    setEditableCharts(result.charts);
  }, [result.charts]);

  // Notify parent when custom charts change
  React.useEffect(() => {
    if (onCustomChartsChange) {
      onCustomChartsChange(customCharts);
    }
  }, [customCharts, onCustomChartsChange]);

  // Helper functions for column analysis
  const allColumns = csvData.headers;
  const numericColumns = csvData.headers.filter(header => {
    return csvData.data.some(row => !isNaN(parseFloat(row[header])) && row[header] !== '');
  });
  const categoricalColumns = csvData.headers.filter(header => !numericColumns.includes(header));
  
  const getColumnType = (column: string) => {
    if (numericColumns.includes(column)) return 'numeric';
    // Check if it's a date column
    const sampleValues = csvData.data.slice(0, 10).map(row => row[column]).filter(val => val);
    const dateValues = sampleValues.filter(val => !isNaN(Date.parse(val)));
    if (dateValues.length > sampleValues.length * 0.5) return 'date';
    return 'categorical';
  };

  const generateCustomChart = () => {
    if (!newChart.xColumn) return;
    
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
    ];
    
    const borderColors = colors.map(color => color.replace('0.8', '1'));
    
    let chartData: ChartData;
    
    if (newChart.type === 'pie' || newChart.type === 'doughnut') {
      // For pie/doughnut charts, count occurrences of each category
      const valueCounts: Record<string, number> = {};
      csvData.data.forEach(row => {
        const value = row[newChart.xColumn];
        if (value && value.trim()) {
          valueCounts[value] = (valueCounts[value] || 0) + 1;
        }
      });
      
      const sortedEntries = Object.entries(valueCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10);
      
      chartData = {
        type: newChart.type,
        title: newChart.title || `${newChart.xColumn} Distribution`,
        data: {
          labels: sortedEntries.map(([key]) => key),
          datasets: [{
            label: 'Count',
            data: sortedEntries.map(([, value]) => value),
            backgroundColor: colors.slice(0, sortedEntries.length),
            borderColor: borderColors.slice(0, sortedEntries.length),
            borderWidth: 2
          }]
        }
      };
    } else {
      // For bar/line charts, aggregate numeric data by categories
      if (!newChart.yColumn) return;
      
      const groupedData: Record<string, number[]> = {};
      csvData.data.forEach(row => {
        const xValue = row[newChart.xColumn];
        const yValue = parseFloat(row[newChart.yColumn]);
        
        if (xValue && !isNaN(yValue)) {
          if (!groupedData[xValue]) {
            groupedData[xValue] = [];
          }
          groupedData[xValue].push(yValue);
        }
      });
      
      const processedData = Object.entries(groupedData).map(([key, values]) => {
        let aggregatedValue: number;
        switch (newChart.aggregation) {
          case 'sum':
            aggregatedValue = values.reduce((sum, val) => sum + val, 0);
            break;
          case 'avg':
            aggregatedValue = values.reduce((sum, val) => sum + val, 0) / values.length;
            break;
          case 'count':
            aggregatedValue = values.length;
            break;
          case 'max':
            aggregatedValue = Math.max(...values);
            break;
          case 'min':
            aggregatedValue = Math.min(...values);
            break;
          default:
            aggregatedValue = values.reduce((sum, val) => sum + val, 0);
        }
        return { key, value: aggregatedValue };
      }).sort((a, b) => b.value - a.value).slice(0, 20);
      
      chartData = {
        type: newChart.type,
        title: newChart.title || `${newChart.yColumn} by ${newChart.xColumn} (${newChart.aggregation})`,
        data: {
          labels: processedData.map(item => item.key),
          datasets: [{
            label: `${newChart.aggregation.charAt(0).toUpperCase() + newChart.aggregation.slice(1)} of ${newChart.yColumn}`,
            data: processedData.map(item => item.value),
            backgroundColor: colors[0],
            borderColor: borderColors[0],
            borderWidth: 2
          }]
        }
      };
    }
    
    setCustomCharts(prev => [...prev, chartData]);
    setShowCustomBuilder(false);
    setNewChart({
      type: 'bar',
      title: '',
      xColumn: '',
      yColumn: '',
      aggregation: 'sum'
    });
  };
  
  const removeCustomChart = (index: number) => {
    setCustomCharts(prev => prev.filter((_, i) => i !== index));
  };

  const handleChartTypeChange = (chartIndex: number, newType: 'bar' | 'line' | 'pie' | 'doughnut') => {
    setEditableCharts(prevCharts => 
      prevCharts.map((chart, index) => 
        index === chartIndex 
          ? { ...chart, type: newType }
          : chart
      )
    );
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: 'rgba(255, 255, 255, 0.8)',
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1
      }
    },
    scales: {
      x: {
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
          font: {
            size: 11
          }
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      },
      y: {
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
          font: {
            size: 11
          }
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      }
    }
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: 'rgba(255, 255, 255, 0.8)',
          font: {
            size: 12
          },
          padding: 20
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1
      }
    }
  };

  const renderChart = (chart: any, index: number) => {
    const chartProps = {
      data: chart.data,
      options: chart.type === 'pie' || chart.type === 'doughnut' ? pieOptions : chartOptions
    };

    switch (chart.type) {
      case 'bar':
        return <Bar {...chartProps} />;
      case 'line':
        return <Line {...chartProps} />;
      case 'pie':
        return <Pie {...chartProps} />;
      case 'doughnut':
        return <Doughnut {...chartProps} />;
      default:
        return <Bar {...chartProps} />;
    }
  };

  const getChartTypeIcon = (type: string) => {
    switch (type) {
      case 'bar': return '📊';
      case 'line': return '📈';
      case 'pie': return '🥧';
      case 'doughnut': return '🍩';
      default: return '📊';
    }
  };

  const chartTypeOptions = [
    { value: 'bar', label: 'Bar Chart', icon: '📊' },
    { value: 'line', label: 'Line Chart', icon: '📈' },
    { value: 'pie', label: 'Pie Chart', icon: '🥧' },
    { value: 'doughnut', label: 'Doughnut Chart', icon: '🍩' }
  ];

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
        <div className="flex items-center space-x-3 mb-4">
          <TrendingUp className="h-6 w-6 text-green-400" />
          <h3 className="text-lg font-semibold text-white">Analysis Summary</h3>
        </div>
        <p className="text-white/80 leading-relaxed">{result.summary}</p>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {editableCharts.map((chart, index) => (
          <div key={index} className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <BarChart3 className="h-5 w-5 text-blue-400" />
                <h4 className="text-lg font-medium text-white">{chart.title}</h4>
              </div>
              
              {/* Chart Type Selector */}
              <div className="relative group">
                <button className="flex items-center space-x-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white/80 hover:text-white transition-all duration-200">
                  <Settings className="h-4 w-4" />
                  <span className="text-sm">{getChartTypeIcon(chart.type)}</span>
                </button>
                
                {/* Dropdown Menu */}
                <div className="absolute right-0 top-full mt-2 w-48 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                  <div className="p-2">
                    <div className="text-xs text-white/60 mb-2 px-2">Chart Type</div>
                    {chartTypeOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => handleChartTypeChange(index, option.value as any)}
                        className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-sm transition-all duration-200 ${
                          chart.type === option.value
                            ? 'bg-blue-500/30 text-blue-300 border border-blue-500/50'
                            : 'text-white/80 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <span className="text-base">{option.icon}</span>
                        <span>{option.label}</span>
                        {chart.type === option.value && (
                          <span className="ml-auto text-blue-400">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="h-80">
              {renderChart(chart, index)}
            </div>
          </div>
        ))}
      </div>

      {/* Custom Dashboard Builder */}
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Plus className="h-6 w-6 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Create Your Dashboard</h3>
          </div>
          <button
            onClick={() => setShowCustomBuilder(!showCustomBuilder)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg text-blue-400 hover:text-blue-300 transition-all duration-200"
          >
            <Plus className="h-4 w-4" />
            <span className="text-sm font-medium">Add Chart</span>
          </button>
        </div>

        {showCustomBuilder && (
          <div className="bg-white/5 rounded-lg p-6 mb-6 border border-white/10">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              {/* Chart Type */}
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">Chart Type</label>
                <select
                  value={newChart.type}
                  onChange={(e) => setNewChart(prev => ({ ...prev, type: e.target.value as any }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{
                    color: 'white',
                    backgroundColor: '#1f2937'
                  }}
                >
                  <option value="bar" style={{ backgroundColor: '#1f2937', color: 'white' }}>📊 Bar Chart</option>
                  <option value="line" style={{ backgroundColor: '#1f2937', color: 'white' }}>📈 Line Chart</option>
                  <option value="pie" style={{ backgroundColor: '#1f2937', color: 'white' }}>🥧 Pie Chart</option>
                  <option value="doughnut" style={{ backgroundColor: '#1f2937', color: 'white' }}>🍩 Doughnut Chart</option>
                </select>
              </div>

              {/* X Column */}
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">
                  {newChart.type === 'pie' || newChart.type === 'doughnut' ? 'Category Column' : 'X-Axis Column'}
                </label>
                <select
                  value={newChart.xColumn}
                  onChange={(e) => setNewChart(prev => ({ ...prev, xColumn: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{
                    color: 'white',
                    backgroundColor: '#1f2937'
                  }}
                >
                  <option value="" style={{ backgroundColor: '#1f2937', color: 'white' }}>Select column...</option>
                  {allColumns.map(column => (
                    <option key={column} value={column} style={{ backgroundColor: '#1f2937', color: 'white' }}>
                      {column} ({getColumnType(column)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Y Column (not needed for pie/doughnut) */}
              {newChart.type !== 'pie' && newChart.type !== 'doughnut' && (
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">Y-Axis Column</label>
                  <select
                    value={newChart.yColumn}
                    onChange={(e) => setNewChart(prev => ({ ...prev, yColumn: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-800 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{
                      color: 'white',
                      backgroundColor: '#1f2937'
                    }}
                  >
                    <option value="" style={{ backgroundColor: '#1f2937', color: 'white' }}>Select column...</option>
                    {numericColumns.map(column => (
                      <option key={column} value={column} style={{ backgroundColor: '#1f2937', color: 'white' }}>
                        {column} (numeric)
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Aggregation (not needed for pie/doughnut) */}
              {newChart.type !== 'pie' && newChart.type !== 'doughnut' && (
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">Aggregation</label>
                  <select
                    value={newChart.aggregation}
                    onChange={(e) => setNewChart(prev => ({ ...prev, aggregation: e.target.value as any }))}
                    className="w-full px-3 py-2 bg-gray-800 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{
                      color: 'white',
                      backgroundColor: '#1f2937'
                    }}
                  >
                    <option value="sum" style={{ backgroundColor: '#1f2937', color: 'white' }}>Sum</option>
                    <option value="avg" style={{ backgroundColor: '#1f2937', color: 'white' }}>Average</option>
                    <option value="count" style={{ backgroundColor: '#1f2937', color: 'white' }}>Count</option>
                    <option value="max" style={{ backgroundColor: '#1f2937', color: 'white' }}>Maximum</option>
                    <option value="min" style={{ backgroundColor: '#1f2937', color: 'white' }}>Minimum</option>
                  </select>
                </div>
              )}

              {/* Chart Title */}
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">Chart Title (Optional)</label>
                <input
                  type="text"
                  value={newChart.title}
                  onChange={(e) => setNewChart(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter custom title..."
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-white/60">
                {newChart.type === 'pie' || newChart.type === 'doughnut' 
                  ? 'Pie/Doughnut charts show distribution of categorical data'
                  : 'Bar/Line charts require numeric Y-axis data'
                }
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowCustomBuilder(false)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white/80 hover:text-white transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={generateCustomChart}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-lg text-white transition-all duration-200"
                >
                  <Play className="h-4 w-4" />
                  <span>Generate Chart</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Custom Charts Grid */}
        {customCharts.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {customCharts.map((chart, index) => (
              <div key={`custom-${index}`} className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <BarChart3 className="h-5 w-5 text-purple-400" />
                    <h4 className="text-lg font-medium text-white">{chart.title}</h4>
                  </div>
                  <button
                    onClick={() => removeCustomChart(index)}
                    className="p-1 text-white/60 hover:text-red-400 transition-colors"
                    title="Remove chart"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="h-80">
                  {renderChart(chart, index)}
                </div>
              </div>
            ))}
          </div>
        )}

        {customCharts.length === 0 && !showCustomBuilder && (
          <div className="text-center py-8 text-white/60">
            <Plus className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Create custom charts by selecting your own columns and chart types</p>
            <p className="text-sm mt-2">Click "Add Chart" to get started</p>
          </div>
        )}
      </div>

      {/* Insights */}
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
        <div className="flex items-center space-x-3 mb-4">
          <Eye className="h-6 w-6 text-purple-400" />
          <h3 className="text-lg font-semibold text-white">Key Insights</h3>
        </div>
        <div className="space-y-3">
          {result.insights.map((insight, index) => (
            <div key={index} className="flex items-start space-x-3 p-3 bg-white/5 rounded-lg">
              <Zap className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <p className="text-white/80 text-sm leading-relaxed">{insight}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;