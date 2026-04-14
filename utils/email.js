// utils/email.js
const nodemailer = require('nodemailer');

// Configure email transporter (optional - for production)
let transporter = null;

if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT || 587,
        secure: false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
}

// Helper function to log emails during development
const logEmail = (to, subject, html) => {
    console.log('\n📧 ========== EMAIL LOG ==========');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Content: ${html ? html.substring(0, 200) : 'No content'}...`);
    console.log('=================================\n');
};

// Helper function to send email (works with or without transporter)
const sendEmail = async (to, subject, html) => {
    try {
        // Log email in development
        if (process.env.NODE_ENV !== 'production') {
            logEmail(to, subject, html);
            return true;
        }
        
        // Send real email in production if transporter is configured
        if (transporter) {
            await transporter.sendMail({
                from: `"RevaampAP" <${process.env.EMAIL_USER}>`,
                to: to,
                subject: subject,
                html: html
            });
            console.log(`✅ Email sent to ${to}`);
            return true;
        } else {
            logEmail(to, subject, html);
            return true;
        }
    } catch (error) {
        console.error('Email send error:', error);
        // Don't throw error - just log it and return false
        return false;
    }
};

// Send welcome email to property owner
const sendWelcomeEmailToPropertyOwner = async (user) => {
    const subject = `Welcome to RevaampAP, ${user.name}!`;
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #ff6b6b 0%, #ff8e53 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { padding: 30px; background: #f9f9f9; }
                .btn { display: inline-block; background: #ff6b6b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
                .footer { text-align: center; padding: 20px; font-size: 12px; color: #999; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Welcome to RevaampAP! 🎉</h1>
                </div>
                <div class="content">
                    <h2>Hello ${user.name},</h2>
                    <p>Thank you for registering as a Property Owner on RevaampAP!</p>
                    <p>You can now list your properties and get them verified for just ₦20,000. Our platform connects you with thousands of potential buyers and a network of 200+ active promoters.</p>
                    <p><strong>Next Steps:</strong></p>
                    <ul>
                        <li>Login to your dashboard</li>
                        <li>Click "List Your Property"</li>
                        <li>Fill in property details and upload images</li>
                        <li>Pay the verification fee of ₦20,000</li>
                        <li>Get verified and go live!</li>
                    </ul>
                    <a href="${process.env.BASE_URL || 'http://localhost:3000'}/dashboard" class="btn">Go to Dashboard</a>
                    <p style="margin-top: 20px;">Need help? Contact our support team at <a href="mailto:support@revaampap.com">support@revaampap.com</a></p>
                </div>
                <div class="footer">
                    <p>&copy; 2024 RevaampAP. All rights reserved.</p>
                    <p>Abuja, Nigeria</p>
                </div>
            </div>
        </body>
        </html>
    `;
    
    return await sendEmail(user.email, subject, html);
};

// Send welcome email to promoter
const sendWelcomeEmailToPromoter = async (user) => {
    const subject = `Welcome to RevaampAP, ${user.name}!`;
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #ff6b6b 0%, #ff8e53 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { padding: 30px; background: #f9f9f9; }
                .btn { display: inline-block; background: #ff6b6b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
                .footer { text-align: center; padding: 20px; font-size: 12px; color: #999; }
                .commission-badge { background: #28a745; color: white; padding: 5px 10px; border-radius: 5px; display: inline-block; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Welcome to RevaampAP! 🚀</h1>
                </div>
                <div class="content">
                    <h2>Hello ${user.name},</h2>
                    <p>Congratulations! You've successfully registered as a Promoter on RevaampAP.</p>
                    <p><span class="commission-badge">✨ Earn 70% Commission ✨</span></p>
                    <p>You can now start earning by sharing properties on your social media networks. No investment required!</p>
                    <p><strong>How to Get Started:</strong></p>
                    <ul>
                        <li>Login to your promoter dashboard</li>
                        <li>Browse available properties</li>
                        <li>Create promotion links for properties you want to share</li>
                        <li>Share on WhatsApp, Instagram, Facebook, Twitter, etc.</li>
                        <li>Earn 70% commission on every successful sale!</li>
                    </ul>
                    <a href="${process.env.BASE_URL || 'http://localhost:3000'}/promoter/dashboard" class="btn">Go to Dashboard</a>
                    <p style="margin-top: 20px;">Need help? Contact our support team at <a href="mailto:support@revaampap.com">support@revaampap.com</a></p>
                </div>
                <div class="footer">
                    <p>&copy; 2024 RevaampAP. All rights reserved.</p>
                    <p>Abuja, Nigeria</p>
                </div>
            </div>
        </body>
        </html>
    `;
    
    return await sendEmail(user.email, subject, html);
};

// Send password reset email
const sendPasswordResetEmail = async (user, resetToken) => {
    const resetUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;
    const subject = 'Password Reset Request - RevaampAP';
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #ff6b6b 0%, #ff8e53 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { padding: 30px; background: #f9f9f9; }
                .btn { display: inline-block; background: #ff6b6b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
                .footer { text-align: center; padding: 20px; font-size: 12px; color: #999; }
                .warning { background: #fff3cd; color: #856404; padding: 10px; border-radius: 5px; margin: 20px 0; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Password Reset Request</h1>
                </div>
                <div class="content">
                    <h2>Hello ${user.name},</h2>
                    <p>You requested to reset your password for your RevaampAP account.</p>
                    <p>Click the button below to reset your password:</p>
                    <a href="${resetUrl}" class="btn">Reset Password</a>
                    <div class="warning">
                        <p><strong>⚠️ This link will expire in 1 hour.</strong></p>
                    </div>
                    <p>If you didn't request this, please ignore this email. Your password will remain unchanged.</p>
                    <p>For security reasons, do not share this link with anyone.</p>
                </div>
                <div class="footer">
                    <p>&copy; 2024 RevaampAP. All rights reserved.</p>
                    <p>Abuja, Nigeria</p>
                </div>
            </div>
        </body>
        </html>
    `;
    
    return await sendEmail(user.email, subject, html);
};

// Send verification payment confirmation
const sendVerificationPaymentConfirmation = async (user, property) => {
    const subject = `Verification Payment Received - ${property.title}`;
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { padding: 30px; background: #f9f9f9; }
                .btn { display: inline-block; background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
                .footer { text-align: center; padding: 20px; font-size: 12px; color: #999; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Payment Received! ✅</h1>
                </div>
                <div class="content">
                    <h2>Hello ${user.name},</h2>
                    <p>We have received your verification payment of ₦20,000 for property:</p>
                    <p><strong>"${property.title}"</strong></p>
                    <p>Your property is now pending admin verification. Our team will review your property and documents within 2-5 business days.</p>
                    <p>You will be notified once your property is verified and goes live on the platform.</p>
                    <a href="${process.env.BASE_URL || 'http://localhost:3000'}/dashboard" class="btn">Track Status</a>
                </div>
                <div class="footer">
                    <p>&copy; 2024 RevaampAP. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
    `;
    
    return await sendEmail(user.email, subject, html);
};

// Send property verification approved
const sendPropertyVerifiedEmail = async (user, property) => {
    const subject = `Property Verified - ${property.title}`;
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { padding: 30px; background: #f9f9f9; }
                .btn { display: inline-block; background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
                .footer { text-align: center; padding: 20px; font-size: 12px; color: #999; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Congratulations! 🎉</h1>
                </div>
                <div class="content">
                    <h2>Hello ${user.name},</h2>
                    <p>Great news! Your property has been verified and is now live on RevaampAP!</p>
                    <p><strong>"${property.title}"</strong></p>
                    <p>Your property is now visible to thousands of potential buyers and our network of 200+ active promoters.</p>
                    <a href="${process.env.BASE_URL || 'http://localhost:3000'}/properties/${property.slug}" class="btn">View Your Property</a>
                </div>
                <div class="footer">
                    <p>&copy; 2024 RevaampAP. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
    `;
    
    return await sendEmail(user.email, subject, html);
};

// Send property verification rejected
const sendPropertyRejectedEmail = async (user, property, reason) => {
    const subject = `Property Verification Update - ${property.title}`;
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #dc3545; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { padding: 30px; background: #f9f9f9; }
                .btn { display: inline-block; background: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
                .footer { text-align: center; padding: 20px; font-size: 12px; color: #999; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Property Verification Update</h1>
                </div>
                <div class="content">
                    <h2>Hello ${user.name},</h2>
                    <p>Your property "${property.title}" requires additional information.</p>
                    <p><strong>Feedback from our team:</strong></p>
                    <p style="background: #f8d7da; padding: 10px; border-radius: 5px;">${reason}</p>
                    <p>Please update your property listing and resubmit for verification.</p>
                    <a href="${process.env.BASE_URL || 'http://localhost:3000'}/properties/${property._id}/edit" class="btn">Edit Property</a>
                </div>
                <div class="footer">
                    <p>&copy; 2024 RevaampAP. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
    `;
    
    return await sendEmail(user.email, subject, html);
};

// Send commission payout notification
const sendCommissionPayoutEmail = async (user, amount, transaction) => {
    const subject = `Commission Payout - ₦${amount.toLocaleString()}`;
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { padding: 30px; background: #f9f9f9; }
                .btn { display: inline-block; background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
                .footer { text-align: center; padding: 20px; font-size: 12px; color: #999; }
                .amount { font-size: 24px; color: #28a745; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Commission Payout! 💰</h1>
                </div>
                <div class="content">
                    <h2>Hello ${user.name},</h2>
                    <p>You have received a commission payout of:</p>
                    <p class="amount">₦${amount.toLocaleString()}</p>
                    <p>for property: <strong>${transaction.property?.title || 'your referral'}</strong></p>
                    <a href="${process.env.BASE_URL || 'http://localhost:3000'}/promoter/earnings" class="btn">View Earnings</a>
                </div>
                <div class="footer">
                    <p>&copy; 2024 RevaampAP. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
    `;
    
    return await sendEmail(user.email, subject, html);
};

// Send welcome email to project subscriber
const sendWelcomeEmailToProjectSubscriber = async (user) => {
    const subject = `Welcome to RevaampAP Project Management, ${user.name}!`;
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { padding: 30px; background: #f9f9f9; }
                .btn { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
                .footer { text-align: center; padding: 20px; font-size: 12px; color: #999; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Welcome to RevaampAP Project Management! 🏗️</h1>
                </div>
                <div class="content">
                    <h2>Hello ${user.name},</h2>
                    <p>Thank you for registering as a Project Management Subscriber on RevaampAP!</p>
                    <p>With our service, you can now execute your building projects with confidence. Here's how it works:</p>
                    <ul>
                        <li><strong>Bank Guarantee:</strong> Provide a bank guarantee to secure your project</li>
                        <li><strong>Project Execution:</strong> Revaamp will source funds and execute your project</li>
                        <li><strong>Real-time Tracking:</strong> Monitor progress through your dashboard</li>
                        <li><strong>Regular Updates:</strong> Receive weekly updates on your project</li>
                    </ul>
                    <p><strong>Next Steps:</strong></p>
                    <ul>
                        <li>Login to your dashboard</li>
                        <li>Subscribe to a plan (Basic, Premium, or Enterprise)</li>
                        <li>Submit your bank guarantee for verification</li>
                        <li>Create your first project</li>
                    </ul>
                    <a href="${process.env.BASE_URL || 'http://localhost:3000'}/login" class="btn">Login to Dashboard</a>
                    <p style="margin-top: 20px;">Need help? Contact our support team at <a href="mailto:support@revaampap.com">support@revaampap.com</a></p>
                </div>
                <div class="footer">
                    <p>&copy; 2024 RevaampAP. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
    `;
    
    return await sendEmail(user.email, subject, html);
};

// Add this function to your existing email.js

// Send welcome email to business partner
const sendWelcomeEmailToBusinessPartner = async (user) => {
    const subject = `Welcome to RevaampAPA Business Partner Program, ${user.name}!`;
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { padding: 30px; background: #f9f9f9; }
                .btn { display: inline-block; background: #f5576c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
                .footer { text-align: center; padding: 20px; font-size: 12px; color: #999; }
                .commission-badge { background: #28a745; color: white; padding: 5px 10px; border-radius: 5px; display: inline-block; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Welcome to RevaampAPA Business Partner Program! 🚀</h1>
                </div>
                <div class="content">
                    <h2>Hello ${user.name},</h2>
                    <p>Congratulations! You've successfully registered as a Business Partner on RevaampAPA.</p>
                    <p><span class="commission-badge">✨ Earn 70% Commission ✨</span></p>
                    <p>Your payment of ₦20,000 is pending verification. Once confirmed, you'll get access to:</p>
                    <ul>
                        <li>White-label solutions</li>
                        <li>Dedicated account manager</li>
                        <li>Marketing materials & training</li>
                        <li>Priority technical support</li>
                        <li>Exclusive partner events</li>
                    </ul>
                    <p><strong>Next Steps:</strong></p>
                    <ul>
                        <li>Wait for payment verification (2-3 business days)</li>
                        <li>You'll receive an email once your account is activated</li>
                        <li>Login to access your partner dashboard</li>
                    </ul>
                    <a href="${process.env.BASE_URL || 'http://localhost:3000'}/login" class="btn">Login to Dashboard</a>
                    <p style="margin-top: 20px;">Need help? Contact our support team at <a href="mailto:support@revaampap.com">support@revaampap.com</a></p>
                </div>
                <div class="footer">
                    <p>&copy; 2024 RevaampAPA. All rights reserved.</p>
                    <p>Abuja, Nigeria</p>
                </div>
            </div>
        </body>
        </html>
    `;
    
    return await sendEmail(user.email, subject, html);
};

// Don't forget to add to module.exports
module.exports = {
    sendWelcomeEmailToPropertyOwner,
    sendWelcomeEmailToPromoter,
    sendWelcomeEmailToBusinessPartner, // Add this
    sendWelcomeEmailToProjectSubscriber,
    sendPasswordResetEmail,
    sendVerificationPaymentConfirmation,
    sendPropertyVerifiedEmail,
    sendPropertyRejectedEmail,
    sendCommissionPayoutEmail
};

