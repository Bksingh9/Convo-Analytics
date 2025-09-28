import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  FileAudio, 
  Mic, 
  Play, 
  Pause, 
  Square, 
  Loader2, 
  CheckCircle, 
  AlertTriangle,
  Brain,
  Zap,
  BarChart3,
  Settings
} from 'lucide-react';
import AudioRecorder from '@/components/AudioRecorder';
import RealtimeAudioProcessor from '@/components/RealtimeAudioProcessor';
import AIInsightsDashboard from '@/components/AIInsightsDashboard';

const Ingest = () => {
  const { t } = useTranslation();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [lastResult, setLastResult] = useState(null);
  const [error, setError] = useState(null);
  const [transcriptions, setTranscriptions] = useState<string[]>([]);
  const [detectedLanguages, setDetectedLanguages] = useState<string[]>([]);
  const [currentInteractionId, setCurrentInteractionId] = useState<string | null>(null);
  const [processingMode, setProcessingMode] = useState<'basic' | 'enhanced' | 'realtime'>('enhanced');
  const [aiAnalysisEnabled, setAiAnalysisEnabled] = useState(true);

  // Create new interaction
  const createInteraction = async () => {
    try {
      const response = await fetch('/api/v1/interactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          store_id: 'store1',
          user_id: 'user1',
          lang_hint: 'auto',
          enable_realtime: processingMode === 'realtime',
          enable_ai_analysis: aiAnalysisEnabled
        })
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentInteractionId(data.id);
        return data.id;
      }
    } catch (err) {
      console.error('Failed to create interaction:', err);
    }
    return null;
  };

  const handleTranscription = (text: string) => {
    setTranscriptions(prev => [...prev, text]);
    setLastResult({ transcript: text, timestamp: new Date().toISOString() });
  };

  const handleLanguageDetected = (language: string) => {
    setDetectedLanguages(prev => [...prev, language]);
  };

  const handleRealtimeTranscriptUpdate = (transcript: string) => {
    setTranscriptions(prev => [...prev, transcript]);
    setLastResult({ transcript, timestamp: new Date().toISOString() });
  };

  const handleSessionEnd = (finalResults: any) => {
    console.log('Session ended with results:', finalResults);
    setLastResult({
      transcript: finalResults.final_transcript,
      timestamp: new Date().toISOString(),
      finalResults
    });
  };

  const clearHistory = () => {
    setTranscriptions([]);
    setDetectedLanguages([]);
    setLastResult(null);
    setError(null);
    setCurrentInteractionId(null);
  };

  const uploadAudioFile = async (file: File) => {
    if (!currentInteractionId) {
      const interactionId = await createInteraction();
      if (!interactionId) {
        setError('Failed to create interaction');
        return;
      }
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('interaction_id', currentInteractionId!);
      formData.append('use_ai_analysis', aiAnalysisEnabled.toString());
      formData.append('processing_mode', processingMode);

      const response = await fetch('/api/v1/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        setLastResult(result);
        if (result.transcript) {
          setTranscriptions(prev => [...prev, result.transcript]);
        }
        if (result.detected_language) {
          setDetectedLanguages(prev => [...prev, result.detected_language]);
        }
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Upload failed');
      }
    } catch (err) {
      setError('Upload failed: ' + (err as Error).message);
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    // Create initial interaction
    createInteraction();
  }, []);

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Brain className="h-8 w-8" />
            AI-Powered Audio Ingest
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Advanced audio processing with real-time transcription, AI analysis, and quality control
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge variant="outline" className="text-sm">
            {transcriptions.length} transcriptions
          </Badge>
          <Badge variant={processingMode === 'enhanced' ? 'default' : 'secondary'} className="text-sm">
            {processingMode === 'enhanced' ? 'AI Enhanced' : processingMode === 'realtime' ? 'Real-time' : 'Basic'}
          </Badge>
          <Button onClick={clearHistory} variant="outline" size="sm">
            Clear History
          </Button>
        </div>
      </div>

      {/* Processing Mode Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Processing Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Processing Mode</label>
              <div className="flex gap-2">
                <Button
                  variant={processingMode === 'basic' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setProcessingMode('basic')}
                >
                  Basic
                </Button>
                <Button
                  variant={processingMode === 'enhanced' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setProcessingMode('enhanced')}
                >
                  <Brain className="h-4 w-4 mr-1" />
                  Enhanced
                </Button>
                <Button
                  variant={processingMode === 'realtime' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setProcessingMode('realtime')}
                >
                  <Zap className="h-4 w-4 mr-1" />
                  Real-time
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">AI Analysis</label>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="ai-analysis"
                  checked={aiAnalysisEnabled}
                  onChange={(e) => setAiAnalysisEnabled(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="ai-analysis" className="text-sm">
                  Enable AI Analysis
                </label>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Current Interaction</label>
              <div className="text-sm text-muted-foreground">
                {currentInteractionId ? (
                  <span className="font-mono">{currentInteractionId.slice(0, 8)}...</span>
                ) : (
                  <span>No active interaction</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="upload" className="space-y-4">
        <TabsList>
          <TabsTrigger value="upload">File Upload</TabsTrigger>
          <TabsTrigger value="recorder">Audio Recorder</TabsTrigger>
          {processingMode === 'realtime' && (
            <TabsTrigger value="realtime">Real-time Processing</TabsTrigger>
          )}
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Audio File
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
                <FileAudio className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-lg font-medium mb-2">Drop your audio file here</p>
                <p className="text-gray-500 mb-4">Supports WAV, MP3, M4A, WebM formats</p>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      uploadAudioFile(file);
                    }
                  }}
                  className="hidden"
                  id="audio-upload"
                />
                <Button asChild>
                  <label htmlFor="audio-upload" className="cursor-pointer">
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Choose File
                      </>
                    )}
                  </label>
                </Button>
              </div>
              
              {uploadProgress > 0 && (
                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Upload Progress</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recorder" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mic className="h-5 w-5" />
                Audio Recorder
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AudioRecorder
                onTranscription={handleTranscription}
                onLanguageDetected={handleLanguageDetected}
                processingMode={processingMode}
                aiAnalysisEnabled={aiAnalysisEnabled}
                interactionId={currentInteractionId}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {processingMode === 'realtime' && (
          <TabsContent value="realtime" className="space-y-4">
            <RealtimeAudioProcessor
              interactionId={currentInteractionId || ''}
              userId="user1"
              storeId="store1"
              languageHint="auto"
              onTranscriptUpdate={handleRealtimeTranscriptUpdate}
              onSessionEnd={handleSessionEnd}
            />
          </TabsContent>
        )}

        <TabsContent value="insights" className="space-y-4">
          <AIInsightsDashboard
            interactionId={currentInteractionId || undefined}
            autoRefresh={true}
            refreshInterval={10000}
          />
        </TabsContent>
      </Tabs>

      {/* Results Display */}
      {lastResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Latest Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {lastResult.transcript && (
                <div>
                  <h4 className="font-medium mb-2">Transcript</h4>
                  <p className="text-sm bg-gray-100 dark:bg-gray-800 p-3 rounded">
                    {lastResult.transcript}
                  </p>
                </div>
              )}
              
              {lastResult.summary && (
                <div>
                  <h4 className="font-medium mb-2">Summary</h4>
                  <p className="text-sm bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
                    {lastResult.summary}
                  </p>
                </div>
              )}
              
              {lastResult.keywords && lastResult.keywords.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Keywords</h4>
                  <div className="flex flex-wrap gap-2">
                    {lastResult.keywords.map((keyword, index) => (
                      <Badge key={index} variant="secondary">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {lastResult.metrics && (
                <div>
                  <h4 className="font-medium mb-2">Metrics</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    {Object.entries(lastResult.metrics).map(([key, value]) => (
                      <div key={key} className="bg-gray-50 dark:bg-gray-800 p-2 rounded">
                        <div className="font-medium capitalize">
                          {key.replace(/_/g, ' ')}
                        </div>
                        <div className="text-muted-foreground">
                          {typeof value === 'number' ? value.toFixed(2) : String(value)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {lastResult.insights && lastResult.insights.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">AI Insights</h4>
                  <div className="space-y-2">
                    {lastResult.insights.map((insight, index) => (
                      <div key={index} className="border-l-4 border-blue-500 pl-3 py-1">
                        <div className="font-medium text-sm">{insight.message}</div>
                        <div className="text-xs text-muted-foreground">
                          {insight.category} • Confidence: {(insight.confidence * 100).toFixed(1)}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transcription History */}
      {transcriptions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Transcription History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {transcriptions.map((transcript, index) => (
                <div key={index} className="p-3 bg-gray-50 dark:bg-gray-800 rounded">
                  <div className="text-sm text-muted-foreground mb-1">
                    #{index + 1}
                  </div>
                  <p className="text-sm">{transcript}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Ingest;
