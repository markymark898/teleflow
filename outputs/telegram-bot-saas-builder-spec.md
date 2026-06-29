# Telegram Bot SaaS Builder Specification

## Purpose

This document is written for an AI coding agent or software developer. The goal is to build a SaaS platform that lets customers create Telegram automation workflows, similar to email automation, but using Telegram bots and the Telegram Bot API.

The product should let a SaaS customer connect their own Telegram bot, collect opted-in Telegram users, create automated message workflows, schedule broadcasts, and send Telegram messages through a dashboard.

Official Telegram Bot API documentation:

https://core.telegram.org/bots/api

Bot creation documentation:

https://core.telegram.org/bots/features#botfather

## Critical Telegram Constraint

Telegram bots cannot freely cold-message random Telegram users by username, phone number, or scraped profile.

In normal Telegram bot usage, a user must first interact with the bot, usually by pressing Start or sending a message. Once the bot receives an update from the user, the application can store that user's `chat_id` and use it to send future automated messages.

The SaaS must be designed around opt-in messaging.

The platform should not promise cold Telegram outreach. It should promise Telegram automation for users who have interacted with, joined, subscribed to, or otherwise opted into the bot.

## Product Summary

Build a SaaS application where a business owner can:

- Create an account
- Connect a Telegram bot using a bot token from BotFather
- Verify the bot token
- Generate a bot start link
- Capture subscribers when users start or message the bot
- Store each subscriber's Telegram `chat_id`
- Create reusable message templates
- Send one-time broadcasts
- Build simple automation workflows
- Schedule messages
- Segment users
- Track delivery status
- Handle unsubscribe commands like `/stop`
- View logs, errors, and subscriber activity

## Target User

The target user is a business owner, creator, coach, agency, community owner, or SaaS operator who wants to message people on Telegram automatically.

They may not know how Telegram bots work. The product should abstract the technical details away from them.

## Recommended Tech Stack

The AI builder may choose a stack, but this is a recommended setup:

- Frontend: Next.js or React
- Backend: Node.js with Express, NestJS, or Next.js API routes
- Database: PostgreSQL
- ORM: Prisma
- Queue system: BullMQ with Redis, or a managed queue
- Cron/scheduler: BullMQ repeatable jobs, Temporal, Inngest, Trigger.dev, or a cloud cron
- Auth: Clerk, Auth.js, Supabase Auth, or custom JWT auth
- Hosting: Vercel for frontend, Render/Fly/Railway/AWS for backend workers
- Webhook endpoint: HTTPS public endpoint required
- Secrets: encrypted bot tokens in database or a dedicated secrets manager

## Core Telegram API Concepts

### Bot Token

Each Telegram bot has a private token. The SaaS customer gets this from BotFather and pastes it into the SaaS.

Example format:

```text
123456789:ABCdefExampleSecretToken
```

The SaaS must store this securely. Never expose bot tokens in frontend JavaScript.

### API Base URL

Telegram Bot API requests use this pattern:

```text
https://api.telegram.org/bot<BOT_TOKEN>/<METHOD_NAME>
```

Example:

```text
https://api.telegram.org/bot123456789:ABCdef/getMe
```

### getMe

Use `getMe` to verify that a bot token is valid.

Endpoint:

```text
GET https://api.telegram.org/bot<BOT_TOKEN>/getMe
```

Expected response:

```json
{
  "ok": true,
  "result": {
    "id": 123456789,
    "is_bot": true,
    "first_name": "Example Bot",
    "username": "example_bot"
  }
}
```

Official docs:

https://core.telegram.org/bots/api#getme

### Updates

Telegram sends updates when users interact with the bot. Updates can be received using long polling with `getUpdates` or webhooks with `setWebhook`.

For SaaS production, use webhooks.

Official docs:

https://core.telegram.org/bots/api#getting-updates

### Webhooks

Use `setWebhook` to tell Telegram where to send bot updates.

Endpoint:

```text
POST https://api.telegram.org/bot<BOT_TOKEN>/setWebhook
```

Request body:

```json
{
  "url": "https://your-saas.com/api/telegram/webhook/<botId>",
  "secret_token": "generated-secret-token"
}
```

Official docs:

https://core.telegram.org/bots/api#setwebhook

### sendMessage

Use `sendMessage` to send a text message to a user, group, or channel.

Endpoint:

```text
POST https://api.telegram.org/bot<BOT_TOKEN>/sendMessage
```

Request body:

```json
{
  "chat_id": "123456789",
  "text": "Hello from the automation."
}
```

Official docs:

https://core.telegram.org/bots/api#sendmessage

## SaaS User Flow

### 1. User Signs Up

The SaaS user creates an account.

Required fields:

- Email
- Password or OAuth login
- Workspace name

### 2. User Connects Telegram Bot

Dashboard flow:

1. Show instructions to create a bot in Telegram using BotFather.
2. Ask user to paste their bot token.
3. Backend calls Telegram `getMe`.
4. If valid, store bot details.
5. Generate webhook URL.
6. Call Telegram `setWebhook`.
7. Show bot username and start link.

Start link format:

```text
https://t.me/<bot_username>
```

Optional referral/deep-link format:

```text
https://t.me/<bot_username>?start=<tracking_code>
```

### 3. Subscriber Opts In

The subscriber opens the bot link and presses Start.

Telegram sends an update to the SaaS webhook. The SaaS should store:

- Telegram user ID
- Chat ID
- First name
- Last name
- Username
- Language code
- Source parameter from `/start`, if present
- Bot ID
- Workspace ID
- Subscription status
- Timestamp

### 4. SaaS User Creates Message Template

The dashboard should allow message templates like:

```text
Hi {{first_name}}, your appointment is tomorrow at {{appointment_time}}.
```

Support variables from subscriber fields and custom attributes.

### 5. SaaS User Sends Broadcast or Automation

The SaaS should support:

- Immediate broadcast
- Scheduled broadcast
- Trigger-based automation
- Drip sequence
- Manual test send

Messages should be queued and sent by a background worker.

## Required Features

### Authentication

Build account login and workspace ownership.

Minimum:

- Sign up
- Login
- Logout
- Password reset or OAuth provider
- Workspace/team model if needed

### Bot Management

Each workspace should be able to connect one or more Telegram bots.

Fields:

- Bot ID
- Workspace ID
- Telegram bot user ID
- Bot username
- Bot display name
- Encrypted bot token
- Webhook secret
- Webhook status
- Created date
- Updated date

Required actions:

- Add bot
- Verify token
- Register webhook
- Remove bot
- Refresh bot info
- View start link

### Subscriber Management

Store Telegram contacts who have interacted with the bot.

Fields:

- Subscriber ID
- Workspace ID
- Bot ID
- Telegram user ID
- Chat ID
- First name
- Last name
- Username
- Language code
- Status: active, unsubscribed, blocked, failed
- Tags
- Custom attributes
- Source
- Created date
- Last interaction date
- Last message sent date

Required actions:

- View subscribers
- Search subscribers
- Filter by status, tag, source, date
- Manually unsubscribe subscriber
- Export subscribers
- View subscriber activity

### Message Templates

Fields:

- Template ID
- Workspace ID
- Name
- Message body
- Parse mode: none, HTML, MarkdownV2
- Optional buttons
- Created date
- Updated date

Support:

- Variables like `{{first_name}}`
- Preview
- Test send
- Validation

### Broadcasts

A broadcast sends one message to many subscribers.

Fields:

- Broadcast ID
- Workspace ID
- Bot ID
- Name
- Message body
- Target segment
- Scheduled time
- Status: draft, scheduled, sending, complete, failed, cancelled
- Sent count
- Failed count
- Created date

Required behavior:

- Select bot
- Select audience
- Compose message
- Preview message
- Send test
- Schedule or send now
- Queue individual message jobs
- Track results

### Automations

Support simple workflows.

Minimum triggers:

- User starts bot
- User sends keyword
- Tag added
- Date/time schedule
- New subscriber

Minimum actions:

- Send message
- Wait/delay
- Add tag
- Remove tag
- Update custom field
- Notify admin

Example workflow:

```text
Trigger: New subscriber
Action: Send welcome message
Wait: 1 day
Action: Send follow-up message
Wait: 3 days
Action: Send offer message
```

### Visual Workflow Builder Setup

The SaaS should include a visual automation canvas similar to ManyChat, Chatfuel, Zapier Paths, or a node-based workflow builder.

The user should be able to build Telegram automations by placing blocks on a canvas and connecting them with lines. Each block represents one step in the conversation or automation. Each connection defines what happens next.

The workflow builder should support:

- Drag-and-drop nodes
- Zoom in/out
- Pan around the canvas
- Connect one block to another
- Branch based on button clicks
- Branch based on text replies
- Split traffic with a randomizer
- Wait for user response
- Wait for a time delay
- Start workflow from triggers
- Save drafts
- Publish workflow changes
- Validate broken or incomplete paths before publishing

The workflow in the screenshot can be described as:

```text
Multiple Telegram message blocks send different travel-themed messages.
Each message waits for a text reply from the subscriber.
Several paths merge into a Randomizer block.
The Randomizer splits subscribers into Path A or Path B at 50% each.
Path A sends one follow-up message.
Path B sends another follow-up message.
Follow-up messages include buttons like "Let's plan!" and "No, thanks!"
Each button can connect to its own next step.
```

In product language, this is a visual conversation automation builder. The user is not writing code. They are designing a Telegram messaging flow by connecting blocks.

#### Workflow Node Types

Build these node types for the MVP or early product:

```text
Trigger Node
Starts a workflow when something happens.
Examples: new subscriber, keyword received, tag added, scheduled time.

Send Message Node
Sends a Telegram message to the subscriber.
Supports text, variables, formatting, links, and inline buttons.

Wait For Reply Node
Pauses the workflow until the subscriber sends a text message.
Can optionally expire after a set amount of time.

Button Branch Node
Routes the subscriber based on which Telegram inline button they click.

Condition Node
Routes based on subscriber data.
Examples: has tag, does not have tag, custom field equals value, source equals campaign.

Randomizer Node
Splits subscribers randomly across multiple paths.
Example: A 50%, B 50%.
Useful for A/B testing messages.

Delay Node
Waits for a set time before continuing.
Examples: wait 10 minutes, wait 1 day, wait until Monday at 9 AM.

Action Node
Updates subscriber data.
Examples: add tag, remove tag, set custom field, mark lead status.

End Node
Stops the workflow for that subscriber.
```

#### Message Node Requirements

Each message node should allow the SaaS user to configure:

- Message text
- Variables like `{{first_name}}`
- Parse mode: none, HTML, or MarkdownV2
- Inline buttons
- Button labels
- Button actions
- Next step after message sends
- Optional wait for reply
- Optional fallback if no reply is received

Example message block:

```json
{
  "type": "send_message",
  "title": "Send Message #1",
  "body": "Hey {{first_name}}, want help planning your next trip?",
  "buttons": [
    {
      "label": "Let's plan!",
      "next_node_id": "node_confirmed_interest"
    },
    {
      "label": "No, thanks",
      "next_node_id": "node_not_interested"
    }
  ],
  "wait_for_reply": false,
  "next_node_id": "node_after_message"
}
```

#### Wait For Reply Behavior

A wait-for-reply step means the automation pauses until the subscriber sends a message back to the bot.

The system should:

1. Mark the subscriber's automation run as waiting.
2. Store which node is waiting for input.
3. Listen for the subscriber's next Telegram message through the webhook.
4. Save the reply text.
5. Continue to the next node.

Optional settings:

- Timeout duration
- Timeout path
- Keyword matching
- Save reply to custom field

Example:

```text
Send Message: "What kind of trip are you planning?"
Wait For Reply: Save response as custom field `trip_type`
Next Step: Send personalized follow-up
```

#### Randomizer Behavior

A randomizer node splits subscribers across multiple paths by percentage.

Example:

```json
{
  "type": "randomizer",
  "title": "A/B Test Follow-Up",
  "paths": [
    {
      "label": "A",
      "percentage": 50,
      "next_node_id": "node_message_a"
    },
    {
      "label": "B",
      "percentage": 50,
      "next_node_id": "node_message_b"
    }
  ]
}
```

The percentages must add up to 100. When a subscriber reaches the randomizer, the system should assign one path and store that assignment so the same automation run remains consistent.

#### Button Branching Behavior

Telegram inline buttons can trigger different paths. The bot receives a callback query when the user clicks a button.

The webhook should:

1. Receive the callback query.
2. Identify the subscriber and automation run.
3. Identify which button was clicked.
4. Route the subscriber to the connected next node.
5. Optionally answer the callback query to remove Telegram's loading state.

Official callback query docs:

https://core.telegram.org/bots/api#callbackquery

Official answerCallbackQuery docs:

https://core.telegram.org/bots/api#answercallbackquery

#### Workflow Data Model

Store the workflow as JSON containing nodes and edges.

Example:

```json
{
  "nodes": [
    {
      "id": "trigger_1",
      "type": "trigger",
      "position": { "x": 100, "y": 200 },
      "data": {
        "trigger_type": "new_subscriber"
      }
    },
    {
      "id": "message_1",
      "type": "send_message",
      "position": { "x": 400, "y": 200 },
      "data": {
        "body": "Welcome {{first_name}}!"
      }
    },
    {
      "id": "randomizer_1",
      "type": "randomizer",
      "position": { "x": 700, "y": 200 },
      "data": {
        "paths": [
          { "label": "A", "percentage": 50 },
          { "label": "B", "percentage": 50 }
        ]
      }
    }
  ],
  "edges": [
    {
      "id": "edge_1",
      "source": "trigger_1",
      "target": "message_1"
    },
    {
      "id": "edge_2",
      "source": "message_1",
      "target": "randomizer_1"
    }
  ]
}
```

Recommended frontend library:

```text
React Flow
https://reactflow.dev/
```

React Flow is a good fit for building a drag-and-drop node editor with handles, edges, minimap, zoom controls, and custom node components.

#### Workflow Execution Logic

The backend should execute the workflow one node at a time.

Basic execution:

```text
Trigger starts automation run
Load workflow JSON
Find first node
Execute current node
If node sends message, queue Telegram message
If node waits, pause automation run
If node branches, choose correct next node
If next node exists, continue
If no next node exists, mark run complete
```

Each automation run should track:

- Current node ID
- Subscriber ID
- Workflow ID
- Status: running, waiting, delayed, complete, failed, cancelled
- Last input
- Randomizer choices
- Started date
- Updated date

This section is important because the desired SaaS should not only send one-off broadcasts. It should let users visually build Telegram conversation flows with multiple connected message steps, reply waits, button branches, and random split testing.

### Opt-Out Handling

The bot must handle unsubscribe commands.

Recommended commands:

```text
/stop
/unsubscribe
stop
unsubscribe
```

When received:

1. Mark subscriber as unsubscribed.
2. Stop future automation messages.
3. Send confirmation.

Example:

```text
You have been unsubscribed and will no longer receive automated messages.
```

### Webhook Receiver

Create an endpoint like:

```text
POST /api/telegram/webhook/:botId
```

Responsibilities:

1. Verify the `X-Telegram-Bot-Api-Secret-Token` header.
2. Parse the Telegram update.
3. Identify the bot by `botId`.
4. Store or update subscriber.
5. Process `/start` payloads.
6. Handle commands like `/stop`.
7. Trigger automations.
8. Return HTTP 200 quickly.

Do not do long-running workflow execution inside the webhook request. Put follow-up work into a queue.

### Message Sending Worker

Create a background worker that processes queued messages.

Responsibilities:

1. Load bot token securely.
2. Render message variables.
3. Send message through Telegram `sendMessage`.
4. Respect rate limits and retry rules.
5. Store success or failure.
6. Mark blocked users inactive when Telegram returns a blocked/error response.

### Rate Limiting

Telegram enforces limits. The SaaS should send messages through a queue and avoid firing thousands of requests at once.

Implementation requirements:

- Use per-bot rate limiting.
- Use retries with backoff.
- Stop retrying permanent failures.
- Store Telegram error responses.
- Avoid duplicate messages where possible.

## Suggested Database Schema

### users

```text
id
email
name
password_hash or auth_provider_id
created_at
updated_at
```

### workspaces

```text
id
owner_user_id
name
plan
created_at
updated_at
```

### telegram_bots

```text
id
workspace_id
telegram_bot_id
username
first_name
token_encrypted
webhook_secret
webhook_url
webhook_status
created_at
updated_at
```

### subscribers

```text
id
workspace_id
bot_id
telegram_user_id
chat_id
first_name
last_name
username
language_code
status
source
tags
custom_attributes
created_at
updated_at
last_interaction_at
last_message_sent_at
```

### message_templates

```text
id
workspace_id
name
body
parse_mode
buttons_json
created_at
updated_at
```

### broadcasts

```text
id
workspace_id
bot_id
name
body
parse_mode
target_filter_json
scheduled_at
status
sent_count
failed_count
created_at
updated_at
```

### message_jobs

```text
id
workspace_id
bot_id
subscriber_id
broadcast_id
automation_run_id
body
parse_mode
status
telegram_message_id
error_code
error_message
scheduled_at
sent_at
created_at
updated_at
```

### automations

```text
id
workspace_id
bot_id
name
status
trigger_type
workflow_json
created_at
updated_at
```

### automation_runs

```text
id
automation_id
subscriber_id
status
current_step
started_at
completed_at
created_at
updated_at
```

## API Endpoints To Build

### Auth

```text
POST /api/auth/signup
POST /api/auth/login
POST /api/auth/logout
GET /api/me
```

### Telegram Bots

```text
POST /api/bots
GET /api/bots
GET /api/bots/:id
POST /api/bots/:id/verify
POST /api/bots/:id/register-webhook
DELETE /api/bots/:id
```

### Webhook

```text
POST /api/telegram/webhook/:botId
```

### Subscribers

```text
GET /api/subscribers
GET /api/subscribers/:id
PATCH /api/subscribers/:id
POST /api/subscribers/:id/unsubscribe
```

### Templates

```text
POST /api/templates
GET /api/templates
GET /api/templates/:id
PATCH /api/templates/:id
DELETE /api/templates/:id
POST /api/templates/:id/test-send
```

### Broadcasts

```text
POST /api/broadcasts
GET /api/broadcasts
GET /api/broadcasts/:id
POST /api/broadcasts/:id/send
POST /api/broadcasts/:id/schedule
POST /api/broadcasts/:id/cancel
```

### Automations

```text
POST /api/automations
GET /api/automations
GET /api/automations/:id
PATCH /api/automations/:id
DELETE /api/automations/:id
POST /api/automations/:id/enable
POST /api/automations/:id/disable
```

## Telegram Message Examples

### Plain Text Message

```json
{
  "chat_id": "123456789",
  "text": "Hello, this is your automated Telegram message."
}
```

### HTML Formatted Message

```json
{
  "chat_id": "123456789",
  "text": "<b>Hello</b>, your appointment is tomorrow.",
  "parse_mode": "HTML"
}
```

### Message With Inline Button

```json
{
  "chat_id": "123456789",
  "text": "Confirm your appointment?",
  "reply_markup": {
    "inline_keyboard": [
      [
        {
          "text": "Confirm",
          "callback_data": "confirm_appointment"
        }
      ],
      [
        {
          "text": "Open Website",
          "url": "https://example.com"
        }
      ]
    ]
  }
}
```

## Frontend Pages

### Dashboard Home

Show:

- Total subscribers
- Active subscribers
- Messages sent this month
- Failed messages
- Connected bots
- Recent activity

### Bots Page

Show:

- Connected bots
- Bot status
- Start link
- Webhook status
- Add bot button

### Subscribers Page

Show:

- Subscriber table
- Filters
- Search
- Status badges
- Tags
- Last interaction

### Templates Page

Show:

- Template list
- Create/edit template form
- Preview panel
- Test send button

### Broadcasts Page

Show:

- Broadcast list
- Create broadcast flow
- Audience selector
- Message composer
- Schedule picker
- Delivery stats

### Automations Page

Show:

- Workflow list
- Workflow builder
- Trigger selector
- Action blocks
- Enable/disable controls

### Logs Page

Show:

- Message delivery logs
- Errors
- Telegram API responses
- Retry status

## MVP Scope

Build these first:

1. User auth
2. Workspace model
3. Connect Telegram bot with token
4. Verify token with `getMe`
5. Register webhook with `setWebhook`
6. Receive `/start` updates
7. Save subscribers and `chat_id`
8. Send manual test message
9. Create broadcast
10. Queue and send broadcast messages
11. Handle `/stop`
12. Show delivery logs

Do not build advanced workflow automation until the MVP works reliably.

## Security Requirements

- Encrypt bot tokens at rest.
- Never expose bot tokens to the frontend.
- Verify webhook secret token header.
- Use HTTPS for all webhook URLs.
- Validate all incoming data.
- Rate limit dashboard API endpoints.
- Require workspace authorization on every resource.
- Log sensitive errors internally, but do not expose secrets in UI.
- Allow users to delete a bot and remove stored token.

## Compliance and Abuse Prevention

The product should discourage spam and cold outreach.

Required safeguards:

- Require opt-in subscribers.
- Include unsubscribe handling.
- Stop messaging users who block the bot.
- Add sending limits by plan.
- Monitor high failure rates.
- Prevent importing random Telegram usernames as message targets.
- Make clear that Telegram `chat_id` is required.

Suggested dashboard copy:

```text
Telegram bots can only message users who have interacted with the bot or joined an allowed chat. Use this platform for opted-in Telegram automation, not cold outreach.
```

## Error Handling

Handle these scenarios:

- Invalid bot token
- Webhook registration failed
- User blocked bot
- Chat not found
- Rate limit error
- Telegram API unavailable
- Message text too long
- Invalid parse mode formatting
- Subscriber unsubscribed
- Bot removed or token revoked

Every message attempt should produce a log entry.

## Testing Checklist

The AI builder should test:

- Bot token verification works.
- Webhook registration works.
- `/start` creates subscriber.
- Repeated `/start` updates existing subscriber instead of duplicating.
- `/stop` unsubscribes subscriber.
- Manual test message sends.
- Broadcast queues message jobs.
- Worker sends queued jobs.
- Failed Telegram API responses are stored.
- Unsubscribed users do not receive broadcasts.
- Bot tokens are not visible in frontend responses.
- Webhook secret verification blocks invalid requests.

## Example Implementation Logic

### Connect Bot

```text
User submits bot token
Backend calls getMe
If Telegram response ok=true:
  Encrypt token
  Save bot username and Telegram bot ID
  Generate webhook secret
  Call setWebhook
  Save webhook status
Else:
  Return validation error
```

### Receive Webhook

```text
Receive POST /api/telegram/webhook/:botId
Verify X-Telegram-Bot-Api-Secret-Token
Load bot from database
Parse update.message
If message contains user/chat:
  Upsert subscriber by bot_id + telegram_user_id
If text is /start:
  Mark active
  Send welcome message
If text is /stop or unsubscribe:
  Mark unsubscribed
  Send unsubscribe confirmation
If keyword matches automation trigger:
  Start automation
Return 200
```

### Send Broadcast

```text
User creates broadcast
User selects audience
System creates one message job per active subscriber
Worker processes jobs gradually
Worker calls sendMessage
Store success/failure
Update broadcast counts
```

## Environment Variables

Recommended:

```text
DATABASE_URL=
REDIS_URL=
APP_URL=
ENCRYPTION_KEY=
JWT_SECRET=
TELEGRAM_WEBHOOK_BASE_URL=
```

Do not use one global Telegram bot token if the SaaS is meant to let each customer connect their own bot.

## Product Positioning

Describe the SaaS as:

```text
A Telegram automation platform for sending messages, reminders, broadcasts, and drip workflows to opted-in Telegram subscribers.
```

Avoid describing it as:

```text
A cold Telegram DM sender.
```

## Final Instruction For The AI Builder

Build the SaaS as a production-ready, opt-in Telegram automation platform. Use the official Telegram Bot API. Start with the MVP: connect bot, capture subscribers, send test messages, send broadcasts, handle unsubscribe, and log delivery. Use webhooks and a queue-based sender. Keep bot tokens secure. Do not build or encourage cold messaging to users who have not opted in.
