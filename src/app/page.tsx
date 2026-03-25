import lazyLoad from "next/dynamic";
import ParallaxBackground from "@/components/ParallaxBackground";
import HeroSection from "@/components/HeroSection";
import AboutSection from "@/components/AboutSection";
import ExperienceSection from "@/components/ExperienceSection";
import TechStacks from "@/components/TechStacks";
import ScrollFadeEffect from "@/components/ScrollFadeEffect";
import SplashWrapper from "@/components/SplashWrapper";
import LabSection from "@/components/LabSection";
import {
  getExperienceEntries,
  getServiceTiers,
  getSectionContent,
  getSectionVisibility,
  getSplashEnabled,
} from "@/lib/content-queries";

// Force server-render on every request so DB edits show immediately
export const dynamic = "force-dynamic";

// Lazy load non-critical components
const ProjectsSection = lazyLoad(() => import("@/components/ProjectsSection"), {
  loading: () => <div className="h-96 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-brand)]"></div></div>
});

const ServicesSection = lazyLoad(() => import("@/components/ServicesSection"), {
  loading: () => <div className="h-96 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-brand)]"></div></div>
});

const ContactSection = lazyLoad(() => import("@/components/ContactSection"), {
  loading: () => <div className="h-96 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-brand)]"></div></div>
});

const BlogSection = lazyLoad(() => import("@/components/BlogSection"), {
  loading: () => <div className="h-96 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-brand)]"></div></div>
});

export default async function Home() {
  const [experienceEntries, serviceTiers, heroContent, aboutContent, visibility, splashEnabled] = await Promise.all([
    getExperienceEntries(),
    getServiceTiers(),
    getSectionContent('hero'),
    getSectionContent('about'),
    getSectionVisibility(),
    getSplashEnabled(),
  ]);

  const show = (id: string) => visibility[id] !== false;

  return (
    <SplashWrapper splashEnabled={splashEnabled}>
      <main className="relative z-0 bg-background text-foreground min-h-screen flex flex-col">
        <ParallaxBackground />

        <div className="relative z-10 flex-1">
          <section id="home">
            <HeroSection content={heroContent} />
          </section>

          {show('about') && (
            <ScrollFadeEffect fadeStartPoint={0.7} fadeIntensity={1.2}>
              <AboutSection initialContent={aboutContent} />
            </ScrollFadeEffect>
          )}

          {show('experience') && (
            <ScrollFadeEffect fadeStartPoint={0.75} fadeIntensity={1.3}>
              <ExperienceSection initialEntries={experienceEntries} />
            </ScrollFadeEffect>
          )}

          {show('skills') && (
            <ScrollFadeEffect fadeStartPoint={0.8} fadeIntensity={1.4}>
              <section id="skills">
                <TechStacks />
              </section>
            </ScrollFadeEffect>
          )}

          {show('projects') && (
            <ScrollFadeEffect fadeStartPoint={0.85} fadeIntensity={1.5}>
              <ProjectsSection />
            </ScrollFadeEffect>
          )}

          <ScrollFadeEffect fadeStartPoint={0.87} fadeIntensity={1.5}>
            <LabSection />
          </ScrollFadeEffect>

          {show('services') && (
            <ScrollFadeEffect fadeStartPoint={0.9} fadeIntensity={1.6}>
              <section id="services">
                <ServicesSection initialTiers={serviceTiers} />
              </section>
            </ScrollFadeEffect>
          )}

          {show('blog') && (
            <ScrollFadeEffect fadeStartPoint={0.95} fadeIntensity={1.7}>
              <section id="blog">
                <BlogSection />
              </section>
            </ScrollFadeEffect>
          )}

          {show('contact') && <ContactSection />}
        </div>

        <footer className="py-12 text-center text-sm text-muted-foreground relative z-10 mt-auto">
          © {new Date().getFullYear()} Antonio Luis Santos. All rights reserved.
        </footer>
      </main>
    </SplashWrapper>
  );
}
