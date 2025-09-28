import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Square, Play, Pause, Download, Trash2 } from 'lucide-react';
import { createInteraction, uploadAudio } from '@/lib/api';

interface AudioRecorderProps {
  onTranscription?: (text: string) => void;
  onLanguageDetected?: (language: string) => void;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ 
  onTranscription, 
  onLanguageDetected 
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcription, setTranscription] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [interactionId, setInteractionId] = useState<string | null>(null);
  const [detectedLanguage, setDetectedLanguage] = useState<string>('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Format time in MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Start recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        setAudioUrl(URL.createObjectURL(audioBlob));
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      // Create interaction
      try {
        const interaction = await createInteraction();
        setInteractionId(interaction.id);
      } catch (error) {
        console.error('Failed to create interaction:', error);
      }

    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  // Pause/Resume recording
  const togglePause = () => {
    if (mediaRecorderRef.current) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        setIsPaused(false);
        // Resume timer
        timerRef.current = setInterval(() => {
          setRecordingTime(prev => prev + 1);
        }, 1000);
      } else {
        mediaRecorderRef.current.pause();
        setIsPaused(true);
        // Pause timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      }
    }
  };

  // Process audio for transcription
  const processAudio = async () => {
    if (!audioBlob || !interactionId) return;

    setIsProcessing(true);
    try {
      const result = await uploadAudio(interactionId, audioBlob, []);
      
      if (result.transcript) {
        setTranscription(result.transcript);
        onTranscription?.(result.transcript);
      }
      
      if (result.detected_language) {
        setDetectedLanguage(result.detected_language);
        onLanguageDetected?.(result.detected_language);
      }
      
    } catch (error) {
      console.error('Error processing audio:', error);
      alert('Failed to process audio. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Play recorded audio
  const playAudio = () => {
    if (audioRef.current && audioUrl) {
      if (audioRef.current.paused) {
        audioRef.current.play();
      } else {
        audioRef.current.pause();
      }
    }
  };

  // Download audio
  const downloadAudio = () => {
    if (audioBlob) {
      const url = URL.createObjectURL(audioBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recording-${new Date().toISOString()}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  // Clear recording
  const clearRecording = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setTranscription('');
    setDetectedLanguage('');
    setRecordingTime(0);
    setInteractionId(null);
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  return (
    <div className="space-y-6">
      {/* Recording Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Audio Recorder
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Recording Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {isRecording && (
                <Badge variant={isPaused ? "secondary" : "destructive"} className="animate-pulse">
                  {isPaused ? "PAUSED" : "RECORDING"}
                </Badge>
              )}
              {recordingTime > 0 && (
                <span className="text-2xl font-mono font-bold">
                  {formatTime(recordingTime)}
                </span>
              )}
            </div>
            
            {detectedLanguage && (
              <Badge variant="outline">
                Language: {detectedLanguage.toUpperCase()}
              </Badge>
            )}
          </div>

          {/* Control Buttons */}
          <div className="flex items-center gap-2">
            {!isRecording ? (
              <Button onClick={startRecording} className="flex items-center gap-2">
                <Mic className="h-4 w-4" />
                Start Recording
              </Button>
            ) : (
              <>
                <Button 
                  onClick={togglePause} 
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                  {isPaused ? "Resume" : "Pause"}
                </Button>
                <Button 
                  onClick={stopRecording} 
                  variant="destructive"
                  className="flex items-center gap-2"
                >
                  <Square className="h-4 w-4" />
                  Stop
                </Button>
              </>
            )}
          </div>

          {/* Audio Playback Controls */}
          {audioBlob && (
            <div className="flex items-center gap-2 pt-4 border-t">
              <Button 
                onClick={playAudio} 
                variant="outline" 
                size="sm"
                className="flex items-center gap-2"
              >
                <Play className="h-4 w-4" />
                Play
              </Button>
              <Button 
                onClick={downloadAudio} 
                variant="outline" 
                size="sm"
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
              <Button 
                onClick={clearRecording} 
                variant="outline" 
                size="sm"
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Clear
              </Button>
              <Button 
                onClick={processAudio} 
                disabled={isProcessing}
                className="flex items-center gap-2"
              >
                {isProcessing ? "Processing..." : "Transcribe"}
              </Button>
            </div>
          )}

          {/* Hidden Audio Element */}
          {audioUrl && (
            <audio
              ref={audioRef}
              src={audioUrl}
              controls
              className="w-full"
            />
          )}
        </CardContent>
      </Card>

      {/* Transcription Results */}
      {transcription && (
        <Card>
          <CardHeader>
            <CardTitle>Transcription</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {transcription}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AudioRecorder;
