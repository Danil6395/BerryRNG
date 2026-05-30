const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getLeaderboardByRolls, getLeaderboardByCoins, getPlayersInventoryForLeaderboard } = require('../database');
const berries = require('../berries');
const { RARITIES } = require('../config');

function formatNumber(n) {
  return n.toLocaleString();
}

async function renderLeaderboard(interaction, type, page, ownerId, isUpdate = false) {
  let list = [];
  let title = '';

  if (type === 'rolls') {
    list = getLeaderboardByRolls().map(p => ({
      username: p.username,
      value: p.total_rolls,
      formatted: `${formatNumber(p.total_rolls)} роллов`
    }));
    title = '🏆 Топ игроков по Прокруткам';
  } else if (type === 'coins') {
    list = getLeaderboardByCoins().map(p => ({
      username: p.username,
      value: p.coins,
      formatted: `${formatNumber(p.coins)} 🪙`
    }));
    title = '🏆 Топ игроков по Монетам';
  } else if (type === 'rarity') {
    const players = getLeaderboardByRolls(); // get all players to ensure consistency
    const inventory = getPlayersInventoryForLeaderboard();
    
    const userBestBerry = new Map();
    for (const inv of inventory) {
      const berry = berries.find(b => b.id === inv.berry_id);
      if (berry) {
        const existing = userBestBerry.get(inv.user_id);
        if (!existing || berry.chance > existing.chance) {
          userBestBerry.set(inv.user_id, berry);
        }
      }
    }
    
    list = players.map(p => {
      const best = userBestBerry.get(p.user_id);
      return {
        username: p.username,
        value: best ? best.chance : -1,
        formatted: best 
          ? `${RARITIES[best.rarity]?.emoji || ''} ${best.name} (1 in ${formatNumber(best.chance)})`
          : '—'
      };
    });
    
    list.sort((a, b) => b.value - a.value);
    title = '🏆 Топ игроков по Редкости ягод';
  }

  const itemsPerPage = 10;
  const totalPages = Math.max(Math.ceil(list.length / itemsPerPage), 1);
  if (page < 0) page = 0;
  if (page >= totalPages) page = totalPages - 1;

  const start = page * itemsPerPage;
  const pageItems = list.slice(start, start + itemsPerPage);

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setColor(0xF1C40F)
    .setTimestamp()
    .setFooter({ text: `Страница ${page + 1} из ${totalPages} • Всего игроков: ${list.length}` });

  let description = '';
  if (pageItems.length === 0) {
    description = 'Топ пуст.';
  } else {
    pageItems.forEach((item, index) => {
      const rank = start + index + 1;
      let medal = `${rank}.`;
      if (rank === 1) medal = '🥇';
      if (rank === 2) medal = '🥈';
      if (rank === 3) medal = '🥉';
      description += `${medal} **${item.username}** — ${item.formatted}\n`;
    });
  }
  embed.setDescription(description);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`leaderboard_prev:${ownerId}:${type}:${page}`)
      .setLabel('◀️ Назад')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(page === 0),
    new ButtonBuilder()
      .setCustomId(`leaderboard_next:${ownerId}:${type}:${page}`)
      .setLabel('▶️ Вперед')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(page >= totalPages - 1)
  );

  const responseObj = {
    embeds: [embed],
    components: list.length > itemsPerPage ? [row] : []
  };

  if (isUpdate) {
    await interaction.update(responseObj);
  } else {
    await interaction.reply(responseObj);
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('🏆 Посмотреть топ игроков')
    .addStringOption(option =>
      option
        .setName('type')
        .setDescription('По какому критерию сортировать')
        .setRequired(true)
        .addChoices(
          { name: '🎰 Роллы', value: 'rolls' },
          { name: '🪙 Монеты', value: 'coins' },
          { name: '💎 Лучшая редкость', value: 'rarity' }
        )
    ),

  async execute(interaction) {
    const type = interaction.options.getString('type');
    await renderLeaderboard(interaction, type, 0, interaction.user.id, false);
  },

  async handleButton(interaction, action, type, currentPage) {
    const newPage = action === 'leaderboard_next' ? currentPage + 1 : currentPage - 1;
    const parts = interaction.customId.split(':');
    const ownerId = parts[1];
    await renderLeaderboard(interaction, type, newPage, ownerId, true);
  }
};
