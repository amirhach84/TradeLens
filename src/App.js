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
  if (n === null || n === undefined) return "$0";
  const abs = Math.abs(n);
  const str = abs >= 1000 ? `$${(abs/1000).toFixed(1)}K` : `$${abs.toFixed(0)}`;
  return n >= 0 ? str : `-${str}`;
};

const fmtFull = (n) => {
  const abs = Math.abs(n).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return n >= 0 ? `+$${abs}` : `-$${abs}`;
};

const C = {
  bg: "#0f1117", card: "#1a1d2e", card2: "#242838", card3: "#2d3250",
  border: "rgba(255,255,255,0.07)", border2: "rgba(255,255,255,0.12)",
  green: "#22c55e", green2: "#16a34a", green3: "#14532d",
  red: "#ef4444", red2: "#991b1b",
  yellow: "#f59e0b", blue: "#3b82f6",
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

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

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
  // eslint-disable-next-line no-unused-vars
  const [stats, setStats] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [period, setPeriod] = useState("all");
  const [showCustom, setShowCustom] = useState(false);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [selectedMonth, setSelectedMonth] = useState(null);
  const customRef = useRef(null);

  const loadData = async () => {
    const data = await fetchFromSupabase("trades", "?select=*&order=open_time.desc");
    if (!Array.isArray(data)) return;
    setTrades(data);
    setStats(computeStats(data));
  };

  const syncData = async () => { setSyncing(true); await loadData(); setSyncing(false); };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadData().finally(() => setLoading(false)); }, []);

  useEffect(() => {
    const handler = (e) => { if (customRef.current && !customRef.current.contains(e.target)) setShowCustom(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const computeStats = (data) => {
    const total = data.length;
    const wins = data.filter(t => t.profit > 0).length;
    const pnl = data.reduce((s, t) => s + (t.profit || 0), 0);
    const winP = data.filter(t => t.profit > 0).reduce((s, t) => s + t.profit, 0);
    const lossP = Math.abs(data.filter(t => t.profit < 0).reduce((s, t) => s + t.profit, 0));
    return {
      total, wins, losses: total - wins,
      win_rate: total > 0 ? Math.round(wins / total * 1000) / 10 : 0,
      pnl: Math.round(pnl * 100) / 100,
      profit_factor: lossP > 0 ? Math.round(winP / lossP * 100) / 100 : 0,
      avg_win: wins > 0 ? Math.round(winP / wins * 100) / 100 : 0,
      avg_loss: (total - wins) > 0 ? Math.round(lossP / (total - wins) * 100) / 100 : 0,
    };
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
        const to = new Date(customTo); to.setHours(23,59,59);
        return d >= from && d <= to;
      }
      return true;
    });
  };

  const ft = filtered();
  const st = computeStats(ft);

  // Year data for calendar header
  const yearData = () => {
    const map = {};
    trades.forEach(t => {
      const d = parseIL(t.open_time);
      if (d.getFullYear() !== calYear) return;
      const m = d.getMonth();
      if (!map[m]) map[m] = { pnl: 0, trades: 0, wins: 0 };
      map[m].pnl += t.profit || 0;
      map[m].trades++;
      if (t.profit > 0) map[m].wins++;
    });
    return map;
  };

  // Calendar days for selected month
  const calendarDays = () => {
    const m = selectedMonth !== null ? selectedMonth : calMonth;
    const y = calYear;
    const firstDay = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const map = {};
    trades.forEach(t => {
      const d = parseIL(t.open_time);
      if (d.getFullYear() !== y || d.getMonth() !== m) return;
      const day = d.getDate();
      if (!map[day]) map[day] = { pnl: 0, trades: 0, wins: 0 };
      map[day].pnl += t.profit || 0;
      map[day].trades++;
      if (t.profit > 0) map[day].wins++;
    });
    return { firstDay, daysInMonth, map };
  };

  const periodLabel = () => {
    if (period === "week") return "1W";
    if (period === "month") return "1M";
    if (period === "3m") return "3M";
    if (period === "custom" && customFrom && customTo) return `${customFrom}→${customTo}`;
    return "All";
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
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
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

  const equityData = () => {
    let bal = 0;
    return [...ft].reverse().map((t, i) => ({ i: i+1, bal: parseFloat((bal += t.profit||0).toFixed(2)) }));
  };

  const tilt = () => {
    let maxL = 0, cur = 0, aL = { w:0, t:0 }, aW = { w:0, t:0 };
    const rev = [...ft].reverse();
    rev.forEach(t => { if (t.profit < 0) { cur++; maxL = Math.max(maxL, cur); } else cur = 0; });
    for (let i = 1; i < rev.length; i++) {
      if (rev[i-1].profit < 0) { aL.t++; if (rev[i].profit > 0) aL.w++; }
      if (rev[i-1].profit > 0) { aW.t++; if (rev[i].profit > 0) aW.w++; }
    }
    return { maxL, wrAfterL: aL.t > 0 ? Math.round(aL.w/aL.t*100) : 0, wrAfterW: aW.t > 0 ? Math.round(aW.w/aW.t*100) : 0 };
  };

  const overTrading = () => {
    const map = {};
    ft.forEach(t => {
      const d = parseIL(t.open_time).toLocaleDateString('en-CA');
      if (!map[d]) map[d] = { d, trades:0, pnl:0, wins:0 };
      map[d].trades++;
      map[d].pnl += t.profit||0;
      if (t.profit > 0) map[d].wins++;
    });
    return Object.values(map).filter(d => d.trades > 2).sort((a,b) => b.trades-a.trades).slice(0,8)
      .map(d => ({ ...d, pnl: parseFloat(d.pnl.toFixed(2)), wr: Math.round(d.wins/d.trades*100) }));
  };

  const tiltData = tilt();

  const aiInsights = () => {
    if (!ft.length) return [];
    const ins = [];
    const hours = hourData().filter(h => h.total >= 3).sort((a,b) => b.wr-a.wr);
    const days = dayData().filter(d => d.total >= 3).sort((a,b) => b.wr-a.wr);
    const otDays = overTrading();
    if (st.win_rate < 40) ins.push({ color: C.red, icon: "🔴", text: `Win rate ${st.win_rate}% is below 40% — review entry criteria` });
    if (st.profit_factor >= 1.5) ins.push({ color: C.green, icon: "✅", text: `Strong profit factor ${st.profit_factor} — clear edge` });
    if (st.profit_factor < 1) ins.push({ color: C.red, icon: "⚠️", text: `Profit factor ${st.profit_factor} — losses exceed gains` });
    if (tiltData.maxL >= 3) ins.push({ color: C.red, icon: "🔴", text: `Max consecutive losses: ${tiltData.maxL} — tilt risk` });
    if (tiltData.wrAfterL < 40) ins.push({ color: C.red, icon: "⚠️", text: `Win rate after loss: ${tiltData.wrAfterL}% — possible revenge trading` });
    if (hours.length) ins.push({ color: C.green, icon: "⏰", text: `Best hour: ${hours[0].h} with ${hours[0].wr}% win rate` });
    if (days.length) ins.push({ color: C.green, icon: "📅", text: `Best day: ${days[0].d} with ${days[0].wr}% win rate` });
    if (otDays.length) ins.push({ color: C.yellow, icon: "📊", text: `${otDays.length} over-trading days detected` });
    return ins;
  };

  if (loading) return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100vh", background:C.bg, color:C.text2, gap:16 }}>
      <div style={{ fontSize:32 }}>🔭</div>
      <div style={{ fontSize:16, fontWeight:600 }}>Loading TradeLens...</div>
    </div>
  );

  const yData = yearData();
  const { firstDay, daysInMonth, map: dayMap } = calendarDays();
  const activeMonth = selectedMonth !== null ? selectedMonth : calMonth;

  const PeriodSelector = ({ mobile }) => (
    <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap", position:"relative" }}>
      {[["week","1W"],["month","1M"],["3m","3M"],["all","All"]].map(([v,l]) => (
        <button key={v} onClick={() => { setPeriod(v); setShowCustom(false); }}
          style={{ padding: mobile?"6px 10px":"6px 14px", borderRadius:8, border:"none", background:period===v?C.accent:C.card2, color:period===v?"#fff":C.text2, fontSize:12, fontWeight:700, cursor:"pointer" }}>
          {l}
        </button>
      ))}
      <div ref={customRef} style={{ position:"relative" }}>
        <button onClick={() => setShowCustom(!showCustom)}
          style={{ padding: mobile?"6px 10px":"6px 14px", borderRadius:8, border:"none", background:period==="custom"?C.accent:C.card2, color:period==="custom"?"#fff":C.text2, fontSize:12, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:4 }}>
          📅 {period==="custom"&&customFrom&&customTo?`${customFrom}→${customTo}`:"Custom"}
        </button>
        {showCustom && (
          <div style={{ position:"absolute", top:"calc(100% + 8px)", left:0, background:C.card, border:`1px solid ${C.border2}`, borderRadius:14, padding:16, zIndex:100, minWidth:240, boxShadow:"0 20px 40px rgba(0,0,0,0.6)" }}>
            <div style={{ fontSize:12, color:C.text2, marginBottom:12, fontWeight:700 }}>Custom Date Range</div>
            <div style={{ marginBottom:10 }}>
              <div style={{ fontSize:11, color:C.text3, marginBottom:4 }}>From</div>
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                style={{ width:"100%", background:C.card2, border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 10px", color:C.text, fontSize:13, outline:"none", boxSizing:"border-box" }} />
            </div>
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:11, color:C.text3, marginBottom:4 }}>To</div>
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                style={{ width:"100%", background:C.card2, border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 10px", color:C.text, fontSize:13, outline:"none", boxSizing:"border-box" }} />
            </div>
            <button onClick={() => { if(customFrom&&customTo){setPeriod("custom");setShowCustom(false);}}}
              style={{ width:"100%", padding:"9px", borderRadius:10, border:"none", background:customFrom&&customTo?C.accent:C.card2, color:customFrom&&customTo?"#fff":C.text3, fontSize:13, fontWeight:700, cursor:"pointer" }}>
              Apply
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // ── DASHBOARD PAGE ──
  const DashboardPage = () => (
    <>
      {/* Year strip */}
      <div style={{ background:C.card, borderRadius:16, padding:"16px", marginBottom:16, border:`1px solid ${C.border}` }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <button onClick={() => setCalYear(y => y-1)} style={{ background:C.card2, border:"none", color:C.text2, borderRadius:6, padding:"4px 8px", cursor:"pointer" }}>‹</button>
            <div style={{ fontSize:16, fontWeight:800 }}>{calYear}</div>
            <button onClick={() => setCalYear(y => y+1)} style={{ background:C.card2, border:"none", color:C.text2, borderRadius:6, padding:"4px 8px", cursor:"pointer" }}>›</button>
          </div>
          <div style={{ fontSize:12, color:C.text2 }}>Click month to see calendar</div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(12,1fr)", gap:6 }}>
          {MONTHS.map((m, i) => {
            const d = yData[i];
            const isActive = activeMonth === i && calYear === new Date().getFullYear();
            const pnl = d?.pnl || 0;
            const bg = !d || d.trades === 0 ? C.card2 : pnl > 0 ? (pnl > 5000 ? C.green2 : C.green3) : C.red2;
            return (
              <div key={i} onClick={() => { setCalMonth(i); setSelectedMonth(i); }}
                style={{ background:bg, borderRadius:10, padding:"10px 6px", textAlign:"center", cursor:"pointer", border:isActive?`2px solid ${C.accent}`:`2px solid transparent`, transition:"all 0.15s" }}>
                <div style={{ fontSize:10, color:C.text2, marginBottom:4 }}>{m}</div>
                {d && d.trades > 0 ? (
                  <>
                    <div style={{ fontSize:12, fontWeight:800, color: pnl>=0?C.green:C.red }}>{fmt(pnl)}</div>
                    <div style={{ fontSize:9, color:C.text2, marginTop:2 }}>{d.trades} trades</div>
                  </>
                ) : (
                  <div style={{ fontSize:11, color:C.text3 }}>--</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Calendar grid + Recent trades */}
      <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1.2fr 1fr", gap:16, marginBottom:16 }}>

        {/* Monthly calendar */}
        <div style={{ background:C.card, borderRadius:16, padding:"18px 16px", border:`1px solid ${C.border}` }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
            <div style={{ fontSize:15, fontWeight:800 }}>{MONTHS[activeMonth]} {calYear}</div>
            <div style={{ display:"flex", gap:6 }}>
              <button onClick={() => { const m = activeMonth===0?11:activeMonth-1; setCalMonth(m); setSelectedMonth(m); if(activeMonth===0) setCalYear(y=>y-1); }} style={{ background:C.card2, border:"none", color:C.text2, borderRadius:6, padding:"4px 8px", cursor:"pointer" }}>‹</button>
              <button onClick={() => { const m = activeMonth===11?0:activeMonth+1; setCalMonth(m); setSelectedMonth(m); if(activeMonth===11) setCalYear(y=>y+1); }} style={{ background:C.card2, border:"none", color:C.text2, borderRadius:6, padding:"4px 8px", cursor:"pointer" }}>›</button>
            </div>
          </div>

          {/* Day headers */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3, marginBottom:4 }}>
            {DAYS.map(d => <div key={d} style={{ textAlign:"center", fontSize:10, color:C.text3, fontWeight:700, padding:"4px 0" }}>{d}</div>)}
          </div>

          {/* Days grid */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3 }}>
            {Array.from({length: firstDay}).map((_,i) => <div key={`e${i}`} />)}
            {Array.from({length: daysInMonth}).map((_,i) => {
              const day = i+1;
              const d = dayMap[day];
              const pnl = d?.pnl || 0;
              const hasTrades = d && d.trades > 0;
              const bg = !hasTrades ? "transparent" : pnl > 0 ? `rgba(34,197,94,${Math.min(0.7, 0.15 + pnl/20000)})` : `rgba(239,68,68,${Math.min(0.7, 0.15 + Math.abs(pnl)/20000)})`;
              return (
                <div key={day} style={{ background:bg, borderRadius:6, padding:"4px 2px", textAlign:"center", minHeight:50, border:`1px solid ${hasTrades?pnl>=0?"rgba(34,197,94,0.2)":"rgba(239,68,68,0.2)":C.border}` }}>
                  <div style={{ fontSize:10, color:C.text2, marginBottom:2 }}>{day}</div>
                  {hasTrades && (
                    <>
                      <div style={{ fontSize:10, fontWeight:800, color:pnl>=0?C.green:C.red }}>{fmt(pnl)}</div>
                      <div style={{ fontSize:9, color:C.text3 }}>{d.trades}t · {Math.round(d.wins/d.trades*100)}%</div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent trades + KPIs */}
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {/* KPIs */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            {[
              { label:"Total P&L", value:fmtFull(st.pnl), color:st.pnl>=0?C.green:C.red },
              { label:"Win Rate", value:`${st.win_rate}%`, color:C.accent },
              { label:"Profit Factor", value:st.profit_factor, color:st.profit_factor>=1.5?C.green:st.profit_factor>=1?C.yellow:C.red },
              { label:"Trades", value:st.total, color:C.text },
            ].map((k,i) => (
              <div key={i} style={{ background:C.card, borderRadius:12, padding:"12px 14px", border:`1px solid ${C.border}` }}>
                <div style={{ fontSize:10, color:C.text3, marginBottom:4 }}>{k.label}</div>
                <div style={{ fontSize:18, fontWeight:800, color:k.color }}>{k.value}</div>
              </div>
            ))}
          </div>

          {/* Recent trades */}
          <div style={{ background:C.card, borderRadius:16, padding:"14px", border:`1px solid ${C.border}`, flex:1 }}>
            <div style={{ fontSize:13, fontWeight:700, marginBottom:12 }}>Recent Trades</div>
            {ft.slice(0, 6).map((t, i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom: i<5?`1px solid ${C.border}`:"none" }}>
                <div style={{ width:28, height:28, borderRadius:8, background:t.direction==="BUY"?"rgba(34,197,94,0.12)":"rgba(239,68,68,0.12)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0 }}>
                  {t.direction==="BUY"?"↑":"↓"}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:700 }}>{t.symbol}</div>
                  <div style={{ fontSize:10, color:C.text2 }}>{t.open_time?.split(' ')[0]}</div>
                </div>
                <div style={{ fontSize:13, fontWeight:800, color:t.profit>=0?C.green:C.red }}>{fmtFull(t.profit||0)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Insights */}
      <div style={{ background:C.card, borderRadius:16, padding:"18px 16px", border:`1px solid ${C.border}` }}>
        <div style={{ fontSize:13, fontWeight:700, marginBottom:4 }}>🧠 AI Insights · {periodLabel()}</div>
        <div style={{ fontSize:11, color:C.text2, marginBottom:12 }}>{ft.length} trades analyzed</div>
        <div style={{ background:`linear-gradient(135deg,rgba(99,102,241,0.08),rgba(6,182,212,0.05))`, borderRadius:12, padding:14, border:"1px solid rgba(99,102,241,0.15)" }}>
          {aiInsights().map((ins,i) => (
            <div key={i} style={{ fontSize:13, color:ins.color, lineHeight:1.7, marginBottom:6 }}>{ins.icon} {ins.text}</div>
          ))}
          {aiInsights().length===0 && <div style={{ fontSize:13, color:C.text2 }}>Not enough data for insights in this period.</div>}
        </div>
      </div>
    </>
  );

  // ── OTHER PAGES ──
  const PageContent = () => (
    <>
      {page==="dashboard" && <DashboardPage />}

      {page==="performance" && (
        <>
          <div style={{ fontSize:isMobile?20:26, fontWeight:800, marginBottom:4 }}>Performance</div>
          <div style={{ fontSize:12, color:C.text2, marginBottom:16 }}>Period: {periodLabel()} · {ft.length} trades</div>
          <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:16, marginBottom:16 }}>
            <div style={{ background:C.card, borderRadius:20, padding:"18px 16px", border:`1px solid ${C.border}` }}>
              <div style={{ fontSize:14, fontWeight:700, marginBottom:14 }}>P&L by Month</div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={monthlyData()}>
                  <XAxis dataKey="k" tick={{fill:C.text2,fontSize:10}} />
                  <YAxis hide />
                  <Tooltip contentStyle={{background:C.card2,border:"none",borderRadius:10,fontSize:12}} formatter={v=>[`$${v}`,"P&L"]} />
                  <Bar dataKey="pnl" radius={6}>
                    {monthlyData().map((e,i) => <Cell key={i} fill={e.pnl>=0?C.green:C.red} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ background:C.card, borderRadius:20, padding:"18px 16px", border:`1px solid ${C.border}` }}>
              <div style={{ fontSize:14, fontWeight:700, marginBottom:14 }}>Monthly Win Rate</div>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={monthlyData()}>
                  <XAxis dataKey="k" tick={{fill:C.text2,fontSize:10}} />
                  <YAxis domain={[0,100]} hide />
                  <Tooltip contentStyle={{background:C.card2,border:"none",borderRadius:10,fontSize:12}} formatter={v=>[`${v}%`,"Win Rate"]} />
                  <Line type="monotone" dataKey="wr" stroke={C.accent} strokeWidth={2.5} dot={{fill:C.accent,r:4}} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div style={{ background:C.card, borderRadius:16, padding:"18px 16px", border:`1px solid ${C.border}` }}>
            <div style={{ fontSize:14, fontWeight:700, marginBottom:14 }}>Equity Curve</div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={equityData()}>
                <defs>
                  <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.accent} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={C.accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis hide /><YAxis hide />
                <Tooltip contentStyle={{background:C.card2,border:"none",borderRadius:10,fontSize:12}} formatter={v=>[`$${v}`,"Balance"]} />
                <Area type="monotone" dataKey="bal" stroke={C.accent} fill="url(#g)" strokeWidth={2.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {page==="timing" && (
        <>
          <div style={{ fontSize:isMobile?20:26, fontWeight:800, marginBottom:4 }}>Timing Analysis</div>
          <div style={{ fontSize:12, color:C.text2, marginBottom:16 }}>Period: {periodLabel()} · {ft.length} trades</div>
          <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:16, marginBottom:16 }}>
            <div style={{ background:C.card, borderRadius:20, padding:"18px 16px", border:`1px solid ${C.border}` }}>
              <div style={{ fontSize:14, fontWeight:700, marginBottom:4 }}>Win Rate by Hour</div>
              <div style={{ fontSize:11, color:C.text2, marginBottom:14 }}>Israel time (AM/PM)</div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={hourData()}>
                  <XAxis dataKey="h" tick={{fill:C.text2,fontSize:8}} interval={2} />
                  <YAxis domain={[0,100]} hide />
                  <Tooltip contentStyle={{background:C.card2,border:"none",borderRadius:10,fontSize:12}} formatter={(v,n,p)=>[`${v}% (${p.payload.total})`,"Win Rate"]} />
                  <Bar dataKey="wr" radius={4}>
                    {hourData().map((e,i) => <Cell key={i} fill={e.total===0?C.card2:e.wr>=55?C.green:e.wr>=40?C.yellow:C.red} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ background:C.card, borderRadius:20, padding:"18px 16px", border:`1px solid ${C.border}` }}>
              <div style={{ fontSize:14, fontWeight:700, marginBottom:14 }}>Performance by Day</div>
              {dayData().filter(d=>d.total>0).map((d,i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
                  <div style={{ fontSize:13, fontWeight:700, width:36 }}>{d.d}</div>
                  <div style={{ flex:1, height:7, background:C.card2, borderRadius:4, overflow:"hidden" }}>
                    <div style={{ width:`${d.wr}%`, height:"100%", background:d.wr>=55?C.green:d.wr>=40?C.yellow:C.red, borderRadius:4 }} />
                  </div>
                  <div style={{ fontSize:12, color:C.text2, width:36 }}>{d.wr}%</div>
                  <div style={{ fontSize:12, fontWeight:700, color:d.pnl>=0?C.green:C.red, width:70, textAlign:"right" }}>{fmtFull(d.pnl)}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background:C.card, borderRadius:16, padding:"18px 16px", border:`1px solid ${C.border}` }}>
            <div style={{ fontSize:14, fontWeight:700, marginBottom:12 }}>Sessions</div>
            {sessionData().map((s,i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
                <div style={{ fontSize:12, color:C.text2, width:120 }}>{s.s}</div>
                <div style={{ flex:1, height:8, background:C.card2, borderRadius:4, overflow:"hidden" }}>
                  <div style={{ width:`${s.wr}%`, height:"100%", background:s.wr>=55?C.green:s.wr>=40?C.yellow:C.red, borderRadius:4 }} />
                </div>
                <div style={{ fontSize:13, fontWeight:700, color:s.wr>=55?C.green:s.wr>=40?C.yellow:C.red, width:36 }}>{s.wr}%</div>
                <div style={{ fontSize:11, color:C.text2, width:50 }}>{s.total} trades</div>
              </div>
            ))}
          </div>
        </>
      )}

      {page==="trades" && (
        <>
          <div style={{ fontSize:isMobile?20:26, fontWeight:800, marginBottom:4 }}>Trade Log</div>
          <div style={{ fontSize:12, color:C.text2, marginBottom:16 }}>Period: {periodLabel()} · {ft.length} trades</div>
          <div style={{ background:C.card, borderRadius:16, border:`1px solid ${C.border}`, overflow:"hidden" }}>
            <div style={{ display:"grid", gridTemplateColumns:"auto 1fr auto auto auto", gap:0, padding:"10px 16px", borderBottom:`1px solid ${C.border}`, background:C.card2 }}>
              {["","Symbol","Close Date","P&L","WR"].map((h,i) => <div key={i} style={{ fontSize:11, color:C.text3, fontWeight:700 }}>{h}</div>)}
            </div>
            {ft.slice(0,60).map((t,i) => (
              <div key={i} style={{ display:"grid", gridTemplateColumns:"36px 1fr auto auto auto", alignItems:"center", gap:12, padding:"12px 16px", borderBottom:i<ft.length-1?`1px solid ${C.border}`:"none", background:i%2===0?"transparent":C.card2+"44" }}>
                <div style={{ width:28, height:28, borderRadius:8, background:t.direction==="BUY"?"rgba(34,197,94,0.12)":"rgba(239,68,68,0.12)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>
                  {t.direction==="BUY"?"↑":"↓"}
                </div>
                <div>
                  <div style={{ fontSize:13, fontWeight:700 }}>{t.symbol}</div>
                  <div style={{ fontSize:11, color:C.text2 }}>{t.session}</div>
                </div>
                <div style={{ fontSize:12, color:C.text2 }}>{t.open_time?.split(' ')[0]}</div>
                <div style={{ fontSize:13, fontWeight:800, color:t.profit>=0?C.green:C.red, textAlign:"right" }}>{fmtFull(t.profit||0)}</div>
                <div style={{ width:8, height:8, borderRadius:"50%", background:t.profit>=0?C.green:C.red, boxShadow:`0 0 5px ${t.profit>=0?C.green:C.red}` }} />
              </div>
            ))}
          </div>
        </>
      )}

      {page==="psychology" && (
        <>
          <div style={{ fontSize:isMobile?20:26, fontWeight:800, marginBottom:4 }}>Psychology</div>
          <div style={{ fontSize:12, color:C.text2, marginBottom:16 }}>Period: {periodLabel()} · {ft.length} trades</div>
          <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr 1fr":"repeat(3,1fr)", gap:12, marginBottom:16 }}>
            {[
              { label:"Max Loss Streak", value:tiltData.maxL, color:tiltData.maxL>=5?C.red:tiltData.maxL>=3?C.yellow:C.green },
              { label:"WR After Loss", value:`${tiltData.wrAfterL}%`, color:tiltData.wrAfterL<40?C.red:tiltData.wrAfterL<50?C.yellow:C.green },
              { label:"WR After Win", value:`${tiltData.wrAfterW}%`, color:tiltData.wrAfterW>55?C.green:C.yellow },
            ].map((k,i) => (
              <div key={i} style={{ background:C.card, borderRadius:16, padding:16, border:`1px solid ${C.border}` }}>
                <div style={{ fontSize:11, color:C.text3, marginBottom:6 }}>{k.label}</div>
                <div style={{ fontSize:isMobile?26:32, fontWeight:800, color:k.color }}>{k.value}</div>
              </div>
            ))}
          </div>
          {aiInsights().map((ins,i) => (
            <div key={i} style={{ background:C.card, borderRadius:16, padding:16, marginBottom:12, border:`1px solid ${ins.color}44` }}>
              <div style={{ fontSize:13, lineHeight:1.7, color:ins.color }}>{ins.icon} {ins.text}</div>
            </div>
          ))}
          <div style={{ background:`linear-gradient(135deg,rgba(99,102,241,0.12),rgba(6,182,212,0.08))`, borderRadius:20, padding:18, border:"1px solid rgba(99,102,241,0.2)" }}>
            <div style={{ fontSize:11, color:C.accent, letterSpacing:2, textTransform:"uppercase", marginBottom:10 }}>● Deep Analysis · {periodLabel()}</div>
            <div style={{ fontSize:14, color:C.text2, lineHeight:1.7 }}>
              {ft.length} trades · Win rate <strong style={{color:st.win_rate>=50?C.green:C.red}}>{st.win_rate}%</strong> · Profit factor <strong style={{color:st.profit_factor>=1.5?C.green:st.profit_factor>=1?C.yellow:C.red}}>{st.profit_factor}</strong>.
              {st.profit_factor<1&&" ⚠️ Negative edge — review your setups."}
              {st.profit_factor>=1&&st.profit_factor<1.5&&" Marginal edge — stay disciplined."}
              {st.profit_factor>=1.5&&" Clear positive edge. Stay consistent."}
              <br/><br/>
              {tiltData.wrAfterL<40&&"⚠️ Win rate drops after losses. Rule: stop after 2 losses per day."}
              {tiltData.wrAfterL>=40&&"✅ Good recovery after losses."}
            </div>
          </div>
        </>
      )}
    </>
  );

  if (isMobile) return (
    <div style={{ background:C.bg, minHeight:"100vh", color:C.text, fontFamily:"system-ui,sans-serif", paddingBottom:80 }}>
      <div style={{ padding:"18px 16px 12px", background:`linear-gradient(180deg,#0f172a 0%,${C.bg} 100%)` }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
          <div>
            <div style={{ fontSize:22, fontWeight:800 }}>Trade<span style={{color:C.accent}}>Lens</span></div>
            <div style={{ fontSize:11, color:C.text3 }}>Trading Intelligence</div>
          </div>
          <button onClick={syncData} disabled={syncing} style={{ background:syncing?C.card2:C.accent, color:"#fff", border:"none", borderRadius:12, padding:"8px 14px", fontSize:13, fontWeight:700, cursor:"pointer" }}>
            {syncing?"⟳":"⟳ Sync"}
          </button>
        </div>
        <PeriodSelector mobile={true} />
      </div>
      <div style={{ padding:"14px 14px" }}><PageContent /></div>
      <div style={{ position:"fixed", bottom:0, left:0, right:0, background:"rgba(15,17,23,0.97)", backdropFilter:"blur(20px)", borderTop:`1px solid ${C.border}`, display:"flex", padding:"10px 0 20px" }}>
        {navItems.map(n => (
          <button key={n.id} onClick={() => setPage(n.id)} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4, background:"none", border:"none", cursor:"pointer", padding:"4px 0" }}>
            <div style={{ fontSize:20 }}>{n.icon}</div>
            <div style={{ fontSize:10, fontWeight:700, color:page===n.id?C.accent:C.text3 }}>{n.label}</div>
            {page===n.id&&<div style={{ width:4, height:4, borderRadius:"50%", background:C.accent }} />}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ background:C.bg, minHeight:"100vh", color:C.text, fontFamily:"system-ui,sans-serif", display:"flex" }}>
      <aside style={{ width:230, background:"#0d1117", borderRight:`1px solid ${C.border}`, padding:"28px 0", display:"flex", flexDirection:"column", position:"sticky", top:0, height:"100vh" }}>
        <div style={{ padding:"0 24px 24px", borderBottom:`1px solid ${C.border}`, marginBottom:24 }}>
          <div style={{ fontSize:22, fontWeight:800 }}>Trade<span style={{color:C.accent}}>Lens</span></div>
          <div style={{ fontSize:10, color:C.text3, letterSpacing:2, marginTop:2 }}>TRADING INTELLIGENCE</div>
        </div>
        {navItems.map(n => (
          <button key={n.id} onClick={() => setPage(n.id)} style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 24px", background:page===n.id?"rgba(99,102,241,0.1)":"none", borderLeft:page===n.id?`3px solid ${C.accent}`:"3px solid transparent", border:"none", borderRight:"none", cursor:"pointer", color:page===n.id?C.accent:C.text2, fontSize:14, fontWeight:600, width:"100%", textAlign:"left" }}>
            <span style={{fontSize:18}}>{n.icon}</span> {n.label}
          </button>
        ))}
        <div style={{ marginTop:"auto", padding:"20px 24px", borderTop:`1px solid ${C.border}` }}>
          <div style={{ fontSize:12, fontWeight:700 }}>Supabase Cloud</div>
          <div style={{ fontSize:11, color:C.green, marginTop:2 }}>● Connected</div>
        </div>
      </aside>
      <main style={{ flex:1, padding:"28px 32px", overflowY:"auto" }}>
        <div style={{ maxWidth:1200, margin:"0 auto" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:12 }}>
            <div style={{ fontSize:24, fontWeight:800 }}>{navItems.find(n=>n.id===page)?.label}</div>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <PeriodSelector mobile={false} />
              <button onClick={syncData} disabled={syncing} style={{ background:syncing?C.card2:C.accent, color:"#fff", border:"none", borderRadius:10, padding:"7px 16px", fontSize:13, fontWeight:700, cursor:"pointer" }}>
                {syncing?"⟳":"⟳ Sync"}
              </button>
            </div>
          </div>
          <PageContent />
        </div>
      </main>
    </div>
  );
}