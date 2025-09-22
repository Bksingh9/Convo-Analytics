import React, { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { translateText } from "../lib/api";

interface VoiceTranslatorProps {
  onTranslationComplete: (original: string, translated: string, targetLang: string) => void;
}

export default function VoiceTranslator({ onTranslationComplete }: VoiceTranslatorProps) {
  const { t } = useTranslation();
  const [isRecording, setIsRecording] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState("hi");
  const [originalText, setOriginalText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [error, setError] = useState("");
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const supportedLanguages = [
    { code: "hi", name: "Hindi", flag: "🇮🇳" },
    { code: "en", name: "English", flag: "🇺🇸" },
    { code: "es", name: "Spanish", flag: "🇪🇸" },
    { code: "fr", name: "French", flag: "🇫🇷" },
    { code: "de", name: "German", flag: "🇩🇪" },
    { code: "ja", name: "Japanese", flag: "🇯🇵" },
    { code: "ko", name: "Korean", flag: "🇰🇷" },
    { code: "zh", name: "Chinese", flag: "🇨🇳" }
  ];

  const startRecording = async () => {
    try {
      setError("");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        await processAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
    } catch (err) {
      setError(`Failed to start recording: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    try {
      setIsTranslating(true);
      
      // Create FormData for audio upload
      const formData = new FormData();
      formData.append("file", audioBlob, "audio.webm");
      
      // First, create an interaction and upload audio
      const response = await fetch("http://localhost:8000/v1/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store_id: "voice_translator", user_id: "user" })
      });
      
      const interaction = await response.json();
      
      // Upload audio
      const uploadResponse = await fetch(
        `http://localhost:8000/v1/upload?interaction_id=${interaction.id}`,
        {
          method: "POST",
          body: formData
        }
      );
      
      const result = await uploadResponse.json();
      const transcript = result.transcript || "No transcription available";
      setOriginalText(transcript);
      
      // Translate the transcript
      if (transcript && !transcript.includes("Error")) {
        const translationResult = await translateText(transcript, targetLanguage);
        setTranslatedText(translationResult.translated);
        onTranslationComplete(transcript, translationResult.translated, targetLanguage);
      } else {
        setTranslatedText("Translation failed - no valid transcript");
        setError("Failed to transcribe audio");
      }
    } catch (err) {
      setError(`Translation failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setTranslatedText("Translation failed");
    } finally {
      setIsTranslating(false);
    }
  };

  const handleTextTranslation = async () => {
    if (!originalText.trim()) return;
    
    try {
      setIsTranslating(true);
      setError("");
      
      const result = await translateText(originalText, targetLanguage);
      setTranslatedText(result.translated);
      onTranslationComplete(originalText, result.translated, targetLanguage);
    } catch (err) {
      setError(`Translation failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4">🌐 Voice Translator</h3>
      
      {/* Language Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Target Language:</label>
        <select
          value={targetLanguage}
          onChange={(e) => setTargetLanguage(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
        >
          {supportedLanguages.map(lang => (
            <option key={lang.code} value={lang.code}>
              {lang.flag} {lang.name}
            </option>
          ))}
        </select>
      </div>

      {/* Recording Controls */}
      <div className="mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isTranslating}
            className={`px-6 py-3 rounded-lg font-medium text-white transition-colors ${
              isRecording 
                ? "bg-red-500 hover:bg-red-600" 
                : "bg-primary hover:bg-blue-600"
            } ${isTranslating ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {isRecording ? "🛑 Stop Recording" : "🎤 Start Recording"}
          </button>
          
          {isRecording && (
            <div className="flex items-center gap-2 text-red-500">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-sm">Recording...</span>
            </div>
          )}
          
          {isTranslating && (
            <div className="flex items-center gap-2 text-blue-500">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm">Translating...</span>
            </div>
          )}
        </div>
      </div>

      {/* Text Input/Output */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Original Text:</label>
          <textarea
            value={originalText}
            onChange={(e) => setOriginalText(e.target.value)}
            placeholder="Enter text to translate or record audio..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 h-24 resize-none"
          />
          <button
            onClick={handleTextTranslation}
            disabled={!originalText.trim() || isTranslating}
            className="mt-2 px-4 py-2 bg-accent text-black rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🔄 Translate Text
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Translated Text:</label>
          <textarea
            value={translatedText}
            readOnly
            placeholder="Translation will appear here..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 h-24 resize-none"
          />
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="text-red-600 dark:text-red-400 text-sm">❌ {error}</div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <div className="text-blue-600 dark:text-blue-400 text-sm">
          <strong>💡 Instructions:</strong>
          <ul className="mt-1 list-disc list-inside space-y-1">
            <li>Select target language from dropdown</li>
            <li>Click "Start Recording" and speak clearly</li>
            <li>Click "Stop Recording" to process</li>
            <li>Or type text directly and click "Translate Text"</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
