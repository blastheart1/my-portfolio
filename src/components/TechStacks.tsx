"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import {
  SiReact, SiNextdotjs, SiTailwindcss, SiTypescript, SiJavascript,
  SiNodedotjs, SiExpress, SiPostgresql, SiPython, SiSanity,
  SiDocker, SiAmazon, SiVercel, SiGit, SiHtml5, SiCss3, SiPhp,
  SiMysql, SiGithub, SiZapier, SiNetlify, SiGooglecloud,
  SiTensorflow, SiFastapi, SiSupabase
} from "react-icons/si";

// Master stack data
const stacks = {
  Frontend: [
    { name: "React", icon: SiReact },
    { name: "Next.js", icon: SiNextdotjs },
    { name: "TypeScript", icon: SiTypescript },
    { name: "JavaScript", icon: SiJavascript },
    { name: "TailwindCSS", icon: SiTailwindcss },
    { name: "HTML5", icon: SiHtml5 },
    { name: "CSS3", icon: SiCss3 },
    { name: "Wix" }, // text-only fallback
  ],
  Backend: [
    { name: "Python", icon: SiPython },
    { name: "FastAPI", icon: SiFastapi },
    { name: "Node.js", icon: SiNodedotjs },
    { name: "Express", icon: SiExpress },
    { name: "PostgreSQL", icon: SiPostgresql },
    { name: "Supabase", icon: SiSupabase },
    { name: "Sanity", icon: SiSanity },
    { name: "PHP", icon: SiPhp },
    { name: "MySQL", icon: SiMysql },
    { name: "Java" }, // text-only fallback
    { name: "C++" }, // text-only fallback
  ],
  "AI & ML": [
    { name: "TensorFlow", icon: SiTensorflow },
    { name: "Python", icon: SiPython },
  ],
  "DevOps & Cloud": [
    { name: "Docker", icon: SiDocker },
    { name: "AWS", icon: SiAmazon },
    { name: "Vercel", icon: SiVercel },
    { name: "Supabase", icon: SiSupabase },
    { name: "Git", icon: SiGit },
    { name: "GitHub", icon: SiGithub },
    { name: "Postman"}, // closest matching icon
    { name: "Zapier", icon: SiZapier },
    { name: "ngrok" }, // text-only
    { name: "Netlify", icon: SiNetlify },
    { name: "Google Cloud", icon: SiGooglecloud },
  ],
};

export default function TechStacks() {
  return (
    <section id="tech-stacks" className="py-16">
      <div className="container mx-auto px-6">
        <motion.h2
          className="text-3xl font-bold mb-10 text-center"
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          Tech Stacks
        </motion.h2>

        <div className="grid gap-10">
          {Object.entries(stacks).map(([category, tools], i) => (
            <motion.div
              key={category}
              className="space-y-6"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, delay: i * 0.2 }}
            >
              <h3 className="text-xl font-semibold">{category}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                {tools.map((tool, idx) => (
                  <motion.div
                    key={tool.name}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <Card className="rounded-2xl shadow-sm hover:shadow-md transition bg-background h-32">
                      <CardContent className="flex flex-col items-center justify-center p-4 h-full">
                        {tool.icon ? (
                          <tool.icon className="text-3xl mb-2 text-primary" />
                        ) : null}
                        <p className="text-sm font-medium text-center">
                          {tool.name}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
