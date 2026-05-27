# Test Credentials - Bayer Production Control

## Admin (seeded automatically on backend startup)

- Email: `admin@bayer.com`
- Password: `admin123`
- Role: `admin`

## Auth Endpoints

- POST `/api/auth/register` - body: `{ email, password, name }` → returns `{ access_token, user }`
- POST `/api/auth/login` - body: `{ email, password }` → returns `{ access_token, user }`
- GET `/api/auth/me` - requires `Authorization: Bearer <token>` → returns user

## Token Type

- JWT Bearer in `Authorization` header (mobile uses expo-secure-store)
- Access token expiry: 7 days

## Production Items Endpoints (all require Bearer token)

- GET `/api/items?date=YYYY-MM-DD`
- POST `/api/items` body: `{ date, unit, sc, product, batch, quantity?, quantity_unit, material_status, situation, observation }`
- PUT `/api/items/{id}`
- DELETE `/api/items/{id}`

## Other endpoints (Bearer)

- GET `/api/products`
- POST `/api/products` body: `{ name, abbr? }`
- POST `/api/reports/whatsapp` body: `{ date, extra_observations? }` → `{ text, greeting, count }`
- GET `/api/export/excel?date=YYYY-MM-DD` → xlsx StreamingResponse
