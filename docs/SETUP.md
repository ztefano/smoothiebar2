# Guía de configuración

## 1. Crear el proyecto de Supabase

1. Creá un proyecto en Supabase (plan gratuito alcanza para el MVP).
2. En **Project Settings → API** copiá `Project URL` y `anon public key`.
3. Instalá la CLI de Supabase y logueate:
   ```bash
   npm install -g supabase
   supabase login
   supabase link --project-ref TU_PROJECT_REF
   ```
4. Aplicá la migración inicial (crea tablas `profiles`, `bookings`,
   `driver_locations`, `payments` con Row Level Security):
   ```bash
   supabase db push
   ```

## 2. Configurar la app móvil

```bash
cd app
npm install
cp .env.example .env
```

Completá `.env` con:
- `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` (paso 1).
- `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`: clave de Google Maps SDK for Android
  (Google Cloud Console → habilitar "Maps SDK for Android"). En iOS se usa
  Apple Maps por defecto, no hace falta clave.
- `EXPO_PUBLIC_APP_SCHEME`: esquema de deep link (por defecto
  `choferdereemplazo`), usado para volver del checkout de pago.

Correr en desarrollo:
```bash
npx expo start
```
Escaneá el QR con la app **Expo Go** (Android/iOS) o abrí un simulador. El
mapa y la ubicación funcionan dentro de Expo Go; el rastreo de ubicación en
segundo plano (chofer con la app minimizada) requiere un *development
build* (paso 5).

## 3. Pasarela de pago: Redsys (tarjeta + Bizum)

Redsys es el TPV Virtual que usan la mayoría de bancos españoles y soporta
tarjeta y Bizum en la misma pantalla de pago. Necesitás que tu banco te dé
de alta un contrato de **TPV Virtual** (con Bizum activado si lo querés
desde el día uno).

Datos que te da el banco:
- **FUC / Código de comercio** (`DS_MERCHANT_MERCHANTCODE`)
- **Terminal** (`DS_MERCHANT_TERMINAL`, normalmente `001`)
- **Clave secreta de firma** (SHA-256), en base64

Configurá estos secrets en Supabase (Project Settings → Edge Functions →
Secrets, o vía CLI):

```bash
supabase secrets set \
  REDSYS_MERCHANT_CODE=xxxxxxxx \
  REDSYS_TERMINAL=001 \
  REDSYS_MERCHANT_KEY="clave-base64-del-banco" \
  REDSYS_ENV=test \
  REDSYS_NOTIFICATION_URL="https://TU-PROYECTO.functions.supabase.co/redsys-notification" \
  APP_SCHEME=choferdereemplazo
```

Desplegá las funciones:
```bash
supabase functions deploy create-redsys-order
supabase functions deploy redsys-notification --no-verify-jwt
```

`--no-verify-jwt` es necesario en `redsys-notification` porque Redsys llama
a esa URL directamente (server-to-server), sin el JWT de Supabase Auth.

**Importante — validar antes de producción**: el algoritmo de firma
(3DES + HMAC-SHA256) está implementado en
`supabase/functions/_shared/redsys.ts` siguiendo la especificación pública
de Redsys, pero no pudo probarse contra el sandbox real en este entorno.
Antes de aceptar pagos reales:
1. Poné `REDSYS_ENV=test` y usá las tarjetas de prueba que da Redsys en su
   documentación de comercio.
2. Hacé un pago de prueba de punta a punta (checkout → notificación →
   `payments.status = 'approved'`).
3. Recién ahí cambiá `REDSYS_ENV=production` y las credenciales reales.

## 4. Pago en efectivo

No requiere configuración: el cliente elige "Pagar en efectivo" en la app,
se crea un registro `pending` en `payments`, y el chofer lo confirma desde
su pantalla de viaje (`payments.status = 'approved'`). Sin pasarela ni
comisión de por medio.

## 5. Ícono y splash screen

El proyecto todavía no incluye `app/assets/icon.png`. Antes de compilar con
EAS, agregá un ícono de 1024x1024 en esa ruta y descomentá la línea
`icon: "./assets/icon.png"` en `app/app.config.js` (sin ícono, Expo Go
funciona igual para desarrollo, pero el build de producción lo requiere).

## 6. Compilar un APK para instalar en tu teléfono (EAS Build)

Expo Go alcanza para desarrollar, pero para instalar la app directo en un
teléfono Android (sin pasar por Google Play) necesitás compilarla con
**EAS Build** — corre en los servidores de Expo, así que no requiere tener
Android Studio instalado. El repo ya incluye `app/eas.json` con un perfil
`preview` configurado para generar un `.apk` (los builds normales de Play
Store generan `.aab`, que no se puede instalar directo).

```bash
npm install -g eas-cli
eas login              # creá una cuenta gratis en expo.dev si no tenés
cd app
eas build:configure    # vincula el proyecto a tu cuenta (genera un projectId)
eas build --platform android --profile preview
```

Al terminar (uns 10-20 min), la terminal te da un link para descargar el
`.apk`. Abrilo desde el teléfono (puede pedirte habilitar "instalar apps de
orígenes desconocidos") para instalarlo.

## 6.1 Actualizaciones OTA (sin recompilar el APK)

El proyecto ya está configurado con `expo-updates` y un `projectId` de EAS
(`app/app.config.js` → `extra.eas.projectId` / `updates.url`), y cada
perfil de `eas.json` tiene un `channel` (`development` / `preview` /
`production`). Esto permite publicar cambios de **solo JS/TS** (pantallas,
lógica, textos — nada que agregue una librería nativa nueva) directo a los
APKs ya instalados, sin generar un `.apk` nuevo ni reinstalar nada:

```bash
cd app
eas update --branch preview --message "descripción del cambio"
```

Esto sí requiere correr el comando desde una terminal (CLI) — no hay un
botón equivalente en el dashboard web para esto. Si querés que se dispare
solo con cada push a GitHub (sin que nadie corra el comando a mano),
explorá **"Flujos de trabajo de EAS"** en el dashboard del proyecto — está
pensado exactamente para eso, con su propio asistente guiado.

Si el cambio agrega una librería nativa nueva, cambia permisos, o toca
`app.config.js` en la parte nativa (ios/android), una actualización OTA
**no alcanza**: hay que volver a compilar con `eas build` (sección 6).

## 7. Compilar para iOS

Para iOS no existe el equivalente al `.apk`: instalar en un iPhone sin pasar
por la App Store requiere sí o sí una cuenta de Apple Developer (99 USD/año)
y `eas build --platform ios --profile preview`.

Un *development build* (`eas build --profile development`) además habilita
el rastreo de ubicación en segundo plano para los choferes, que Expo Go no
soporta.

## 8. Publicar en las tiendas

- **Android**: `eas build --platform android --profile production` y subir
  el `.aab` a Google Play Console.
- **iOS**: `eas build --platform ios --profile production` y subir con
  `eas submit`, requiere cuenta de Apple Developer Program.

## Notas de tarifa

La tarifa (`app/src/lib/pricing.ts`) usa una fórmula simple (base + km en
línea recta + recargo nocturno) pensada para arrancar. Ajustá los valores
`BASE_FARE_EUR` / `PRICE_PER_KM_EUR` ahí mismo cuando definas tu tarifa
real, o migralo a una tabla en Supabase si querés poder cambiarla sin
publicar una nueva versión de la app.
