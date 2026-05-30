require('dotenv').config();
const { Client, GatewayIntentBits, Collection, Events, PermissionFlagsBits, ChannelType, MessageFlags } = require('discord.js');
const path = require('path');
const fs = require('fs');

// Initialize database
require('./database');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ],
});

// Load commands
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if (command.data && command.data.name) {
    client.commands.set(command.data.name, command);
    console.log(`✅ Команда загружена: /${command.data.name}`);
  }
}

// Load handlers
const { handleSpin } = require('./handlers/spin');
const { handleUpgradeMenu, handleUpgradeBuy } = require('./handlers/upgrade');
const { handleInventory, handleSellAll } = require('./handlers/inventory');
const { handleProfileView } = require('./handlers/profileView');
const { handleEncyclopedia } = require('./handlers/encyclopedia');

const db = require('./database');
const { buildMainMenu } = require('./utils/embeds');

// Handle slash commands and interactions
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    // Handle autocomplete
    if (interaction.isAutocomplete()) {
      const command = client.commands.get(interaction.commandName);
      if (command && command.autocomplete) {
        await command.autocomplete(interaction);
      }
      return;
    }

    // Handle slash commands
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      await command.execute(interaction);
      return;
    }

    // Handle button interactions
    if (interaction.isButton()) {
      const customId = interaction.customId;
      const parts = customId.split(':');
      const action = parts[0];
      const ownerId = parts[1];

      // 1. Button Ownership Check
      if (ownerId && interaction.user.id !== ownerId) {
        return interaction.reply({
          content: '❌ Это не ваша игра! Используйте `/start-berry`, чтобы открыть своё меню.',
          ephemeral: true,
        });
      }

      // Ensure player exists
      let player = db.getPlayer(interaction.user.id);
      if (!player) {
        db.createPlayer(
          interaction.user.id,
          interaction.user.username,
          interaction.user.displayAvatarURL({ dynamic: true, size: 256 })
        );
        player = db.getPlayer(interaction.user.id);
      }

      // Route to handler
      if (action === 'spin') {
        await handleSpin(interaction);
      } else if (action === 'upgrade_menu') {
        await handleUpgradeMenu(interaction);
      } else if (action === 'upgrade_luck') {
        await handleUpgradeBuy(interaction, 'luck');
      } else if (action === 'upgrade_super_luck') {
        await handleUpgradeBuy(interaction, 'super_luck');
      } else if (action === 'upgrade_sell_bonus') {
        await handleUpgradeBuy(interaction, 'sell_bonus');
      } else if (action === 'inventory') {
        await handleInventory(interaction);
      } else if (action === 'sell_all') {
        await handleSellAll(interaction);
      } else if (action === 'profile_view') {
        await handleProfileView(interaction);
      } else if (action === 'encyclopedia') {
        await handleEncyclopedia(interaction, 0);
      } else if (action.startsWith('enc_')) {
        // Parse encyclopedia navigation: enc_next:ownerId:page
        const currentPage = parseInt(parts[2]) || 0;

        // Get total pages for this player
        const discoveredIds = db.getPlayerBerryIds(interaction.user.id);
        const totalPages = discoveredIds.length;

        let newPage = currentPage;
        if (action === 'enc_next') {
          newPage = Math.min(currentPage + 1, totalPages - 1);
        } else if (action === 'enc_prev') {
          newPage = Math.max(currentPage - 1, 0);
        } else if (action === 'enc_first') {
          newPage = 0;
        } else if (action === 'enc_last') {
          newPage = totalPages - 1;
        }

        await handleEncyclopedia(interaction, newPage);
      } else if (action === 'leaderboard_prev' || action === 'leaderboard_next') {
        const command = client.commands.get('leaderboard');
        if (command && command.handleButton) {
          const type = parts[2];
          const currentPage = parseInt(parts[3]) || 0;
          await command.handleButton(interaction, action, type, currentPage);
        }
      } else if (action === 'local_play') {
        // 2. Play Locally (Thread creation)
        if (interaction.channel.isThread()) {
          return interaction.reply({ content: '❌ Вы уже находитесь внутри ветки!', flags: [MessageFlags.Ephemeral] });
        }

        if (interaction.channel.type === ChannelType.DM) {
          return interaction.reply({ content: '❌ Вы уже играете в личных сообщениях!', flags: [MessageFlags.Ephemeral] });
        }

        try {
          const thread = await interaction.message.startThread({
            name: `🍓 рулетка-${interaction.user.username}`,
            autoArchiveDuration: 60,
          });

          try {
            await thread.members.add(interaction.user.id);
          } catch (err) {
            console.error('Не удалось добавить игрока в ветку:', err);
          }

          const { embed, rows } = buildMainMenu(player, interaction.user.id);
          await thread.send({ embeds: [embed], components: rows });

          await interaction.update({
            content: `✅ Игра перенесена в отдельную ветку для пользователя **${interaction.user.username}**!`,
            embeds: [],      // Очищаем старые эмбеды, если нужно (если нужно оставить старый — просто удали эту строку)
            components: [],  // ПУСТОЙ МАССИВ убирает все кнопки под сообщением
          });

          await interaction.followUp({
            content: `🍓 Локальная ветка создана! Перейдите сюда для приватной игры: <#${thread.id}>`,
            flags: [MessageFlags.Ephemeral], // Современный аналог ephemeral: true без варнингов
          });

        } catch (error) {
          console.error('Ошибка создания локальной ветки:', error);
          
          const errorOptions = {
            content: '❌ Не удалось создать локальную ветку. Убедитесь, что у бота есть права на создание веток в этом канале.',
            flags: [MessageFlags.Ephemeral],
          };

          if (interaction.replied || interaction.deferred) {
            await interaction.followUp(errorOptions);
          } else {
            await interaction.reply(errorOptions);
          }
        }
      } else if (action === 'back_menu') {
        // Refresh player data
        player = db.getPlayer(interaction.user.id);
        const { embed, rows } = buildMainMenu(player, ownerId || interaction.user.id);
        await interaction.update({ embeds: [embed], components: rows, files: [] });
      }
    }
  } catch (error) {
    console.error('❌ Ошибка обработки взаимодействия:', error);
    
    const errorMsg = { content: '❌ Произошла ошибка! Попробуйте снова.', ephemeral: true };
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorMsg);
      } else {
        await interaction.reply(errorMsg);
      }
    } catch (e) {
      console.error('❌ Не удалось отправить ошибку:', e);
    }
  }
});

client.once(Events.ClientReady, (c) => {
  console.log(`\n🍓 ================================`);
  console.log(`🍓  BerryRNG бот запущен!`);
  console.log(`🍓  Залогинен как: ${c.user.tag}`);
  console.log(`🍓  Серверов: ${c.guilds.cache.size}`);
  console.log(`🍓  Команд: ${client.commands.size}`);
  console.log(`🍓 ================================\n`);
});

// Login
client.login(process.env.DISCORD_TOKEN);
