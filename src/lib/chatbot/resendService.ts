export interface LeadData {
  name: string;
  email: string;
  company?: string;
  projectType: 'website' | 'chatbot' | 'consulting' | 'fullstack' | 'other';
  budget: 'starter' | 'professional' | 'enterprise' | 'custom';
  timeline: 'asap' | '1-3months' | '3-6months' | 'flexible';
  description: string;
  phone?: string;
}

export interface ResendConfig {
  apiKey: string;
  fromEmail: string;
  toEmail: string;
}

export class ResendService {
  private config: ResendConfig;

  constructor(config: ResendConfig) {
    this.config = config;
    
    if (!this.config.apiKey || this.config.apiKey.trim() === '') {
      console.warn('⚠️ Resend API key not configured. Lead generation will not work until NEXT_PUBLIC_RESEND_API_KEY is set.');
    }
  }

  async sendLeadNotification(leadData: LeadData): Promise<void> {
    if (!this.config.apiKey || this.config.apiKey.trim() === '') {
      throw new Error('Resend API key is not configured. Please add NEXT_PUBLIC_RESEND_API_KEY to your environment variables.');
    }

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: leadData.name,
          email: leadData.email,
          message: `Project Type: ${leadData.projectType}\nBudget: ${leadData.budget}\nTimeline: ${leadData.timeline}\n${leadData.company ? `Company: ${leadData.company}\n` : ''}${leadData.phone ? `Phone: ${leadData.phone}\n` : ''}\n\nDescription:\n${leadData.description}`,
          source: 'chatbot'
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('API Error:', result);
        throw new Error(result.error || 'Failed to send lead notification');
      }

      console.log('✅ Lead notification email sent successfully:', result);
    } catch (error) {
      console.error('Error sending lead notification email:', error);
      throw error;
    }
  }

  async sendWelcomeEmail(): Promise<void> {
    console.log('✅ Welcome email will be sent via API endpoint');
  }
}

