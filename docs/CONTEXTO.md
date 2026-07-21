# Chofer de Reemplazo — Contexto del proyecto

> Documento para dar contexto rápido a un desarrollador (o a la IA de Cursor)
> que se suma al proyecto. Explica qué es la app, cómo está organizada, qué
> falta y cómo correrla.

## Qué es

App móvil (Android/iOS) de un servicio de **chofer de reemplazo** en España
(Barcelona): un cliente que no puede/quiere conducir pide un chofer que va
hasta donde está y conduce **el propio coche del cliente**. Una sola app con
tres experiencias según el rol: **cliente**, **chofer** y **admin** (el admin
es un chofer con permisos extra).

## Stack

- **Frontend**: React Native + Expo (TypeScript), navegación con `expo-router`
  (rutas por archivos). TypeScript en modo estricto.
- **Backend**: Supabase (Postgres + Auth + Realtime + Storage + Edge Functions).
- **Mapas**: `react-native-maps` (Google Maps), Google Directions/Geocoding/Places.
- **Pagos**: Redsys (tarjeta + Bizum) y efectivo, detrás de Edge Functions.
- **Push**: `expo-notifications` + FCM (Firebase). Envío directo a la API de Expo.
- **Distribución**: EAS Build (APK) + EAS Update (OTA para cambios de solo JS).

## Estructura de carpetas

```
app/                         # Proyecto Expo
  app/                       # Rutas (expo-router, file-based)
    (auth)/                  # login, register, complete-profile
    (client)/                # pantallas del cliente (pedir, historial, perfil, viaje…)
    (driver)/                # pantallas del chofer/admin (solicitudes, servicio, empresa, choferes…)
    payment/                 # checkout / resultado de pago
    _layout.tsx              # layout raíz: AuthProvider, alertas, burbuja de errores
  src/
    lib/                     # utilidades PURAS y aisladas (sin estado React):
                             #   pricing, distance, realtime, errorLog, pushSend,
                             #   loginHistory, carCatalog, countries, licenseTypes,
                             #   vehiclePlates, supabase (cliente), etc.
    hooks/                   # un hook por "cosa" de datos (una tabla c/u):
                             #   useBooking, usePayment, useVehicleInspection,
                             #   useDrivers, useBusinessHours, usePricingConfig…
                             #   La mayoría se suscribe a Realtime.
    components/              # UI reutilizable (SheetModal, BookingCard, BookingDetail,
                             #   DriverFormModal, SelectionUI, CarDamageDiagram,
                             #   LiveTrackingMap, ErrorOverlay, alertas flotantes…)
    state/AuthContext.tsx    # sesión + perfil + rol (única fuente de auth)
    types/index.ts           # todos los tipos TypeScript (Profile, Booking, etc.)
supabase/
  migrations/                # 0001..00NN, historia versionada del esquema (correr en SQL Editor)
  functions/                 # Edge Functions (Deno): create-driver-account, delete-driver-account,
                             #   create-redsys-order, redsys-notification
docs/                        # documentación (este archivo, SETUP.md)
```

### Convenciones

- Cada **hook** en `src/hooks/` maneja UNA tabla/consulta y, si aplica, su
  suscripción Realtime. Los canales de Realtime usan `uniqueChannelName()`
  (`src/lib/realtime.ts`) para no colisionar entre componentes.
- La **lógica pura** (cálculos, validaciones, formateos) vive en `src/lib/`,
  sin React, fácil de testear/reusar.
- Los **componentes** no hablan directo con Supabase salvo acciones simples;
  la data entra por hooks.
- Alias de import: `@/` → `src/`.
- Comentarios en español (es el idioma del proyecto).

## Modelo de datos (tablas principales)

- `profiles`: id (=auth.users), full_name, last_name, avatar_url, phone,
  role ('client'|'driver'), is_online, is_admin, is_active, dni, document_type
  ('DNI'|'NIE'|'Pasaporte'), license_type, address, nationality, push_token.
- `bookings`: id, client_id, driver_id, status
  ('pending'|'accepted'|'in_progress'|'completed'|'cancelled'), pickup/dropoff
  (address+lat+lng), scheduled_at, vehicle_info, price_estimate.
- `driver_locations`: booking_id, driver_id, lat, lng (posición en vivo).
- `payments`: booking_id, provider ('redsys'|'cash'), status, amount.
- `vehicle_inspections`: inspección del coche por reserva. Salida
  (general_status, damages jsonb, client_confirmation_name, confirmed_at,
  start_confirmation_method/lat/lng) y vuelta (return_status
  'conforme'|'disputed'|'refused', return_damages, return_note,
  return_confirmation_name, return_confirmed_at, return_*). Trigger de
  inmutabilidad tras confirmar.
- `business_hours`, `pricing_config`, `booked_slots`, `admin_blocked_slots`,
  `vehicles`, `saved_addresses`.

RLS activo en todas. Políticas clave: cliente ve/edita lo suyo; chofer ve
pendientes + lo asignado; admin (is_admin) puede asignar/leer todo.

## Flujo principal

1. **Cliente** reserva (pantalla "Pedir chofer") y paga (tarjeta/Bizum/efectivo).
2. **Admin** ve la solicitud en "Solicitudes" (pestañas: Sin asignar / Asignadas
   / Canceladas / Finalizadas), la acepta y **asigna un chofer** (puede ser él
   mismo). Puede reasignar a otro chofer.
3. Al chofer le aparece una **burbuja flotante "¡Recibiste un viaje!"** (al
   asignarlo o al abrir la app) y lo ve en "Servicio".
4. El chofer llega → **"Iniciar servicio"** → carga la **revisión del vehículo**
   (diagrama interactivo + fotos) → la envía al cliente.
5. El **cliente confirma la revisión desde su propio teléfono** (firma).
6. El chofer ve el cartel verde y toca **"Iniciar viaje"** (status → in_progress).
7. Al llegar al destino, pide **conformidad de vuelta**; el cliente marca
   "conforme" o "no conforme" (con observaciones/fotos, contrastable contra la
   salida). El chofer cierra el viaje y confirma el cobro si es efectivo.

## Notificaciones / alertas

- Push dirigidos por usuario (`src/lib/pushSend.ts`): admin recibe "nueva
  solicitud"; el chofer asignado recibe "recibiste un viaje"; el cliente recibe
  "se te asignó un chofer", "tu chofer llegó", etc.
- Alertas flotantes in-app: `IncomingTripAlert` (chofer) y `DriverAssignedAlert`
  (cliente), basadas en Realtime.
- **Burbuja de errores** (`ErrorOverlay`): captura errores de JS y los muestra
  en pantalla (útil para diagnosticar sin computadora). Un `ErrorBoundary`
  evita que un error de render deje la app en negro.

## Cómo correr / compilar

Requiere Node 18+ y la CLI de EAS (`npm i -g eas-cli`), con sesión de Expo.

```bash
cd app
npm install
npx tsc --noEmit          # chequeo de tipos (correr SIEMPRE antes de commitear)
npx expo start            # correr en Expo Go / dev

# Build nativo (APK) — cuando se agrega una dependencia nativa:
eas build --platform android --profile preview --non-interactive

# Actualización OTA (solo cambios de JS/TSX, sin deps nativas nuevas):
eas update --branch preview --message "descripcion"
```

Variables de entorno (EAS → environment "preview"): `EXPO_PUBLIC_SUPABASE_URL`,
`EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`.
`app/google-services.json` (Firebase) ya está incluido para push en Android.

## Backend: pasos manuales en Supabase

Las migraciones NO se aplican solas: hay que pegarlas en el **SQL Editor** de
Supabase (o usar `supabase db push` con la CLI). Las Edge Functions se
despliegan pegándolas en el dashboard (Edge Functions) o con la CLI.

**Pendiente de verificar que esté aplicado** (según el estado del proyecto):
- Migraciones `0001`..`0020` corridas en orden.
- Edge Functions desplegadas: `create-driver-account`, `delete-driver-account`,
  `create-redsys-order`, `redsys-notification`.
- Realtime habilitado para `bookings`, `driver_locations`, `payments`,
  `vehicle_inspections` (migración `0019`).
- Para login con Google: en Authentication → URL Configuration → Redirect URLs
  deben estar `choferdereemplazo://` y `choferdereemplazo:///`, y el proveedor
  Google habilitado con Client ID/Secret.

## Rama de trabajo

Todo el desarrollo va en la rama `claude/replacement-driver-app-tkn86c`.

## Estado / deuda técnica conocida

- El archivo `app/app/(driver)/trip/[bookingId].tsx` es el más grande (~580
  líneas) y concentra muchas etapas del viaje; es el principal candidato a
  partirse en subcomponentes.
- Se está diagnosticando un caso donde el "Confirmar" de la revisión del cliente
  no cambiaba de pantalla (causa probable: migración/permiso; ya se agregaron
  alertas de error visibles para diagnosticarlo).
