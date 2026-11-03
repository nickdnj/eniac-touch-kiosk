export const CSS=`
.has-home{transform:none!important;overflow:visible!important;left:0!important;top:0!important}
.pano{position:fixed!important;left:0!important;top:0!important;width:1080px!important;height:1920px!important;z-index:99999;overflow:hidden!important;background:#07080a;pointer-events:none}
.pano-strip{transform-origin:0 0!important;transform:var(--cam)!important;transition:transform var(--dur,1s) var(--ease,cubic-bezier(.42,0,.25,1))!important}
.pano{transition:opacity .14s linear}
.pano .tag{display:none!important}
.pano .badge{display:none!important}
.pano svg{text-rendering:geometricPrecision!important;shape-rendering:geometricPrecision}
.pano-strip,.pano-strip *{will-change:auto!important;content-visibility:visible!important}
.pano *{cursor:none!important}
`;
export async function install(p){ await p.addStyleTag({content:CSS}); }
// unit geometry in strip px
export async function units(p){
  return p.evaluate(()=>[...document.querySelectorAll(".pano-unit")].map(u=>({id:u.dataset.id,cls:u.className,l:parseFloat(u.style.left),w:parseFloat(u.style.width),hl:u.classList.contains("hl"),
   panels:[...u.querySelectorAll(".pw")].map(w=>{const b=w.getBoundingClientRect();return {w:b.width,h:b.height}})})));
}
export async function cam(p,cx,k,dur=1,cy=272,ease='cubic-bezier(.42,0,.25,1)'){
  const tx=540-cx*k, ty=960-cy*k;
  await p.evaluate(([tx,ty,k,dur,ease])=>{document.documentElement.style.setProperty("--dur",dur+"s");document.documentElement.style.setProperty("--ease",ease);document.documentElement.style.setProperty("--cam",`translate(${tx}px,${ty}px) scale(${k})`)},[tx,ty,k,dur,ease]);
}

export async function jump(p,cx,k,cy=272){
  await p.evaluate(()=>{let d=document.getElementById("dip");if(!d){d=document.createElement("div");d.id="dip";d.style.cssText="position:fixed;inset:0;background:#07080a;z-index:100000;opacity:0;transition:opacity .13s linear;pointer-events:none";document.body.appendChild(d);d.getBoundingClientRect()}d.style.opacity="1"});
  await new Promise(r=>setTimeout(r,160));
  await cam(p,cx,k,0,cy);
  await new Promise(r=>setTimeout(r,70));
  await p.evaluate(()=>{document.getElementById("dip").style.opacity="0"});
}
