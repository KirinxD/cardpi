// Promueve (o degrada) el rol de un usuario.
//
//   node scripts/set-admin.mjs <email> [USER|ADMIN]
//
// Por defecto promueve a ADMIN. Tras cambiar un rol hay que cerrar sesión
// y volver a entrar: el rol viaja en el JWT.
import { PrismaClient } from "@prisma/client";

const [, , email, newRole = "ADMIN"] = process.argv;

if (!email || !["ADMIN", "USER"].includes(newRole)) {
  console.error("Uso: node scripts/set-admin.mjs <email> [USER|ADMIN]");
  process.exit(1);
}

const prisma = new PrismaClient();

try {
  const user = await prisma.user.update({
    where: { email },
    data: { role: newRole },
    select: { name: true, email: true, role: true },
  });
  console.log(`OK: ${user.name} <${user.email}> ahora es ${user.role}`);
} catch {
  console.error(`No existe ningún usuario con email "${email}"`);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
