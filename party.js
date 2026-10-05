const URL="https://xjnaombhyeyeibuarmcf.supabase.co", KEY="sb_publishable_QrdmDnaf8T4iIgHujdnTdw_hkeHDv6s";
const accessToken = localStorage.getItem("v261_access_token") || "";

async function characterRequest(path){
  const headers = {
    "apikey": KEY,
    "Authorization": "Bearer " + accessToken,
    "Content-Type": "application/json"
  };

  const response = await fetch(URL + path, { headers });

  if(!response.ok){
    throw new Error(await response.text());
  }

  return response.json();
}

function expToNextLevel(level){ if(level>=100)return 0; if(level<=10)return Math.round(30+(level-1)*(70/9)); if(level<=24)return Math.round(120+(level-11)*(180/13)); if(level<=40)return Math.round(350+(level-25)*(350/15)); if(level<=49)return Math.round(750+(level-41)*(350/8)); if(level<=65)return Math.round(1200+(level-50)*(800/15)); if(level<=74)return Math.round(2100+(level-66)*(900/8)); if(level<=90)return Math.round(3200+(level-75)*(1800/15)); return Math.round(5500+(level-91)*(2500/8)); }


/* ===== CLICK TREASURE : PARTY FORMATION ===== */
// ===== Dungeon Character Select =====

let selectedDungeonParty = [];
const DEV_MODE = location.hostname === "localhost" || location.hostname === "127.0.0.1";

function normalizeCharacterId(id){
  return id.replaceAll("-", "_");
}

function renderCurrentParty(){

  const container =
    document.getElementById("partyFormationSlots");

  if(!container) return;

  container.innerHTML="";

  for(let i=0;i<5;i++){

    const slot=document.createElement("div");
    slot.className="party-formation-slot";

    if(selectedDungeonParty[i]){

      const key=selectedDungeonParty[i];
      const [rawId,stageText]=String(key).split("@");

      const stage=Number(stageText || 0);

      const card=[...document.querySelectorAll(".character-card")]
        .find(card => {

          const id =
            card.dataset.character ||
            card.dataset.evolutionOf;

          const cardStage =
            Number(card.dataset.evolutionStage || 0);

          return normalizeCharacterId(id || "") === rawId &&
                 cardStage === stage;
        });

      if(card){

        const img=card.querySelector(".character-art img");

        if(img){
          const clone=img.cloneNode(true);
          clone.className="party-slot-image";
          slot.appendChild(clone);
        }

        const name=card.querySelector("h3");

        if(name){
          const nameEl=document.createElement("div");
          nameEl.className="party-slot-name";
          nameEl.textContent=name.textContent;
          slot.appendChild(nameEl);
        }

      }

      const number=document.createElement("span");
      number.className="party-slot-number";
      number.textContent=i+1;
      slot.appendChild(number);

    }else{

      slot.classList.add("empty");

      const plus=document.createElement("span");
      plus.textContent="+";
      slot.appendChild(plus);

    }

    container.appendChild(slot);
  }
}
function updateDungeonPartyUI(){

  renderCurrentParty();

  document.querySelectorAll(".character-card").forEach(card => {
    card.classList.remove("dungeon-selected");

    const oldNumber = card.querySelector(".dungeon-party-number");
    if(oldNumber) oldNumber.remove();
  });

  const cards = DEV_MODE
    ? document.querySelectorAll(".character-card")
    : document.querySelectorAll("[data-current-character]");

  cards.forEach(card => {

    let selectionKey;

    if(DEV_MODE){
      const rawId =
        card.dataset.character ||
        card.dataset.evolutionOf;

      if(!rawId) return;

      const id = normalizeCharacterId(rawId);
      const stage = Number(card.dataset.evolutionStage || 0);

      selectionKey = `${id}@${stage}`;

    }else{

      selectionKey =
        normalizeCharacterId(card.dataset.currentCharacter);
    }

    const index =
      selectedDungeonParty.indexOf(selectionKey);

    if(index !== -1){

      card.classList.add("dungeon-selected");

      const number = document.createElement("div");
      number.className = "dungeon-party-number";
      number.textContent = index + 1;

      card.appendChild(number);
    }
  });

  const startButton =
    document.getElementById("dungeonStartButton");

  if(startButton){

    if(selectedDungeonParty.length > 0){

      startButton.classList.add("ready");
      startButton.textContent =
        `✓ ${selectedDungeonParty.length}体で編成決定`;

    }else{

      startButton.classList.remove("ready");
      startButton.textContent =
        "✓ キャラクターを選択";
    }
  }

  localStorage.setItem(
    "ct_dungeon_party",
    JSON.stringify(selectedDungeonParty)
  );
}

document.addEventListener("click", (event) => {

  const card = DEV_MODE
    ? event.target.closest(".character-card")
    : event.target.closest("[data-current-character]");

  if(!card) return;

  if(event.target.closest(".evolve-button")){
    return;
  }

  if(!DEV_MODE && !card.classList.contains("owned")){
    return;
  }

  let selectionKey;

  if(DEV_MODE){

    const rawId =
      card.dataset.character ||
      card.dataset.evolutionOf;

    if(!rawId) return;

    const id = normalizeCharacterId(rawId);
    const stage = Number(card.dataset.evolutionStage || 0);

    selectionKey = `${id}@${stage}`;

  }else{

    selectionKey =
      normalizeCharacterId(card.dataset.currentCharacter);
  }

  const index =
    selectedDungeonParty.indexOf(selectionKey);

  if(index !== -1){

    selectedDungeonParty.splice(index, 1);

  }else{

    if(selectedDungeonParty.length >= 5){
      alert("ダンジョンに連れていけるのは最大5体です！");
      return;
    }

    selectedDungeonParty.push(selectionKey);
  }

  updateDungeonPartyUI();
});
// ===== Dungeon Start =====

const dungeonStartButton =
  document.getElementById("dungeonStartButton");

if(dungeonStartButton){

  dungeonStartButton.addEventListener("click", () => {

    if(selectedDungeonParty.length === 0){
      alert("ダンジョンに連れていくキャラクターを1体以上選んでください！");
      return;
    }

    localStorage.setItem(
      "ct_dungeon_party",
      JSON.stringify(selectedDungeonParty)
    );

    // 旧ダンジョンとの互換用
    // パーティ1番目を従来の1体データにも保存しておく
    localStorage.setItem(
      "ct_dungeon_character",
      selectedDungeonParty[0]
    );

    console.log(
      "[DUNGEON START PARTY]",
      selectedDungeonParty
    );

    location.href = "dungeon-menu.html";
  });
}

/* ===== PARTY: OWNED CHARACTER STATE ===== */

async function loadPartyOwnedCharacters(){

  if(!accessToken){
    location.href="index.html";
    return;
  }

  try{

    const owned = await characterRequest(
      "/rest/v1/user_characters?select=character_id,copies,level,exp,evolution_stage"
    );

    const ownedMap = new Map(
      owned.map(character => [
        character.character_id,
        character
      ])
    );

    document.querySelectorAll(".character-card").forEach(card => {

      const rawId =
        card.dataset.character ||
        card.dataset.evolutionOf;
      if(!rawId) return;

      const id = normalizeCharacterId(rawId);
      const character = ownedMap.get(id);

      const stage =
        Number(character?.evolution_stage ?? -1);

      const cardStage =
        Number(card.dataset.evolutionStage ?? 0);

      // 所持キャラは「現在の進化段階」のカードだけ編成可能
      const ownedThisStage =
        !!character && cardStage === stage;

      // 編成画面では現在編成可能な形態だけ表示
      card.style.display =
        ownedThisStage ? "" : "none";

      card.classList.toggle(
        "owned",
        ownedThisStage
      );

      card.classList.toggle(
        "party-unavailable",
        !ownedThisStage
      );

            const oldPartyInfo =
        card.querySelector(".party-level-info");

      if(oldPartyInfo) oldPartyInfo.remove();

      const info = document.createElement("div");
      info.className = "party-level-info";

      if(character){

        const level =
          Number(character.level ?? 1);

        const exp =
          Number(character.exp ?? 0);

        info.innerHTML =
          `<span>Lv.${level}</span><small>${exp} EXP</small>`;

        card.querySelector(".character-info")?.appendChild(info);
      }
card.dataset.partyOwned =
        ownedThisStage ? "true" : "false";
    });

    console.log(
      "[PARTY OWNED]",
      owned
    );

  }catch(error){

    console.error(
      "[PARTY OWNED LOAD FAILED]",
      error
    );

  }
}

loadPartyOwnedCharacters();






