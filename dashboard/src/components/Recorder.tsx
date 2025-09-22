import React, { useEffect, useRef, useState } from "react";
import { createInteraction, uploadAudio } from "../lib/api";
import { useTranslation } from "react-i18next";

export default function Recorder({ onComplete }: { onComplete: (interactionId: string, result: any)=>void }) {
  const { t } = useTranslation();
  const mediaRecorderRef = useRef<MediaRecorder|null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const [recording, setRecording] = useState(false);
  const [bookmarks, setBookmarks] = useState<number[]>([]);
  const [error, setError] = useState<string>("");
  const [status, setStatus] = useState<string>("Ready to record");
  const startTimeRef = useRef<number>(0);
  const interactionIdRef = useRef<string>("");

  const handleBookmark = () => {
    if (!recording) return;
    const tNow = (Date.now() - startTimeRef.current)/1000;
    setBookmarks(prev => [...prev, Number(tNow.toFixed(1))]);
    setStatus(`Bookmark added at ${tNow.toFixed(1)}s`);
  };

  const start = async () => {
    try {
      setError("");
      setStatus("Requesting microphone access...");
      
      console.log("Starting recording...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("Microphone access granted");
      
      setStatus("Creating recorder...");
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      
      mr.ondataavailable = (e) => { 
        if (e.data.size) {
          chunksRef.current.push(e.data);
          console.log(`Audio chunk received: ${e.data.size} bytes`);
        }
      };
      
      mr.onerror = (e) => {
        console.error("MediaRecorder error:", e);
        setError("Recording error occurred");
      };
      
      mr.start(500);
      mediaRecorderRef.current = mr;
      setRecording(true);
      startTimeRef.current = Date.now();
      setStatus("Recording... Click Stop when done");

      console.log("Creating interaction...");
      // create interaction
      const meta = await createInteraction("store1","webuser","auto");
      interactionIdRef.current = meta.id;
      console.log("Interaction created:", meta.id);
      
    } catch (err) {
      console.error("Error starting recording:", err);
      setError(`Failed to start recording: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setStatus("Error - check console for details");
    }
  };

  const stop = async () => {
    try {
      setError("");
      setStatus("Stopping recording...");
      
      const mr = mediaRecorderRef.current;
      if (!mr) {
        setError("No active recording found");
        return;
      }
      
      console.log("Stopping MediaRecorder...");
      await new Promise<void>(resolve => {
        mr.onstop = () => {
          console.log("MediaRecorder stopped");
          resolve();
        };
        mr.stop();
      });
      
      setRecording(false);
      setStatus("Processing audio...");
      
      console.log(`Audio chunks: ${chunksRef.current.length}, total size: ${chunksRef.current.reduce((acc, chunk) => acc + (chunk as Blob).size, 0)} bytes`);
      
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      console.log("Audio blob created:", blob.size, "bytes");
      
      if (blob.size === 0) {
        setError("No audio data recorded");
        setStatus("Error - no audio recorded");
        return;
      }
      
      console.log("Uploading audio...");
      const res = await uploadAudio(interactionIdRef.current, blob, bookmarks);
      console.log("Upload response:", res);
      
      setStatus("Analysis complete!");
      onComplete(interactionIdRef.current, res);
      setBookmarks([]);
      
    } catch (err) {
      console.error("Error stopping recording:", err);
      setError(`Failed to process audio: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setStatus("Error - check console for details");
      setRecording(false);
    }
  };

  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-2">
        <button 
          onClick={recording ? stop : start}
          className="px-4 py-2 rounded-xl2 text-white font-medium"
          style={{background: recording ? "#EF4444" : "#1F6FEB"}}
        >
          {recording ? t("stop") : t("record")}
        </button>
        <button 
          onClick={handleBookmark}
          disabled={!recording}
          className="px-4 py-2 rounded-xl2 bg-accent text-black disabled:opacity-50 font-medium"
        >
          {t("bookmark")} ({bookmarks.length})
        </button>
      </div>
      
      <div className="text-sm">
        <div className="text-gray-600 dark:text-gray-400 mb-1">
          Status: {status}
        </div>
        {error && (
          <div className="text-red-500 mb-1">
            Error: {error}
          </div>
        )}
        {recording && (
          <div className="text-green-600 dark:text-green-400">
            Recording... ({((Date.now() - startTimeRef.current) / 1000).toFixed(1)}s)
          </div>
        )}
      </div>
    </div>
  );
}
