import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://kbfudodfckumpbidpwrt.supabase.co";
const SUPABASE_KEY = "sb_publishable_HAXcTl1Tymd-iop7HgWTqw_2sEMAMA9;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const CRITERIA = [
  { key: "aroma",    label: "香り",    emoji: "👃" },
  { key: "umami",    label: "うまみ",  emoji: "😋" },
  { key: "richness", label: "コク",    emoji: "✨" },
  { key: "spice",    label: "スパイス",emoji: "🌶️" },
  { key: "texture",  label: "舌触り",  emoji: "💫" },
];

const COLORS = ["#e85d04","#f48c06","#faa307","#ffba08","#dc2f02"];

function priceBonus(p) {
  const n = Number(p);
  if (!n || n <= 0) return 0;
  if (n <= 800)  return 1.0;
  if (n <= 1000) return 0.8;
  if (n <= 1200) return 0.6;
  if (n <= 1500) return 0.4;
  if (n <= 2000) return 0.2;
  if (n <= 2500) return 0.1;
  return 0;
}

function baseScore(scores) {
  return Math.round(CRITERIA.reduce((s,c) => s+(scores[c.key]||0),0)/CRITERIA.length*10)/10;
}
function totalScore(scores, price) {
  return Math.round((baseScore(scores)+priceBonus(price))*10)/10;
}

function RadarChart({ scores, color="#e85d04", size=220 }) {
  const cx=size/2, cy=size/2, r=size*0.36, n=CRITERIA.length;
  const angle = i => Math.PI*2*i/n - Math.PI/2;
  const gridPts = l => CRITERIA.map((_,i)=>{const rad=r*l/5;return `${cx+rad*Math.cos(angle(i))},${cy+rad*Math.sin(angle(i))}`;}).join(" ");
  const dataPts = CRITERIA.map((c,i)=>{const v=(scores[c.key]||0)/10;return `${cx+r*v*Math.cos(angle(i))},${cy+r*v*Math.sin(angle(i))}`;}).join(" ");
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {[1,2,3,4,5].map(l=><polygon key={l} points={gridPts(l)} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>)}
      {CRITERIA.map((_,i)=><line key={i} x1={cx} y1={cy} x2={cx+r*Math.cos(angle(i))} y2={cy+r*Math.sin(angle(i))} stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>)}
      <polygon points={dataPts} fill={color+"44"} stroke={color} strokeWidth="2.5" strokeLinejoin="round"/>
      {CRITERIA.map((c,i)=>{const v=(scores[c.key]||0)/10;return <circle key={i} cx={cx+r*v*Math.cos(angle(i))} cy={cy+r*v*Math.sin(angle(i))} r="4" fill={color}/>;})}
      {CRITERIA.map((c,i)=>{const lr=r+24;return(<text key={i} x={cx+lr*Math.cos(angle(i))} y={cy+lr*Math.sin(angle(i))} textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,0.7)" fontSize="11" fontFamily="'Noto Sans JP',sans-serif">{c.emoji}</text>);})}
    </svg>
  );
}

function Slider({ criterion, value, onChange }) {
  return (
    <div style={{marginBottom:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
        <span style={{fontSize:13,color:"rgba(255,255,255,0.8)"}}>{criterion.emoji} {criterion.label}</span>
        <span style={{fontSize:20,fontWeight:700,color:"#faa307",minWidth:28,textAlign:"right"}}>{value}</span>
      </div>
      <div style={{position:"relative",height:6,background:"rgba(255,255,255,0.1)",borderRadius:3}}>
        <div style={{position:"absolute",left:0,top:0,height:"100%",width:`${value*10}%`,background:"linear-gradient(90deg,#e85d04,#faa307)",borderRadius:3,transition:"width 0.15s"}}/>
        <input type="range" min={0} max={10} step={1} value={value} onChange={e=>onChange(Number(e.target.value))}
          style={{position:"absolute",inset:0,width:"100%",height:"100%",opacity:0,cursor:"pointer",margin:0}}/>
      </div>
    </div>
  );
}

const initScores = () => ({aroma:5,umami:5,richness:5,spice:5,texture:5});

export default function App() {
  const [view, setView]   = useState("form");
  const [name, setName]   = useState("");
  const [date, setDate]   = useState(new Date().toISOString().slice(0,10));
  const [price, setPrice] = useState("");
  const [note, setNote]   = useState("");
  const [scores, setScores] = useState(initScores());
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    supabase.from("curry_record").select("*").order("created_at",{ascending:false})
      .then(({data}) => { if(data) setRecords(data); setLoading(false); });
  }, []);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    const row = {name:name.trim(),date,price,note,...scores};
    const {data,error} = await supabase.from("curry_record").insert([row]).select();
    if (!error && data) setRecords(prev=>[...prev,...data]);
    setName(""); setPrice(""); setNote(""); setScores(initScores());
    setSaving(false);
    setView("rank");
  }

  const sorted = [...records].sort((a,b)=>totalScore(b,b.price)-totalScore(a,a.price));

  const inp = {width:"100%",boxSizing:"border-box",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:8,padding:"12px 14px",color:"#fff",fontSize:14,fontFamily:"'Noto Sans JP',sans-serif",outline:"none"};
  const lbl = {fontSize:11,color:"rgba(255,255,255,0.4)",letterSpacing:2,display:"block",marginBottom:6};

  return (
    <div style={{minHeight:"100vh",background:"radial-gradient(ellipse at 20% 0%,#3d0b00,#1a0500 50%,#0d0200)",fontFamily:"'Noto Sans JP',sans-serif",color:"#fff",paddingBottom:80}}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Noto+Sans+JP:wght@400;700&display=swap" rel="stylesheet"/>
      <div style={{background:"linear-gradient(180deg,rgba(232,93,4,0.25),transparent)",padding:"28px 20px 16px",textAlign:"center",borderBottom:"1px solid rgba(232,93,4,0.2)"}}>
        <div style={{fontSize:34}}>🍛</div>
        <div style={{fontSize:22,fontWeight:900,fontFamily:"'Playfair Display',serif",letterSpacing:2,marginTop:4}}>CURRY SCORE</div>
        <div style={{fontSize:11,color:"rgba(255,255,255,0.35)",letterSpacing:3,marginTop:2}}>カレー採点帳</div>
      </div>
      <div style={{display:"flex",borderBottom:"1px solid rgba(255,255,255,0.08)"}}>
        {[["form","✏️ 採点"],["rank","🏆 ランキング"]].map(([v,lb])=>(
          <button key={v} onClick={()=>setView(v)} style={{flex:1,padding:"12px 0",background:"none",border:"none",color:view===v?"#faa307":"rgba(255,255,255,0.4)",fontSize:13,fontWeight:view===v?700:400,borderBottom:view===v?"2px solid #faa307":"2px solid transparent",cursor:"pointer",fontFamily:"'Noto Sans JP',sans-serif"}}>{lb}</button>
        ))}
      </div>
      {view==="form" && (
        <div style={{padding:"20px 18px"}}>
          <div style={{marginBottom:16}}>
            <label style={lbl}>店名 / カレー名</label>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="例：スパイスカレー 〇〇" style={inp}/>
          </div>
          <div style={{display:"flex",gap:10,marginBottom:20}}>
            <div style={{flex:1}}>
              <label style={lbl}>日付</label>
              <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{...inp,fontSize:13,padding:"11px 12px"}}/>
            </div>
            <div style={{flex:1}}>
              <label style={lbl}>値段（円）</label>
              <div style={{position:"relative"}}>
                <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"rgba(255,255,255,0.35)",fontSize:13}}>¥</span>
                <input type="number" min={0} value={price} onChange={e=>setPrice(e.target.value)} placeholder="1200" style={{...inp,fontSize:13,padding:"11px 12px 11px 26px"}}/>
              </div>
            </div>
          </div>
          <div style={{background:"rgba(255,255,255,0.04)",borderRadius:16,padding:"14px",marginBottom:20,display:"flex",alignItems:"center"}}>
            <RadarChart scores={scores} size={190}/>
            <div style={{flex:1,textAlign:"center"}}>
              <div style={{fontSize:50,fontWeight:900,color:"#faa307",fontFamily:"'Playfair Display',serif",lineHeight:1}}>{totalScore(scores,price).toFixed(1)}</div>
              <div style={{fontSize:12,color:"rgba(255,255,255,0.4)",marginTop:4}}>基本 {baseScore(scores).toFixed(1)}{priceBonus(price)>0&&<span style={{color:"#ffba08"}}> +{priceBonus(price).toFixed(1)}</span>}</div>
            </div>
          </div>
          {CRITERIA.map(c=><Slider key={c.key} criterion={c} value={scores[c.key]} onChange={v=>setScores(s=>({...s,[c.key]:v}))}/>)}
          <div style={{margin:"8px 0 16px",padding:"10px 14px",background:"rgba(255,186,8,0.07)",borderRadius:10,fontSize:11,color:"rgba(255,255,255,0.4)",lineHeight:1.8}}>
            💴 値段ボーナス：〜¥800 <span style={{color:"#ffba08"}}>+1.0</span>　〜¥1,000 <span style={{color:"#ffba08"}}>+0.8</span>　〜¥1,200 <span style={{color:"#ffba08"}}>+0.6</span>　〜¥1,500 <span style={{color:"#ffba08"}}>+0.4</span>　〜¥2,000 <span style={{color:"#ffba08"}}>+0.2</span>
          </div>
          <div style={{marginBottom:20}}>
            <label style={lbl}>メモ（任意）</label>
            <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="感想・特徴など…" rows={2} style={{...inp,resize:"none"}}/>
          </div>
          <button onClick={handleSave} disabled={!name.trim()||saving} style={{width:"100%",padding:"15px",background:name.trim()?"linear-gradient(135deg,#e85d04,#faa307)":"rgba(255,255,255,0.1)",border:"none",borderRadius:12,color:name.trim()?"#fff":"rgba(255,255,255,0.3)",fontSize:15,fontWeight:700,cursor:name.trim()?"pointer":"default",fontFamily:"'Noto Sans JP',sans-serif",letterSpacing:1}}>
            {saving ? "保存中…" : "🍛 採点を保存する"}
          </button>
        </div>
      )}
      {view==="rank" && (
        <div style={{padding:"16px 18px"}}>
          {loading && <div style={{textAlign:"center",color:"rgba(255,255,255,0.4)",marginTop:60}}>読み込み中…</div>}
          {!loading && sorted.length===0 && <div style={{textAlign:"center",color:"rgba(255,255,255,0.3)",marginTop:60,fontSize:14}}>まだ採点がありません<br/>採点タブから追加してください 🍛</div>}
          {sorted.map((rec,idx)=>{
            const total=totalScore(rec,rec.price), base=baseScore(rec), bonus=priceBonus(rec.price);
            const isOpen=selected===rec.id, medal=idx===0?"🥇":idx===1?"🥈":idx===2?"🥉":`${idx+1}.`, col=COLORS[idx%COLORS.length];
            return (
              <div key={rec.id} onClick={()=>setSelected(isOpen?null:rec.id)}
                style={{background:isOpen?"rgba(232,93,4,0.15)":"rgba(255,255,255,0.04)",border:`1px solid ${isOpen?"rgba(232,93,4,0.4)":"rgba(255,255,255,0.08)"}`,borderRadius:14,marginBottom:10,overflow:"hidden",cursor:"pointer",transition:"all 0.2s"}}>
                <div style={{display:"flex",alignItems:"center",padding:"14px 16px",gap:12}}>
                  <div style={{fontSize:idx<3?22:15,minWidth:28,fontWeight:700,color:"rgba(255,255,255,0.5)"}}>{medal}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14,fontWeight:700}}>{rec.name}</div>
                    <div style={{fontSize:11,color:"rgba(255,255,255,0.4)",marginTop:2}}>{rec.date}{rec.price?`　¥${Number(rec.price).toLocaleString()}`:""}</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:28,fontWeight:900,fontFamily:"'Playfair Display',serif",color:col,lineHeight:1}}>{total.toFixed(1)}</div>
                    {bonus>0&&<div style={{fontSize:10,color:"#ffba08",marginTop:2}}>{base.toFixed(1)} +{bonus.toFixed(1)}</div>}
                  </div>
                </div>
                {isOpen&&(
                  <div style={{padding:"0 16px 16px",borderTop:"1px solid rgba(255,255,255,0.06)"}}>
                    <div style={{display:"flex",alignItems:"center",marginTop:12}}>
                      <RadarChart scores={rec} color={col} size={175}/>
                      <div style={{flex:1,paddingLeft:6}}>
                        {CRITERIA.map(c=>(
                          <div key={c.key} style={{display:"flex",justifyContent:"space-between",marginBottom:7,fontSize:12}}>
                            <span style={{color:"rgba(255,255,255,0.55)"}}>{c.emoji} {c.label}</span>
                            <span style={{fontWeight:700,color:col}}>{rec[c.key]}</span>
                          </div>
                        ))}
                        <div style={{borderTop:"1px solid rgba(255,255,255,0.08)",paddingTop:7,marginTop:4}}>
                          <div style={{display:"flex",justifyContent:"space-between",fontSize:12}}>
                            <span style={{color:"rgba(255,255,255,0.55)"}}>📊 基本点</span>
                            <span style={{fontWeight:700,color:"rgba(255,255,255,0.8)"}}>{base.toFixed(1)}</span>
                          </div>
                          {rec.price&&<div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginTop:5}}>
                            <span style={{color:"rgba(255,255,255,0.55)"}}>💴 値段ボーナス</span>
                            <span style={{fontWeight:700,color:"#ffba08"}}>+{bonus.toFixed(1)}</span>
                          </div>}
                          <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginTop:6,paddingTop:6,borderTop:"1px solid rgba(255,255,255,0.08)"}}>
                            <span style={{color:"rgba(255,255,255,0.8)",fontWeight:700}}>🏆 総合点</span>
                            <span style={{fontWeight:900,color:col,fontFamily:"'Playfair Display',serif"}}>{total.toFixed(1)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    {rec.note&&<div style={{marginTop:10,padding:"10px 12px",background:"rgba(255,255,255,0.05)",borderRadius:8,fontSize:12,color:"rgba(255,255,255,0.55)",lineHeight:1.7}}>💬 {rec.note}</div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
