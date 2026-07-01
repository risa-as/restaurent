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

interface PasswordResetEmailProps {
    userName: string;
    resetUrl: string;
}

export const PasswordResetEmail = ({ userName, resetUrl }: PasswordResetEmailProps) => {
    return (
        <Html dir="rtl" lang="ar">
            <Head />
            <Preview>إعادة تعيين كلمة المرور — الرابط صالح 30 دقيقة فقط</Preview>
            <Body style={{ backgroundColor: '#f9fafb', fontFamily: 'Arial, sans-serif', direction: 'rtl' }}>
                <Container style={{ maxWidth: 480, margin: '40px auto', backgroundColor: '#ffffff', borderRadius: 12, padding: '32px 24px', border: '1px solid #e5e7eb' }}>
                    <Heading style={{ fontSize: 22, fontWeight: 'bold', color: '#111827', textAlign: 'center', marginBottom: 8 }}>
                        إعادة تعيين كلمة المرور
                    </Heading>
                    <Text style={{ color: '#6b7280', textAlign: 'center', fontSize: 14, marginBottom: 24 }}>
                        مرحباً {userName}، تلقينا طلباً لإعادة تعيين كلمة مرور حسابك.
                    </Text>

                    <Section style={{ textAlign: 'center', marginBottom: 24 }}>
                        <Button
                            href={resetUrl}
                            style={{
                                backgroundColor: '#f97316',
                                color: '#ffffff',
                                borderRadius: 8,
                                padding: '12px 28px',
                                fontWeight: 'bold',
                                fontSize: 16,
                                textDecoration: 'none',
                                display: 'inline-block',
                            }}
                        >
                            إعادة تعيين كلمة المرور
                        </Button>
                    </Section>

                    <Text style={{ color: '#ef4444', fontSize: 13, textAlign: 'center', fontWeight: 'bold' }}>
                        ⚠️ الرابط صالح لمدة 30 دقيقة فقط
                    </Text>
                    <Text style={{ color: '#9ca3af', fontSize: 12, textAlign: 'center', marginTop: 16 }}>
                        إذا لم تطلب إعادة التعيين، يمكنك تجاهل هذا البريد بأمان.
                    </Text>
                </Container>
            </Body>
        </Html>
    );
};

export default PasswordResetEmail;
