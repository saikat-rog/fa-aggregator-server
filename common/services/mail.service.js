// common/services/mail.service.js
import nodemailer from "nodemailer";
import env from "../../config/env.js";

export const sendEmail = async (email, otp) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: env.email,
      pass: env.emailPass
    }
  });

  await transporter.sendMail({
    to: email,
    subject: "OTP Verification",
    text: `Your OTP is ${otp}`
  });
};