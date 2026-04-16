import "dotenv/config";
import { connectToDatabase } from "@/lib/mongodb";
import { createAdminUser } from "@/lib/admin-users";
import AdminUser from "@/models/AdminUser";

async function run() {
  const username = process.env.SEED_ADMIN_USERNAME?.trim() || "sthyra-admin";
  const password = process.env.SEED_ADMIN_PASSWORD?.trim() || "veranza-admin-2026";
  const displayName = process.env.SEED_ADMIN_DISPLAY_NAME?.trim() || "Primary Admin";

  await connectToDatabase();

  const existingUser = await AdminUser.findOne({
    username: username.toLowerCase(),
  })
    .select("_id username")
    .lean();

  if (existingUser) {
    console.log(`Admin user already exists: ${existingUser.username}`);
    return;
  }

  const user = await createAdminUser({
    username,
    password,
    displayName,
  });

  console.log(`Created initial admin user: ${user.username}`);
}

run()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed to seed admin user:", error);
    process.exit(1);
  });
