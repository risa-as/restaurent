import {
    Body,
    Container,
    Head,
    Heading,
    Html,
    Preview,
    Text,
} from '@react-email/components';
import * as React from 'react';

interface PasswordChangedEmailProps {
    userName: string;
    changedAt: string;
}

export const PasswordChangedEmail = ({ userName, changedAt }: PasswordChangedEmailProps) => {
    return (
        <Html dir="rtl" lang="ar">
            <Head />
            <Preview>تم تغيير كلمة مرورك بنجاح</Preview>
            <Body style={{ backgroundColor: '#f9fafb', fontFamily: 'Arial, sans-serif', direction: 'rtl' }}>
                <Container style={{ maxWidth: 480, margin: '40px auto', backgroundColor: '#ffffff', borderRadius: 12, padding: '32px 24px', border: '1px solid #e5e7eb' }}>
                    <Heading style={{ fontSize: 22, fontWeight: 'bold', color: '#111827', textAlign: 'center', marginBottom: 8 }}>
                        ✅ تم تغيير كلمة المرور
                    </Heading>
                    <Text style={{ color: '#374151', textAlign: 'center', fontSize: 15, marginBottom: 16 }}>
                        مرحباً {userName}، تم تغيير كلمة مرور حسابك بنجاح.
                    </Text>
                    <Text style={{ color: '#6b7280', fontSize: 13, textAlign: 'center' }}>
                        وقت التغيير: {changedAt}
                    </Text>
                    <Text style={{ color: '#ef4444', fontSize: 13, textAlign: 'center', marginTop: 16, fontWeight: 'bold' }}>
                        إذا لم تكن أنت من قام بهذا التغيير، يُرجى التواصل مع الدعم فوراً.
                    </Text>
                </Container>
            </Body>
        </Html>
    );
};

export default PasswordChangedEmail;
