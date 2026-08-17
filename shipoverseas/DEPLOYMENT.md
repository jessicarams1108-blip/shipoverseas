# ShipOverseas Deployment Guide

## Recommended Launch Path

Use Render for the first live test because this app includes a Node static server and Firebase-powered browser features for login, registration, shipments, password reset, email records, and support chat.

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

The app now uses Firebase project `shipoverseas-ca460` for live Auth and Firestore data when Firebase is reachable. The local `db.json` API remains as a fallback for local development and public demo data.

If you deploy without Firebase rules published correctly, new customer accounts, package updates, and chats will not save to Firestore.

## Current Production-Ready Controls

The current Node version now includes:

- Account detail updates from Profile
- Password change from Profile
- Customer notification preferences
- Firebase password reset emails
- Firestore email-update records
- Admin audit logs
- Admin JSON export from Firestore
- Admin backup audit records
- Admin rules that only allow `Hardewusi@gmail.com` to create/update packages

## Vercel Path

Vercel is excellent for the frontend, but this exact Node server should not be deployed there as-is because it writes runtime data to local files. Use Vercel after the backend is moved to Firebase/Supabase/Neon or after the API is converted to serverless routes backed by a real database.

## Firebase Path

Firebase is now wired into the frontend. Use [FIREBASE.md](./FIREBASE.md) for the exact security rules.

The active Firestore collections are:

   - `users`
   - `shipments`
   - `supportChats`
   - `emailUpdates`
   - `auditLogs`

Firebase sends real password reset emails. Shipment email updates are recorded in Firestore; connect Resend, SendGrid, Mailgun, Firebase Extensions, or Cloud Functions later if you want every shipment status update to send a real customer email automatically.
