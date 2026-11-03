// --- AUDITMYTIME.RPG // BACKGROUND SERVICE WORKER ---

const BLACKLIST = ["instagram.com", "youtube.com", "tiktok.com", "twitter.com", "x.com", "facebook.com"];
const SECRET_SALT = "AUDITMYTIME_RPG_SECURE_SALT_2026";

// 1. Crypt Vault: SHA-256 State Signer & Verifier
async function signState(mana, xp, level) {
  const payload = `${mana}:${xp}:${level}:${SECRET_SALT}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(payload);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyAndSaveState(mana, xp, level) {
  const hash = await signState(mana, xp, level);
  chrome.storage.local.set({ mana, xp, level, vaultHash: hash });
}

// Initialize default state on install
chrome.runtime.onInstalled.addListener(async () => {
  chrome.storage.local.get(["mana"], async (data) => {
    if (data.mana === undefined) {
      await verifyAndSaveState(100, 0, 1);
    }
  });
});

// 2. Guard Node: Tab Interception & Mana Drawdown
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === "loading" && tab.url) {
    const isBlacklisted = BLACKLIST.some(domain => tab.url.includes(domain));
    if (isBlacklisted) {
      chrome.storage.local.get(["mana", "xp", "level", "vaultHash"], async (data) => {
        let mana = data.mana ?? 100;
        const xp = data.xp ?? 0;
        const level = data.level ?? 1;

        // Verify cryptographic vault integrity
        const expectedHash = await signState(mana, xp, level);
        if (data.vaultHash !== expectedHash && data.vaultHash !== undefined) {
          // Tamper detected! Reset state to safe minimum
          mana = 0;
        }

        if (mana > 0) {
          mana = Math.max(0, mana - 10);
          await verifyAndSaveState(mana, xp, level);
        } else {
          // Redirect to lockout gateway when Mana is exhausted
          const gatewayUrl = chrome.runtime.getURL("gateway.html");
          chrome.tabs.update(tabId, { url: gatewayUrl });
        }
      });
    }
  }
});

// 3. Hardware Idle Recovery (chrome.idle)
chrome.idle.setDetectionInterval(60); // 60 seconds
chrome.idle.onStateChanged.addListener(async (newState) => {
  if (newState === "active") {
    chrome.storage.local.get(["mana", "xp", "level"], async (data) => {
      let mana = data.mana ?? 100;
      if (mana < 100) {
        mana = Math.min(100, mana + 5); // Passive hardware recovery bonus
        await verifyAndSaveState(mana, data.xp ?? 0, data.level ?? 1);
      }
    });
  }
});
