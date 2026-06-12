export const translations = {
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
  nav: {
    work: "Work",
    projects: "Projects",
    profile: "Profile",
    blog: "Blog",
    terms: "Terms",
    privacy: "Privacy",
  },
  legal: {
    termsTitle: "Terms of Service",
    privacyTitle: "Privacy Policy",
    updated: "Last updated:",
    viewPrivacy: "Read the privacy policy",
    viewTerms: "Read the terms of service",
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
    allAuthors: "Everyone",
    authors: "Authors",
    tags: "Tags",
    by: "by",
    postSingular: "post",
    postPlural: "posts",
    pagePrev: "Prev",
    pageNext: "Next",
    pageOf: "Page {current} of {total}",
    back: "Back to posts",
    readMin: "min read",
    empty: "No posts yet.",
  },
  cookies: {
    title: "Cookies",
    body: "This website stores cookies. We need your consent for optional analytics cookies.",
    learnMore: "Learn more",
    accept: "Accept",
    deny: "Deny",
    modify: "Modify",
    saveChoices: "Save choices",
    catEssential: "Essential",
    catAnalytics: "Analytics",
    alwaysOn: "Always on",
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
} as const;

export type Translations = typeof translations;

export function get<T>(obj: T, path: string): string {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const p of parts) cur = (cur as Record<string, unknown>)?.[p];
  return typeof cur === "string" ? cur : path;
}

export function t(path: string): string {
  return get(translations, path);
}
