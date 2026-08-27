// Thin compatibility barrel: the screens live in src/features/* now.
// Route files can import from here or directly from the feature modules.
export { Login } from "./features/auth/Login";
export { PublicMenu } from "./features/public/PublicMenu";
export { Admin } from "./features/workspace/Admin";
export { Superadmin } from "./features/superadmin/Superadmin";
