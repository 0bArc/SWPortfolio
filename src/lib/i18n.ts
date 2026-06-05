export type Lang = "no" | "en";

export const SUPPORTED_LANGS: { code: Lang; label: string; flag: string }[] = [
  { code: "no", label: "Norsk", flag: "🇳🇴" },
  { code: "en", label: "English", flag: "🇬🇧" },
];

const t = {
  no: {
    loading: {
      messages: [
        "Laster innhold og optimaliserer siden for enheten din",
        "Sparer strøm og analyserer nettverkshastigheten din",
        "Henter GitHub-data og komprimerer ressurser",
        "Forbereder en raskere opplevelse for deg",
        "Konfigurerer visningen for best mulig ytelse",
      ],
      tagline: "Utviklet av Stratware.win",
    },
    setup: {
      heading: "Velg språk",
      sub: "Velg foretrukket språk for å fortsette.",
      confirm: "Fortsett",
    },
    nav: {
      work: "Arbeid",
      projects: "Prosjekter",
      profile: "Profil",
      blog: "Innlegg",
    },
    hero: {
      title: "Utvikler & Redaktør.",
      bio: "Jeg lærer meg C++ og har en stor interesse for cybersikkerhet. Kombinerer koding med skriving som redaktør for Gropmarka.",
      contact: "Kontakt",
      blog: "Innlegg",
      openSource: "Open Source on GitHub",
    },
    about: {
      heading: "Om meg",
      p1: "Mine hovedinteresser er programmering, backend-utvikling og sikkerhet, med vekt på å skrive sikker og vedlikeholdbar kode.",
      p2: "Jeg utvikler aktivt ferdighetene mine gjennom egne prosjekter i C# og C++, samtidig som jeg lærer mer om nye konsepter og grunnleggende cybersikkerhet.",
      p3: "Tidligere har jeg bygget Discord-boter, CLI-verktøy og backend-verktøy med Lua, JavaScript, Java, Node.js og Python, noe som har styrket problemløsningsevnen min og erfaringen min med skripting.",
      p4: "Nå har jeg fokus på å bli sterkere i programmering og sikkerhet slik at jeg kan bygge større teknisk vanskelige prosjekter.",
    },
    experience: {
      heading: "Erfaring",
      role: "Utvikler & Redaktør",
      summary: "Utvikler tekniske løsninger og skriver innhold for plattformen. Trykk for mer info.",
      dialogBody: "Som utvikler og Redaktør jobber jeg med alt fra backend-logikk i JavaScript til redaksjonelt innhold. Mitt fokus er å bygge sikre løsninger som beskytter brukerdata samtidig som vi leverer engasjerende tekst.",
      visit: "Besøk",
    },
    projects: {
      heading: "Prosjekter",
      fallbackDesc: "GitHub prosjekt",
      fallbackLang: "Kode",
    },
    blog: {
      heading: "Innlegg",
      seeAll: "Se alle",
      all: "Alle",
      back: "Tilbake til innlegg",
      readMin: "min lest",
      empty: "Ingen innlegg ennå.",
    },
    footer: {
      privacy: "Jeg lagrer ikke personlig informasjon.",
    },
    profile: {
      repos: "Repos",
      followers: "Followers",
      following: "Following",
      commits: "Commits",
      joined: "Ble med",
      contributions: "Bidrag",
      commitsTotal: "commits totalt",
      less: "Mindre",
      more: "Mer",
      noData: "Kunne ikke laste profildata.",
    },
    project: {
      back: "Tilbake til prosjekter",
      projects: "Prosjekter",
      seeAll: "Se alle",
      langLabel: "Språk",
      created: "Opprettet",
      lastPush: "Siste push",
      unknown: "Ikke oppgitt",
      activity: "Aktivitet (siste 52 uker)",
      commits: "Siste commits",
      noCommits: "Ingen commits funnet.",
      previous: "Forrige",
      next: "Neste",
    },
    dateLocale: "no-NO",
  },
  en: {
    loading: {
      messages: [
        "Loading content and optimizing the page for your device",
        "Saving power and analyzing your network speed",
        "Fetching GitHub data and compressing resources",
        "Preparing a faster experience for you",
        "Configuring the view for best performance",
      ],
      tagline: "Developed by Stratware.win",
    },
    setup: {
      heading: "Select language",
      sub: "Choose your preferred language to continue.",
      confirm: "Continue",
    },
    nav: {
      work: "Work",
      projects: "Projects",
      profile: "Profile",
      blog: "Blog",
    },
    hero: {
      title: "Developer & Editor.",
      bio: "I'm learning C++ and have a strong interest in cybersecurity. I combine coding with writing as an editor for Gropmarka.",
      contact: "Contact",
      blog: "Blog",
      openSource: "Open Source on GitHub",
    },
    about: {
      heading: "About me",
      p1: "My main interests are programming, backend development, and security, with an emphasis on writing secure and maintainable code.",
      p2: "I actively develop my skills through personal projects in C# and C++, while also learning about new concepts and foundational cybersecurity.",
      p3: "Previously I've built Discord bots, CLI tools, and backend utilities with Lua, JavaScript, Java, Node.js, and Python — strengthening my problem-solving skills and scripting experience.",
      p4: "I'm now focused on growing stronger in programming and security so I can build larger, technically challenging projects.",
    },
    experience: {
      heading: "Experience",
      role: "Developer & Editor",
      summary: "Building technical solutions and writing content for the platform. Click for more info.",
      dialogBody: "As a developer and Editor I work on everything from backend logic in JavaScript to editorial content. My focus is building secure solutions that protect user data while delivering engaging text.",
      visit: "Visit",
    },
    projects: {
      heading: "Projects",
      fallbackDesc: "GitHub project",
      fallbackLang: "Code",
    },
    blog: {
      heading: "Posts",
      seeAll: "See all",
      all: "All",
      back: "Back to posts",
      readMin: "min read",
      empty: "No posts yet.",
    },
    footer: {
      privacy: "I don't store personal information.",
    },
    profile: {
      repos: "Repos",
      followers: "Followers",
      following: "Following",
      commits: "Commits",
      joined: "Joined",
      contributions: "Contributions",
      commitsTotal: "commits total",
      less: "Less",
      more: "More",
      noData: "Could not load profile data.",
    },
    project: {
      back: "Back to projects",
      projects: "Projects",
      seeAll: "See all",
      langLabel: "Language",
      created: "Created",
      lastPush: "Last push",
      unknown: "Not specified",
      activity: "Activity (last 52 weeks)",
      commits: "Latest commits",
      noCommits: "No commits found.",
      previous: "Previous",
      next: "Next",
    },
    dateLocale: "en-GB",
  },
} as const;

export type Translations = typeof t.no;
export { t as translations };

export function get<T>(obj: T, path: string): string {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const p of parts) cur = (cur as Record<string, unknown>)?.[p];
  return typeof cur === "string" ? cur : path;
}
