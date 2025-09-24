import ParallaxBackground from "@/components/ParallaxBackground";
import HeroSection from "@/components/HeroSection";
import AboutSection from "@/components/AboutSection";
import ExperienceSection from "@/components/ExperienceSection";
import TechStacks from "@/components/TechStacks";
import ProjectsSection from "@/components/ProjectsSection";
import ServicesSection from "@/components/ServicesSection";
import ContactSection from "@/components/ContactSection";
import ScrollFadeEffect from "@/components/ScrollFadeEffect";

export default function Home() {
  return (
    <main className="relative z-0 bg-background text-foreground min-h-screen flex flex-col">
      <ParallaxBackground />

      <div className="relative z-10 flex-1">
        <section id="home">
          <HeroSection />
        </section>
        
        <ScrollFadeEffect fadeStartPoint={0.7} fadeIntensity={1.2}>
          <AboutSection />
        </ScrollFadeEffect>
        
        <ScrollFadeEffect fadeStartPoint={0.75} fadeIntensity={1.3}>
          <ExperienceSection />
        </ScrollFadeEffect>
        
        <ScrollFadeEffect fadeStartPoint={0.8} fadeIntensity={1.4}>
          <section id="skills">
            <TechStacks />
          </section>
        </ScrollFadeEffect>
        
        <ScrollFadeEffect fadeStartPoint={0.85} fadeIntensity={1.5}>
          <ProjectsSection />
        </ScrollFadeEffect>
        
        <ScrollFadeEffect fadeStartPoint={0.9} fadeIntensity={1.6}>
          <section id="services">
            <ServicesSection />
          </section>
        </ScrollFadeEffect>
        
        <ContactSection />
      </div>

      <footer className="py-12 text-center text-sm text-muted-foreground relative z-10 mt-auto">
        © {new Date().getFullYear()} Antonio Luis Santos. All rights reserved.
      </footer>
    </main>
  );
}
