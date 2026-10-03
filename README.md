# Riya Saxena website

The website is split into two independent applications:

- `frontend/` contains the Vite-powered gallery website and the dedicated registration page.
- `backend/` contains the Express registration API and Resend email delivery.

## Deploy the frontend to Vercel

Set the Vercel project **Root Directory** to `frontend`. Vercel will use
`frontend/index.html` as the source entry point, run `npm run build`, and serve
the generated `dist/` directory. The `dist/` directory is intentionally
ignored in Git because it is generated during deployment.

## Run locally

1. In `backend/`, copy `.env.example` to `.env` and set `RESEND_API_KEY`, `OWNER_EMAIL`, and `MAIL_FROM`. Verify the sender domain in Resend before sending production email.
2. Install and run the API:
   `cd backend && npm install && npm run dev`
3. In a second terminal, install and run the frontend:
   `cd frontend && npm install && npm run dev`

The landing page shows the themed registration invitation after three seconds. Its
`Get first access` button and the `Collect` navigation link open the dedicated
`/collect` page. A successful submission sends one email to `OWNER_EMAIL` and a
confirmation email to the registrant. Both emails use `MAIL_FROM` as the sender;
the registrant email comes from the submitted form and the owner email comes from
`OWNER_EMAIL`.

To share the registration form directly, use the deployed frontend's `/collect`
route, for example `https://www.riyasaxena.com/collect`.
