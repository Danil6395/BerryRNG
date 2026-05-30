const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const path = require('path');
const config = require('../config');
const berries = require('../berries');

const ASSETS_PATH = path.join(__dirname, '..', '..', 'assets');

/**
 * Format a number with commas: 100000000 → 100,000,000
 */
function formatNumber(n) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Get rarity info from config
 */
function getRarity(rarityKey) {
  return config.RARITIES[rarityKey] || config.RARITIES.C;
}

/**
 * Build the main menu embed and buttons
 */
function buildMainMenu(player, ownerId) {
  const embed = new EmbedBuilder()
    .setTitle('🍓 BerryRNG')
    .setDescription(
      `Добро пожаловать, **${player.username}**!\n\n` +
      `🎰 Роллов: **${formatNumber(player.total_rolls)}**\n` +
      `🪙 Монет: **${formatNumber(player.coins)}**\n\n` +
      `Жми **Крутить** чтобы испытать удачу!`
    )
    .setColor(0x2ECC71)
    .setFooter({ text: 'BerryRNG • Собери все 42 ягоды!' })
    .setTimestamp();

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`spin:${ownerId}`)
      .setLabel('🎰 Крутить')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`upgrade_menu:${ownerId}`)
      .setLabel('⬆️ Апгрейды')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`inventory:${ownerId}`)
      .setLabel('💰 Продажа')
      .setStyle(ButtonStyle.Secondary),
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`profile_view:${ownerId}`)
      .setLabel('👤 Профиль')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`encyclopedia:${ownerId}`)
      .setLabel('📖 Энциклопедия')
      .setStyle(ButtonStyle.Primary)
  );

  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`local_play:${ownerId}`)
      .setLabel('🌐 Играть Локально')
      .setStyle(ButtonStyle.Secondary)
  );

  return { embed, rows: [row1, row2, row3] };
}

/**
 * Build spin result embed
 */
function buildSpinResult(berry, rollResult, rollNumber, isSuperLuck, ownerId) {
  const rarity = getRarity(berry.rarity);
  const { isNew, quantity, timesRolled } = rollResult;

  let description = `${rarity.emoji} **${rarity.name}**\n`;
  description += `🎲 Шанс: **1 in ${formatNumber(berry.chance)}**\n`;
  description += `🔄 Ролл #**${formatNumber(rollNumber)}**\n`;
  description += `📦 В инвентаре: **${formatNumber(quantity)}** шт.\n`;
  description += `📊 Выбито всего: **${formatNumber(timesRolled)}** раз`;

  if (isSuperLuck) {
    description = `⭐ **СУПЕР-УДАЧА!** ⭐\n\n` + description;
  }

  const embed = new EmbedBuilder()
    .setTitle(`${rarity.emoji} ${berry.name}`)
    .setDescription(description)
    .setColor(rarity.color)
    .setThumbnail(`attachment://${berry.file}`)
    .setTimestamp();

  if (isNew) {
    embed.addFields(
      { name: '🆕 НОВИНКА!', value: '━━━━━━━━━━━━━━━━━━━━', inline: false },
      { name: '📝 Описание', value: berry.description, inline: false },
      { name: '🌍 Место зарождения', value: berry.origin, inline: true },
      { name: '📅 Сезон', value: berry.season, inline: true },
      { name: '🍽️ Съедобность', value: berry.edible ? '✅ Съедобная' : '❌ Несъедобная', inline: true },
    );
  }

  const attachment = new AttachmentBuilder(path.join(ASSETS_PATH, berry.file));

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`spin:${ownerId}`)
      .setLabel('🎰 Крутить')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`back_menu:${ownerId}`)
      .setLabel('🔙 Меню')
      .setStyle(ButtonStyle.Secondary),
  );

  return { embed, row, attachment };
}

/**
 * Build upgrade menu embed
 */
function buildUpgradeMenu(player, ownerId) {
  const fields = [];

  for (const [key, upgrade] of Object.entries(config.UPGRADES)) {
    const levelKey = key === 'luck' ? 'luck_level' : key === 'super_luck' ? 'super_luck_level' : 'sell_bonus_level';
    const currentLevel = player[levelKey] || 1;
    const currentMult = upgrade.multipliers[currentLevel - 1];
    const isMaxed = currentLevel >= config.MAX_UPGRADE_LEVEL;
    const nextCost = isMaxed ? '—' : formatNumber(upgrade.costs[currentLevel]);
    const nextMult = isMaxed ? '—' : `x${upgrade.multipliers[currentLevel]}`;

    let value = `Уровень: **${currentLevel}/${config.MAX_UPGRADE_LEVEL}** • Множитель: **x${currentMult}**\n`;
    if (isMaxed) {
      value += `✅ **МАКСИМУМ**`;
    } else {
      value += `Следующий: ${nextMult} • Цена: **${nextCost}** 🪙`;
    }

    fields.push({ name: upgrade.name, value, inline: false });
  }

  const embed = new EmbedBuilder()
    .setTitle('⬆️ Апгрейды')
    .setDescription(`🪙 Ваши монеты: **${formatNumber(player.coins)}**`)
    .addFields(fields)
    .setColor(0x9B59B6)
    .setTimestamp();

  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`upgrade_luck:${ownerId}`)
      .setLabel(`🍀 Удача (Ур.${player.luck_level || 1})`)
      .setStyle(ButtonStyle.Success)
      .setDisabled((player.luck_level || 1) >= config.MAX_UPGRADE_LEVEL),
    new ButtonBuilder()
      .setCustomId(`upgrade_super_luck:${ownerId}`)
      .setLabel(`⭐ Супер-удача (Ур.${player.super_luck_level || 1})`)
      .setStyle(ButtonStyle.Success)
      .setDisabled((player.super_luck_level || 1) >= config.MAX_UPGRADE_LEVEL)
  );
  const row4 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`upgrade_sell_bonus:${ownerId}`)
      .setLabel(`💰 Продажа (Ур.${player.sell_bonus_level || 1})`)
      .setStyle(ButtonStyle.Success)
      .setDisabled((player.sell_bonus_level || 1) >= config.MAX_UPGRADE_LEVEL),
    new ButtonBuilder()
      .setCustomId(`back_menu:${ownerId}`)
      .setLabel('🔙 Меню')
      .setStyle(ButtonStyle.Secondary)
  );

  return { embed, row3, row4 };
}

/**
 * Build inventory embed
 */
function buildInventory(player, inventory, ownerId) {
  const rarityOrder = Object.keys(config.RARITIES);
  let totalValue = 0;
  let description = '';

  // Get sell multiplier
  const sellMult = config.UPGRADES.sell_bonus.multipliers[(player.sell_bonus_level || 1) - 1];

  // Group by rarity
  for (const rarityKey of rarityOrder) {
    const rarity = config.RARITIES[rarityKey];
    const berriesInRarity = inventory
      .filter(inv => {
        const berry = berries.find(b => b.id === inv.berry_id);
        return berry && berry.rarity === rarityKey && inv.quantity > 0;
      })
      .map(inv => {
        const berry = berries.find(b => b.id === inv.berry_id);
        const value = Math.floor(berry.price * inv.quantity * sellMult);
        totalValue += value;
        return `${rarity.emoji} ${berry.name} — **${formatNumber(inv.quantity)}** шт. (${formatNumber(value)} 🪙)`;
      });

    if (berriesInRarity.length > 0) {
      description += `\n**${rarity.emoji} ${rarity.name}**\n${berriesInRarity.join('\n')}\n`;
    }
  }

  if (!description) {
    description = '📦 Инвентарь пуст!\nКрутите рулетку чтобы собрать ягоды.';
  } else {
    description = `💰 Бонус продажи: **x${sellMult}**\n` + description;
    description += `\n━━━━━━━━━━━━━━━━━━━━\n💎 **Итого за всё: ${formatNumber(totalValue)} 🪙**`;
  }

  const embed = new EmbedBuilder()
    .setTitle('📦 Инвентарь')
    .setDescription(description)
    .setColor(0xF39C12)
    .setFooter({ text: `🪙 Монет: ${formatNumber(player.coins)}` })
    .setTimestamp();

  const hasItems = inventory.some(inv => inv.quantity > 0);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`sell_all:${ownerId}`)
      .setLabel(`💰 Продать ВСЁ (${formatNumber(totalValue)} 🪙)`)
      .setStyle(ButtonStyle.Danger)
      .setDisabled(!hasItems),
    new ButtonBuilder()
      .setCustomId(`back_menu:${ownerId}`)
      .setLabel('🔙 Меню')
      .setStyle(ButtonStyle.Secondary),
  );

  return { embed, row, totalValue };
}

/**
 * Build profile embed
 */
function buildProfile(player, inventory, uniqueCount, ownerId) {
  // Find rarest berry (highest chance value among rolled berries)
  let rarestBerry = null;
  let mostRolledBerry = null;
  let mostRolledCount = 0;

  for (const inv of inventory) {
    if (inv.times_rolled > 0) {
      const berry = berries.find(b => b.id === inv.berry_id);
      if (berry) {
        if (!rarestBerry || berry.chance > rarestBerry.chance) {
          rarestBerry = berry;
        }
        if (inv.times_rolled > mostRolledCount) {
          mostRolledCount = inv.times_rolled;
          mostRolledBerry = berry;
        }
      }
    }
  }

  const luckMult = config.UPGRADES.luck.multipliers[(player.luck_level || 1) - 1];
  const superLuckMult = config.UPGRADES.super_luck.multipliers[(player.super_luck_level || 1) - 1];
  const sellMult = config.UPGRADES.sell_bonus.multipliers[(player.sell_bonus_level || 1) - 1];

  const rarestRarity = rarestBerry ? getRarity(rarestBerry.rarity) : null;

  const embed = new EmbedBuilder()
    .setAuthor({ name: player.username, iconURL: player.avatar_url || undefined })
    .setTitle('👤 Профиль')
    .setThumbnail(player.avatar_url || null)
    .addFields(
      { name: '🆔 ID', value: `\`${player.user_id}\``, inline: true },
      { name: '🎰 Роллов', value: formatNumber(player.total_rolls), inline: true },
      { name: '🪙 Монет', value: formatNumber(player.coins), inline: true },
      { name: '🍀 Удача', value: `Ур.${player.luck_level || 1} (x${luckMult})`, inline: true },
      { name: '⭐ Супер-удача', value: `Ур.${player.super_luck_level || 1} (x${superLuckMult})`, inline: true },
      { name: '💰 Бонус продажи', value: `Ур.${player.sell_bonus_level || 1} (x${sellMult})`, inline: true },
      { name: '📖 Энциклопедия', value: `${uniqueCount}/42 видов`, inline: true },
      { name: '🏆 Больше всего', value: mostRolledBerry ? `${getRarity(mostRolledBerry.rarity).emoji} ${mostRolledBerry.name} (${formatNumber(mostRolledCount)}x)` : '—', inline: true },
      { name: '💎 Самая редкая', value: rarestBerry ? `${rarestRarity.emoji} ${rarestBerry.name} (1 in ${formatNumber(rarestBerry.chance)})` : '—', inline: true },
    )
    .setColor(rarestRarity ? rarestRarity.color : 0x95A5A6)
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`back_menu:${ownerId}`)
      .setLabel('🔙 Меню')
      .setStyle(ButtonStyle.Secondary),
  );

  return { embed, row };
}

/**
 * Build encyclopedia page embed
 */
function buildEncyclopediaPage(berry, inventory, page, totalPages, ownerId) {
  const rarity = getRarity(berry.rarity);
  const inv = inventory.find(i => i.berry_id === berry.id);
  const timesRolled = inv ? inv.times_rolled : 0;
  const quantity = inv ? inv.quantity : 0;

  const embed = new EmbedBuilder()
    .setTitle(`${rarity.emoji} ${berry.name}`)
    .setThumbnail(`attachment://${berry.file}`)
    .addFields(
      { name: '🏷️ Редкость', value: `${rarity.emoji} ${rarity.name}`, inline: true },
      { name: '🎲 Шанс', value: `1 in ${formatNumber(berry.chance)}`, inline: true },
      { name: '🪙 Цена', value: `${formatNumber(berry.price)}`, inline: true },
      { name: '📝 Описание', value: berry.description, inline: false },
      { name: '🌍 Место зарождения', value: berry.origin, inline: true },
      { name: '📅 Сезон', value: berry.season, inline: true },
      { name: '🍽️ Съедобность', value: berry.edible ? '✅ Съедобная' : '❌ Несъедобная', inline: true },
      { name: '📊 Выбито вами', value: `${formatNumber(timesRolled)} раз`, inline: true },
      { name: '📦 В инвентаре', value: `${formatNumber(quantity)} шт.`, inline: true },
    )
    .setColor(rarity.color)
    .setFooter({ text: `📖 Энциклопедия • Страница ${page + 1} из ${totalPages}` })
    .setTimestamp();

  const attachment = new AttachmentBuilder(path.join(ASSETS_PATH, berry.file));

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`enc_first:${ownerId}:${page}`)
      .setLabel('⏪')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === 0),
    new ButtonBuilder()
      .setCustomId(`enc_prev:${ownerId}:${page}`)
      .setLabel('◀️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === 0),
    new ButtonBuilder()
      .setCustomId(`enc_next:${ownerId}:${page}`)
      .setLabel('▶️')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(page >= totalPages - 1),
    new ButtonBuilder()
      .setCustomId(`enc_last:${ownerId}:${page}`)
      .setLabel('⏩')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= totalPages - 1),
    new ButtonBuilder()
      .setCustomId(`back_menu:${ownerId}`)
      .setLabel('🔙')
      .setStyle(ButtonStyle.Danger),
  );

  return { embed, row, attachment };
}

module.exports = {
  formatNumber,
  getRarity,
  buildMainMenu,
  buildSpinResult,
  buildUpgradeMenu,
  buildInventory,
  buildProfile,
  buildEncyclopediaPage,
  ASSETS_PATH,
};
