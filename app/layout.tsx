import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/src/components/theme-provider";
import { ClientLayout } from "@/src/components/client-layout";

export const metadata: Metadata = {
  title: "Café Aroma",
  description: "A full-stack café management system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider defaultTheme="light" storageKey="cafe-aroma-theme">
          <ClientLayout>{children}</ClientLayout>
        </ThemeProvider>
      </body>
    </html>
  );
}
