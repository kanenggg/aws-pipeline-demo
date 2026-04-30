"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaRocket,
  FaCheckCircle,
  FaLightbulb,
  FaTimes,
  FaInfoCircle,
} from "react-icons/fa";

type CardData = {
  id: number;
  name_th: string;
  name_eng: string;
  role: string;
  image: string;
};

export default function AboutData() {
  const { t } = useTranslation("common");
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);

  const cards: CardData[] = [
    {
      id: 1,
      name_th: "บุณสิตา ปวงอาจ",
      name_eng: "(BOONSITA PUANGART)",
      role: "Designer",
      image: "/images/profile/boonsita.jpg",
    },
    {
      id: 2,
      name_th: "ศิรชัช อรุณแจ้ง",
      name_eng: "(SIRACHAT ARUNJANG)",
      role: "Frontend Developer",
      image: "/images/profile/sirachat.jpg",
    },
    {
      id: 3,
      name_th: "ศุภณัฐ แสงตุ๊",
      name_eng: "(SUPANAS SANGTU)",
      role: "Backend Developer",
      image: "/images/profile/supanas.jpg",
    },
    {
      id: 4,
      name_th: "เทพทัต แผนสันเที๊ยะ",
      name_eng: "(THEPTHAT PHAENSANTHIA)",
      role: "DevOps",
      image: "/images/profile/thepthat.png",
    },
    {
      id: 5,
      name_th: "เบญญาภา แก้วพาปราบ",
      name_eng: "(BENYAPA KAEOPHAPRAP)",
      role: "UI/UX Designer",
      image: "/images/profile/benyapa.jpg",
    },
    {
      id: 6,
      name_th: "ดร.สุรเดช จิตประไพกุลศาล",
      name_eng: "(DR. SURADET JITPRAPAIKULSARN)",
      role: "ADVISOR",
      image: "/images/profile/suradet.png",
    },
    {
      id: 7,
      name_th: "ผศ.ดร.สสิกรณณ์ เหลืองวิชชเจริญ",
      name_eng: "(ASST. PROF. DR. SASIKORN LEUNGVICHCHAROEN)",
      role: "ADVISOR",
      image: "/images/profile/sasikorn.png",
    },
    {
      id: 8,
      name_th: "กรกฎ อนุวรรณ์",
      name_eng: "(KORRAKOD ANUWAN)",
      role: "Fullstack Developer",
      image: "/images/profile/korrakod.jpg",
    },
    {
      id: 9,
      name_th: "ภัทร ทานิล",
      name_eng: "(PATTAR THANIL)",
      role: "Data Analyst",
      image: "/images/profile/pattar.jpg",
    },
    {
      id: 10,
      name_th: "ธนวัฒน์ สุภสมบัติโอฬาร",
      name_eng: "(THANAWAT SUPASOMBATIO-LARN)",
      role: "Research",
      image: "/images/profile/thanawat.jpg",
    },
  ];

  const versions = [
    {
      id: 1,
      title: "Version 1.0",
      subtitle: "Conceptual Design & Launch",
      description:
        "เริ่มต้นการออกแบบระบบจากแนวคิดการวิเคราะห์ผลสัมฤทธิ์ทางการศึกษา เน้นการวางโครงสร้าง UI/UX และการทำความเข้าใจความต้องการของอาจารย์ผู้สอน",
      features: [
        "Initial UI Design",
        "Database Schema Design",
        "Stakeholder Requirements",
      ],
      icon: <FaLightbulb />,
      team: cards.slice(0, 2),
    },
    {
      id: 2,
      title: "Version 2.0",
      subtitle: "Core System Engineering",
      description:
        "พัฒนาฐานระบบหลักให้แข็งแกร่ง พัฒนาฟังก์ชันการคำนวณ PLO/CLO และระบบจัดการบัญชีผู้ใช้ให้ทำงานได้อย่างมีประสิทธิภาพ",
      features: [
        "API Development",
        "Authentication System",
        "PLO/CLO Logic Engine",
      ],
      icon: <FaRocket />,
      team: cards.slice(2, 5),
    },
    {
      id: 3,
      title: "Version 3.0",
      subtitle: "Analysis & Advanced Research",
      description:
        "มุ่งเน้นการทำ Analytics เชิงลึก การแสดงผลกราฟเปรียบเทียบผลการเรียน และการส่งออกข้อมูลรายงานในรูปแบบสากล",
      features: [
        "Data Visualization",
        "Excel/Capture Export",
        "Advanced Analytics Dashboard",
      ],
      icon: <FaCheckCircle />,
      team: cards.slice(7, 10),
    },
  ];

  const advisors = cards.filter((c) => c.role === "ADVISOR");

  return (
    <div className="min-h-screen bg-white">
      {/* 1. HERO TITLE - Centered */}
      <div className="max-w-7xl mx-auto px-6 pt-24 pb-16 flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-b-4 border-blue-600 pb-6 mb-4"
        >
          <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tighter">
            THE <span className="text-blue-600">TEAM</span>
          </h1>
        </motion.div>
        <p className="text-lg text-slate-500 font-medium uppercase tracking-[0.3em]">
          Evolution through collaboration
        </p>
      </div>

      {/* 2. VERSION SECTIONS - Centered */}
      <div className="max-w-7xl mx-auto px-6 space-y-32 pb-32">
        {versions.map((v, idx) => (
          <section key={idx} className="flex flex-col items-center">
            <div className="flex flex-col items-center gap-4 mb-12 text-center relative">
              <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-xl mb-2">
                {v.icon}
              </div>
              <div className="flex items-center gap-3">
                <h2 className="text-4xl font-black text-slate-900 leading-none">
                  {v.title}
                </h2>
                {/* 🟢 Icon-only Detail Button */}
                <button
                  onClick={() => setSelectedVersion(v.id)}
                  className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-full transition-all active:scale-90"
                  title="View Details"
                >
                  <FaInfoCircle size={22} />
                </button>
              </div>
              <p className="text-blue-500 font-bold uppercase text-xs tracking-widest">
                {v.subtitle}
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-10 w-full max-w-6xl">
              {v.team.map((person) => (
                <div key={person.id} className="flex justify-center">
                  <MemberCard data={person} />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* 🟢 Improved Centered Modal */}
      <AnimatePresence>
        {selectedVersion && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedVersion(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-[3rem] p-10 shadow-2xl flex flex-col items-center text-center"
            >
              <button
                onClick={() => setSelectedVersion(null)}
                className="absolute top-8 right-8 text-slate-300 hover:text-slate-900 transition-colors"
              >
                <FaTimes size={20} />
              </button>

              {versions.find((v) => v.id === selectedVersion) && (
                <>
                  <div className="bg-blue-600 text-white p-5 rounded-3xl text-3xl mb-6 shadow-lg shadow-blue-200">
                    {versions.find((v) => v.id === selectedVersion)?.icon}
                  </div>
                  <h2 className="text-3xl font-black text-slate-900 mb-2">
                    {versions.find((v) => v.id === selectedVersion)?.title}
                  </h2>
                  <p className="text-blue-600 font-bold uppercase tracking-widest text-xs mb-6">
                    {versions.find((v) => v.id === selectedVersion)?.subtitle}
                  </p>
                  <p className="text-slate-600 leading-relaxed mb-8">
                    {
                      versions.find((v) => v.id === selectedVersion)
                        ?.description
                    }
                  </p>
                  <div className="w-full">
                    <div className="flex flex-wrap justify-center gap-2">
                      {versions
                        .find((v) => v.id === selectedVersion)
                        ?.features.map((f, i) => (
                          <span
                            key={i}
                            className="px-4 py-2 bg-slate-50 text-slate-500 rounded-xl text-xs font-semibold border border-slate-100"
                          >
                            {f}
                          </span>
                        ))}
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. ADVISOR SECTION - Centered */}
      <section className="bg-slate-50 border-t border-slate-200 py-24">
        <div className="max-w-7xl mx-auto px-6 flex flex-col items-center">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-slate-900 mb-4">
              Mentorship Board
            </h2>
            <div className="h-1.5 w-24 bg-blue-600 mx-auto rounded-full" />
          </div>
          <div className="flex flex-wrap justify-center gap-10 w-full">
            {advisors.map((advisor) => (
              <AdvisorCard key={advisor.id} data={advisor} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function MemberCard({ data }: { data: CardData }) {
  return (
    <motion.div
      whileHover={{ y: -10 }}
      className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 flex flex-col items-center text-center transition-all group w-full max-w-[280px]"
    >
      <div className="relative w-[160px] h-[210px] mb-6 rounded-[2rem] overflow-hidden bg-slate-100 shadow-inner">
        <Image
          src={data.image || "/images/default-avatar.png"}
          alt={data.name_th}
          fill
          className="object-cover group-hover:scale-110 transition-transform duration-700"
        />
      </div>
      <h3 className="text-xl font-bold text-slate-800 mb-1">{data.name_th}</h3>
      <p className="text-[13px] font-bold text-slate-400 uppercase mb-6 tracking-wider">
        {data.name_eng.replace(/[()]/g, "")}
      </p>
      <div className="mt-auto px-5 py-2 bg-blue-50 text-blue-600 text-[10px] font-black rounded-full uppercase tracking-widest">
        {data.role}
      </div>
    </motion.div>
  );
}

function AdvisorCard({ data }: { data: CardData }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-2xl flex flex-col items-center text-center gap-6 max-w-md w-full"
    >
      <div className="relative w-[180px] h-[240px] shrink-0">
        <div className="absolute inset-0 bg-blue-600 rounded-[2.5rem] translate-x-3 translate-y-3 opacity-10" />
        <div className="relative w-full h-full rounded-[2rem] overflow-hidden border-4 border-white shadow-2xl">
          <Image
            src={data.image || "/images/default-avatar.png"}
            alt={data.name_th}
            fill
            className="object-cover"
          />
        </div>
      </div>
      <div className="flex flex-col items-center">
        <span className="text-blue-600 font-black text-[10px] uppercase tracking-[0.2em] mb-3">
          Project Advisor
        </span>
        <h3 className="text-2xl font-black text-slate-900 mb-2 leading-tight">
          {data.name_th}
        </h3>
        <p className="text-xs font-bold text-slate-400 uppercase italic tracking-wide">
          {data.name_eng.replace(/[()]/g, "")}
        </p>
      </div>
    </motion.div>
  );
}
