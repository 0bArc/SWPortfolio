import { cacheLife } from "next/cache";

const GH_API = "https://api.github.com";
const USER = process.env.NEXT_PUBLIC_GITHUB_USER ?? "";

const baseHeaders: HeadersInit = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  ...(process.env.GITHUB_TOKEN
    ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
    : {}),
};

async function ghFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${GH_API}${path}`, { headers: baseHeaders });
  if (res.status === 409 || res.status === 202) return [] as T;
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${path}`);
  return res.json();
}

async function ghGraphQL<T>(query: string): Promise<T> {
  const res = await fetch(`${GH_API}/graphql`, {
    method: "POST",
    headers: { ...baseHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`GitHub GraphQL ${res.status}`);
  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors[0].message);
  return json.data;
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface RepoDetail {
  id: number;
  name: string;
  full_name: string;
  fork: boolean;
  description: string | null;
  html_url: string;
  homepage: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  watchers_count: number;
  topics: string[];
  created_at: string;
  updated_at: string;
  pushed_at: string;
  default_branch: string;
  owner: {
    login: string;
    avatar_url: string;
  };
}

export interface Commit {
  sha: string;
  html_url: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
    };
  };
}

export interface WeekActivity {
  week: number;
  total: number;
  days: number[];
}

export interface RepoData {
  detail: RepoDetail;
  commits: Commit[];
  activity: WeekActivity[];
}

export interface Branch {
  name: string;
  protected: boolean;
  commit: {
    sha: string;
    url: string;
  };
}

export interface UserProfile {
  login: string;
  name: string | null;
  bio: string | null;
  avatar_url: string;
  html_url: string;
  public_repos: number;
  followers: number;
  following: number;
  location: string | null;
  company: string | null;
  blog: string | null;
  twitter_username: string | null;
  created_at: string;
}

export interface ContributionDay {
  date: string;
  count: number;
}

export interface ContributionWeek {
  days: ContributionDay[];
}

// ── Fetchers ──────────────────────────────────────────────────────────────────

export async function getRepoData(slug: string): Promise<RepoData> {
  "use cache";
  cacheLife("hours");
  const [detail, commits, activity] = await Promise.all([
    ghFetch<RepoDetail>(`/repos/${USER}/${slug}`),
    ghFetch<Commit[]>(`/repos/${USER}/${slug}/commits?per_page=20`),
    ghFetch<WeekActivity[]>(`/repos/${USER}/${slug}/stats/commit_activity`),
  ]);
  return { detail, commits, activity: activity ?? [] };
}

export async function getRepoList(): Promise<RepoDetail[]> {
  "use cache";
  cacheLife("hours");
  return ghFetch<RepoDetail[]>(`/users/${USER}/repos?sort=updated&per_page=6`);
}

export async function getBranches(slug: string): Promise<Branch[]> {
  "use cache";
  cacheLife("hours");
  return ghFetch<Branch[]>(`/repos/${USER}/${slug}/branches?per_page=100`);
}

export async function getBranchCommits(slug: string, branch: string): Promise<Commit[]> {
  "use cache";
  cacheLife("hours");
  return ghFetch<Commit[]>(
    `/repos/${USER}/${slug}/commits?sha=${encodeURIComponent(branch)}&per_page=30`
  );
}

export async function getUserProfile(): Promise<UserProfile> {
  "use cache";
  cacheLife("hours");
  return ghFetch<UserProfile>(`/users/${USER}`);
}

export async function getUserContributions(): Promise<WeekActivity[]> {
  "use cache";
  cacheLife("hours");

  interface GQLDay { date: string; contributionCount: number }
  interface GQLWeek { contributionDays: GQLDay[] }
  interface GQLData {
    user: {
      contributionsCollection: {
        contributionCalendar: {
          weeks: GQLWeek[];
        };
      };
    };
  }

  const data = await ghGraphQL<GQLData>(`{
    user(login: "${USER}") {
      contributionsCollection {
        contributionCalendar {
          weeks {
            contributionDays {
              date
              contributionCount
            }
          }
        }
      }
    }
  }`);

  return data.user.contributionsCollection.contributionCalendar.weeks.map((w) => {
    const days = w.contributionDays.map((d) => d.contributionCount);
    const total = days.reduce((s, v) => s + v, 0);
    const week = Math.floor(new Date(w.contributionDays[0]?.date ?? 0).getTime() / 1000);
    return { week, days, total };
  });
}
