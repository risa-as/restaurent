import type { Metadata } from 'next';
import { LegalPage } from '@/components/shared/legal-page';

export const metadata: Metadata = {
  title: 'شروط الخدمة',
  description:
    'Terms of Service governing availability, customer responsibilities, delivery expectations, and order acceptance conditions.',
};

const sections = [
  {
    heading: 'Acceptance of Terms',
    body: [
      'By accessing or using our service, you agree to comply with these Terms of Service and with all applicable rules governing orders placed through the platform.',
    ],
  },
  {
    heading: 'Service Terms',
    items: [
      'All orders are subject to product and service availability at the time of confirmation.',
      'Customers are responsible for providing complete and accurate information, including name, phone number, address, and any delivery instructions required for successful fulfillment.',
      'We reserve the right to refuse, suspend, or cancel any order that appears suspicious, fraudulent, abusive, or otherwise inconsistent with lawful use of the service.',
      'Delivery times are estimates and may vary depending on location, order volume, weather conditions, traffic, or other operational factors.',
      'We are not responsible for delays or failures caused by events outside our reasonable control, including third-party service interruptions or force majeure circumstances.',
    ],
  },
  {
    heading: 'Order Confirmation',
    body: [
      'An order is considered accepted only after it has been received and confirmed through our service workflow. Submission of an order does not guarantee availability or final acceptance.',
    ],
  },
  {
    heading: 'Contact',
    body: [
      'Questions regarding these Terms of Service may be directed to our official support channels for clarification or assistance.',
    ],
  },
] as const;

export default function TermsOfServicePage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Terms of Service"
      intro="These terms define the rules and conditions that apply when customers place orders or use our service. By placing an order, you acknowledge and accept the terms below."
      sections={[...sections]}
    />
  );
}
