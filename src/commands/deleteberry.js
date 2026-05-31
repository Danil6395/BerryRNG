const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { deletePlayerData, deleteAllData } = require('../database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('deleteberry')
        .setDescription('🗑️ Удалить данные игрока (Админ)')
        .addStringOption(option =>
            option
                .setName('target')
                .setDescription('Упоминание пользователя или "all" для удаления всех')
                .setRequired(true)
        ),

    async execute(interaction) {
        if (interaction.user.id !== process.env.OWNER_ID) {
            return interaction.reply({
                content: '❌ Только владелец бота может использовать эту команду.',
                ephemeral: true,
            });
        }

        const target = interaction.options.getString('target').trim();

        if (target.toLowerCase() === 'all') {
            deleteAllData();

            const embed = new EmbedBuilder()
                .setTitle('🗑️ Данные удалены')
                .setDescription('Все данные игроков были удалены.')
                .setColor(0xE74C3C)
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        }

        // Parse user ID from mention or raw ID
        const idMatch = target.match(/^<@!?(\d+)>$/) || target.match(/^(\d+)$/);
        if (!idMatch) {
            return interaction.reply({
                content: '❌ Неверный формат. Укажите упоминание пользователя или его ID.',
                ephemeral: true,
            });
        }

        const userId = idMatch[1];
        deletePlayerData(userId);

        const embed = new EmbedBuilder()
            .setTitle('🗑️ Данные удалены')
            .setDescription(`Данные игрока <@${userId}> были удалены.`)
            .setColor(0xE74C3C)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
