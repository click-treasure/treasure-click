const PARTY_IMAGES = {
  slime: [
    "assets/characters/slime.png",
    "assets/characters/slime-evo1.png",
    "assets/characters/slime-evo2.png",
    "assets/characters/slime-evo3.png"
  ],
  golem: [
    "assets/characters/golem.png",
    "assets/characters/golem-evo1.png",
    "assets/characters/golem-evo2.png",
    "assets/characters/golem-evo3.png"
  ],
  fire_lizard: [
    "assets/characters/fire-lizard.png",
    "assets/characters/fire-lizard-evo1.png",
    "assets/characters/fire-lizard-evo2.png",
    "assets/characters/fire-lizard-evo3.png"
  ],
  forest_spirit: [
    "assets/characters/forest-spirit.png",
    "assets/characters/forest-spirit-evo1.png",
    "assets/characters/forest-spirit-evo2.png",
    "assets/characters/forest-spirit-evo3.png"
  ],
  mimic: [
    "assets/characters/mimic.png"
  ]
};

function getParty(){
  try{
    return JSON.parse(localStorage.getItem("ct_dungeon_party") || "[]");
  }catch{
    return [];
  }
}

function parsePartyEntry(entry){
  const [id, stageText] = String(entry).split("@");

  return {
    id,
    stage: Math.max(0, Math.min(3, Number(stageText || 0)))
  };
}

function renderParty(){
  const party = getParty();
  const container = document.getElementById("currentParty");
  const startButton = document.getElementById("dungeonMenuStart");

  container.innerHTML = "";

  for(let i = 0; i < 5; i++){
    const slot = document.createElement("div");
    slot.className = "party-slot";

    if(party[i]){
      const {id, stage} = parsePartyEntry(party[i]);
      const images = PARTY_IMAGES[id];
      const image = images?.[stage] || images?.[0];

      if(image){
        const img = document.createElement("img");
        img.src = image;
        img.alt = id;
        slot.appendChild(img);
      }else{
        slot.textContent = "?";
      }
    }else{
      slot.classList.add("empty");
      slot.textContent = "+";
    }

    container.appendChild(slot);
  }

  if(party.length === 0){
    startButton.classList.add("disabled");
    startButton.textContent = "⚠️ パーティを編成してください";
  }else{
    startButton.classList.remove("disabled");
    startButton.textContent = `⚔️ ${party.length}体で探索開始`;
  }
}

document.getElementById("dungeonMenuStart").addEventListener("click", event => {
  event.preventDefault();

  const party = getParty();

  if(party.length === 0){
    location.href = "party.html";
    return;
  }

  const selectedFloor =
    Number(localStorage.getItem("ct_dungeon_floor") || 1);

  localStorage.setItem(
    "ct_dungeon_floor",
    String(selectedFloor)
  );

  location.href = "dungeon.html";
});

renderParty();


// ===== Dungeon Floor Select =====
const floorSelectButtons =
  document.querySelectorAll(".floor-select-button");

const dungeonFloorInfo = {
  1: { name: "はじまりの森", recommendedLevel: "1〜25", boss: "DRAGON", description: "森を進み、最深部に待つドラゴンを撃破しよう。" },
  2: { name: "灼熱の洞窟", recommendedLevel: "26〜40", boss: "INFERNO GOLEM", description: "灼熱の洞窟を突破し、最深部の強敵を撃破しよう。" },
  3: { name: "氷結の遺跡", recommendedLevel: "41〜55", boss: "FROST WYRM", description: "凍てつく遺跡を進み、氷の支配者を撃破しよう。" },
  4: { name: "深淵の城", recommendedLevel: "56〜75", boss: "ABYSS LORD", description: "闇に沈んだ古城を進み、深淵の主を撃破しよう。" },
  5: { name: "天空神殿", recommendedLevel: "76〜100", boss: "SKY TITAN", description: "天空にそびえる神殿を登り、最上層の守護者を撃破しよう。" }
};

function selectDungeonFloor(floor){
  const selectedFloor = Number(floor) || 1;

  localStorage.setItem(
    "ct_dungeon_floor",
    String(selectedFloor)
  );

  floorSelectButtons.forEach(button => {
    button.classList.toggle(
      "active",
      Number(button.dataset.floor) === selectedFloor
    );
  });

  const info = dungeonFloorInfo[selectedFloor] || dungeonFloorInfo[1];

  // ===== Dungeon Menu Background =====
  const dungeonBackgrounds = {
    1: "assets/dungeons/beginning-forest.png",
    2: "assets/dungeon/volcanic-cave.png",
    3: "assets/dungeon/frozen-ruins.png",
    4: "assets/dungeon/abyss-castle.png",
    5: "assets/dungeon/sky-temple.png"
  };

  const dungeonMenuCard = document.querySelector(".dungeon-menu-card");

  if(dungeonMenuCard){
    dungeonMenuCard.style.background = `
      linear-gradient(
        90deg,
        rgba(5,8,10,.96) 0%,
        rgba(5,8,10,.82) 48%,
        rgba(5,8,10,.38) 100%
      ),
      url("${dungeonBackgrounds[selectedFloor]}") center / cover no-repeat
    `;
  }

  document.getElementById("dungeonNumber").textContent =
    `DUNGEON ${String(selectedFloor).padStart(2, "0")}`;

  document.getElementById("dungeonName").textContent = info.name;
  document.getElementById("dungeonFloor").textContent = selectedFloor;
  document.getElementById("dungeonRecommendedLevel").textContent = info.recommendedLevel;
  document.getElementById("dungeonBoss").textContent = info.boss;
  document.getElementById("dungeonDescription").textContent = info.description;
}

floorSelectButtons.forEach(button => {
  button.addEventListener("click", () => {
    selectDungeonFloor(button.dataset.floor);
  });
});

selectDungeonFloor(
  Number(localStorage.getItem("ct_dungeon_floor") || 1)
);


