# WashNgo

**Pick Up. Clean. Deliver. Easy.** A launch-oriented Expo + Supabase marketplace MVP for laundry pickup and delivery in Lipa City, Batangas.

## What is implemented

- One persisted Supabase Auth session with database-owned roles and protected Expo Router groups
- Customer registration/login/reset, addresses, laundry discovery, service selection, booking, orders, maps, realtime timeline
- Partner accept/reject, processing, and ready-for-return actions
- Rider approval gate, availability, location, atomic job acceptance, GPS/photo proofs, and earnings
- Admin metrics and partner/rider verification
- Transactional lifecycle RPCs, separate pickup/return jobs, immutable status logs, notifications, push Edge Function
- Constraints, indexes, PostGIS service zones, RLS, private storage, Realtime, and realistic Lipa seed data

## Architecture

Screens in `src/app` call feature/service modules; only `src/services` talks to Supabase. TanStack Query owns server cache, Zustand owns auth/booking UI state, and RPCs own multi-record transitions. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

```text
src/app/                 role-protected routes
src/components/          reusable UI and maps
src/features/            schemas/feature logic
src/services/            data and device integrations
src/hooks/               auth and realtime lifecycle
src/store/               session/booking state
src/lib/                 client, errors, env, cache
src/types/               domain contracts
supabase/migrations/     schema, RPCs, RLS, storage, realtime
supabase/functions/      push delivery
supabase/seed.sql        Lipa zone, shops, services
```

## Requirements and installation

Node.js 22.13+, npm 10+, and either Supabase CLI + Docker or a hosted Supabase project.

```bash
npm ci
cp .env.example .env
```

Set `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`, and `EXPO_PUBLIC_EAS_PROJECT_ID`. Never put a `service_role` key in Expo variables.

## Supabase setup

```bash
supabase start
supabase db reset
```

For hosted Supabase:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
supabase functions deploy send-push
supabase secrets set NOTIFICATION_WEBHOOK_SECRET=YOUR_SECRET
```

Enable email/password Auth, add `washngo://reset-password` to redirect URLs, and configure a Database Webhook on `notifications` inserts to call `send-push` with the matching `x-webhook-secret`. Proof and verification buckets must remain private.

## Test users and seed data

Create these users through Auth (all may use `WashNgo!2026` locally): `customer@washngo.demo`, `rider@washngo.demo`, `laundry@washngo.demo`, and `admin@washngo.demo`.

Public signup always creates a customer. Provision non-customer roles locally in Studio:

```sql
update public.profiles set role='admin',status='approved' where id=(select id from auth.users where email='admin@washngo.demo');
update public.profiles set role='rider',status='approved' where id=(select id from auth.users where email='rider@washngo.demo');
insert into public.riders(profile_id,service_zone_id,vehicle_type,plate_number,verification_status)
select id,'10000000-0000-0000-0000-000000000001','motorcycle','123ABC','approved' from auth.users where email='rider@washngo.demo';
update public.profiles set role='laundry_partner',status='approved' where id=(select id from auth.users where email='laundry@washngo.demo');
```

Create a second laundry partner for both sample shops, then run `supabase/seed.sql`. Production provisioning must be private/server-side.

## Run and test each role

```bash
npm run typecheck
npm run lint
npm start
```

Customer: save address → choose shop/service → schedule → confirm. Partner: accept → receive → process → ready. Rider: go online → accept → submit pickup proof → deliver → repeat return leg. Customer sees realtime updates and completes/rates. Admin sees metrics and verification requests.

## Android, iOS, and production

```bash
npx eas-cli build:configure
npx eas-cli build --platform android --profile production
npx eas-cli build --platform ios --profile production
```

Use separate Supabase projects per environment, EAS environment variables, restricted Maps keys, APNs/FCM credentials, backups, monitoring, and non-admin JWT RLS tests before launch.

## Known MVP limitations

- COD/pay-later are ledger states; no gateway is included.
- Dispatch is an eligible-zone broadcast with atomic acceptance, not route optimization.
- Foreground location updates on going online; background tracking needs Expo TaskManager and explicit battery/privacy UX.
- Push requires the documented webhook and Expo credentials.
- Admin is responsive Expo Web. Chat UI, OTP, and QR verification are prepared in schema but deferred.

Recommended next work: PayMongo/GCash/Maya, optimized dispatch, background tracking, support chat, configurable fees, partner calendars, refunds, promotions, and multi-city tooling.

This targets SDK 57 using current [Expo SDK](https://docs.expo.dev/versions/latest/), [Expo Router](https://docs.expo.dev/versions/latest/sdk/router/), and [Supabase React Native Auth](https://supabase.com/docs/guides/auth/quickstarts/react-native) guidance.
