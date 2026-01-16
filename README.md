# AI Call Demo - Retell AI Integration

Automated AI voice calling system with real-time verification, call management, and automatic spreadsheet data storage via Make.com integration.

## 📋 Table of Contents

- [Features](#features)
- [Project Flow](#project-flow)
- [Setup Guide](#setup-guide)
  - [Prerequisites](#prerequisites)
  - [Environment Setup](#environment-setup)
  - [Retell AI Setup](#retell-ai-setup)
  - [Make.com Setup](#makecom-setup)
- [Project Structure](#project-structure)
- [API Endpoints](#api-endpoints)
- [How It Works](#how-it-works)

## ✨ Features

- 🤖 **Automated AI Voice Calls** via Retell AI
- ✅ **Real-time Identity Verification** (name & phone number)
- 📞 **Automatic Call Hangup** on verification failure
- 📊 **Spreadsheet Integration** via Make.com → Google Sheets
- 🎯 **Pre-screening Call Automation**
- 📝 **Structured Data Normalization** for easy spreadsheet mapping

## 🔄 Project Flow

### Complete Call Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INITIATES CALL                       │
│              POST /api/demo/trigger-call                          │
│              { name: "John Doe", phone: "+1234567890" }          │
└────────────────────────────┬──────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    demo.controller.ts                            │
│  • Validates name & phone                                        │
│  • Normalizes phone number                                       │
│  • Logs spreadsheet storage status                               │
└────────────────────────────┬──────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              demoCall.service.ts                                  │
│              triggerVerificationCall()                            │
│  • Creates Retell call via API                                   │
│  • Includes metadata (name, phone)                                │
│  • Sets dynamic variables for AI agent                          │
└────────────────────────────┬──────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    RETELL AI AGENT                               │
│  • Makes phone call to candidate                                 │
│  • Verifies name and phone number                               │
│  • Collects screening data (if applicable)                       │
│  • Sends real-time events to webhook                             │
└────────────────────────────┬──────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│         Retell Webhook Events (Real-time)                        │
│  POST /api/call/retell/ai-wbh                                     │
│  Events: transcription, status_update, function_call, etc.       │
└────────────────────────────┬──────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│         aiCallingWebhook.controller.ts                           │
│  • Receives webhook events                                       │
│  • Handles real-time verification                                │
│  • Detects verification failures                                 │
│  • Hangs up call if verification fails                          │
└────────────────────────────┬──────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              Call Completion Event                                │
│  Event: "call_ended" or call_status: "ended"                    │
└────────────────────────────┬──────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│         retellNormalizer.ts                                      │
│         normalizeRetellCallData()                                │
│  • Extracts call data                                            │
│  • Flattens nested structures                                    │
│  • Normalizes to spreadsheet format                              │
│  • Maps all fields consistently                                  │
└────────────────────────────┬──────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│         makeWebhook.service.ts                                   │
│         sendToMakeWebhook()                                      │
│  • Sends normalized data to Make.com webhook                     │
│  • Logs spreadsheet storage status                               │
└────────────────────────────┬──────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    MAKE.COM WEBHOOK                              │
│  • Receives structured payload                                   │
│  • Processes data                                                │
└────────────────────────────┬──────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              GOOGLE SHEETS                                       │
│  • Stores call data in spreadsheet                               │
│  • One row per call                                              │
│  • All fields properly mapped                                    │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow Details

**1. Call Initiation**
- User sends POST request with `name` and `phone`
- System validates and normalizes phone number
- Creates Retell call with metadata

**2. During Call (Real-time)**
- Retell sends webhook events (transcription, status updates)
- System monitors for verification failures
- Auto-hangs up if verification fails

**3. Call Completion**
- Retell sends final webhook with complete call data
- System normalizes data into flat structure
- Sends to Make.com webhook

**4. Spreadsheet Storage**
- Make.com receives normalized payload
- Maps data to Google Sheets columns
- Stores complete call record

## 🚀 Setup Guide

### Prerequisites

- Node.js 18+ and pnpm installed
- Retell AI account with API key
- Make.com account (free tier works)
- Google Sheets (for data storage)
- Public server URL (for webhooks) - use ngrok for local development

### Environment Setup

1. **Clone and Install**
```bash
cd aicall-demo-retellai
pnpm install
```

2. **Create `.env` File**
```env
# Server Configuration
PORT=3000
NODE_ENV=development
CORS_ORIGIN=*

# Retell AI Configuration
RETELL_API_KEY=your_retell_api_key_here
RETELL_AGENT_ID=your_agent_id_here
RETELL_FROM_NUMBER=+13137662804
RETELL_API_BASE_URL=https://api.retellai.com

# Make.com Configuration
MAKE_HOOK_URL=https://hook.eu2.make.com/your-webhook-id-here

# Optional: Debug webhook payloads
DEBUG_WEBHOOK=0
```

3. **Run Development Server**
```bash
pnpm dev
```

### Retell AI Setup

#### Step 1: Get API Credentials

1. Go to [Retell AI Dashboard](https://retellai.com)
2. Navigate to **Settings → API Keys**
3. Create a new API key and copy it
4. Add to `.env` as `RETELL_API_KEY`

#### Step 2: Create an Agent

1. Go to **Agents** in Retell Dashboard
2. Click **Create New Agent**
3. Configure your agent:
   - **Name**: "Verification Agent" (or your choice)
   - **Voice**: Choose a voice
   - **Language**: Set to your preferred language

#### Step 3: Configure Agent Prompt

In your agent's **Prompt** section, use dynamic variables:

```
Hello, this is an automated verification call. 

I need to verify your identity. 

First, can you please confirm your full name? I'm expecting {full_name}.

[Wait for response]

Thank you. Now, can you please confirm your phone number? I'm expecting {phone_number}.

[Wait for response]

Great! Your information has been verified. [Continue with your screening questions...]
```

**Important Dynamic Variables:**
- `{full_name}` - Expected name from call metadata
- `{phone_number}` - Expected phone from call metadata

#### Step 4: Get Agent ID

1. In your agent settings, find the **Agent ID**
2. Copy it (format: `agent_xxxxxxxxxxxxx`)
3. Add to `.env` as `RETELL_AGENT_ID`

#### Step 5: Configure Phone Number

1. Go to **Phone Numbers** in Retell Dashboard
2. Purchase or use existing phone number
3. Click on your phone number
4. Set **Outbound Agent** to your agent
5. Copy the phone number (E.164 format: `+13137662804`)
6. Add to `.env` as `RETELL_FROM_NUMBER`

#### Step 6: Configure Webhook URL

1. In your agent settings, go to **Webhooks**
2. Set **Agent Level Webhook URL** to:
   ```
   http://your-domain.com/api/call/retell/ai-wbh
   ```
   Or for local development with ngrok:
   ```
   https://your-ngrok-url.ngrok.io/api/call/retell/ai-wbh
   ```

3. **Enable these events:**
   - ✅ Call events
   - ✅ Transcription events
   - ✅ Function call events
   - ✅ Status updates

#### Step 7: Test Webhook (Optional)

Use the test endpoint to verify webhook connectivity:
```bash
curl -X POST http://localhost:3000/api/call/test/make-webhook
```

### Make.com Setup

#### Step 1: Create a Scenario

1. Go to [Make.com](https://www.make.com)
2. Click **Create a new scenario**
3. Name it: "Retell Call Data Storage"

#### Step 2: Add Webhook Module

1. Click **+** to add a module
2. Search for **"Webhooks"** → **"Custom webhook"**
3. Click **Add** → **"Create a webhook"**
4. Copy the **Webhook URL** (format: `https://hook.eu2.make.com/xxxxx`)
5. Add to `.env` as `MAKE_HOOK_URL`

#### Step 3: Add Google Sheets Module

1. Click **+** after the webhook module
2. Search for **"Google Sheets"** → **"Add a row"**
3. Connect your Google account
4. Select your spreadsheet
5. Select the worksheet (or create new one)

#### Step 4: Map Webhook Data to Sheets

Map the webhook fields to your Google Sheets columns:

**Required Column Headers (Row 1):**
```
call_id | call_status | name | phone | from_number | to_number | 
duration_seconds | call_summary | call_successful | 
primary_clinical_role | years_of_experience | licensed_in_state | 
work_type | available_shifts | open_to_multiple_locations | 
orientation_ready | reliable_transportation | research_interest | 
diagnosed_conditions | comfortable_participating | contact_consent | 
verified | timestamp
```

**Mapping in Make.com:**
- `call_id` → `{{1.call_id}}`
- `name` → `{{1.name}}`
- `phone` → `{{1.phone}}`
- `call_status` → `{{1.call_status}}`
- `duration_seconds` → `{{1.duration_seconds}}`
- `call_summary` → `{{1.call_summary}}`
- `call_successful` → `{{1.call_successful}}`
- `verified` → `{{1.verified}}`
- `timestamp` → `{{1.timestamp}}`
- ... (map all other fields)

#### Step 5: Create Google Sheet

1. Create a new Google Sheet
2. Add the column headers (Row 1) as listed above
3. Format headers (bold, freeze row)
4. Share with Make.com (if required)

#### Step 6: Activate Scenario

1. Click **Save** in Make.com
2. Toggle **"Inactive"** to **"Active"**
3. Your scenario is now live and ready to receive data

#### Step 7: Test the Integration

1. Make a test call via your API:
```bash
curl -X POST http://localhost:3000/api/demo/trigger-call \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","phone":"+1234567890"}'
```

2. Complete or end the call
3. Check Make.com scenario execution history
4. Verify data appears in Google Sheets

## 📁 Project Structure

```
aicall-demo-retellai/
├── src/
│   ├── controller/              # Request handlers
│   │   ├── demo.controller.ts   # Call initiation endpoint
│   │   └── aiCallingWebhook.controller.ts  # Retell webhook handler
│   │
│   ├── services/                # Business logic
│   │   ├── demoCall.service.ts  # Call creation & verification logic
│   │   ├── retellClient.service.ts  # Retell API client
│   │   ├── retellNormalizer.ts  # Data normalization for spreadsheets
│   │   └── makeWebhook.service.ts  # Make.com webhook sender
│   │
│   ├── routes/                  # API routes
│   │   ├── demo.route.ts        # Demo call routes
│   │   └── storeAiCallData.route.ts  # Webhook & test routes
│   │
│   ├── middlewares/             # Express middlewares
│   │   └── asyncWrapper.middleware.ts  # Async error handler
│   │
│   ├── utils/                    # Utility functions
│   │   └── apiResponse.utils.ts  # Response helpers
│   │
│   └── index.ts                  # Application entry point
│
├── public/                       # Frontend static files
│   └── index.html
│
├── .env                         # Environment variables (create this)
├── package.json                 # Dependencies
├── tsconfig.json                # TypeScript config
└── README.md                    # This file
```

## 🔌 API Endpoints

### 1. Trigger Verification Call
```http
POST /api/demo/trigger-call
Content-Type: application/json

{
  "name": "John Doe",
  "phone": "+1234567890"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Call initiated successfully. AI agent will verify name and phone number.",
  "data": {
    "callId": "call_xxxxxxxxxxxxx",
    "name": "John Doe",
    "phone": "+1234567890",
    "status": "initiated"
  }
}
```

### 2. Retell Webhook (Internal)
```http
POST /api/call/retell/ai-wbh
Content-Type: application/json
```
*This endpoint is called by Retell AI, not directly by users*

### 3. Test Make.com Webhook
```http
POST /api/call/test/make-webhook
Content-Type: application/json

{
  "call_id": "test-123",
  "call_status": "ended",
  "metadata": {
    "name": "Test User",
    "phone": "+1234567890"
  },
  "call_analysis": {
    "call_summary": "Test call",
    "call_successful": true,
    "custom_data": {
      "work_type": "Travel",
      "primary_clinical_role": "Registered Nurse"
    }
  }
}
```

### 4. Health Check
```http
GET /health
```

## 🔧 How It Works

### 1. Call Initiation Flow

1. **User Request** → `POST /api/demo/trigger-call` with name and phone
2. **Validation** → Controller validates input and phone format
3. **Call Creation** → Service creates Retell call with:
   - Agent ID
   - To/From phone numbers
   - Metadata (name, phone)
   - Dynamic variables for AI agent
4. **Response** → Returns call ID and status

### 2. Real-time Verification Flow

1. **Webhook Events** → Retell sends real-time events during call
2. **Verification Check** → System monitors transcript for:
   - Name mismatches
   - Phone number mismatches
   - Verification failure keywords
3. **Auto Hangup** → If verification fails, call is automatically hung up
4. **Data Storage** → Even hung-up calls are stored in spreadsheet

### 3. Call Completion Flow

1. **Final Webhook** → Retell sends call completion event
2. **Data Normalization** → System normalizes nested Retell data:
   - Extracts call analysis
   - Flattens custom_data fields
   - Maps to consistent spreadsheet format
3. **Make.com Send** → Normalized data sent to Make.com webhook
4. **Spreadsheet Storage** → Make.com maps data to Google Sheets

### 4. Data Normalization

The `retellNormalizer.ts` service ensures:
- ✅ All nested JSON is flattened
- ✅ Consistent field names across all calls
- ✅ Safe defaults for missing data
- ✅ Type-safe conversion (string/number/boolean)
- ✅ Ready for direct spreadsheet mapping

## 🐛 Troubleshooting

### Webhook Not Receiving Data
- Verify webhook URL is publicly accessible
- Check Retell agent webhook settings
- Use ngrok for local development: `ngrok http 3000`

### Make.com Not Receiving Data
- Verify `MAKE_HOOK_URL` in `.env`
- Check Make.com scenario is **Active**
- Review scenario execution history for errors

### Spreadsheet Not Updating
- Verify Google Sheets column headers match exactly
- Check Make.com mapping configuration
- Ensure Google account has proper permissions

### Call Verification Failing
- Check agent prompt uses `{full_name}` and `{phone_number}`
- Verify metadata is passed correctly in call creation
- Review webhook logs for verification logic

## 📝 License

MIT

## 🤝 Support

For issues or questions:
1. Check Retell AI documentation: https://docs.retellai.com
2. Check Make.com documentation: https://www.make.com/en/help
3. Review webhook logs in your server console
