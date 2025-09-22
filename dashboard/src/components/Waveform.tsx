import React, { useEffect, useRef } from "react";
import WaveSurfer from "wavesurfer.js";

export default function Waveform({ url, bookmarks=[] }: { url: string, bookmarks?: number[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WaveSurfer|null>(null);

  useEffect(()=> {
    if (!containerRef.current) return;
    const ws = WaveSurfer.create({
      container: containerRef.current,
      height: 80,
      waveColor: "#60A5FA",
      progressColor: "#1F6FEB",
      cursorColor: "#FFBC11",
      normalize: true
    });
    ws.load(url);
    wsRef.current = ws;
    return () => { ws.destroy(); };
  }, [url]);

  return <div ref={containerRef} className="w-full" />;
}
