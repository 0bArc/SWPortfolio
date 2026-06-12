import Hero from "@/features/home/components/Hero";

export default function HeroWrapper() {
  const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "";
  const githubUser = process.env.NEXT_PUBLIC_GITHUB_USER ?? "";
  const githubUrl = githubUser ? `https://github.com/${githubUser}` : "https://github.com/";

  return <Hero contactEmail={contactEmail} githubUrl={githubUrl} />;
}
