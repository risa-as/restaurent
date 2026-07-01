import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_dummy_key_for_build_purposes_only';

if (!process.env.STRIPE_SECRET_KEY && process.env.NODE_ENV !== 'production') {
    console.warn('STRIPE_SECRET_KEY is missing. Please set it in your .env file.');
}

export const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2026-02-25.clover', // Match TS definitions for this Stripe package version
    typescript: true,
});
