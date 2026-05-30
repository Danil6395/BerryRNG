const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getPlayer, createPlayer, updatePlayer } = require('../database');
const { UPGRADES, MAX_UPGRADE_LEVEL } = require('../config');

function formatNumber(n) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

async function handleUpgradeMenu(interaction) {
  const userId = interaction.user.id;
  const parts = interaction.customId.split(':');
  const ownerId = parts[1] || userId;

  let player = getPlayer(userId);
  if (!player) {
    createPlayer(userId, interaction.user.username, interaction.user.displayAvatarURL());
    player = getPlayer(userId);
  }

  const fields = [];

  const upgradeEntries = [
    { key: 'luck', levelKey: 'luck_level' },
    { key: 'super_luck', levelKey: 'super_luck_level' },
    { key: 'sell_bonus', levelKey: 'sell_bonus_level' },
  ];

  for (const entry of upgradeEntries) {
    const upgrade = UPGRADES[entry.key];
    const currentLevel = player[entry.levelKey] || 1;
    const currentMult = upgrade.multipliers[currentLevel - 1];
    const isMaxed = currentLevel >= MAX_UPGRADE_LEVEL;
    const nextCost = isMaxed ? '—' : formatNumber(upgrade.costs[currentLevel]);
    const nextMult = isMaxed ? '—' : `x${upgrade.multipliers[currentLevel]}`;

    let value = `${upgrade.description}\n`;
    value += `📈 Множитель: **x${currentMult}**\n`;
    if (isMaxed) {
      value += `✅ **МАКСИМУМ**`;
    } else {
      value += `Следующий: ${nextMult} • Цена: **${nextCost}** 🪙`;
    }

    fields.push({
      name: `${upgrade.name} — Ур. ${currentLevel}/${MAX_UPGRADE_LEVEL}`,
      value,
      inline: false,
    });
  }

  const embed = new EmbedBuilder()
    .setTitle('⬆️ Апгрейды')
    .setDescription(`🪙 Ваши монеты: **${formatNumber(player.coins)}**`)
    .addFields(fields)
    .setColor(0x9B59B6)
    .setTimestamp();

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`upgrade_luck:${ownerId}`)
      .setLabel(`🍀 Удача (Ур.${player.luck_level || 1})`)
      .setStyle(ButtonStyle.Success)
      .setDisabled((player.luck_level || 1) >= MAX_UPGRADE_LEVEL),
    new ButtonBuilder()
      .setCustomId(`upgrade_super_luck:${ownerId}`)
      .setLabel(`⭐ Супер-удача (Ур.${player.super_luck_level || 1})`)
      .setStyle(ButtonStyle.Success)
      .setDisabled((player.super_luck_level || 1) >= MAX_UPGRADE_LEVEL)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`upgrade_sell_bonus:${ownerId}`)
      .setLabel(`💰 Продажа (Ур.${player.sell_bonus_level || 1})`)
      .setStyle(ButtonStyle.Success)
      .setDisabled((player.sell_bonus_level || 1) >= MAX_UPGRADE_LEVEL),
    new ButtonBuilder()
      .setCustomId(`back_menu:${ownerId}`)
      .setLabel('🔙 Меню')
      .setStyle(ButtonStyle.Secondary),
  );

  await interaction.update({ embeds: [embed], components: [row1, row2], files: [] });
}

async function handleUpgradeBuy(interaction, upgradeType) {
  const userId = interaction.user.id;
  const parts = interaction.customId.split(':');
  const ownerId = parts[1] || userId;

  let player = getPlayer(userId);
  if (!player) {
    createPlayer(userId, interaction.user.username, interaction.user.displayAvatarURL());
    player = getPlayer(userId);
  }

  const upgradeMap = {
    luck: 'luck_level',
    super_luck: 'super_luck_level',
    sell_bonus: 'sell_bonus_level',
  };

  const levelKey = upgradeMap[upgradeType];
  if (!levelKey) return;

  const upgrade = UPGRADES[upgradeType];
  const currentLevel = player[levelKey] || 1;

  if (currentLevel >= MAX_UPGRADE_LEVEL) {
    const embed = new EmbedBuilder()
      .setTitle('⬆️ Максимальный уровень')
      .setDescription(`${upgrade.name} уже на максимальном уровне!`)
      .setColor(0xE74C3C)
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`upgrade_menu:${ownerId}`)
        .setLabel('🔙 Назад')
        .setStyle(ButtonStyle.Secondary),
    );

    return interaction.update({ embeds: [embed], components: [row], files: [] });
  }

  // Cost is at index currentLevel (costs[0] is for level 1, costs[1] is 1→2, etc.)
  const cost = upgrade.costs[currentLevel];

  if (player.coins < cost) {
    const embed = new EmbedBuilder()
      .setTitle('❌ Недостаточно монет')
      .setDescription(
        `Для улучшения ${upgrade.name} нужно **${formatNumber(cost)}** 🪙\n` +
        `У вас: **${formatNumber(player.coins)}** 🪙`
      )
      .setColor(0xE74C3C)
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`upgrade_menu:${ownerId}`)
        .setLabel('🔙 Назад')
        .setStyle(ButtonStyle.Secondary),
    );

    return interaction.update({ embeds: [embed], components: [row], files: [] });
  }

  // Buy upgrade
  const newLevel = currentLevel + 1;
  const newMult = upgrade.multipliers[newLevel - 1];

  updatePlayer(userId, {
    [levelKey]: newLevel,
    coins: player.coins - cost,
  });

  // Re-fetch player to get updated coins balance
  player = getPlayer(userId);

  const embed = new EmbedBuilder()
    .setTitle('✅ Апгрейд куплен!')
    .setDescription(
      `${upgrade.name} улучшена до **Ур. ${newLevel}**!\n\n` +
      `📈 Новый множитель: **x${newMult}**\n` +
      `💰 Потрачено: **${formatNumber(cost)}** 🪙\n` +
      `💰 Остаток: **${formatNumber(player.coins)}** 🪙`
    )
    .setColor(0x2ECC71)
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`upgrade_menu:${ownerId}`)
      .setLabel('🔙 К апгрейдам')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`back_menu:${ownerId}`)
      .setLabel('🏠 Меню')
      .setStyle(ButtonStyle.Secondary),
  );

  await interaction.update({ embeds: [embed], components: [row], files: [] });
}

module.exports = { handleUpgradeMenu, handleUpgradeBuy };
