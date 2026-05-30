const { SlashCommandBuilder } = require('discord.js');
const { getPlayer, createPlayer } = require('../database');
const { buildMainMenu } = require('../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('start-berry')
        .setDescription('🍓 Открыть меню BerryRNG'),

    async execute(interaction) {
        const userId = interaction.user.id;
        const username = interaction.user.username;
        const avatarURL = interaction.user.displayAvatarURL({ dynamic: true, size: 256 });

        let player = getPlayer(userId);
        if (!player) {
            createPlayer(userId, username, avatarURL);
            player = getPlayer(userId);
        }

        const { embed, rows } = buildMainMenu(player, userId);

        await interaction.reply({ embeds: [embed], components: rows, ephemeral: false });
    },
};
