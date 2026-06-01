import nodemailer from 'nodemailer';
import config from '../config/index.js';
import logger from '../config/logger.js';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // STARTTLS
  auth: {
    user: config.email.user,
    pass: config.email.pass
  }
});


if (config.isDevelopment) {
  transporter.verify()
    .then(() => logger.info('Email server ready'))
    .catch((err) =>
      logger.error(`Email config error: ${err.message}`)
    );
}


const sendEmail = async ({ to, subject, html }) => {
  try {
    await transporter.sendMail({
      from: `"MyChatAppli" <${config.email.user}>`,
      to,
      subject,
      html
    });
  } catch (error) {
    logger.error(`Email send failed: ${error.message}`);
    throw new Error('Email could not be sent');
  }
};


export const sendOtpEmail = async (to, otp) => {
  const html = `
    <div style="font-family: Arial; padding: 20px;">
      <h2>Password Reset Request</h2>
      <p>Your OTP code is:</p>
      <h1 style="letter-spacing: 5px;">${otp}</h1>
      <p>This code will expire in 10 minutes.</p>
      <p>If you did not request this, please ignore this email.</p>
    </div>
  `;

  await sendEmail({
    to,
    subject: 'Password Reset OTP',
    html
  });
};

export default sendEmail;