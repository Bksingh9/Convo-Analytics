import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';
import { Mic, MicOff, Play, Pause, Square, Wifi, WifiOff } from 'lucide-react';

interface RealtimeSession {
  session_id: string;
  interaction_id: string;
  is_active: boolean;
  started_at: string;
  last_activity: string;
  audio_buffer_size: number;
  transcript_buffer_size: number;
  quality_metrics: {
    avg_confidence: number;
    total_chunks: number;
    avg_processing_time: number;
    total_words: number;
  };
}

interface TranscriptChunk {
  transcript: string;
  confidence: number;
  timestamp: string;
  is_partial: boolean;
  sentiment?: {
    score: number;
    category: string;
  };
  keywords?: string[];
}

interface RealtimeAudioProcessorProps {
  interactionId: string;
  userId: string;
  storeId: string;
  languageHint?: string;
  onTranscriptUpdate?: (transcript: string) => void;
  onSessionEnd?: (finalResults: any) => void;
}

export const RealtimeAudioProcessor: React.FC<RealtimeAudioProcessorProps> = ({
  interactionId,
  userId,
  storeId,
  languageHint = 'auto',
  onTranscriptUpdate,
  onSessionEnd
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [session, setSession] = useState<RealtimeSession | null>(null);
  const [transcript, setTranscript] = useState<TranscriptChunk[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<'idle' | 'processing' | 'error'>('idle');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const websocketRef = useRef<WebSocket | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Initialize real-time session
  const initializeSession = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/realtime/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          interaction_id: interactionId,
          user_id: userId,
          store_id: storeId,
          language_hint: languageHint
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create session');
      }

      const data = await response.json();
      sessionIdRef.current = data.session_id;
      
      // Connect WebSocket
      const wsUrl = `ws://localhost:8000/v1/realtime/ws/${data.session_id}`;
      websocketRef.current = new WebSocket(wsUrl);
      
      websocketRef.current.onopen = () => {
        setIsConnected(true);
        setError(null);
      };
      
      websocketRef.current.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'transcript_update') {
          handleTranscriptUpdate(message.data);
        }
      };
      
      websocketRef.current.onclose = () => {
        setIsConnected(false);
      };
      
      websocketRef.current.onerror = (error) => {
        setError('WebSocket connection error');
        setIsConnected(false);
      };

      // Get session status
      await updateSessionStatus(data.session_id);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize session');
    }
  }, [interactionId, userId, storeId, languageHint]);

  // Update session status
  const updateSessionStatus = useCallback(async (sessionId: string) => {
    try {
      const response = await fetch(`/api/v1/realtime/sessions/${sessionId}/status`);
      if (response.ok) {
        const status = await response.json();
        setSession(status);
      }
    } catch (err) {
      console.error('Failed to update session status:', err);
    }
  }, []);

  // Handle transcript updates
  const handleTranscriptUpdate = useCallback((data: TranscriptChunk) => {
    setTranscript(prev => [...prev, data]);
    setCurrentTranscript(data.transcript);
    
    if (onTranscriptUpdate) {
      onTranscriptUpdate(data.transcript);
    }
  }, [onTranscriptUpdate]);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        } 
      });
      
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          
          // Send audio chunk to server
          if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
            const reader = new FileReader();
            reader.onload = () => {
              const base64Data = (reader.result as string).split(',')[1];
              websocketRef.current?.send(JSON.stringify({
                type: 'audio_chunk',
                data: base64Data,
                timestamp: Date.now()
              }));
            };
            reader.readAsDataURL(event.data);
          }
        }
      };
      
      mediaRecorder.start(500); // Send chunks every 500ms
      setIsRecording(true);
      setProcessingStatus('processing');
      
    } catch (err) {
      setError('Failed to start recording. Please check microphone permissions.');
      setProcessingStatus('error');
    }
  }, []);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setProcessingStatus('idle');
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, [isRecording]);

  // End session
  const endSession = useCallback(async () => {
    if (sessionIdRef.current) {
      try {
        const response = await fetch(`/api/v1/realtime/sessions/${sessionIdRef.current}/end`, {
          method: 'POST'
        });
        
        if (response.ok) {
          const finalResults = await response.json();
          if (onSessionEnd) {
            onSessionEnd(finalResults);
          }
        }
      } catch (err) {
        setError('Failed to end session');
      }
    }
    
    // Close WebSocket
    if (websocketRef.current) {
      websocketRef.current.close();
      websocketRef.current = null;
    }
    
    setIsConnected(false);
    setSession(null);
  }, [onSessionEnd]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isRecording) {
        stopRecording();
      }
      if (websocketRef.current) {
        websocketRef.current.close();
      }
    };
  }, [isRecording, stopRecording]);

  // Update session status periodically
  useEffect(() => {
    if (sessionIdRef.current && isConnected) {
      const interval = setInterval(() => {
        updateSessionStatus(sessionIdRef.current!);
      }, 2000);
      
      return () => clearInterval(interval);
    }
  }, [isConnected, updateSessionStatus]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Real-time Audio Processing
            <Badge variant={isConnected ? "default" : "secondary"}>
              {isConnected ? (
                <>
                  <Wifi className="h-3 w-3 mr-1" />
                  Connected
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3 mr-1" />
                  Disconnected
                </>
              )}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="flex gap-2">
            {!session && (
              <Button onClick={initializeSession} disabled={isConnected}>
                Initialize Session
              </Button>
            )}
            
            {session && !isRecording && (
              <Button onClick={startRecording} disabled={!isConnected}>
                <Mic className="h-4 w-4 mr-2" />
                Start Recording
              </Button>
            )}
            
            {isRecording && (
              <Button onClick={stopRecording} variant="destructive">
                <MicOff className="h-4 w-4 mr-2" />
                Stop Recording
              </Button>
            )}
            
            {session && (
              <Button onClick={endSession} variant="outline">
                <Square className="h-4 w-4 mr-2" />
                End Session
              </Button>
            )}
          </div>
          
          {session && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Session Status</h4>
                <div className="space-y-1 text-sm">
                  <div>Session ID: {session.session_id.slice(0, 8)}...</div>
                  <div>Status: {session.is_active ? 'Active' : 'Inactive'}</div>
                  <div>Audio Buffer: {session.audio_buffer_size} chunks</div>
                  <div>Transcript Buffer: {session.transcript_buffer_size} chunks</div>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium mb-2">Quality Metrics</h4>
                <div className="space-y-1 text-sm">
                  <div>Avg Confidence: {(session.quality_metrics.avg_confidence * 100).toFixed(1)}%</div>
                  <div>Total Chunks: {session.quality_metrics.total_chunks}</div>
                  <div>Total Words: {session.quality_metrics.total_words}</div>
                  <div>Processing Time: {session.quality_metrics.avg_processing_time.toFixed(2)}s</div>
                </div>
              </div>
            </div>
          )}
          
          {processingStatus === 'processing' && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                <span className="text-sm">Processing audio...</span>
              </div>
              <Progress value={50} className="w-full" />
            </div>
          )}
        </CardContent>
      </Card>
      
      {transcript.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Live Transcript</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {transcript.map((chunk, index) => (
                <div key={index} className="p-2 border rounded">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-sm text-muted-foreground">
                      {new Date(chunk.timestamp).toLocaleTimeString()}
                    </span>
                    <Badge variant={chunk.is_partial ? "secondary" : "default"}>
                      {chunk.is_partial ? "Partial" : "Final"}
                    </Badge>
                  </div>
                  <p className="text-sm">{chunk.transcript}</p>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      Confidence: {(chunk.confidence * 100).toFixed(1)}%
                    </Badge>
                    {chunk.sentiment && (
                      <Badge variant="outline" className="text-xs">
                        Sentiment: {chunk.sentiment.category}
                      </Badge>
                    )}
                  </div>
                  {chunk.keywords && chunk.keywords.length > 0 && (
                    <div className="mt-1">
                      <span className="text-xs text-muted-foreground">Keywords: </span>
                      {chunk.keywords.map((keyword, i) => (
                        <Badge key={i} variant="secondary" className="text-xs mr-1">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RealtimeAudioProcessor;
