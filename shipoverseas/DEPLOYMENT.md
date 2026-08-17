# ShipOverseas Deployment Guide

## Recommended Launch Path

Use Render for the first live test because this app is currently a Node server with API routes for login, registration, shipments, password reset, email records, and support chat.

The included `render.yaml` is set up for:

- Build command: `npm install`
- Start command: `npm run shipoverseas:start`
- Public host binding: `HOST=0.0.0.0`
- Persistent data path: `SHIPOVERSEAS_DATA_DIR=/var/data/shipoverseas`
- Persistent disk mount: `/var/data`

Optional production email variables:

- `RESEND_API_KEY`: enables real email delivery through Resend
- `EMAIL_FROM`: verified sender, for example `ShipOverseas <updates@yourdomain.com>`

## Render Steps

1. Push this project to a GitHub repository.
2. In Render, choose **New > Blueprint** and connect the GitHub repo.
3. Select the `render.yaml` blueprint.
4. Deploy the service.
5. Open the live Render URL and test:
   - Customer registration
   - Customer login
   - Password reset
   - Tracking search
   - Support chat
   - Admin login with `Hardewusi@gmail.com`
   - Admin package create/update
   - Admin audit log
   - Admin backup/export buttons

## Important Data Note

The prototype stores data in `db.json`. For a real public business app, move this to Firebase Firestore, Supabase Postgres, Neon Postgres, or another managed database.

If you deploy without a persistent disk or cloud database, new user accounts and package updates can disappear after a redeploy or restart.

## Best Production Upgrade

After the first live test, replace the JSON database with:

- Firebase Authentication for user accounts and password reset emails
- Firestore for shipments, email-update records, and support chat
- A real email provider such as Resend, SendGrid, Mailgun, or Firebase extensions
- Environment variables for secrets and provider keys
- Admin rules that only allow `Hardewusi@gmail.com` to create/update packages

## Current Production-Ready Controls

The current Node version now includes:

- Account detail updates from Profile
- Password change from Profile
- Customer notification preferences
- Email-provider-ready message records
- Admin audit logs
- Admin JSON export
- Admin persistent-disk backup creation

## Vercel Path

Vercel is excellent for the frontend, but this exact Node server should not be deployed there as-is because it writes runtime data to local files. Use Vercel after the backend is moved to Firebase/Supabase/Neon or after the API is converted to serverless routes backed by a real database.

## Firebase Path

Firebase is the best fit once you want real customer accounts:

1. Create a Firebase project.
2. Enable Email/Password Authentication.
3. Create Firestore collections:
   - `users`
   - `shipments`
   - `emails`
   - `supportConversations`
4. Add security rules:
   - Customers can read only their own shipments, emails, and support chats.
   - Admin email `hardewusi@gmail.com` can create and update shipments.
5. Connect email delivery for status updates and password resets.
