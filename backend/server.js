import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { Resend } from 'resend';

const app = express();
const port = Number(process.env.PORT || 3000);
const allowedOrigins = (
  process.env.FRONTEND_ORIGIN
    ? process.env.FRONTEND_ORIGIN.split(',')
    : [
      'http://localhost:5173',
      'http://localhost:5174',
      'https://website-black-nine-73.vercel.app',
      'https://www.riyasaxena.com',
    ]
).map((origin) => origin.trim()).filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    callback(null, !origin || allowedOrigins.includes(origin));
  },
}));
app.use(express.json({ limit: '10kb' }));

app.use((error, _request, response, next) => {
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return response.status(400).json({ message: 'Request body must be valid JSON.' });
  }
  return next(error);
});

const requiredFields = ['name', 'email', 'location'];
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const airtableFields = {
  name: 'Name',
  email: 'Email',
  location: 'Location',
};

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]
  ));
}

function createResendClient() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('Email service is not configured. Add RESEND_API_KEY to backend/.env.');
  }
  return new Resend(process.env.RESEND_API_KEY);
}

async function saveRegistrationToAirtable(values) {
  const endpoint = `https://api.airtable.com/v0/${encodeURIComponent(process.env.AIRTABLE_BASE_ID)}/${encodeURIComponent(process.env.AIRTABLE_TABLE_NAME)}`;
  const airtableResponse = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + process.env.AIRTABLE_TOKEN,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      records: [{
        fields: {
          [airtableFields.name]: values.name,
          [airtableFields.email]: values.email,
          [airtableFields.location]: values.location,
        },
      }],
    }),
  });

  if (!airtableResponse.ok) {
    const details = (await airtableResponse.text()).slice(0, 500);
    throw new Error(`Airtable registration save failed (${airtableResponse.status}): ${details}`);
  }
}

app.get('/api/health', (_request, response) => response.json({ status: 'ok' }));

app.post('/api/registrations', async (request, response) => {
  const values = Object.fromEntries(
    requiredFields.map((field) => [field, String(request.body?.[field] || '').trim()]),
  );
  const missingField = requiredFields.find((field) => !values[field]);
  if (missingField) {
    return response.status(400).json({ message: `Please provide your ${missingField}.` });
  }
  if (!emailPattern.test(values.email)) {
    return response.status(400).json({ message: 'Please provide a valid email address.' });
  }
  if (
    !process.env.OWNER_EMAIL ||
    !process.env.MAIL_FROM ||
    !process.env.RESEND_API_KEY ||
    !process.env.AIRTABLE_TOKEN ||
    !process.env.AIRTABLE_BASE_ID ||
    !process.env.AIRTABLE_TABLE_NAME
  ) {
    return response.status(503).json({ message: 'Registration service is unavailable.' });
  }

  try {
    const resend = createResendClient();
    const firstName = values.name.split(/\s+/)[0];
    const htmlFirstName = escapeHtml(firstName);
    const ownerEmailPromise = resend.emails.send({
      from: process.env.MAIL_FROM,
      to: process.env.OWNER_EMAIL,
      reply_to: values.email,
      subject: `New private list registration — ${values.name}`,
      text: `New registration\n\nName: ${values.name}\nEmail: ${values.email}\nLocation: ${values.location}`,
    });

    const confirmationEmailPromise = resend.emails.send({
      from: process.env.MAIL_FROM,
      to: values.email,
      subject: 'You’re on the list for the Bangkok Edition',
      text: `Hi ${firstName},

You’re on the list for the Bangkok Edition.

Created as part of What Will She Inherit? during Bangkok Climate Action Week, this limited-edition print will capture a piece of Bangkok — and a moment in the evolving story of this work.

As someone who has registered early, you’ll be among the first to see the finished artwork and get access to the edition when it is released.

I’ll share more with you soon.

Until then, thank you for being part of What Will She Inherit? — and for following this journey from its early chapters.

Warmly,
Riya Saxena
Artist, What Will She Inherit?`,
      html: `<p>Hi ${htmlFirstName},</p>
<p>You’re on the list for the <strong>Bangkok Edition</strong>.</p>
<p>Created as part of <em>What Will She Inherit?</em> during Bangkok Climate Action Week, this limited-edition print will capture a piece of Bangkok — and a moment in the evolving story of this work.</p>
<p>As someone who has registered early, you’ll be among the <strong>first to see the finished artwork and get access to the edition when it is released</strong>.</p>
<p>I’ll share more with you soon.</p>
<p>Until then, thank you for being part of <em>What Will She Inherit?</em> — and for following this journey from its early chapters.</p>
<p>Warmly,<br><strong>Riya Saxena</strong><br>Artist, <em>What Will She Inherit?</em></p>`,
    });
    const [, ownerEmail, confirmationEmail] = await Promise.all([
      saveRegistrationToAirtable(values),
      ownerEmailPromise,
      confirmationEmailPromise,
    ]);
    if (ownerEmail.error) {
      throw new Error(`Owner notification failed: ${ownerEmail.error.message}`);
    }
    if (confirmationEmail.error) {
      throw new Error(`Registrant confirmation failed: ${confirmationEmail.error.message}`);
    }

    return response.status(201).json({ message: 'Registration received.' });
  } catch (error) {
    console.error('Registration persistence or email delivery failed:', error);
    return response.status(502).json({ message: 'We could not send your registration. Please try again.' });
  }
});

app.use((_request, response) => response.status(404).json({ message: 'Route not found.' }));

app.listen(port, () => {
  console.log(`Registration API listening on http://localhost:${port}`);
});
