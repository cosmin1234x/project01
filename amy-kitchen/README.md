# Amy's Kitchen & Bar website

Static site (`public/`) plus one Vercel serverless function (`api/book.js`) for table bookings.

## Deploy
Import the repo into Vercel with **Root Directory = `amy-kitchen`**. No build step is needed.

## Booking emails
Every booking is logged in the Vercel function logs (`NEW BOOKING …`).
To have bookings emailed to the cafe, add these environment variables in Vercel:

| Variable | Example |
| --- | --- |
| `RESEND_API_KEY` | key from resend.com |
| `BOOKING_EMAIL_TO` | `owner@example.com` (comma-separate for several) |
| `BOOKING_EMAIL_FROM` | `Amy's Kitchen & Bar <bookings@yourdomain>` (optional, needs a verified domain in Resend) |

## Opening hours
Edit `HOURS` in both `public/script.js` and `api/book.js`.
