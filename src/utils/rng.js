const berries = require('../berries');
const config = require('../config');
const events = require('../events');

/**
 * Roll a berry based on player's luck, super luck, pollen, and active events.
 * Algorithm: iterate from rarest to most common, check probability.
 * 
 * AS-rarity berries are ONLY included when a secrets event is active.
 * Pollen provides a one-time extra multiplier on top of everything.
 */

// Sort berries from rarest to most common (highest chance first)
const sortedBerries = [...berries].sort((a, b) => b.chance - a.chance);

/**
 * @param {Object} player - Player data from DB
 * @param {number} [pollenMultiplier=1] - One-time pollen multiplier (10 or 100)
 * @returns {{ berry: Object, isSuperLuck: boolean }}
 */
function rollBerry(player, pollenMultiplier = 1) {
  const luckLevel = player.luck_level || 1;
  const superLuckLevel = player.super_luck_level || 1;
  const totalRolls = player.total_rolls || 0;

  // Get multipliers from config
  const luckMultiplier = config.UPGRADES.luck.multipliers[luckLevel - 1];
  
  // Check if this is a super luck roll (every 10th roll)
  const isSuperLuck = (totalRolls + 1) % config.SUPER_LUCK_INTERVAL === 0;
  const superLuckMultiplier = isSuperLuck 
    ? config.UPGRADES.super_luck.multipliers[superLuckLevel - 1] 
    : 1.0;

  // Event luck multiplier
  const eventLuckMult = events.getEventLuckMultiplier();

  // Combined multiplier
  const combinedMultiplier = luckMultiplier * superLuckMultiplier * eventLuckMult * pollenMultiplier;

  // Check if secrets event is active (AS berries become rollable)
  const secretEventActive = events.isSecretEventActive();

  // Roll for each berry from rarest to most common
  for (const berry of sortedBerries) {
    // Skip AS-rarity berries unless secrets event is active
    if (berry.rarity === 'AS' && !secretEventActive) {
      continue;
    }

    const probability = combinedMultiplier / berry.chance;
    
    if (Math.random() < probability) {
      return { berry, isSuperLuck };
    }
  }

  // Fallback: return the most common berry (Strawberry)
  const fallback = sortedBerries[sortedBerries.length - 1];
  return { berry: fallback, isSuperLuck };
}

module.exports = { rollBerry };
