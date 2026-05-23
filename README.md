# DevPulse

Internal Tech Issue & Feature Tracker
A collaborative platform for software teams to report bugs, suggest features, and coordinate resolutions.

## Live Link

This is the live link for this project:
https://dev-pulse-mocha-nine.vercel.app/

## Quick Start

```bash
npm install
npm run dev
```

## Environment

Create `.env` in the project root:

```env
CONNECTIONSTRING=postgres://USER:PASSWORD@HOST:PORT/DB_NAME
PORT=3000
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
```

## Endpoints

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/issues`
- `POST /api/issues` (auth)
- `PATCH /api/issues/:id` (auth)
- `DELETE /api/issues/:id` (auth + maintainer)
- `GET /api/admin` (auth + maintainer)

Auth uses the raw JWT in the `Authorization` header.

## Scripts

- `npm run dev` - start dev server
- `npm run build` - build with `tsup`
- `npm start` - run the compiled server
