const { PrismaClient } = require("@prisma/client");
const { SignJWT } = require("jose");

async function check() {
  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findFirst();
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || "smart-life-manager-production-fallback-key-2026-32chars"
    );
    const token = await new SignJWT({
      sub: user.id,
      email: user.email,
      role: user.role || "user",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("30d")
      .sign(secret);

    // Test /premium
    const resPrem = await fetch("http://localhost:3000/premium", {
      headers: { Cookie: "slm_session=" + token },
    });
    console.log("GET /premium status:", resPrem.status);
    const textPrem = await resPrem.text();
    console.log("Contains Supercharge Your Smart Life:", textPrem.includes("Supercharge Your Smart Life"));
    console.log("Contains Plans:", textPrem.includes("Plans"));

    // Test /pricing
    const resPricing = await fetch("http://localhost:3000/pricing", {
      headers: { Cookie: "slm_session=" + token },
    });
    console.log("GET /pricing status:", resPricing.status);

    // Test /family
    const resFamily = await fetch("http://localhost:3000/family", {
      headers: { Cookie: "slm_session=" + token },
    });
    console.log("GET /family status:", resFamily.status);

    if (resPrem.status === 200 && resPricing.status === 200 && resFamily.status === 200) {
      console.log("\n[SUCCESS] All premium and family pages render HTTP 200 successfully!");
    } else {
      throw new Error("One or more pages failed to return HTTP 200");
    }
  } finally {
    await prisma.$disconnect();
  }
}

check().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
