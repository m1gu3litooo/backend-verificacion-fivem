require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3000;

// Extraemos TODAS nuestras credenciales seguras
const discordClientId = process.env.DISCORD_CLIENT_ID;
const discordClientSecret = process.env.DISCORD_CLIENT_SECRET;
const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL; // ¡NUEVO!

const redirectUri = 'https://backend-verificacion-fivem.onrender.com/auth/callback';

app.get('/auth/discord', (req, res) => {
    const authorizationUrl = `https://discord.com/api/oauth2/authorize?client_id=${discordClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=identify`;
    res.redirect(authorizationUrl);
});

app.get('/auth/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) {
        return res.send('Error: No se recibió el código de autorización.');
    }

    try {
        const params = new URLSearchParams();
        params.append('client_id', discordClientId);
        params.append('client_secret', discordClientSecret);
        params.append('grant_type', 'authorization_code');
        params.append('code', code);
        params.append('redirect_uri', redirectUri);

        const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', params);
        const accessToken = tokenResponse.data.access_token;

        const userResponse = await axios.get('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        const userData = userResponse.data;
        const discordId = userData.id;
        const discordUsername = `${userData.username}#${userData.discriminator}`;
        const avatarHash = userData.avatar;
        const avatarUrl = `https://cdn.discordapp.com/avatars/${discordId}/${avatarHash}.png`;
        
        // ¡NUEVO! Capturamos la IP del usuario.
        const userIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        // ¡NUEVO! Preparamos el mensaje para el webhook.
        const webhookData = {
            content: `✅ Nuevo usuario verificado: **${discordUsername}**`,
            embeds: [
                {
                    title: "Detalles de la Verificación",
                    color: 5814783, // Un color azulito
                    thumbnail: {
                        url: avatarUrl
                    },
                    fields: [
                        { name: "Usuario", value: `<@${discordId}>`, inline: true },
                        { name: "Nombre de Usuario", value: `\`${discordUsername}\``, inline: true },
                        { name: "ID de Discord", value: `\`${discordId}\``, inline: false },
                        { name: "Dirección IP", value: `\`${userIp}\``, inline: false },
                    ],
                    footer: {
                        text: "Sistema de Verificación Automática"
                    },
                    timestamp: new Date().toISOString()
                }
            ]
        };

        // ¡NUEVO! Enviamos los datos al webhook.
        // Usamos un try/catch separado por si el webhook falla, para no detener la verificación.
        try {
            await axios.post(discordWebhookUrl, webhookData);
        } catch (webhookError) {
            console.error("Error al enviar el webhook:", webhookError.message);
        }

        // Finalmente, redirigimos al usuario a nuestro servidor de Discord.
        // ¡RECUERDA CAMBIAR ESTE ENLACE POR EL DE TU SERVIDOR!
        res.redirect('https://discord.gg/sTdbqf82mf');

    } catch (error) {
        console.error('Error en el proceso de autenticación:', error);
        res.send('Ha ocurrido un error al verificar tu cuenta de Discord.');
    }
});

app.listen(port, () => {
    console.log(`Servidor de backend escuchando en http://localhost:${port}`);
});


