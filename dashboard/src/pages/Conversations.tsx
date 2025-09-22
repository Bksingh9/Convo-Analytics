import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquare, Clock, User, Star, Loader2, AlertTriangle, Eye, Download, Filter, Search } from 'lucide-react';
import { listInteractions, getMetrics } from '../lib/api';

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

const Conversations = () => {
  const { t } = useTranslation();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('all');
  const [selectedSentiment, setSelectedSentiment] = useState('all');

  const fetchConversations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get all interactions from the backend
      const response = await listInteractions();
      console.log('Fetched conversations:', response);
      
      if (response && Array.isArray(response)) {
        setConversations(response);
      } else {
        // If response is not an array, try to extract from response object
        const interactions = response?.interactions || response?.data || [];
        setConversations(interactions);
      }
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
      setError('Failed to load conversations. Please check if the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
    
    // Refresh data every 30 seconds for real-time updates
    const interval = setInterval(fetchConversations, 30000);
    return () => clearInterval(interval);
  }, []);

  const getSentimentColor = (sentiment: number) => {
    if (sentiment > 0.1) return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
    if (sentiment < -0.1) return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
    return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
  };

  const getSentimentLabel = (sentiment: number) => {
    if (sentiment > 0.1) return 'Positive';
    if (sentiment < -0.1) return 'Negative';
    return 'Neutral';
  };

  const getLanguageColor = (language: string) => {
    const colors: { [key: string]: string } = {
      'hi': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      'en': 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
      'ta': 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
      'te': 'bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-400',
      'bn': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400',
      'gu': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    };
    return colors[language] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
  };

  const getLanguageName = (language: string) => {
    const names: { [key: string]: string } = {
      'hi': 'Hindi',
      'en': 'English',
      'ta': 'Tamil',
      'te': 'Telugu',
      'bn': 'Bengali',
      'gu': 'Gujarati',
    };
    return names[language] || language.toUpperCase();
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`;
    return `${Math.floor(diffInMinutes / 1440)} days ago`;
  };

  const formatDuration = (started: string, ended?: string) => {
    if (!ended) return 'In progress';
    const start = new Date(started);
    const end = new Date(ended);
    const diffInSeconds = Math.floor((end.getTime() - start.getTime()) / 1000);
    const minutes = Math.floor(diffInSeconds / 60);
    const seconds = diffInSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Filter conversations based on search and filters
  const filteredConversations = conversations.filter(conversation => {
    const matchesSearch = !searchTerm || 
      conversation.summary?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conversation.user_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conversation.store_id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesLanguage = selectedLanguage === 'all' || 
      conversation.detected_language === selectedLanguage;
    
    const matchesSentiment = selectedSentiment === 'all' || 
      (selectedSentiment === 'positive' && (conversation.metrics?.sentiment || 0) > 0.1) ||
      (selectedSentiment === 'negative' && (conversation.metrics?.sentiment || 0) < -0.1) ||
      (selectedSentiment === 'neutral' && (conversation.metrics?.sentiment || 0) >= -0.1 && (conversation.metrics?.sentiment || 0) <= 0.1);
    
    return matchesSearch && matchesLanguage && matchesSentiment;
  });

  if (loading) {
    return (
      <div className="p-8 space-y-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-lg text-gray-600 dark:text-gray-400">Loading conversations...</p>
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
              onClick={fetchConversations} 
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Conversations
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            View and analyze customer conversations in real-time
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-right text-sm text-gray-500">
            <p>Last updated: {new Date().toLocaleTimeString()}</p>
            <p>Real-time monitoring active</p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-lg p-6">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
            />
          </div>
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
          >
            <option value="all">All Languages</option>
            <option value="hi">Hindi</option>
            <option value="en">English</option>
            <option value="ta">Tamil</option>
            <option value="te">Telugu</option>
            <option value="bn">Bengali</option>
            <option value="gu">Gujarati</option>
          </select>
          <select
            value={selectedSentiment}
            onChange={(e) => setSelectedSentiment(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
          >
            <option value="all">All Sentiments</option>
            <option value="positive">Positive</option>
            <option value="neutral">Neutral</option>
            <option value="negative">Negative</option>
          </select>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2">
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Conversations List */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-lg">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <MessageSquare className="h-6 w-6 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Recent Conversations ({filteredConversations.length})
              </h3>
            </div>
            <div className="flex items-center space-x-2">
              <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Live</span>
            </div>
          </div>
        </div>
        
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {filteredConversations.length === 0 ? (
            <div className="p-12 text-center">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No conversations found</h3>
              <p className="text-gray-600 dark:text-gray-400">
                {conversations.length === 0 
                  ? "No conversations have been recorded yet. Start by uploading some audio files."
                  : "Try adjusting your search or filter criteria."
                }
              </p>
            </div>
          ) : (
            filteredConversations.map((conversation) => (
              <div key={conversation.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-blue-600" />
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
                        {conversation.metrics?.red_flag_score && conversation.metrics.red_flag_score > 0 && (
                          <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                            🔴 Red Flag
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <Clock className="h-4 w-4" />
                        <span>{formatDuration(conversation.started_at, conversation.ended_at)}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatTimeAgo(conversation.started_at)}
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {conversation.detected_language && (
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getLanguageColor(conversation.detected_language)}`}>
                          {getLanguageName(conversation.detected_language)}
                        </span>
                      )}
                      {conversation.metrics?.sentiment !== undefined && (
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getSentimentColor(conversation.metrics.sentiment)}`}>
                          {getSentimentLabel(conversation.metrics.sentiment)}
                        </span>
                      )}
                    </div>
                    
                    <button className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center space-x-1">
                      <Eye className="h-4 w-4" />
                      <span>View Details</span>
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

export default Conversations;
