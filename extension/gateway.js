// --- AUDITMYTIME.RPG // GATEWAY RIDDLE ENGINE ---

const STATIC_RIDDLES = [
  { q: "What is the time complexity of looking up an item in a JavaScript Set or Map? (e.g., O(1))", a: "o(1)" },
  { q: "Which Chromium manifest version introduced service workers as background scripts instead of persistent background pages?", a: "v3" },
  { q: "What cryptographic hashing algorithm is used by the extension's Crypt Vault state signature?", a: "sha-256" }
];

document.addEventListener("DOMContentLoaded", async () => {
  const riddleText = document.getElementById("riddle-text");
  const answerInput = document.getElementById("answer-input");
  const btnSubmit = document.getElementById("btn-submit");

  let currentSolution = "";

  // Attempt to generate riddle via window.ai or fallback to static array
  async function loadRiddle() {
    try {
      if (window.ai && window.ai.languageModel) {
        const session = await window.ai.languageModel.create();
        const promptText = "Generate a very short, single-answer technical programming riddle. Format your response strictly as 'QUESTION: [your question]|ANSWER:[the single word lowercase answer]'.";
        const response = await session.prompt(promptText);
        
        if (response.includes("QUESTION:") && response.includes("ANSWER:")) {
          const parts = response.split("|");
          const q = parts[0].replace("QUESTION:", "").trim();
          const a = parts[1].replace("ANSWER:", "").trim().toLowerCase();
          riddleText.innerText = q;
          currentSolution = a;
          return;
        }
      }
    } catch (e) {
      // Fallback if local AI fails
    }

    // Static Fallback
    const randomRiddle = STATIC_RIDDLES[Math.floor(Math.random() * STATIC_RIDDLES.length)];
    riddleText.innerText = randomRiddle.q;
    currentSolution = randomRiddle.a;
  }

  loadRiddle();

  btnSubmit.addEventListener("click", () => {
    const userAnswer = answerInput.value.trim().toLowerCase();
    if (userAnswer === currentSolution || userAnswer.includes(currentSolution)) {
      // Correct! Refill Mana and XP
      chrome.storage.local.get(["mana", "xp", "level"], (data) => {
        const newMana = 50; // Restore 50 Mana
        const newXp = (data.xp ?? 0) + 25; // Grant 25 XP
        let newLevel = data.level ?? 1;

        if (newXp >= 100) {
          newLevel += 1;
        }

        chrome.storage.local.set({ mana: newMana, xp: newXp % 100, level: newLevel }, () => {
          alert("Gateway Unlocked! +50 Mana Restored.");
          window.location.href = "chrome://newtab";
        });
      });
    } else {
      alert("Incorrect solution. System verification failed.");
      answerInput.value = "";
    }
  });
});
