// Server component — no "use client" needed; renders as a plain <script> tag
export default function StructuredData() {
  const graph = [
    {
      "@type": "Person",
      "@id": "https://luis.dev/#person",
      "name": "Antonio Luis Santos",
      "jobTitle": "Senior IBM ODM Specialist & QA Team Manager",
      "description": "Full-Stack Software Engineer specializing in generative AI, skilled in ReactJS, Next.js, TailwindCSS, Supabase, Python, FastAPI, and TensorFlow.",
      "url": "https://luis.dev",
      "image": "https://luis.dev/profile-photo2.png",
      "sameAs": [
        "https://www.linkedin.com/in/alasantos01/",
        "https://www.instagram.com/0xlv1s_/",
        "https://github.com/blastheart1",
      ],
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "Manila",
        "addressCountry": "Philippines",
      },
      "knowsAbout": [
        "Full-Stack Development",
        "AI Integration",
        "Quality Assurance",
        "IBM ODM",
        "React",
        "Next.js",
        "TypeScript",
        "Python",
        "Machine Learning",
        "Software Engineering",
      ],
      "worksFor": {
        "@type": "Organization",
        "name": "Bell Canada Inc.",
        "description": "Digital Billboards Division",
      },
    },
    {
      "@type": "WebSite",
      "@id": "https://luis.dev/#website",
      "name": "Luis.dev",
      "url": "https://luis.dev",
      "description": "Portfolio and professional profile of Antonio Luis Santos — Full-Stack Developer, QA Specialist, and AI Engineer.",
      "author": { "@id": "https://luis.dev/#person" },
    },
  ];

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": graph,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}
