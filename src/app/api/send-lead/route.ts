import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

interface LeadData {
  name: string;
  email: string;
  company?: string;
  projectType: 'website' | 'chatbot' | 'consulting' | 'fullstack' | 'other';
  budget: 'starter' | 'professional' | 'enterprise' | 'custom';
  timeline: 'asap' | '1-3months' | '3-6months' | 'flexible';
  description: string;
  phone?: string;
}

export async function POST(request: NextRequest) {
  console.log('📧 Lead submission API called');

  try {
    // Check if Resend API key is configured
    if (!process.env.RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY not configured');
      return NextResponse.json(
        { error: 'Email service not configured. Please add RESEND_API_KEY to environment variables.' },
        { status: 503 }
      );
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const { leadData } = await request.json() as { leadData: LeadData };

    // Validate required fields
    if (!leadData || !leadData.name || !leadData.email || !leadData.description) {
      return NextResponse.json(
        { error: 'Missing required fields: name, email, and description are required' },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(leadData.email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Determine lead priority
    const getLeadPriority = (data: LeadData): 'HIGH' | 'MEDIUM' | 'STANDARD' => {
      if (data.budget === 'enterprise' && data.timeline === 'asap') return 'HIGH';
      if (data.budget === 'professional' && (data.timeline === 'asap' || data.timeline === '1-3months')) return 'MEDIUM';
      return 'STANDARD';
    };

    const priority = getLeadPriority(leadData);

    // HTML generation functions
    const generateLeadNotificationHtml = (data: LeadData, pri: string) => {
      const priorityColors = { 'HIGH': '#dc3545', 'MEDIUM': '#ffc107', 'STANDARD': '#28a745' };
      const priorityBgColors = { 'HIGH': '#fff5f5', 'MEDIUM': '#fffbf0', 'STANDARD': '#f8fff8' };

      return `
        <!DOCTYPE html>
        <html>
        <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 32px 24px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">🎯 New ${pri} Lead!</h1>
              <p style="margin: 8px 0 0 0; color: #e2e8f0; font-size: 16px;">${data.projectType.charAt(0).toUpperCase() + data.projectType.slice(1)} Project Inquiry</p>
            </div>
            <div style="padding: 20px 24px; text-align: center; background-color: ${priorityBgColors[pri as keyof typeof priorityBgColors]}; border-bottom: 1px solid #e2e8f0;">
              <span style="display: inline-block; padding: 8px 16px; background-color: ${priorityColors[pri as keyof typeof priorityColors]}; color: #ffffff; border-radius: 20px; font-weight: 600; font-size: 14px;">${pri} Priority</span>
            </div>
            <div style="padding: 24px;">
              <h2 style="margin: 0 0 20px 0; color: #1a202c; font-size: 20px; font-weight: 600;">📋 Lead Information</h2>
              <div style="display: grid; gap: 16px;">
                <div style="padding: 12px; background-color: #f7fafc; border-radius: 8px; border-left: 4px solid #667eea;">
                  <strong>👤 Name:</strong> ${data.name}
                </div>
                <div style="padding: 12px; background-color: #f7fafc; border-radius: 8px; border-left: 4px solid #48bb78;">
                  <strong>📧 Email:</strong> <a href="mailto:${data.email}">${data.email}</a>
                </div>
                ${data.phone ? `<div style="padding: 12px; background-color: #f7fafc; border-radius: 8px; border-left: 4px solid #ed8936;"><strong>📱 Phone:</strong> ${data.phone}</div>` : ''}
                ${data.company ? `<div style="padding: 12px; background-color: #f7fafc; border-radius: 8px; border-left: 4px solid #9f7aea;"><strong>🏢 Company:</strong> ${data.company}</div>` : ''}
              </div>
            </div>
            <div style="padding: 24px; border-top: 1px solid #e2e8f0;">
              <h2 style="margin: 0 0 20px 0; color: #1a202c; font-size: 20px; font-weight: 600;">🚀 Project Details</h2>
              <div style="display: grid; gap: 12px;">
                <div style="padding: 12px 16px; background-color: #f7fafc; border-radius: 8px;"><strong>Project Type:</strong> ${data.projectType}</div>
                <div style="padding: 12px 16px; background-color: #f7fafc; border-radius: 8px;"><strong>Budget:</strong> ${data.budget}</div>
                <div style="padding: 12px 16px; background-color: #f7fafc; border-radius: 8px;"><strong>Timeline:</strong> ${data.timeline}</div>
              </div>
            </div>
            <div style="padding: 24px;">
              <h2 style="margin: 0 0 16px 0; color: #1a202c; font-size: 20px; font-weight: 600;">💬 Project Description</h2>
              <div style="padding: 16px; background-color: #f7fafc; border-radius: 8px; border-left: 4px solid #667eea;">
                <p style="margin: 0; color: #4a5568; line-height: 1.6; white-space: pre-wrap;">${data.description}</p>
              </div>
            </div>
            <div style="padding: 20px 24px; background-color: #f7fafc; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; color: #718096; font-size: 14px;">🤖 Sent by your portfolio chatbot</p>
              <p style="margin: 8px 0 0 0; color: #a0aec0; font-size: 12px;">Lead generated on ${new Date().toLocaleString()}</p>
            </div>
          </div>
        </body>
        </html>
      `;
    };

    const generateWelcomeEmailHtml = (data: LeadData) => {
      return `
        <!DOCTYPE html>
        <html>
        <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 32px 24px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">👋 Hello ${data.name}!</h1>
              <p style="margin: 8px 0 0 0; color: #e2e8f0; font-size: 16px;">Thank you for reaching out</p>
            </div>
            <div style="padding: 32px 24px;">
              <div style="background-color: #f7fafc; padding: 24px; border-radius: 12px; border-left: 4px solid #667eea; margin-bottom: 24px;">
                <h2 style="margin: 0 0 16px 0; color: #1a202c; font-size: 20px; font-weight: 600;">✅ Your ${data.projectType.charAt(0).toUpperCase() + data.projectType.slice(1)} Project Inquiry</h2>
                <p style="margin: 0; color: #4a5568; line-height: 1.6;">Thank you for your inquiry. I've received your message and will carefully review your project needs. I'll be in touch shortly with more details on how we can move forward.</p>
              </div>
              <div style="background-color: #f7fafc; padding: 20px; border-radius: 8px; text-align: center;">
                <p style="margin: 0; color: #4a5568; font-size: 16px; line-height: 1.6;">
                  <strong>Best regards,</strong><br/>
                  <span style="color: #667eea; font-weight: 600; font-size: 18px;">Luis Santos</span><br/>
                  <span style="color: #718096; font-size: 14px;">Senior IBM ODM Specialist & Full-Stack Developer</span>
                </p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;
    };

    const fromEmail = 'onboarding@resend.dev';
    const toEmail = process.env.TO_EMAIL || 'antonioluis.santos1@gmail.com';

    // Send both emails
    const [leadNotificationResult, welcomeEmailResult] = await Promise.all([
      resend.emails.send({
        from: `Luis.dev <${fromEmail}>`,
        to: [toEmail],
        subject: `📋 ${priority} Priority Lead: ${leadData.name} wants ${leadData.projectType} services`,
        html: generateLeadNotificationHtml(leadData, priority),
      }),
      resend.emails.send({
        from: `Luis.dev <${fromEmail}>`,
        to: [leadData.email],
        subject: `👋 Thanks for your inquiry, ${leadData.name}!`,
        html: generateWelcomeEmailHtml(leadData),
      })
    ]);

    if (leadNotificationResult.error || welcomeEmailResult.error) {
      throw new Error('Failed to send emails');
    }

    console.log('✅ Lead notification email sent:', leadNotificationResult.data?.id);
    console.log('✅ Welcome email sent:', welcomeEmailResult.data?.id);

    return NextResponse.json({
      success: true,
      message: 'Lead submitted successfully',
      leadNotificationId: leadNotificationResult.data?.id,
      welcomeEmailId: welcomeEmailResult.data?.id
    });

  } catch (error) {
    console.error('❌ Lead submission error:', error);
    return NextResponse.json(
      { error: 'Failed to submit lead', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

