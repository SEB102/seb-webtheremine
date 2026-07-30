import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://seb102.github.io/seb-webtheremine/"),
  title: {
    default: "SEB WebThérémine",
    template: "%s · SEB WebThérémine",
  },
  description: "Un contrôleur MIDI gestuel MediaPipe pour Mac et iPad.",
  applicationName: "SEB WebThérémine",
  manifest:
    "https://seb102.github.io/seb-webtheremine/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "WebThérémine",
  },
  openGraph: {
    title: "SEB WebThérémine",
    description: "Le contrôleur MIDI gestuel — Mac & iPad",
    images: [
      {
        url: "https://seb102.github.io/seb-webtheremine/og.png",
        width: 1200,
        height: 630,
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SEB WebThérémine",
    description: "Le contrôleur MIDI gestuel — Mac & iPad",
    images: ["https://seb102.github.io/seb-webtheremine/og.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#060a09",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
