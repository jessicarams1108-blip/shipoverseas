# ShipOverseas Firebase Setup

ShipOverseas uses Firebase Auth for login, registration, and password reset. Firestore stores live app records in these collections:

- `users`
- `shipments`
- `supportChats`
- `emailUpdates`
- `auditLogs`

## Required Firebase Auth Settings

Enable **Authentication > Sign-in method > Email/Password**.

Create the admin user in **Authentication > Users**:

```txt
Hardewusi@gmail.com
```

Only this email can create, update, advance, notify, export, and audit packages.

In **Authentication > Settings > Authorized domains**, add:

```txt
shipoversea.site
www.shipoversea.site
127.0.0.1
```

For local phone testing, add the laptop LAN IP shown by `ipconfig`.

## Firestore Rules

These rules are stored in the repo at `firestore.rules` and can be deployed with:

```powershell
npx firebase-tools deploy --only firestore:rules
```

You can also paste the same rules in **Firestore Database > Rules** and click **Publish**.

```js
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() {
      return request.auth != null;
    }

    function isAdmin() {
      return signedIn()
        && request.auth.token.email in [
          "Hardewusi@gmail.com",
          "hardewusi@gmail.com"
        ];
    }

    match /users/{userId} {
      allow create: if signedIn() && request.auth.uid == userId;
      allow read, update: if isAdmin() || (signedIn() && request.auth.uid == userId);
      allow delete: if isAdmin();
    }

    match /shipments/{shipmentId} {
      allow read: if isAdmin()
        || (signedIn() && resource.data.receiverEmail == request.auth.token.email);
      allow create, update, delete: if isAdmin();
    }

    match /supportChats/{chatId} {
      allow create: if signedIn()
        && request.resource.data.customerUid == request.auth.uid;
      allow read, update: if isAdmin()
        || (signedIn() && resource.data.customerUid == request.auth.uid);
      allow delete: if isAdmin();
    }

    match /emailUpdates/{emailId} {
      allow read: if isAdmin()
        || (signedIn() && resource.data.to == request.auth.token.email);
      allow create, update, delete: if isAdmin();
    }

    match /auditLogs/{logId} {
      allow read, write: if isAdmin();
    }
  }
}
```

## First Admin Login

After these rules are published, log in as `Hardewusi@gmail.com`. If Firestore has no shipments yet, the app will seed a few demo shipments so the dashboard is not empty.

Customer accounts created from the app can log in, reset password through Firebase email, view assigned shipments, open support chats, and see their email-update records.
