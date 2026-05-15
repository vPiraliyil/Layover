import type { Metadata } from "next";
import "./globals.css";
import 'mapbox-gl/dist/mapbox-gl.css';
import Providers from "./providers";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Layover",
  description: "Airport layover itinerary generator",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased flex flex-col h-screen overflow-hidden">
        <Providers>
          <Navbar />
          <main className="flex-1 overflow-hidden">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
