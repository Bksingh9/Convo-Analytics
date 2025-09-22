import React from "react";
import { createInteraction, uploadAudio } from "../lib/api";
import { useTranslation } from "react-i18next";

export default function Uploader({ onComplete }: { onComplete:(id:string, result:any)=>void }) {
  const { t } = useTranslation();

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const meta = await createInteraction("store1","webuser","auto");
    const res = await uploadAudio(meta.id, file, []);
    onComplete(meta.id, res);
  };

  return (
    <label className="card block cursor-pointer text-center p-6 border-2 border-dashed border-gray-300">
      <input type="file" accept="audio/*" className="hidden" onChange={e => handleFiles(e.target.files)} />
      <div>{t("dragDrop")}</div>
    </label>
  );
}
