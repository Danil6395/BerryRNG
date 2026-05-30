const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getPlayer, createPlayer, getInventory, getUniqueBerriesCount } = require('../database');
const berries = require('../berries');
const { RARITIES, UPGRADES } = require('../config');

function formatNumber(n) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('👤 Посмотреть профиль')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('Чей профиль посмотреть')
        .setRequired(false)
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const userId = targetUser.id;
    const avatarURL = targetUser.displayAvatarURL({ dynamic: true, size: 256 });

    let player = getPlayer(userId);
    if (!player) {
      if (targetUser.id === interaction.user.id) {
        createPlayer(userId, targetUser.username, avatarURL);
        player = getPlayer(userId);
      } else {
        return interaction.reply({
          content: '❌ Этот игрок ещё не начал играть.',
          ephemeral: true,
        });
      }
    }

    const inventory = getInventory(userId);
    const uniqueCount = getUniqueBerriesCount(userId);

    // Find rarest and most rolled
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

    // Get multipliers from config arrays (levels default to 1 in DB)
    const luckLevel = player.luck_level || 1;
    const superLuckLevel = player.super_luck_level || 1;
    const sellLevel = player.sell_bonus_level || 1;

    const luckMult = UPGRADES.luck.multipliers[luckLevel - 1];
    const superLuckMult = UPGRADES.super_luck.multipliers[superLuckLevel - 1];
    const sellMult = UPGRADES.sell_bonus.multipliers[sellLevel - 1];

    const rarestRarity = rarestBerry ? RARITIES[rarestBerry.rarity] : null;
    const embedColor = rarestRarity ? rarestRarity.color : 0x95A5A6;

    const embed = new EmbedBuilder()
      .setAuthor({ name: player.username, iconURL: avatarURL })
      .setThumbnail(avatarURL)
      .setColor(embedColor)
      .addFields(
        { name: '🆔 ID', value: `\`${userId}\``, inline: true },
        { name: '🎰 Всего роллов', value: formatNumber(player.total_rolls), inline: true },
        { name: '🪙 Монеты', value: formatNumber(player.coins), inline: true },
        { name: '🍀 Удача', value: `Ур.${luckLevel} (x${luckMult})`, inline: true },
        { name: '⭐ Супер-удача', value: `Ур.${superLuckLevel} (x${superLuckMult})`, inline: true },
        { name: '💰 Бонус продажи', value: `Ур.${sellLevel} (x${sellMult})`, inline: true },
        { name: '📖 Энциклопедия', value: `${uniqueCount}/${berries.length}`, inline: true },
        {
          name: '🏆 Самая редкая',
          value: rarestBerry
            ? `${rarestRarity.emoji} ${rarestBerry.name} (1 in ${formatNumber(rarestBerry.chance)})`
            : 'Нет',
          inline: true,
        },
        {
          name: '🔄 Чаще всего',
          value: mostRolledBerry
            ? `${RARITIES[mostRolledBerry.berry.rarity]?.emoji || ''} ${mostRolledBerry.berry.name} (${formatNumber(mostRolledBerry.times)}x)`
            : 'Нет',
          inline: true,
        },
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
