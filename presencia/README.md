# Presencia de la ESP32 por HTTPS

La web sigue en GitHub Pages. El Worker recibe los avisos de la ESP32 en `POST /presencia` y responde a la web en `GET /presencia`. Guarda la hora del último aviso y muestra la placa como desconectada después de 35 segundos sin recibir otro. EMQX se ocupa de las órdenes y de las confirmaciones del pulso.

## Publicar el Worker

Desde la carpeta `presencia` del repositorio, ejecuta lo siguiente con Node.js instalado y una cuenta de Cloudflare Workers.

```sh
npx wrangler login
npx wrangler deploy
npx wrangler secret put PRESENCE_TOKEN
```

El último comando te pedirá un secreto aleatorio de 32 bytes en hexadecimal. Puedes generarlo con `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Guarda ese valor para configurar la placa.

## Conectar la web y la placa

1. Copia la URL del Worker que imprimió Wrangler, añade `/presencia` al final y pon la URL completa en `endpoint` de `presencia/config.json`.
2. En el programa Arduino, configura `URL_PRESENCIA` con esa misma URL y `TOKEN_PRESENCIA` con el secreto. Pega en `CA_PRESENCIA` el certificado raíz PEM de la cadena TLS del Worker. Usa la raíz de la autoridad certificadora que corresponda al dominio real del Worker.
3. Publica el cambio de `presencia/config.json` y sube el programa a la ESP32. El Monitor Serie a 115200 baudios muestra los errores HTTPS. Una petición GET al endpoint debería devolver `{"online":true}` mientras la placa envíe los avisos.

Mantén el token fuera de GitHub y del JavaScript de la página. La consulta de estado es pública y solo devuelve un booleano. Si falta configurar HTTPS, la web lo indica y sigue esperando la confirmación de la ESP32 para cada orden de apertura.
