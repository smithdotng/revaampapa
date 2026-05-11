// test-email.js
require('dotenv').config();
const nodemailer = require('nodemailer');

async function testEmail() {
    console.log('=========================================');
    console.log('Testing Hostinger Email Configuration');
    console.log('=========================================');
    console.log('EMAIL_HOST:', process.env.EMAIL_HOST);
    console.log('EMAIL_PORT:', process.env.EMAIL_PORT);
    console.log('EMAIL_USER:', process.env.EMAIL_USER);
    console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? '***SET***' : 'NOT SET');
    console.log('=========================================\n');

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.error('❌ Email credentials missing in .env file');
        return;
    }

    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT) || 465,
        secure: true, // true for port 465
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        },
        tls: {
            rejectUnauthorized: false
        },
        debug: true, // This will show SMTP conversation
        logger: true
    });

    try {
        // Verify connection
        console.log('📡 Verifying SMTP connection...');
        await transporter.verify();
        console.log('✅ SMTP connection successful!');

        // Send test email
        console.log('📧 Sending test email to:', process.env.EMAIL_USER);
        const info = await transporter.sendMail({
            from: `"RevaampAP Test" <${process.env.EMAIL_USER}>`,
            to: process.env.EMAIL_USER,
            subject: 'Test Email from RevaampAP - ' + new Date().toLocaleString(),
            html: `
                <h1>✅ Test Successful!</h1>
                <p>Your email configuration is working correctly!</p>
                <p>Time: ${new Date().toString()}</p>
                <p>SMTP Host: ${process.env.EMAIL_HOST}</p>
            `
        });

        console.log('✅ Email sent successfully!');
        console.log('   Message ID:', info.messageId);
        console.log('   Response:', info.response);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.code) console.error('   Code:', error.code);
    }
}

testEmail();