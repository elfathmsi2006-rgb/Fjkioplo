# SPA EL FATH CMMS — Email Notifications Setup

The CMMS now uses Gmail OAuth for automated maintenance email notifications. WhatsApp Cloud API is not used by the notification worker.

## 1. Requirements

- MySQL migration `202611050001_email_notifications.sql` applied.
- Gmail API enabled in the Google Cloud project.
- A Gmail OAuth Web application client.
- An administrator account in the CMMS.
- Valid email addresses for technicians (the linked `users.email` is preferred; `technicians.email` is used as fallback).

## 2. Backend `.env`

Set these values in `spa-el-fath-backend/.env`:

```env
GMAIL_CLIENT_ID=your_google_oauth_client_id
GMAIL_CLIENT_SECRET=your_google_oauth_client_secret
GMAIL_REDIRECT_URI=http://localhost:3000/api/communications/gmail/oauth/callback
GMAIL_TOKEN_ENCRYPTION_KEY=64_hexadecimal_characters
FRONTEND_URL=http://localhost:5173
```

Generate the token-encryption key in PowerShell:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Keep the generated key stable. If it is changed after Gmail has been connected, previously encrypted refresh tokens cannot be decrypted and the administrator must reconnect Gmail.

Never put Google client secrets, refresh tokens, or encryption keys in frontend `.env` files or commit them to source control.

## 3. Google Cloud OAuth configuration

1. Open the Google Cloud project used for the existing Gmail integration.
2. Ensure the Gmail API is enabled.
3. Configure an OAuth Client ID of type **Web application**.
4. Add this exact authorized redirect URI:

   `http://localhost:3000/api/communications/gmail/oauth/callback`

5. Put the client ID and client secret in the backend `.env`.
6. If the OAuth consent screen is in Testing mode, add the institutional Gmail account as a test user.

## 4. Apply the database migration

Back up the database first, then run from the backend folder:

```powershell
npm run db:migrate
```

The new migration is additive and repeat-safe. It adds `recipient_email` to `maintenance_notifications` and creates `maintenance_notification_settings`. It does not delete existing notification history.

## 5. Connect the institutional sender

1. Start MySQL and the backend.
2. Sign in to SPA EL FATH CMMS with the administrator account.
3. Open **Settings → Email notifications**.
4. Select **Connect Gmail** and authorize the institutional Gmail account.
5. Return to Settings and select **Send test email**.
6. Confirm that the test message arrives in the connected account's inbox.

The notification worker uses the Gmail connection belonging to an active administrator (role ID 1). This is the institutional sender. Individual technicians do not need to connect Gmail.

## 6. Technician email addresses

For each technician, ensure one of the following contains a valid address:

- The linked user account's `users.email` (preferred).
- The technician record's `technicians.email` (fallback).

If neither contains a valid address, the notification is recorded as `SKIPPED`; it is not silently lost.

## 7. Automated events

The worker queues and sends:

- Machine breakdown.
- New maintenance task assignment.
- Maintenance task reassignment.
- Task due within the next 24 hours.
- Task due today.
- Overdue task.

The administrator can enable or disable each event type from Settings. A disabled event is recorded as `SKIPPED`.

## 8. Delivery history and retries

The notification history is available in Settings. Delivery statuses are:

- `PENDING`: waiting for the sender or scheduled send time.
- `PROCESSING`: currently being sent.
- `SENT`: Gmail accepted the message.
- `FAILED`: sending failed; retry may be scheduled.
- `SKIPPED`: no valid recipient or the event type is disabled.

The worker checks the queue every 30 seconds. Failed sends are retried up to five attempts, with a five-minute delay between attempts. A Gmail API success means Gmail accepted the message; it does not guarantee that the recipient's mail server placed it in the inbox.

Gmail has sending quotas and is not an unlimited bulk-mail service. Keep notifications operational and targeted.

## 9. Useful endpoints

All endpoints below require a CMMS bearer token; notification management endpoints are administrator-only.

- `GET /api/communications/gmail/status`
- `POST /api/communications/gmail/connect-url`
- `POST /api/communications/gmail/test`
- `GET /api/communications/notifications`
- `GET /api/communications/notifications/settings`
- `PUT /api/communications/notifications/settings/:type`

