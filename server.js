// 1. Cargar las librerías que instalamos
require('dotenv').config();
const express = require('express');
const axios = require('axios');

// 2. Crear nuestra aplicación de servidor
const app = express();
const port = process.env.PORT || 3000;

// 3. Extraer nuestras credenciales seguras del archivo .env
const discordClientId = process.env.DISCORD_CLIENT_ID;
const discordClientSecret = process.env.DISCORD_CLIENT_SECRET;
const redirectUri = 'https://backend-verificacion-fivem.onrender.com/auth/callback';

// 4. Ruta que inicia la verificación (la que ya probaste)
app.get('/auth/discord', (req, res) => {
    const authorizationUrl = `https://discord.com/api/oauth2/authorize?client_id=${discordClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=identify`;
    res.redirect(authorizationUrl);
});

// 5. ¡PASO CLAVE! La ruta de callback que procesa la información del usuario
// Discord redirige al usuario aquí después de que autoriza la app.
app.get('/auth/callback', async (req, res) => {
    // Primero, obtenemos el código de autorización que Discord nos envía en la URL.
    const code = req.query.code;

    // Si por alguna razón no hay código, enviamos un error.
    if (!code) {
        return res.send('Error: No se recibió el código de autorización de Discord.');
    }

    try {
        // Ahora, preparamos los datos que enviaremos a Discord para intercambiar
        // el código por un "token de acceso".
        const params = new URLSearchParams();
        params.append('client_id', discordClientId);
        params.append('client_secret', discordClientSecret);
        params.append('grant_type', 'authorization_code');
        params.append('code', code);
        params.append('redirect_uri', redirectUri);

        // Hacemos una petición POST a la API de Discord para obtener el token.
        const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });

        const accessToken = tokenResponse.data.access_token;

        // Con el token de acceso, ahora podemos pedir la información del usuario.
        const userResponse = await axios.get('https://discord.com/api/users/@me', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        // ¡Éxito! Tenemos los datos del usuario.
        const userData = userResponse.data;
        const discordId = userData.id;
        const discordUsername = `${userData.username}#${userData.discriminator}`;

        // *******************************************************************
        // AQUÍ ES DONDE OCURRE LA MAGIA PARA TU SERVIDOR FIVEM
        // En un futuro, en lugar de solo mostrar el mensaje, aquí es donde
        // guardarías el 'discordId' en tu base de datos (tu whitelist).
        // *******************************************************************

        // Por ahora, solo mostraremos un mensaje de éxito en la página.
        res.redirect('https://discord.gg/xUvbwzxb');

    } catch (error) {
        // Si algo falla en el proceso, mostramos un error.
        console.error('Error en el proceso de autenticación:', error);
        res.send('Ha ocurrido un error al verificar tu cuenta de Discord.');
    }
});

// 6. Encender el servidor
app.listen(port, () => {
    console.log(`Servidor de backend escuchando en http://localhost:${port}`);
    console.log('Para iniciar la prueba, visita en tu navegador: http://localhost:3000/auth/discord');
});

