import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(6),
});

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const usuario = await prisma.usuario.findUnique({
          where: { email: parsed.data.email },
        });
        if (!usuario) {
          return null;
        }

        const ok = await bcrypt.compare(parsed.data.password, usuario.password);
        if (!ok) {
          return null;
        }

        return {
          id: usuario.id,
          email: usuario.email,
          nombre: usuario.nombre,
          radioId: usuario.radioId,
          rol: usuario.rol,
        };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        const casted = user as unknown as { nombre?: string; radioId?: string; rol?: "ADMIN" | "OPERADOR" };
        token.id = user.id;
        token.email = user.email ?? "";
        token.nombre = casted.nombre ?? "";
        token.radioId = casted.radioId ?? "";
        token.rol = casted.rol ?? "OPERADOR";
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.nombre = token.nombre;
        session.user.radioId = token.radioId;
        session.user.rol = token.rol;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
};
