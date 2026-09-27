import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { createSessionToken, setSessionCookie } from "@/lib/auth/session";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, firstName, lastName } = body;

    // Strict validation
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_EMAIL", message: "A valid email address is required" } },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "WEAK_PASSWORD", message: "Password must be at least 8 characters long" },
        },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check existing
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "EMAIL_EXISTS", message: "An account with this email already exists" },
        },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const cleanFirstName = firstName ? String(firstName).trim() : null;
    const cleanLastName = lastName ? String(lastName).trim() : null;
    const displayName = cleanFirstName
      ? `${cleanFirstName} ${cleanLastName || ""}`.trim()
      : normalizedEmail.split("@")[0];

    // Atomically create User, Profile, and Settings
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        role: "user",
        profile: {
          create: {
            firstName: cleanFirstName,
            lastName: cleanLastName,
            displayName,
          },
        },
        settings: {
          create: {
            theme: "system",
            emailNotifications: true,
            pushNotifications: true,
            reminderDaysBefore: 3,
            weeklyDigest: true,
            securityAlerts: true,
          },
        },
      },
      include: {
        profile: true,
        settings: true,
      },
    });

    // Create session token and set secure cookie
    const token = await createSessionToken({
      id: user.id,
      email: user.email,
      role: "user",
    });

    await setSessionCookie(token);

    return NextResponse.json(
      {
        success: true,
        message: "Your account was created successfully.",
        data: {
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            displayName: user.profile?.displayName,
          },
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Auth Register Error]:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "An error occurred while creating your account" },
      },
      { status: 500 }
    );
  }
}
