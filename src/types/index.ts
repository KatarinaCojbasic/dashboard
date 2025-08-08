export interface CSVData {
  headers: string[];
  data: Record<string, string>[];
}

export interface ChartData {
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

export interface AnalysisResult {
  summary: string;
  charts: ChartData[];
  insights: string[];
}

export interface APIConfig {
  dateFrom: string;
  dateTo: string;
  locations: string;
  panels: string;
  deviceTypes: string;
  accessToken: string;
}

export interface APIData {
  headers: string[];
  data: Record<string, any>[];
  source: 'api';
}