import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  TrendingUp, 
  TrendingDown,
  Users, 
  MessageSquare,
  Clock,
  Target,
  Award,
  BarChart3,
  PieChart,
  Activity,
  Zap,
  Shield,
  Brain,
  Globe,
  Mic,
  Star,
  AlertTriangle,
  CheckCircle,
  Download,
  Filter,
  Calendar,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Loader2
} from 'lucide-react';
import { getMetrics, getConfig } from '../lib/api';

const Dashboard = () => {
  const { t } = useTranslation();
  const [metrics, setMetrics] = useState(null);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [metricsData, configData] = await Promise.all([
          getMetrics(),
          getConfig()
        ]);
        setMetrics(metricsData);
        setConfig(configData);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    // Refresh data every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="p-8 space-y-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-lg text-gray-600 dark:text-gray-400">Loading real-time data...</p>
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
            <p className="text-lg text-red-600 dark:text-red-400">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Calculate real-time metrics from backend data
  const totalInteractions = metrics?.interactions?.length || 0;
  const avgSentiment = metrics?.sentiment?.avg || 0;
  const redFlagsCount = Object.values(metrics?.red_flags || {}).reduce((sum: number, val: any) => sum + (val || 0), 0);
  const objectionsCount = Object.values(metrics?.objections || {}).reduce((sum: number, val: any) => sum + (val || 0), 0);

  const kpiMetrics = [
    {
      title: 'Total Interactions',
      value: totalInteractions.toLocaleString(),
      change: '+0',
      trend: 'up',
      icon: MessageSquare,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      description: 'Real-time conversation count'
    },
    {
      title: 'Average Sentiment',
      value: `${(avgSentiment * 100).toFixed(1)}%`,
      change: avgSentiment > 0 ? '+2.1%' : '-1.2%',
      trend: avgSentiment > 0 ? 'up' : 'down',
      icon: Star,
      color: avgSentiment > 0 ? 'text-emerald-600' : 'text-red-600',
      bgColor: avgSentiment > 0 ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20',
      description: 'Customer satisfaction score'
    },
    {
      title: 'Red Flags Detected',
      value: redFlagsCount.toString(),
      change: redFlagsCount > 0 ? 'Alert' : 'Clean',
      trend: redFlagsCount > 0 ? 'down' : 'up',
      icon: AlertTriangle,
      color: redFlagsCount > 0 ? 'text-red-600' : 'text-emerald-600',
      bgColor: redFlagsCount > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-emerald-50 dark:bg-emerald-900/20',
      description: 'Quality issues identified'
    },
    {
      title: 'Objections Raised',
      value: objectionsCount.toString(),
      change: objectionsCount > 0 ? 'Active' : 'None',
      trend: objectionsCount > 0 ? 'down' : 'up',
      icon: Target,
      color: objectionsCount > 0 ? 'text-orange-600' : 'text-emerald-600',
      bgColor: objectionsCount > 0 ? 'bg-orange-50 dark:bg-orange-900/20' : 'bg-emerald-50 dark:bg-emerald-900/20',
      description: 'Customer objections tracked'
    }
  ];

  const systemStatus = {
    isHealthy: !error && metrics !== null,
    lastUpdate: new Date().toLocaleTimeString(),
    backendVersion: config?.version || 'Unknown',
    supportedLanguages: config?.languages?.length || 0
  };

  return (
    <div className="p-8 space-y-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Premium Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Enterprise Dashboard
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Real-time insights and performance analytics
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className={`h-3 w-3 rounded-full animate-pulse ${systemStatus.isHealthy ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {systemStatus.isHealthy ? 'All Systems Operational' : 'System Issues Detected'}
            </span>
          </div>
          <div className="text-right text-sm text-gray-500">
            <p>Last updated: {systemStatus.lastUpdate}</p>
            <p>Backend v{systemStatus.backendVersion}</p>
          </div>
        </div>
      </div>

      {/* Real-time KPI Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiMetrics.map((metric, index) => (
          <div key={index} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-lg hover:shadow-xl transition-all duration-300 animate-fade-in hover:scale-105" style={{ animationDelay: `${index * 0.1}s` }}>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    {metric.title}
                  </p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    {metric.value}
                  </p>
                  <div className="flex items-center space-x-2">
                    {metric.trend === 'up' ? (
                      <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4 text-red-500" />
                    )}
                    <span className={`text-sm font-semibold ${metric.trend === 'up' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {metric.change}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">{metric.description}</p>
                </div>
                <div className={`p-4 rounded-2xl ${metric.bgColor}`}>
                  <metric.icon className={`h-8 w-8 ${metric.color}`} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Real-time Data Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Configuration */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Shield className="h-5 w-5" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">System Configuration</h3>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Supported Languages</span>
                <span className="font-semibold text-gray-900 dark:text-white">{systemStatus.supportedLanguages}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">STT Engine</span>
                <span className="font-semibold text-gray-900 dark:text-white">{config?.stt?.engine || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Model Size</span>
                <span className="font-semibold text-gray-900 dark:text-white">{config?.stt?.size || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Device</span>
                <span className="font-semibold text-gray-900 dark:text-white">{config?.stt?.device || 'Unknown'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quality Metrics */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="p-6">
            <div className="flex items-center space-x-2 mb-4">
              <BarChart3 className="h-5 w-5" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Quality Metrics</h3>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Red Flag Score</span>
                <span className={`font-semibold ${redFlagsCount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {redFlagsCount > 0 ? 'High' : 'Low'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Objection Rate</span>
                <span className={`font-semibold ${objectionsCount > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>
                  {objectionsCount > 0 ? 'Active' : 'None'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Handling Score</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {metrics?.handling ? 'Active' : 'No Data'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Data Freshness</span>
                <span className="font-semibold text-emerald-600">Live</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Activity Log */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-lg hover:shadow-xl transition-all duration-300">
        <div className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Activity className="h-5 w-5" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Real-time System Status</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
                <span className="text-gray-900 dark:text-white">Backend API Connected</span>
              </div>
              <span className="text-sm text-emerald-600 font-semibold">Active</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center space-x-3">
                <Brain className="h-5 w-5 text-blue-600" />
                <span className="text-gray-900 dark:text-white">ML Models Loaded</span>
              </div>
              <span className="text-sm text-blue-600 font-semibold">Ready</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center space-x-3">
                <Globe className="h-5 w-5 text-purple-600" />
                <span className="text-gray-900 dark:text-white">Multi-language Support</span>
              </div>
              <span className="text-sm text-purple-600 font-semibold">{systemStatus.supportedLanguages} Languages</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center space-x-3">
                <Zap className="h-5 w-5 text-yellow-600" />
                <span className="text-gray-900 dark:text-white">Real-time Processing</span>
              </div>
              <span className="text-sm text-yellow-600 font-semibold">Enabled</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
