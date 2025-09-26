"use client";

export default function StructuredData() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": "Antonio Luis Santos",
    "jobTitle": "Senior IBM ODM Specialist & QA Team Manager",
    "description": "Full-Stack Software Engineer specializing in generative AI, skilled in ReactJS, Next.js, TailwindCSS, Supabase, Python, FastAPI, and TensorFlow, with hands-on experience integrating AI APIs such as OpenAI.",
    "url": "https://luis.dev",
    "image": "https://luis.dev/profile-photo2.png",
    "sameAs": [
      "https://www.linkedin.com/in/alasantos01/",
      "https://www.instagram.com/0xlv1s_/",
      "https://github.com/antonioluis-santos1"
    ],
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Manila",
      "addressCountry": "Philippines"
    },
    "email": "antonioluis.santos1@gmail.com",
    "knowsAbout": [
      "Full-Stack Development",
      "AI Integration",
      "Quality Assurance",
      "IBM ODM",
      "React",
      "Next.js",
      "TypeScript",
      "Python",
      "TensorFlow",
      "Machine Learning",
      "Software Engineering"
    ],
    "worksFor": {
      "@type": "Organization",
      "name": "Bell Canada Inc.",
      "description": "Digital Billboards Division"
    },
    "hasOccupation": {
      "@type": "Occupation",
      "name": "Senior IBM ODM Specialist & QA Team Manager",
      "description": "Lead QA for large-scale, customer-facing platforms with focus on accuracy, reliability, and seamless delivery while fostering a culture of collaboration and accountability."
    },
    "alumniOf": {
      "@type": "EducationalOrganization",
      "name": "Software Development & QA"
    }
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}
