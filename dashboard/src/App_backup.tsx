import React, { useEffect, useMemo, useState } from "react";
import "./styles/globals.css";
import "./i18n";
import { useTranslation } from "react-i18next";
import Recorder from "./components/Recorder";
import Uploader from "./components/Uploader";
import Waveform from "./components/Waveform";
import InteractionsTable from "./components/InteractionsTable";
import RedFlagsChart from "./components/charts/RedFlagsChart";
import ObjectionsHandlingChart from "./components/charts/ObjectionsHandlingChart";
import { getInteraction, getMetrics } from "./lib/api";

export default function App() {
  const { t, i18n } = useTranslation();
  const [lastResult, setLastResult] = useState<any|null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [openId, setOpenId] = useState<string>("");
  const [metrics, setMetrics] = useState<any>({});

  const onComplete = async (id: string, res: any) => {
    setLastResult({ id, ...res });
    const full = await getInteraction(id);
    setRows(prev => [{ id, store_id: "store1", user_id: "webuser", metrics: full.metrics}, ...prev]);
    const m = await getMetrics(); setMetrics(m);
    setOpenId(id);
  };

  const audioUrl = useMemo(()=>{
    // For the starter, we don't persist audio URL; you can modify backend to return a presigned URL from MinIO
    // Here we create an object URL if last upload is still in memory (not available). Keep waveform demo disabled if no URL.
    return "";
  }, [lastResult]);

  return (
    <div className="min-h-screen px-4 md:px-8 py-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-inter font-bold">{t("title")}</h1>
        <div className="flex items-center gap-2">
          <select className="px-3 py-2 rounded bg-surface" onChange={e=>i18n.changeLanguage(e.target.value)}>
            <option value="en-IN">{t("en")}</option>
            <option value="hi-IN">{t("hi")}</option>
          </select>
        </div>
      </header>

      <div className="grid md:grid-cols-2 gap-6">
        <Recorder onComplete={onComplete} />
        <Uploader onComplete={onComplete} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <RedFlagsChart data={{ labels:["Today"], values:{ "Disrespect":[0], "Inventory":[0], "Process":[0], "Knowledge":[0], "Team":[0] }}} />
        <ObjectionsHandlingChart data={{ labels:["Today"], values:{} }} />
      </div>

      <InteractionsTable rows={rows} onOpen={setOpenId} />

      {openId && lastResult && lastResult.id === openId && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-2">{t("summary")}</h3>
          <p className="opacity-90 mb-4">{lastResult.summary || "-"}</p>
          <div className="mb-4">
            <strong>{t("keywords")}:</strong> {lastResult.keywords?.join(", ") || "-"}
          </div>
          {/* Waveform would need a URL to the audio; with MinIO you can return a presigned URL from backend */}
          {audioUrl ? <Waveform url={audioUrl} bookmarks={lastResult.segments?.map((s:any)=>s[0])||[]} /> : <div className="text-sm opacity-70">Waveform preview requires audio URL. Enable MinIO + presigned URLs to preview here.</div>}
        </div>
      )}
    </div>
  );
}
