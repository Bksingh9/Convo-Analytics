import React from "react";
import { useTranslation } from "react-i18next";

interface ConversationMapperProps {
  conversationFlow: {
    total_lines: number;
    customer_lines: number;
    staff_lines: number;
    customer_ratio: number;
    staff_ratio: number;
  };
  transcript: string;
  translations: Record<string, string>;
  currentLanguage: string;
}

export default function ConversationMapper({ 
  conversationFlow, 
  transcript, 
  translations, 
  currentLanguage 
}: ConversationMapperProps) {
  const { t } = useTranslation();

  const getSpeakerType = (line: string): 'customer' | 'staff' | 'unknown' => {
    const lineLower = line.toLowerCase();
    
    const customerIndicators = [
      'i want', 'i need', 'my order', 'refund', 'return', 'problem', 'issue',
      'complaint', 'dissatisfied', 'wrong', 'damaged', 'missing', 'can you help',
      'i have a question', 'i am calling about'
    ];
    
    const staffIndicators = [
      'i understand', 'let me help', 'i can help', 'we can', 'our policy',
      'i apologize', 'thank you', 'is there anything else', 'how can i assist',
      'let me check', 'i will help you'
    ];
    
    if (customerIndicators.some(indicator => lineLower.includes(indicator))) {
      return 'customer';
    } else if (staffIndicators.some(indicator => lineLower.includes(indicator))) {
      return 'staff';
    }
    
    return 'unknown';
  };

  const parseConversation = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim());
    return lines.map((line, index) => ({
      id: index,
      text: line.trim(),
      speaker: getSpeakerType(line),
      timestamp: index * 5 // Approximate timestamp
    }));
  };

  const conversation = parseConversation(transcript);
  const translatedText = translations[currentLanguage] || transcript;

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4">🗣️ Conversation Mapping</h3>
      
      {/* Conversation Flow Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{conversationFlow.total_lines}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Lines</div>
        </div>
        <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{conversationFlow.customer_lines}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Customer Lines</div>
        </div>
        <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">{conversationFlow.staff_lines}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Staff Lines</div>
        </div>
        <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
          <div className="text-2xl font-bold text-orange-600">
            {(conversationFlow.customer_ratio * 100).toFixed(1)}%
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Customer Ratio</div>
        </div>
      </div>

      {/* Language Toggle */}
      <div className="mb-4">
        <div className="flex gap-2 mb-2">
          <button className="px-3 py-1 rounded bg-primary text-white text-sm">
            Original
          </button>
          {Object.keys(translations).map(lang => (
            <button key={lang} className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 text-sm">
              {lang === 'hi' ? 'हिंदी' : lang.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Conversation Timeline */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {conversation.map((line, index) => (
          <div key={line.id} className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
              ${line.speaker === 'customer' ? 'bg-green-500 text-white' : 
                line.speaker === 'staff' ? 'bg-blue-500 text-white' : 
                'bg-gray-500 text-white'}">
              {line.speaker === 'customer' ? 'C' : line.speaker === 'staff' ? 'S' : '?'}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium">
                  {line.speaker === 'customer' ? '👤 Customer' : 
                   line.speaker === 'staff' ? '��‍💼 Staff' : '❓ Unknown'}
                </span>
                <span className="text-xs text-gray-500">
                  {Math.floor(line.timestamp / 60)}:{(line.timestamp % 60).toString().padStart(2, '0')}
                </span>
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-2 rounded">
                {line.text}
              </div>
              {currentLanguage !== 'en' && translations[currentLanguage] && (
                <div className="text-xs text-gray-500 mt-1 italic">
                  {translations[currentLanguage].split('\n')[index] || ''}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Conversation Analysis */}
      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <h4 className="font-semibold mb-2">📊 Analysis</h4>
        <div className="text-sm space-y-1">
          <div>
            <strong>Customer Engagement:</strong> {
              conversationFlow.customer_ratio > 0.6 ? 'High' : 
              conversationFlow.customer_ratio > 0.4 ? 'Medium' : 'Low'
            } ({(conversationFlow.customer_ratio * 100).toFixed(1)}%)
          </div>
          <div>
            <strong>Staff Response:</strong> {
              conversationFlow.staff_ratio > 0.4 ? 'Good' : 
              conversationFlow.staff_ratio > 0.2 ? 'Adequate' : 'Needs Improvement'
            } ({(conversationFlow.staff_ratio * 100).toFixed(1)}%)
          </div>
          <div>
            <strong>Conversation Balance:</strong> {
              Math.abs(conversationFlow.customer_ratio - conversationFlow.staff_ratio) < 0.2 ? 
              'Well Balanced' : 'Imbalanced'
            }
          </div>
        </div>
      </div>
    </div>
  );
}
