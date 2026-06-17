import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Gmail SMTP or other provider
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false
  }
});

export async function sendEmail(to: string, subject: string, html: string) {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn("⚠️ SMTP credentials not set. Email not sent.");
      console.log(`--- EMAIL PREVIEW ---
To: ${to}
Subject: ${subject}
Content: ${html}
----------------------`);
      return true;
    }

    const info = await transporter.sendMail({
      from: `"TalentBridge" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });

    console.log("Message sent: %s", info.messageId);
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
}

export async function sendOTP(email: string, otp: string) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
      <h2 style="color: #4f46e5; text-align: center;">Verify Your TalentBridge Account</h2>
      <p>Hello,</p>
      <p>Your verification code for TalentBridge is:</p>
      <div style="background-color: #f3f4f6; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #111827; border-radius: 8px; margin: 20px 0;">
        ${otp}
      </div>
      <p>This code will expire in 5 minutes.</p>
      <p>If you didn't request this code, please ignore this email.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="font-size: 12px; color: #6b7280; text-align: center;">TalentBridge - Bridging Talent with Opportunity</p>
    </div>
  `;
  return sendEmail(email, "TalentBridge Verification Code", html);
}

export async function sendPasswordReset(email: string, resetLink: string) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
      <h2 style="color: #4f46e5; text-align: center;">Reset Your Password</h2>
      <p>Hello,</p>
      <p>We received a request to reset your password for your TalentBridge account. Click the button below to proceed:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
      </div>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request a password reset, you can safely ignore this email.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="font-size: 12px; color: #6b7280; text-align: center;">TalentBridge - Bridging Talent with Opportunity</p>
    </div>
  `;
  return sendEmail(email, "Reset Your TalentBridge Password", html);
}

export async function sendTPOCredentials(email: string, name: string, tempPass: string, loginUrl: string) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
      <h2 style="color: #4f46e5; text-align: center;">Welcome to TalentBridge TPO Ecosystem</h2>
      <p>Hello <strong>${name}</strong>,</p>
      <p>Your Training & Placement Officer account has been created by the administrator. You can now access the Placement Intelligence Dashboard.</p>
      
      <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
        <p style="margin: 5px 0;"><strong>Login URL:</strong> <a href="${loginUrl}">${loginUrl}</a></p>
        <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
        <p style="margin: 5px 0;"><strong>Temporary Password:</strong> <code style="background: #eee; padding: 2px 5px; border-radius: 4px;">${tempPass}</code></p>
      </div>

      <p style="color: #dc2626; font-weight: bold;">Note: You will be required to change your password upon your first login for security purposes.</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${loginUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Login to Dashboard</a>
      </div>

      <p>If you have any questions, please contact the system administrator.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="font-size: 12px; color: #6b7280; text-align: center;">TalentBridge - Bridging Talent with Opportunity</p>
    </div>
  `;
  return sendEmail(email, "Your TalentBridge TPO Account Credentials", html);
}

export async function sendStudentCredentials(email: string, name: string, tempPass: string, collegeName: string, batchName: string, loginUrl: string) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
      <h2 style="color: #4f46e5; text-align: center;">Welcome to TalentBridge!</h2>
      <p>Hello <strong>${name}</strong>,</p>
      <p>Your student account has been registered by your college Placement Administrator at <strong>${collegeName}</strong> for the batch <strong>${batchName}</strong>.</p>
      <p>You can now log in, build your professional resume, take skill assessments, and participate in placement drives!</p>
      
      <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
        <p style="margin: 5px 0;"><strong>Login URL:</strong> <a href="${loginUrl}">${loginUrl}</a></p>
        <p style="margin: 5px 0;"><strong>College:</strong> ${collegeName}</p>
        <p style="margin: 5px 0;"><strong>Batch:</strong> ${batchName}</p>
        <p style="margin: 5px 0;"><strong>Username / Email:</strong> ${email}</p>
        <p style="margin: 5px 0;"><strong>Temporary Password:</strong> <code style="background: #eee; padding: 2px 5px; border-radius: 4px;">${tempPass}</code></p>
      </div>

      <p style="color: #dc2626; font-weight: bold;">Note: It is highly recommended to change/reset your password upon login under your Profile preferences.</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${loginUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Log in and Get Placed</a>
      </div>

      <p>If you have any questions, please contact your TPO.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="font-size: 12px; color: #6b7280; text-align: center;">TalentBridge - Bridging Talent with Opportunity</p>
    </div>
  `;
  return sendEmail(email, `Your TalentBridge Student Credentials - ${collegeName}`, html);
}
