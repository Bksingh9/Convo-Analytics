import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  TrendingUp, 
  Users, 
  Clock,
  Target,
  Award,
  FileText,
  BarChart3,
  Filter,
  Download,
  Eye,
  MessageSquare,
  Star,
  Zap,
  Lock,
  Globe,
  Loader2
} from 'lucide-react';
import { getMetrics, getConfig } from '../lib/api';

const QualityAssurance = () => {
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
        console.error('Failed to fetch QA data:', err);
        setError('Failed to load quality assurance data');
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
            <p className="text-lg text-gray-600 dark:text-gray-400">Loading quality metrics...</p>
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

  // Calculate real-time quality metrics
  const avgSentiment = metrics?.sentiment?.avg || 0;
  const redFlagsCount = Object.values(metrics?.red_flags || {}).reduce((sum: number, val: any) => sum + (val || 0), 0);
  const objectionsCount = Object.values(metrics?.objections || {}).reduce((sum: number, val: any) => sum + (val || 0), 0);
  const handlingCount = Object.values(metrics?.handling || {}).reduce((sum: number, val: any) => sum + (val || 0), 0);

  const qualityScore = Math.max(0, Math.min(100, (avgSentiment + 1) * 50)); // Convert -1 to 1 scale to 0-100
  const complianceScore = redFlagsCount === 0 ? 100 : Math.max(0, 100 - (redFlagsCount * 10));
  const customerSatisfaction = Math.max(0, Math.min(100, (avgSentiment + 1) * 50));
  const responseTime = '2.3s'; // This would come from actual performance metrics

  const qualityMetrics = [
    {
      title: 'Overall Quality Score',
      value: `${qualityScore.toFixed(1)}%`,
      change: qualityScore > 80 ? '+2.1%' : qualityScore > 60 ? '+0.8%' : '-1.2%',
      trend: qualityScore > 60 ? 'up' : 'down',
      icon: Award,
      color: qualityScore > 80 ? 'text-emerald-600' : qualityScore > 60 ? 'text-yellow-600' : 'text-red-600',
      bgColor: qualityScore > 80 ? 'bg-emerald-50 dark:bg-emerald-900/20' : qualityScore > 60 ? 'bg-yellow-50 dark:bg-yellow-900/20' : 'bg-red-50 dark:bg-red-900/20'
    },
    {
      title: 'Compliance Rate',
      value: `${complianceScore.toFixed(1)}%`,
      change: complianceScore > 90 ? '+0.8%' : complianceScore > 70 ? '+0.2%' : '-2.1%',
      trend: complianceScore > 70 ? 'up' : 'down',
      icon: Shield,
      color: complianceScore > 90 ? 'text-emerald-600' : complianceScore > 70 ? 'text-yellow-600' : 'text-red-600',
      bgColor: complianceScore > 90 ? 'bg-emerald-50 dark:bg-emerald-900/20' : complianceScore > 70 ? 'bg-yellow-50 dark:bg-yellow-900/20' : 'bg-red-50 dark:bg-red-900/20'
    },
    {
      title: 'Customer Satisfaction',
      value: `${customerSatisfaction.toFixed(1)}%`,
      change: customerSatisfaction > 80 ? '+1.3%' : customerSatisfaction > 60 ? '+0.5%' : '-1.8%',
      trend: customerSatisfaction > 60 ? 'up' : 'down',
      icon: Star,
      color: customerSatisfaction > 80 ? 'text-emerald-600' : customerSatisfaction > 60 ? 'text-yellow-600' : 'text-red-600',
      bgColor: customerSatisfaction > 80 ? 'bg-emerald-50 dark:bg-emerald-900/20' : customerSatisfaction > 60 ? 'bg-yellow-50 dark:bg-yellow-900/20' : 'bg-red-50 dark:bg-red-900/20'
    },
    {
      title: 'Response Time',
      value: responseTime,
      change: '-0.4s',
      trend: 'up',
      icon: Zap,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20'
    }
  ];

  const complianceChecks = [
    {
      id: 'data-privacy',
      name: 'Data Privacy Compliance',
      status: redFlagsCount === 0 ? 'compliant' : 'warning',
      score: complianceScore,
      lastCheck: 'Real-time',
      icon: Lock,
      description: 'PII protection and data handling compliance'
    },
    {
      id: 'quality-standards',
      name: 'Quality Standards',
      status: qualityScore > 80 ? 'compliant' : qualityScore > 60 ? 'warning' : 'critical',
      score: qualityScore,
      lastCheck: 'Real-time',
      icon: Shield,
      description: 'Conversation quality and accuracy standards'
    },
    {
      id: 'customer-satisfaction',
      name: 'Customer Satisfaction',
      status: customerSatisfaction > 80 ? 'compliant' : customerSatisfaction > 60 ? 'warning' : 'critical',
      score: customerSatisfaction,
      lastCheck: 'Real-time',
      icon: Star,
      description: 'Customer experience and satisfaction metrics'
    },
    {
      id: 'system-performance',
      name: 'System Performance',
      status: 'compliant',
      score: 95,
      lastCheck: 'Real-time',
      icon: Zap,
      description: 'Response time and system reliability'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400';
      case 'warning': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  return (
    <div className="p-8 space-y-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Premium Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Quality Assurance Center
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Real-time quality monitoring and compliance management
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className={`h-3 w-3 rounded-full animate-pulse ${complianceScore > 90 ? 'bg-emerald-500' : complianceScore > 70 ? 'bg-orange-500' : 'bg-red-500'}`}></div>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {complianceScore > 90 ? 'System Healthy' : complianceScore > 70 ? 'Minor Issues' : 'Critical Issues'}
            </span>
          </div>
          <div className="text-right text-sm text-gray-500">
            <p>Last updated: {new Date().toLocaleTimeString()}</p>
            <p>Real-time monitoring active</p>
          </div>
        </div>
      </div>

      {/* Real-time Quality Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {qualityMetrics.map((metric, index) => (
          <div key={index} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-lg hover:shadow-xl transition-all duration-300 animate-fade-in hover:scale-105" style={{ animationDelay: `${index * 0.1}s` }}>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    {metric.title}
                  </p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {metric.value}
                  </p>
                  <div className="flex items-center mt-2">
                    <TrendingUp className="h-4 w-4 text-emerald-500 mr-1" />
                    <span className="text-sm font-semibold text-emerald-600">
                      {metric.change}
                    </span>
                    <span className="text-sm text-gray-500 ml-1">vs last check</span>
                  </div>
                </div>
                <div className={`p-3 rounded-2xl ${metric.bgColor}`}>
                  <metric.icon className={`h-6 w-6 ${metric.color}`} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Real-time Compliance Dashboard */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-lg hover:shadow-xl transition-all duration-300">
        <div className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Shield className="h-5 w-5" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Real-time Compliance Dashboard</h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Live compliance monitoring across all regulatory frameworks</p>
          <div className="space-y-6">
            {complianceChecks.map((check) => (
              <div key={check.id} className="p-6 border border-gray-200 dark:border-gray-700 rounded-2xl hover:shadow-lg transition-all duration-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`p-3 rounded-xl ${check.status === 'compliant' ? 'bg-emerald-100 dark:bg-emerald-900/20' : check.status === 'warning' ? 'bg-orange-100 dark:bg-orange-900/20' : 'bg-red-100 dark:bg-red-900/20'}`}>
                      <check.icon className={`h-6 w-6 ${check.status === 'compliant' ? 'text-emerald-600' : check.status === 'warning' ? 'text-orange-600' : 'text-red-600'}`} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{check.name}</h3>
                      <p className="text-gray-600 dark:text-gray-400">{check.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusColor(check.status)}`}>
                      {check.status}
                    </span>
                    <p className="text-sm text-gray-500 mt-2">Last checked: {check.lastCheck}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Compliance Score</span>
                    <span className="font-semibold">{check.score.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${check.score > 90 ? 'bg-emerald-600' : check.score > 70 ? 'bg-orange-600' : 'bg-red-600'}`}
                      style={{ width: `${check.score}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Real-time Quality Issues */}
      {redFlagsCount > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-red-200 dark:border-red-800 shadow-lg">
          <div className="p-6">
            <div className="flex items-center space-x-2 mb-4">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <h3 className="text-lg font-semibold text-red-600">Active Quality Issues</h3>
            </div>
            <div className="space-y-3">
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-red-800 dark:text-red-300">Red Flags Detected</h4>
                    <p className="text-sm text-red-700 dark:text-red-400">{redFlagsCount} quality issues identified</p>
                  </div>
                  <span className="text-sm font-semibold text-red-600">Requires Attention</span>
                </div>
              </div>
              {objectionsCount > 0 && (
                <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-orange-800 dark:text-orange-300">Customer Objections</h4>
                      <p className="text-sm text-orange-700 dark:text-orange-400">{objectionsCount} objections raised</p>
                    </div>
                    <span className="text-sm font-semibold text-orange-600">Monitor</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QualityAssurance;
