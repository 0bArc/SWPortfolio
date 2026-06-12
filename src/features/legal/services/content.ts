export type GlossaryEntry = {
  term: string;
  definition: string;
};

export type LegalSection = {
  heading: string;
  paragraphs: string[];
  list?: string[];
  listGroups?: { intro?: string; items: string[] }[];
  after?: string[];
};

export type LegalDoc = {
  title: string;
  updated: string;
  intro?: string;
  glossary?: GlossaryEntry[];
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
    glossary: doc.glossary?.map((e) => ({
      term: v(e.term, vars),
      definition: v(e.definition, vars),
    })),
    sections: doc.sections.map((s) => ({
      heading: v(s.heading, vars),
      paragraphs: s.paragraphs.map((p) => v(p, vars)),
      list: s.list?.map((item) => v(item, vars)),
      listGroups: s.listGroups?.map((g) => ({
        intro: g.intro ? v(g.intro, vars) : undefined,
        items: g.items.map((item) => v(item, vars)),
      })),
      after: s.after?.map((p) => v(p, vars)),
    })),
  };
}

const terms: LegalDoc = {
  title: "Terms of Service",
  updated: "12 June 2026",
  intro:
    "These terms apply to your use of {domain} — a personal portfolio, blog, and community site operated by {owner}.",
  glossary: [
    {
      term: "Applicable law",
      definition: "The laws and regulations that legally apply in a given situation.",
    },
    {
      term: "Jurisdiction",
      definition: "The court system that has authority to decide a legal dispute.",
    },
    {
      term: "As-is / as available",
      definition: "The site and content are provided without guarantees about quality, accuracy, availability, or suitability for a specific purpose.",
    },
    {
      term: "Liability",
      definition: "Legal responsibility for loss, damage, or harm.",
    },
    {
      term: "Intellectual property",
      definition: "Legal rights in creative work such as text, images, design, and code.",
    },
    {
      term: "Third party",
      definition: "An external person, company, or service that is not {owner} or this website.",
    },
    {
      term: "Warranty",
      definition: "A promise or guarantee about how something will perform or what it contains.",
    },
    {
      term: "Mandatory law",
      definition: "Legal rules that cannot be overridden by a website's terms, such as certain consumer and data-protection rights.",
    },
  ],
  sections: [
    {
      heading: "1. About this website",
      paragraphs: [
        "{domain} is operated by {owner} and combines a public portfolio, a technical blog, and optional community accounts.",
        "Published posts may be written by {owner} or by approved Author accounts. Comments, profiles, badges, and notifications are available to registered members.",
        "The site is free to use. There are no payments, subscriptions, or paid tiers.",
      ],
    },
    {
      heading: "2. Acceptance",
      paragraphs: [
        "By using this website, you agree to these terms. If you do not agree, please stop using the site.",
      ],
    },
    {
      heading: "3. Intellectual property",
      paragraphs: [
        "Unless otherwise stated, content on this site — including text, graphics, design, images, and original code — is owned by {owner} or used with permission.",
        "Open-source and third-party materials remain subject to their own licenses.",
      ],
      listGroups: [
        {
          intro: "You may:",
          items: [
            "View publicly available content",
            "Share links to public pages",
            "Quote limited portions where permitted by law",
          ],
        },
        {
          intro: "You may not, without prior written permission:",
          items: [
            "Reproduce substantial portions of content",
            "Redistribute content in bulk",
            "Commercially exploit website content",
            "Remove copyright notices or attribution",
          ],
        },
      ],
    },
    {
      heading: "4. Visitor accounts",
      paragraphs: [
        "You may create a free account to comment, receive notifications, and use a public profile at /u/your-username. Sign-up requires a username, display name, password, and email address. Email verification and Cloudflare Turnstile captcha are used to reduce abuse.",
        "You are responsible for your credentials and for all activity under your account. Keep your password private and tell us promptly if you suspect unauthorised access.",
        "Author accounts may publish blog posts when granted by staff. Author content must follow the same acceptable-use rules as comments.",
        "Comments and profile content must be lawful and respectful. Staff may remove content, issue warnings, suspend accounts, or revoke badges when rules are broken.",
        "You may upload or link an avatar image subject to review. Optional API keys let you access the public API programmatically; you must keep keys secret.",
      ],
    },
    {
      heading: "5. Acceptable use",
      paragraphs: [],
      listGroups: [
        {
          intro: "You agree not to:",
          items: [
            "Attempt unauthorized access to admin areas, servers, databases, or infrastructure",
            "Circumvent security measures, captcha, or access restrictions",
            "Interfere with the operation or availability of the website",
            "Introduce malware or harmful code",
            "Conduct denial-of-service attacks or similar disruptive activity",
            "Use automated systems in a way that creates excessive load",
            "Use the website for unlawful purposes",
            "Post abusive, illegal, or misleading comments",
          ],
        },
      ],
      after: [
        "{owner} may restrict or block access when necessary to protect the security or stability of the site.",
      ],
    },
    {
      heading: "6. Staff and moderation",
      paragraphs: [
        "Trusted staff members (Founder, Administrators, Developers, and Moderators) help operate the site. They may access a password-protected staff panel at /admin.",
        "Moderators may manage community members — for example warnings, bans, and community badges — but cannot change site settings or edit other staff accounts.",
        "Higher staff roles may publish posts, manage media, and perform full account administration. Staff actions that affect your account may generate in-site notifications.",
      ],
    },
    {
      heading: "7. Third-party links and services",
      paragraphs: [
        "This site may link to third-party websites, repositories, APIs, or services. Accessing them is at your own risk.",
        "{owner} does not control third-party content, availability, security, or privacy practices.",
        "Information from services such as GitHub is displayed under those providers' own terms.",
      ],
    },
    {
      heading: "8. Content disclaimer",
      paragraphs: [
        "Content on this site is provided for general information and education only. It is not legal, financial, medical, or professional advice.",
        "You are responsible for how you use information from this site. Mentioning a tool, product, or topic does not mean {owner} endorses it.",
        "The site and its content are provided \"as is\" and \"as available\", without warranties regarding accuracy, completeness, availability, or fitness for a particular purpose.",
      ],
    },
    {
      heading: "9. Limitation of liability",
      paragraphs: [
        "To the extent permitted by applicable law, {owner} is not liable for indirect, incidental, or consequential loss arising from use of — or inability to use — this website.",
        "Nothing in these terms excludes or limits liability where such exclusion or limitation is prohibited by mandatory applicable law.",
      ],
    },
    {
      heading: "10. Changes",
      paragraphs: [
        "{owner} may update the site or these terms at any time. Updated terms take effect when published on this page. Continued use after an update means you accept the revised terms.",
      ],
    },
    {
      heading: "11. Governing law",
      paragraphs: [
        "These terms are governed by Norwegian law. Disputes should first be resolved amicably where possible. If that fails, Norwegian courts have jurisdiction, except where mandatory law requires otherwise.",
      ],
    },
    {
      heading: "12. Contact",
      paragraphs: [
        "Questions about these terms may be sent to {email}.",
        "For information about personal data, see the Privacy Policy.",
      ],
    },
  ],
};

const privacy: LegalDoc = {
  title: "Privacy Policy",
  updated: "12 June 2026",
  intro:
    "This policy explains what personal data {owner} processes when you use {domain}, why it is needed, and what choices you have.",
  glossary: [
    {
      term: "Personal data",
      definition: "Information that relates to an identifiable person, such as an IP address in server logs.",
    },
    {
      term: "Data controller",
      definition: "The person who decides why and how personal data is processed. For this site, that is {owner}.",
    },
    {
      term: "Processing",
      definition: "Any operation performed on personal data, including storing, displaying, or deleting it.",
    },
    {
      term: "Legal basis",
      definition: "The reason under GDPR that allows personal data to be processed, such as consent or legitimate interest.",
    },
    {
      term: "Consent",
      definition: "A freely given choice you make, for example when accepting or declining optional cookies.",
    },
    {
      term: "Legitimate interest",
      definition: "A lawful reason to process data when it is necessary and balanced against your privacy rights, such as keeping the site secure.",
    },
    {
      term: "Subprocessor",
      definition: "A third-party service that processes data on our behalf, such as a hosting provider.",
    },
    {
      term: "Retention",
      definition: "How long data is kept before it is deleted or anonymized.",
    },
    {
      term: "GDPR",
      definition: "The EU General Data Protection Regulation. It gives individuals rights over their personal data where it applies.",
    },
  ],
  sections: [
    {
      heading: "1. Data controller",
      paragraphs: [
        "The data controller for personal data related to this site is {owner}. Contact: {email}.",
        "{domain} is a personal site with optional community accounts — not a large-scale commercial data broker or ad network.",
      ],
    },
    {
      heading: "2. What we do not do",
      paragraphs: [
        "We do not sell personal data, run newsletters, process payments, or use ad/tracking platforms such as Google Analytics or Meta Pixel.",
        "The Contact link opens your own email client. We do not receive your message until you send it yourself.",
      ],
    },
    {
      heading: "3. What we store and process",
      paragraphs: ["When you use the site, the following data may be processed:"],
      list: [
        "Loading screen — `sessionStorage` is used once per browser session to avoid repeating the loading animation",
        "Server logs — the hosting provider may log IP address, timestamp, requested URL, and browser information (User-Agent) for security and operations",
        "Blog content — published posts (title, text, tags, author, date, reading time, optional featured image, linked author account) are stored in PostgreSQL and are publicly visible",
        "Uploaded images — blog and avatar images are stored on the server as WebP files, tracked in the database, and served via `/api/images/`",
        "GitHub data — public profile and repository information is fetched from GitHub's API as needed and may be temporarily cached; we do not permanently store GitHub profile data in our own database",
        "Cookie consent — your choice is stored in the database with a timestamp when you accept or decline optional cookies",
        "Accounts — username, display name, email (encrypted at rest when enabled), email verification status, password hash, optional bio, avatar references, privacy settings, signup IP, last login IP, ban/suspension records, and badge grants",
        "Sessions — httpOnly `account_session` cookie plus hashed session tokens with expiry and IP in the database",
        "Comments — text you post on blog posts, linked to your account and shown publicly with your username and display name",
        "Notifications — in-site messages (for example staff warnings, badge awards, or verification notices) stored per account",
        "API keys — optional hashed keys you create for programmatic access to the public API; only a prefix is shown after creation",
        "Staff actions — when moderators or administrators act on an account, we may store who performed the action and related metadata (for example ban reason or badge grant)",
        "Captcha — Cloudflare Turnstile is used on sign-up; Turnstile may process technical signals under Cloudflare's privacy policy",
      ],
    },
    {
      heading: "4. Visitor accounts and sessions",
      paragraphs: [
        "Accounts are optional and used for comments, profiles, notifications, and (when authorised) authoring posts. On sign-up or login, an httpOnly session cookie (`account_session`) is set. Session tokens are stored hashed in the database with expiry and IP address.",
        "Email addresses are used for verification and account recovery flows. Verified status may be required for some features.",
        "Public profile pages show your display name, username, optional avatar, badges you choose to display, and join date according to your privacy settings. Passwords and API key secrets are never shown.",
      ],
    },
    {
      heading: "5. Staff panel access",
      paragraphs: [
        "A password-protected staff area at `/admin` is used to publish content and moderate the community. On login, an httpOnly session cookie (`admin_session`) signed with HMAC is set.",
        "Founder, Administrators, Developers, and Moderators may access parts of this panel according to their role. Moderators can manage community members but cannot open site settings or view other staff in the user list.",
        "Staff with CMS access may view account data needed for moderation, publishing, and media review. The `admin_session` cookie identifies staff login state; it does not contain visitor passwords.",
      ],
    },
    {
      heading: "6. Purpose and legal basis",
      paragraphs: ["We process data for the following purposes:"],
      list: [
        "Displaying the site and blog content (legitimate interest)",
        "Storing cookie consent choices (consent)",
        "Operating, troubleshooting, and protecting the site against abuse (legitimate interest)",
        "Managing and publishing content (processing by the site owner)",
        "Operating visitor accounts, comments, notifications, and API keys (contract / legitimate interest)",
        "Community moderation and abuse prevention (legitimate interest)",
        "Preventing sign-up abuse via captcha and email verification (legitimate interest)",
      ],
    },
    {
      heading: "7. Sharing with third parties",
      paragraphs: [
        "We do not sell personal data.",
        "Data may be processed by technical subprocessors such as hosting (server/database), Cloudflare Turnstile (sign-up captcha), and GitHub (when the profile page is shown), only as needed to deliver the site.",
      ],
    },
    {
      heading: "8. Retention",
      paragraphs: [
        "Cookie consent records are kept for up to 12 months from when you gave consent (`decidedAt`). After that, consent data is automatically removed and you will be asked to choose again.",
        "Server logs are kept according to the hosting provider's routines, usually for a limited time.",
        "Blog content and uploaded images are kept until deleted by the administrator or until the server is rebuilt.",
        "Admin sessions expire after inactivity, when you log out, or when the server is purged.",
        "Account session tokens expire after 30 days or when you sign out. Account data is kept until you request deletion or the account is removed by staff.",
        "Notifications are kept while relevant or until cleared according to site routines.",
        "Revoked API keys remain in the database in revoked form for audit purposes.",
        "Comments remain visible until deleted by you (when available) or by staff.",
      ],
    },
    {
      heading: "9. Your rights",
      paragraphs: [
        "Under the GDPR you may have rights to access, rectification, erasure, restriction, objection, and data portability where data about you is concerned and where applicable law requires it.",
        "Because we normally do not collect identifiable data about visitors beyond limited technical records, many requests may relate to logs held by the hosting provider.",
        "Contact {email} for requests. You may also lodge a complaint with your supervisory authority.",
      ],
    },
    {
      heading: "10. Security",
      paragraphs: [
        "Reasonable technical and organizational measures are used to protect data, including password-protected admin access, signed session cookies with secure flags (httpOnly, secure in production, SameSite), and idle timeout.",
        "No website or system is completely secure, but we work to keep the site maintained and protected.",
      ],
    },
    {
      heading: "11. Changes",
      paragraphs: [
        "This policy may be updated from time to time. The latest version is always published on this page with an updated date.",
      ],
    },
    {
      heading: "12. Contact",
      paragraphs: [
        "Questions about this policy may be sent to {email}.",
        "For general site use rules, see the Terms of Service.",
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
