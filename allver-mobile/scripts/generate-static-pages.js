/**
 * generate-static-pages.js
 * Pre-renders rich, crawlable, semantic HTML content into all public pages in allver-mobile/dist/
 * Specifically tailored for Googlebot and Google AdSense review crawlers.
 */

const fs = require('fs');
const path = require('path');

const DIST_DIR = path.resolve(__dirname, '..', 'dist');
const PUBLIC_DIR = path.resolve(__dirname, '..', 'public');
const BASE_TEMPLATE = path.join(DIST_DIR, 'index.html');

if (!fs.existsSync(DIST_DIR)) {
  console.error('[Error] dist directory does not exist. Run expo export first.');
  process.exit(1);
}

// Ensure public files exist in dist
const publicFiles = ['ads.txt', 'robots.txt', 'sitemap.xml', '_redirects', 'favicon.png', 'favicon.ico'];
publicFiles.forEach((file) => {
  const src = path.join(PUBLIC_DIR, file);
  const dest = path.join(DIST_DIR, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`[Copied] ${file} -> dist/${file}`);
  }
});

// Common Navigation Header HTML
const commonHeader = `
<header style="background-color: #0F172A; color: #FFFFFF; padding: 14px 24px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; border-bottom: 1px solid #1E293B;">
  <div style="display: flex; align-items: center; gap: 12px;">
    <a href="/" style="display: flex; align-items: center; gap: 10px; text-decoration: none; color: #FFFFFF;">
      <div style="width: 38px; height: 38px; border-radius: 10px; background: linear-gradient(135deg, #10B981, #047857); display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 20px; color: #FFFFFF;">A</div>
      <span style="font-size: 20px; font-weight: 800; letter-spacing: -0.5px;">Allver</span>
    </a>
    <span style="font-size: 11px; background-color: #064E3B; color: #34D399; padding: 3px 8px; border-radius: 12px; font-weight: 700; text-transform: uppercase;">Construction Marketplace</span>
  </div>
  <nav style="display: flex; align-items: center; gap: 18px; flex-wrap: wrap;">
    <a href="/" style="color: #E2E8F0; text-decoration: none; font-size: 13.5px; font-weight: 600;">Home</a>
    <a href="/services" style="color: #E2E8F0; text-decoration: none; font-size: 13.5px; font-weight: 600;">Services</a>
    <a href="/how-it-works" style="color: #E2E8F0; text-decoration: none; font-size: 13.5px; font-weight: 600;">How It Works</a>
    <a href="/contractors" style="color: #E2E8F0; text-decoration: none; font-size: 13.5px; font-weight: 600;">Contractors</a>
    <a href="/architects" style="color: #E2E8F0; text-decoration: none; font-size: 13.5px; font-weight: 600;">Architects</a>
    <a href="/labours" style="color: #E2E8F0; text-decoration: none; font-size: 13.5px; font-weight: 600;">Skilled Labour</a>
    <a href="/about" style="color: #E2E8F0; text-decoration: none; font-size: 13.5px; font-weight: 600;">About</a>
    <a href="/faq" style="color: #E2E8F0; text-decoration: none; font-size: 13.5px; font-weight: 600;">FAQ</a>
    <a href="/contact" style="color: #E2E8F0; text-decoration: none; font-size: 13.5px; font-weight: 600;">Contact</a>
  </nav>
</header>
`;

// Common Footer HTML
const commonFooter = `
<footer style="background-color: #0F172A; color: #94A3B8; padding: 48px 24px 24px 24px; border-top: 1px solid #1E293B; margin-top: 48px; font-size: 13.5px; line-height: 1.6;">
  <div style="max-width: 1140px; margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 32px; margin-bottom: 36px;">
    <div>
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
        <div style="width: 28px; height: 28px; border-radius: 7px; background: #10B981; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 16px; color: #FFFFFF;">A</div>
        <span style="font-size: 18px; font-weight: 800; color: #FFFFFF;">Allver</span>
      </div>
      <p style="color: #94A3B8; margin: 0 0 12px 0;">India's unified digital construction marketplace connecting clients, general contractors, architects, and skilled tradesmen to plan, build, and renovate smarter.</p>
      <p style="color: #CBD5E1; margin: 0; font-size: 12.5px;">Domain: <strong style="color: #34D399;">allver.in</strong></p>
    </div>

    <div>
      <h3 style="color: #FFFFFF; font-size: 15px; font-weight: 700; margin: 0 0 14px 0;">Marketplace Directories</h3>
      <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px;">
        <li><a href="/contractors" style="color: #94A3B8; text-decoration: none;">Civil & General Contractors</a></li>
        <li><a href="/architects" style="color: #94A3B8; text-decoration: none;">Architects & Interior Designers</a></li>
        <li><a href="/labours" style="color: #94A3B8; text-decoration: none;">Skilled Workforce & Trades</a></li>
        <li><a href="/services" style="color: #94A3B8; text-decoration: none;">All Construction Services</a></li>
      </ul>
    </div>

    <div>
      <h3 style="color: #FFFFFF; font-size: 15px; font-weight: 700; margin: 0 0 14px 0;">Platform Information</h3>
      <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px;">
        <li><a href="/about" style="color: #94A3B8; text-decoration: none;">About Allver</a></li>
        <li><a href="/how-it-works" style="color: #94A3B8; text-decoration: none;">How the Platform Works</a></li>
        <li><a href="/faq" style="color: #94A3B8; text-decoration: none;">Frequently Asked Questions</a></li>
        <li><a href="/contact" style="color: #94A3B8; text-decoration: none;">Contact & Support Desk</a></li>
      </ul>
    </div>

    <div>
      <h3 style="color: #FFFFFF; font-size: 15px; font-weight: 700; margin: 0 0 14px 0;">Legal & Transparency</h3>
      <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px;">
        <li><a href="/privacy-policy" style="color: #94A3B8; text-decoration: none;">Privacy & Cookie Policy</a></li>
        <li><a href="/terms" style="color: #94A3B8; text-decoration: none;">Terms of Service</a></li>
        <li><a href="/contact" style="color: #94A3B8; text-decoration: none;">Grievance Redressal (IT Rules 2021)</a></li>
        <li><span style="color: #64748B;">Official Email: contact@allver.in</span></li>
      </ul>
    </div>
  </div>

  <div style="max-width: 1140px; margin: 0 auto; padding-top: 20px; border-top: 1px solid #1E293B; text-align: center; color: #64748B; font-size: 12px;">
    © 2026 Allver Construction Marketplace (allver.in). All rights reserved. Operating across India.
  </div>
</footer>
`;

// Page Definitions
const PAGES = [
  {
    file: 'index.html',
    path: '/',
    title: "Allver - India's Construction Marketplace | Hire Contractors, Architects & Labour",
    desc: "Allver connects property owners, verified contractors, certified architects, and skilled construction labour across India. Plan, estimate, and build smarter on allver.in.",
    content: `
      <section style="background: linear-gradient(180deg, #0F172A 0%, #1E293B 100%); color: #FFFFFF; padding: 64px 24px; text-align: center;">
        <div style="max-width: 860px; margin: 0 auto;">
          <span style="background-color: #064E3B; color: #34D399; font-size: 12px; font-weight: 800; padding: 6px 14px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.8px;">India's Unified Building Ecosystem</span>
          <h1 style="font-size: 38px; font-weight: 900; margin: 20px 0 16px 0; line-height: 1.25;">One Platform. Every Construction Need Across India.</h1>
          <p style="font-size: 16px; color: #CBD5E1; line-height: 1.6; margin-bottom: 28px;">
            Allver organizes the fragmented Indian building trade sector. Whether you are building an independent villa, developing commercial real estate, or seeking verified daily tradesmen, discover licensed general contractors, accredited architects, and experienced construction labour in one place.
          </p>
          <div style="display: flex; justify-content: center; gap: 14px; flex-wrap: wrap;">
            <a href="/contractors" style="background-color: #10B981; color: #FFFFFF; text-decoration: none; padding: 13px 26px; border-radius: 10px; font-weight: 700; font-size: 14.5px;">Find Contractors</a>
            <a href="/architects" style="background-color: #1E293B; color: #FFFFFF; text-decoration: none; padding: 13px 26px; border-radius: 10px; font-weight: 700; font-size: 14.5px; border: 1px solid #334155;">Find Architects</a>
            <a href="/labours" style="background-color: #EA580C; color: #FFFFFF; text-decoration: none; padding: 13px 26px; border-radius: 10px; font-weight: 700; font-size: 14.5px;">Hire Skilled Labour</a>
          </div>
        </div>
      </section>

      <main style="max-width: 1140px; margin: 48px auto; padding: 0 24px; font-size: 15px; line-height: 1.7; color: #334155;">
        <section style="margin-bottom: 56px;">
          <h2 style="font-size: 26px; font-weight: 800; color: #0F172A; margin-bottom: 16px;">The Problem Allver Solves in the Indian Construction Sector</h2>
          <p>
            The construction industry in India has traditionally relied on unvetted word-of-mouth recommendations, unorganized labor chowks, opaque contractor pricing, and fragmented communication between designers and site executors. This lack of transparency frequently leads to budget overruns, structural delays, and quality disputes.
          </p>
          <p>
            Allver introduces digital organization, transparency, and accountability to the construction workflow. By centralizing verified professional portfolios, direct milestone communications, and structured service directories, Allver enables property owners and builders to collaborate with confidence.
          </p>
        </section>

        <section style="margin-bottom: 56px;">
          <h2 style="font-size: 26px; font-weight: 800; color: #0F172A; margin-bottom: 24px;">Who Allver Is Built For</h2>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 24px;">
            <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 14px; padding: 24px;">
              <h3 style="font-size: 18px; font-weight: 700; color: #0F172A; margin-top: 0;">For Homeowners & Clients</h3>
              <p>Hire verified civil contractors, view authentic past project photos, request itemized quotes, and manage project progress without paying hidden middleman markups.</p>
            </div>
            <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 14px; padding: 24px;">
              <h3 style="font-size: 18px; font-weight: 700; color: #0F172A; margin-top: 0;">For Civil & General Contractors</h3>
              <p>Build a recognized digital brand, acquire verified residential and commercial leads, staff specialized trades on demand, and document milestone agreements.</p>
            </div>
            <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 14px; padding: 24px;">
              <h3 style="font-size: 18px; font-weight: 700; color: #0F172A; margin-top: 0;">For Architects & Designers</h3>
              <p>Showcase sanctioned floor plans, 3D architectural elevations, and interior portfolios. Connect directly with clients and coordinate with site contractors.</p>
            </div>
            <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 14px; padding: 24px;">
              <h3 style="font-size: 18px; font-weight: 700; color: #0F172A; margin-top: 0;">For Skilled Trade Workers</h3>
              <p>Gain direct access to daily wage and task-based work in masonry, electrical, plumbing, painting, and tiling with transparent benchmark rates and prompt settlement.</p>
            </div>
          </div>
        </section>

        <section style="margin-bottom: 56px;">
          <h2 style="font-size: 26px; font-weight: 800; color: #0F172A; margin-bottom: 20px;">Comprehensive Construction Services</h2>
          <p style="margin-bottom: 24px;">From raw land foundation casting to turnkey interior handover, Allver covers every phase of construction:</p>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px;">
            <div style="padding: 18px; border-left: 4px solid #10B981; background-color: #F0FDF4; border-radius: 8px;">
              <h4 style="margin: 0 0 6px 0; font-size: 16px; color: #166534;">Residential & Villa Construction</h4>
              <p style="margin: 0; font-size: 13.5px; color: #15803D;">Turnkey civil contracting, RCC structural framing, brickwork, plastering, and waterproofing conforming to National Building Code (NBC) standards.</p>
            </div>
            <div style="padding: 18px; border-left: 4px solid #2563EB; background-color: #EFF6FF; border-radius: 8px;">
              <h4 style="margin: 0 0 6px 0; font-size: 16px; color: #1E40AF;">Commercial Fitouts & Retail</h4>
              <p style="margin: 0; font-size: 13.5px; color: #1D4ED8;">Office renovations, retail storefronts, industrial steel structural fabrication, and commercial MEP services.</p>
            </div>
            <div style="padding: 18px; border-left: 4px solid #7C3AED; background-color: #FAF5FF; border-radius: 8px;">
              <h4 style="margin: 0 0 6px 0; font-size: 16px; color: #5B21B6;">Architectural Design & 3D Plans</h4>
              <p style="margin: 0; font-size: 13.5px; color: #6B21A8;">Municipal sanctioned blueprints, structural engineering calculations, 3D exterior elevations, and modern space planning.</p>
            </div>
            <div style="padding: 18px; border-left: 4px solid #EA580C; background-color: #FFF7ED; border-radius: 8px;">
              <h4 style="margin: 0 0 6px 0; font-size: 16px; color: #9A3412;">Specialized Building Trades</h4>
              <p style="margin: 0; font-size: 13.5px; color: #C2410C;">Concealed electrical wiring, certified plumbing & drainage, false ceiling framing, vitrified/marble flooring, and weather-proof exterior painting.</p>
            </div>
          </div>
        </section>

        <section style="background-color: #FEF9EE; border: 1px solid #F3E5C8; border-radius: 16px; padding: 28px; text-align: center;">
          <h2 style="font-size: 22px; font-weight: 800; color: #92400E; margin-top: 0;">Explore Our Knowledge Base & Guides</h2>
          <p style="color: #78350F; max-width: 680px; margin: 0 auto 20px auto;">
            Learn how Allver operates, review our vetting standards, or browse practical answers to common construction hiring questions.
          </p>
          <div style="display: flex; justify-content: center; gap: 16px; flex-wrap: wrap;">
            <a href="/how-it-works" style="color: #B45309; font-weight: 700; text-decoration: underline;">How Allver Works</a>
            <a href="/services" style="color: #B45309; font-weight: 700; text-decoration: underline;">All Services Catalog</a>
            <a href="/faq" style="color: #B45309; font-weight: 700; text-decoration: underline;">Frequently Asked Questions</a>
            <a href="/contact" style="color: #B45309; font-weight: 700; text-decoration: underline;">Contact Support Desk</a>
          </div>
        </section>
      </main>
    `
  },
  {
    file: 'about.html',
    path: '/about',
    title: "About Allver | India's Unified Construction & Building Trade Platform",
    desc: "Learn about Allver's mission, operational scope, verification standards, and leadership in digitizing India's construction and building trade marketplace.",
    content: `
      <section style="background-color: #0F172A; color: #FFFFFF; padding: 56px 24px; text-align: center;">
        <div style="max-width: 800px; margin: 0 auto;">
          <span style="color: #34D399; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px;">Corporate Overview</span>
          <h1 style="font-size: 36px; font-weight: 900; margin: 16px 0 12px 0;">About Allver Construction Marketplace</h1>
          <p style="font-size: 16px; color: #CBD5E1; line-height: 1.6;">One digital platform uniting India's property owners, licensed contractors, accredited architects, and skilled tradesmen.</p>
        </div>
      </section>

      <main style="max-width: 960px; margin: 48px auto; padding: 0 24px; font-size: 15px; line-height: 1.7; color: #334155;">
        <section style="margin-bottom: 48px;">
          <h2 style="font-size: 24px; font-weight: 800; color: #0F172A; margin-bottom: 16px;">Our Core Mission</h2>
          <p>
            Allver was founded with a clear mission: to digitize, organize, and elevate India’s multi-billion-dollar construction and building trade ecosystem. For decades, the construction industry has remained one of the most fragmented and digitally underserved sectors in the country. Project owners struggle to find vetted civil professionals, while talented contractors and trade workers remain constrained by limited localized word-of-mouth networks.
          </p>
          <p>
            Allver bridges this gap through a unified digital marketplace. We provide contractors, design architects, and tradesmen with a verifiable digital portfolio while providing homeowners and commercial developers with transparent hiring tools, itemized milestones, and direct communication.
          </p>
        </section>

        <section style="margin-bottom: 48px;">
          <h2 style="font-size: 24px; font-weight: 800; color: #0F172A; margin-bottom: 16px;">Verification & Quality Standards</h2>
          <p>Credibility is the foundation of the Allver marketplace. We emphasize formal verification protocols:</p>
          <ul style="padding-left: 20px; margin-bottom: 20px; display: flex; flex-direction: column; gap: 8px;">
            <li><strong>Contracting Entities:</strong> Business registration proof, GSTIN documentation, and documented photographic records of past site executions.</li>
            <li><strong>Architects & Designers:</strong> Architectural degree credentials, Council of Architecture (CoA) registration where applicable, and high-resolution portfolio validation.</li>
            <li><strong>Skilled Tradesmen:</strong> Identity verification, trade experience checks, and skill-level evaluations across masonry, electrical, plumbing, painting, and carpentry.</li>
          </ul>
        </section>

        <section style="margin-bottom: 48px;">
          <h2 style="font-size: 24px; font-weight: 800; color: #0F172A; margin-bottom: 16px;">Nationwide Operational Scope</h2>
          <p>
            Allver serves regional building clusters across India, focusing on both high-density metropolitan areas and rapid-growth tier-2 urban corridors including Delhi NCR, Mumbai Metropolitan Region, Bengaluru, Hyderabad, Pune, and Jaipur. Our digital architecture is engineered to support regional language localization and local municipal building compliance.
          </p>
        </section>

        <section style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 14px; padding: 28px;">
          <h2 style="font-size: 20px; font-weight: 800; color: #0F172A; margin-top: 0;">Official Inquiries & Contact</h2>
          <p style="margin-bottom: 12px;">For business partnerships, enterprise contractor onboarding, or platform support:</p>
          <p style="margin: 0 0 6px 0;"><strong>Primary Contact:</strong> <a href="mailto:contact@allver.in" style="color: #10B981; font-weight: 700;">contact@allver.in</a></p>
          <p style="margin: 0;"><strong>Support Desk:</strong> <a href="mailto:support@allver.in" style="color: #10B981; font-weight: 700;">support@allver.in</a></p>
        </section>
      </main>
    `
  },
  {
    file: 'services.html',
    path: '/services',
    title: "Construction Services & Building Trades | Allver Marketplace",
    desc: "Explore Allver's complete catalog of construction services: turnkey residential building, commercial fitouts, architectural 3D planning, renovation, and skilled trades.",
    content: `
      <section style="background-color: #0F172A; color: #FFFFFF; padding: 56px 24px; text-align: center;">
        <div style="max-width: 800px; margin: 0 auto;">
          <span style="color: #34D399; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px;">Comprehensive Catalog</span>
          <h1 style="font-size: 36px; font-weight: 900; margin: 16px 0 12px 0;">Construction Services & Trades</h1>
          <p style="font-size: 16px; color: #CBD5E1; line-height: 1.6;">From initial architectural drafting and foundation engineering to turnkey interior finishes across India.</p>
        </div>
      </section>

      <main style="max-width: 1080px; margin: 48px auto; padding: 0 24px; font-size: 15px; line-height: 1.7; color: #334155;">
        <div style="display: flex; flex-direction: column; gap: 36px;">
          <article style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; padding: 28px;">
            <h2 style="font-size: 22px; font-weight: 800; color: #0F172A; margin-top: 0;">1. Residential Turnkey Construction</h2>
            <p>
              Complete home construction services for independent bungalows, duplexes, row houses, and multi-storey residences. Our verified civil contractors execute site excavation, foundation piling, RCC slab casting, brickwork, and plastering in accordance with the National Building Code (NBC).
            </p>
            <ul style="padding-left: 20px; margin: 0;">
              <li>Full structural execution with Grade 53 cement and Fe550D TMT reinforcement steel</li>
              <li>Itemized milestone contracts with transparent material specification tiers</li>
              <li>Waterproofing of foundation plinths, basements, and terrace slabs</li>
            </ul>
          </article>

          <article style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; padding: 28px;">
            <h2 style="font-size: 22px; font-weight: 800; color: #0F172A; margin-top: 0;">2. Commercial Construction & Fitouts</h2>
            <p>
              Commercial contracting solutions for corporate offices, retail spaces, warehouses, and hospitality venues. Services include pre-engineered steel buildings, structural glazing, acoustic ceiling installations, and certified MEP (Mechanical, Electrical, Plumbing) integration.
            </p>
          </article>

          <article style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; padding: 28px;">
            <h2 style="font-size: 22px; font-weight: 800; color: #0F172A; margin-top: 0;">3. Architectural Planning & 3D Visualizations</h2>
            <p>
              Certified architects provide municipal sanctioned floor plans, 3D exterior elevation renders, structural load calculations, and Vastu-compliant residential layouts. Bridge the gap between conceptual designs and on-site contractor execution.
            </p>
          </article>

          <article style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; padding: 28px;">
            <h2 style="font-size: 22px; font-weight: 800; color: #0F172A; margin-top: 0;">4. Specialized Trades & On-Demand Workforce</h2>
            <p>
              Hire skilled tradesmen for task-based or daily wage jobs:
            </p>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-top: 14px;">
              <div style="background-color: #F8FAFC; padding: 14px; border-radius: 8px; border: 1px solid #E2E8F0;">
                <h4 style="margin: 0 0 4px 0; color: #0F172A;">Masonry & Brickwork</h4>
                <p style="margin: 0; font-size: 13px; color: #64748B;">Brick laying, blockwork, plastering, and RCC concrete casting.</p>
              </div>
              <div style="background-color: #F8FAFC; padding: 14px; border-radius: 8px; border: 1px solid #E2E8F0;">
                <h4 style="margin: 0 0 4px 0; color: #0F172A;">Concealed Electrical</h4>
                <p style="margin: 0; font-size: 13px; color: #64748B;">Conduit piping, wire pulling, distribution board dressing, and earthing.</p>
              </div>
              <div style="background-color: #F8FAFC; padding: 14px; border-radius: 8px; border: 1px solid #E2E8F0;">
                <h4 style="margin: 0 0 4px 0; color: #0F172A;">Plumbing & Drainage</h4>
                <p style="margin: 0; font-size: 13px; color: #64748B;">CPVC/UPVC water supply, SWR drainage lines, and sanitary fitting.</p>
              </div>
              <div style="background-color: #F8FAFC; padding: 14px; border-radius: 8px; border: 1px solid #E2E8F0;">
                <h4 style="margin: 0 0 4px 0; color: #0F172A;">Painting & Waterproofing</h4>
                <p style="margin: 0; font-size: 13px; color: #64748B;">Putty application, emulsion coating, texture finish, and damp proofing.</p>
              </div>
            </div>
          </article>
        </div>
      </main>
    `
  },
  {
    file: 'how-it-works.html',
    path: '/how-it-works',
    title: "How Allver Works | Step-by-Step Construction Hiring Guide",
    desc: "Discover how Allver connects clients with verified contractors, architects, and skilled labour through a transparent 4-step hiring and project tracking workflow.",
    content: `
      <section style="background-color: #0F172A; color: #FFFFFF; padding: 56px 24px; text-align: center;">
        <div style="max-width: 800px; margin: 0 auto;">
          <span style="color: #34D399; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px;">Platform Process</span>
          <h1 style="font-size: 36px; font-weight: 900; margin: 16px 0 12px 0;">How Allver Operates</h1>
          <p style="font-size: 16px; color: #CBD5E1; line-height: 1.6;">A structured, transparent methodology replacing disorganized offline contractor hiring.</p>
        </div>
      </section>

      <main style="max-width: 960px; margin: 48px auto; padding: 0 24px; font-size: 15px; line-height: 1.7; color: #334155;">
        <div style="display: flex; flex-direction: column; gap: 32px; margin-bottom: 48px;">
          <div style="border-left: 4px solid #10B981; padding-left: 20px;">
            <span style="font-size: 12px; font-weight: 800; color: #10B981; text-transform: uppercase;">Step 01</span>
            <h2 style="font-size: 20px; font-weight: 800; color: #0F172A; margin: 4px 0 8px 0;">Define Project Requirements</h2>
            <p>Property owners or commercial builders define their project scope: whether full turnkey construction, floor plan drafting, or trade labour requirements. Include your site location, plot dimensions, and target completion timeline.</p>
          </div>

          <div style="border-left: 4px solid #2563EB; padding-left: 20px;">
            <span style="font-size: 12px; font-weight: 800; color: #2563EB; text-transform: uppercase;">Step 02</span>
            <h2 style="font-size: 20px; font-weight: 800; color: #0F172A; margin: 4px 0 8px 0;">Discover & Compare Verified Experts</h2>
            <p>Browse detailed public profiles of contractors, architects, and trade specialists in your area. Review documented photographs of completed sites, client ratings, and verified credentials.</p>
          </div>

          <div style="border-left: 4px solid #7C3AED; padding-left: 20px;">
            <span style="font-size: 12px; font-weight: 800; color: #7C3AED; text-transform: uppercase;">Step 03</span>
            <h2 style="font-size: 20px; font-weight: 800; color: #0F172A; margin: 4px 0 8px 0;">Transparent Quotations & Clear Terms</h2>
            <p>Communicate directly with professionals. Receive itemized estimates outlining material specifications (e.g. cement brands, steel grades) and milestone schedules without hidden intermediary markups.</p>
          </div>

          <div style="border-left: 4px solid #EA580C; padding-left: 20px;">
            <span style="font-size: 12px; font-weight: 800; color: #EA580C; text-transform: uppercase;">Step 04</span>
            <h2 style="font-size: 20px; font-weight: 800; color: #0F172A; margin: 4px 0 8px 0;">Execute & Verify Milestones</h2>
            <p>Coordinate construction progress through platform updates and milestone inspections. Maintain transparent records from foundation casting to structural handover.</p>
          </div>
        </div>

        <section style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 14px; padding: 28px;">
          <h3 style="font-size: 18px; font-weight: 800; color: #0F172A; margin-top: 0;">Have Questions About Project Protection?</h3>
          <p>Read our detailed guides on milestone structures, dispute resolution, and contractor vetting.</p>
          <a href="/faq" style="color: #10B981; font-weight: 700; text-decoration: underline;">Read Frequently Asked Questions →</a>
        </section>
      </main>
    `
  },
  {
    file: 'faq.html',
    path: '/faq',
    title: "Frequently Asked Questions | Allver Construction Help Desk",
    desc: "Find detailed answers about hiring contractors, architectural drawings, skilled worker rates, milestone payments, and verification standards on Allver.",
    content: `
      <section style="background-color: #0F172A; color: #FFFFFF; padding: 56px 24px; text-align: center;">
        <div style="max-width: 800px; margin: 0 auto;">
          <span style="color: #34D399; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px;">Help Desk</span>
          <h1 style="font-size: 36px; font-weight: 900; margin: 16px 0 12px 0;">Frequently Asked Questions</h1>
          <p style="font-size: 16px; color: #CBD5E1; line-height: 1.6;">Authentic answers regarding contractor hiring, architectural portfolios, worker wages, and platform terms.</p>
        </div>
      </section>

      <main style="max-width: 960px; margin: 48px auto; padding: 0 24px; font-size: 15px; line-height: 1.7; color: #334155;">
        <div style="display: flex; flex-direction: column; gap: 24px;">
          <div style="border-bottom: 1px solid #E2E8F0; padding-bottom: 20px;">
            <h2 style="font-size: 18px; font-weight: 700; color: #0F172A; margin: 0 0 8px 0;">What is Allver and how does the platform operate?</h2>
            <p style="margin: 0; color: #475569;">Allver (allver.in) is India’s unified digital construction marketplace connecting property owners, commercial builders, general civil contractors, accredited architects, and skilled daily trade workers across India to plan, estimate, staff, and execute building projects efficiently.</p>
          </div>

          <div style="border-bottom: 1px solid #E2E8F0; padding-bottom: 20px;">
            <h2 style="font-size: 18px; font-weight: 700; color: #0F172A; margin: 0 0 8px 0;">How are contractors and architects vetted on Allver?</h2>
            <p style="margin: 0; color: #475569;">Contractors and architects submit identity details, business registrations (GSTIN/firm registration where applicable), Council of Architecture credentials for architects, and documented photographic evidence of completed real-world projects before receiving verified platform status.</p>
          </div>

          <div style="border-bottom: 1px solid #E2E8F0; padding-bottom: 20px;">
            <h2 style="font-size: 18px; font-weight: 700; color: #0F172A; margin: 0 0 8px 0;">Can I hire skilled trade workers for daily wage tasks?</h2>
            <p style="margin: 0; color: #475569;">Yes. Allver provides a dedicated workforce directory where clients and contractors can hire experienced masons, plumbers, electricians, carpenters, painters, and tile experts for short-term daily assignments or task-based contracts with transparent benchmark rates.</p>
          </div>

          <div style="border-bottom: 1px solid #E2E8F0; padding-bottom: 20px;">
            <h2 style="font-size: 18px; font-weight: 700; color: #0F172A; margin: 0 0 8px 0;">How do milestone payments work?</h2>
            <p style="margin: 0; color: #475569;">Allver promotes milestone-based execution where project payments are broken down into verifiable physical phases (e.g. foundation completion, slab casting, brickwork, finishing). Funds are only released upon mutual verification of completed construction stages.</p>
          </div>

          <div style="border-bottom: 1px solid #E2E8F0; padding-bottom: 20px;">
            <h2 style="font-size: 18px; font-weight: 700; color: #0F172A; margin: 0 0 8px 0;">Are architectural blueprints and intellectual property protected?</h2>
            <p style="margin: 0; color: #475569;">Yes. Architects and interior designers retain full intellectual property ownership of their original designs. Shared files within project workspaces are protected under our Terms of Service and data confidentiality protocols.</p>
          </div>

          <div style="border-bottom: 1px solid #E2E8F0; padding-bottom: 20px;">
            <h2 style="font-size: 18px; font-weight: 700; color: #0F172A; margin: 0 0 8px 0;">How can I reach Allver customer care and grievance support?</h2>
            <p style="margin: 0; color: #475569;">You can contact our support team at contact@allver.in or support@allver.in. Inquiries are reviewed within 24 to 48 business hours. For regulatory notices under Indian IT Rules, our Grievance Redressal details are published on our Contact and Terms pages.</p>
          </div>
        </div>
      </main>
    `
  },
  {
    file: 'contact.html',
    path: '/contact',
    title: "Contact Allver Support & Customer Care | Official Portal",
    desc: "Contact Allver construction marketplace support. Official contact email, support desk, business hours, and Grievance Officer details under India IT Rules.",
    content: `
      <section style="background-color: #0F172A; color: #FFFFFF; padding: 56px 24px; text-align: center;">
        <div style="max-width: 800px; margin: 0 auto;">
          <span style="color: #34D399; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px;">Get in Touch</span>
          <h1 style="font-size: 36px; font-weight: 900; margin: 16px 0 12px 0;">Contact Allver Customer Support</h1>
          <p style="font-size: 16px; color: #CBD5E1; line-height: 1.6;">Our dedicated team assists clients, contractors, architects, and workers across India.</p>
        </div>
      </section>

      <main style="max-width: 860px; margin: 48px auto; padding: 0 24px; font-size: 15px; line-height: 1.7; color: #334155;">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 24px; margin-bottom: 40px;">
          <div style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; padding: 24px;">
            <h2 style="font-size: 17px; font-weight: 700; color: #0F172A; margin-top: 0;">Official Contact Email</h2>
            <p style="margin: 8px 0;"><a href="mailto:contact@allver.in" style="color: #10B981; font-weight: 700; font-size: 16px;">contact@allver.in</a></p>
            <p style="font-size: 13px; color: #64748B; margin: 0;">For corporate partnerships, general enquiries, and contractor onboarding.</p>
          </div>

          <div style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; padding: 24px;">
            <h2 style="font-size: 17px; font-weight: 700; color: #0F172A; margin-top: 0;">Support Desk</h2>
            <p style="margin: 8px 0;"><a href="mailto:support@allver.in" style="color: #10B981; font-weight: 700; font-size: 16px;">support@allver.in</a></p>
            <p style="font-size: 13px; color: #64748B; margin: 0;">Operational Hours: Monday – Saturday, 9:00 AM to 6:30 PM IST. Turnaround: 24–48 hours.</p>
          </div>
        </div>

        <section style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 14px; padding: 28px; margin-bottom: 40px;">
          <h2 style="font-size: 18px; font-weight: 800; color: #0F172A; margin-top: 0;">Grievance Redressal Officer (India IT Rules 2021)</h2>
          <p style="margin-bottom: 12px;">In compliance with the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, user complaints or legal notices may be directed to:</p>
          <p style="margin: 0 0 6px 0;"><strong>Officer Email:</strong> <a href="mailto:contact@allver.in?subject=Grievance%20Notice" style="color: #10B981; font-weight: 700;">contact@allver.in</a></p>
          <p style="margin: 0; font-size: 13px; color: #64748B;">All grievance notices are acknowledged within 24 hours and addressed within regulatory timeframes.</p>
        </section>
      </main>
    `
  },
  {
    file: 'privacy-policy.html',
    path: '/privacy-policy',
    title: "Privacy Policy & Cookie Disclosures | Allver Marketplace",
    desc: "Allver's privacy policy, Google AdSense cookie disclosures, third-party advertising opt-out options, and data protection practices under Indian law.",
    content: `
      <section style="background-color: #0F172A; color: #FFFFFF; padding: 56px 24px; text-align: center;">
        <div style="max-width: 800px; margin: 0 auto;">
          <span style="color: #34D399; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px;">Legal & Compliance</span>
          <h1 style="font-size: 36px; font-weight: 900; margin: 16px 0 12px 0;">Privacy Policy</h1>
          <p style="font-size: 14px; color: #CBD5E1;">Last Updated: September 18, 2026</p>
        </div>
      </section>

      <main style="max-width: 900px; margin: 48px auto; padding: 0 24px; font-size: 14.5px; line-height: 1.7; color: #334155;">
        <p>This Privacy Policy explains how Allver (allver.in) collects, uses, stores, and protects information when you use our website, mobile application, and construction marketplace services.</p>

        <h2 style="font-size: 20px; font-weight: 800; color: #0F172A; margin-top: 32px;">1. Information We Collect</h2>
        <p>We collect information you provide directly, including account details (name, email, phone number), professional profile data (experience, skills, portfolio photos, location), and project communication records.</p>

        <h2 style="font-size: 20px; font-weight: 800; color: #0F172A; margin-top: 32px;">2. Third-Party Advertising & Google AdSense Disclosures</h2>
        <p>Allver (allver.in) partners with third-party advertising vendors, including Google AdSense, to serve advertisements when you visit our website.</p>
        <ul style="padding-left: 20px; display: flex; flex-direction: column; gap: 8px;">
          <li>Third-party vendors, including Google, use cookies to serve ads based on a user's prior visits to allver.in or other websites across the Internet.</li>
          <li>Google's use of advertising cookies enables it and its partners to serve personalized advertisements to users based on their visits to our website and other websites on the Internet.</li>
          <li>Users may opt out of personalized advertising by visiting <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" style="color: #10B981; font-weight: 700;">Google Ads Settings</a>.</li>
          <li>Alternatively, you can opt out of a third-party vendor's use of cookies for personalized advertising by visiting the Network Advertising Initiative or AboutAds at <a href="https://www.aboutads.info/choices" target="_blank" rel="noopener noreferrer" style="color: #10B981; font-weight: 700;">www.aboutads.info/choices</a>.</li>
        </ul>

        <h2 style="font-size: 20px; font-weight: 800; color: #0F172A; margin-top: 32px;">3. Cookies & Tracking Technologies</h2>
        <p>Allver uses cookies, web beacons, and local storage technologies to maintain secure user sessions, remember UI preferences, and analyze web traffic trends. You can configure your browser to decline cookies, though certain marketplace functions may be impacted.</p>

        <h2 style="font-size: 20px; font-weight: 800; color: #0F172A; margin-top: 32px;">4. Log Files & Web Analytics</h2>
        <p>Like most web platforms, Allver automatically gathers standard internet log information: IP addresses, browser type, Internet Service Provider (ISP), referring/exit pages, and timestamps. This data is utilized solely for analyzing security trends and administering platform stability.</p>

        <h2 style="font-size: 20px; font-weight: 800; color: #0F172A; margin-top: 32px;">5. Contact for Privacy Inquiries</h2>
        <p>For any questions regarding our data practices or to request data removal, contact us at <a href="mailto:contact@allver.in" style="color: #10B981; font-weight: 700;">contact@allver.in</a>.</p>
      </main>
    `
  },
  {
    file: 'terms.html',
    path: '/terms',
    title: "Terms of Service & User Agreement | Allver Marketplace",
    desc: "Terms of service and user agreement for clients, contractors, architects, and workers using the Allver digital construction marketplace platform.",
    content: `
      <section style="background-color: #0F172A; color: #FFFFFF; padding: 56px 24px; text-align: center;">
        <div style="max-width: 800px; margin: 0 auto;">
          <span style="color: #34D399; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px;">Terms & Conditions</span>
          <h1 style="font-size: 36px; font-weight: 900; margin: 16px 0 12px 0;">Terms of Service</h1>
          <p style="font-size: 14px; color: #CBD5E1;">Last Updated: September 18, 2026</p>
        </div>
      </section>

      <main style="max-width: 900px; margin: 48px auto; padding: 0 24px; font-size: 14.5px; line-height: 1.7; color: #334155;">
        <p>These Terms of Service govern your access to and use of Allver (allver.in) and its related mobile applications and digital services. By using Allver, you agree to comply with these terms.</p>

        <h2 style="font-size: 20px; font-weight: 800; color: #0F172A; margin-top: 32px;">1. About the Platform</h2>
        <p>Allver operates as a digital construction marketplace connecting clients with independent general contractors, architects, interior designers, and trade workers. Allver provides technology tools for discovery, quotation, and project tracking.</p>

        <h2 style="font-size: 20px; font-weight: 800; color: #0F172A; margin-top: 32px;">2. User Conduct & Accurate Representations</h2>
        <p>Users are responsible for ensuring that all profile representations, qualifications, and past project photos are genuine and accurate. Impersonation or fraudulent representations violate platform policies and result in account termination.</p>

        <h2 style="font-size: 20px; font-weight: 800; color: #0F172A; margin-top: 32px;">3. Intellectual Property</h2>
        <p>Architects, designers, and contractors retain full ownership of their original drawings and plans. Users must not reproduce or utilize architectural blueprints without express authorization from the originating professional.</p>

        <h2 style="font-size: 20px; font-weight: 800; color: #0F172A; margin-top: 32px;">4. Governing Law</h2>
        <p>These terms are governed by the laws of India. For any disputes or regulatory notices, please contact <a href="mailto:contact@allver.in" style="color: #10B981; font-weight: 700;">contact@allver.in</a>.</p>
      </main>
    `
  },
  {
    file: 'contractors.html',
    path: '/contractors',
    title: "Find Verified Construction Contractors in India | Allver",
    desc: "Discover licensed civil and general contractors for residential and commercial building construction across India. Compare profiles and portfolios on allver.in.",
    content: `
      <section style="background-color: #0F172A; color: #FFFFFF; padding: 56px 24px; text-align: center;">
        <div style="max-width: 800px; margin: 0 auto;">
          <span style="color: #34D399; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px;">Directory</span>
          <h1 style="font-size: 36px; font-weight: 900; margin: 16px 0 12px 0;">Civil & General Contractors in India</h1>
          <p style="font-size: 16px; color: #CBD5E1; line-height: 1.6;">Browse verified contractors for residential villas, commercial structures, renovation, and turnkey civil projects.</p>
        </div>
      </section>

      <main style="max-width: 1040px; margin: 48px auto; padding: 0 24px; font-size: 15px; line-height: 1.7; color: #334155;">
        <p>Allver enables property owners and commercial builders to connect directly with established contracting firms and general builders across India without intermediary markups.</p>
        
        <h2 style="font-size: 22px; font-weight: 800; color: #0F172A; margin: 32px 0 16px 0;">Contractor Vetting Criteria on Allver</h2>
        <ul style="padding-left: 20px; display: flex; flex-direction: column; gap: 8px;">
          <li>Valid business registration documents (GSTIN / MSME / Proprietorship / LLP)</li>
          <li>Documented photographic proof of completed residential and commercial sites</li>
          <li>Verification of key trade specializations: RCC framing, masonry, electrical, plumbing</li>
          <li>Commitment to milestone-based execution and transparent itemized estimates</li>
        </ul>
      </main>
    `
  },
  {
    file: 'architects.html',
    path: '/architects',
    title: "Discover Certified Architects & Interior Designers | Allver",
    desc: "Explore verified architectural studios, floor blueprints, 3D elevations, and interior designers across India on Allver. Connect directly with design leads.",
    content: `
      <section style="background-color: #0F172A; color: #FFFFFF; padding: 56px 24px; text-align: center;">
        <div style="max-width: 800px; margin: 0 auto;">
          <span style="color: #34D399; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px;">Design Studios</span>
          <h1 style="font-size: 36px; font-weight: 900; margin: 16px 0 12px 0;">Architects & Interior Designers in India</h1>
          <p style="font-size: 16px; color: #CBD5E1; line-height: 1.6;">Explore verified architectural blueprints, 3D elevations, and modern interior portfolios across India.</p>
        </div>
      </section>

      <main style="max-width: 1040px; margin: 48px auto; padding: 0 24px; font-size: 15px; line-height: 1.7; color: #334155;">
        <p>Allver connects homeowners and real estate developers with accredited architectural professionals and interior design specialists.</p>
        
        <h2 style="font-size: 22px; font-weight: 800; color: #0F172A; margin: 32px 0 16px 0;">Architectural Capabilities on Allver</h2>
        <ul style="padding-left: 20px; display: flex; flex-direction: column; gap: 8px;">
          <li>Municipal sanctioned building plans conforming to local town planning bylaws</li>
          <li>Photorealistic 3D exterior renders and virtual interior walkthroughs</li>
          <li>Structural engineering drawings and bioclimatic energy-efficient planning</li>
          <li>Seamless digital collaboration between architectural design and site contractors</li>
        </ul>
      </main>
    `
  },
  {
    file: 'labours.html',
    path: '/labours',
    title: "Hire Skilled Construction Labour & Daily Workers | Allver",
    desc: "Hire verified skilled construction workers in India. Reliable daily wage & contract masons, plumbers, electricians, carpenters, painters, and tile experts.",
    content: `
      <section style="background-color: #0F172A; color: #FFFFFF; padding: 56px 24px; text-align: center;">
        <div style="max-width: 800px; margin: 0 auto;">
          <span style="color: #34D399; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px;">Workforce Directory</span>
          <h1 style="font-size: 36px; font-weight: 900; margin: 16px 0 12px 0;">Skilled Construction Trades & Labour</h1>
          <p style="font-size: 16px; color: #CBD5E1; line-height: 1.6;">On-demand access to verified tradesmen for daily wage and task-based building contracts across India.</p>
        </div>
      </section>

      <main style="max-width: 1040px; margin: 48px auto; padding: 0 24px; font-size: 15px; line-height: 1.7; color: #334155;">
        <p>Allver provides a transparent platform connecting property owners and civil contractors directly with skilled construction tradesmen without middleman commissions.</p>
        
        <h2 style="font-size: 22px; font-weight: 800; color: #0F172A; margin: 32px 0 16px 0;">Trade Categories Available</h2>
        <ul style="padding-left: 20px; display: flex; flex-direction: column; gap: 8px;">
          <li><strong>Masonry:</strong> Brickwork, stone masonry, plastering, concrete casting, and plinth foundation.</li>
          <li><strong>Concealed Electrical:</strong> DB board wiring, switchgear fitting, earthing, and industrial cabling.</li>
          <li><strong>Plumbing & Sanitation:</strong> CPVC/UPVC pipe laying, drainage connections, and bathroom fixtures.</li>
          <li><strong>Painting & Finishing:</strong> Putty skimming, primer coating, weather-shield exterior paint, and texture.</li>
          <li><strong>Carpentry & Millwork:</strong> Door frame fabrication, modular furniture installation, and shuttering woodwork.</li>
        </ul>
      </main>
    `
  }
];

// Read template
const templateHtml = fs.readFileSync(BASE_TEMPLATE, 'utf8');

PAGES.forEach((page) => {
  const targetFile = path.join(DIST_DIR, page.file);
  let base = templateHtml;

  // 1. Replace or insert Title
  const titleTag = `<title>${page.title}</title>`;
  if (base.includes('<title data-rh="true"></title>')) {
    base = base.replace('<title data-rh="true"></title>', titleTag);
  } else if (base.includes('<title>')) {
    base = base.replace(/<title>.*?<\/title>/, titleTag);
  } else {
    base = base.replace('<head>', `<head>${titleTag}`);
  }

  // 2. Replace or insert Meta Description
  const metaDesc = `<meta name="description" content="${page.desc}"/>`;
  if (base.includes('name="description"')) {
    base = base.replace(/<meta\s+name="description"\s+content=".*?"\s*\/?>/, metaDesc);
  } else {
    base = base.replace('</head>', `${metaDesc}</head>`);
  }

  // 3. Replace or insert Canonical Link
  const canonicalTag = `<link rel="canonical" href="https://allver.in${page.path === '/' ? '' : page.path}"/>`;
  if (base.includes('rel="canonical"')) {
    base = base.replace(/<link\s+rel="canonical"\s+href=".*?"\s*\/?>/, canonicalTag);
  } else {
    base = base.replace('</head>', `${canonicalTag}</head>`);
  }

  // 4. Update OpenGraph Tags
  const ogTags = `
    <meta property="og:title" content="${page.title}"/>
    <meta property="og:description" content="${page.desc}"/>
    <meta property="og:url" content="https://allver.in${page.path === '/' ? '' : page.path}"/>
    <meta property="og:type" content="website"/>
    <meta name="twitter:title" content="${page.title}"/>
    <meta name="twitter:description" content="${page.desc}"/>
  `;
  base = base.replace('</head>', `${ogTags}</head>`);

  // 5. Construct Semantic Body Content
  const fullSemanticHtml = `
    <div id="allver-ssr-content" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; min-height: 100vh;">
      ${commonHeader}
      ${page.content}
      ${commonFooter}
    </div>
  `;

  const noscriptBlock = `
    <noscript>
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 24px; background: #FFF; color: #111;">
        ${commonHeader}
        ${page.content}
        ${commonFooter}
      </div>
    </noscript>
  `;

  // 6. Inject into <div id="root">
  if (base.includes('<div id="root">')) {
    base = base.replace(
      /<div id="root">.*?<\/div>\s*<script/s,
      `<div id="root">${fullSemanticHtml}</div>${noscriptBlock}<script`
    );
  }

  fs.writeFileSync(targetFile, base, 'utf8');
  console.log(`[Generated Static Page] ${page.file} (${page.path}) -> ${page.title}`);
});

console.log('[Complete] All static pages successfully generated with rich crawlable HTML for AdSense!');
