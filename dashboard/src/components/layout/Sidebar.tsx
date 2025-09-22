import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  BarChart3, 
  Mic, 
  TrendingUp, 
  MessageSquare, 
  Shield,
  GraduationCap,
  Settings,
  Home,
  Brain,
  Activity,
  Users,
  FileText,
  Zap,
  Target,
  Award,
  Database,
  Globe,
  Lock,
  Bell
} from "lucide-react";

interface SidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

const navigation = [
  { 
    id: 'dashboard', 
    icon: Home, 
    translationKey: 'nav.dashboard',
    badge: null,
    category: 'main'
  },
  { 
    id: 'ingest', 
    icon: Mic, 
    translationKey: 'nav.ingest',
    badge: 'New',
    category: 'main'
  },
  { 
    id: 'analytics', 
    icon: BarChart3, 
    translationKey: 'nav.analytics',
    badge: null,
    category: 'main'
  },
  { 
    id: 'interactions', 
    icon: MessageSquare, 
    translationKey: 'nav.interactions',
    badge: null,
    category: 'main'
  },
  { 
    id: 'quality-assurance', 
    icon: Shield, 
    translationKey: 'nav.quality_assurance',
    badge: 'Pro',
    category: 'enterprise'
  },
  { 
    id: 'model-training', 
    icon: GraduationCap, 
    translationKey: 'nav.model_training',
    badge: 'AI',
    category: 'enterprise'
  },
  { 
    id: 'compliance', 
    icon: Lock, 
    translationKey: 'nav.compliance',
    badge: 'Enterprise',
    category: 'enterprise'
  },
  { 
    id: 'reports', 
    icon: FileText, 
    translationKey: 'nav.reports',
    badge: null,
    category: 'business'
  },
  { 
    id: 'insights', 
    icon: Brain, 
    translationKey: 'nav.insights',
    badge: 'AI',
    category: 'business'
  },
  { 
    id: 'alerts', 
    icon: Bell, 
    translationKey: 'nav.alerts',
    badge: null,
    category: 'business'
  }
];

const enterpriseFeatures = [
  { 
    id: 'users', 
    icon: Users, 
    translationKey: 'nav.user_management',
    category: 'admin'
  },
  { 
    id: 'integrations', 
    icon: Zap, 
    translationKey: 'nav.integrations',
    category: 'admin'
  },
  { 
    id: 'performance', 
    icon: Target, 
    translationKey: 'nav.performance',
    category: 'admin'
  },
  { 
    id: 'billing', 
    icon: Award, 
    translationKey: 'nav.billing',
    category: 'admin'
  }
];

export function Sidebar({ currentPage, onPageChange }: SidebarProps) {
  const { t } = useTranslation();

  const getBadgeColor = (badge: string) => {
    switch (badge) {
      case 'New': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400';
      case 'Pro': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'AI': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      case 'Enterprise': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  return (
    <div className="flex h-full w-72 flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
      {/* Premium Logo/Brand */}
      <div className="flex h-20 items-center px-6 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-purple-600 to-blue-800 shadow-lg">
              <Brain className="h-6 w-6 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 h-4 w-4 bg-emerald-500 rounded-full border-2 border-white dark:border-gray-900"></div>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">FYND Analytics</h1>
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Enterprise Intelligence</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 px-4 py-6 overflow-y-auto">
        <div className="space-y-6">
          {/* Main Navigation */}
          <div>
            <h3 className="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              {t('nav.main')}
            </h3>
            <div className="space-y-1">
              {navigation.filter(item => item.category === 'main').map((item) => (
                <button
                  key={item.id}
                  className={`w-full flex items-center h-12 px-4 text-sm font-medium transition-all duration-200 rounded-xl ${
                    currentPage === item.id 
                      ? "bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700 shadow-sm" 
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
                  }`}
                  onClick={() => onPageChange(item.id)}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  <span className="flex-1 text-left">{t(item.translationKey)}</span>
                  {item.badge && (
                    <span className={`ml-2 text-xs px-2 py-1 rounded-full ${getBadgeColor(item.badge)}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 my-6"></div>

          {/* Enterprise Features */}
          <div>
            <h3 className="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              {t('nav.enterprise')}
            </h3>
            <div className="space-y-1">
              {navigation.filter(item => item.category === 'enterprise').map((item) => (
                <button
                  key={item.id}
                  className={`w-full flex items-center h-12 px-4 text-sm font-medium transition-all duration-200 rounded-xl ${
                    currentPage === item.id 
                      ? "bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700 shadow-sm" 
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
                  }`}
                  onClick={() => onPageChange(item.id)}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  <span className="flex-1 text-left">{t(item.translationKey)}</span>
                  {item.badge && (
                    <span className={`ml-2 text-xs px-2 py-1 rounded-full ${getBadgeColor(item.badge)}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 my-6"></div>

          {/* Business Intelligence */}
          <div>
            <h3 className="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              {t('nav.business_intelligence')}
            </h3>
            <div className="space-y-1">
              {navigation.filter(item => item.category === 'business').map((item) => (
                <button
                  key={item.id}
                  className={`w-full flex items-center h-12 px-4 text-sm font-medium transition-all duration-200 rounded-xl ${
                    currentPage === item.id 
                      ? "bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700 shadow-sm" 
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
                  }`}
                  onClick={() => onPageChange(item.id)}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  <span className="flex-1 text-left">{t(item.translationKey)}</span>
                  {item.badge && (
                    <span className={`ml-2 text-xs px-2 py-1 rounded-full ${getBadgeColor(item.badge)}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 my-6"></div>

          {/* Admin Features */}
          <div>
            <h3 className="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              {t('nav.administration')}
            </h3>
            <div className="space-y-1">
              {enterpriseFeatures.map((item) => (
                <button
                  key={item.id}
                  className={`w-full flex items-center h-12 px-4 text-sm font-medium transition-all duration-200 rounded-xl ${
                    currentPage === item.id 
                      ? "bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-700 shadow-sm" 
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
                  }`}
                  onClick={() => onPageChange(item.id)}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  <span className="flex-1 text-left">{t(item.translationKey)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Premium Footer */}
      <div className="border-t border-gray-200 dark:border-gray-800 p-4">
        <div className="flex items-center justify-between">
          <button
            className="w-full flex items-center h-12 px-4 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all duration-200"
            onClick={() => onPageChange('settings')}
          >
            <Settings className="mr-3 h-5 w-5" />
            {t('nav.settings')}
          </button>
        </div>
        
        {/* Enterprise Status */}
        <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl border border-blue-200 dark:border-blue-700">
          <div className="flex items-center space-x-2">
            <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">Enterprise Active</span>
          </div>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">All features unlocked</p>
        </div>
      </div>
    </div>
  );
}
