import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";

import "./globals.css";

const hankenGrotesk = localFont({
  display: "swap",
  src: [
    {
      path: "./fonts/hanken-grotesk-latin-variable.woff2",
      style: "normal",
      weight: "300 700",
    },
    {
      path: "./fonts/hanken-grotesk-latin-ext-variable.woff2",
      style: "normal",
      weight: "300 700",
    },
  ],
  variable: "--font-hanken-grotesk",
});

const newsreader = localFont({
  display: "swap",
  src: [
    {
      path: "./fonts/newsreader-latin-variable.woff2",
      style: "normal",
      weight: "400 800",
    },
    {
      path: "./fonts/newsreader-latin-ext-variable.woff2",
      style: "normal",
      weight: "400 800",
    },
  ],
  variable: "--font-newsreader",
});

export const metadata: Metadata = {
  title: "Sombreado Floripa",
  description:
    "Escolha o lado do ônibus com menos sol direto em Florianópolis.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#faf9f5",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${hankenGrotesk.variable} ${newsreader.variable}`}>
        {children}
      </body>
    </html>
  );
}
