"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import StackBadge from "./StackBadge";

const projects = [
  {
    title: "Pilates With Bee",
    description:
      "Built an online Pilates clinic platform for scheduling sessions, managing content, and providing virtual consultations. Integrated headless CMS and automation tools for streamlined client management.",
    tech: ["Next.js", "React", "Tailwind CSS", "Sanity CMS", "Zapier", "Vercel"],
    link: "https://github.com/blastheart1/PWB_1.0",
  },
  {
    title: "AI-powered Knowledge Hub",
    description:
      "A web app where users upload documents and the system uses embeddings (OpenAI / local LLMs) to make them searchable in natural language. Highlights full-stack, AI integration, database work, authentication, and modern UI.",
    tech: ["Next.js", "FastAPI", "PostgreSQL", "OpenAI", "Tailwind CSS"],
    link: "",
  },
  {
    title: "Authorize.Net Sandbox Platform",
    description:
      "Developed a sandbox platform to practice PHP and Authorize.Net integrations while ensuring secure transaction flows and compliance best practices. Users can simulate transactions, test payment logic, and monitor sandbox logs. Highlights secure API integration, PHP backend development, and payment compliance.",
    tech: ["PHP", "Authorize.Net API", "MySQL", "Tailwind CSS", "Vercel"],
    link: "https://github.com/blastheart1/authorize-net-sandbox",
  },
];

function ProjectDescription({ description }: { description: string }) {
  const [expanded, setExpanded] = useState(false);

  const handleToggle = (event: React.MouseEvent<HTMLSpanElement, MouseEvent>) => {
    event.preventDefault();
    event.stopPropagation();
    setExpanded((prev) => !prev);
  };

  return (
    <div className="flex flex-col">
      <AnimatePresence initial={false}>
        <motion.p
          key={expanded ? "expanded" : "collapsed"}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
          className={`text-sm text-gray-700 dark:text-gray-300 leading-relaxed overflow-hidden ${
            !expanded ? "line-clamp-3" : ""
          }`}
        >
          {description}
        </motion.p>
      </AnimatePresence>

      <span
        className="text-blue-600 text-sm mt-1 cursor-pointer hover:underline"
        onClick={handleToggle}
      >
        {expanded ? "See less" : "See more"}
      </span>
    </div>
  );
}

export default function ProjectsSection() {
  return (
    <section id="projects" className="px-6 py-32 max-w-6xl mx-auto">
      <motion.h2
        className="text-3xl font-semibold text-center text-gray-900 dark:text-gray-100 mb-16"
        initial={{ opacity: 0, y: -20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        Projects
      </motion.h2>

      <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project, i) => (
          <motion.a
            key={project.title}
            href={project.link}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, delay: i * 0.2 }}
            className="group"
          >
            <Card className="rounded-2xl shadow-md hover:shadow-lg hover:-translate-y-2 transition-transform duration-300 flex flex-col justify-between h-full p-8">
              <CardContent className="flex flex-col gap-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {project.title}
                </h3>

                <ProjectDescription description={project.description} />

                <div className="flex flex-wrap gap-3 mt-4">
                  {project.tech.map((tech) => (
                    <StackBadge key={tech} name={tech} />
                  ))}
                </div>
              </CardContent>

              {project.link && (
                <span className="mt-6 text-[#0033A0] dark:text-white font-medium group-hover:underline self-start">
                  View Project
                </span>
              )}
            </Card>
          </motion.a>
        ))}
      </div>
    </section>
  );
}
