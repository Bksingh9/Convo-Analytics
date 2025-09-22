import React from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquare, Clock, User, Star } from 'lucide-react';

const Conversations = () => {
  const { t } = useTranslation();

  const conversations = [
    {
      id: '1',
      customer: 'Rajesh Kumar',
      timestamp: '2 hours ago',
      duration: '5:32',
      sentiment: 'positive',
      language: 'Hindi',
      summary: 'Customer inquiry about product availability'
    },
    {
      id: '2',
      customer: 'Priya Sharma',
      timestamp: '4 hours ago',
      duration: '3:15',
      sentiment: 'neutral',
      language: 'English',
      summary: 'Technical support request for mobile app'
    },
    {
      id: '3',
      customer: 'Amit Patel',
      timestamp: '6 hours ago',
      duration: '7:45',
      sentiment: 'negative',
      language: 'Gujarati',
      summary: 'Complaint about delivery delay'
    }
  ];

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'negative': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
    }
  };

  return (
    <div className="p-8 space-y-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
          Conversations
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          View and analyze customer conversations
        </p>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-lg">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <MessageSquare className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Conversations</h3>
          </div>
        </div>
        
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {conversations.map((conversation) => (
            <div key={conversation.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">{conversation.customer}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{conversation.summary}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <Clock className="h-4 w-4" />
                      <span>{conversation.duration}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{conversation.timestamp}</p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{conversation.language}</span>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getSentimentColor(conversation.sentiment)}`}>
                      {conversation.sentiment}
                    </span>
                  </div>
                  
                  <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                    View Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Conversations;
