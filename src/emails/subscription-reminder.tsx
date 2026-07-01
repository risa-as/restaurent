import {
    Body,
    Button,
    Container,
    Head,
    Heading,
    Html,
    Preview,
    Section,
    Text,
} from '@react-email/components';
import * as React from 'react';

interface SubscriptionReminderEmailProps {
    restaurantName: string;
    daysRemaining: number;
    dashboardUrl: string;
}

export const SubscriptionReminderEmail = ({
    restaurantName,
    daysRemaining,
    dashboardUrl,
}: SubscriptionReminderEmailProps) => (
    <Html>
        <Head />
        <Preview>تذكير: اقترب موعد تجديد اشتراك مطعمك</Preview>
        <Body style={main} dir="rtl">
            <Container style={container}>
                <Heading style={h1}>تذكير بتجديد الاشتراك</Heading>

                <Text style={text}>
                    عزيزي مدير مطعم <strong>{restaurantName}</strong>،
                </Text>

                <Text style={text}>
                    نود تذكيرك بأن اشتراك مطعمك الحالي سينتهي خلال <strong>{daysRemaining} أيام</strong>.
                </Text>

                <Section style={{ textAlign: 'center', margin: '30px 0' }}>
                    <Button
                        href={dashboardUrl}
                        style={button}
                    >
                        إدارة الاشتراك
                    </Button>
                </Section>

                <Text style={text}>
                    إذا كانت معلومات الدفع الخاصة بك محدثة، سيتم تجديد الاشتراك تلقائياً ولن تحتاج للقيام بأي إجراء.
                </Text>

                <Text style={footer}>
                    فريق دعم منصة إدارة المطاعم
                </Text>
            </Container>
        </Body>
    </Html>
);

export default SubscriptionReminderEmail;

const main = {
    backgroundColor: '#fff',
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
    backgroundColor: '#ffffff',
    margin: '0 auto',
    padding: '40px 20px',
    borderRadius: '8px',
    border: '1px solid #eee',
    maxWidth: '600px',
};

const h1 = {
    color: '#ea580c',
    fontSize: '24px',
    fontWeight: 'bold',
    margin: '0 0 20px',
    padding: '0',
    textAlign: 'center' as const,
};

const text = {
    color: '#333',
    fontSize: '16px',
    lineHeight: '24px',
    margin: '0 0 20px',
};

const button = {
    backgroundColor: '#ea580c',
    color: '#fff',
    fontSize: '16px',
    fontWeight: 'bold',
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'inline-block',
    padding: '12px 24px',
    borderRadius: '4px',
};

const footer = {
    color: '#8898aa',
    fontSize: '14px',
    marginTop: '40px',
    borderTop: '1px solid #eee',
    paddingTop: '20px',
};
