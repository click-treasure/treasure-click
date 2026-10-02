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

async function loadCharacters(){
  if(!accessToken){
    location.href = "index.html";
    return;
  }

  try{
    const owned = await characterRequest(
      "/rest/v1/user_characters?select=character_id,copies"
    );

    const ownedMap = new Map(
      owned.map(x => [x.character_id, x.copies])
    );

    document.querySelectorAll("[data-character]").forEach(card => {
      const id = card.dataset.character;
      const copies = ownedMap.get(id);

      if(copies){
        card.classList.add("owned");

        const badge = document.createElement("div");
        badge.className = "copy-count";
        badge.textContent = "×" + copies;
        card.appendChild(badge);
      }
    });

    const count = ownedMap.size;
    const counter = document.getElementById("collectionCount");

    if(counter){
      counter.textContent = `${count} / 5`;
    }

  }catch(error){
    console.error("Character load failed:", error);
  }
}

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
      }

      badge.textContent = "×" + result.copies;
    }

    /* COLLECTION数もDBから再取得 */
    const owned = await characterRequest(
      "/rest/v1/user_characters?select=character_id,copies"
    );

    const counter = document.getElementById("collectionCount");

    if(counter){
      counter.textContent = `${owned.length} / 5`;
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
