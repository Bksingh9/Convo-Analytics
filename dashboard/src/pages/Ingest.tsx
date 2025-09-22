import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Mic, Upload, FileAudio, Play, Pause, Square, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { createInteraction, uploadAudio } from '../lib/api';

const Ingest = () => {
  const { t } = useTranslation();
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [lastResult, setLastResult] = useState(null);
  const [error, setError] = useState(null);
  
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const startTimeRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (isRecording) {
      intervalRef.current = setInterval(() => {
        setRecordingTime(Date.now() - startTimeRef.current);
      }, 100);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRecording]);

  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await processRecording(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      startTimeRef.current = Date.now();
    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Failed to start recording. Please check microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processRecording = async (blob) => {
    try {
      setIsUploading(true);
      setUploadProgress(0);
      
      // Create interaction
      const interaction = await createInteraction('store1', 'webuser', 'auto');
      
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Upload audio
      const result = await uploadAudio(interaction.id, blob, []);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      setLastResult(result);
      setError(null);
    } catch (err) {
      console.error('Error processing recording:', err);
      setError('Failed to process recording. Please try again.');
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 2000);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setUploadProgress(0);
      setError(null);
      
      // Create interaction
      const interaction = await createInteraction('store1', 'webuser', 'auto');
      
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Upload file
      const result = await uploadAudio(interaction.id, file, []);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      setLastResult(result);
    } catch (err) {
      console.error('Error uploading file:', err);
      setError('Failed to upload file. Please try again.');
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 2000);
    }
  };

  const formatTime = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-8 space-y-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
          Audio Ingest
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Upload and process audio files for real-time analysis
        </p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <p className="text-red-800 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}

      {lastResult && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-emerald-600" />
            <p className="text-emerald-800 dark:text-emerald-300">Audio processed successfully!</p>
          </div>
          <div className="mt-2 text-sm text-emerald-700 dark:text-emerald-400">
            <p>Interaction ID: {lastResult.id}</p>
            <p>Keywords: {lastResult.keywords?.join(', ') || 'None detected'}</p>
            <p>Sentiment: {lastResult.metrics?.sentiment?.toFixed(2) || 'N/A'}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recording Section */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Mic className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Record Audio</h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Record live audio for real-time analysis</p>
          
          <div className="text-center">
            {isRecording && (
              <div className="mb-4">
                <div className="text-3xl font-bold text-red-600 mb-2">
                  {formatTime(recordingTime)}
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-red-600">Recording...</span>
                </div>
              </div>
            )}
            
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isUploading}
              className={`w-full py-4 px-6 rounded-xl font-semibold text-white transition-all duration-200 flex items-center justify-center space-x-2 ${
                isRecording 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : 'bg-blue-600 hover:bg-blue-700'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isRecording ? (
                <>
                  <Square className="h-5 w-5" />
                  <span>Stop Recording</span>
                </>
              ) : (
                <>
                  <Mic className="h-5 w-5" />
                  <span>Start Recording</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Upload Section */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Upload className="h-6 w-6 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Upload File</h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Upload existing audio files for analysis</p>
          
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center hover:border-blue-400 transition-colors">
            <FileAudio className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 mb-2">Drag & drop audio files here</p>
            <p className="text-sm text-gray-500 mb-4">or click to browse</p>
            
            <input
              type="file"
              accept="audio/*"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="hidden"
              id="audio-upload"
            />
            <label
              htmlFor="audio-upload"
              className={`inline-block px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer ${
                isUploading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              Choose File
            </label>
          </div>
        </div>
      </div>

      {/* Upload Progress */}
      {isUploading && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Processing Audio</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span>Upload Progress</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {uploadProgress < 50 ? 'Uploading audio file...' : 
               uploadProgress < 90 ? 'Processing with AI models...' : 
               'Finalizing analysis...'}
            </p>
          </div>
        </div>
      )}

      {/* Real-time Status */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Play className="h-6 w-6 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Real-time Processing Status</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-900 dark:text-white">Audio Processing</span>
          </div>
          <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-900 dark:text-white">ML Models Active</span>
          </div>
          <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-900 dark:text-white">Real-time Analysis</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Ingest;
