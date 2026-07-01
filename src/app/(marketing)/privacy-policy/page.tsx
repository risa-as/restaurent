import type { Metadata } from 'next';
import { LegalPage } from '@/components/shared/legal-page';

export const metadata: Metadata = {
  title: 'سياسة الخصوصية',
  description:
    'Privacy Policy describing how customer information is collected, used, stored, and protected for order fulfillment and support.',
};

const sections = [
  {
    heading: 'Information We Collect',
    body: [
      'We collect only the information necessary to provide our services effectively, including customer name, phone number, delivery address, and any order-related details submitted through our platform.',
    ],
  },
  {
    heading: 'How We Use Information',
    body: [
      'Personal information is used solely to process orders, coordinate delivery, provide customer support, confirm transactions, and improve service reliability.',
      'We do not use customer data for unauthorized profiling, unrelated marketing, or any purpose that is inconsistent with order fulfillment and support operations.',
    ],
  },
  {
    heading: 'Data Sharing',
    body: [
      'We do not sell, rent, trade, or improperly share personal information with third parties.',
      'Where operationally required, limited information may be made available only to authorized personnel or service providers directly involved in fulfilling an order or supporting the service, and only to the extent necessary for that purpose.',
    ],
  },
  {
    heading: 'Data Security',
    body: [
      'We maintain reasonable administrative and technical safeguards to protect personal information against unauthorized access, misuse, loss, or disclosure.',
      'Stored data is restricted to legitimate business use related to order processing, delivery management, and customer assistance.',
    ],
  },
  {
    heading: 'Contact',
    body: [
      'If you have any questions about this Privacy Policy or how customer information is handled, you may contact us through our official support channels.',
    ],
  },
] as const;

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Privacy Policy"
      intro="We respect your privacy and are committed to protecting personal data handled through our service. This policy explains what information we collect, why we collect it, and how we safeguard it."
      sections={[...sections]}
    />
  );
}
