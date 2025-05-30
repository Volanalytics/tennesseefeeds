import { Inter } from "next/font/google";
import { TrackingProvider } from "@/components/providers/tracking-provider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Tennessee Feeds",
  description: "Your source for Tennessee news and information",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <TrackingProvider>
          {children}
        </TrackingProvider>
      </body>
    </html>
  );
}
