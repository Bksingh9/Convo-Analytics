import React, { useEffect, useRef, useState } from "react";
import { createInteraction, uploadAudio } from "../lib/api";
import { useTranslation } from "react-i18next";

export default function Recorder({ onComplete }: { onComplete: (interactionId: string, result: any)=>void }) {
  const { t } = useTranslation();
  const mediaRecorderRef = useRef<MediaRecorder|null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const [recording, setRecording] = useState(false);
  const [bookmarks, setBookmarks] = useState<number[]>([]);
  const startTimeRef = useRef<number>(0);
  const interactionIdRef = useRef<string>("");

  const handleBookmark = () => {
    if (!recording) return;
    const tNow = (Date.now() - startTimeRef.current)/1000;
    setBookmarks(prev => [...prev, Number(tNow.toFixed(1))]);
  };

  const start = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mr = new MediaRecorder(stream);
    chunksRef.current = [];
    mr.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
    mr.start(500);
    mediaRecorderRef.current = mr;
    setRecording(true);
    startTimeRef.current = Date.now();

    // create interaction
    const meta = await createInteraction("store1","webuser","auto");
    interactionIdRef.current = meta.id;
  };

  const stop = async () => {
    const mr = mediaRecorderRef.current;
    if (!mr) return;
    await new Promise<void>(resolve => {
      mr.onstop = () => resolve();
      mr.stop();
    });
    setRecording(false);
    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    // Re-encode to wav on backend (fastapi) is fine; most whisper supports webm too.
    const res = await uploadAudio(interactionIdRef.current, blob, bookmarks);
    onComplete(interactionIdRef.current, res);
    setBookmarks([]);
  };

  return (
    <div className="card flex items-center gap-3">
      <button onClick={recording? stop : start}
              className="px-4 py-2 rounded-xl2 text-white"
              style={{background: recording ? "#EF4444" : "#1F6FEB"}}>
        {recording ? t("stop") : t("record")}
      </button>
      <button onClick={handleBookmark}
              disabled={!recording}
              className="px-4 py-2 rounded-xl2 bg-accent text-black disabled:opacity-50">
        {t("bookmark")} ({bookmarks.length})
      </button>
    </div>
  );
}
