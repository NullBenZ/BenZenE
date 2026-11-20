import type { Metadata } from "next";
import { DM_Mono, Fraunces, Hanken_Grotesk } from "next/font/google";
import "./globals.css";

const display = Fraunces({
  variable: "--font-display-family",
  subsets: ["latin"],
  style: "italic",
  weight: "variable",
});

const body = Hanken_Grotesk({
  variable: "--font-body-family",
  subsets: ["latin"],
  weight: "variable",
});

const mono = DM_Mono({
  variable: "--font-mono-family",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Shakti — Developer & Maker",
  description: "A personal portfolio and creative playground.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${mono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
