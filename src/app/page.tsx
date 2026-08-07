import lazyLoad from "next/dynamic";
import ParallaxBackground from "@/components/ParallaxBackground";
import CosmicHero from "@/components/CosmicHero";
import AboutSection from "@/components/AboutSection";
import ExperienceSection from "@/components/ExperienceSection";
import TechStacks from "@/components/TechStacks";
import ScrollFadeEffect from "@/components/ScrollFadeEffect";
import SplashWrapper from "@/components/SplashWrapper";
import LabSection from "@/components/LabSection";
import FAQSection from "@/components/FAQSection";
import {
  getExperienceEntries,
  getServiceTiers,
  getSectionContent,
  getSectionVisibility,
  getSplashEnabled,
  getSplashVersion,
  getAllSectionHeadings,
  getProjects,
} from "@/lib/content-queries";

// This page is statically rendered and served from the edge cache. Admin edits
// show up immediately because every mutating handler under /api/admin/* calls
// revalidatePath('/') — see docs/plans/AUDIT-2026-08-02.md §2.1. Do NOT add
// `force-dynamic` here: it disables the cache entry those calls invalidate,
// which makes the site slower AND turns all 11 revalidatePath calls into
// no-ops. `revalidate` is a staleness floor in case an invalidation is missed.
export const revalidate = 3600;

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
  const [experienceEntries, serviceTiers, heroContent, aboutContent, visibility, splashEnabled, splashVersion, headings, projectRows] = await Promise.all([
    getExperienceEntries(),
    getServiceTiers(),
    getSectionContent('hero'),
    getSectionContent('about'),
    getSectionVisibility(),
    getSplashEnabled(),
    getSplashVersion(),
    getAllSectionHeadings(),
    getProjects(),
  ]);

  const show = (id: string) => visibility[id] !== false;

  return (
    <SplashWrapper splashEnabled={splashEnabled} splashVersion={splashVersion}>
      <main className="relative z-0 bg-background text-foreground min-h-screen flex flex-col">
        <ParallaxBackground />

        <div className="relative z-10 flex-1">
          {/* Scroll-driven space hero. It resolves to white, so the sections
              below it read as the sky clearing rather than a hard cut. */}
          <section id="home">
            <CosmicHero
              name={heroContent.name || undefined}
              tagline={heroContent.description || undefined}
              ctaLabel={heroContent.cta_label || undefined}
              ctaHref={
                heroContent.cta_url ||
                'https://calendly.com/antonioluis-santos1/30min'
              }
            />
          </section>

          {/* Ramp out of the hero.
              CosmicHero resolves to a flat --background, but the page behind
              it is ParallaxBackground's fixed white -> gray-200 gradient. Where
              the hero ended, flat white met mid-grey as a hard horizontal line.
              This fades the hero's colour out so the page gradient arrives
              gradually, and doubles as breathing room before About. */}
          <div
            aria-hidden="true"
            className="h-[35vh] bg-gradient-to-b from-[var(--background)] to-transparent"
          />

          {show('about') && (
            <ScrollFadeEffect fadeStartPoint={0.7} fadeIntensity={1.2}>
              <AboutSection initialContent={aboutContent} />
            </ScrollFadeEffect>
          )}

          {show('experience') && (
            <ScrollFadeEffect fadeStartPoint={0.75} fadeIntensity={1.3}>
              <ExperienceSection
                initialEntries={experienceEntries}
                heading={headings.experience?.heading}
                subheading={headings.experience?.subheading}
              />
            </ScrollFadeEffect>
          )}

          {show('skills') && (
            <ScrollFadeEffect fadeStartPoint={0.8} fadeIntensity={1.4}>
              <section id="skills">
                <TechStacks
                  heading={headings.skills?.heading}
                  subheading={headings.skills?.subheading}
                />
              </section>
            </ScrollFadeEffect>
          )}

          {show('projects') && (
            <ScrollFadeEffect fadeStartPoint={0.85} fadeIntensity={1.5}>
              <ProjectsSection
                initialProjects={projectRows}
                heading={headings.projects?.heading}
                subheading={headings.projects?.subheading}
              />
            </ScrollFadeEffect>
          )}

          <ScrollFadeEffect fadeStartPoint={0.87} fadeIntensity={1.5}>
            <LabSection />
          </ScrollFadeEffect>

          {/* Sits after The Lab so the highest-intent copy lands once the work
              has spoken for itself. Also what makes the FAQPage JSON-LD in
              StructuredData legitimate — the markup describes content that is
              genuinely on the page. */}
          <FAQSection
            heading={headings.faq?.heading}
            subheading={headings.faq?.subheading}
          />

          {show('services') && (
            <ScrollFadeEffect fadeStartPoint={0.9} fadeIntensity={1.6}>
              <section id="services">
                <ServicesSection
                  initialTiers={serviceTiers}
                  heading={headings.services?.heading}
                  subheading={headings.services?.subheading}
                />
              </section>
            </ScrollFadeEffect>
          )}

          {show('blog') && (
            <ScrollFadeEffect fadeStartPoint={0.95} fadeIntensity={1.7}>
              <section id="blog">
                <BlogSection
                  heading={headings.blog?.heading}
                  subheading={headings.blog?.subheading}
                />
              </section>
            </ScrollFadeEffect>
          )}

          {show('contact') && (
            <ContactSection
              heading={headings.contact?.heading}
              subheading={headings.contact?.subheading}
            />
          )}
        </div>

        <footer className="py-12 text-center text-sm text-muted-foreground relative z-10 mt-auto">
          © {new Date().getFullYear()} Antonio Luis Santos. All rights reserved.
        </footer>
      </main>
    </SplashWrapper>
  );
}
