import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  MessageSquare, 
  Brain, 
  Target,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3
} from 'lucide-react';

interface AIInsight {
  type: string;
  category: string;
  message: string;
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  action_required: boolean;
  keywords: string[];
  details: Record<string, any>;
  timestamp: string;
}

interface ConversationMetrics {
  overall_sentiment: number;
  customer_satisfaction: number;
  staff_performance: number;
  conversation_quality: number;
  resolution_indicators: Record<string, boolean>;
  escalation_risk: number;
  compliance_score: number;
  insights: AIInsight[];
  speaker_profiles: any[];
}

interface AIInsightsDashboardProps {
  interactionId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const AIInsightsDashboard: React.FC<AIInsightsDashboardProps> = ({
  interactionId,
  autoRefresh = true,
  refreshInterval = 30000
}) => {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [metrics, setMetrics] = useState<ConversationMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchAIInsights = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/v1/analytics/ai-insights');
      if (!response.ok) {
        throw new Error('Failed to fetch AI insights');
      }

      const data = await response.json();
      setInsights(data.insights || []);
      setMetrics(data.metrics || null);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch insights');
    } finally {
      setLoading(false);
    }
  };

  const fetchInteractionInsights = async () => {
    if (!interactionId) return;

    try {
      const response = await fetch(`/api/v1/interactions/${interactionId}`);
      if (response.ok) {
        const data = await response.json();
        setInsights(data.insights || []);
        setMetrics(data.ai_analysis || null);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Failed to fetch interaction insights:', err);
    }
  };

  useEffect(() => {
    if (interactionId) {
      fetchInteractionInsights();
    } else {
      fetchAIInsights();
    }
  }, [interactionId]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        if (interactionId) {
          fetchInteractionInsights();
        } else {
          fetchAIInsights();
        }
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, interactionId]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="h-4 w-4" />;
      case 'high': return <AlertTriangle className="h-4 w-4" />;
      case 'medium': return <Clock className="h-4 w-4" />;
      case 'low': return <CheckCircle className="h-4 w-4" />;
      default: return <CheckCircle className="h-4 w-4" />;
    }
  };

  const formatConfidence = (confidence: number) => {
    return `${(confidence * 100).toFixed(1)}%`;
  };

  const formatSentiment = (sentiment: number) => {
    if (sentiment > 0.2) return { label: 'Positive', color: 'text-green-600' };
    if (sentiment < -0.2) return { label: 'Negative', color: 'text-red-600' };
    return { label: 'Neutral', color: 'text-gray-600' };
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
            <span className="ml-2">Loading AI insights...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Brain className="h-6 w-6" />
          AI Insights Dashboard
        </h2>
        {lastUpdated && (
          <span className="text-sm text-muted-foreground">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </span>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="speakers">Speakers</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Overall Sentiment</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {metrics && (
                  <>
                    <div className={`text-2xl font-bold ${formatSentiment(metrics.overall_sentiment).color}`}>
                      {formatSentiment(metrics.overall_sentiment).label}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Score: {metrics.overall_sentiment.toFixed(2)}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Customer Satisfaction</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {metrics && (
                  <>
                    <div className="text-2xl font-bold">
                      {(metrics.customer_satisfaction * 100).toFixed(1)}%
                    </div>
                    <Progress value={metrics.customer_satisfaction * 100} className="mt-2" />
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Staff Performance</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {metrics && (
                  <>
                    <div className="text-2xl font-bold">
                      {(metrics.staff_performance * 100).toFixed(1)}%
                    </div>
                    <Progress value={metrics.staff_performance * 100} className="mt-2" />
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Escalation Risk</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {metrics && (
                  <>
                    <div className={`text-2xl font-bold ${metrics.escalation_risk > 0.7 ? 'text-red-600' : metrics.escalation_risk > 0.4 ? 'text-yellow-600' : 'text-green-600'}`}>
                      {(metrics.escalation_risk * 100).toFixed(1)}%
                    </div>
                    <Progress value={metrics.escalation_risk * 100} className="mt-2" />
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {metrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Resolution Indicators</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(metrics.resolution_indicators).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-sm capitalize">
                          {key.replace(/_/g, ' ')}
                        </span>
                        <Badge variant={value ? "default" : "secondary"}>
                          {value ? "Yes" : "No"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quality Scores</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Conversation Quality</span>
                        <span>{(metrics.conversation_quality * 100).toFixed(1)}%</span>
                      </div>
                      <Progress value={metrics.conversation_quality * 100} />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Compliance Score</span>
                        <span>{(metrics.compliance_score * 100).toFixed(1)}%</span>
                      </div>
                      <Progress value={metrics.compliance_score * 100} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                AI-Generated Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              {insights.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No insights available
                </p>
              ) : (
                <div className="space-y-4">
                  {insights.map((insight, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getSeverityIcon(insight.severity)}
                          <h4 className="font-medium">{insight.message}</h4>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant={getSeverityColor(insight.severity)}>
                            {insight.severity}
                          </Badge>
                          {insight.action_required && (
                            <Badge variant="outline">Action Required</Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-sm text-muted-foreground mb-2">
                        {insight.category} • Confidence: {formatConfidence(insight.confidence)}
                      </div>
                      
                      {insight.keywords.length > 0 && (
                        <div className="mb-2">
                          <span className="text-sm font-medium">Keywords: </span>
                          {insight.keywords.map((keyword, i) => (
                            <Badge key={i} variant="secondary" className="text-xs mr-1">
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      )}
                      
                      {Object.keys(insight.details).length > 0 && (
                        <details className="text-sm">
                          <summary className="cursor-pointer text-muted-foreground">
                            View Details
                          </summary>
                          <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                            {JSON.stringify(insight.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Detailed Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              {metrics ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">Sentiment Analysis</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">Overall Sentiment</span>
                          <span className="text-sm font-medium">
                            {metrics.overall_sentiment.toFixed(3)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Customer Satisfaction</span>
                          <span className="text-sm font-medium">
                            {(metrics.customer_satisfaction * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Performance Metrics</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">Staff Performance</span>
                          <span className="text-sm font-medium">
                            {(metrics.staff_performance * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Conversation Quality</span>
                          <span className="text-sm font-medium">
                            {(metrics.conversation_quality * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  No metrics available
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="speakers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Speaker Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              {metrics && metrics.speaker_profiles.length > 0 ? (
                <div className="space-y-4">
                  {metrics.speaker_profiles.map((speaker, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">
                          {speaker.speaker_id} ({speaker.role})
                        </h4>
                        <Badge variant="outline">
                          Confidence: {formatConfidence(speaker.confidence)}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Speaking Time: </span>
                          <span className="font-medium">
                            {speaker.speaking_patterns?.turn_count || 0} turns
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Avg Turn Length: </span>
                          <span className="font-medium">
                            {speaker.speaking_patterns?.avg_turn_length?.toFixed(1) || 0} words
                          </span>
                        </div>
                      </div>
                      
                      {speaker.sentiment_trend && speaker.sentiment_trend.length > 0 && (
                        <div className="mt-2">
                          <span className="text-sm text-muted-foreground">Sentiment Trend: </span>
                          <div className="flex gap-1 mt-1">
                            {speaker.sentiment_trend.map((sentiment, i) => (
                              <div
                                key={i}
                                className={`h-2 w-4 rounded ${
                                  sentiment > 0.1 ? 'bg-green-500' :
                                  sentiment < -0.1 ? 'bg-red-500' : 'bg-gray-400'
                                }`}
                                title={`${sentiment.toFixed(2)}`}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  No speaker analysis available
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AIInsightsDashboard;
