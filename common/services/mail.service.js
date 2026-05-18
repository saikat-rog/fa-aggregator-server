// common/services/mail.service.js
import nodemailer from "nodemailer";
import env from "../../config/env.js";

export const sendEmail = async (otp, templateName) => {
  console.log(`OTP: ${otp}, Template: ${templateName}`);
};