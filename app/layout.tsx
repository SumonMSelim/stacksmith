import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stacksmith",
  description:
    "Describe your app in one sentence, get a provisioned architecture plan powered by the Stripe Projects CLI.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
