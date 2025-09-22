import React from "react";

export default function InteractionsTable({ rows, onOpen }:{ rows:any[], onOpen:(id:string)=>void }) {
  return (
    <div className="card overflow-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left">
            <th className="p-2">ID</th>
            <th className="p-2">Store</th>
            <th className="p-2">User</th>
            <th className="p-2">Sentiment</th>
            <th className="p-2">RF Score</th>
            <th className="p-2"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r=>(
            <tr key={r.id} className="border-t border-gray-700/20">
              <td className="p-2">{r.id.slice(0,8)}…</td>
              <td className="p-2">{r.store_id}</td>
              <td className="p-2">{r.user_id}</td>
              <td className="p-2">{(r.metrics?.sentiment ?? 0).toFixed(2)}</td>
              <td className="p-2">{(r.metrics?.red_flag_score ?? 0).toFixed(0)}</td>
              <td className="p-2">
                <button onClick={()=>onOpen(r.id)} className="px-3 py-1 rounded bg-primary text-white">Open</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
