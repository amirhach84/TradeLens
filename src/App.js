import { useState, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import axios from "axios";

const API = "https://alarm-circular-reactive.ngrok-free.dev/api";

const colors = {
  bg: "#080b0f", surface: "#111820", surface2: "#162030",
  border: "rgba(255,255,255,0.06)", accent: "#00e5ff",
  green: "#00e096", red: "#ff4d6a", yellow: "#ffd166",
  text: "#e8edf5", text2: "#7a8899", text3: "#3d4f61",
};

const styles = {
  app: { background: colors.bg, minHeight: "100vh", color: colors.text, fontFamily: "'Segoe UI', sans-serif", display: "flex" },
  sidebar: { width: 220, background: "rgba(8,11,15,0.95)", borderRight: `1px solid ${colors.border}`, padding: "28px 0", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh" },
  logo: { padding: "0 24px 28px", borderBottom: `1px solid ${colors.border}`, marginBottom: 24 },
  logoText: { fontSize: 22, fontWeight: 800, letterSpacing: -0.5 },
  logoSub: { fontSize: 10, color: colors.text3, letterSpacing: 2, marginTop: 2, fontFamily: "monospace" },
  navItem: (active) => ({ display: "flex", alignItems: "center", gap: 10, padding: "10px 24px", cursor: "pointer", fontSize: 13, fontWeight: 500, color: active ? colors.accent : colors.text2, background: active ? "rgba(0,229,255,0.08)" : "transparent", borderLeft: active ? `3px solid ${colors.accent}` : "3px solid transparent", transition: "all 0.15s" }),
  main: { flex: 1, padding: "32px 36px", overflowY: "auto" },
  pageTitle: { fontSize: 26, fontWeight: 700, letterSpacing: -0.5 },
  pageSub: { fontSize: 12, color: colors.text2, marginTop: 4, fontFamily: "monospace" },
  kpiRow: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, margin: "24px 0" },
  card: { background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 14, padding: "20px 22px" },
  kpiLabel: { fontSize: 10, color: colors.text3, letterSpacing: 1.5, textTransform: "uppercase", fontFamily: "monospace", marginBottom: 10 },
  kpiValue: (color) => ({ fontSize: 28, fontWeight: 700, letterSpacing: -1, color: color || colors.text }),
  kpiSub: (color) => ({ fontSize: 11, color: color || colors.text2, marginTop: 8, fontFamily: "monospace" }),
  grid2: { display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20, marginBottom: 20 },
  cardTitle: { fontSize: 14, fontWeight: 600, marginBottom: 18 },
  tradeRow: { display: "grid", gridTemplateColumns: "36px 1fr auto auto 10px", alignItems: "center", gap: 12, padding: "11px 14px", background: colors.bg, borderRadius: 10, marginBottom: 8, cursor: "pointer", border: `1px solid transparent`, transition: "all 0.15s" },
  dirBadge: (dir) => ({ width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, background: dir === "BUY" ? "rgba(0,224,150,0.12)" : "rgba(255,77,106,0.12)", color: dir === "BUY" ? colors.green : colors.red }),
  dot: (win) => ({ width: 8, height: 8, borderRadius: "50%", background: win ? colors.green : colors.red, boxShadow: `0 0 6px ${win ? colors.green : colors.red}` }),
  aiBubble: { background: "linear-gradient(135deg,rgba(123,97,255,0.08),rgba(0,229,255,0.05))", border: "1px solid rgba(123,97,255,0.2)", borderRadius: 12, padding: "16px 18px", marginTop: 16 },
  aiLabel: { fontSize: 10, color: "#7b61ff", letterSpacing: 1.5, fontFamily: "monospace", marginBottom: 10 },
  aiText: { fontSize: 13, color: colors.text2, lineHeight: 1.7 },
  loading: { display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontSize: 16, color: colors.text2 },
};

function KPICard({ label, value, sub, color }) {
  return (
    <div style={styles.card}>
      <div style={styles.kpiLabel}>{label}</div>
      <div style={styles.kpiValue(color)}>{value}</div>
      <div style={styles.kpiSub()}>{sub}</div>
    </div>
  );
}

function SessionBadge({ session }) {
  const map = { "London": colors.green, "London/NY Overlap": colors.accent, "New York": colors.yellow, "Asia": colors.red, "Off Hours": colors.text3 };
  return <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: `${map[session]}22`, color: map[session] || colors.text3, fontFamily: "monospace" }}>{session}</span>;
}

export default function App() {
  const [stats, setStats] = useState(null);
  const [trades, setTrades] = useState([]);
  const [page, setPage] = useState("dashboard");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/stats`),
      axios.get(`${API}/trades`)
    ]).then(([s, t]) => {
      setStats(s.data);
      setTrades(t.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Build equity curve
  const equityData = () => {
    let balance = 0;
    return [...trades].reverse().map((t, i) => {
      balance += t.profit || 0;
      return { name: i + 1, balance: parseFloat(balance.toFixed(2)) };
    });
  };

  // Session breakdown
  const sessionData = () => {
    const map = {};
    trades.forEach(t => {
      const s = t.session || "Unknown";
      if (!map[s]) map[s] = { wins: 0, total: 0 };
      map[s].total++;
      if (t.profit > 0) map[s].wins++;
    });
    return Object.entries(map).map(([name, v]) => ({
      name,
      winRate: v.total > 0 ? Math.round(v.wins / v.total * 100) : 0,
      trades: v.total
    })).sort((a, b) => b.winRate - a.winRate);
  };

  // Symbol breakdown
  const symbolData = () => {
    const map = {};
    trades.forEach(t => {
      if (!map[t.symbol]) map[t.symbol] = { wins: 0, total: 0, pnl: 0 };
      map[t.symbol].total++;
      map[t.symbol].pnl += t.profit || 0;
      if (t.profit > 0) map[t.symbol].wins++;
    });
    return Object.entries(map).map(([name, v]) => ({
      name,
      winRate: Math.round(v.wins / v.total * 100),
      pnl: parseFloat(v.pnl.toFixed(2)),
      trades: v.total
    })).sort((a, b) => b.trades - a.trades).slice(0, 6);
  };

  // Psychology insights
  const psychInsights = () => {
    if (!trades.length) return [];
    const insights = [];

    // Consecutive losses
    let maxLoss = 0, cur = 0;
    [...trades].reverse().forEach(t => {
      if (t.profit < 0) { cur++; maxLoss = Math.max(maxLoss, cur); }
      else cur = 0;
    });
    if (maxLoss >= 3) insights.push(`🔴 Max consecutive losses: ${maxLoss} — risk of tilt detected`);

    // Win rate after loss
    let afterLoss = { wins: 0, total: 0 };
    const rev = [...trades].reverse();
    for (let i = 1; i < rev.length; i++) {
      if (rev[i - 1].profit < 0) {
        afterLoss.total++;
        if (rev[i].profit > 0) afterLoss.wins++;
      }
    }
    if (afterLoss.total > 5) {
      const wr = Math.round(afterLoss.wins / afterLoss.total * 100);
      insights.push(`📊 Win rate after a losing trade: ${wr}% — ${wr < 40 ? "⚠️ possible revenge trading" : "✅ good recovery"}`);
    }

    // Best session
    const sd = sessionData();
    if (sd.length) insights.push(`⭐ Best session: ${sd[0].name} with ${sd[0].winRate}% win rate`);

    // Best symbol
    const sym = symbolData();
    if (sym.length) insights.push(`💹 Most traded: ${sym[0].name} — ${sym[0].winRate}% WR, P&L: $${sym[0].pnl}`);

    return insights;
  };

  if (loading) return <div style={styles.loading}>🔄 Loading TradeLens...</div>;
  if (!stats) return <div style={styles.loading}>❌ Cannot connect to collector. Make sure collector.py is running.</div>;

  const navItems = [
    { id: "dashboard", icon: "⬡", label: "Dashboard" },
    { id: "trades", icon: "◈", label: "Trade Log" },
    { id: "analytics", icon: "◎", label: "Analytics" },
    { id: "psychology", icon: "◉", label: "Psychology" },
  ];

  return (
    <div style={styles.app}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.logo}>
          <div style={styles.logoText}>Trade<span style={{ color: colors.accent }}>Lens</span></div>
          <div style={styles.logoSub}>TRADING INTELLIGENCE</div>
        </div>
        {navItems.map(n => (
          <div key={n.id} style={styles.navItem(page === n.id)} onClick={() => setPage(n.id)}>
            <span>{n.icon}</span> {n.label}
          </div>
        ))}
        <div style={{ marginTop: "auto", padding: "20px 24px", borderTop: `1px solid ${colors.border}` }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Live MT5</div>
          <div style={{ fontSize: 11, color: colors.green, fontFamily: "monospace", marginTop: 2 }}>● Connected</div>
        </div>
      </aside>

      {/* Main */}
      <main style={styles.main}>

        {/* DASHBOARD */}
        {page === "dashboard" && (
          <>
            <div style={styles.pageTitle}>Performance Dashboard</div>
            <div style={styles.pageSub}>Auto-sync every 15 min · {stats.total_trades} trades loaded</div>

            <div style={styles.kpiRow}>
              <KPICard label="Total P&L" value={`$${stats.total_pnl?.toLocaleString()}`} sub="All time" color={stats.total_pnl >= 0 ? colors.green : colors.red} />
              <KPICard label="Win Rate" value={`${stats.win_rate}%`} sub={`${stats.wins}W · ${stats.losses}L`} color={colors.accent} />
              <KPICard label="Avg R:R" value={stats.avg_rr} sub="Actual R:R" color={colors.yellow} />
              <KPICard label="Total Trades" value={stats.total_trades} sub="All time" />
            </div>

            <div style={styles.grid2}>
              {/* Equity Curve */}
              <div style={styles.card}>
                <div style={styles.cardTitle}>Equity Curve</div>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={equityData()}>
                    <defs>
                      <linearGradient id="eq" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={colors.accent} stopOpacity={0.25} />
                        <stop offset="100%" stopColor={colors.accent} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis hide />
                    <YAxis hide />
                    <Tooltip contentStyle={{ background: colors.surface2, border: "none", borderRadius: 8, fontSize: 12 }} formatter={(v) => [`$${v}`, "Balance"]} />
                    <Area type="monotone" dataKey="balance" stroke={colors.accent} fill="url(#eq)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Session Breakdown */}
              <div style={styles.card}>
                <div style={styles.cardTitle}>Win Rate by Session</div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={sessionData()} layout="vertical">
                    <XAxis type="number" hide domain={[0, 100]} />
                    <YAxis type="category" dataKey="name" tick={{ fill: colors.text2, fontSize: 11 }} width={100} />
                    <Tooltip contentStyle={{ background: colors.surface2, border: "none", borderRadius: 8, fontSize: 12 }} formatter={(v) => [`${v}%`, "Win Rate"]} />
                    <Bar dataKey="winRate" radius={4}>
                      {sessionData().map((entry, i) => (
                        <Cell key={i} fill={entry.winRate >= 55 ? colors.green : entry.winRate >= 40 ? colors.yellow : colors.red} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* AI Insights */}
            <div style={styles.card}>
              <div style={styles.cardTitle}>🧠 AI Pattern Analysis</div>
              <div style={styles.aiBubble}>
                <div style={styles.aiLabel}>● TRADELENS INTELLIGENCE</div>
                {psychInsights().map((insight, i) => (
                  <div key={i} style={{ ...styles.aiText, marginBottom: 8 }}>{insight}</div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* TRADE LOG */}
        {page === "trades" && (
          <>
            <div style={styles.pageTitle}>Trade Log</div>
            <div style={styles.pageSub}>{trades.length} trades · Sorted by most recent</div>
            <div style={{ marginTop: 24 }}>
              {trades.slice(0, 50).map((t, i) => (
                <div key={i} style={styles.tradeRow}>
                  <div style={styles.dirBadge(t.direction)}>{t.direction === "BUY" ? "L" : "S"}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{t.symbol}</div>
                    <div style={{ fontSize: 11, color: colors.text2, fontFamily: "monospace", marginTop: 2 }}>
                      {t.open_time} · <SessionBadge session={t.session} />
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: colors.text2, fontFamily: "monospace" }}>
                    {t.duration_min}m
                  </div>
                  <div style={{ fontSize: 13, fontFamily: "monospace", fontWeight: 500, color: t.profit >= 0 ? colors.green : colors.red, minWidth: 70, textAlign: "right" }}>
                    {t.profit >= 0 ? "+" : ""}${t.profit?.toFixed(2)}
                  </div>
                  <div style={styles.dot(t.profit >= 0)} />
                </div>
              ))}
            </div>
          </>
        )}

        {/* ANALYTICS */}
        {page === "analytics" && (
          <>
            <div style={styles.pageTitle}>Analytics</div>
            <div style={styles.pageSub}>Performance breakdown by symbol & session</div>
            <div style={{ marginTop: 24, ...styles.card }}>
              <div style={styles.cardTitle}>P&L by Symbol</div>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={symbolData()}>
                  <XAxis dataKey="name" tick={{ fill: colors.text2, fontSize: 12 }} />
                  <YAxis tick={{ fill: colors.text2, fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: colors.surface2, border: "none", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="pnl" radius={6}>
                    {symbolData().map((entry, i) => (
                      <Cell key={i} fill={entry.pnl >= 0 ? colors.green : colors.red} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ marginTop: 20, ...styles.card }}>
              <div style={styles.cardTitle}>Win Rate by Symbol</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={symbolData()} layout="vertical">
                  <XAxis type="number" domain={[0, 100]} tick={{ fill: colors.text2, fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fill: colors.text2, fontSize: 12 }} width={80} />
                  <Tooltip contentStyle={{ background: colors.surface2, border: "none", borderRadius: 8 }} formatter={(v) => [`${v}%`, "Win Rate"]} />
                  <Bar dataKey="winRate" radius={4}>
                    {symbolData().map((entry, i) => (
                      <Cell key={i} fill={entry.winRate >= 55 ? colors.green : entry.winRate >= 40 ? colors.yellow : colors.red} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {/* PSYCHOLOGY */}
        {page === "psychology" && (
          <>
            <div style={styles.pageTitle}>Psychology Analysis</div>
            <div style={styles.pageSub}>AI-powered behavioral pattern detection</div>
            <div style={{ marginTop: 24 }}>
              {psychInsights().map((insight, i) => (
                <div key={i} style={{ ...styles.card, marginBottom: 12 }}>
                  <div style={{ fontSize: 14, lineHeight: 1.7 }}>{insight}</div>
                </div>
              ))}
              <div style={styles.aiBubble}>
                <div style={styles.aiLabel}>● DEEP ANALYSIS</div>
                <div style={styles.aiText}>
                  Based on your <strong style={{ color: colors.text }}>{stats.total_trades} trades</strong>, your overall win rate is <strong style={{ color: stats.win_rate >= 50 ? colors.green : colors.red }}>{stats.win_rate}%</strong>.
                  {stats.win_rate < 50 && " Focus on trade selection quality — fewer but higher-quality setups."}
                  {stats.win_rate >= 50 && " Good consistency. Focus on maximizing R:R on winning trades."}
                  <br /><br />
                  Total P&L of <strong style={{ color: stats.total_pnl >= 0 ? colors.green : colors.red }}>${stats.total_pnl}</strong> across {stats.total_trades} trades
                  {stats.total_pnl > 0 && stats.win_rate < 50 && " — positive P&L despite sub-50% win rate suggests good R:R management."}
                </div>
              </div>
            </div>
          </>
        )}

      </main>
    </div>
  );
}