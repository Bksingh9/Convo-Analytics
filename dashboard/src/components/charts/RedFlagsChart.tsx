import React from "react";
import ReactECharts from "echarts-for-react";

export default function RedFlagsChart({ data }: { data: any }) {
  const option = {
    tooltip: { trigger: "axis" },
    legend: { data: ["Disrespect","Inventory","Process","Knowledge","Team"] },
    xAxis: { type: "category", data: data.labels || [] },
    yAxis: { type: "value" },
    series: ["Disrespect","Inventory","Process","Knowledge","Team"].map(name => ({
      name, type: "bar", stack: "rf", emphasis: { focus: "series" },
      data: (data.values?.[name] || [])
    }))
  };
  return <div className="card"><ReactECharts option={option} style={{height: 300}} /></div>;
}
