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

interface PaymentFailedEmailProps {
    restaurantName: string;
    dashboardUrl: string;
}

export const PaymentFailedEmail = ({
    restaurantName,
    dashboardUrl,
}: PaymentFailedEmailProps) => (
    <Html>
        <Head />
        <Preview>تحذير: فشل دفع اشتراك مطعمك</Preview>
        <Body style={main} dir="rtl">
            <Container style={container}>
                <Heading style={h1}>فشلت عملية الدفع!</Heading>

                <Text style={text}>
                    عزيزي مدير مطعم <strong>{restaurantName}</strong>،
                </Text>

                <Text style={text}>
                    لقد فشلت محاولة تجديد اشتراكك في المنصة. يرجى تحديث بيانات بطاقتك الائتمانية في أقرب وقت لتجنب إيقاف الخدمة.
                </Text>

                <Section style={{ textAlign: 'center', margin: '30px 0' }}>
                    <Button
                        href={dashboardUrl}
                        style={button}
                    >
                        تحديث الدفع الآن
                    </Button>
                </Section>

                <Text style={text}>
                    النظام يمنحك مهلة <strong>3 أيام</strong> لتحديث بيانات الدفع قبل تعليق الحساب مؤقتاً.
                </Text>

                <Text style={footer}>
                    فريق دعم منصة إدارة المطاعم
                </Text>
            </Container>
        </Body>
    </Html>
);

export default PaymentFailedEmail;

const main = {
    backgroundColor: '#fffcfc',
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
    backgroundColor: '#ffffff',
    margin: '0 auto',
    padding: '40px 20px',
    borderRadius: '8px',
    border: '1px solid #ffdddd',
    maxWidth: '600px',
};

const h1 = {
    color: '#e53e3e',
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
    backgroundColor: '#e53e3e',
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
