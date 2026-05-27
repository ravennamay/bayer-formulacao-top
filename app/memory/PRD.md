# Bayer Production Control - PRD

## Overview
Mobile-first (Expo React Native) industrial production control app for Bayer in Portuguese (PT-BR). Two main modes:
1. Daily operational spreadsheet (Planilha) - operator view
2. WhatsApp formatted report (auto greeting based on time)

## Design
- Dark mode default with light mode toggle
- Bayer green (#00A04E) + status colors: green=Disponível, red=Indisponível, yellow=Baixo, blue=Em fábrica
- Notion/SaaS-like minimalist look. Cards (not table) for mobile readability.
- Icons: `@expo/vector-icons` Ionicons (reliable on mobile, replaces missing-icons issue from previous version).

## Stack
- Backend: FastAPI + Motor (MongoDB) + JWT bcrypt auth + openpyxl for Excel
- Frontend: Expo Router 6, expo-secure-store (token), AsyncStorage (theme), expo-clipboard, expo-sharing, expo-file-system, react-native-view-shot

## Key Features
- Email/password login + register with bcrypt hashing & JWT (Bearer)
- Seeded admin (admin@bayer.com / admin123)
- Daily spreadsheet with date strip selector (last 14 days)
- CRUD production items (Unidade, SC, Produto+abreviação, Lote, Quantidade, Status MP, Situação, Observação)
- Auto product abbreviations (Nativo→NAT, Verango→VER, etc.) + custom catalog
- Filters by status, smart search (product, batch, SC, unit, observation)
- Stats counters (Total/Disponível/Baixo/Indisponível)
- WhatsApp report generation with **auto greeting (Bom dia/Boa tarde/Boa noite)** based on time-of-day in São Paulo (UTC-3)
- Report grouped by Unit > SC > Product, highlighting missing materials, low stock, duplicate batches
- Share via WhatsApp deep link (whatsapp://send) + copy to clipboard
- Export to Excel (xlsx) with status-color cells
- Export planilha to PNG via ViewShot
- Theme toggle (dark/light) persisted
- Custom product catalog management

## Endpoints
See `/app/memory/test_credentials.md`.

## Files
Backend: `/app/backend/server.py`
Frontend:
- `/app/frontend/app/_layout.tsx` (providers)
- `/app/frontend/app/index.tsx` (router gate)
- `/app/frontend/app/login.tsx`
- `/app/frontend/app/(tabs)/_layout.tsx` (tabs)
- `/app/frontend/app/(tabs)/index.tsx` (Planilha)
- `/app/frontend/app/(tabs)/report.tsx` (WhatsApp report)
- `/app/frontend/app/(tabs)/settings.tsx` (theme/products/logout)
- `/app/frontend/src/auth.tsx`, `theme.tsx`, `types.ts`, `StatusPill.tsx`, `ItemFormModal.tsx`
