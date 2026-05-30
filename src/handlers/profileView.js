const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getPlayer, createPlayer, getInventory, getUniqueBerriesCount } = require('../database');
const berries = require('../berries');
const { RARITIES, UPGRADES } = require('../config');

function formatNumber(n) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

async function handleProfileView(interaction) {
  const userId = interaction.user.id;
  const parts = interaction.customId.split(':');
  const ownerId = parts[1] || userId;
  const username = interaction.user.username;
  const avatarURL = interaction.user.displayAvatarURL({ dynamic: true, size: 256 });

  let player = getPlayer(userId);
  if (!player) {
    createPlayer(userId, username, avatarURL);
    player = getPlayer(userId);
  }

  // Update avatar in case it changed
  const inventory = getInventory(userId);
  const uniqueCount = getUniqueBerriesCount(userId);

  // Find rarest berry and most rolled
  let rarestBerry = null;
  let mostRolledBerry = null;
  let maxTimesRolled = 0;

  for (const item of inventory) {
    if (item.times_rolled <= 0) continue;
    const berry = berries.find(b => b.id === item.berry_id);
    if (!berry) continue;

    if (!rarestBerry || berry.chance > rarestBerry.chance) {
      rarestBerry = berry;
    }
    if (item.times_rolled > maxTimesRolled) {
      maxTimesRolled = item.times_rolled;
      mostRolledBerry = { berry, times: item.times_rolled };
    }
  }

  // Get multipliers from config arrays
  const luckLevel = player.luck_level || 1;
  const superLuckLevel = player.super_luck_level || 1;
  const sellLevel = player.sell_bonus_level || 1;

  const luckMult = UPGRADES.luck.multipliers[luckLevel - 1];
  const superLuckMult = UPGRADES.super_luck.multipliers[superLuckLevel - 1];
  const sellMult = UPGRADES.sell_bonus.multipliers[sellLevel - 1];

  // Color based on rarest berry
  const rarestRarity = rarestBerry ? RARITIES[rarestBerry.rarity] : null;
  const embedColor = rarestRarity ? rarestRarity.color : 0x95A5A6;

  const embed = new EmbedBuilder()
    .setAuthor({ name: player.username, iconURL: avatarURL })
    .setTitle('👤 Профиль')
    .setThumbnail(avatarURL)
    .addFields(
      { name: '🆔 ID', value: `\`${player.user_id}\``, inline: true },
      { name: '🎰 Роллов', value: formatNumber(player.total_rolls), inline: true },
      { name: '🪙 Монет', value: formatNumber(player.coins), inline: true },
      { name: '🍀 Удача', value: `Ур.${luckLevel} (x${luckMult})`, inline: true },
      { name: '⭐ Супер-удача', value: `Ур.${superLuckLevel} (x${superLuckMult})`, inline: true },
      { name: '💰 Бонус продажи', value: `Ур.${sellLevel} (x${sellMult})`, inline: true },
      { name: '📖 Энциклопедия', value: `${uniqueCount}/${berries.length} видов`, inline: true },
      {
        name: '🏆 Больше всего',
        value: mostRolledBerry
          ? `${RARITIES[mostRolledBerry.berry.rarity]?.emoji || ''} ${mostRolledBerry.berry.name} (${formatNumber(mostRolledBerry.times)}x)`
          : '—',
        inline: true,
      },
      {
        name: '💎 Самая редкая',
        value: rarestBerry
          ? `${rarestRarity.emoji} ${rarestBerry.name} (1 in ${formatNumber(rarestBerry.chance)})`
          : '—',
        inline: true,
      },
    )
    .setColor(embedColor)
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`back_menu:${ownerId}`)
      .setLabel('🔙 Меню')
      .setStyle(ButtonStyle.Secondary),
  );

  await interaction.update({ embeds: [embed], components: [row], files: [] });
}

module.exports = { handleProfileView };
