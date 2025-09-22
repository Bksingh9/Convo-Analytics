import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  MessageSquare, 
  TrendingUp, 
  Users, 
  Clock, 
  Star, 
  AlertTriangle,
  BarChart3,
  PieChart,
  Activity,
  Globe,
  Loader2,
  RefreshCw,
  Download,
  Filter,
  Search
} from 'lucide-react';
import { getMetrics, listInteractions } from '../lib/api';

interface Metrics {
  red_flags: { [key: string]: number };
  objections: { [key: string]: number };
  handling: { [key: string]: number };
  sentiment: { avg: number };
  voice_analysis: {
    total_interactions: number;
    average_quality: number;
    language_distribution: { [key: string]: number };
    speaker_role_accuracy: number;
    supported_languages: number;
  };
}

interface Conversation {
  id: string;
  store_id: string;
  user_id: string;
  started_at: string;
  ended_at?: string;
  transcript?: string;
  summary?: string;
  keywords?: string[];
  metrics?: {
    sentiment: number;
    red_flag_score: number;
    interaction_quality: number;
  };
  detected_language?: string;
  conversation_quality?: number;
  staff_performance_score?: number;
  customer_satisfaction_score?: number;
}

const Interactions = () => {
  const { t } = useTranslation();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [metricsData, conversationsData] = await Promise.all([
        getMetrics(),
        listInteractions()
      ]);
      
      console.log('Fetched metrics:', metricsData);
      console.log('Fetched conversations:', conversationsData);
      
      setMetrics(metricsData);
      
      // Handle different response formats
      if (Array.isArray(conversationsData)) {
        setConversations(conversationsData);
      } else if (conversationsData?.interactions) {
        setConversations(conversationsData.interactions);
      } else {
        setConversations([]);
      }
      
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to fetch analytics data:', err);
      setError('Failed to load analytics data. Please check if the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Refresh data every 30 seconds for real-time updates
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getSentimentColor = (sentiment: number) => {
    if (sentiment > 0.1) return 'text-green-600';
    if (sentiment < -0.1) return 'text-red-600';
    return 'text-yellow-600';
  };

  const getSentimentLabel = (sentiment: number) => {
    if (sentiment > 0.1) return 'Positive';
    if (sentiment < -0.1) return 'Negative';
    return 'Neutral';
  };

  const getLanguageName = (code: string) => {
    const names: { [key: string]: string } = {
      'hi': 'Hindi',
      'en': 'English',
      'ta': 'Tamil',
      'te': 'Telugu',
      'bn': 'Bengali',
      'gu': 'Gujarati',
    };
    return names[code] || code.toUpperCase();
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  if (loading) {
    return (
      <div className="p-8 space-y-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-lg text-gray-600 dark:text-gray-400">Loading analytics...</p>
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
              onClick={fetchData} 
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const avgSentiment = metrics?.sentiment?.avg || 0;
  const totalInteractions = metrics?.voice_analysis?.total_interactions || 0;
  const avgQuality = metrics?.voice_analysis?.average_quality || 0;
  const languageDistribution = metrics?.voice_analysis?.language_distribution || {};

  return (
    <div className="p-8 space-y-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Analytics Dashboard
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Real-time conversation analytics and insights
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Live</span>
          </div>
          <button 
            onClick={fetchData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
          <div className="text-right text-sm text-gray-500">
            <p>Last updated: {lastUpdated.toLocaleTimeString()}</p>
            <p>Real-time monitoring active</p>
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Total Conversations
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {totalInteractions}
                </p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="h-4 w-4 text-emerald-500 mr-1" />
                  <span className="text-sm font-semibold text-emerald-600">
                    +{conversations.length} today
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
                  {getSentimentLabel(avgSentiment)}
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
                  Quality Score
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {(avgQuality * 100).toFixed(1)}%
                </p>
                <div className="flex items-center mt-2">
                  <Activity className="h-4 w-4 text-blue-500 mr-1" />
                  <span className="text-sm text-gray-500">
                    Voice analysis
                  </span>
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-900/20">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Languages Supported
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {metrics?.voice_analysis?.supported_languages || 0}
                </p>
                <div className="flex items-center mt-2">
                  <Globe className="h-4 w-4 text-indigo-500 mr-1" />
                  <span className="text-sm text-gray-500">
                    Multi-language
                  </span>
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20">
                <Globe className="h-6 w-6 text-indigo-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Language Distribution */}
      {Object.keys(languageDistribution).length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-lg">
          <div className="p-6">
            <div className="flex items-center space-x-2 mb-4">
              <PieChart className="h-5 w-5" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Language Distribution</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {Object.entries(languageDistribution).map(([lang, count]) => (
                <div key={lang} className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{count}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{getLanguageName(lang)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recent Conversations */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-lg">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <MessageSquare className="h-6 w-6 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Recent Conversations ({conversations.length})
              </h3>
            </div>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2">
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
          </div>
        </div>
        
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {conversations.length === 0 ? (
            <div className="p-12 text-center">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No conversations yet</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Start recording conversations to see analytics here.
              </p>
            </div>
          ) : (
            conversations.slice(0, 10).map((conversation) => (
              <div key={conversation.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {conversation.user_id || 'Anonymous User'}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {conversation.summary || 'No summary available'}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs text-gray-500">
                          Store: {conversation.store_id}
                        </span>
                        {conversation.detected_language && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            {getLanguageName(conversation.detected_language)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <Clock className="h-4 w-4" />
                        <span>{formatTimeAgo(conversation.started_at)}</span>
                      </div>
                      {conversation.metrics?.sentiment !== undefined && (
                        <p className={`text-sm font-medium ${getSentimentColor(conversation.metrics.sentiment)}`}>
                          {getSentimentLabel(conversation.metrics.sentiment)}
                        </p>
                      )}
                    </div>
                    
                    <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Interactions;
