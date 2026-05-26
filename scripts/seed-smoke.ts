import { prisma } from "../packages/shared/src/db";
import { hashSecret } from "../packages/shared/src/encryption";

async function main() {
  const existing = await prisma.apiKey.findUnique({
    where: { publicKey: "pk_test" },
  });
  if (existing) {
    console.log("Smoke data already seeded. API key projectId:", existing.projectId);
    return;
  }

  const user = await prisma.user.create({
    data: { email: "smoke@example.com", name: "Smoke Tester" },
  });
  const org = await prisma.organization.create({
    data: { name: "Smoke Org" },
  });
  await prisma.membership.create({
    data: { userId: user.id, organizationId: org.id, role: "OWNER" },
  });
  const project = await prisma.project.create({
    data: { name: "Smoke Project", organizationId: org.id },
  });
  const hashed = await hashSecret("sk_test");
  const apiKey = await prisma.apiKey.create({
    data: {
      publicKey: "pk_test",
      hashedSecretKey: hashed,
      displayName: "Smoke Key",
      projectId: project.id,
      userId: user.id,
    },
  });
  console.log("Seeded:", {
    userId: user.id,
    orgId: org.id,
    projectId: project.id,
    apiKeyId: apiKey.id,
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
