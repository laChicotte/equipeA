import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { StoreProvider } from "@/lib/store";
import { Toaster } from "@/components/ui";
import { IncomingCall } from "@/components/incoming-call";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lirel · Le mentorat qui connecte les talents",
  description: "Lirel met en relation des jeunes talents et des professionnels expérimentés : recommandation de mentors, séances en chat ou en visio, suivi des objectifs, ressources et opportunités.",
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#1B2533",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={inter.variable}>
      <body className="min-h-screen antialiased">
        <StoreProvider>
          {children}
          <Toaster />
          <IncomingCall />
        </StoreProvider>
      </body>
    </html>
  );
}
