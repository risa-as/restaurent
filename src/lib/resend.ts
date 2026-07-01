import { Resend } from 'resend';

// Only required in production or when explicitly testing emails
const getResendClient = () => {
    if (process.env.RESEND_API_KEY) {
        return new Resend(process.env.RESEND_API_KEY);
    }

    // Provide a mocked fallback for dev environment to avoid constant errors
    if (process.env.NODE_ENV === 'development') {
        console.warn('RESEND_API_KEY is not set. Emails will be logged instead of sent.');
        return {
            emails: {
                send: async (options: any) => {
                    console.log('Mock email sent:', options);
                    return { data: { id: 'mock-id' }, error: null };
                }
            }
        } as unknown as Resend;
    }

    return null; // Return null so we can check it gracefully in environments without the key
};

export const resend = getResendClient();

// Helper to reliably get the from address
export const getEmailFrom = () => process.env.EMAIL_FROM || 'onboarding@resend.dev';
