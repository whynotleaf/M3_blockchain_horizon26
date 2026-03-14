import React from "react";
import { fmtINR, fmtPct } from "../utils/format";

export default function StockCard({ stock, onClick, selected }) {
  const up = stock.changePercent >= 0;
  return (
    <div
      onClick={() => onClick?.(stock)}
      className={`card-hover p-4 cursor-pointer ${selected ? "border-green-500/50 bg-gray-800 glow-green" : ""}`}
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="font-display font-bold text-white">{stock.symbol}</p>
          <p className="text-xs text-gray-500 truncate max-w-[120px]">{stock.name}</p>
        </div>
        <span className={`badge text-[10px] ${up ? "badge-green" : "badge-red"}`}>
          {stock.sector?.split(" ")[0]}
        </span>
      </div>
      <div className="flex justify-between items-end">
        <p className="text-xl font-bold text-white">{fmtINR(stock.price)}</p>
        <div className={`text-right text-sm font-medium ${up ? "text-green-400" : "text-red-400"}`}>
          <p>{fmtPct(stock.changePercent)}</p>
          <p className="text-xs">{up ? "▲" : "▼"} {Math.abs(stock.change).toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
}
