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
  updated: "8 June 2026",
  intro:
    "These terms apply to your use of {domain}, a personal portfolio and blog operated by {owner}.",
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
        "{domain} is a personal portfolio and blog operated by {owner}.",
        "The site presents personal projects, technical work, articles, and related content.",
        "The site offers optional free visitor accounts for commenting on blog posts. There are no payments, subscriptions, or commercial platform services.",
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
        "You may create a free account to comment on published blog posts. Accounts require a username, display name, and password. Email verification is not offered at this time; sign-up is protected by a captcha instead.",
        "Each account receives a public profile page at /u/your-username. You are responsible for your account credentials and for activity under your account.",
        "Comments must be lawful and respectful. {owner} may remove comments or suspend accounts that abuse the service, spam, harass others, or violate these terms.",
        "Optional avatar images must be hosted at HTTPS URLs you provide. Connected external login providers (bridges) may be added later; existing password accounts remain valid.",
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
      heading: "6. Third-party links and services",
      paragraphs: [
        "This site may link to third-party websites, repositories, APIs, or services. Accessing them is at your own risk.",
        "{owner} does not control third-party content, availability, security, or privacy practices.",
        "Information from services such as GitHub is displayed under those providers' own terms.",
      ],
    },
    {
      heading: "7. Content disclaimer",
      paragraphs: [
        "Content on this site is provided for general information and education only. It is not legal, financial, medical, or professional advice.",
        "You are responsible for how you use information from this site. Mentioning a tool, product, or topic does not mean {owner} endorses it.",
        "The site and its content are provided \"as is\" and \"as available\", without warranties regarding accuracy, completeness, availability, or fitness for a particular purpose.",
      ],
    },
    {
      heading: "8. Limitation of liability",
      paragraphs: [
        "To the extent permitted by applicable law, {owner} is not liable for indirect, incidental, or consequential loss arising from use of — or inability to use — this website.",
        "Nothing in these terms excludes or limits liability where such exclusion or limitation is prohibited by mandatory applicable law.",
      ],
    },
    {
      heading: "9. Changes",
      paragraphs: [
        "{owner} may update the site or these terms at any time. Updated terms take effect when published on this page. Continued use after an update means you accept the revised terms.",
      ],
    },
    {
      heading: "10. Governing law",
      paragraphs: [
        "These terms are governed by Norwegian law. Disputes should first be resolved amicably where possible. If that fails, Norwegian courts have jurisdiction, except where mandatory law requires otherwise.",
      ],
    },
    {
      heading: "11. Contact",
      paragraphs: [
        "Questions about these terms may be sent to {email}.",
        "For information about personal data, see the Privacy Policy.",
      ],
    },
  ],
};

const privacy: LegalDoc = {
  title: "Privacy Policy",
  updated: "8 June 2026",
  intro:
    "This policy explains how {owner} handles information in connection with {domain}. We collect as little data as possible.",
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
        "This is a personal portfolio and blog, not a large-scale commercial data platform.",
      ],
    },
    {
      heading: "2. What we do not collect",
      paragraphs: [
        "We do not verify email addresses, run newsletters, process payments, or use ad/tracking platforms such as Google Analytics or Meta Pixel.",
        "The Contact link opens your own email client. We do not store your message until you send it yourself.",
      ],
    },
    {
      heading: "3. What we store and process",
      paragraphs: ["When you use the site, the following data may be processed:"],
      list: [
        "Loading screen — `sessionStorage` is used once per browser session to avoid repeating the loading animation",
        "Server logs — the hosting provider may log IP address, timestamp, requested URL, and browser information (User-Agent) for security and operations",
        "Blog content — published posts (title, text, tags, author, date, reading time, and optional featured image) are stored in a database and are publicly visible",
        "Blog images — images uploaded by the administrator are stored on the server as WebP files and served via `/api/images/`",
        "GitHub data — public profile and repository information is fetched from GitHub's API as needed and may be temporarily cached; we do not permanently store GitHub data in our own database",
        "Cookie consent — essential cookies and optional analytics preferences are stored in a database with a `decidedAt` unix timestamp when you accept or decline",
        "Visitor accounts — if you sign up: username, display name, password (stored as a salted hash, never plain text), optional avatar URL, signup IP, last login IP, session tokens (hashed in the database), and an activity log (sign-up, login, comments)",
        "Comments — text you post on blog posts, linked to your account and shown publicly with your username and display name",
        "Captcha — Cloudflare Turnstile is used on sign-up to reduce abuse; Turnstile may process technical signals according to Cloudflare's privacy policy",
      ],
    },
    {
      heading: "4. Visitor accounts and sessions",
      paragraphs: [
        "Accounts are optional and used to comment on blog posts. On sign-up or login, an httpOnly session cookie (`account_session`) is set. Session tokens are stored hashed in the database with expiry and IP address.",
        "Public profile pages show your display name, username, optional avatar, and join date. Passwords are never shown.",
        "External login bridges (e.g. GitHub) may be added later; bridge tokens would be stored in a separate table linked to your account.",
      ],
    },
    {
      heading: "5. Admin access (site owner only)",
      paragraphs: [
        "A password-protected admin area is used exclusively by {owner} to publish posts. On login, an httpOnly session cookie (`admin_session`) signed with HMAC is set.",
        "This cookie applies only to the site owner and does not contain personal data about visitors.",
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
        "Operating visitor accounts and comments (contract / legitimate interest)",
        "Preventing sign-up abuse via captcha (legitimate interest)",
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
        "Account session tokens expire after 30 days or when you sign out. Account data is kept until you request deletion or the account is removed by the site owner.",
        "Comments remain visible until deleted by you (when available) or by the site owner.",
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
