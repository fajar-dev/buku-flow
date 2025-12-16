# Buku Flow


## 📦 Installation

### Prerequisites

- [Bun](https://bun.sh) v1.0 or higher
- MySQL Server
- WhatsApp Business API access

### Installation Steps

1. Clone repository:
```bash
git clone <repository-url>
cd buku-flow
```

2. Install dependencies:
```bash
bun install
```

3. Setup environment variables:
```bash
cp .env.dist .env
```

4. Edit the `.env` file with your configuration:
```env
PORT=3000

# SIMAS Database (Employee & Asset Data)
SIMAS_DB_HOST=localhost
SIMAS_DB_PORT=3306
SIMAS_DB_USER=root
SIMAS_DB_PASSWORD=your_password
SIMAS_DB_NAME=simas_db

# Flow Database (Flow Management)
FLOW_DB_HOST=localhost
FLOW_DB_PORT=3306
FLOW_DB_USER=root
FLOW_DB_PASSWORD=your_password
FLOW_DB_NAME=flow_db

# WhatsApp Business API
WHATSAPP_API_KEY=your_api_key
WHATSAPP_API_URL=https://graph.facebook.com
WHATSAPP_API_VERSION=v18.0
WHATSAPP_API_PHONE_ID=your_phone_id

# Security
NUSANET_APP_SECRET=your_app_secret
NUSAFIBER_APP_SECRET=your_app_secret
PASSPHRASE=your_passphrase
PRIVATE_KEY=your_private_key
```

5. Generate private key (if not already exists):
```bash
bun run src/keyGenerator.ts <passphrase>
```

## 🔐 Generate Key Pair

To generate a new RSA key pair for WhatsApp Flow encryption:

1. Run the key generator:
```bash
bun run src/keyGenerator.ts  <passphrase>
```

2. The script will output:
   - **PASSPHRASE**: Copy this value to your `.env` file
   - **PRIVATE_KEY**: Copy the entire key (including `-----BEGIN RSA PRIVATE KEY-----` and `-----END RSA PRIVATE KEY-----`) to your `.env` file
   - **PUBLIC_KEY**: Upload this key to your WhatsApp Business Manager

3. Update your `.env` file with the generated values:
```env
PASSPHRASE="your_generated_passphrase"
PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
...your_private_key_content...
-----END RSA PRIVATE KEY-----"
```

4. Upload the **PUBLIC KEY** to WhatsApp Business Manager:
   - Go to WhatsApp Business Manager → Settings → WhatsApp Flows
   - Select your flow → Settings → Encryption
   - Paste the public key and save

### Upload Public Key via API

You can also upload the public key using the WhatsApp Business API:

```bash
curl -X POST \
  'https://graph.facebook.com/v24.0/PHONE_NUMBER_ID/whatsapp_business_encryption' \
  -H 'Authorization: Bearer ACCESS_TOKEN' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode 'business_public_key=-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
...your_public_key_content...
-----END PUBLIC KEY-----'
```

Replace:
- `PHONE_NUMBER_ID`: Your WhatsApp Business phone number ID
- `ACCESS_TOKEN`: Your WhatsApp Business API access token


## 🚀 Running the Application

### Development Mode
```bash
bun run dev
```

### Build
```bash
bun run build
```

### Running Reminder Cron Job
```bash
bun run reminder
```

## 📁 Project Structure

```
buku-flow/
├── src/
│   ├── config/
│   │   ├── config.ts          # Environment configuration
│   │   ├── flow.db.ts         # Flow database connection
│   │   └── simas.db.ts        # SIMAS database connection
│   ├── flow/
│   │   ├── assigned.flow.ts   # Assignment flow logic
│   │   └── returned.flow.ts   # Return flow logic
│   ├── service/
│   │   ├── reminder.service.ts    # Reminder service
│   │   ├── simas.service.ts       # SIMAS data service
│   │   └── whatsapp.service.ts    # WhatsApp API service
│   ├── encryption.ts          # Encryption/decryption utility
│   ├── keyGenerator.ts        # Private key generator
│   ├── main.ts               # Application entry point
│   └── reminder.cron.ts      # Reminder cron job
├── .env.dist                 # Environment variables template
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

## 🔌 API Endpoints

### `POST /assigned`
Endpoint for WhatsApp Flow book assignment.

**Headers:**
- `x-hub-signature-256`: Signature for request validation

**Body:**
```json
{
  "encrypted_aes_key": "...",
  "encrypted_flow_data": "...",
  "initial_vector": "..."
}
```

### `POST /returned`
Endpoint for WhatsApp Flow book return.

**Headers:**
- `x-hub-signature-256`: Signature for request validation

**Body:**
```json
{
  "encrypted_aes_key": "...",
  "encrypted_flow_data": "...",
  "initial_vector": "..."
}
```
