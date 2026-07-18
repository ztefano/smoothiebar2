# Chofer de Reemplazo

App móvil (Android + iOS) para un servicio de chofer de reemplazo: el
cliente pide un chofer que va hasta donde está y conduce su propio
vehículo. Incluye mapa y geolocalización en tiempo real, agendamiento
(ahora o programado), y pago con **tarjeta, Bizum o efectivo**.

## Estructura del repositorio

- **`app/`** — App móvil en React Native + Expo (TypeScript), con rutas de
  `expo-router`. Una sola app con dos experiencias según el rol del
  usuario: **cliente** (pide/agenda viajes, ve el mapa en vivo, paga) y
  **chofer** (ve solicitudes, acepta, comparte ubicación, confirma cobros).
- **`supabase/`** — Backend: migraciones SQL (Postgres + RLS) y Edge
  Functions para el pago con Redsys (tarjeta/Bizum).
- **`docs/SETUP.md`** — Cómo conectar credenciales reales y correr/compilar
  la app en un dispositivo.

## Stack

- **App**: React Native + Expo (TypeScript), `expo-router`, `react-native-maps`,
  `expo-location`, `react-native-webview`.
- **Backend**: Supabase (Postgres, Auth, Realtime, Edge Functions).
- **Pagos**: Redsys (TPV Virtual — tarjeta y Bizum en el mismo checkout) +
  efectivo (confirmado manualmente por el chofer en la app).

## Primeros pasos

Ver [`docs/SETUP.md`](docs/SETUP.md) para la guía completa. En resumen:

```bash
cd app
npm install
cp .env.example .env   # completar con tus credenciales de Supabase
npx expo start
```

## Estado del proyecto

Este es un MVP funcional: cubre el flujo completo (registro, pedir/agendar,
aceptar, viaje en vivo, pago) con datos reales en Supabase, pero **no** fue
probado en un dispositivo físico dentro de este entorno (sin Xcode/emulador
Android disponibles aquí). El checkout de Redsys usa el algoritmo de firma
documentado por Redsys pero **debe validarse contra el entorno de pruebas
(sandbox) antes de aceptar pagos reales**.
