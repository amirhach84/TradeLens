{page==="psychology" && (
  <>
    <div style={{fontSize:isMobile?18:24,fontWeight:800,marginBottom:4}}>Psychology</div>
    <div style={{fontSize:12,color:C.text2,marginBottom:14}}>{periodLabel()} · {ft.length} trades</div>

    {/* TradeLens Score + Win Rate Meter */}
    {(() => {
      const score = Math.round(
        (Math.min(st.win_rate, 70) / 70 * 25) +
        (Math.min(st.profit_factor, 3) / 3 * 25) +
        (tiltData.wrAfterL / 100 * 15) +
        (tiltData.wrAfterW / 100 * 15) +
        (Math.max(0, 10 - tiltData.maxL) / 10 * 20)
      );
      const scoreColor = score >= 70 ? C.green : score >= 45 ? C.yellow : C.red;
      const scoreDesc = score >= 70 ? "✅ Strong trader" : score >= 45 ? "⚠️ Developing — room to grow" : "🔴 Needs improvement";
      const wrAngle = (st.win_rate / 100) * 180;
      const toRad = (deg) => (deg * Math.PI) / 180;
      const needleAngle = 180 - wrAngle;
      const nx = 50 + 38 * Math.cos(toRad(needleAngle));
      const ny = 55 - 38 * Math.sin(toRad(needleAngle));

      // Radar values (0-1)
      const rv = {
        wr: Math.min(st.win_rate / 70, 1),
        pf: Math.min(st.profit_factor / 3, 1),
        avgwl: st.avg_loss > 0 ? Math.min(st.avg_win / st.avg_loss / 3, 1) : 0.5,
        recovery: Math.min(tiltData.wrAfterL / 100, 1),
        drawdown: Math.max(0, 1 - tiltData.maxL / 20),
        consistency: Math.min(tiltData.wrAfterW / 100, 1),
      };
      const R = 80;
      const cx = 130, cy = 115;
      const angles = [270, 330, 30, 90, 150, 210]; // top, top-right, bottom-right, bottom, bottom-left, top-left
      const keys = ['wr','pf','avgwl','recovery','drawdown','consistency'];
      const pts = (scale=1) => keys.map((k,i) => {
        const a = toRad(angles[i]);
        const r = R * rv[k] * scale;
        return `${cx+r*Math.cos(a)},${cy+r*Math.sin(a)}`;
      }).join(' ');
      const gridPts = (pct) => angles.map(a => {
        const r = R * pct;
        return `${cx+r*Math.cos(toRad(a))},${cy+r*Math.sin(toRad(a))}`;
      }).join(' ');

      return (
        <>
          {/* Score Card */}
          <div style={{background:`linear-gradient(135deg,${C.accent},${C.cyan})`,borderRadius:20,padding:"20px",marginBottom:14,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div>
              <div style={{fontSize:12,color:"rgba(255,255,255,0.7)",marginBottom:4}}>TradeLens Score</div>
              <div style={{fontSize:52,fontWeight:800,color:"#fff",lineHeight:1}}>{score}</div>
              <div style={{fontSize:12,color:"rgba(255,255,255,0.85)",marginTop:6}}>{scoreDesc}</div>
            </div>
            <div style={{textAlign:"center"}}>
              <svg width="100" height="70" viewBox="0 0 100 70">
                <path d="M 10 58 A 40 40 0 0 1 90 58" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="9" strokeLinecap="round"/>
                <path d="M 10 58 A 40 40 0 0 1 90 58" fill="none" stroke="#fff" strokeWidth="9" strokeLinecap="round"
                  strokeDasharray="125.6" strokeDashoffset={125.6 - (st.win_rate/100)*125.6}/>
                <line x1="50" y1="58" x2={nx} y2={ny} stroke="rgba(255,255,255,0.9)" strokeWidth="2.5" strokeLinecap="round"/>
                <circle cx="50" cy="58" r="4" fill="#fff"/>
                <text x="50" y="68" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="800">{st.win_rate}%</text>
              </svg>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.6)",marginTop:-4}}>Win Rate</div>
            </div>
          </div>

          {/* Radar Chart */}
          <div style={{background:C.card,borderRadius:20,padding:"18px 16px",border:`1px solid ${C.border}`,marginBottom:14,textAlign:"center"}}>
            <div style={{fontSize:13,fontWeight:700,marginBottom:14,textAlign:"left"}}>📊 Performance Radar</div>
            <svg width="100%" viewBox="0 0 260 230" style={{maxWidth:300,display:"block",margin:"0 auto"}}>
              <defs>
                <radialGradient id="rf" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor={C.accent} stopOpacity="0.4"/>
                  <stop offset="100%" stopColor={C.cyan} stopOpacity="0.05"/>
                </radialGradient>
              </defs>
              {[0.25,0.5,0.75,1].map((p,i) => (
                <polygon key={i} points={gridPts(p)} fill="none" stroke="#94a3b8" strokeWidth="0.5" opacity="0.2"/>
              ))}
              {angles.map((a,i) => {
                const r = R;
                return <line key={i} x1={cx} y1={cy} x2={cx+r*Math.cos(toRad(a))} y2={cy+r*Math.sin(toRad(a))} stroke="#94a3b8" strokeWidth="0.5" opacity="0.2"/>;
              })}
              <polygon points={pts()} fill="url(#rf)" stroke={C.accent} strokeWidth="2" opacity="0.9"/>
              {keys.map((k,i) => {
                const a = toRad(angles[i]);
                const r = R * rv[k];
                return <circle key={i} cx={cx+r*Math.cos(a)} cy={cy+r*Math.sin(a)} r="4" fill={C.accent}/>;
              })}
              {[
                {label:"Win %", val:`${st.win_rate}%`, ax:0, ay:-1, dx:0, dy:-14},
                {label:"Profit Factor", val:st.profit_factor, ax:0.866, ay:-0.5, dx:8, dy:-8},
                {label:"Avg Win/Loss", val:`${st.avg_loss>0?(st.avg_win/st.avg_loss).toFixed(1):0}x`, ax:0.866, ay:0.5, dx:8, dy:8},
                {label:"Recovery", val:`${tiltData.wrAfterL}%`, ax:0, ay:1, dx:0, dy:18},
                {label:"Max DD", val:`${tiltData.maxL} streak`, ax:-0.866, ay:0.5, dx:-8, dy:8},
                {label:"Consistency", val:`${tiltData.wrAfterW}%`, ax:-0.866, ay:-0.5, dx:-8, dy:-8},
              ].map((item,i) => {
                const lx = cx + (R+18)*Math.cos(toRad(angles[i])) + item.dx;
                const ly = cy + (R+18)*Math.sin(toRad(angles[i])) + item.dy;
                const anchor = item.ax > 0.3 ? "start" : item.ax < -0.3 ? "end" : "middle";
                return (
                  <g key={i}>
                    <text x={lx} y={ly} textAnchor={anchor} fill="#94a3b8" fontSize="9" fontWeight="600">{item.label}</text>
                    <text x={lx} y={ly+11} textAnchor={anchor} fill="#fff" fontSize="10" fontWeight="800">{item.val}</text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Metric cards */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
            {[
              {label:"Max Loss Streak",value:tiltData.maxL,color:tiltData.maxL>=5?C.red:tiltData.maxL>=3?C.yellow:C.green,pct:Math.min(tiltData.maxL/20,1)},
              {label:"WR After Loss",value:`${tiltData.wrAfterL}%`,color:tiltData.wrAfterL<40?C.red:tiltData.wrAfterL<50?C.yellow:C.green,pct:tiltData.wrAfterL/100},
              {label:"WR After Win",value:`${tiltData.wrAfterW}%`,color:tiltData.wrAfterW>55?C.green:C.yellow,pct:tiltData.wrAfterW/100},
              {label:"Profit Factor",value:st.profit_factor,color:st.profit_factor>=1.5?C.green:st.profit_factor>=1?C.yellow:C.red,pct:Math.min(st.profit_factor/3,1)},
            ].map((k,i)=>(
              <div key={i} style={{background:C.card,borderRadius:14,padding:"14px",border:`1px solid ${C.border}`}}>
                <div style={{fontSize:10,color:C.text3,marginBottom:6,textTransform:"uppercase",letterSpacing:1}}>{k.label}</div>
                <div style={{fontSize:isMobile?22:28,fontWeight:800,color:k.color}}>{k.value}</div>
                <div style={{height:4,background:C.card2,borderRadius:2,marginTop:8,overflow:"hidden"}}>
                  <div style={{width:`${k.pct*100}%`,height:"100%",background:k.color,borderRadius:2}}/>
                </div>
              </div>
            ))}
          </div>
        </>
      );
    })()}

    {/* Insights */}
    {aiInsights().map((ins,i)=>(
      <div key={i} style={{background:C.card,borderRadius:14,padding:14,marginBottom:10,borderLeft:`3px solid ${ins.color}`}}>
        <div style={{fontSize:13,lineHeight:1.7,color:ins.color}}>{ins.icon} {ins.text}</div>
      </div>
    ))}

    {/* Deep Analysis */}
    <div style={{background:`linear-gradient(135deg,rgba(99,102,241,0.1),rgba(6,182,212,0.06))`,borderRadius:16,padding:16,border:"1px solid rgba(99,102,241,0.2)",marginTop:4}}>
      <div style={{fontSize:10,color:C.accent,letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>● Deep Analysis · {periodLabel()}</div>
      <div style={{fontSize:13,color:C.text2,lineHeight:1.7}}>
        {ft.length} trades · WR <strong style={{color:st.win_rate>=50?C.green:C.red}}>{st.win_rate}%</strong> · PF <strong style={{color:st.profit_factor>=1.5?C.green:st.profit_factor>=1?C.yellow:C.red}}>{st.profit_factor}</strong>.
        {st.profit_factor<1&&" ⚠️ Negative edge — review setups."}
        {st.profit_factor>=1&&st.profit_factor<1.5&&" Marginal edge — stay disciplined."}
        {st.profit_factor>=1.5&&" Clear positive edge."}
        <br/><br/>
        {tiltData.wrAfterL<40&&"⚠️ WR drops after losses. Rule: stop after 2 losses/day."}
        {tiltData.wrAfterL>=40&&"✅ Good recovery after losses."}
      </div>
    </div>
  </>
)}