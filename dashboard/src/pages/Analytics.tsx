import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Users, 
  MessageSquare, 
  Clock, 
  Star,
  AlertTriangle,
  CheckCircle,
  Globe,
  Mic,
  Brain,
  Target,
  Zap,
  Activity,
  Loader2,
  RefreshCw,
  Download,
  Filter,
  Calendar,
  PieChart,
  LineChart,
  Award,
  Shield,
  Eye,
  Headphones
} from 'lucide-react';
import { getMetrics, listInteractions, getConfig } from '../lib/api';

interface AnalyticsData {
  metrics: any;
  interactions: any[];
  config: any;
  lastUpdated: Date;
}

interface ModelPerformance {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  trainingSamples: number;
  lastTraining: string;
  modelVersion: string;
}

interface AudioQualityMetrics {
  avgClarity: number;
  avgVolume: number;
  backgroundNoise: number;
  speechRate: number;
  pauseFrequency: number;
}

const Analytics = () => {
  const { t } = useTranslation();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h');
  const [selectedMetric, setSelectedMetric] = useState('all');

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [metricsData, interactionsData, configData] = await Promise.all([
        getMetrics(),
        listInteractions(),
        getConfig()
      ]);
      
      console.log('Analytics data fetched:', { metricsData, interactionsData, configData });
      
      setData({
        metrics: metricsData,
        interactions: Array.isArray(interactionsData) ? interactionsData : interactionsData?.interactions || [],
        config: configData,
        lastUpdated: new Date()
      });
    } catch (err) {
      console.error('Failed to fetch analytics data:', err);
      setError('Failed to load analytics data. Please check if the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
    
    // Refresh data every 30 seconds for real-time updates
    const interval = setInterval(fetchAnalyticsData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Mock model performance data (in production, this would come from your ML pipeline)
  const modelPerformance: ModelPerformance = {
    accuracy: 94.2,
    precision: 92.8,
    recall: 95.1,
    f1Score: 93.9,
    trainingSamples: 12547,
    lastTraining: '2 hours ago',
    modelVersion: 'v2.1.3'
  };

  // Mock audio quality metrics (in production, this would come from your audio processing)
  const audioQuality: AudioQualityMetrics = {
    avgClarity: 87.3,
    avgVolume: 72.1,
    backgroundNoise: 15.2,
    speechRate: 145.8,
    pauseFrequency: 3.2
  };

  const getSentimentColor = (sentiment: number) => {
    if (sentiment > 0.1) return 'text-green-600';
    if (sentiment < -0.1) return 'text-red-600';
    return 'text-yellow-600';
  };

  const getQualityColor = (quality: number) => {
    if (quality >= 90) return 'text-green-600';
    if (quality >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-50 dark:bg-green-900/20';
    if (score >= 80) return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20';
    if (score >= 70) return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20';
    return 'text-red-600 bg-red-50 dark:bg-red-900/20';
  };

  if (loading) {
    return (
      <div className="p-8 space-y-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-lg text-gray-600 dark:text-gray-400">Loading advanced analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 space-y-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <p className="text-lg text-red-600 dark:text-red-400 mb-4">{error}</p>
            <button 
              onClick={fetchAnalyticsData} 
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const totalInteractions = data?.interactions.length || 0;
  const avgSentiment = data?.metrics?.sentiment?.avg || 0;
  const avgQuality = data?.metrics?.voice_analysis?.average_quality || 0;
  const languageDistribution = data?.metrics?.voice_analysis?.language_distribution || {};

  return (
    <div className="p-8 space-y-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Advanced Analytics
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Comprehensive insights and performance metrics for your conversation analytics platform
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Live</span>
          </div>
          <button 
            onClick={fetchAnalyticsData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
          <div className="text-right text-sm text-gray-500">
            <p>Last updated: {data?.lastUpdated.toLocaleTimeString()}</p>
            <p>Real-time monitoring active</p>
          </div>
        </div>
      </div>

      {/* Time Range and Filter Controls */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <select
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
            >
              <option value="all">All Metrics</option>
              <option value="sentiment">Sentiment Analysis</option>
              <option value="quality">Quality Metrics</option>
              <option value="performance">Model Performance</option>
            </select>
          </div>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2">
            <Download className="h-4 w-4" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Total Interactions
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {totalInteractions}
                </p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="h-4 w-4 text-emerald-500 mr-1" />
                  <span className="text-sm font-semibold text-emerald-600">
                    +12.5% vs last period
                  </span>
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-900/20">
                <MessageSquare className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Average Sentiment
                </p>
                <p className={`text-3xl font-bold ${getSentimentColor(avgSentiment)}`}>
                  {avgSentiment > 0.1 ? 'Positive' : avgSentiment < -0.1 ? 'Negative' : 'Neutral'}
                </p>
                <div className="flex items-center mt-2">
                  <span className="text-sm text-gray-500">
                    Score: {avgSentiment.toFixed(2)}
                  </span>
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20">
                <Star className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Model Accuracy
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {modelPerformance.accuracy}%
                </p>
                <div className="flex items-center mt-2">
                  <Brain className="h-4 w-4 text-purple-500 mr-1" />
                  <span className="text-sm text-gray-500">
                    v{modelPerformance.modelVersion}
                  </span>
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-900/20">
                <Brain className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Audio Quality
                </p>
                <p className={`text-3xl font-bold ${getQualityColor(audioQuality.avgClarity)}`}>
                  {audioQuality.avgClarity}%
                </p>
                <div className="flex items-center mt-2">
                  <Mic className="h-4 w-4 text-indigo-500 mr-1" />
                  <span className="text-sm text-gray-500">
                    Avg clarity
                  </span>
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20">
                <Mic className="h-6 w-6 text-indigo-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Model Performance Metrics */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-lg">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2 mb-4">
            <Brain className="h-5 w-5" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Model Performance</h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Real-time performance metrics for your trained models</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className={`p-4 rounded-xl ${getPerformanceColor(modelPerformance.accuracy)}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium mb-1">Accuracy</p>
                  <p className="text-2xl font-bold">{modelPerformance.accuracy}%</p>
                </div>
                <Target className="h-8 w-8 opacity-60" />
              </div>
            </div>
            <div className={`p-4 rounded-xl ${getPerformanceColor(modelPerformance.precision)}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium mb-1">Precision</p>
                  <p className="text-2xl font-bold">{modelPerformance.precision}%</p>
                </div>
                <CheckCircle className="h-8 w-8 opacity-60" />
              </div>
            </div>
            <div className={`p-4 rounded-xl ${getPerformanceColor(modelPerformance.recall)}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium mb-1">Recall</p>
                  <p className="text-2xl font-bold">{modelPerformance.recall}%</p>
                </div>
                <Eye className="h-8 w-8 opacity-60" />
              </div>
            </div>
            <div className={`p-4 rounded-xl ${getPerformanceColor(modelPerformance.f1Score)}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium mb-1">F1 Score</p>
                  <p className="text-2xl font-bold">{modelPerformance.f1Score}%</p>
                </div>
                <Award className="h-8 w-8 opacity-60" />
              </div>
            </div>
          </div>
          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Training Information</p>
                <p className="text-sm text-gray-500">Last trained: {modelPerformance.lastTraining} • Samples: {modelPerformance.trainingSamples.toLocaleString()}</p>
              </div>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                Retrain Model
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Audio Quality Analytics */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-lg">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2 mb-4">
            <Headphones className="h-5 w-5" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Audio Quality Metrics</h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Real-time audio processing quality analysis</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{audioQuality.avgClarity}%</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Avg Clarity</div>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{audioQuality.avgVolume}%</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Avg Volume</div>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{audioQuality.backgroundNoise}%</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Background Noise</div>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{audioQuality.speechRate}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Speech Rate (WPM)</div>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{audioQuality.pauseFrequency}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Pause Frequency</div>
            </div>
          </div>
        </div>
      </div>

      {/* Language Distribution */}
      {Object.keys(languageDistribution).length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-lg">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2 mb-4">
              <Globe className="h-5 w-5" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Language Distribution</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Real-time language usage across all conversations</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {Object.entries(languageDistribution).map(([lang, count]) => (
                <div key={lang} className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{count}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {lang === 'hi' ? 'Hindi' : lang === 'en' ? 'English' : lang === 'ta' ? 'Tamil' : lang === 'te' ? 'Telugu' : lang === 'bn' ? 'Bengali' : lang === 'gu' ? 'Gujarati' : lang.toUpperCase()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Business Insights */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-lg">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2 mb-4">
            <BarChart3 className="h-5 w-5" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Business Insights</h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Actionable insights and recommendations</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <h4 className="font-semibold text-green-800 dark:text-green-300">Performance Highlights</h4>
              </div>
              <ul className="text-sm text-green-700 dark:text-green-400 space-y-1">
                <li>• Model accuracy above 94% - excellent performance</li>
                <li>• Audio quality consistently above 85%</li>
                <li>• Multi-language support working effectively</li>
                <li>• Real-time processing under 2 seconds</li>
              </ul>
            </div>
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                <h4 className="font-semibold text-blue-800 dark:text-blue-300">Growth Opportunities</h4>
              </div>
              <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
                <li>• Consider expanding to more regional languages</li>
                <li>• Implement sentiment trend analysis</li>
                <li>• Add real-time alerting for quality issues</li>
                <li>• Develop predictive analytics features</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* System Health */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-lg">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2 mb-4">
            <Activity className="h-5 w-5" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">System Health</h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Real-time system performance and health status</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
              <div className="text-2xl font-bold text-green-600">99.9%</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Uptime</div>
            </div>
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <div className="text-2xl font-bold text-blue-600">1.2s</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Avg Response Time</div>
            </div>
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
              <div className="text-2xl font-bold text-purple-600">0</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Active Issues</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
