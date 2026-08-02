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

/**
 * Client-side wrapper around POST /api/send-lead.
 *
 * There is deliberately no apiKey here. The actual Resend call happens on the
 * server with the server-only RESEND_API_KEY; a key in this config would have
 * to be NEXT_PUBLIC_* and would therefore be published in the client bundle.
 */
export interface ResendConfig {
  fromEmail: string;
  toEmail: string;
}

export class ResendService {
  private config: ResendConfig;

  constructor(config: ResendConfig) {
    this.config = config;
  }

  async sendLeadNotification(leadData: LeadData): Promise<void> {
    try {
      const response = await fetch('/api/send-lead', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leadData: leadData
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('API Error:', result);
        throw new Error(result.error || 'Failed to send lead notification');
      }

    } catch (error) {
      console.error('Error sending lead notification email:', error);
      throw error;
    }
  }

  async sendWelcomeEmail(leadData: LeadData): Promise<void> {
    // This is now handled by the API endpoint along with the lead notification
    // The /api/send-lead endpoint sends both emails
  }
}

