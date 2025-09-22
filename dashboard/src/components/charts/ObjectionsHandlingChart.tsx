import React from "react";
import ReactECharts from "echarts-for-react";

export default function ObjectionsHandlingChart({ data }: { data:any }) {
  const option = {
    tooltip: { trigger: "axis" },
    legend: { data: ["Price","Stock","SizeFit","Quality","Knowledge","Process","Solution","Explanation","Other"] },
    xAxis: { type: "category", data: data.labels || [] },
    yAxis: { type: "value" },
    series: ["Price","Stock","SizeFit","Quality","Knowledge","Process","Solution","Explanation","Other"]
      .map(name => ({ name, type:"bar", data: (data.values?.[name] || []) }))
  };
  return <div className="card"><ReactECharts option={option} style={{height: 300}} /></div>;
}
