// Importation des modules nécessaires
import fs from 'fs';
import path from 'path';
import slugify from 'slugify';
import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';
import OpenAI from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';

// Chemins et variables d'environnement
const discordToken = process.env.DISCORD_TOKEN;
const openaiApiKey = process.env.OPENAI_API_KEY;
const pineconeApiKey = process.env.PINECONE_API_KEY;
const pineconeIndexName = process.env.PINECONE_INDEX_NAME;
const textDocumentsPath = path.join('C:', 'Repos', 'ppv-project', 'text_documents');

// Initialisation d'OpenAI
const openai = new OpenAI({
    apiKey: openaiApiKey,
});

// Initialisation de Pinecone
const pinecone = new Pinecone({
    apiKey: pineconeApiKey,
});
const index = pinecone.index(pineconeIndexName);

// Fonction pour segmenter le texte
function segmentText(text, maxLength = 500) {
    const segments = [];
    for (let i = 0; i < text.length; i += maxLength) {
        segments.push(text.slice(i, i + maxLength));
    }
    return segments;
}

// Fonction pour générer un embedding de 1536 dimensions pour chaque segment
async function generateEmbedding(text) {
    console.log(`Génération de l'embedding pour le texte : "${text.slice(0, 50)}..."`);
    const response = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text,
    });
    console.log(`Embedding généré avec succès pour le texte.`);
    return response.data[0].embedding;
}

// Fonction pour ajouter les segments de texte dans l'index Pinecone
async function addTextFilesToIndex(namespace) {
    const files = fs.readdirSync(textDocumentsPath);

    for (const file of files) {
        const filePath = path.join(textDocumentsPath, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        
        // Nettoyer le nom de fichier pour générer un identifiant ASCII valide
        const cleanFileId = slugify(file, {
            replacement: '-', 
            remove: /[*+~.()'"!:@]/g,
            lower: true,
            strict: true,
        });

        // Segmenter le texte du fichier
        const segments = segmentText(content);
        const vectors = [];

        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i];
            const embedding = await generateEmbedding(segment);

            if (embedding.length !== 1536) {
                console.error(`Erreur: la dimension de l'embedding est ${embedding.length} au lieu de 1536 pour le fichier ${file}, segment ${i}`);
                continue;
            }

            vectors.push({
                id: `${cleanFileId}-${i}`,
                values: embedding,
                metadata: { filename: file, segment_index: i, text: segment },
            });
        }

        await index.namespace(namespace).upsert(vectors);
        console.log(`Fichier ${file} ajouté avec ${segments.length} segments.`);
    }
}

// Initialiser le bot Discord
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// Événement de connexion pour le bot
client.once('ready', async () => {
    console.log(`Connecté en tant que ${client.user.tag}`);
    await addTextFilesToIndex('ns1');
});

// Événement de message
client.on('messageCreate', async (message) => {
    console.log(`Message reçu de ${message.author.tag}: "${message.content}"`);

    // Éviter les réponses aux messages du bot lui-même
    if (message.author.bot) return;

    // Vérification si le bot est mentionné dans le message
    if (message.mentions.has(client.user)) {
        console.log("Déclencheur détecté via mention directe !");
        const userMessage = message.content;

        try {
            const userEmbedding = await generateEmbedding(userMessage);
            console.log("Embedding utilisateur généré avec succès.");

            // Enlever le filtre temporairement pour tester
            console.log("Envoi de la requête de recherche à Pinecone...");
            const queryResponse = await index.namespace('ns1').query({
                vector: userEmbedding,
                topK: 3,
                includeValues: true,
                includeMetadata: true
            });
            console.log("Requête Pinecone terminée avec succès.");

            // Extraire et compiler tous les textes pertinents
            const relevantTexts = queryResponse.matches
                .map(match => match.metadata.text)
                .filter(Boolean)
                .join('\n\n');

            // Envoyer le texte compilé à OpenAI pour une réponse synthétique
            const completionResponse = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: "Réponds de manière concise et précise." },
                    { role: 'user', content: `Voici des informations pertinentes extraites sur la prime de partage de la valeur (PPV) :\n\n${relevantTexts}\n\nPeux-tu me donner une réponse claire et concise sur la date d'obligation de mise en place de la PPV ?` }
                ],
                max_tokens: 150
            });

            const summary = completionResponse.choices[0].message.content;

            await message.channel.send(summary);

        } catch (error) {
            console.error(`Erreur lors du traitement de la requête : ${error.message}`);
            await message.channel.send("Désolé, je rencontre un problème technique.");
        }
    }
});

// Lancement du bot Discord
client.login(discordToken);
