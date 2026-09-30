// V88-40 Golden Island standalone runtime
const URL='https://osawhwcddovhddrxgfju.supabase.co', KEY='sb_publishable_AMGEh3TguYyEpd7piWIjTQ_oHlYdG8f';
let accessToken="", currentUser=null, goldenTickets=0, opening=false;
const $=id=>document.getElementById(id);

async function req(path,options={}){
  const headers=Object.assign({"apikey":KEY,"Content-Type":"application/json"},options.headers||{});
  if(accessToken) headers.Authorization="Bearer "+accessToken;
  const r=await fetch(URL+path,{...options,headers});
  const t=await r.text();
  if(!r.ok) throw new Error(t||("HTTP "+r.status));
  return t?JSON.parse(t):null;
}

async function restoreAuth(){
  // Use exactly the same auth storage as the homepage app.js.
  accessToken=localStorage.getItem("v261_access_token")||"";
  const savedUser=localStorage.getItem("v261_user");
  try{ currentUser=savedUser?JSON.parse(savedUser):null; }catch(_e){ currentUser=null; }

  if(!accessToken) throw new Error("no saved access token");

  const r=await fetch(URL+"/auth/v1/user",{
    headers:{apikey:KEY,Authorization:"Bearer "+accessToken}
  });
  if(!r.ok) throw new Error("session verify failed");

  currentUser=await r.json();
  if(!currentUser?.id) throw new Error("user id missing");

  // Keep the verified user synchronized with the homepage storage.
  localStorage.setItem("v261_user",JSON.stringify(currentUser));
}

async function loadTickets(){
  const d=await req("/rest/v1/golden_ticket_wallets?user_id=eq."+encodeURIComponent(currentUser.id)+"&select=tickets,total_found,total_used");
  goldenTickets=Number(d?.[0]?.tickets||0);
  $("goldenTicketsInGame").textContent=goldenTickets;
}

function renderMap(){
  const map=$("goldenMap"); map.innerHTML="";
  for(let i=0;i<50;i++){
    const b=document.createElement("button");
    b.type="button"; b.className="golden-chest"+(goldenTickets<=0?" ticket-locked":"");
    b.disabled=goldenTickets<=0||opening;
    b.innerHTML='<img src="./assets/golden-chest-closed-v88.webp" alt="">';
    b.onclick=()=>dig(b);
    map.appendChild(b);
  }
}

function message(){
  $("goldenMessage").textContent=goldenTickets>0
    ?"✨ 50個から黄金の宝箱を1つ選ぼう"
    :"🎫 黄金島チケットがありません";
}

function playGoldenAudio(id){
  const a=$(id);
  if(!a)return;
  try{
    a.pause(); a.currentTime=0; a.volume=1;
    const q=a.play(); if(q&&q.catch)q.catch(()=>{});
  }catch(_e){}
}
function goldenConfetti(count=36){
  const layer=document.createElement("div");
  layer.className="win-confetti-layer";
  for(let i=0;i<count;i++){
    const s=document.createElement("i");
    s.style.left=(Math.random()*100)+"vw";
    s.style.setProperty("--dx",((Math.random()-.5)*360)+"px");
    layer.appendChild(s);
  }
  document.body.appendChild(layer);
  setTimeout(()=>layer.remove(),1700);
}
function goldenPrizeOverlay(points){
  const d=document.createElement("div");
  d.className="prize-overlay "+(points>=1000?"prize-tier-mega":points>=500?"prize-tier-big":"prize-tier-small");
  d.innerHTML=points>=1000
    ?`<div class="prize-kicker">GOLDEN JACKPOT!</div><div class="prize-main">${points.toLocaleString("ja-JP")}P！！！</div>`
    :points>=500
      ?`<div class="prize-kicker">黄金大当たり！</div><div class="prize-main">${points.toLocaleString("ja-JP")}P！！！</div>`
      :`<div class="prize-main">${points.toLocaleString("ja-JP")}P GET!</div>`;
  document.body.appendChild(d);
  setTimeout(()=>d.remove(),points>=500?1450:900);
}
function goldenJackpot(points){
  const o=$("jackpotOverlay");
  if(!o)return goldenPrizeOverlay(points);
  $("jackpotAmount").textContent=points.toLocaleString("ja-JP");
  $("jackpotLabel").textContent=points>=1000?"💎 黄金超大当たり！！ 💎":"✨ 黄金大当たり！！ ✨";
  $("jackpotBang").textContent=points>=1000?"！！！ JACKPOT ！！！":"！！！";
  o.classList.remove("show"); void o.offsetWidth;
  o.classList.add("show"); o.setAttribute("aria-hidden","false");
  goldenConfetti(points>=1000?60:42);
  setTimeout(()=>{o.classList.remove("show");o.setAttribute("aria-hidden","true")},2150);
}
function playGoldenWin(points,button){
  button?.classList.add("golden-opening-flash");
  setTimeout(()=>button?.classList.remove("golden-opening-flash"),900);
  // Golden rewards: 100P / 500P / 1000P.
  if(points>=1000){
    playGoldenAudio("goldenWin100");
    goldenJackpot(points);
  }else if(points>=500){
    playGoldenAudio("goldenWin10");
    goldenJackpot(points);
  }else{
    playGoldenAudio("goldenWin1");
    goldenPrizeOverlay(points);
    goldenConfetti(22);
  }
}

async function dig(button){
  if(opening||goldenTickets<=0)return;
  opening=true;
  document.querySelectorAll(".golden-chest").forEach(b=>b.disabled=true);
  $("goldenMessage").textContent="✨ 黄金の宝箱を開封中…";
  try{
    const d=await req("/rest/v1/rpc/dig_golden_island",{method:"POST",body:"{}"}); 
    const x=Array.isArray(d)?d[0]:d;
    if(!x) throw new Error("empty result");
    const pp=Number(x.prize_points||0);
    button.classList.add("opened-gold");
    button.innerHTML=`<img src="./assets/golden-chest-open-v88.webp" alt=""><strong>${pp.toLocaleString("ja-JP")}P</strong>`;
    $("goldenMessage").textContent=`🎉 ${pp.toLocaleString("ja-JP")}P GET！`;
    playGoldenWin(pp,button);
    await loadTickets();
    await new Promise(r=>setTimeout(r,1400));
  }catch(e){
    console.error(e);
    $("goldenMessage").textContent="⚠ 開封できませんでした";
  }finally{
    opening=false; renderMap(); message();
  }
}

async function boot(){
  try{
    $("goldenMessage").textContent="ログイン情報を確認中…";
    await restoreAuth();
    await loadTickets();
    renderMap(); message();
  }catch(e){
    console.error("golden boot",e);
    $("goldenTicketsInGame").textContent="—";
    goldenTickets=0; renderMap();
    document.querySelectorAll(".golden-chest").forEach(b=>b.disabled=true);
    $("goldenMessage").textContent="⚠ ログイン情報を取得できません。島一覧へ戻って再ログインしてください";
  }
}
document.addEventListener("DOMContentLoaded",boot);
