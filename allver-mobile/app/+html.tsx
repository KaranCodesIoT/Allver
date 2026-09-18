import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

// This file is web-only and used to configure the root HTML for every
// web page during static rendering.
// The contents of this function only run in Node.js environments and
// do not have access to the DOM or browser APIs.
export default function Root({ children }: PropsWithChildren) {
  const googleMapsKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/* Search Engine & Crawler Optimization */}
        <title>Allver - India's Construction Marketplace | Hire Contractors, Architects & Labour</title>
        <meta
          name="description"
          content="Allver connects Contractors, Architects, Skilled Labourers, and Clients across India on one digital marketplace to plan, build, and renovate smarter."
        />
        <meta
          name="keywords"
          content="construction marketplace, hire contractor India, architect portfolio, skilled labour India, civil construction, building trades, Allver"
        />
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
        <meta name="author" content="Allver Construction Marketplace" />
        <link rel="canonical" href="https://allver.in" />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://allver.in" />
        <meta property="og:site_name" content="Allver" />
        <meta property="og:title" content="Allver - India's Construction Marketplace" />
        <meta
          property="og:description"
          content="Connect with verified Contractors, Architects, and Skilled Labourers on allver.in to build faster and smarter."
        />
        <meta property="og:image" content="https://allver.in/favicon.png" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Allver - India's Construction Marketplace" />
        <meta
          name="twitter:description"
          content="Connect with verified Contractors, Architects, and Skilled Labourers on allver.in."
        />
        <meta name="twitter:image" content="https://allver.in/favicon.png" />

        {/* Favicons for Google Search & Browsers */}
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/favicon.png" />

        {/* Google Maps JavaScript API with Places Library */}
        {googleMapsKey ? (
          <script
            async
            defer
            src={`https://maps.googleapis.com/maps/api/js?key=${googleMapsKey}&libraries=places,geometry&v=weekly`}
          />
        ) : null}

        {/* Google AdSense Verification Script */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4740978653960471"
          crossOrigin="anonymous"
        />

        {/* 
          Disable body scrolling on web. This makes ScrollView components work closer to how they do on native. 
          However, body scrolling is often nice to have for mobile web. If you want to enable it, remove this line.
        */}
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
