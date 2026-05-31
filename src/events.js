/**
 * In-memory global event system.
 * Events persist only while the bot is running.
 */

const activeEvents = {
  lucky: null,   // { multiplier: number, endsAt: number (Date.now() + ms) }
  coins: null,   // { multiplier: number, endsAt: number }
  secrets: null  // { endsAt: number }
};

/**
 * Start a global event.
 * @param {'lucky'|'coins'|'secrets'} type
 * @param {object} params - { multiplier, durationMs }
 * @returns {boolean} false if event of this type is already active
 */
function startEvent(type, params) {
  clearExpired();
  if (activeEvents[type]) return false;

  const endsAt = Date.now() + params.durationMs;

  if (type === 'secrets') {
    activeEvents[type] = { endsAt };
  } else {
    activeEvents[type] = { multiplier: params.multiplier, endsAt };
  }

  // Auto-clear when expired
  setTimeout(() => {
    activeEvents[type] = null;
  }, params.durationMs);

  return true;
}

/**
 * Clear expired events.
 */
function clearExpired() {
  const now = Date.now();
  for (const key of Object.keys(activeEvents)) {
    if (activeEvents[key] && activeEvents[key].endsAt <= now) {
      activeEvents[key] = null;
    }
  }
}

/**
 * Get the current event luck multiplier.
 * @returns {number}
 */
function getEventLuckMultiplier() {
  clearExpired();
  return activeEvents.lucky ? activeEvents.lucky.multiplier : 1.0;
}

/**
 * Get the current event coin multiplier.
 * @returns {number}
 */
function getEventCoinMultiplier() {
  clearExpired();
  return activeEvents.coins ? activeEvents.coins.multiplier : 1.0;
}

/**
 * Check if the secret abuse event is active.
 * @returns {boolean}
 */
function isSecretEventActive() {
  clearExpired();
  return activeEvents.secrets !== null;
}

/**
 * Get all active events for display.
 * @returns {object[]}
 */
function getActiveEvents() {
  clearExpired();
  const result = [];
  const now = Date.now();

  if (activeEvents.lucky) {
    const remaining = Math.ceil((activeEvents.lucky.endsAt - now) / 1000);
    result.push({ type: 'lucky', multiplier: activeEvents.lucky.multiplier, remainingSec: remaining });
  }
  if (activeEvents.coins) {
    const remaining = Math.ceil((activeEvents.coins.endsAt - now) / 1000);
    result.push({ type: 'coins', multiplier: activeEvents.coins.multiplier, remainingSec: remaining });
  }
  if (activeEvents.secrets) {
    const remaining = Math.ceil((activeEvents.secrets.endsAt - now) / 1000);
    result.push({ type: 'secrets', remainingSec: remaining });
  }

  return result;
}

/**
 * Force-stop an event.
 * @param {'lucky'|'coins'|'secrets'} type
 */
function stopEvent(type) {
  activeEvents[type] = null;
}

module.exports = {
  startEvent,
  stopEvent,
  getEventLuckMultiplier,
  getEventCoinMultiplier,
  isSecretEventActive,
  getActiveEvents,
  clearExpired
};
