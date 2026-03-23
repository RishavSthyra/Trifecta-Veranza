import nodemailer from "nodemailer";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import ContactSubmission from "@/models/ContactSubmission";

export const runtime = "nodejs";

type ContactPayload = {
  fullName?: string;
  email?: string;
  phone?: string;
  apartmentType?: string;
  budget?: string;
  purchaseGoal?: string;
  moveInTimeline?: string;
  preferredContactTime?: string;
  siteVisitDate?: string;
  message?: string;
  consent?: boolean;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getMissingEnvVars() {
  const requiredVars = [
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_USER",
    "SMTP_PASS",
    "MONGODB_URI",
  ];
  return requiredVars.filter((key) => !process.env[key]);
}

function validatePayload(payload: ContactPayload) {
  const requiredFields: Array<keyof ContactPayload> = [
    "fullName",
    "email",
    "phone",
    "apartmentType",
    "budget",
  ];

  for (const field of requiredFields) {
    const value = payload[field];

    if (typeof value !== "string" || !value.trim()) {
      return `Missing required field: ${field}`;
    }
  }

  if (payload.consent !== true) {
    return "Consent is required before submitting the form.";
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const missingEnvVars = getMissingEnvVars();

    if (missingEnvVars.length > 0) {
      return NextResponse.json(
        {
          message: `Missing SMTP env values: ${missingEnvVars.join(", ")}`,
        },
        { status: 500 },
      );
    }

    const payload = (await request.json()) as ContactPayload;
    const validationError = validatePayload(payload);

    if (validationError) {
      return NextResponse.json({ message: validationError }, { status: 400 });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure:
        process.env.SMTP_SECURE === "true" ||
        Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const safeValues = {
      fullName: escapeHtml(payload.fullName!.trim()),
      email: escapeHtml(payload.email!.trim()),
      phone: escapeHtml(payload.phone!.trim()),
      apartmentType: escapeHtml(payload.apartmentType!.trim()),
      budget: escapeHtml(payload.budget!.trim()),
      purchaseGoal: escapeHtml(payload.purchaseGoal?.trim() || "Not specified"),
      moveInTimeline: escapeHtml(
        payload.moveInTimeline?.trim() || "Not specified",
      ),
      preferredContactTime: escapeHtml(
        payload.preferredContactTime?.trim() || "Not specified",
      ),
      siteVisitDate: escapeHtml(payload.siteVisitDate?.trim() || "Not selected"),
      message: escapeHtml(payload.message?.trim() || "No extra notes shared."),
    };

    const toAddress = process.env.SMTP_TO || process.env.SMTP_USER!;
    const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER!;

    await connectToDatabase();

    await Promise.all([
      ContactSubmission.create({
        fullName: payload.fullName!.trim(),
        email: payload.email!.trim(),
        phone: payload.phone!.trim(),
        apartmentType: payload.apartmentType!.trim(),
        budget: payload.budget!.trim(),
        moveInTimeline: payload.moveInTimeline?.trim() || "",
        message: payload.message?.trim() || "",
        consent: payload.consent,
      }),
      transporter.sendMail({
        from: fromAddress,
        to: toAddress,
        replyTo: payload.email!.trim(),
        subject: `New Quote Request: ${payload.apartmentType} | ${payload.fullName}`,
        text: [
          "New quote request received",
          `Name: ${payload.fullName}`,
          `Email: ${payload.email}`,
          `Phone: ${payload.phone}`,
          `Apartment Type: ${payload.apartmentType}`,
          `Budget: ${payload.budget}`,
          `Purchase Goal: ${payload.purchaseGoal || "Not specified"}`,
          `Move-In Timeline: ${payload.moveInTimeline || "Not specified"}`,
          `Preferred Contact Time: ${payload.preferredContactTime || "Not specified"}`,
          `Site Visit Date: ${payload.siteVisitDate || "Not selected"}`,
          `Message: ${payload.message || "No extra notes shared."}`,
        ].join("\n"),
        html: `
          <div style="font-family:Arial,sans-serif;background:#f8fafc;padding:24px;color:#0f172a;">
            <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:20px;padding:28px;border:1px solid #e2e8f0;">
              <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.22em;text-transform:uppercase;color:#0891b2;">
                New Quote Request
              </p>
              <h1 style="margin:0 0 20px;font-size:28px;line-height:1.2;">
                ${safeValues.fullName} is asking for a quote
              </h1>
              <table style="width:100%;border-collapse:collapse;">
                <tbody>
                  <tr><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;font-weight:600;">Email</td><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;">${safeValues.email}</td></tr>
                  <tr><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;font-weight:600;">Phone</td><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;">${safeValues.phone}</td></tr>
                  <tr><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;font-weight:600;">Apartment Type</td><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;">${safeValues.apartmentType}</td></tr>
                  <tr><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;font-weight:600;">Budget</td><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;">${safeValues.budget}</td></tr>
                  <tr><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;font-weight:600;">Purchase Goal</td><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;">${safeValues.purchaseGoal}</td></tr>
                  <tr><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;font-weight:600;">Move-In Timeline</td><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;">${safeValues.moveInTimeline}</td></tr>
                  <tr><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;font-weight:600;">Preferred Contact Time</td><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;">${safeValues.preferredContactTime}</td></tr>
                  <tr><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;font-weight:600;">Site Visit Date</td><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;">${safeValues.siteVisitDate}</td></tr>
                </tbody>
              </table>
              <div style="margin-top:20px;border-radius:16px;background:#f8fafc;padding:16px;">
                <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#64748b;">Client Notes</p>
                <p style="margin:0;font-size:15px;line-height:1.7;">${safeValues.message}</p>
              </div>
            </div>
          </div>
        `,
      }),
    ]);

    return NextResponse.json({
      message: "Quote request saved and sent successfully.",
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to send the quote request.";

    return NextResponse.json({ message }, { status: 500 });
  }
}
