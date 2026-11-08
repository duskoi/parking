# Presencia de la ESP32 por HTTPS

GitHub Pages aloja la web. El Worker `parking-presencia` recibe los avisos de la placa en `POST /presencia` y devuelve `{"online":true}` a la web si recibió uno en los últimos 35 segundos. La placa envía un aviso aproximadamente cada 10 segundos. EMQX gestiona las órdenes y las confirmaciones del pulso en GPIO 23.

La URL de producción está en [config.json](config.json). La base de datos D1 `parking-presencia` guarda la hora del último aviso. La API devuelve únicamente el booleano y no acciona la puerta.

## Volver a desplegar el servicio

1. Desde esta carpeta, ejecuta `npx wrangler login` y `npx wrangler d1 execute parking-presencia --remote --file=./schema.sql`.
2. En los ajustes del Worker, configura la variable `PRESENCE_TOKEN_SHA256` con la huella SHA-256 en hexadecimal del token de la ESP32. Conserva el token de la placa fuera del repositorio.
3. Ejecuta `npx wrangler deploy --keep-vars`. Si cambias de cuenta o base de datos, actualiza también el identificador en `wrangler.toml`.

En la placa, `URL_PRESENCIA` contiene la URL terminada en `/presencia`, `TOKEN_PRESENCIA` contiene el token y `CA_PRESENCIA` contiene la raíz TLS del Worker.
