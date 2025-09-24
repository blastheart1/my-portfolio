import ParallaxBackground from "@/components/ParallaxBackground";
import HeroSection from "@/components/HeroSection";
import AboutSection from "@/components/AboutSection";
import ExperienceSection from "@/components/ExperienceSection";
import TechStacks from "@/components/TechStacks";
import ProjectsSection from "@/components/ProjectsSection";
import ServicesSection from "@/components/ServicesSection";
import ContactSection from "@/components/ContactSection";

export default function Home() {
  return (
    <main className="relative z-0 bg-background text-foreground">
      <ParallaxBackground />

      <div className="relative z-10">
        <section id="home">
          <HeroSection />
        </section>
        <AboutSection />
        <ExperienceSection />
        <section id="skills">
          <TechStacks />
        </section>
        <ProjectsSection />
        <section id="services">
          <ServicesSection />
        </section>
        <ContactSection />
      </div>

      <footer className="py-12 text-center text-sm text-muted-foreground relative z-10">
        © {new Date().getFullYear()} Antonio Luis Santos. All rights reserved.
      </footer>
    </main>
  );
}
