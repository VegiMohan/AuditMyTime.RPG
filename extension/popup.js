// --- AUDITMYTIME.RPG // POPUP HUD LOGIC ---

let chatAISession = null;

document.addEventListener("DOMContentLoaded", async () => {
  const txtMana = document.getElementById("txt-mana");
  const barMana = document.getElementById("bar-mana");
  const txtXp = document.getElementById("txt-xp");
  const barXp = document.getElementById("bar-xp");
  const aiStatus = document.getElementById("ai-status");
  const chatStream = document.getElementById("chat-stream");
  const btnAnalyze = document.getElementById("btn-analyze-perf");

  // 1. Sync Live Telemetry Data
  function updateHUD() {
    chrome.storage.local.get(["mana", "xp", "level"], (data) => {
      const mana = data.mana ?? 100;
      const xp = data.xp ?? 0;
      const level = data.level ?? 1;

      txtMana.innerText = `${mana}/100`;
      barMana.style.width = `${mana}%`;

      txtXp.innerText = `${xp}/100 XP (Lvl ${level})`;
      barXp.style.width = `${xp}%`;
    });
  }
  updateHUD();
  setInterval(updateHUD, 1000);

  // Helper to append messages to the chat drawer
  function appendMessage(sender, text) {
    const div = document.createElement("div");
    div.style.marginBottom = "4px";
    div.innerHTML = `<span style="color: ${sender === 'AI' ? '#00f5ff' : '#fab387'}">[${sender}]</span> ${text}`;
    chatStream.appendChild(div);
    chatStream.scrollTop = chatStream.scrollHeight;
  }

  // 2. Initialize Native Gemini Nano (`window.ai`)
  try {
    if (window.ai && window.ai.languageModel) {
      const capability = await window.ai.languageModel.capabilities();
      if (capability.available === "readily") {
        chatAISession = await window.ai.languageModel.create();
        aiStatus.innerText = "Online (Local)";
        aiStatus.style.color = "#a6e3a1";
        appendMessage("AI", "Gemini Nano online. Ready for telemetry audit.");
      } else if (capability.available === "after-download") {
        aiStatus.innerText = "Downloading Model...";
        chatAISession = await window.ai.languageModel.create({
          monitor(m) {
            m.addEventListener("downloadprogress", (e) => {
              aiStatus.innerText = `Downloading (${Math.floor(e.loaded / e.total * 100)}%)`;
            });
          }
        });
        aiStatus.innerText = "Online (Ready)";
        aiStatus.style.color = "#a6e3a1";
        appendMessage("AI", "Model download complete. Systems active.");
      } else {
        aiStatus.innerText = "Unavailable";
        aiStatus.style.color = "#f38ba8";
        appendMessage("SYS", "Local AI capabilities not supported on current hardware.");
      }
    } else {
      aiStatus.innerText = "Unsupported Browser";
      aiStatus.style.color = "#f38ba8";
      appendMessage("SYS", "window.ai API not detected.");
    }
  } catch (err) {
    aiStatus.innerText = "Error Init";
    aiStatus.style.color = "#f38ba8";
    appendMessage("SYS", "Failed to start local AI runtime.");
  }

  // 3. AI Performance Audit Trigger
  btnAnalyze.addEventListener("click", async () => {
    if (!chatAISession) {
      appendMessage("SYS", "AI Coach session not ready.");
      return;
    }

    chrome.storage.local.get(["mana", "xp", "level"], async (data) => {
      const mana = data.mana ?? 100;
      const xp = data.xp ?? 0;
      const level = data.level ?? 1;

      const auditPrompt = `Analyze my digital focus stats: Level ${level}, XP ${xp}/100, Mana ${mana}/100. Give a short, gamified critique and 1 actionable focus tip.`;

      appendMessage("USER", "⚡ Requesting AI Performance Audit...");
      try {
        const review = await chatAISession.prompt(auditPrompt);
        appendMessage("AI", review);
      } catch (e) {
        appendMessage("AI", "Processing error during performance audit.");
      }
    });
  });
});
