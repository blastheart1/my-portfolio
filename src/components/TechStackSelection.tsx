"use client";

import { useState } from "react";
import StackBadge from "./StackBadge";

const stacks = {
  frontend: ["React", "Next.js", "TypeScript", "Tailwind CSS", "HTML5", "CSS3"],
  backend: ["Java", "Node.js", "PostgreSQL", "C++", "IBM ODM", "Sanity"],
  devops: ["Git", "Docker", "GitHub Actions", "AWS", "CI/CD Pipelines"],
};

export default function TechStacksSection() {
  const [expanded, setExpanded] = useState<{
    [key: string]: boolean;
  }>({ frontend: false, backend: false, devops: false });

  const toggleExpand = (key: string) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const renderStack = (title: string, key: keyof typeof stacks) => {
    const isExpanded = expanded[key];
    const items = stacks[key];
    const preview = items.slice(0, 3);

    return (
      <div className="p-6 bg-white dark:bg-[#0b0f19] rounded-2xl shadow-md hover:shadow-lg transition flex flex-col">
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          {title}
        </h3>
        <div className="flex flex-wrap gap-2">
          {(isExpanded ? items : preview).map((tech) => (
            <StackBadge key={tech} name={tech} />
          ))}
        </div>
        <button
          onClick={() => toggleExpand(key)}
          className="mt-4 text-sm font-medium text-[#0033A0] hover:underline self-start"
        >
          {isExpanded ? "Show Less" : "View All"}
        </button>
      </div>
    );
  };

  return (
    <section id="techstacks" className="px-6 py-24 max-w-6xl mx-auto">
      <h2 className="text-3xl font-semibold text-center text-gray-900 dark:text-gray-100 mb-12">
        Tech Stacks
      </h2>
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {renderStack("Front End", "frontend")}
        {renderStack("Back End", "backend")}
        {renderStack("DevOps & Cloud", "devops")}
      </div>
    </section>
  );
}
