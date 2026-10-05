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
  const party = getParty();

  if(party.length === 0){
    event.preventDefault();
    location.href = "party.html";
  }
});

renderParty();
