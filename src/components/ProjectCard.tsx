"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ProjectCardProps {
  title: string;
  description: string;
  tech: string[];
  className?: string;
  style?: React.CSSProperties;
}

export default function ProjectCard({ title, description, tech, className, style }: ProjectCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`p-6 bg-[#E6ECFF] rounded-lg shadow-md hover:shadow-lg transition flex flex-col ${className}`}
      style={style}
    >
      <h3 className="text-xl font-bold text-[#0033A0]">{title}</h3>

      <AnimatePresence initial={false}>
        <motion.div
          key={expanded ? "expanded" : "collapsed"}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
          className="overflow-hidden"
        >
          <p className={`mt-2 text-gray-700 text-sm ${!expanded ? "line-clamp-3" : ""}`}>
            {description}
          </p>
        </motion.div>
      </AnimatePresence>

      <span
        className="text-blue-600 text-sm mt-1 cursor-pointer hover:underline"
        onClick={() => setExpanded(prev => !prev)}
      >
        {expanded ? "See less" : "See more"}
      </span>

      <p className="mt-2 text-gray-500 text-xs">{tech.join(", ")}</p>
    </div>
  );
}
