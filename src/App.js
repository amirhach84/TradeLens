import { useState, useEffect, useRef } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, LineChart, Line } from "recharts";

const SUPABASE_URL = "https://ehwbdzrbypsdzrsfpboj.supabase.co";
const SUPABASE_KEY = "sb_publishable_9cg409A6X_8S9mPevUN8Uw_i2jfmDX9";

const fetchFromSupabase = async (table, query = "") => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query}`, {
    headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` }
  });
  return res.json();
};

const parseIL = (str) => {
  if (!str) return new Date();
  const [date, time] = str.split(' ');
  const [y, m, d] = date.split('-');
  const [h, min, sec] = (time || '00:00:00').split(':');
  return new Date(y, m - 1, d, h, min, sec);
};

const fmt = (n) => {
  const abs = Math.abs(n).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return n >= 0 ? `+$${abs}` : `-$${abs}`;
};

const C = {
  bg: "#0a0e1a", card: "#111827", card2: "#1a2235",
  border: "rgba(255,255,255,0.06)", border2: "rgba(255,255,255,0.1)",
  green: "#22c55e", red: "#ef4444", yellow: "#f59e0b",
  accent: "#6366f1", cyan: "#06b6d4",
  text: "#f1f5f9", text2: "#94a3b8", text3: "#475569",
};

const useIsMobile = () => {
  const [mobile, setMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return mobile;
};

const navItems = [
  { id: "dashboard", icon: "⊞", label: "Dashboard" },
  { id: "performance", icon: "📈", label: "Performance" },
  { id: "timing", icon: "⏱", label: "Timing" },
  { id: "trades", icon: "📋", label: "Trades" },
  { id: "psychology", icon: "🧠", label: "Mind" },
];

export default function App() {
  const isMobile = useIsMobile();
  const [trades, setTrades] = useState([]);
  const [stats, setStats] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [period, setPeriod] = useState("all");
  const [showCustom, setShowCustom] = useState(false);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const customRef = useRef(null);

  const computeStats = (data) => {
    const total = data.length;
    const wins = data.filter(t => t.profit > 0).length;
    const pnl = data.reduce((s, t) => s + (t.profit || 0), 0);
    const winP = data.filter(t => t.profit > 0).reduce((s, t) => s + t.profit, 0);
    const lossP = Math.abs(data.filter(t => t.profit < 0).reduce((s, t) => s + t.profit, 0));
    const rrT = data.filter(t => t.rr_actual);
    return {
      total, wins, losses: total - wins,
      win_rate: total > 0 ? Math.round(wins / total * 1000) / 10 : 0,
      pnl: Math.round(pnl * 100) / 100,
      profit_factor: lossP > 0 ? Math.round(winP / lossP * 100) / 100 : 0,
      avg_win: wins > 0 ? Math.round(winP / wins * 100) / 100 : 0,
      avg_loss: (total - wins) > 0 ? Math.round(lossP / (total - wins) * 100) / 100 : 0,
      avg_rr: rrT.length > 0 ? Math.round(rrT.reduce((s, t) => s + t.rr_actual, 0) / rrT.length * 100) / 100 : 0,
    };
  };

  const loadData = async () => {
    const data = await fetchFromSupabase("trades", "?select=*&order=open_time.desc");
    if (!Array.isArray(data)) return;
    setTrades(data);
    setStats(computeStats(data));
  };

  const syncData = async () => { setSyncing(true); await loadData(); setSyncing(false); };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadData().finally(() => setLoading(false)); }, []);

  // Close custom picker on outside click
  useEffect(() => {
    const handler = (e) => { if (customRef.current && !customRef.current.contains(e.target)) setShowCustom(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const periodLabel = () => {
    if (period === "week") return "1W";
    if (period === "month") return "1M";
    if (period === "3m") return "3M";
    if (period === "custom" && customFrom && customTo) return `${customFrom} → ${customTo}`;
    return "All";
  };

  const filtered = () => {
    const now = new Date();
    return trades.filter(t => {
      const d = parseIL(t.open_time);
      if (period === "week") return (now - d) < 7 * 86400000;
      if (period === "month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      if (period === "3m") return (now - d) < 90 * 86400000;
      if (period === "custom" && customFrom && customTo) {
        const from = new Date(customFrom);
        const to = new Date(customTo);
        to.setHours(23, 59, 59);
        return d >= from && d <= to;
      }
      return true;
    });
  };

  const ft = filtered();
  const st = computeStats(ft);

  const equityData = () => {
    let bal = 0;
    return [...ft].reverse().map((t, i) => ({ i: i + 1, bal: parseFloat((bal += t.profit || 0).toFixed(2)) }));
  };

  const monthlyData = () => {
    const map = {};
    ft.forEach(t => {
      const d = parseIL(t.open_time);
      const k = d.toLocaleString('en', { month: 'short', year: '2-digit' });
      if (!map[k]) map[k] = { k, pnl: 0, wins: 0, total: 0 };
      map[k].pnl += t.profit || 0;
      map[k].total++;
      if (t.profit > 0) map[k].wins++;
    });
    return Object.values(map).map(m => ({ ...m, pnl: parseFloat(m.pnl.toFixed(2)), wr: Math.round(m.wins / m.total * 100) }));
  };

  const hourData = () => {
    const map = {};
    ft.forEach(t => {
      const h = parseIL(t.open_time).getHours();
      const ampm = h < 12 ? `${h === 0 ? 12 : h}AM` : `${h === 12 ? 12 : h - 12}PM`;
      if (!map[h]) map[h] = { h: ampm, wins: 0, total: 0, pnl: 0 };
      map[h].total++;
      map[h].pnl += t.profit || 0;
      if (t.profit > 0) map[h].wins++;
    });
    return Array.from({ length: 24 }, (_, i) => {
      const ampm = i < 12 ? `${i === 0 ? 12 : i}AM` : `${i === 12 ? 12 : i - 12}PM`;
      return map[i] || { h: ampm, wins: 0, total: 0, pnl: 0 };
    }).map(h => ({ ...h, wr: h.total > 0 ? Math.round(h.wins / h.total * 100) : 0 }));
  };

  const dayData = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const map = {};
    ft.forEach(t => {
      const d = days[parseIL(t.open_time).getDay()];
      if (!map[d]) map[d] = { d, wins: 0, total: 0, pnl: 0 };
      map[d].total++;
      map[d].pnl += t.profit || 0;
      if (t.profit > 0) map[d].wins++;
    });
    return days.map(d => map[d] ? { ...map[d], wr: Math.round(map[d].wins / map[d].total * 100), pnl: parseFloat(map[d].pnl.toFixed(2)) } : { d, wins: 0, total: 0, pnl: 0, wr: 0 });
  };

  const sessionData = () => {
    const map = {};
    ft.forEach(t => {
      const s = t.session || "Unknown";
      if (!map[s]) map[s] = { s, wins: 0, total: 0 };
      map[s].total++;
      if (t.profit > 0) map[s].wins++;
    });
    return Object.values(map).map(v => ({ ...v, wr: Math.round(v.wins / v.total * 100) })).sort((a, b) => b.wr - a.wr);
  };

  const tilt = () => {
    let maxL = 0, cur = 0, aL = { w: 0, t: 0 }, aW = { w: 0, t: 0 };
    const rev = [...ft].reverse();
    rev.forEach(t => { if (t.profit < 0) { cur++; maxL = Math.max(maxL, cur); } else cur = 0; });
    for (let i = 1; i < rev.length; i++) {
      if (rev[i - 1].profit < 0) { aL.t++; if (rev[i].profit > 0) aL.w++; }
      if (rev[i - 1].profit > 0) { aW.t++; if (rev[i].profit > 0) aW.w++; }
    }
    return {
      maxL,
      wrAfterL: aL.t > 0 ? Math.round(aL.w / aL.t * 100) : 0,
      wrAfterW: aW.t > 0 ? Math.round(aW.w / aW.t * 100) : 0,
    };
  };

  const overTrading = () => {
    const map = {};
    ft.forEach(t => {
      const d = parseIL(t.open_time).toLocaleDateString('en-CA');
      if (!map[d]) map[d] = { d, trades: 0, pnl: 0, wins: 0 };
      map[d].trades++;
      map[d].pnl += t.profit || 0;
      if (t.profit > 0) map[d].wins++;
    });
    return Object.values(map).filter(d => d.trades > 2)
      .sort((a, b) => b.trades - a.trades).slice(0, 8)
      .map(d => ({ ...d, pnl: parseFloat(d.pnl.toFixed(2)), wr: Math.round(d.wins / d.trades * 100) }));
  };

  const tiltData = tilt();

  const aiInsights = () => {
    if (!ft.length) return [];
    const ins = [];
    const label = periodLabel();
    const hours = hourData().filter(h => h.total >= 3).sort((a, b) => b.wr - a.wr);
    const days = dayData().filter(d => d.total >= 3).sort((a, b) => b.wr - a.wr);
    const otDays = overTrading();

    ins.push({ color: C.text2, icon: "📊", text: `Period: ${label} — ${ft.length} trades analyzed` });
    if (st.win_rate < 40) ins.push({ color: C.red, icon: "🔴", text: `Win rate ${st.win_rate}% is below 40% in this period — review your entry criteria` });
    if (st.profit_factor < 1) ins.push({ color: C.red, icon: "⚠️", text: `Profit factor ${st.profit_factor} — losses exceed gains in this period` });
    if (st.profit_factor >= 1.5) ins.push({ color: C.green, icon: "✅", text: `Strong profit factor ${st.profit_factor} — your strategy has clear edge in this period` });
    if (tiltData.maxL >= 3) ins.push({ color: C.red, icon: "🔴", text: `Max consecutive losses: ${tiltData.maxL} — tilt risk detected` });
    if (tiltData.wrAfterL < 40) ins.push({ color: C.red, icon: "⚠️", text: `Win rate after a loss: ${tiltData.wrAfterL}% — possible revenge trading` });
    if (tiltData.wrAfterW > 60) ins.push({ color: C.green, icon: "✅", text: `Win rate after a win: ${tiltData.wrAfterW}% — you ride momentum well` });
    if (hours.length) ins.push({ color: C.green, icon: "⏰", text: `Best hour: ${hours[0].h} with ${hours[0].wr}% win rate (${hours[0].total} trades)` });
    if (hours.length > 1) ins.push({ color: C.yellow, icon: "🚫", text: `Worst hour: ${hours[hours.length-1].h} with ${hours[hours.length-1].wr}% — avoid trading then` });
    if (days.length) ins.push({ color: C.green, icon: "📅", text: `Best day: ${days[0].d} with ${days[0].wr}% win rate` });
    if (days.length > 1) ins.push({ color: C.red, icon: "📅", text: `Worst day: ${days[days.length-1].d} with ${days[days.length-1].wr}% — consider skipping` });
    if (otDays.length) ins.push({ color: C.yellow, icon: "📊", text: `${otDays.length} over-trading days — worst: ${otDays[0].d} (${otDays[0].trades} trades, ${fmt(otDays[0].pnl)})` });

    return ins;
  };

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", background: C.bg, color: C.text2, gap: 16 }}>
      <div style={{ fontSize: 32 }}>🔭</div>
      <div style={{ fontSize: 16, fontWeight: 600 }}>Loading TradeLens...</div>
    </div>
  );

  // Period selector with custom date picker
  const PeriodSelector = ({ mobile }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", position: "relative" }}>
      {[["week", "1W"], ["month", "1M"], ["3m", "3M"], ["all", "All"]].map(([v, l]) => (
        <button key={v} onClick={() => { setPeriod(v); setShowCustom(false); }}
          style={{ padding: mobile ? "7px 12px" : "7px 16px", borderRadius: 10, border: "none", background: period === v ? C.accent : C.card2, color: period === v ? "#fff" : C.text2, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
          {l}
        </button>
      ))}
      <div ref={customRef} style={{ position: "relative" }}>
        <button onClick={() => setShowCustom(!showCustom)}
          style={{ padding: mobile ? "7px 12px" : "7px 16px", borderRadius: 10, border: "none", background: period === "custom" ? C.accent : C.card2, color: period === "custom" ? "#fff" : C.text2, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
          {period === "custom" && customFrom && customTo ? `${customFrom}→${customTo}` : "Custom"}
        </button>
        {showCustom && (
          <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, background: C.card, border: `1px solid ${C.border2}`, borderRadius: 14, padding: 16, zIndex: 100, minWidth: 260, boxShadow: "0 20px 40px rgba(0,0,0,0.5)" }}>
            <div style={{ fontSize: 12, color: C.text2, marginBottom: 12, fontWeight: 700 }}>Custom Date Range</div>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: C.text3, marginBottom: 4 }}>From</div>
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                style={{ width: "100%", background: C.card2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 10px", color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: C.text3, marginBottom: 4 }}>To</div>
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                style={{ width: "100%", background: C.card2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 10px", color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
            </div>
            <button onClick={() => { if (customFrom && customTo) { setPeriod("custom"); setShowCustom(false); } }}
              style={{ width: "100%", padding: "9px", borderRadius: 10, border: "none", background: customFrom && customTo ? C.accent : C.card2, color: customFrom && customTo ? "#fff" : C.text3, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              Apply
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const PageContent = () => (
    <>
      {page === "dashboard" && (
        <>
          <div style={{ background: `linear-gradient(135deg, ${C.accent} 0%, ${C.cyan} 100%)`, borderRadius: 20, padding: "24px 20px", marginBottom: 16, position: "relative", overflow: "hidden" }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", marginBottom: 2 }}>Total P&L · {periodLabel()}</div>
            <div style={{ fontSize: isMobile ? 34 : 42, fontWeight: 800, color: "#fff", letterSpacing: -1 }}>{fmt(st.pnl)}</div>
            <div style={{ display: "flex", gap: 24, marginTop: 16 }}>
              {[["Win Rate", `${st.win_rate}%`], ["Trades", st.total], ["Profit Factor", st.profit_factor]].map(([l, v]) => (
                <div key={l}>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>{l}</div>
                  <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 800, color: "#fff" }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ position: "absolute", right: -20, top: -20, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: 12, marginBottom: 16 }}>
            {[
              { label: "Wins", value: st.wins, color: C.green },
              { label: "Losses", value: st.losses, color: C.red },
              { label: "Avg Win", value: `$${st.avg_win}`, color: C.green },
              { label: "Avg Loss", value: `$${st.avg_loss}`, color: C.red },
            ].map((k, i) => (
              <div key={i} style={{ background: C.card, borderRadius: 16, padding: 16, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 11, color: C.text3, marginBottom: 6 }}>{k.label}</div>
                <div style={{ fontSize: isMobile ? 22 : 28, fontWeight: 800, color: k.color }}>{k.value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.4fr 1fr", gap: 16, marginBottom: 16 }}>
            <div style={{ background: C.card, borderRadius: 20, padding: "18px 16px", border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Equity Curve · {periodLabel()}</div>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={equityData()}>
                  <defs>
                    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.accent} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={C.accent} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis hide /><YAxis hide />
                  <Tooltip contentStyle={{ background: C.card2, border: "none", borderRadius: 10, fontSize: 12 }} formatter={v => [`$${v}`, "Balance"]} />
                  <Area type="monotone" dataKey="bal" stroke={C.accent} fill="url(#g)" strokeWidth={2.5} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div style={{ background: C.card, borderRadius: 20, padding: "18px 16px", border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Sessions</div>
              {sessionData().map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: C.text2, width: 110 }}>{s.s}</div>
                  <div style={{ flex: 1, height: 7, background: C.card2, borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ width: `${s.wr}%`, height: "100%", background: s.wr >= 55 ? C.green : s.wr >= 40 ? C.yellow : C.red, borderRadius: 4 }} />
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: s.wr >= 55 ? C.green : s.wr >= 40 ? C.yellow : C.red, width: 36 }}>{s.wr}%</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: C.card, borderRadius: 20, padding: "18px 16px", border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>🧠 AI Analysis · {periodLabel()}</div>
            <div style={{ fontSize: 11, color: C.text2, marginBottom: 14 }}>{ft.length} trades in selected period</div>
            <div style={{ background: `linear-gradient(135deg, rgba(99,102,241,0.08), rgba(6,182,212,0.05))`, borderRadius: 14, padding: 14, border: "1px solid rgba(99,102,241,0.15)" }}>
              {aiInsights().map((ins, i) => (
                <div key={i} style={{ fontSize: 13, color: ins.color, lineHeight: 1.7, marginBottom: 6 }}>
                  {ins.icon} {ins.text}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {page === "performance" && (
        <>
          <div style={{ fontSize: isMobile ? 20 : 26, fontWeight: 800, marginBottom: 4 }}>Performance</div>
          <div style={{ fontSize: 12, color: C.text2, marginBottom: 16 }}>Period: {periodLabel()} · {ft.length} trades</div>

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div style={{ background: C.card, borderRadius: 20, padding: "18px 16px", border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>P&L by Month</div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={monthlyData()}>
                  <XAxis dataKey="k" tick={{ fill: C.text2, fontSize: 10 }} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ background: C.card2, border: "none", borderRadius: 10, fontSize: 12 }} formatter={v => [`$${v}`, "P&L"]} />
                  <Bar dataKey="pnl" radius={6}>
                    {monthlyData().map((e, i) => <Cell key={i} fill={e.pnl >= 0 ? C.green : C.red} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ background: C.card, borderRadius: 20, padding: "18px 16px", border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Win Rate by Month</div>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={monthlyData()}>
                  <XAxis dataKey="k" tick={{ fill: C.text2, fontSize: 10 }} />
                  <YAxis domain={[0, 100]} hide />
                  <Tooltip contentStyle={{ background: C.card2, border: "none", borderRadius: 10, fontSize: 12 }} formatter={v => [`${v}%`, "Win Rate"]} />
                  <Line type="monotone" dataKey="wr" stroke={C.accent} strokeWidth={2.5} dot={{ fill: C.accent, r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{ background: C.card, borderRadius: 20, padding: "18px 16px", border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Over-trading Days · {periodLabel()}</div>
            <div style={{ fontSize: 12, color: C.text2, marginBottom: 14 }}>Days with 3+ trades</div>
            {overTrading().length === 0
              ? <div style={{ textAlign: "center", color: C.text2, padding: 20 }}>✅ No over-trading in this period</div>
              : overTrading().map((d, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: i < overTrading().length - 1 ? `1px solid ${C.border}` : "none" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{d.d}</div>
                    <div style={{ fontSize: 11, color: C.text2, marginTop: 2 }}>{d.trades} trades · {d.wr}% WR</div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: d.pnl >= 0 ? C.green : C.red }}>{fmt(d.pnl)}</div>
                </div>
              ))
            }
          </div>
        </>
      )}

      {page === "timing" && (
        <>
          <div style={{ fontSize: isMobile ? 20 : 26, fontWeight: 800, marginBottom: 4 }}>Timing Analysis</div>
          <div style={{ fontSize: 12, color: C.text2, marginBottom: 16 }}>Period: {periodLabel()} · {ft.length} trades</div>

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div style={{ background: C.card, borderRadius: 20, padding: "18px 16px", border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Win Rate by Hour</div>
              <div style={{ fontSize: 11, color: C.text2, marginBottom: 14 }}>Israel time (AM/PM)</div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={hourData()}>
                  <XAxis dataKey="h" tick={{ fill: C.text2, fontSize: 8 }} interval={2} />
                  <YAxis domain={[0, 100]} hide />
                  <Tooltip contentStyle={{ background: C.card2, border: "none", borderRadius: 10, fontSize: 12 }} formatter={(v, n, p) => [`${v}% (${p.payload.total})`, "Win Rate"]} />
                  <Bar dataKey="wr" radius={4}>
                    {hourData().map((e, i) => <Cell key={i} fill={e.total === 0 ? C.card2 : e.wr >= 55 ? C.green : e.wr >= 40 ? C.yellow : C.red} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ background: C.card, borderRadius: 20, padding: "18px 16px", border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Performance by Day · {periodLabel()}</div>
              {dayData().filter(d => d.total > 0).map((d, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, width: 36 }}>{d.d}</div>
                  <div style={{ flex: 1, height: 7, background: C.card2, borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ width: `${d.wr}%`, height: "100%", background: d.wr >= 55 ? C.green : d.wr >= 40 ? C.yellow : C.red, borderRadius: 4 }} />
                  </div>
                  <div style={{ fontSize: 12, color: C.text2, width: 36 }}>{d.wr}%</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: d.pnl >= 0 ? C.green : C.red, width: 70, textAlign: "right" }}>{fmt(d.pnl)}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: C.card, borderRadius: 20, padding: "18px 16px", border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>🧠 Timing Insights · {periodLabel()}</div>
            <div style={{ background: `linear-gradient(135deg, rgba(99,102,241,0.08), rgba(6,182,212,0.05))`, borderRadius: 14, padding: 14, border: "1px solid rgba(99,102,241,0.15)", marginTop: 12 }}>
              {aiInsights().filter(i => i.icon === "⏰" || i.icon === "🚫" || i.icon === "📅").map((ins, i) => (
                <div key={i} style={{ fontSize: 13, color: ins.color, lineHeight: 1.7, marginBottom: 6 }}>
                  {ins.icon} {ins.text}
                </div>
              ))}
              {aiInsights().filter(i => i.icon === "⏰" || i.icon === "🚫" || i.icon === "📅").length === 0 &&
                <div style={{ fontSize: 13, color: C.text2 }}>Not enough data in this period for timing analysis (need 3+ trades per hour/day)</div>
              }
            </div>
          </div>
        </>
      )}

      {page === "trades" && (
        <>
          <div style={{ fontSize: isMobile ? 20 : 26, fontWeight: 800, marginBottom: 4 }}>Trade Log</div>
          <div style={{ fontSize: 12, color: C.text2, marginBottom: 16 }}>Period: {periodLabel()} · {ft.length} trades</div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
            {ft.slice(0, 100).map((t, i) => (
              <div key={i} style={{ background: C.card, borderRadius: 16, padding: "14px 16px", border: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: t.direction === "BUY" ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                  {t.direction === "BUY" ? "↑" : "↓"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 800 }}>{t.symbol}</div>
                  <div style={{ fontSize: 11, color: C.text2, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.open_time} · {t.session}</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: t.profit >= 0 ? C.green : C.red }}>{fmt(t.profit || 0)}</div>
                  <div style={{ fontSize: 11, color: C.text2, marginTop: 2 }}>{t.duration_min}min</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {page === "psychology" && (
        <>
          <div style={{ fontSize: isMobile ? 20 : 26, fontWeight: 800, marginBottom: 4 }}>Psychology</div>
          <div style={{ fontSize: 12, color: C.text2, marginBottom: 16 }}>Period: {periodLabel()} · {ft.length} trades analyzed</div>

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3,1fr)", gap: 12, marginBottom: 16 }}>
            {[
              { label: "Max Loss Streak", value: tiltData.maxL, color: tiltData.maxL >= 5 ? C.red : tiltData.maxL >= 3 ? C.yellow : C.green },
              { label: "WR After Loss", value: `${tiltData.wrAfterL}%`, color: tiltData.wrAfterL < 40 ? C.red : tiltData.wrAfterL < 50 ? C.yellow : C.green },
              { label: "WR After Win", value: `${tiltData.wrAfterW}%`, color: tiltData.wrAfterW > 55 ? C.green : C.yellow },
            ].map((k, i) => (
              <div key={i} style={{ background: C.card, borderRadius: 16, padding: 16, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 11, color: C.text3, marginBottom: 6 }}>{k.label}</div>
                <div style={{ fontSize: isMobile ? 26 : 32, fontWeight: 800, color: k.color }}>{k.value}</div>
              </div>
            ))}
          </div>

          {aiInsights().filter(i => ["🔴","⚠️","✅","📊"].includes(i.icon)).map((ins, i) => (
            <div key={i} style={{ background: C.card, borderRadius: 16, padding: 16, marginBottom: 12, border: `1px solid ${ins.color}44` }}>
              <div style={{ fontSize: 13, lineHeight: 1.7, color: ins.color }}>{ins.icon} {ins.text}</div>
            </div>
          ))}

          <div style={{ background: `linear-gradient(135deg, rgba(99,102,241,0.12), rgba(6,182,212,0.08))`, borderRadius: 20, padding: 18, border: "1px solid rgba(99,102,241,0.2)" }}>
            <div style={{ fontSize: 11, color: C.accent, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>● Deep Analysis · {periodLabel()}</div>
            <div style={{ fontSize: 14, color: C.text2, lineHeight: 1.7 }}>
              In this period: <strong style={{ color: C.text }}>{ft.length} trades</strong>, win rate <strong style={{ color: st.win_rate >= 50 ? C.green : C.red }}>{st.win_rate}%</strong>, profit factor <strong style={{ color: st.profit_factor >= 1.5 ? C.green : st.profit_factor >= 1 ? C.yellow : C.red }}>{st.profit_factor}</strong>.
              {st.profit_factor < 1 && " ⚠️ This period shows negative edge — review your setups."}
              {st.profit_factor >= 1 && st.profit_factor < 1.5 && " Marginal edge — focus on consistency and discipline."}
              {st.profit_factor >= 1.5 && " Clear positive edge in this period. Stay disciplined."}
              <br /><br />
              {tiltData.wrAfterL < 40 && "⚠️ Win rate drops significantly after losses. Rule: after 2 losses, stop for the day."}
              {tiltData.wrAfterL >= 40 && "✅ Good recovery after losses — emotional control is solid."}
            </div>
          </div>
        </>
      )}
    </>
  );

  if (isMobile) return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "system-ui, sans-serif", paddingBottom: 80 }}>
      <div style={{ padding: "20px 16px 12px", background: `linear-gradient(180deg, #0f172a 0%, ${C.bg} 100%)` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>Trade<span style={{ color: C.accent }}>Lens</span></div>
            <div style={{ fontSize: 11, color: C.text3 }}>Trading Intelligence</div>
          </div>
          <button onClick={syncData} disabled={syncing} style={{ background: syncing ? C.card2 : C.accent, color: "#fff", border: "none", borderRadius: 12, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            {syncing ? "⟳" : "⟳ Sync"}
          </button>
        </div>
        <PeriodSelector mobile={true} />
      </div>
      <div style={{ padding: "16px" }}><PageContent /></div>
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(10,14,26,0.97)", backdropFilter: "blur(20px)", borderTop: `1px solid ${C.border}`, display: "flex", padding: "10px 0 20px" }}>
        {navItems.map(n => (
          <button key={n.id} onClick={() => setPage(n.id)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", padding: "4px 0" }}>
            <div style={{ fontSize: 20 }}>{n.icon}</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: page === n.id ? C.accent : C.text3 }}>{n.label}</div>
            {page === n.id && <div style={{ width: 4, height: 4, borderRadius: "50%", background: C.accent }} />}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "system-ui, sans-serif", display: "flex" }}>
      <aside style={{ width: 240, background: "#0d1220", borderRight: `1px solid ${C.border}`, padding: "28px 0", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh" }}>
        <div style={{ padding: "0 24px 24px", borderBottom: `1px solid ${C.border}`, marginBottom: 24 }}>
          <div style={{ fontSize: 22, fontWeight: 800 }}>Trade<span style={{ color: C.accent }}>Lens</span></div>
          <div style={{ fontSize: 10, color: C.text3, letterSpacing: 2, marginTop: 2 }}>TRADING INTELLIGENCE</div>
        </div>
        {navItems.map(n => (
          <button key={n.id} onClick={() => setPage(n.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 24px", background: page === n.id ? "rgba(99,102,241,0.1)" : "none", borderLeft: page === n.id ? `3px solid ${C.accent}` : "3px solid transparent", border: "none", borderRight: "none", cursor: "pointer", color: page === n.id ? C.accent : C.text2, fontSize: 14, fontWeight: 600, width: "100%", textAlign: "left" }}>
            <span style={{ fontSize: 18 }}>{n.icon}</span> {n.label}
          </button>
        ))}
        <div style={{ marginTop: "auto", padding: "20px 24px", borderTop: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 12, fontWeight: 700 }}>Supabase Cloud</div>
          <div style={{ fontSize: 11, color: C.green, marginTop: 2 }}>● Connected</div>
        </div>
      </aside>
      <main style={{ flex: 1, padding: "32px 36px", overflowY: "auto" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
            <div style={{ fontSize: 26, fontWeight: 800 }}>{navItems.find(n => n.id === page)?.label}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <PeriodSelector mobile={false} />
              <button onClick={syncData} disabled={syncing} style={{ background: syncing ? C.card2 : C.accent, color: "#fff", border: "none", borderRadius: 10, padding: "7px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                {syncing ? "⟳" : "⟳ Sync"}
              </button>
            </div>
          </div>
          <PageContent />
        </div>
      </main>
    </div>
  );
}