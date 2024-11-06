    // Importation des modules nécessaires
    const { Client, GatewayIntentBits } = require('discord.js');
    const OpenAI = require('openai'); // Importation de la bibliothèque OpenAI

    // Clés API
    const discordToken = 'MTMwMTE5MjgwNDkyNzgwMzQ0Mg.GHjuaj.LdTNnQFwKeyYX985fhvwajLWGwqxjrQKAb-9HY'; // Remplacez par votre token Discord
    const openaiApiKey = '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'; // Remplacez par votre clé API OpenAI

    // Vérification de la clé API OpenAI
    if (!openaiApiKey) {
        console.error("La clé API OpenAI n'est pas définie.");
        process.exit(1); // Quittez le processus si la clé API est manquante
    }

    // Initialisation d'OpenAI
    const openai = new OpenAI({
        apiKey: openaiApiKey, // Ajoutez votre clé API OpenAI ici
    });

    // Message d'introduction de l'assistant
    const msgSystem = "Je suis PPV.assistant et je suis là pour vous guider à la compréhension de la prime de partage de la valeur et vous aider à faire des simulations !";

    // Fonction pour appeler l'assistant personnalisé
    async function assistantReply(conv) {
        try {
            const response = await openai.chat.completions.create({
                model: 'gpt-4o-mini', // ID de votre assistant personnalisé
                messages: conv,
                max_tokens: 300,
            });
            return response.choices[0].message.content;
        } catch (error) {
            console.error(`Erreur lors de l'appel à OpenAI : ${error.message}`);
            throw error; // Relancer l'erreur pour la gérer au niveau de l'événement de message
        }
    }

    // Création d'un nouveau client Discord avec les intents nécessaires
    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent,
        ],
    });

    // Événement de connexion
    client.once('ready', () => {
        console.log(`Connecté en tant que ${client.user.tag}`);
    });

    // Événement de message
    client.on('messageCreate', async (message) => {
        console.log(`Message reçu : ${message.content}`);

        // Éviter les réponses aux messages du bot lui-même
        if (message.author.bot) return;

        // Vérification si le bot est mentionné dans le message
        if (message.mentions.has(client.user)) {
            console.log("Déclencheur détecté via mention directe !");
            const userMessage = message.content;

            // Conversation de base pour l'assistant
            let currentConv = [{ role: 'system', content: msgSystem }];
            currentConv.push({ role: 'user', content: userMessage });

            // Récupération de la réponse de l'assistant
            try {
                const reply = await assistantReply(currentConv);
                await message.channel.send(reply);

                // Mise à jour de la conversation avec la réponse du bot
                currentConv.push({ role: 'assistant', content: reply });

                // Optionnel : Nettoyage de la conversation si elle devient trop longue
                if (currentConv.length > 20) {
                    currentConv = currentConv.slice(-20); // Gardez les 20 derniers messages
                }

            } catch (error) {
                console.error(`Erreur lors de la récupération de la réponse : ${error.message}`);
                await message.channel.send("Désolé, je rencontre un problème technique.");
            }
        }
    });

    // Lancement du bot Discord
    client.login(discordToken);
