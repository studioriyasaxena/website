# Riya Saxena website

The website is split into two independent applications:

- `frontend/` contains the Vite-powered gallery website and the registration popup.
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

The frontend opens the invitation popup on page load. Closing it leaves the `Register` button in the navbar available to reopen the full form. A successful submission sends one email to `OWNER_EMAIL` and a confirmation email to the registrant. Both emails use `MAIL_FROM` as the sender; the registrant email comes from the submitted form and the owner email comes from `OWNER_EMAIL`.

To share the registration form directly, append `#register` to the deployed
frontend URL, for example `https://www.riyasaxena.com/#register`. This opens
the form immediately and skips the invitation popup.
