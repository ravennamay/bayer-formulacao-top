# Guia Completo: EAS Build e Integração com Backend

## Índice
1. [Visão Geral](#visão-geral)
2. [EAS Build - Construindo o App](#eas-build---construindo-o-app)
3. [Backend - Como Funciona](#backend---como-funciona)
4. [Integração Frontend-Backend](#integração-frontend-backend)
5. [Fluxo End-to-End](#fluxo-end-to-end)
6. [Troubleshooting](#troubleshooting)

---

## Visão Geral

Este projeto é um app React Native (Expo) que se conecta a um backend Node.js/Python para gerenciar dados de produção. O fluxo completo envolve:

- **Frontend (Expo/React Native)**: App mobile rodando no dispositivo do usuário
- **Backend (API REST)**: Servidor que fornece dados e processa requisições
- **EAS (Expo Application Services)**: Serviço que compila e distribui o app para iOS/Android

---

## EAS Build - Construindo o App

### 1. Pré-requisitos

Antes de começar, certifique-se de ter:
- [Node.js](https://nodejs.org) 14+ instalado
- [Expo CLI](https://docs.expo.dev/get-started/installation/) instalado
- Conta no [Expo.dev](https://expo.dev) (gratuita)
- Credenciais de Apple (para iOS) e Google Play (para Android)

### 2. Configuração Inicial

```bash
# Instalar Expo CLI (se não tiver)
npm install -g expo-cli

# Navegar ao diretório do projeto
cd seu-projeto

# Instalar dependências
npm install

# Fazer login na conta Expo
eas login
```

### 3. Configurar eas.json

O arquivo `eas.json` na raiz do projeto controla como o app é construído. Exemplo básico:

```json
{
  "cli": {
    "version": ">= 3.0.0"
  },
  "build": {
    "preview": {
      "android": {
        "buildType": "apk"
      },
      "ios": {
        "buildType": "simulator"
      }
    },
    "preview2": {
      "android": {
        "buildType": "apk"
      },
      "ios": {
        "buildType": "simulator"
      }
    },
    "production": {
      "android": {
        "buildType": "aab"
      },
      "ios": {
        "buildType": "archive"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

### 4. Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com:

```env
EXPO_PUBLIC_BACKEND_URL=https://seu-backend.com
EXPO_PUBLIC_API_TIMEOUT=20000
```

⚠️ **Importante**: Variáveis com prefixo `EXPO_PUBLIC_` são acessíveis no cliente. Nunca inclua tokens secretos aqui.

### 5. Construir para Preview (Desenvolvimento)

Para testar antes de fazer upload para a App Store/Play Store:

```bash
# Android
eas build --platform android --profile preview

# iOS
eas build --platform ios --profile preview

# Ambos
eas build --platform all --profile preview
```

Isso gera um APK ou arquivo de preview que pode ser instalado no dispositivo para testes.

### 6. Construir para Produção

```bash
# Android (gera AAB para Google Play)
eas build --platform android --profile production

# iOS (gera archive para App Store)
eas build --platform ios --profile production

# Ambos
eas build --platform all --profile production
```

### 7. Enviar para App Store/Play Store

#### Google Play
```bash
eas submit --platform android --latest
```

Será solicitado:
- Credenciais Google Play Console
- Versão do build a enviar
- Confirmação de envio

#### Apple App Store
```bash
eas submit --platform ios --latest
```

Será solicitado:
- Credenciais Apple Developer (Apple ID)
- Senha de app específica
- Confirmação de envio

### 8. Acompanhar Build

```bash
# Ver status de builds
eas build:list

# Ver detalhes de um build específico
eas build:view <BUILD_ID>

# Monitorar logs em tempo real
eas build:log <BUILD_ID>
```

### 9. Configurações Avançadas

**Customizar Versão do App:**
```json
{
  "expo": {
    "version": "1.0.0",
    "android": {
      "versionCode": 1
    },
    "ios": {
      "buildNumber": "1"
    }
  }
}
```

**Usar Credenciais Locais (Git Credentials Storage):**
```bash
eas credentials
```

---

## Backend - Como Funciona

### 1. Arquitetura Base

O backend expõe uma API REST que segue padrão RESTful:

```
GET    /api/items           → Listar itens
POST   /api/items           → Criar novo item
PUT    /api/items/:id       → Atualizar item
DELETE /api/items/:id       → Deletar item
GET    /api/auth/me         → Obter usuário logado
POST   /api/auth/login      → Fazer login
POST   /api/auth/register   → Registrar
```

### 2. Autenticação (JWT)

O backend usa JWT (JSON Web Tokens) para autenticação:

**Fluxo de Login:**
1. Usuário envia `email` e `password` para `POST /auth/login`
2. Backend valida credenciais
3. Backend retorna `token` (JWT)
4. Frontend armazena token em `SecureStore` (seguro)
5. Token é incluído em todas as requisições subsequentes no header `Authorization: Bearer <token>`

**Refresh de Token:**
- Tokens têm tempo de expiração (geralmente 1-7 dias)
- Quando expirado, o backend retorna erro `401 Unauthorized`
- O frontend deve capturar este erro e fazer refresh automático

### 3. Endpoints Principais

#### Autenticação
```
POST /auth/login
Body: { email, password }
Response: { token, user: { id, name, email, role } }

POST /auth/register
Body: { email, password, name }
Response: { token, user: { id, name, email, role } }

GET /auth/me
Headers: Authorization: Bearer <token>
Response: { user: { id, name, email, role } }

POST /auth/forgot-password
Body: { email }
Response: { message: "Email enviado" }

POST /auth/reset-password
Body: { token, password }
Response: { message: "Senha resetada" }
```

#### Items (Produção)
```
GET /api/items
Query: ?date=YYYY-MM-DD (opcional)
Response: [{ id, date, unit, product, batch, situation, ... }]

POST /api/items
Body: { date, unit, sc, product, batch, quantity, situation, observation }
Response: { id, date, unit, ... } (item criado)

PUT /api/items/:id
Body: { situation, observation, ... } (qualquer campo)
Response: { id, date, ... } (item atualizado)

DELETE /api/items/:id
Response: { message: "Item deletado" }
```

#### Produtos
```
GET /api/products
Response: [{ name, abbr }]

GET /api/products/:id
Response: { id, name, abbr, description }
```

#### Dashboard
```
GET /api/dashboard
Response: {
  total_items: 42,
  items_by_status: { recebido: 10, preparado: 15, ... },
  recent_items: [...],
  stats: { ... }
}
```

#### Admin
```
GET /admin/users
Response: [{ id, email, name, role, created_at }]

PATCH /admin/users/:id/role
Body: { role: "admin" | "user" }
Response: { id, email, name, role }

DELETE /admin/users/:id
Response: { message: "Usuário deletado" }

GET /admin/stats
Response: { total_users, total_items, total_products, ... }
```

### 4. Tratamento de Erros

O backend retorna erros padronizados:

```javascript
// Erro 400 - Bad Request (dados inválidos)
{
  status: 400,
  detail: "Campo 'email' é obrigatório"
}

// Erro 401 - Unauthorized (não autenticado)
{
  status: 401,
  detail: "Token inválido ou expirado"
}

// Erro 403 - Forbidden (não autorizado)
{
  status: 403,
  detail: "Apenas admins podem deletar usuários"
}

// Erro 404 - Not Found
{
  status: 404,
  detail: "Item não encontrado"
}

// Erro 500 - Server Error
{
  status: 500,
  detail: "Erro interno do servidor"
}
```

---

## Integração Frontend-Backend

### 1. Configuração Axios

No arquivo `src/auth.tsx`:

```typescript
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL ?? 'https://seu-backend.com';

export const api = axios.create({
  baseURL: `${BASE}/api`,
  timeout: 20000,
});

// Interceptor para adicionar token automaticamente
api.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para tratar erros 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expirado - fazer logout ou refresh
      await SecureStore.deleteItemAsync('authToken');
      // Redirecionar para login
    }
    return Promise.reject(error);
  }
);
```

### 2. Exemplo: Listar Items

```typescript
import { api } from '../src/auth';

async function loadItems(date: string) {
  try {
    const response = await api.get('/items', {
      params: { date } // Query parameter
    });
    const items = response.data; // Array de items
    setItems(items);
  } catch (error) {
    console.error('Erro ao carregar items:', error);
    Alert.alert('Erro', 'Falha ao carregar dados');
  }
}
```

### 3. Exemplo: Criar Item

```typescript
async function createItem(data: {
  date: string;
  unit: string;
  sc: string;
  product: string;
  batch: string;
  quantity: number;
  situation: string;
  observation: string;
}) {
  try {
    const response = await api.post('/items', data);
    const newItem = response.data;
    Alert.alert('Sucesso', `Item "${newItem.product}" criado`);
    // Recarregar lista
    loadItems(data.date);
  } catch (error: any) {
    const msg = error.response?.data?.detail || 'Erro ao criar item';
    Alert.alert('Erro', msg);
  }
}
```

### 4. Exemplo: Atualizar Item

```typescript
async function updateItem(id: string, updates: { situation?: string; observation?: string }) {
  try {
    const response = await api.put(`/items/${id}`, updates);
    Alert.alert('Sucesso', 'Item atualizado');
    loadItems(currentDate);
  } catch (error: any) {
    const msg = error.response?.data?.detail || 'Erro ao atualizar';
    Alert.alert('Erro', msg);
  }
}
```

### 5. Exemplo: Login

```typescript
async function handleLogin(email: string, password: string) {
  try {
    const response = await api.post('/auth/login', { email, password });
    const { token, user } = response.data;

    // Armazenar token seguro
    await SecureStore.setItemAsync('authToken', token);

    // Armazenar dados do usuário (AsyncStorage é OK para dados não-sensíveis)
    await AsyncStorage.setItem('user', JSON.stringify(user));

    // Redirecionar para home
    router.replace('/(tabs)');
  } catch (error: any) {
    const msg = error.response?.data?.detail || 'Falha no login';
    Alert.alert('Erro', msg);
  }
}
```

---

## Fluxo End-to-End

### Cenário: Criar novo item de produção

**1. Frontend - Usuário preenche formulário**
```typescript
const [formData, setFormData] = useState({
  date: '2024-01-15',
  unit: 'Everest',
  sc: 'SC1',
  product: 'Nativo',
  batch: 'LOTE001',
  quantity: 500,
  situation: 'Recebido',
  observation: 'Tudo OK'
});
```

**2. Frontend - Envia POST para backend**
```typescript
const response = await api.post('/items', formData);
```

**3. Backend - Recebe requisição**
```python
POST /api/items
Headers: Authorization: Bearer eyJhbGc...
Body: {
  "date": "2024-01-15",
  "unit": "Everest",
  "sc": "SC1",
  "product": "Nativo",
  "batch": "LOTE001",
  "quantity": 500,
  "situation": "Recebido",
  "observation": "Tudo OK"
}
```

**4. Backend - Valida e salva no banco de dados**
```python
# Pseudocódigo
def create_item(data):
    # Validar dados
    if not data.get('product'):
        return error(400, "Campo produto obrigatório")

    # Salvar no banco
    item = Item.create(**data)

    # Retornar item criado
    return { item }
```

**5. Backend - Retorna resposta**
```json
{
  "id": "uuid-123",
  "date": "2024-01-15",
  "unit": "Everest",
  "sc": "SC1",
  "product": "Nativo",
  "batch": "LOTE001",
  "quantity": 500,
  "situation": "Recebido",
  "observation": "Tudo OK",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

**6. Frontend - Recebe resposta e atualiza UI**
```typescript
const newItem = response.data;
setItems([...items, newItem]); // Adiciona à lista
Alert.alert('Sucesso', `Item "${newItem.product}" criado`);
```

**7. Frontend - Usuário vê item na lista**
Planilha é atualizada em tempo real mostrando o novo item.

---

## Troubleshooting

### Problema: "Network Error" ao fazer requisições

**Possíveis causas:**
- URL do backend incorreta em `.env`
- Servidor backend offline
- Firewall bloqueando conexão
- Certificado SSL inválido (produção)

**Solução:**
```bash
# 1. Verificar URL
echo $EXPO_PUBLIC_BACKEND_URL

# 2. Testar conexão
curl -v https://seu-backend.com/api/items

# 3. Adicionar logs
console.log('URL:', process.env.EXPO_PUBLIC_BACKEND_URL);
console.log('Erro:', error.message);
```

### Problema: "Token inválido ou expirado"

**Solução:**
1. Fazer login novamente
2. O token será salvo em `SecureStore`
3. Será usado automaticamente em todas as requisições

### Problema: Build falha com "Credenciais inválidas"

**Solução:**
```bash
# Limpar credenciais e tentar novamente
eas credentials --clear

# Fazer login novamente
eas login
```

### Problema: App rodando mas não consegue conectar ao backend (localhost)

**Solução:**
Se está desenvolvendo localmente, o app em um dispositivo/emulador não consegue acessar `localhost`. Use:

```bash
# Encontrar IP da sua máquina
ifconfig | grep "inet "

# Atualizar URL no .env
EXPO_PUBLIC_BACKEND_URL=http://192.168.1.100:8000
```

### Problema: "Item não encontrado" ao atualizar

**Possível causa:** ID do item está errado ou foi deletado

**Solução:**
```typescript
// Sempre validar antes de atualizar
if (!itemId || itemId === '') {
  throw new Error('ID inválido');
}

// Verificar se item existe antes de atualizar
const exists = await api.get(`/items/${itemId}`);
if (!exists) {
  throw new Error('Item não existe');
}
```

---

## Recursos Adicionais

- [Documentação Expo](https://docs.expo.dev)
- [Documentação EAS Build](https://docs.expo.dev/eas-update/build-locally-with-eas/)
- [Axios Documentation](https://axios-http.com)
- [React Native Docs](https://reactnative.dev)
- [JWT Introduction](https://jwt.io/introduction)

---

## Suporte

Para dúvidas ou problemas:
1. Consulte a documentação oficial dos projetos acima
2. Verifique logs com `eas build:log <BUILD_ID>`
3. Teste a API com [Postman](https://www.postman.com) ou [curl](https://curl.se)
4. Abra uma issue no repositório
