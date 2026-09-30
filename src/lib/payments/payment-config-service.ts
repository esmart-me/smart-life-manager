// src/lib/payments/payment-config-service.ts
import { prisma } from "@/lib/db/prisma";

export interface PublicPaymentConfig {
  cardEnabled: boolean;
  stripeEnabled: boolean;
  paypalEnabled: boolean;
  upiEnabled: boolean;
  upiId: string | null;
  upiDisplayName: string | null;
  upiQrCodeUrl: string | null;
  upiInstructions: string | null;
  defaultMethod: string;
}

const DEFAULT_CONFIG_ID = "default_payment_config";

/**
 * Retrieves the centralized system payment configuration from the database.
 * Initializes default record if it doesn't already exist.
 */
export async function getPaymentConfig() {
  let config = await prisma.systemPaymentConfig.findUnique({
    where: { id: DEFAULT_CONFIG_ID },
  });

  if (!config) {
    config = await prisma.systemPaymentConfig.create({
      data: {
        id: DEFAULT_CONFIG_ID,
        cardEnabled: true,
        stripeEnabled: true,
        paypalEnabled: false,
        upiEnabled: false,
        upiId: "smartlifemanager@okaxis",
        upiDisplayName: "Smart Life Manager",
        upiQrCodeUrl: null,
        upiInstructions: "Scan the QR code or pay to the UPI ID using any UPI app (Google Pay, PhonePe, Paytm). After completing payment, enter the 12-digit UTR / Transaction Reference number below to submit for verification.",
        defaultMethod: "none",
      },
    });
  }

  return config;
}

/**
 * Returns safe public payment configuration for customer-facing checkout UI.
 */
export async function getPublicPaymentConfig(): Promise<PublicPaymentConfig> {
  const config = await getPaymentConfig();

  return {
    cardEnabled: config.cardEnabled,
    stripeEnabled: config.stripeEnabled,
    paypalEnabled: config.paypalEnabled,
    upiEnabled: config.upiEnabled,
    upiId: config.upiEnabled ? config.upiId : null,
    upiDisplayName: config.upiEnabled ? config.upiDisplayName : null,
    upiQrCodeUrl: config.upiEnabled ? config.upiQrCodeUrl : null,
    upiInstructions: config.upiEnabled ? config.upiInstructions : null,
    defaultMethod: config.defaultMethod,
  };
}

/**
 * Updates the centralized payment configuration (Admin action).
 */
export async function updatePaymentConfig(data: {
  cardEnabled?: boolean;
  stripeEnabled?: boolean;
  paypalEnabled?: boolean;
  upiEnabled?: boolean;
  upiId?: string | null;
  upiDisplayName?: string | null;
  upiQrCodeUrl?: string | null;
  upiInstructions?: string | null;
  defaultMethod?: string;
}) {
  return prisma.systemPaymentConfig.upsert({
    where: { id: DEFAULT_CONFIG_ID },
    update: data,
    create: {
      id: DEFAULT_CONFIG_ID,
      cardEnabled: data.cardEnabled ?? true,
      stripeEnabled: data.stripeEnabled ?? true,
      paypalEnabled: data.paypalEnabled ?? false,
      upiEnabled: data.upiEnabled ?? false,
      upiId: data.upiId ?? null,
      upiDisplayName: data.upiDisplayName ?? "Smart Life Manager",
      upiQrCodeUrl: data.upiQrCodeUrl ?? null,
      upiInstructions: data.upiInstructions ?? null,
      defaultMethod: data.defaultMethod ?? "none",
    },
  });
}
