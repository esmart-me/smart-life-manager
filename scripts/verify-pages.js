const { SignJWT } = require("jose");

async function checkPages() {
  const secret = new TextEncoder().encode(
    process.env.JWT_SECRET || "smart-life-manager-production-fallback-key-2026-32chars"
  );
  const token = await new SignJWT({
    sub: "cmujg6el00000v824dxnzr3wz",
    email: "demo@smartlifemanager.local",
    role: "user",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);

  const routes = ["/", "/reminders", "/documents", "/finance", "/vehicles", "/subscriptions", "/dates"];

  for (const r of routes) {
    const res = await fetch("http://localhost:3000" + r, {
      headers: { Cookie: "slm_session=" + token },
    });
    console.log(`Route ${r.padEnd(16)}: HTTP ${res.status}`);
  }
}

checkPages();
