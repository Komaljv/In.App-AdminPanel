export function isAdminRole(role: any): boolean {
  if (!role) return false;

  const roleName = (
    typeof role === "string"
      ? role
      : role?.name
  ).toUpperCase();

  const adminRole = (
    process.env.NEXT_PUBLIC_ADMIN_ROLE_NAME || "MASTER"
  ).toUpperCase();

  return (
    roleName === adminRole ||
    roleName === "ADMIN"
  );
}

export function isAdminUser(user: any): boolean {
  if (!user) return false;

  return (
    user.isAdmin === true ||
    isAdminRole(user.role)
  );
}
export function isSystemAdmin(user: any): boolean {
  if (!user) return false;

  const roleName =
    typeof user.role === "string"
      ? user.role
      : user.role?.name;

  const systemAdminRole = (
    process.env.NEXT_PUBLIC_ADMIN_ROLE_NAME || "MASTER"
  ).toUpperCase();

  return roleName?.toUpperCase() === systemAdminRole;
}