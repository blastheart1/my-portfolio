# Vercel Contact Form Setup Guide

## ✅ **Current Setup (Basic)**

Your contact form is now configured to work with Vercel! Here's what's already set up:

- ✅ **API Route**: `/api/contact` endpoint created
- ✅ **Form Integration**: ContactSection updated to use Vercel API
- ✅ **Validation**: Server-side validation included
- ✅ **Error Handling**: Basic error handling implemented

## 🚀 **Next Steps: Add Email Functionality**

The form currently logs submissions to the console. To receive actual emails, choose one of these options:

---

## 📧 **Option 1: Resend (Recommended)**

### Setup Steps:
1. **Create Resend Account**: Go to [resend.com](https://resend.com)
2. **Get API Key**: Copy your API key from the dashboard
3. **Add Environment Variable**: Add to your `.env.local` file:
   ```
   RESEND_API_KEY=your_api_key_here
   ```
4. **Update API Route**: Replace the TODO section in `/api/contact/route.ts`:

```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// In your POST function, replace the console.log with:
await resend.emails.send({
  from: 'contact@yourdomain.com', // Use your verified domain
  to: ['your-email@example.com'],
  subject: `Contact Form: ${subject}`,
  html: `
    <h2>New Contact Form Submission</h2>
    <p><strong>Name:</strong> ${name}</p>
    <p><strong>Email:</strong> ${email}</p>
    <p><strong>Subject:</strong> ${subject}</p>
    <p><strong>Message:</strong></p>
    <p>${message}</p>
  `,
});
```

### Benefits:
- ✅ Free tier: 3,000 emails/month
- ✅ Great deliverability
- ✅ Easy setup
- ✅ Modern API

---

## 📧 **Option 2: SendGrid**

### Setup Steps:
1. **Create SendGrid Account**: Go to [sendgrid.com](https://sendgrid.com)
2. **Get API Key**: Create an API key in SendGrid dashboard
3. **Add Environment Variable**: Add to your `.env.local` file:
   ```
   SENDGRID_API_KEY=your_api_key_here
   ```
4. **Install Package**: `npm install @sendgrid/mail`
5. **Update API Route**: Add SendGrid integration

```typescript
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

// In your POST function:
await sgMail.send({
  to: 'your-email@example.com',
  from: 'your-email@example.com',
  subject: `Contact Form: ${subject}`,
  html: `
    <h2>New Contact Form Submission</h2>
    <p><strong>Name:</strong> ${name}</p>
    <p><strong>Email:</strong> ${email}</p>
    <p><strong>Subject:</strong> ${subject}</p>
    <p><strong>Message:</strong></p>
    <p>${message}</p>
  `,
});
```

### Benefits:
- ✅ Free tier: 100 emails/day
- ✅ Reliable service
- ✅ Advanced features

---

## 📧 **Option 3: Nodemailer (Custom SMTP)**

### Setup Steps:
1. **Install Package**: `npm install nodemailer`
2. **Add Environment Variables**: Add to your `.env.local` file:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   ```
3. **Update API Route**: Add Nodemailer integration

```typescript
import nodemailer from 'nodemailer';

// In your POST function:
const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT!),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

await transporter.sendMail({
  from: process.env.SMTP_USER,
  to: 'your-email@example.com',
  subject: `Contact Form: ${subject}`,
  html: `
    <h2>New Contact Form Submission</h2>
    <p><strong>Name:</strong> ${name}</p>
    <p><strong>Email:</strong> ${email}</p>
    <p><strong>Subject:</strong> ${subject}</p>
    <p><strong>Message:</strong></p>
    <p>${message}</p>
  `,
});
```

### Benefits:
- ✅ Use any SMTP provider
- ✅ Full control
- ✅ No third-party dependencies

---

## 🛡️ **Security Enhancements**

### Add Rate Limiting:
```typescript
// Add to your API route
const rateLimit = new Map();

export async function POST(request: NextRequest) {
  const ip = request.ip || 'unknown';
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 5; // 5 requests per window

  if (rateLimit.has(ip)) {
    const requests = rateLimit.get(ip);
    if (requests.length >= maxRequests && now - requests[0] < windowMs) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }
  }

  // ... rest of your code
}
```

### Add reCAPTCHA:
1. **Get reCAPTCHA Keys**: Go to [google.com/recaptcha](https://google.com/recaptcha)
2. **Add to Form**: Add reCAPTCHA widget to your form
3. **Verify in API**: Verify reCAPTCHA response in your API route

---

## 🚀 **Deployment to Vercel**

### Steps:
1. **Push to GitHub**: Commit your changes
2. **Connect to Vercel**: Link your GitHub repo to Vercel
3. **Add Environment Variables**: Add your email service API keys in Vercel dashboard
4. **Deploy**: Vercel will automatically deploy your site

### Environment Variables in Vercel:
- Go to your project dashboard
- Settings → Environment Variables
- Add your API keys (RESEND_API_KEY, SENDGRID_API_KEY, etc.)

---

## 🎯 **Quick Start Recommendation**

For the easiest setup with Vercel, I recommend **Resend**:

1. Sign up at [resend.com](https://resend.com)
2. Get your API key
3. Add `RESEND_API_KEY` to your Vercel environment variables
4. Update the API route with Resend code
5. Deploy!

Your contact form will be fully functional and sending real emails! 🎉
