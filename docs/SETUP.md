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

## 6. Compilar para un teléfono real (EAS Build)

Expo Go alcanza para desarrollar, pero para instalar en un teléfono real
(o publicar en las tiendas) necesitás un build con **EAS**:

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android --profile preview
eas build --platform ios --profile preview   # requiere cuenta de Apple Developer
```

Un *development build* (`eas build --profile development`) también
habilita el rastreo de ubicación en segundo plano para los choferes, que
Expo Go no soporta.

## 7. Publicar en las tiendas

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
