import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const sendInviteEmail = async (toEmail, inviteToken, companyName) => {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const inviteLink = `${process.env.APP_URL}/api/invites/accept?token=${inviteToken}`;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: toEmail,
    subject: `Invitation to Join ${companyName}`,
    html: `
      <h3>You've been invited to join ${companyName}!</h3>
      <p>Click the link below to accept the invitation:</p>
      <a href="${inviteLink}">Accept Invitation</a>
      <p>This link expires in ${process.env.INVITE_TOKEN_EXPIRY}.</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

export { sendInviteEmail };