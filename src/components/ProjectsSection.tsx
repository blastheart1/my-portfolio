"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import StackBadge from "./StackBadge";

const projects = [
  {
    title: "Pilates With Bee",
    description:
      "Online Pilates clinic platform built for scheduling, content, and consultations.",
    tech: ["Next.js", "Tailwind CSS", "React", "Sanity", "Zapier"],
    link: "https://github.com/blastheart1/Pilates-With-Bee",
  },
  {
    title: "AI-powered Knowledge Hub",
    description:
      "A web app where users upload documents and the system uses embeddings (OpenAI / local LLMs) to make them searchable in natural language. Highlights full-stack, AI integration, database work, authentication, and modern UI.",
    tech: ["Next.js", "FastAPI", "PostgreSQL", "OpenAI", "Tailwind CSS"],
    link: "#",
  },
  {
    title: "Personal Finance Dashboard",
    description:
      "Pulls transactions from dummy bank APIs, allowing users to categorize spending, set budgets, and visualize insights. Highlights API integration, secure auth, data visualization, and complex logic.",
    tech: ["React", "Node.js", "PostgreSQL", "OAuth", "Tailwind CSS"],
    link: "#",
  },
];

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
                <p className="text-sm text-gray-700 dark:text-gray-300 flex-1 leading-relaxed">
                  {project.description}
                </p>
                <div className="flex flex-wrap gap-3 mt-4">
                  {project.tech.map((tech) => (
                    <StackBadge key={tech} name={tech} />
                  ))}
                </div>
              </CardContent>
              <span className="mt-6 text-[#0033A0] dark:text-white font-medium group-hover:underline self-start">
  View Project
</span>

            </Card>
          </motion.a>
        ))}
      </div>
    </section>
  );
}
