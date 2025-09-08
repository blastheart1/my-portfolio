interface SkillsBadgeProps {
  skill: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function SkillsBadge({ skill, className, style }: SkillsBadgeProps) {
  return (
    <span
      className={`px-4 py-2 bg-[#0033A0] text-white rounded-full text-sm font-medium font-sans ${className}`}
      style={style}
    >
      {skill}
    </span>
  );
}
