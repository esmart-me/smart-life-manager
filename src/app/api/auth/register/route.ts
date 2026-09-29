import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { createSessionToken, setSessionCookie } from "@/lib/auth/session";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "Invalid request payload" } },
        { status: 400 }
      );
    }

    const { email, password, firstName, lastName, displayName: rawDisplayName, currency } = body;

    // 1. Strict validation: Valid email format
    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleanEmail = email && typeof email === "string" ? email.trim() : "";
    if (!cleanEmail || !EMAIL_REGEX.test(cleanEmail)) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_EMAIL", message: "A valid email address is required" } },
        { status: 400 }
      );
    }

    const normalizedEmail = cleanEmail.toLowerCase();

    // 2. Check existing account
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "EMAIL_EXISTS", message: "This email is already registered. Please sign in instead." },
        },
        { status: 409 }
      );
    }

    // 3. Name validation: First name is required (or extractable from displayName)
    let cleanFirstName = firstName && typeof firstName === "string" ? firstName.trim() : "";
    let cleanLastName = lastName && typeof lastName === "string" ? lastName.trim() : null;
    if (!cleanFirstName && rawDisplayName && typeof rawDisplayName === "string" && rawDisplayName.trim()) {
      const parts = rawDisplayName.trim().split(/\s+/);
      cleanFirstName = parts[0] || "";
      if (!cleanLastName && parts.length > 1) {
        cleanLastName = parts.slice(1).join(" ");
      }
    }

    if (!cleanFirstName) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_FIRST_NAME", message: "First name is required" } },
        { status: 400 }
      );
    }

    // 4. Strict validation: Password minimum length
    if (!password || typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "WEAK_PASSWORD", message: "Password must be at least 8 characters long" },
        },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);
    const finalDisplayName = cleanLastName ? `${cleanFirstName} ${cleanLastName}` : cleanFirstName;
    const userCurrency = currency && typeof currency === "string" ? currency.trim().toUpperCase() : "USD";

    // Atomically create User, Profile, Settings, and default UserSubscription
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        role: "user",
        profile: {
          create: {
            firstName: cleanFirstName,
            lastName: cleanLastName,
            displayName: finalDisplayName,
            country: "US",
            region: "US",
            currency: userCurrency,
            locale: "en-US",
            timezone: "UTC",
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
        userSubscription: {
          create: {
            plan: "free",
            planName: "Free Starter",
            status: "active",
            billingInterval: "monthly",
            billingCycle: "monthly",
            amount: 0.0,
            currency: "USD",
            provider: "stripe",
          },
        },
      },
      include: {
        profile: true,
        settings: true,
        userSubscription: true,
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
            displayName: user.profile?.displayName || finalDisplayName,
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
