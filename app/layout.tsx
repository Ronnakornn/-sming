import type { Metadata } from "next";
import type { ReactNode } from "react";
import Header from "#/components/Header";
import Footer from "#/components/Footer";
import { Providers } from "#/providers";
import "./styles.css";

export const metadata: Metadata = {
  title: "Todo App",
  description:
    "Full-stack todo app template with Next.js, Elysia, Prisma, and Better Auth.",
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen">
        <Providers>
          <Header />
          <main className="min-h-[calc(100vh-80px)]">{children}</main>
        </Providers>
        <Footer />
      </body>
    </html>
  );
}
