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

async function evolveCharacter(characterId){ const response = await fetch(URL + "/rest/v1/rpc/evolve_character", { method:"POST", headers:{ "apikey":KEY, "Authorization":"Bearer " + accessToken, "Content-Type":"application/json" }, body:JSON.stringify({ p_character_id:characterId }) }); if(!response.ok) throw new Error(await response.text()); return response.json(); }

async function loadCharacters(){
  if(!accessToken){
    location.href = "index.html";
    return;
  }

  try{
    const owned = await characterRequest(
      "/rest/v1/user_characters?select=character_id,copies,level,exp,evolution_stage"
    );

    const ownedMap = new Map(
      owned.map(x => [x.character_id, x])
    );

    document.querySelectorAll("[data-character]").forEach(card => {
      card.querySelectorAll(".copy-count, .character-level-info, .evolve-button").forEach(el => el.remove());
      const id = card.dataset.character;
      const character = ownedMap.get(id.replaceAll("-", "_"));
      const copies = character?.copies;

      if(copies){
        card.classList.add("owned");

        const badge = document.createElement("div");
        badge.className = "copy-count";
        badge.textContent = "×" + copies;
        card.appendChild(badge);

        const level = character?.level ?? 1;
        const exp = character?.exp ?? 0;
        const stage = character?.evolution_stage ?? 0;

// ===== 進化図鑑：未開放をシルエット化 =====
const evolutionRow = document.querySelector(
  `[data-evolution-line="${id}"]`
);

if(evolutionRow){
  const unlockedStage = Number(character.evolution_stage || 0);

  evolutionRow.querySelectorAll(".evolution-card").forEach(evoCard => {
    const evoStage = Number(evoCard.dataset.evolutionStage ?? 0);
    const unlocked = evoStage <= unlockedStage;

    evoCard.classList.toggle("evolution-locked", !unlocked);
    evoCard.classList.toggle("owned", unlocked);
  });
}


        // 現在の進化形態のカードを取得
        const currentCard = evolutionRow
          ? evolutionRow.querySelector(`[data-evolution-stage="${stage}"]`)
          : card;

        const activeCard = currentCard || card;

        // 現在形態をダンジョン選択対象にする
        activeCard.dataset.currentCharacter = id.replaceAll("-", "_");

        const levelCap = [25,50,75,100][stage] ?? 25;
        const required = expToNextLevel(level);
        const progress = level >= levelCap ? 100 : Math.min(100, Math.round((exp / required) * 100));
        const info = document.createElement("div");
        info.className = "character-level-info";
        info.innerHTML = `<strong>Lv.${level}</strong><span>EXP ${exp} / ${level >= levelCap ? "MAX" : required}</span><div class="character-exp-bar"><i style="width:${progress}%"></i></div>`;
        activeCard.querySelector(".character-info")?.appendChild(info);
        if(stage < 3 && level >= levelCap){ const evolve = document.createElement("button"); evolve.className = "evolve-button"; evolve.textContent = "✨ 進化可能！"; evolve.dataset.characterId = id.replaceAll("-", "_"); evolve.dataset.stage = stage; activeCard.querySelector(".character-info")?.appendChild(evolve); }
      }
    });

    const count = owned.reduce((total, character) => {
      const id = character.character_id;

      // ミミックは進化なしなので1枠だけ
      if(id === "mimic"){
        return total + 1;
      }

      // 実際に進化して解放した姿だけ図鑑にカウント
      const evolutionStage = Number(character.evolution_stage || 0);
      return total + Math.min(evolutionStage + 1, 4);
    }, 0);

    const counter = document.getElementById("collectionCount");

    if(counter){
      counter.textContent = `${count} / 17`;
    }

  }catch(error){
    console.error("Character load failed:", error);
  }
}

document.addEventListener("click", async (event) => {
  const button = event.target.closest(".evolve-button");

  if(!button){
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  const characterId = button.dataset.characterId;

  if(!characterId){
    return;
  }

  try{
    button.disabled = true;
    button.textContent = "✨ 進化中...";

    await evolveCharacter(characterId);

    await loadCharacters();

    alert("✨ 進化しました！");
  }catch(error){
    console.error("進化エラー:", error);
    alert("進化に失敗しました。\n" + error.message);

    button.disabled = false;
    button.textContent = "✨ 進化可能！";
  }
});

loadCharacters();
/* ===== DEV Character Draw Tester ===== */

const CHARACTER_NAMES = {
  slime: "スライム",
  golem: "ゴーレム",
  fire_lizard: "ファイアリザード",
  forest_spirit: "森の精霊",
  mimic: "ミミック"
};

async function testCharacterDraw(difficulty){
  const resultEl = document.getElementById("characterTestResult");

  if(resultEl){
    resultEl.textContent = `${difficulty.toUpperCase()} 抽選中…`;
  }

  try{
    const response = await fetch(URL + "/rest/v1/rpc/draw_character", {
      method: "POST",
      headers: {
        "apikey": KEY,
        "Authorization": "Bearer " + accessToken,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        p_difficulty: difficulty
      })
    });

    const data = await response.json();

    if(!response.ok){
      throw new Error(JSON.stringify(data));
    }

    const result = Array.isArray(data) ? data[0] : data;

    if(!result || !result.won){
      resultEl.textContent =
        `❌ ${difficulty.toUpperCase()}：キャラクターなし`;
      return;
    }

    const name =
      CHARACTER_NAMES[result.character_id] || result.character_id;

    resultEl.textContent =
      `🎉 ★${result.rarity} ${name} GET！　所持 ×${result.copies}`;

    /* 図鑑を即時解放 */
    const card = document.querySelector(
      `[data-character="${result.character_id.replaceAll("_","-")}"]`
    );

    if(card){
      card.classList.add("owned");

      let badge = card.querySelector(".copy-count");

      if(!badge){
        badge = document.createElement("div");
        badge.className = "copy-count";
        card.appendChild(badge);

        const level = character?.level ?? 1;
        const exp = character?.exp ?? 0;
        const stage = character?.evolution_stage ?? 0;

// ===== 進化図鑑：未開放をシルエット化 =====
const evolutionRow = document.querySelector(
  `[data-evolution-line="${id}"]`
);

if(evolutionRow){
  const unlockedStage = Number(character.evolution_stage || 0);

  evolutionRow.querySelectorAll(".evolution-card").forEach(evoCard => {
    const evoStage = Number(evoCard.dataset.evolutionStage ?? 0);
    const unlocked = evoStage <= unlockedStage;

    evoCard.classList.toggle("evolution-locked", !unlocked);
    evoCard.classList.toggle("owned", unlocked);
  });
}


        // 現在の進化形態のカードを取得
        const currentCard = evolutionRow
          ? evolutionRow.querySelector(`[data-evolution-stage="${stage}"]`)
          : card;

        const activeCard = currentCard || card;

        // 現在形態をダンジョン選択対象にする
        activeCard.dataset.currentCharacter = id.replaceAll("-", "_");

        const levelCap = [25,50,75,100][stage] ?? 25;
        const required = expToNextLevel(level);
        const progress = level >= levelCap ? 100 : Math.min(100, Math.round((exp / required) * 100));
        const info = document.createElement("div");
        info.className = "character-level-info";
        info.innerHTML = `<strong>Lv.${level}</strong><span>EXP ${exp} / ${level >= levelCap ? "MAX" : required}</span><div class="character-exp-bar"><i style="width:${progress}%"></i></div>`;
        activeCard.querySelector(".character-info")?.appendChild(info);
        if(stage < 3 && level >= levelCap){ const evolve = document.createElement("button"); evolve.className = "evolve-button"; evolve.textContent = "✨ 進化可能！"; evolve.dataset.characterId = id.replaceAll("-", "_"); evolve.dataset.stage = stage; activeCard.querySelector(".character-info")?.appendChild(evolve); }
      }

      badge.textContent = "×" + result.copies;
    }

    /* COLLECTION数もDBから再取得 */
    const owned = await characterRequest(
      "/rest/v1/user_characters?select=character_id,copies,level,exp,evolution_stage"
    );

    const count = owned.reduce((total, character) => {
      const id = character.character_id;
      const level = Number(character.level || 1);

      if(id === "mimic"){
        return total + 1;
      }

      const unlockedForms =
        level >= 75 ? 4 :
        level >= 50 ? 3 :
        level >= 25 ? 2 : 1;

      return total + unlockedForms;
    }, 0);

    const counter = document.getElementById("collectionCount");

    if(counter){
      counter.textContent = `${count} / 17`;
    }

  }catch(error){
    console.error(error);

    if(resultEl){
      resultEl.textContent = "⚠️ 抽選エラー";
    }
  }
}

document.querySelectorAll("[data-character-test]").forEach(button => {
  button.addEventListener("click", () => {
    testCharacterDraw(button.dataset.characterTest);
  });
});

