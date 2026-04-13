import { prisma } from "#server/lib/prisma.ts";

function parseAdminEmails() {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

async function main() {
  const emails = parseAdminEmails();

  if (emails.length === 0) {
    throw new Error("ADMIN_EMAILS is required. Example: ADMIN_EMAILS=admin@example.com");
  }

  const result = await prisma.user.updateMany({
    where: { email: { in: emails } },
    data: { role: "ADMIN" },
  });

  if (result.count === 0) {
    throw new Error(
      `No matching users found for ADMIN_EMAILS: ${emails.join(", ")}. Create the account first, then run db:seed-admin.`,
    );
  }

  console.log(`Promoted ${result.count} user(s) to ADMIN.`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
