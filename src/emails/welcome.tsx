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

interface WelcomeEmailProps {
    ownerName: string;
    restaurantName: string;
    dashboardUrl: string;
}

export const WelcomeEmail = ({
    ownerName,
    restaurantName,
    dashboardUrl,
}: WelcomeEmailProps) => (
    <Html>
        <Head />
        <Preview>مرحباً بك في منصة إدارة المطاعم! حسابك جاهز للاستخدام.</Preview>
        <Body style={main} dir="rtl">
            <Container style={container}>
                <Heading style={h1}>مرحباً {ownerName}،</Heading>

                <Text style={text}>
                    تم بنجاح إعداد حساب مطعمك <strong>{restaurantName}</strong>
                    على منصتنا. نحن سعداء بانضمامك إلينا!
                </Text>

                <Section style={{ textAlign: 'center', margin: '30px 0' }}>
                    <Button
                        href={dashboardUrl}
                        style={button}
                    >
                        الدخول للوحة التحكم
                    </Button>
                </Section>

                <Text style={text}>
                    بإمكانك الآن:
                    <br />
                    - تجهيز قائمة طعامك
                    <br />
                    - إضافة موظفين آخرين (كاشير، طباخ، كابتن)
                    <br />
                    - إعداد طاولات المطعم
                </Text>

                <Text style={text}>
                    إذا احتجت أي مساعدة، فريق الدعم الفني جاهز لخدمتك على مدار الساعة.
                </Text>

                <Text style={footer}>
                    مع تحيات فريق منصة إدارة المطاعم
                </Text>
            </Container>
        </Body>
    </Html>
);

export default WelcomeEmail;

const main = {
    backgroundColor: '#f6f9fc',
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
    color: '#333',
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
    backgroundColor: '#ea580c', // orange-600
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
