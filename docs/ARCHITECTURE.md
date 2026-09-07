# WashNgo architecture

## System boundary

The Expo application serves customer, rider, laundry partner, and responsive admin experiences. Supabase provides Auth, Postgres, Realtime, Storage, and transactional RPC functions. Clients use the publishable key only; RLS and database functions are the authorization boundary.

## Runtime flow

1. Auth restores a persisted session and loads `profiles`.
2. The root guard sends the user to the route group matching the immutable database role.
3. Screens call feature hooks; hooks call typed services; services are the only layer that calls Supabase.
4. Mutations use RPC functions for lifecycle changes requiring authorization or multiple writes.
5. Realtime invalidates focused TanStack Query keys. Every subscription is disposed on unmount.
6. Dispatch creates distinct `pickup_to_laundry` and `laundry_to_customer` jobs.

## Text ERD

```text
auth.users 1---1 profiles 1---* addresses
                    | 1---0..1 riders 1---* delivery_jobs
                    | 1---0..1 laundry_shops 1---* laundry_services
                    |                         1---* orders
                    +------------------------------* orders (customer)
orders 1---* order_items
orders 1---* order_status_logs
orders 1---2 delivery_jobs 1---* delivery_proofs
orders 1---* ratings
orders 1---1 payments
profiles 1---* notifications
service_zones 1---* laundry_shops
service_zones 1---* orders
orders 1---0..1 chat_rooms 1---* messages
```

## Security decisions

- Public signup roles are ignored; signup automation always creates a customer profile.
- Partner/rider/admin provisioning is an administrator-only operation.
- Lifecycle writes happen through functions with explicit role/status checks.
- Proof and verification object paths are owner-scoped; verification documents are private.
- Money is `numeric(12,2)` with non-negative checks and recalculated server-side.
