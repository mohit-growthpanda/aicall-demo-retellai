AI calling system with automatic verification and call management using Retell AI.

## Features

- 🤖 Automated AI voice calls via Retell AI
- ✅ Real-time identity verification (name & phone)
- 📞 Automatic call hangup on verification failure
- 📊 Webhook integration for call events
- 🎯 Pre-screening call automation

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Environment Variables

Create a `.env` file:

```env
RETELL_API_KEY=your_retell_api_key
RETELL_AGENT_ID=your_agent_id
RETELL_FROM_NUMBER=+1234567890
RETELL_API_BASE_URL=https://api.retellai.com
PORT=3000
```

### 3. Run Development Server

```bash
pnpm dev
```

### 4. Configure Retell Agent

- Set webhook URL: `http://your-domain.com/api/call/retell/ai-wbh`
- Use dynamic variables: `{full_name}` and `{phone_number}` in your agent prompt

## API Endpoints

- `POST /api/demo/call` - Trigger a verification call
- `POST /api/call/retell/ai-wbh` - Retell webhook endpoint
- `GET /health` - Health check

## How It Works

1. **Call Creation**: Creates call with name/phone verification
2. **Real-time Monitoring**: Webhook receives call events
3. **Verification**: Compares candidate responses with expected values
4. **Auto Hangup**: Hangs up if verification fails
