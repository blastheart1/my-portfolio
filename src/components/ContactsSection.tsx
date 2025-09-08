"use client";

import { Button } from "@/components/ui/button";
import { SiLinkedin, SiInstagram } from "react-icons/si";
import { HiOutlineLocationMarker, HiOutlineMail } from "react-icons/hi";

export default function ContactSection() {
  return (
    <section className="bg-[#0033A0] text-white py-24 px-6 text-center">
      <h2 className="text-3xl sm:text-4xl font-bold mb-4 animate-fadeInUp">
        Let’s build something amazing together
      </h2>
      <p
        className="text-lg sm:text-xl mb-8 animate-fadeInUp"
        style={{ animationDelay: "0.2s" }}
      >
        I’m always open to new opportunities, collaborations, or a chat about tech.
      </p>

      {/* Buttons */}
      <div
        className="flex flex-col sm:flex-row justify-center gap-4 mb-6 animate-fadeInUp"
        style={{ animationDelay: "0.4s" }}
      >
        <Button
          as="a"
          href="mailto:antonioluis.santos1@gmail.com"
          className="bg-white text-[#0033A0] hover:bg-gray-100 flex items-center gap-2"
        >
          <HiOutlineMail className="text-xl" /> Email Me
        </Button>
        <Button
          as="a"
          href="https://www.linkedin.com/in/alasantos01/"
          target="_blank"
          className="bg-gray-100 text-[#0033A0] hover:bg-white flex items-center gap-2"
        >
          <SiLinkedin className="text-xl" /> LinkedIn
        </Button>
        <Button
          as="a"
          href="https://www.instagram.com/0xlv1s_/"
          target="_blank"
          className="bg-gray-100 text-[#0033A0] hover:bg-white flex items-center gap-2"
        >
          <SiInstagram className="text-xl" /> Instagram
        </Button>
      </div>

      {/* Location */}
      <div
        className="flex justify-center items-center gap-2 text-sm sm:text-base animate-fadeInUp"
        style={{ animationDelay: "0.6s" }}
      >
        <HiOutlineLocationMarker className="text-xl" />
        <span>Manila, Philippines</span>
      </div>
    </section>
  );
}
