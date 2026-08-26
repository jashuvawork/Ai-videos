import { prisma } from "@/lib/db";
import { env } from "@/config/env";

export async function getOrCreateDevUser() {
  const user = await prisma.user.upsert({
    where: { email: "dev@aivideostudio.local" },
    create: {
      id: env.DEV_USER_ID,
      email: "dev@aivideostudio.local",
      name: "Developer",
    },
    update: {},
  });
  return user;
}

export async function getSessionUser() {
  // MVP: return dev user. Replace with real auth later.
  return getOrCreateDevUser();
}
