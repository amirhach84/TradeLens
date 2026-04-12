import { useState, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, LineChart, Line, ScatterChart, Scatter } from "recharts";

const SUPABASE_URL = "https://ehwbdzrbypsdzrsfpboj.supabase.co";
const SUPABASE_KEY = "sb_publishable_9cg409A6X_8S9mPevUN8Uw_i2jfmDX9";

const fetchFromSupabase = async (table, query = "") => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query}`, {
    headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` }
  });
  return res.json();
};

const colors = {
  bg: "#080b0f", surface: "#111820", surface2: "#162030",
  border: "rgba(255,255,255,0.06)", border2: "rgba(255,255,255,0.12)",
  accent: "#00e5ff", accent2: "#7b61ff",
  green: "#00e096", red: "#ff4d6a", yellow: "#ffd166", orange: "#ff9f43",
  text: "#e8edf5", text2: "#7a8899", text3: "#3d4f61",
};

const s = {
  app: { background: colors.bg, minHeight: "100vh", color: colors.text, fontFamily: "'Segoe UI', sans-serif", display: "flex" },
  sidebar: { width: 220, background: "rgba(8,11,15,0.95)", borderRight: `1px solid ${colors.border}`, padding: "28px 0", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh", overflowY: "auto" },
  logo: { padding: "0 24px 24px", borderBottom: `1px solid ${colors.border}`, marginBottom: 20 },
  logoText: { fontSize: 22, fontWeight: 800, letterSpacing: -0.5 },
  logoSub: { fontSize: 10, color: colors.text3, letterSpacing: 2, marginTop: 2, fontFamily: "monospace" },
  navItem: (active) => ({ display: "flex", alignItems: "center", gap: 10, padding: "9px 24px", cursor: "pointer", fontSize: 13, fontWeight: 500, color: active ? colors.accent : colors.text2, background: active ? "rgba(0,229,255,0.08)" : "transparent", borderLeft: active ? `3px solid ${colors.accent}` : "3px solid transparent", transition: "all 0.15s" }),
  navSection: { padding: "12px 24px 4px", fontSize: 9, color: colors.text3, letterSpacing: 2, textTransform: "uppercase", fontFamily: "monospace" },
  main: { flex: 1, padding: "28px 32px", overflowY: "auto" },
  pageTitle: { fontSize: 24, fontWeight: 700, letterSpacing: -0.5 },
  pageSub: { fontSize: 12, color: colors.text2, marginTop: 4, fontFamily: "monospace" },
  kpiRow: (cols = 4) => ({ display: "grid", gridTemplateColumns: `repeat(${cols},1fr)`, gap: 14, margin: "20px 0" }),
  card: { background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 14, padding: "18px 20px" },
  cardTitle: { fontSize: 13, fontWeight: 600, marginBottom: 16, color: colors.text },
  kpiLabel: { fontSize: 10, color: colors.text3, letterSpacing: 1.5, textTransform: "uppercase", fontFamily: "monospace", marginBottom: 8 },
  kpiValue: (color) => ({ fontSize: 26, fontWeight: 700, letterSpacing: -1, color: color || colors.text }),
  kpiSub: { fontSize: 11, color: colors.text2, marginTop: 6, fontFamily: "monospace" },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 },
  grid3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 },
  tradeRow: { display: "grid", gridTemplateColumns: "32px 1fr auto auto 8px", alignItems: "center", gap: 12, padding: "10px 14px", background: colors.bg, borderRadius: 10, marginBottom: 6, border: `1px solid transparent`, transition: "all 0.15s" },
  dirBadge: (dir) => ({ width: 30, height: 30, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, background: dir === "BUY" ? "rgba(0,224,150,0.12)" : "rgba(255,77,106,0.12)", color: dir === "BUY" ? colors.green : colors.red }),
  dot: (win) => ({ width: 7, height: 7, borderRadius: "50%", background: win ? colors.green : colors.red, boxShadow: `0 0 5px ${win ? colors.green : colors.red}` }),
  aiBubble: { background: "linear-gradient(135deg,rgba(123,97,255,0.08),rgba(0,229,255,0.04))", border: "1px solid rgba(123,97,255,0.2)", borderRadius: 12, padding: "14px 16px", marginTop: 14 },
  aiLabel: { fontSize: 9, color: colors.accent2, letterSpacing: 2, fontFamily: "monospace", marginBottom: 8, textTransform: "uppercase" },
  aiText: { fontSize: 13, color: colors.text2, lineHeight: 1.7 },
  insightCard: { background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 12, padding: "14px 16px", marginBottom: 10 },
  badge: (color) => ({ display: "inline-block", fontSize: 10, padding: "2px 8px", borderRadius: 4, background: `${color}22`, color, fontFamily: "monospace" }),
  loading: { display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontSize: 16, color: colors.text2 },
  syncBtn: (syncing) => ({ padding: "5px 14px", borderRadius: 8, border: "none", background: syncing ? colors.surface : colors.accent, color: syncing ? colors.text2 : "#000", fontSize: 12, fontWeight: 600, cursor: syncing ? "not-allowed" : "pointer" }),
  tooltip: { background: colors.surface2, border: "none", borderRadius: 8, fontSize: 11 },
};

function KPI({ label, value, sub, color }) {
  return (
    <div style={s.card}>
      <div style={s.kpiLabel}>{label}</div>
      <div style={s.kpiValue(color)}>{value}</div>
      <div style={s.kpiSub}>{sub}</div>
    </div>
  );
}

function SectionTitle({ children }) {
  return <div style={{ fontSize: 11, color: colors.text3, letterSpacing: 2, textTransform: "uppercase", fontFamily: "monospace", margin: "24px 0 12px" }}>{children}</div>;
}

function SessionBadge({ session }) {
  const map = { "London": colors.green, "London/NY Overlap": colors.accent, "New York": colors.yellow, "Asia": colors.red, "Off Hours": colors.text3 };
  return <span style={s.badge(map[session] || colors.text3)}>{session}</span>;
}

export default function App() {
  const [trades, setTrades] = useState([]);
  const [stats, setStats] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [period, setPeriod] = useState("all");

  const computeStats = (tradesData) => {
    const total = tradesData.length;
    const wins = tradesData.filter(t => t.profit > 0).length;
    const totalPnl = tradesData.reduce((s, t) => s + (t.profit || 0), 0);
    const rrTrades = tradesData.filter(t => t.rr_actual);
    const avgRr = rrTrades.length > 0 ? rrTrades.reduce((s, t) => s + t.rr_actual, 0) / rrTrades.length : 0;
    const winProfits = tradesData.filter(t => t.profit > 0).reduce((s, t) => s + t.profit, 0);
    const lossProfits = Math.abs(tradesData.filter(t => t.profit < 0).reduce((s, t) => s + t.profit, 0));
    return {
      total_trades: total,
      wins, losses: total - wins,
      win_rate: total > 0 ? Math.round(wins / total * 1000) / 10 : 0,
      total_pnl: Math.round(totalPnl * 100) / 100,
      avg_rr: Math.round(avgRr * 100) / 100,
      profit_factor: lossProfits > 0 ? Math.round(winProfits / lossProfits * 100) / 100 : 0,
      avg_win: wins > 0 ? Math.round(winProfits / wins * 100) / 100 : 0,
      avg_loss: (total - wins) > 0 ? Math.round(lossProfits / (total - wins) * 100) / 100 : 0,
    };
  };

  const loadData = async () => {
    const tradesData = await fetchFromSupabase("trades", "?select=*&order=open_time.desc");
    if (!Array.isArray(tradesData)) return;
    setTrades(tradesData);
    setStats(computeStats(tradesData));
    setLastSync(new Date().toLocaleTimeString());
  };

  const syncData = async () => { setSyncing(true); await loadData(); setSyncing(false); };

  useEffect(() => { loadData().finally(() => setLoading(false)); }, []);

  // Filter by period
  const filteredTrades = () => {
    const now = new Date();
    return trades.filter(t => {
      const d = new Date(t.open_time);
      if (period === "week") return (now - d) < 7 * 86400000;
      if (period === "month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      if (period === "3month") return (now - d) < 90 * 86400000;
      return true;
    });
  };

  // Equity curve
  const equityData = () => {
    let bal = 0;
    return [...filteredTrades()].reverse().map((t, i) => ({ name: i + 1, balance: parseFloat((bal += t.profit || 0).toFixed(2)) }));
  };

  // Weekly P&L
  const weeklyData = () => {
    const map = {};
    trades.forEach(t => {
      const d = new Date(t.open_time);
      const week = `W${Math.ceil(d.getDate() / 7)} ${d.toLocaleString('en', { month: 'short' })}`;
      if (!map[week]) map[week] = { week, pnl: 0, trades: 0, wins: 0 };
      map[week].pnl += t.profit || 0;
      map[week].trades++;
      if (t.profit > 0) map[week].wins++;
    });
    return Object.values(map).slice(-12).map(w => ({ ...w, pnl: parseFloat(w.pnl.toFixed(2)) }));
  };

  // Monthly P&L
  const monthlyData = () => {
    const map = {};
    trades.forEach(t => {
      const d = new Date(t.open_time);
      const key = d.toLocaleString('en', { month: 'short', year: '2-digit' });
      if (!map[key]) map[key] = { month: key, pnl: 0, trades: 0, wins: 0 };
      map[key].pnl += t.profit || 0;
      map[key].trades++;
      if (t.profit > 0) map[key].wins++;
    });
    return Object.values(map).map(m => ({ ...m, pnl: parseFloat(m.pnl.toFixed(2)), winRate: Math.round(m.wins / m.trades * 100) }));
  };

  // Hour analysis
  const hourData = () => {
    const map = {};
    trades.forEach(t => {
      const h = new Date(t.open_time).getHours();
      if (!map[h]) map[h] = { hour: `${h}:00`, wins: 0, total: 0, pnl: 0 };
      map[h].total++;
      map[h].pnl += t.profit || 0;
      if (t.profit > 0) map[h].wins++;
    });
    return Array.from({ length: 24 }, (_, i) => map[i] || { hour: `${i}:00`, wins: 0, total: 0, pnl: 0 })
      .map(h => ({ ...h, winRate: h.total > 0 ? Math.round(h.wins / h.total * 100) : 0, pnl: parseFloat(h.pnl.toFixed(2)) }));
  };

  // Day of week
  const dayData = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const map = {};
    trades.forEach(t => {
      const d = days[new Date(t.open_time).getDay()];
      if (!map[d]) map[d] = { day: d, wins: 0, total: 0, pnl: 0 };
      map[d].total++;
      map[d].pnl += t.profit || 0;
      if (t.profit > 0) map[d].wins++;
    });
    return days.map(d => map[d] ? { ...map[d], winRate: Math.round(map[d].wins / map[d].total * 100), pnl: parseFloat(map[d].pnl.toFixed(2)) } : { day: d, wins: 0, total: 0, pnl: 0, winRate: 0 });
  };

  // Over-trading days
  const overTradingDays = () => {
    const map = {};
    trades.forEach(t => {
      const d = t.open_time?.split(' ')[0];
      if (!map[d]) map[d] = { date: d, trades: 0, pnl: 0, wins: 0 };
      map[d].trades++;
      map[d].pnl += t.profit || 0;
      if (t.profit > 0) map[d].wins++;
    });
    return Object.values(map).filter(d => d.trades > 2).sort((a, b) => b.trades - a.trades).slice(0, 10)
      .map(d => ({ ...d, pnl: parseFloat(d.pnl.toFixed(2)), winRate: Math.round(d.wins / d.trades * 100) }));
  };

  // Symbol data
  const symbolData = () => {
    const map = {};
    trades.forEach(t => {
      if (!map[t.symbol]) map[t.symbol] = { name: t.symbol, wins: 0, total: 0, pnl: 0 };
      map[t.symbol].total++;
      map[t.symbol].pnl += t.profit || 0;
      if (t.profit > 0) map[t.symbol].wins++;
    });
    return Object.values(map).map(v => ({ ...v, winRate: Math.round(v.wins / v.total * 100), pnl: parseFloat(v.pnl.toFixed(2)) }))
      .sort((a, b) => b.total - a.total).slice(0, 8);
  };

  // Session data
  const sessionData = () => {
    const map = {};
    trades.forEach(t => {
      const s = t.session || "Unknown";
      if (!map[s]) map[s] = { name: s, wins: 0, total: 0 };
      map[s].total++;
      if (t.profit > 0) map[s].wins++;
    });
    return Object.values(map).map(v => ({ ...v, winRate: Math.round(v.wins / v.total * 100) })).sort((a, b) => b.winRate - a.winRate);
  };

  // Duration vs profit
  const durationData = () => trades.filter(t => t.duration_min && t.duration_min < 500)
    .map(t => ({ x: t.duration_min, y: parseFloat((t.profit || 0).toFixed(2)), fill: t.profit >= 0 ? colors.green : colors.red }));

  // Tilt analysis
  const tiltAnalysis = () => {
    let maxLoss = 0, cur = 0, afterLoss = { wins: 0, total: 0 }, afterWin = { wins: 0, total: 0 };
    const rev = [...trades].reverse();
    rev.forEach(t => { if (t.profit < 0) { cur++; maxLoss = Math.max(maxLoss, cur); } else cur = 0; });
    for (let i = 1; i < rev.length; i++) {
      if (rev[i - 1].profit < 0) { afterLoss.total++; if (rev[i].profit > 0) afterLoss.wins++; }
      if (rev[i - 1].profit > 0) { afterWin.total++; if (rev[i].profit > 0) afterWin.wins++; }
    }
    return {
      maxConsecutiveLosses: maxLoss,
      winRateAfterLoss: afterLoss.total > 0 ? Math.round(afterLoss.wins / afterLoss.total * 100) : 0,
      winRateAfterWin: afterWin.total > 0 ? Math.round(afterWin.wins / afterWin.total * 100) : 0,
    };
  };

  // AI Insights
  const insights = () => {
    if (!trades.length) return [];
    const ins = [];
    const tilt = tiltAnalysis();
    const hours = hourData().filter(h => h.total >= 3).sort((a, b) => b.winRate - a.winRate);
    const days = dayData().filter(d => d.total >= 3).sort((a, b) => b.winRate - a.winRate);
    const otDays = overTradingDays();
    const sym = symbolData();

    if (tilt.maxConsecutiveLosses >= 3) ins.push({ icon: "🔴", text: `Max consecutive losses: ${tilt.maxConsecutiveLosses} — high tilt risk`, severity: "high" });
    if (tilt.winRateAfterLoss < 40) ins.push({ icon: "⚠️", text: `Win rate after a loss: ${tilt.winRateAfterLoss}% — possible revenge trading`, severity: "high" });
    if (tilt.winRateAfterWin > 60) ins.push({ icon: "✅", text: `Win rate after a win: ${tilt.winRateAfterWin}% — good momentum management`, severity: "good" });
    if (hours.length) ins.push({ icon: "⏰", text: `Best hour: ${hours[0].hour} with ${hours[0].winRate}% win rate (${hours[0].total} trades)`, severity: "good" });
    if (hours.length > 1) ins.push({ icon: "🚫", text: `Worst hour: ${hours[hours.length - 1].hour} with ${hours[hours.length - 1].winRate}% win rate — avoid trading then`, severity: "warn" });
    if (days.length) ins.push({ icon: "📅", text: `Best day: ${days[0].day} with ${days[0].winRate}% win rate`, severity: "good" });
    if (otDays.length) ins.push({ icon: "📊", text: `${otDays.length} days with 3+ trades — over-trading detected on ${otDays[0].date} (${otDays[0].trades} trades, $${otDays[0].pnl})`, severity: otDays[0].pnl < 0 ? "high" : "warn" });
    if (sym.length) ins.push({ icon: "💹", text: `Best symbol: ${sym.sort((a, b) => b.winRate - a.winRate)[0].name} with ${sym.sort((a, b) => b.winRate - a.winRate)[0].winRate}% win rate`, severity: "good" });
    return ins;
  };

  if (loading) return <div style={s.loading}>🔄 Loading TradeLens...</div>;
  if (!stats) return <div style={s.loading}>❌ Cannot connect to Supabase.</div>;

  const tilt = tiltAnalysis();
  const curStats = computeStats(filteredTrades());

  const navItems = [
    { section: "Overview" },
    { id: "dashboard", icon: "⬡", label: "Dashboard" },
    { id: "performance", icon: "📈", label: "Performance" },
    { section: "Analysis" },
    { id: "timing", icon: "⏰", label: "Timing" },
    { id: "trades", icon: "◈", label: "Trade Log" },
    { id: "analytics", icon: "◎", label: "Analytics" },
    { section: "Psychology" },
    { id: "psychology", icon: "🧠", label: "Psychology" },
    { id: "overtrading", icon: "⚡", label: "Over-trading" },
  ];

  return (
    <div style={s.app}>
      <aside style={s.sidebar}>
        <div style={s.logo}>
          <div style={s.logoText}>Trade<span style={{ color: colors.accent }}>Lens</span></div>
          <div style={s.logoSub}>TRADING INTELLIGENCE</div>
        </div>
        {navItems.map((n, i) => n.section
          ? <div key={i} style={s.navSection}>{n.section}</div>
          : <div key={n.id} style={s.navItem(page === n.id)} onClick={() => setPage(n.id)}><span>{n.icon}</span> {n.label}</div>
        )}
        <div style={{ marginTop: "auto", padding: "16px 20px", borderTop: `1px solid ${colors.border}` }}>
          <div style={{ fontSize: 12, fontWeight: 600 }}>Supabase Cloud</div>
          <div style={{ fontSize: 10, color: colors.green, fontFamily: "monospace", marginTop: 2 }}>● Connected</div>
          {lastSync && <div style={{ fontSize: 10, color: colors.text3, fontFamily: "monospace", marginTop: 2 }}>Synced {lastSync}</div>}
        </div>
      </aside>

      <main style={s.main}>

        {/* ── DASHBOARD ── */}
        {page === "dashboard" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={s.pageTitle}>Performance Dashboard</div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6 }}>
                  <div style={s.pageSub}>{stats.total_trades} trades total</div>
                  <button onClick={syncData} disabled={syncing} style={s.syncBtn(syncing)}>{syncing ? "⟳ Syncing..." : "⟳ Sync"}</button>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {["week", "month", "3month", "all"].map(p => (
                  <button key={p} onClick={() => setPeriod(p)} style={{ padding: "5px 12px", borderRadius: 8, border: `1px solid ${period === p ? colors.accent : colors.border}`, background: period === p ? "rgba(0,229,255,0.08)" : "transparent", color: period === p ? colors.accent : colors.text2, fontSize: 11, cursor: "pointer" }}>
                    {p === "week" ? "1W" : p === "month" ? "1M" : p === "3month" ? "3M" : "All"}
                  </button>
                ))}
              </div>
            </div>

            <div style={s.kpiRow(4)}>
              <KPI label="Total P&L" value={`$${curStats.total_pnl?.toLocaleString()}`} sub="All time" color={curStats.total_pnl >= 0 ? colors.green : colors.red} />
              <KPI label="Win Rate" value={`${curStats.win_rate}%`} sub={`${curStats.wins}W · ${curStats.losses}L`} color={colors.accent} />
              <KPI label="Profit Factor" value={curStats.profit_factor} sub="Gross profit / loss" color={curStats.profit_factor >= 1.5 ? colors.green : curStats.profit_factor >= 1 ? colors.yellow : colors.red} />
              <KPI label="Avg R:R" value={curStats.avg_rr} sub="Actual" color={colors.yellow} />
            </div>

            <div style={s.kpiRow(3)}>
              <KPI label="Total Trades" value={curStats.total_trades} sub="Selected period" />
              <KPI label="Avg Win" value={`$${curStats.avg_win}`} sub="Per winning trade" color={colors.green} />
              <KPI label="Avg Loss" value={`$${curStats.avg_loss}`} sub="Per losing trade" color={colors.red} />
            </div>

            <div style={{ ...s.card, marginBottom: 16 }}>
              <div style={s.cardTitle}>Equity Curve</div>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={equityData()}>
                  <defs>
                    <linearGradient id="eq" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={colors.accent} stopOpacity={0.25} />
                      <stop offset="100%" stopColor={colors.accent} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis hide /><YAxis hide />
                  <Tooltip contentStyle={s.tooltip} formatter={(v) => [`$${v}`, "Balance"]} />
                  <Area type="monotone" dataKey="balance" stroke={colors.accent} fill="url(#eq)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div style={s.card}>
              <div style={s.cardTitle}>🧠 Key Insights</div>
              <div style={s.aiBubble}>
                <div style={s.aiLabel}>● TRADELENS INTELLIGENCE</div>
                {insights().map((ins, i) => (
                  <div key={i} style={{ ...s.aiText, marginBottom: 8, color: ins.severity === "high" ? colors.red : ins.severity === "good" ? colors.green : colors.yellow }}>
                    {ins.icon} {ins.text}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── PERFORMANCE ── */}
        {page === "performance" && (
          <>
            <div style={s.pageTitle}>Performance</div>
            <div style={s.pageSub}>Weekly & monthly breakdown</div>

            <SectionTitle>Monthly P&L</SectionTitle>
            <div style={s.card}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyData()}>
                  <XAxis dataKey="month" tick={{ fill: colors.text2, fontSize: 11 }} />
                  <YAxis tick={{ fill: colors.text2, fontSize: 11 }} />
                  <Tooltip contentStyle={s.tooltip} formatter={(v) => [`$${v}`, "P&L"]} />
                  <Bar dataKey="pnl" radius={6}>
                    {monthlyData().map((e, i) => <Cell key={i} fill={e.pnl >= 0 ? colors.green : colors.red} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <SectionTitle>Monthly Win Rate</SectionTitle>
            <div style={s.card}>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={monthlyData()}>
                  <XAxis dataKey="month" tick={{ fill: colors.text2, fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: colors.text2, fontSize: 11 }} />
                  <Tooltip contentStyle={s.tooltip} formatter={(v) => [`${v}%`, "Win Rate"]} />
                  <Line type="monotone" dataKey="winRate" stroke={colors.accent} strokeWidth={2} dot={{ fill: colors.accent, r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <SectionTitle>Weekly P&L</SectionTitle>
            <div style={s.card}>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={weeklyData()}>
                  <XAxis dataKey="week" tick={{ fill: colors.text2, fontSize: 10 }} />
                  <YAxis tick={{ fill: colors.text2, fontSize: 11 }} />
                  <Tooltip contentStyle={s.tooltip} formatter={(v) => [`$${v}`, "P&L"]} />
                  <Bar dataKey="pnl" radius={5}>
                    {weeklyData().map((e, i) => <Cell key={i} fill={e.pnl >= 0 ? colors.green : colors.red} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {/* ── TIMING ── */}
        {page === "timing" && (
          <>
            <div style={s.pageTitle}>Timing Analysis</div>
            <div style={s.pageSub}>When you trade best</div>

            <SectionTitle>Win Rate by Hour</SectionTitle>
            <div style={s.card}>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={hourData()}>
                  <XAxis dataKey="hour" tick={{ fill: colors.text2, fontSize: 9 }} interval={1} />
                  <YAxis domain={[0, 100]} tick={{ fill: colors.text2, fontSize: 11 }} />
                  <Tooltip contentStyle={s.tooltip} formatter={(v, n, p) => [`${v}% (${p.payload.total} trades)`, "Win Rate"]} />
                  <Bar dataKey="winRate" radius={4}>
                    {hourData().map((e, i) => <Cell key={i} fill={e.winRate >= 55 ? colors.green : e.winRate >= 40 ? colors.yellow : e.total === 0 ? colors.surface2 : colors.red} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <SectionTitle>P&L by Hour</SectionTitle>
            <div style={s.card}>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={hourData()}>
                  <XAxis dataKey="hour" tick={{ fill: colors.text2, fontSize: 9 }} interval={1} />
                  <YAxis tick={{ fill: colors.text2, fontSize: 11 }} />
                  <Tooltip contentStyle={s.tooltip} formatter={(v) => [`$${v}`, "P&L"]} />
                  <Bar dataKey="pnl" radius={4}>
                    {hourData().map((e, i) => <Cell key={i} fill={e.pnl >= 0 ? colors.green : colors.red} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <SectionTitle>Performance by Day of Week</SectionTitle>
            <div style={s.grid2}>
              <div style={s.card}>
                <div style={s.cardTitle}>Win Rate by Day</div>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={dayData()}>
                    <XAxis dataKey="day" tick={{ fill: colors.text2, fontSize: 12 }} />
                    <YAxis domain={[0, 100]} hide />
                    <Tooltip contentStyle={s.tooltip} formatter={(v) => [`${v}%`, "Win Rate"]} />
                    <Bar dataKey="winRate" radius={6}>
                      {dayData().map((e, i) => <Cell key={i} fill={e.winRate >= 55 ? colors.green : e.winRate >= 40 ? colors.yellow : colors.red} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={s.card}>
                <div style={s.cardTitle}>P&L by Day</div>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={dayData()}>
                    <XAxis dataKey="day" tick={{ fill: colors.text2, fontSize: 12 }} />
                    <YAxis hide />
                    <Tooltip contentStyle={s.tooltip} formatter={(v) => [`$${v}`, "P&L"]} />
                    <Bar dataKey="pnl" radius={6}>
                      {dayData().map((e, i) => <Cell key={i} fill={e.pnl >= 0 ? colors.green : colors.red} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <SectionTitle>Session Performance</SectionTitle>
            <div style={s.card}>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={sessionData()} layout="vertical">
                  <XAxis type="number" hide domain={[0, 100]} />
                  <YAxis type="category" dataKey="name" tick={{ fill: colors.text2, fontSize: 11 }} width={110} />
                  <Tooltip contentStyle={s.tooltip} formatter={(v) => [`${v}%`, "Win Rate"]} />
                  <Bar dataKey="winRate" radius={4}>
                    {sessionData().map((e, i) => <Cell key={i} fill={e.winRate >= 55 ? colors.green : e.winRate >= 40 ? colors.yellow : colors.red} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {/* ── TRADE LOG ── */}
        {page === "trades" && (
          <>
            <div style={s.pageTitle}>Trade Log</div>
            <div style={s.pageSub}>{trades.length} trades · Most recent first</div>
            <div style={{ marginTop: 20 }}>
              {trades.slice(0, 60).map((t, i) => (
                <div key={i} style={s.tradeRow}>
                  <div style={s.dirBadge(t.direction)}>{t.direction === "BUY" ? "L" : "S"}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{t.symbol}</div>
                    <div style={{ fontSize: 11, color: colors.text2, fontFamily: "monospace", marginTop: 2 }}>
                      {t.open_time} · <SessionBadge session={t.session} />
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: colors.text2, fontFamily: "monospace" }}>{t.duration_min}m</div>
                  <div style={{ fontSize: 13, fontFamily: "monospace", fontWeight: 500, color: t.profit >= 0 ? colors.green : colors.red, minWidth: 72, textAlign: "right" }}>
                    {t.profit >= 0 ? "+" : ""}${t.profit?.toFixed(2)}
                  </div>
                  <div style={s.dot(t.profit >= 0)} />
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── ANALYTICS ── */}
        {page === "analytics" && (
          <>
            <div style={s.pageTitle}>Analytics</div>
            <div style={s.pageSub}>Symbol breakdown & trade duration</div>

            <SectionTitle>P&L by Symbol</SectionTitle>
            <div style={s.card}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={symbolData()}>
                  <XAxis dataKey="name" tick={{ fill: colors.text2, fontSize: 12 }} />
                  <YAxis tick={{ fill: colors.text2, fontSize: 11 }} />
                  <Tooltip contentStyle={s.tooltip} />
                  <Bar dataKey="pnl" radius={6}>
                    {symbolData().map((e, i) => <Cell key={i} fill={e.pnl >= 0 ? colors.green : colors.red} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <SectionTitle>Win Rate by Symbol</SectionTitle>
            <div style={s.card}>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={symbolData()} layout="vertical">
                  <XAxis type="number" domain={[0, 100]} tick={{ fill: colors.text2, fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fill: colors.text2, fontSize: 12 }} width={80} />
                  <Tooltip contentStyle={s.tooltip} formatter={(v) => [`${v}%`, "Win Rate"]} />
                  <Bar dataKey="winRate" radius={4}>
                    {symbolData().map((e, i) => <Cell key={i} fill={e.winRate >= 55 ? colors.green : e.winRate >= 40 ? colors.yellow : colors.red} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <SectionTitle>Trade Duration vs Profit</SectionTitle>
            <div style={s.card}>
              <div style={{ fontSize: 12, color: colors.text2, marginBottom: 12 }}>Each dot = one trade. X = duration (min), Y = profit ($)</div>
              <ResponsiveContainer width="100%" height={200}>
                <ScatterChart>
                  <XAxis dataKey="x" name="Duration" tick={{ fill: colors.text2, fontSize: 11 }} label={{ value: "Minutes", fill: colors.text3, fontSize: 11, position: "insideBottom", offset: -5 }} />
                  <YAxis dataKey="y" name="Profit" tick={{ fill: colors.text2, fontSize: 11 }} />
                  <Tooltip contentStyle={s.tooltip} formatter={(v, n) => [n === "x" ? `${v}min` : `$${v}`, n === "x" ? "Duration" : "Profit"]} />
                  <Scatter data={durationData()} fill={colors.accent}>
                    {durationData().map((e, i) => <Cell key={i} fill={e.fill} opacity={0.7} />)}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {/* ── PSYCHOLOGY ── */}
        {page === "psychology" && (
          <>
            <div style={s.pageTitle}>Psychology Analysis</div>
            <div style={s.pageSub}>Behavioral pattern detection</div>

            <div style={s.kpiRow(3)}>
              <KPI label="Max Consec. Losses" value={tilt.maxConsecutiveLosses} sub="Highest losing streak" color={tilt.maxConsecutiveLosses >= 5 ? colors.red : tilt.maxConsecutiveLosses >= 3 ? colors.yellow : colors.green} />
              <KPI label="WR After Loss" value={`${tilt.winRateAfterLoss}%`} sub="Revenge trading indicator" color={tilt.winRateAfterLoss < 40 ? colors.red : tilt.winRateAfterLoss < 50 ? colors.yellow : colors.green} />
              <KPI label="WR After Win" value={`${tilt.winRateAfterWin}%`} sub="Overconfidence indicator" color={tilt.winRateAfterWin > 55 ? colors.green : colors.yellow} />
            </div>

            <SectionTitle>All Insights</SectionTitle>
            {insights().map((ins, i) => (
              <div key={i} style={{ ...s.insightCard, borderColor: ins.severity === "high" ? `${colors.red}44` : ins.severity === "good" ? `${colors.green}44` : `${colors.yellow}44` }}>
                <div style={{ fontSize: 13, lineHeight: 1.7, color: ins.severity === "high" ? colors.red : ins.severity === "good" ? colors.green : colors.yellow }}>
                  {ins.icon} {ins.text}
                </div>
              </div>
            ))}

            <div style={s.aiBubble}>
              <div style={s.aiLabel}>● DEEP ANALYSIS</div>
              <div style={s.aiText}>
                With <strong style={{ color: colors.text }}>{stats.total_trades} trades</strong> and a win rate of <strong style={{ color: stats.win_rate >= 50 ? colors.green : colors.red }}>{stats.win_rate}%</strong>, your profit factor is <strong style={{ color: stats.profit_factor >= 1.5 ? colors.green : colors.yellow }}>{stats.profit_factor}</strong>.
                {stats.profit_factor < 1 && " ⚠️ Profit factor below 1 means you're losing more than you win — focus on cutting losses early."}
                {stats.profit_factor >= 1 && stats.profit_factor < 1.5 && " Your edge exists but is fragile. Consistency is key."}
                {stats.profit_factor >= 1.5 && " Strong profit factor — your strategy has a real edge."}
                <br /><br />
                {tilt.winRateAfterLoss < 40 && "⚠️ Your win rate drops significantly after losses. Consider a rule: after 2 losses in a day, stop trading."}
                {tilt.winRateAfterLoss >= 40 && "✅ You recover well after losses — good emotional control."}
              </div>
            </div>
          </>
        )}

        {/* ── OVER-TRADING ── */}
        {page === "overtrading" && (
          <>
            <div style={s.pageTitle}>Over-trading Analysis</div>
            <div style={s.pageSub}>Days with more than 2 trades</div>

            <div style={s.kpiRow(3)}>
              <KPI label="Over-trading Days" value={overTradingDays().length} sub="Days with 3+ trades" color={overTradingDays().length > 10 ? colors.red : colors.yellow} />
              <KPI label="Avg P&L on OT Days" value={`$${overTradingDays().length > 0 ? (overTradingDays().reduce((s, d) => s + d.pnl, 0) / overTradingDays().length).toFixed(2) : 0}`} sub="When you over-trade" color={overTradingDays().reduce((s, d) => s + d.pnl, 0) >= 0 ? colors.green : colors.red} />
              <KPI label="Avg Win Rate OT Days" value={`${overTradingDays().length > 0 ? Math.round(overTradingDays().reduce((s, d) => s + d.winRate, 0) / overTradingDays().length) : 0}%`} sub="On over-trading days" color={colors.yellow} />
            </div>

            <SectionTitle>Over-trading Days Log</SectionTitle>
            {overTradingDays().map((d, i) => (
              <div key={i} style={{ ...s.insightCard, display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: 16, alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{d.date}</div>
                  <div style={{ fontSize: 11, color: colors.text2, fontFamily: "monospace", marginTop: 2 }}>{d.trades} trades · {d.winRate}% win rate</div>
                </div>
                <div style={{ fontSize: 13, fontFamily: "monospace", color: d.pnl >= 0 ? colors.green : colors.red, fontWeight: 600 }}>
                  {d.pnl >= 0 ? "+" : ""}${d.pnl}
                </div>
                <div style={s.badge(d.trades >= 5 ? colors.red : colors.yellow)}>{d.trades} trades</div>
                <div style={s.dot(d.pnl >= 0)} />
              </div>
            ))}

            {overTradingDays().length === 0 && (
              <div style={{ ...s.card, textAlign: "center", color: colors.text2, padding: 40 }}>
                ✅ No over-trading days detected
              </div>
            )}
          </>
        )}

      </main>
    </div>
  );
}