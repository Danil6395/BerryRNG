const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getPlayer, createPlayer, getInventory, sellBerriesByIds } = require('../database');
const berries = require('../berries');
const { RARITIES, UPGRADES } = require('../config');
const events = require('../events');

function formatNumber(n) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

const RARITY_ORDER = ['C', 'U', 'R', 'E', 'L', 'M', 'CS', 'S', 'AS'];
const SECRET_RARITIES = new Set(['S', 'AS']);

async function handleInventory(interaction) {
  const userId = interaction.user.id;
  const parts = interaction.customId.split(':');
  const ownerId = parts[1] || userId;

  let player = getPlayer(userId);
  if (!player) {
    createPlayer(userId, interaction.user.username, interaction.user.displayAvatarURL());
    player = getPlayer(userId);
  }

  const inventory = getInventory(userId);
  const sellLevel = player.sell_bonus_level || 1;
  const sellMult = UPGRADES.sell_bonus.multipliers[sellLevel - 1];
  const eventCoinMult = events.getEventCoinMultiplier();
  const totalMult = sellMult * eventCoinMult;

  const grouped = {};
  let totalValueNoSecrets = 0;
  let totalValueSecrets = 0;
  let hasNonSecrets = false;
  let hasSecrets = false;

  for (const item of inventory) {
    if (item.quantity <= 0) continue;

    const berry = berries.find(b => b.id === item.berry_id);
    if (!berry) continue;

    if (!grouped[berry.rarity]) grouped[berry.rarity] = [];

    const itemValue = Math.floor(berry.price * item.quantity * totalMult);

    if (SECRET_RARITIES.has(berry.rarity)) {
      totalValueSecrets += itemValue;
      hasSecrets = true;
    } else {
      totalValueNoSecrets += itemValue;
      hasNonSecrets = true;
    }

    grouped[berry.rarity].push({
      name: berry.name,
      quantity: item.quantity,
      value: itemValue,
    });
  }

  const embed = new EmbedBuilder()
    .setTitle('📦 Инвентарь')
    .setColor(0xF39C12)
    .setTimestamp();

  const hasItems = hasNonSecrets || hasSecrets;

  if (!hasItems) {
    embed.setDescription('📦 Инвентарь пуст!\nКрутите рулетку чтобы собрать ягоды.');
  } else {
    let desc = `💰 Бонус продажи: **x${sellMult}**`;
    if (eventCoinMult > 1) desc += ` • 🪙 Ивент: **x${eventCoinMult}**`;
    desc += `\n🪙 Монет: **${formatNumber(player.coins)}**\n`;

    for (const rarityKey of RARITY_ORDER) {
      if (!grouped[rarityKey] || grouped[rarityKey].length === 0) continue;
      const rarity = RARITIES[rarityKey];

      desc += `\n**${rarity.emoji} ${rarity.name}**\n`;
      for (const item of grouped[rarityKey]) {
        desc += `${rarity.emoji} ${item.name} — **${formatNumber(item.quantity)}** шт. (${formatNumber(item.value)} 🪙)\n`;
      }
    }

    const totalAll = totalValueNoSecrets + totalValueSecrets;
    desc += `\n━━━━━━━━━━━━━━━━━━━━\n💎 **Итого: ${formatNumber(totalAll)} 🪙**`;
    if (hasSecrets) {
      desc += `\n⚫ Секретки: **${formatNumber(totalValueSecrets)} 🪙** • Остальное: **${formatNumber(totalValueNoSecrets)} 🪙**`;
    }
    embed.setDescription(desc);
  }

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`sell_no_secrets:${ownerId}`)
      .setLabel(`💰 Продать ALL (${formatNumber(totalValueNoSecrets)})`)
      .setStyle(ButtonStyle.Danger)
      .setDisabled(!hasNonSecrets),
    new ButtonBuilder()
      .setCustomId(`sell_secrets:${ownerId}`)
      .setLabel(`⚫ Продать S/AS (${formatNumber(totalValueSecrets)})`)
      .setStyle(ButtonStyle.Danger)
      .setDisabled(!hasSecrets)
  );
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`back_menu:${ownerId}`)
      .setLabel('🔙 Меню')
      .setStyle(ButtonStyle.Secondary)
  );

  await interaction.update({ embeds: [embed], components: [row1,row2], files: [] });
}

async function handleSellNoSecrets(interaction) {
  const userId = interaction.user.id;
  const parts = interaction.customId.split(':');
  const ownerId = parts[1] || userId;

  let player = getPlayer(userId);
  if (!player) {
    createPlayer(userId, interaction.user.username, interaction.user.displayAvatarURL());
    player = getPlayer(userId);
  }

  const inventory = getInventory(userId);
  const sellLevel = player.sell_bonus_level || 1;
  const sellMult = UPGRADES.sell_bonus.multipliers[sellLevel - 1];
  const eventCoinMult = events.getEventCoinMultiplier();
  const totalMult = sellMult * eventCoinMult;

  let totalEarned = 0;
  let totalItems = 0;
  const berryIdsToSell = [];

  for (const item of inventory) {
    if (item.quantity <= 0) continue;
    const berry = berries.find(b => b.id === item.berry_id);
    if (!berry) continue;
    if (SECRET_RARITIES.has(berry.rarity)) continue; // skip secrets

    totalEarned += Math.floor(berry.price * item.quantity * totalMult);
    totalItems += item.quantity;
    berryIdsToSell.push(item.berry_id);
  }

  if (totalItems === 0) {
    return interaction.reply({ content: '❌ Нечего продавать (кроме секреток ничего нет).', ephemeral: true });
  }

  sellBerriesByIds(userId, berryIdsToSell, totalEarned);
  player = getPlayer(userId);

  const embed = new EmbedBuilder()
    .setTitle('💰 Продано (кроме секреток)!')
    .setDescription(
      `Продано **${formatNumber(totalItems)}** ягод.\n\n` +
      `💵 Заработано: **${formatNumber(totalEarned)}** 🪙\n` +
      `📈 Бонус: **x${totalMult}**\n` +
      `Секретные ягоды сохранены.`
    )
    .setColor(0x2ECC71)
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`spin:${ownerId}`)
      .setLabel('🎰 Крутить')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`back_menu:${ownerId}`)
      .setLabel('🔙 Меню')
      .setStyle(ButtonStyle.Secondary),
  );

  await interaction.update({ embeds: [embed], components: [row], files: [] });
}

async function handleSellSecrets(interaction) {
  const userId = interaction.user.id;
  const parts = interaction.customId.split(':');
  const ownerId = parts[1] || userId;

  let player = getPlayer(userId);
  if (!player) {
    createPlayer(userId, interaction.user.username, interaction.user.displayAvatarURL());
    player = getPlayer(userId);
  }

  const inventory = getInventory(userId);
  const sellLevel = player.sell_bonus_level || 1;
  const sellMult = UPGRADES.sell_bonus.multipliers[sellLevel - 1];
  const eventCoinMult = events.getEventCoinMultiplier();
  const totalMult = sellMult * eventCoinMult;

  let totalEarned = 0;
  let totalItems = 0;
  const berryIdsToSell = [];

  for (const item of inventory) {
    if (item.quantity <= 0) continue;
    const berry = berries.find(b => b.id === item.berry_id);
    if (!berry) continue;
    if (!SECRET_RARITIES.has(berry.rarity)) continue; // only secrets

    totalEarned += Math.floor(berry.price * item.quantity * totalMult);
    totalItems += item.quantity;
    berryIdsToSell.push(item.berry_id);
  }

  if (totalItems === 0) {
    return interaction.reply({ content: '❌ У вас нет секретных ягод.', ephemeral: true });
  }

  sellBerriesByIds(userId, berryIdsToSell, totalEarned);
  player = getPlayer(userId);

  const embed = new EmbedBuilder()
    .setTitle('⚫ Секретки проданы!')
    .setDescription(
      `Продано **${formatNumber(totalItems)}** секретных ягод.\n\n` +
      `💵 Заработано: **${formatNumber(totalEarned)}** 🪙\n` +
      `📈 Бонус: **x${totalMult}**`
    )
    .setColor(0x000000)
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`spin:${ownerId}`)
      .setLabel('🎰 Крутить')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`back_menu:${ownerId}`)
      .setLabel('🔙 Меню')
      .setStyle(ButtonStyle.Secondary),
  );

  await interaction.update({ embeds: [embed], components: [row], files: [] });
}

module.exports = { handleInventory, handleSellNoSecrets, handleSellSecrets };
