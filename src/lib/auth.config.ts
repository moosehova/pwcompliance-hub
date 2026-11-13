import type { NextAuthConfig } from "next-auth";

// Edge-safe config: no Prisma, no bcrypt, no Node.js-only imports.
// Used by the middleware so the edge bundle stays under 1 MB.
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = nextUrl;
      const isAuthPage = pathname.startsWith("/auth");
      const isApiAuth = pathname.startsWith("/api/auth");
      const isPublic = isAuthPage || isApiAuth || pathname === "/";

      if (isLoggedIn && isAuthPage) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }
      if (!isLoggedIn && !isPublic) return false;
      return true;
    },
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (token?.id && session.user) session.user.id = token.id as string;
      return session;
    },
  },
};
