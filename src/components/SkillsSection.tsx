import SkillsBadge from "./SkillsBadge";

interface SkillsSectionProps {
  skills: string[];
}

export default function SkillsSection({ skills }: SkillsSectionProps) {
  return (
    <section id="skills" className="px-6 py-24 max-w-6xl mx-auto">
      <h2 className="text-3xl font-semibold text-center text-gray-900">Skills</h2>
      <div className="mt-8 flex flex-wrap justify-center gap-4">
        {skills.map((s, index) => (
          <SkillsBadge
            key={s}
            skill={s}
            className="animate-fadeInUp"
            style={{ animationDelay: `${0.1 * index}s` }}
          />
        ))}
      </div>
    </section>
  );
}
