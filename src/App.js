import { useState, useEffect } from "react";
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

const fmt = (n) => n >= 0 ? `+$${Math.abs(n).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `-$${Math.abs(n).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const C = {
  bg: "#0a0e1a", card: "#111827", card2: "#1a2235",
  border: "rgba(255,255,255,0.06)",
  green: "#22c55e", red: "#ef4444", yellow: "#f59e0b", blue: "#3b82f6",
  accent: "#6366f1", cyan: "#06b6d4",
  text: "#f1f5f9", text2: "#94a3b8", text3: "#475569",
};

const navItems = [
  { id: "dashboard", icon: "⊞", label: "Dashboard" },
  { id: "performance", icon: "📈", label: "Performance" },
  { id: "timing", icon: "⏱", label: "Timing" },
  { id: "trades", icon: "📋", label: "Trades" },
  { id: "psychology", icon: "🧠", label: "Mind" },
];

export default function App() {
  const [trades, setTrades] = useState([]);
  const [stats, setStats] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
// eslint-disable-next-line no-unused-vars
const [lastSync, setLastSync] = useState(null);
  const [period, setPeriod] = useState("all");

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
    setLastSync(new Date().toLocaleTimeString('he-IL'));
  };

  const syncData = async () => { setSyncing(true); await loadData(); setSyncing(false); };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadData().finally(() => setLoading(false)); }, []);

  const filtered = () => {
    const now = new Date();
    return trades.filter(t => {
      const d = parseIL(t.open_time);
      if (period === "week") return (now - d) < 7 * 86400000;
      if (period === "month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      if (period === "3m") return (now - d) < 90 * 86400000;
      return true;
    });
  };

  const equityData = () => {
    let bal = 0;
    return [...filtered()].reverse().map((t, i) => ({ i: i + 1, bal: parseFloat((bal += t.profit || 0).toFixed(2)) }));
  };

  const monthlyData = () => {
    const map = {};
    trades.forEach(t => {
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
    trades.forEach(t => {
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
    trades.forEach(t => {
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
    trades.forEach(t => {
      const s = t.session || "Unknown";
      if (!map[s]) map[s] = { s, wins: 0, total: 0 };
      map[s].total++;
      if (t.profit > 0) map[s].wins++;
    });
    return Object.values(map).map(v => ({ ...v, wr: Math.round(v.wins / v.total * 100) })).sort((a, b) => b.wr - a.wr);
  };

  const tilt = () => {
    let maxL = 0, cur = 0, aL = { w: 0, t: 0 }, aW = { w: 0, t: 0 };
    const rev = [...trades].reverse();
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
    trades.forEach(t => {
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

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", background: C.bg, color: C.text2, fontFamily: "'Nunito', sans-serif", gap: 16 }}>
      <div style={{ fontSize: 32 }}>🔭</div>
      <div style={{ fontSize: 16, fontWeight: 600 }}>Loading TradeLens...</div>
    </div>
  );

  const st = computeStats(filtered());
  const tiltData = tilt();

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "'Nunito', -apple-system, sans-serif", maxWidth: 480, margin: "0 auto", paddingBottom: 80 }}>

      {/* Header */}
      <div style={{ padding: "20px 20px 0", background: `linear-gradient(180deg, #0f172a 0%, ${C.bg} 100%)` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>
              Trade<span style={{ color: C.accent }}>Lens</span>
            </div>
            <div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>Trading Intelligence</div>
          </div>
          <button onClick={syncData} disabled={syncing} style={{ background: syncing ? C.card2 : C.accent, color: "#fff", border: "none", borderRadius: 12, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            {syncing ? "⟳" : "⟳ Sync"}
          </button>
        </div>

        {/* Period selector */}
        <div style={{ display: "flex", gap: 8, marginTop: 16, marginBottom: 4 }}>
          {[["week", "1W"], ["month", "1M"], ["3m", "3M"], ["all", "All"]].map(([v, l]) => (
            <button key={v} onClick={() => setPeriod(v)} style={{ flex: 1, padding: "7px 0", borderRadius: 10, border: "none", background: period === v ? C.accent : C.card2, color: period === v ? "#fff" : C.text2, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "16px 20px" }}>

        {/* ── DASHBOARD ── */}
        {page === "dashboard" && (
          <>
            {/* Main P&L card */}
            <div style={{ background: `linear-gradient(135deg, ${C.accent} 0%, ${C.cyan} 100%)`, borderRadius: 20, padding: "24px 20px", marginBottom: 16, position: "relative", overflow: "hidden" }}>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginBottom: 4 }}>Total P&L</div>
              <div style={{ fontSize: 36, fontWeight: 800, color: "#fff", letterSpacing: -1 }}>{fmt(st.pnl)}</div>
              <div style={{ display: "flex", gap: 20, marginTop: 16 }}>
                <div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>Win Rate</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>{st.win_rate}%</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>Trades</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>{st.total}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>Profit Factor</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>{st.profit_factor}</div>
                </div>
              </div>
              <div style={{ position: "absolute", right: -20, top: -20, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
            </div>

            {/* KPI grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              {[
                { label: "Wins", value: st.wins, color: C.green, icon: "✓" },
                { label: "Losses", value: st.losses, color: C.red, icon: "✗" },
                { label: "Avg Win", value: `$${st.avg_win}`, color: C.green, icon: "↑" },
                { label: "Avg Loss", value: `$${st.avg_loss}`, color: C.red, icon: "↓" },
              ].map((k, i) => (
                <div key={i} style={{ background: C.card, borderRadius: 16, padding: "16px", border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 11, color: C.text3, marginBottom: 6 }}>{k.label}</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: k.color }}>{k.value}</div>
                </div>
              ))}
            </div>

            {/* Equity curve */}
            <div style={{ background: C.card, borderRadius: 20, padding: "18px 16px", marginBottom: 16, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Equity Curve</div>
              <ResponsiveContainer width="100%" height={140}>
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

            {/* Session breakdown */}
            <div style={{ background: C.card, borderRadius: 20, padding: "18px 16px", border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Sessions</div>
              {sessionData().map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: C.text2, width: 120 }}>{s.s}</div>
                  <div style={{ flex: 1, height: 8, background: C.card2, borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ width: `${s.wr}%`, height: "100%", background: s.wr >= 55 ? C.green : s.wr >= 40 ? C.yellow : C.red, borderRadius: 4 }} />
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: s.wr >= 55 ? C.green : s.wr >= 40 ? C.yellow : C.red, width: 36, textAlign: "right" }}>{s.wr}%</div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── PERFORMANCE ── */}
        {page === "performance" && (
          <>
            <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>Performance</div>

            <div style={{ background: C.card, borderRadius: 20, padding: "18px 16px", marginBottom: 16, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Monthly P&L</div>
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

            <div style={{ background: C.card, borderRadius: 20, padding: "18px 16px", marginBottom: 16, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Monthly Win Rate</div>
              <ResponsiveContainer width="100%" height={150}>
                <LineChart data={monthlyData()}>
                  <XAxis dataKey="k" tick={{ fill: C.text2, fontSize: 10 }} />
                  <YAxis domain={[0, 100]} hide />
                  <Tooltip contentStyle={{ background: C.card2, border: "none", borderRadius: 10, fontSize: 12 }} formatter={v => [`${v}%`, "Win Rate"]} />
                  <Line type="monotone" dataKey="wr" stroke={C.accent} strokeWidth={2.5} dot={{ fill: C.accent, r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Over-trading */}
            <div style={{ background: C.card, borderRadius: 20, padding: "18px 16px", border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Over-trading Days</div>
              <div style={{ fontSize: 12, color: C.text2, marginBottom: 14 }}>Days with 3+ trades</div>
              {overTrading().length === 0
                ? <div style={{ textAlign: "center", color: C.text2, padding: 20 }}>✅ No over-trading detected</div>
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

        {/* ── TIMING ── */}
        {page === "timing" && (
          <>
            <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>Timing Analysis</div>

            <div style={{ background: C.card, borderRadius: 20, padding: "18px 16px", marginBottom: 16, border: `1px solid ${C.border}` }}>
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

            <div style={{ background: C.card, borderRadius: 20, padding: "18px 16px", marginBottom: 16, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Performance by Day</div>
              {dayData().filter(d => d.total > 0).map((d, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, width: 36 }}>{d.d}</div>
                  <div style={{ flex: 1, height: 8, background: C.card2, borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ width: `${d.wr}%`, height: "100%", background: d.wr >= 55 ? C.green : d.wr >= 40 ? C.yellow : C.red, borderRadius: 4 }} />
                  </div>
                  <div style={{ fontSize: 12, color: C.text2, width: 50, textAlign: "right" }}>{d.wr}%</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: d.pnl >= 0 ? C.green : C.red, width: 70, textAlign: "right" }}>{fmt(d.pnl)}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── TRADES ── */}
        {page === "trades" && (
          <>
            <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>Trade Log</div>
            {trades.slice(0, 50).map((t, i) => (
              <div key={i} style={{ background: C.card, borderRadius: 16, padding: "14px 16px", marginBottom: 10, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: t.direction === "BUY" ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
                  {t.direction === "BUY" ? "↑" : "↓"}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 800 }}>{t.symbol}</div>
                  <div style={{ fontSize: 11, color: C.text2, marginTop: 3 }}>{t.open_time} · {t.session}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: t.profit >= 0 ? C.green : C.red }}>{fmt(t.profit || 0)}</div>
                  <div style={{ fontSize: 11, color: C.text2, marginTop: 2 }}>{t.duration_min}min</div>
                </div>
              </div>
            ))}
          </>
        )}

        {/* ── PSYCHOLOGY ── */}
        {page === "psychology" && (
          <>
            <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>Psychology</div>

            {/* Tilt cards */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div style={{ background: tiltData.maxL >= 5 ? "rgba(239,68,68,0.12)" : "rgba(34,197,94,0.08)", borderRadius: 16, padding: 16, border: `1px solid ${tiltData.maxL >= 5 ? "rgba(239,68,68,0.3)" : C.border}` }}>
                <div style={{ fontSize: 11, color: C.text2 }}>Max Losses Streak</div>
                <div style={{ fontSize: 32, fontWeight: 800, color: tiltData.maxL >= 5 ? C.red : C.green, marginTop: 4 }}>{tiltData.maxL}</div>
              </div>
              <div style={{ background: tiltData.wrAfterL < 40 ? "rgba(239,68,68,0.12)" : "rgba(34,197,94,0.08)", borderRadius: 16, padding: 16, border: `1px solid ${tiltData.wrAfterL < 40 ? "rgba(239,68,68,0.3)" : C.border}` }}>
                <div style={{ fontSize: 11, color: C.text2 }}>WR After Loss</div>
                <div style={{ fontSize: 32, fontWeight: 800, color: tiltData.wrAfterL < 40 ? C.red : C.green, marginTop: 4 }}>{tiltData.wrAfterL}%</div>
              </div>
            </div>

            {/* Insights */}
            {[
              tiltData.maxL >= 3 && { color: C.red, icon: "🔴", title: "Tilt Risk", text: `Your longest losing streak is ${tiltData.maxL} trades. Consider a daily loss limit rule.` },
              tiltData.wrAfterL < 40 && { color: C.red, icon: "⚠️", title: "Revenge Trading", text: `Win rate after a loss: ${tiltData.wrAfterL}%. You tend to overtrade after losses.` },
              tiltData.wrAfterW > 60 && { color: C.green, icon: "✅", title: "Good Momentum", text: `Win rate after a win: ${tiltData.wrAfterW}%. You ride momentum well.` },
              overTrading().length > 0 && { color: C.yellow, icon: "📊", title: "Over-trading", text: `${overTrading().length} days with 3+ trades. Worst: ${overTrading()[0].d} (${overTrading()[0].trades} trades, ${fmt(overTrading()[0].pnl)})` },
            ].filter(Boolean).map((ins, i) => (
              <div key={i} style={{ background: C.card, borderRadius: 16, padding: 16, marginBottom: 12, border: `1px solid ${ins.color}44` }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: ins.color, marginBottom: 6 }}>{ins.icon} {ins.title}</div>
                <div style={{ fontSize: 13, color: C.text2, lineHeight: 1.6 }}>{ins.text}</div>
              </div>
            ))}

            {/* Deep analysis */}
            <div style={{ background: `linear-gradient(135deg, rgba(99,102,241,0.12), rgba(6,182,212,0.08))`, borderRadius: 20, padding: 18, border: "1px solid rgba(99,102,241,0.2)" }}>
              <div style={{ fontSize: 11, color: C.accent, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>● Deep Analysis</div>
              <div style={{ fontSize: 14, color: C.text2, lineHeight: 1.7 }}>
                With <strong style={{ color: C.text }}>{stats?.total} trades</strong> and {stats?.win_rate}% win rate, your profit factor is <strong style={{ color: stats?.profit_factor >= 1.5 ? C.green : C.yellow }}>{stats?.profit_factor}</strong>.
                {stats?.profit_factor < 1 && " ⚠️ Below 1 — losses exceed gains. Focus on quality over quantity."}
                {stats?.profit_factor >= 1 && stats?.profit_factor < 1.5 && " Your edge is real but fragile. Stay consistent."}
                {stats?.profit_factor >= 1.5 && " Strong edge. Protect it with discipline."}
              </div>
            </div>
          </>
        )}

      </div>

      {/* Bottom Navigation */}
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: "rgba(10,14,26,0.95)", backdropFilter: "blur(20px)", borderTop: `1px solid ${C.border}`, display: "flex", padding: "10px 0 20px" }}>
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
}