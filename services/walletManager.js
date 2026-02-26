// services/walletManager.js (CommonJS)
const { ethers } = require("ethers");

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

class WalletSlot {
  constructor(wallet) {
    this.wallet = wallet;
    this.busy = false;
    this.lastSentAt = 0; // ms
    this.nextNonce = null; // lazy init
    this.queue = Promise.resolve(); // serialisation par wallet
  }

  async _initNonce() {
    if (this.nextNonce !== null) return;
    const nonce = await this.wallet.getNonce("pending");
    this.nextNonce = nonce;
  }

  /**
   * Exécute une tx factory() en garantissant:
   * - une seule tx à la fois par wallet
   * - 1 tx/sec max
   * - nonce manuel incrémental
   */
  run(factoryFn) {
    this.queue = this.queue.then(async () => {
      this.busy = true;
      try {
        await this._initNonce();

        // rate limit 1 tx/sec
        const now = Date.now();
        const wait = 1000 - (now - this.lastSentAt);
        if (wait > 0) await sleep(wait);

        const nonceToUse = this.nextNonce;

        // On force nonce ici: factoryFn doit accepter (overrides) ou renvoyer txResponse
        const txResponse = await factoryFn({ nonce: nonceToUse });

        this.lastSentAt = Date.now();
        this.nextNonce += 1;

        return txResponse;
      } finally {
        this.busy = false;
      }
    });

    return this.queue;
  }
}

class WalletManager {
  constructor({ provider, privateKeys }) {
    if (!privateKeys || privateKeys.length === 0) {
      throw new Error("No PRIVATE_KEYS provided");
    }
    this.provider = provider;
    this.slots = privateKeys.map((pk) => new WalletSlot(new ethers.Wallet(pk, provider)));
    this.rr = 0;
  }

  getWalletAddresses() {
    return this.slots.map((s) => s.wallet.address);
  }

  /**
   * Round-robin: prend le prochain wallet, mais si tous sont "busy",
   * on attend qu’un se libère (simple, robuste).
   */
  async pickSlot() {
    while (true) {
      for (let i = 0; i < this.slots.length; i++) {
        const idx = (this.rr + i) % this.slots.length;
        const slot = this.slots[idx];
        // On accepte même "busy" car queue sérialise; mais pour répartir, on préfère pas busy
        if (!slot.busy) {
          this.rr = (idx + 1) % this.slots.length;
          return slot;
        }
      }
      // Tous busy -> petite pause
      await sleep(50);
    }
  }

  /**
   * Exécute un envoi via un wallet sélectionné.
   * factory(slotWallet, overrides) => txResponse
   */
  async send(factory) {
    const slot = await this.pickSlot();
    return slot.run((overrides) => factory(slot.wallet, overrides));
  }
}

module.exports = { WalletManager };