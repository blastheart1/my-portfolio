interface ProjectCardProps {
  title: string;
  description: string;
  tech: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function ProjectCard({ title, description, tech, className, style }: ProjectCardProps) {
  return (
    <div
      className={`p-6 bg-[#E6ECFF] rounded-lg shadow-md hover:shadow-lg transition flex flex-col ${className}`}
      style={style}
    >
      <h3 className="text-xl font-bold text-[#0033A0]">{title}</h3>
      <p className="mt-2 text-gray-700 text-sm flex-1">{description}</p>
      <p className="mt-2 text-gray-500 text-xs">{tech}</p>
    </div>
  );
}
