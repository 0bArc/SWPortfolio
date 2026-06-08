export type LegalSection = {
  heading: string;
  paragraphs: string[];
  list?: string[];
};

export type LegalDoc = {
  title: string;
  updated: string;
  intro?: string;
  sections: LegalSection[];
};

export type LegalVars = {
  owner: string;
  domain: string;
  email: string;
};

function v(text: string, vars: LegalVars) {
  return text
    .replaceAll("{owner}", vars.owner)
    .replaceAll("{domain}", vars.domain)
    .replaceAll("{email}", vars.email);
}

function mapDoc(doc: LegalDoc, vars: LegalVars): LegalDoc {
  return {
    title: v(doc.title, vars),
    updated: doc.updated,
    intro: doc.intro ? v(doc.intro, vars) : undefined,
    sections: doc.sections.map((s) => ({
      heading: v(s.heading, vars),
      paragraphs: s.paragraphs.map((p) => v(p, vars)),
      list: s.list?.map((item) => v(item, vars)),
    })),
  };
}

const terms: LegalDoc = {
  title: "Terms of Service",
  updated: "8 June 2026",
  intro:
    "These terms apply to all use of {domain}, a personal website and blog operated by {owner}. By visiting the site you agree to the terms below.",
  sections: [
    {
      heading: "1. About the site",
      paragraphs: [
        "{domain} is a personal portfolio and blog. Content is provided for information about projects, experience, and published posts. The site does not offer user accounts, payment services, or interactive platform services for visitors.",
      ],
    },
    {
      heading: "2. Acceptance",
      paragraphs: [
        "By accessing or using the site you confirm that you have read, understood, and agree to these terms. If you do not agree, you must not use the site.",
      ],
    },
    {
      heading: "3. Intellectual property",
      paragraphs: [
        "All content on the site — including text, design, logos, images, and code presented as part of the site — belongs to {owner} or is used with permission, unless stated otherwise.",
        "You may read and share links to publicly available pages. You may not copy, distribute, modify, or commercially reuse content without prior written consent, except as permitted by fair use or quotation law.",
      ],
    },
    {
      heading: "4. Acceptable use",
      paragraphs: ["You agree not to:"],
      list: [
        "Attempt unauthorized access to admin areas, servers, or databases",
        "Overload the site with automated requests, scraping, or denial-of-service activity",
        "Introduce malicious code or disrupt site operation",
        "Use the site for unlawful purposes or in ways that infringe others' rights",
      ],
    },
    {
      heading: "5. Third-party links and external content",
      paragraphs: [
        "The site may link to external services such as GitHub and other projects. {owner} does not control content on those sites and is not responsible for their availability, security, or practices.",
        "Public GitHub information is fetched via GitHub's API and displayed under GitHub's own terms.",
      ],
    },
    {
      heading: "6. Disclaimer of warranty",
      paragraphs: [
        "The site and all content are provided \"as is\" and \"as available\" without warranties of any kind, express or implied. {owner} does not warrant that content is complete, current, error-free, or fit for a particular purpose.",
      ],
    },
    {
      heading: "7. Limitation of liability",
      paragraphs: [
        "To the extent permitted by law, {owner} is not liable for indirect loss, consequential damage, data loss, loss of profit, or other harm arising from use of — or inability to access — the site, even if the possibility of such loss has been advised.",
        "Nothing in these terms limits liability that cannot be excluded under applicable law.",
      ],
    },
    {
      heading: "8. Changes",
      paragraphs: [
        "{owner} may update these terms at any time. Changes take effect when the updated version is published on this page. Continued use of the site after changes constitutes acceptance of the new terms.",
      ],
    },
    {
      heading: "9. Governing law",
      paragraphs: [
        "These terms are governed by Norwegian law. Disputes should first be resolved amicably. If that fails, disputes shall be decided by Norwegian courts with venue where {owner} resides, unless mandatory rules provide otherwise.",
      ],
    },
    {
      heading: "10. Contact",
      paragraphs: [
        "Questions about these terms may be sent to {email}. See also the privacy policy for information on data processing.",
      ],
    },
  ],
};

const privacy: LegalDoc = {
  title: "Privacy Policy",
  updated: "8 June 2026",
  intro:
    "This policy describes how {owner} handles information in connection with {domain}. We take privacy seriously and collect as little data as possible.",
  sections: [
    {
      heading: "1. Data controller",
      paragraphs: [
        "The data controller for personal data related to the site is {owner}. Contact: {email}.",
      ],
    },
    {
      heading: "2. What we do not collect",
      paragraphs: [
        "The site is not a social platform. There is no visitor registration, visitor login, contact form that stores messages in a database, newsletter, payments, or ad/tracking platforms such as Google Analytics or Meta Pixel.",
        "The Contact link opens your own email client. We do not store the message until you send it yourself.",
      ],
    },
    {
      heading: "3. What we store and process",
      paragraphs: ["The following data may be processed when you use the site:"],
      list: [
        "Loading screen — `sessionStorage` is used once per browser session to avoid repeating the loading screen",
        "Server logs — the hosting provider may log IP address, timestamp, requested URL, and browser information (User-Agent) for security and operations",
        "Blog content — published posts (title, text, tags, author, date, reading time, and optional featured image) are stored in a database and are publicly visible",
        "Blog images — images uploaded by the administrator are stored on the server as WebP files and served via `/api/images/`",
        "GitHub data — public profile and repository information is fetched from GitHub's API as needed and may be temporarily cached by Next.js; we do not permanently store GitHub data in our own database",
        "Cookie consent records — essential cookies and optional analytics preferences are stored in a database with a `decidedAt` unix timestamp when you accept or decline",
      ],
    },
    {
      heading: "4. Admin access (site owner only)",
      paragraphs: [
        "A password-protected admin area is used exclusively by {owner} to publish posts. On login, an httpOnly session cookie (`admin_session`) signed with HMAC is set. This cookie does not apply to regular visitors and does not contain personal data about you as a reader.",
      ],
    },
    {
      heading: "5. Purpose and legal basis",
      paragraphs: ["We process data for the following purposes:"],
      list: [
        "Displaying the site and blog content (legitimate interest / access to public information)",
        "Storing cookie consent choices (consent when you accept or decline cookies)",
        "Ensuring operation, troubleshooting, and protection against abuse (legitimate interest)",
        "Managing and publishing content (processing by the site owner)",
      ],
    },
    {
      heading: "6. Sharing with third parties",
      paragraphs: [
        "We do not sell personal data. Data may be processed by technical subprocessors such as hosting (server/database) and GitHub (when the profile page is shown), only to the extent necessary to deliver the site.",
      ],
    },
    {
      heading: "7. Retention",
      paragraphs: [
        "Cookie consent records are kept for up to 12 months from when you gave consent (unix timestamp `decidedAt`). After 12 months, consent data is automatically purged from the database and you will be asked to choose again. Consent records may also be lost if the server is wiped or rebuilt by the hosting provider.",
        "Server logs are kept according to the hosting provider's routines, usually for a limited time. Blog content and uploaded images are kept until deleted by the administrator, or until the server is purged. Admin sessions expire after inactivity, when you log out, or when the server is purged.",
      ],
    },
    {
      heading: "8. Your rights",
      paragraphs: [
        "Under the GDPR you may have rights to access, rectification, erasure, restriction, objection, and data portability where data about you is concerned. Because we normally do not collect identifiable data about visitors, many requests may relate to technical logs held by the hosting provider.",
        "Contact {email} for requests. You may also lodge a complaint with your supervisory authority.",
      ],
    },
    {
      heading: "9. Security",
      paragraphs: [
        "Admin access is password-protected with signed session cookies, secure cookie flags (httpOnly, secure in production, SameSite), and idle timeout. Database and server should be kept updated. No method is 100% secure, but we apply reasonable measures.",
      ],
    },
    {
      heading: "10. Changes",
      paragraphs: [
        "This policy may be updated. The latest version is always published on this page with an updated date.",
      ],
    },
  ],
};

export function getTerms(vars: LegalVars): LegalDoc {
  return mapDoc(terms, vars);
}

export function getPrivacy(vars: LegalVars): LegalDoc {
  return mapDoc(privacy, vars);
}
