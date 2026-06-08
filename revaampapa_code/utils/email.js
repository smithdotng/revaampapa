// utils/email.js
const nodemailer = require('nodemailer');

// Configure email transporter (optional - for production)
let transporter = null;

// Hostinger SMTP Configuration
if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: 465, // Hostinger requires 465 for SSL
        secure: true, // true for 465, false for other ports
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        },
        tls: {
            rejectUnauthorized: false // Important for Hostinger
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 20000
    });
    
    // Verify connection on startup
    transporter.verify((error, success) => {
        if (error) {
            console.error('❌ Hostinger SMTP Connection Error:', error.message);
            console.error('   Please check your email credentials in .env file');
        } else {
            console.log('✅ Hostinger SMTP is ready to send emails');
        }
    });
} else {
    console.log('⚠️ Email not configured. Using console fallback.');
    console.log('   Add to .env: EMAIL_HOST, EMAIL_USER, EMAIL_PASS');
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

// Send bid notice email — all users get this; business partners get a bid CTA
const sendBidNoticeEmail = async (user, notice) => {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const isBusinessPartner = user.userType === 'business_partner';

    const deadlineDisplay = notice.deadlineText ||
        new Date(notice.deadline).toLocaleString('en-NG', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });

    const bidCTA = isBusinessPartner
        ? `<a href="${baseUrl}/business-partner/bid?noticeId=${notice._id}" class="btn">🔨 Place My Bid Now</a>`
        : `<div class="info-box">
               <p><strong>🔒 Bidding is exclusive to Revaamp Business Partners.</strong></p>
               <p>Want to participate in future bid transactions?</p>
               <a href="${baseUrl}/business-partner/register" class="btn-secondary">Become a Business Partner</a>
           </div>`;

    const conditionsList = notice.conditions && notice.conditions.length
        ? `<ul>${notice.conditions.map(c => `<li>${c}</li>`).join('')}</ul>` : '';

    const criteriaList = notice.allocationCriteria && notice.allocationCriteria.length
        ? `<ul>${notice.allocationCriteria.map(c => `<li>${c}</li>`).join('')}</ul>` : '';

    const notesList = notice.importantNotes && notice.importantNotes.length
        ? `<ul>${notice.importantNotes.map(n => `<li>${n}</li>`).join('')}</ul>` : '';

    const subject = `📢 New Bid Notice: ${notice.transactionNumber} — ${notice.client}`;

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.7; color: #333; margin: 0; padding: 0; }
                .container { max-width: 620px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 35px 30px; text-align: center; border-radius: 12px 12px 0 0; }
                .header h1 { margin: 0 0 8px; font-size: 24px; }
                .header p { margin: 0; opacity: 0.9; font-size: 15px; }
                .badge { display: inline-block; background: rgba(255,255,255,0.25); padding: 5px 14px; border-radius: 20px; font-size: 12px; letter-spacing: 1px; margin-bottom: 12px; }
                .content { background: #fff; padding: 30px; }
                .notice-box { background: #fff8f8; border: 2px solid #f5576c; border-radius: 10px; padding: 20px; margin: 20px 0; }
                .notice-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #fce4e4; font-size: 15px; }
                .notice-row:last-child { border-bottom: none; }
                .notice-label { color: #888; }
                .notice-value { font-weight: 700; color: #333; }
                .profit { color: #28a745 !important; font-size: 18px; }
                .deadline { color: #dc3545 !important; }
                .section-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #f5576c; margin: 20px 0 8px; }
                ul { margin: 5px 0; padding-left: 20px; }
                ul li { margin-bottom: 5px; font-size: 14px; }
                .btn { display: inline-block; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white !important; padding: 14px 32px; text-decoration: none; border-radius: 8px; margin-top: 20px; font-weight: 700; font-size: 16px; }
                .btn-secondary { display: inline-block; background: #333; color: white !important; padding: 11px 24px; text-decoration: none; border-radius: 8px; margin-top: 10px; font-size: 14px; }
                .info-box { background: #f8f9fa; border-left: 4px solid #6c757d; padding: 15px 20px; border-radius: 0 8px 8px 0; margin-top: 20px; }
                .info-box p { margin: 0 0 8px; font-size: 14px; }
                .footer { background: #f8f9fa; text-align: center; padding: 20px; font-size: 12px; color: #999; border-radius: 0 0 12px 12px; }
                .divider { height: 1px; background: #f0f0f0; margin: 20px 0; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="badge">BID NOTICE</div>
                    <h1>New Transaction Opportunity</h1>
                    <p>${notice.description}</p>
                </div>
                <div class="content">
                    <p>Dear ${user.name},</p>
                    <p>Revaamp has secured an exclusive transaction opportunity. Below are the full details:</p>

                    <div class="notice-box">
                        <div class="notice-row">
                            <span class="notice-label">Transaction Number</span>
                            <span class="notice-value">${notice.transactionNumber}</span>
                        </div>
                        <div class="notice-row">
                            <span class="notice-label">Client</span>
                            <span class="notice-value">${notice.client}</span>
                        </div>
                        <div class="notice-row">
                            <span class="notice-label">Total Lots Available</span>
                            <span class="notice-value">${notice.totalLots} lots</span>
                        </div>
                        <div class="notice-row">
                            <span class="notice-label">Transaction Price per Lot</span>
                            <span class="notice-value">₦${notice.transactionPricePerLot.toLocaleString()}</span>
                        </div>
                        <div class="notice-row">
                            <span class="notice-label">Transaction Cost per Lot</span>
                            <span class="notice-value">₦${notice.transactionCostPerLot.toLocaleString()}</span>
                        </div>
                        <div class="notice-row">
                            <span class="notice-label">Profit per Lot</span>
                            <span class="notice-value profit">₦${notice.profitPerLot.toLocaleString()}</span>
                        </div>
                        <div class="notice-row">
                            <span class="notice-label">Payment to Successful Bidders</span>
                            <span class="notice-value">Day ${notice.paymentToPartnerDays || 9} from receipt of transaction cost</span>
                        </div>
                        <div class="notice-row">
                            <span class="notice-label">Bid Deadline</span>
                            <span class="notice-value deadline">${deadlineDisplay}</span>
                        </div>
                    </div>

                    ${conditionsList ? `<div class="section-title">Conditions for Participation</div>${conditionsList}` : ''}
                    ${criteriaList ? `<div class="section-title">Criteria for Allocation of Lots</div>${criteriaList}` : ''}
                    ${notesList ? `<div class="section-title">⚠️ Important Notes</div>${notesList}` : ''}

                    <div class="divider"></div>
                    <div style="text-align:center;">
                        ${bidCTA}
                    </div>
                </div>
                <div class="footer">
                    <p>This notice was sent to all registered members of RevaampAPA.</p>
                    <p>© 2026 RevaampAPA All rights reserved. · Abuja, Nigeria</p>
                    <p><a href="${baseUrl}" style="color:#f5576c;">www.revaampapa.com</a></p>
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
    sendCommissionPayoutEmail,
    sendBidNoticeEmail
};

// Add this at the end of utils/email.js to verify the module loads correctly
console.log('📧 Email utility loaded. Email configured:', !!transporter);
console.log('   - EMAIL_HOST:', process.env.EMAIL_HOST || 'not set');
console.log('   - EMAIL_USER:', process.env.EMAIL_USER || 'not set');
console.log('   - EMAIL_PASS:', process.env.EMAIL_PASS ? '***set***' : 'not set');