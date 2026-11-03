import { chromium } from "/Users/nickd/Workspaces/eniac-touch-kiosk/src/web/node_modules/@playwright/test/index.mjs";
import fs from "fs";
import {install,units,cam,jump} from "./camlib.mjs";
const OUT=process.argv[2]; fs.rmSync(OUT,{recursive:true,force:true}); fs.mkdirSync(OUT,{recursive:true});
const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:1080,height:1920},deviceScaleFactor:1,hasTouch:true,bypassCSP:true});
const p=await ctx.newPage();
const tapSel=async(sel)=>{const bb=await p.locator(sel).first().boundingBox();await p.touchscreen.tap(bb.x+bb.width/2,bb.y+bb.height/2)};
await p.goto("http://127.0.0.1:8762/");
await p.waitForSelector(".screen.start"); await tapSel(".screen.start"); await p.waitForSelector(".mission-card"); await p.waitForTimeout(800);
await tapSel(".pk-explore"); await p.waitForSelector(".pano .lamp.on",{state:"attached",timeout:30000});
await install(p);
const U=await p.evaluate(()=>{const o={};const strip=document.querySelector(".pano-strip");
 for(const u of document.querySelectorAll(".pano-unit")){o[u.dataset.id]={l:parseFloat(u.style.left),w:parseFloat(u.style.width),
  pw:[...u.querySelectorAll(".pw")].map(w=>{const r=w.getBoundingClientRect(),s=strip.getBoundingClientRect();return (r.x-s.x)+r.width/2})}}
 return o});
const C=id=>U[id].l+U[id].w/2;
await cam(p,C("a18"),4.5,0); await p.waitForTimeout(600);
// screencast
const cdp=await ctx.newCDPSession(p); const frames=[]; let n=0;
cdp.on("Page.screencastFrame",async f=>{const name=`f${String(n++).padStart(5,"0")}.jpg`;fs.writeFileSync(`${OUT}/${name}`,Buffer.from(f.data,"base64"));frames.push([f.metadata.timestamp,name]);cdp.send("Page.screencastFrameAck",{sessionId:f.sessionId}).catch(()=>{})});
await cdp.send("Page.startScreencast",{format:"jpeg",quality:93,maxWidth:1080,maxHeight:1920,everyNthFrame:1});
await p.waitForTimeout(300);
const T0=Date.now()/1000;
const E="cubic-bezier(.42,0,.25,1)", SLOW="cubic-bezier(.25,.1,.75,.9)";
const cues=[
 [0.0,()=>cam(p,C("a18"),4.9,3.2,272,SLOW)],
 [2.85,()=>jump(p,C("cyc"),4.5)],
 [3.8,()=>cam(p,C("cyc"),4.8,3.4,272,SLOW)],
 [7.2,()=>cam(p,U.mp.pw[0],4.5,0.75,272,E)],
 [10.0,()=>cam(p,U.mp.pw[1],4.5,1.0,272,E)],
 [13.2,()=>cam(p,C("a3"),4.5,0.75,272,E)],
 [13.9,()=>cam(p,C("a3"),4.8,3.2,272,SLOW)],
 [17.35,async()=>{await tapSel('.ex-mchips .mchip[data-mission="squares"]');await jump(p,C("init"),4.5)}],
 [18.55,()=>cam(p,C("a1"),4.5,0.9,272,E)],
 [19.55,()=>cam(p,C("a2"),4.5,0.8,272,E)],
 [20.4,()=>jump(p,U.ct.pw[0],4.5)],
 [21.55,()=>cam(p,U.ct.pw[1],4.5,0.8,272,E)],
 [22.7,async()=>{await tapSel('.ex-mchips .mchip[data-mission="trajectory"]');await jump(p,C("a1"),4.5)}],
 [23.3,()=>cam(p,C("a4"),4.5,0.45,272,E)],
 [23.9,()=>cam(p,C("a8"),4.5,0.45,272,E)],
 [24.5,()=>cam(p,U.mult.pw[1],4.5,0.45,272,E)],
 [25.1,()=>cam(p,C("a12"),4.5,0.45,272,E)],
 [25.7,()=>cam(p,C("a16"),4.5,0.45,272,E)],
 [26.3,()=>cam(p,C("a18"),4.5,0.45,272,E)],
 [26.95,()=>cam(p,3000,1.1,1.8,320,E)],
];
const END=33.0; let i=0;
while(true){const t=Date.now()/1000-T0; if(t>END)break;
 while(i<cues.length&&cues[i][0]<=t){const f=cues[i][1];i++;f().catch(e=>console.error(e));}
 await new Promise(r=>setTimeout(r,8));}
await cdp.send("Page.stopScreencast");
fs.writeFileSync(OUT+"/frames.json",JSON.stringify({T0,frames,U}));
console.log("frames",frames.length,"first",(frames[0][0]-T0).toFixed(2),"last",(frames.at(-1)[0]-T0).toFixed(2));
await b.close();
