const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getGlobalStats } = require('../database');
const berries = require('../berries');

function formatNumber(n) {
  return n.toLocaleString();
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('statsberry')
    .setDescription('📊 Глобальная статистика BerryRNG бота'),

  async execute(interaction) {
    const { rolls, coins, players, berryStats } = getGlobalStats();

    let legendaryCount = 0;
    let mythicCount = 0;
    let secretCount = 0;
    let cosmicCount = 0;
    let abuseSecretCount = 0;

    for (const stat of berryStats) {
      const berry = berries.find(b => b.id === stat.berry_id);
      if (berry) {
        if (berry.rarity === 'L') legendaryCount += stat.rolled;
        if (berry.rarity === 'M') mythicCount += stat.rolled;
        if (berry.rarity === 'CS') cosmicCount += stat.rolled;
        if (berry.rarity === 'S') secretCount += stat.rolled;
        if (berry.rarity === 'AS') abuseSecretCount += stat.rolled;
      }
    }

    const embed = new EmbedBuilder()
      .setTitle('📊 Глобальная статистика BerryRNG')
      .setColor(0x3498DB)
      .addFields(
        { name: '👥 Всего игроков', value: formatNumber(players), inline: true },
        { name: '🎰 Прокруток сделано', value: formatNumber(rolls), inline: true },
        { name: '🪙 Монет на руках', value: formatNumber(coins), inline: true },
        { name: '🟡 Легендарных (L)', value: formatNumber(legendaryCount), inline: true },
        { name: '🔴 Мифических (M)', value: formatNumber(mythicCount), inline: true },
        { name: '🌌 Космических (CS)', value: formatNumber(cosmicCount), inline: true },
        { name: '⚫ Секретных (S)', value: formatNumber(secretCount), inline: true },
        { name: '💀 ABUSE (AS)', value: formatNumber(abuseSecretCount), inline: true },
      )
      .setFooter({ text: 'Статистика обновляется в реальном времени!' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
