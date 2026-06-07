import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext.tsx";
import api from "../../services/api.ts";
import { useAccessibility } from "../../context/AccessibilityContext.tsx";
import { motion, AnimatePresence } from "motion/react";
import { ConsentModal } from "../../components/ConsentModal.tsx";
import { 
  FileText, Sparkles, Download, 
  Layout, CheckCircle2, AlertTriangle, 
  CheckCircle, User, Briefcase, GraduationCap, Code,
  Mail, Phone, MapPin, Brain, RefreshCw, Trophy, Zap
} from "lucide-react";
import { GoogleGenAI } from "@google/genai";
import { Link, useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

// --- TEMPLATES ---

const HybridATSPremiumTemplate = ({ data, summary }: any) => (
  <div id="resume-content" className="bg-white p-12 text-slate-900 font-serif leading-normal w-[210mm] min-h-[297mm] mx-auto shadow-sm">
    <div className="text-center pb-4 mb-6 border-b border-slate-300">
      <h1 className="text-3xl font-bold uppercase tracking-tight mb-2 text-slate-900">{data.full_name}</h1>
      <div className="text-xs space-x-2 text-slate-700 font-mono">
        <span>{data.email}</span>
        <span>•</span>
        <span>{data.contact}</span>
        <span>•</span>
        <span>{data.address}</span>
      </div>
      <div className="text-xs flex justify-center gap-4 mt-2 font-mono text-indigo-800">
         {data.social_links_json?.linkedin && <a href={data.social_links_json.linkedin} className="underline" target="_blank" rel="noreferrer">LinkedIn</a>}
         {data.social_links_json?.github && <a href={data.social_links_json.github} className="underline" target="_blank" rel="noreferrer">GitHub</a>}
      </div>
    </div>

    <section className="mb-6">
      <h3 className="text-sm font-bold uppercase tracking-widest text-slate-800 border-b-2 border-slate-900 pb-1 mb-2">Professional Summary</h3>
      <p className="text-xs leading-relaxed text-slate-800">{summary}</p>
    </section>

    <section className="mb-6">
      <h3 className="text-sm font-bold uppercase tracking-widest text-slate-800 border-b-2 border-slate-900 pb-1 mb-2">Technical Skills</h3>
      <div className="grid grid-cols-1 gap-2 text-xs">
        <div>
          <span className="font-bold">Primary Skills: </span>
          {data.skills_json?.join(", ")}
        </div>
        <div>
          <span className="font-bold">Frameworks & Methodologies: </span>
          React, Node.js, Express, REST APIs, UI Design, Unit Testing
        </div>
        <div>
          <span className="font-bold">Databases & Tools: </span>
          MySQL, PostgreSQL, MongoDB, Git, Docker, Cloud Platforms
        </div>
      </div>
    </section>

    <section className="mb-6">
      <h3 className="text-sm font-bold uppercase tracking-widest text-slate-800 border-b-2 border-slate-900 pb-1 mb-2">Professional Experience</h3>
      <div className="space-y-4 font-serif">
        {data.experience_json?.map((exp: any, i: number) => (
          <div key={i} className="text-xs">
            <div className="flex justify-between font-bold text-slate-900">
              <span>{exp.company} — {exp.role}</span>
              <span>{exp.duration}</span>
            </div>
            <p className="text-slate-700 leading-relaxed mt-1">{exp.desc}</p>
            <ul className="list-disc pl-5 mt-1 text-[11px] text-slate-805 space-y-0.5">
              <li>Utilized software engineering workflows to deliver performant full-stack modules.</li>
              <li>Collaborated within multi-disciplinary agile squads to optimize product execution SLAs by 15%.</li>
            </ul>
          </div>
        ))}
        {(!data.experience_json || data.experience_json.length === 0 || data.experience_type === 'FRESHER') && (
          <div className="text-xs text-slate-500 italic">
            Upcoming engineering specialist with strong project-driven research background. Practiced in modern continuous integration pipelines and automated testing schedules.
          </div>
        )}
      </div>
    </section>

    <section className="mb-6">
      <h3 className="text-sm font-bold uppercase tracking-widest text-slate-800 border-b-2 border-slate-900 pb-1 mb-2">Academic History</h3>
      <div className="space-y-3 font-serif">
        {data.education_json?.sort((a: any, b: any) => (b.year || 0) - (a.year || 0)).map((edu: any, i: number) => (
          <div key={i} className="text-xs">
            <div className="flex justify-between font-bold text-slate-900">
              <span>{edu.level === 'Degree' ? edu.board : edu.school}</span>
              <span>{edu.year}</span>
            </div>
            <p>{edu.level === 'Degree' ? 'Bachelor of Technology' : edu.level} • Score Cumulative: {edu.percentage || edu.cgpa || edu.grade}</p>
          </div>
        ))}
      </div>
    </section>

    <section>
      <h3 className="text-sm font-bold uppercase tracking-widest text-slate-800 border-b-2 border-slate-900 pb-1 mb-2">Technical Projects</h3>
      <div className="space-y-4 font-serif">
        {data.projects_json?.map((p: any, i: number) => (
          <div key={i} className="text-xs">
             <div className="flex justify-between font-bold text-slate-900 mb-1">
                <span className="uppercase">{p.name}</span>
                <span className="font-mono text-[10px] text-indigo-700">{p.tech_stack}</span>
             </div>
             <p className="text-slate-700 leading-relaxed">{p.description}</p>
             <ul className="list-disc pl-5 mt-1 text-[11px] text-slate-805 space-y-0.5">
                <li>Architected full features using industry standards with comprehensive type checks.</li>
                <li>Pioneered responsive client-side layout adjustments ensuring cross-platform browser compatibility.</li>
             </ul>
          </div>
        ))}
      </div>
    </section>
  </div>
);

const SiliconValleyTechTemplate = ({ data, summary }: any) => (
  <div id="resume-content" className="bg-white p-12 text-slate-900 font-sans leading-normal w-[210mm] min-h-[297mm] mx-auto shadow-sm">
    <div className="flex justify-between items-start border-b-4 border-slate-900 pb-4 mb-6">
      <div>
        <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900">{data.full_name}</h1>
        <p className="text-sm font-extrabold text-indigo-600 uppercase tracking-widest mt-1">Software Engineer Specialist</p>
      </div>
      <div className="text-right text-xs font-semibold text-slate-605 space-y-1">
         <p>{data.email}</p>
         <p>{data.contact}</p>
         <p>{data.address?.split(',').slice(-2).join(', ') || 'Remote / Eligible'}</p>
         <div className="flex justify-end gap-3 text-indigo-600 font-bold mt-1">
            {data.social_links_json?.linkedin && <a href={data.social_links_json.linkedin} className="hover:underline" target="_blank" rel="noreferrer">linkedin</a>}
            {data.social_links_json?.linkedin && data.social_links_json?.github && <span>•</span>}
            {data.social_links_json?.github && <a href={data.social_links_json.github} className="hover:underline" target="_blank" rel="noreferrer">github</a>}
         </div>
      </div>
    </div>

    <section className="mb-6">
      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-450 border-b border-slate-200 pb-1 mb-2.5">01 / Summary</h3>
      <p className="text-xs leading-relaxed text-slate-700">{summary}</p>
    </section>

    <section className="mb-6">
      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-450 border-b border-slate-200 pb-1 mb-2.5">02 / Technical Skills</h3>
      <div className="flex flex-wrap gap-2">
         {data.skills_json?.map((s: string) => (
            <span key={s} className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded font-mono text-[10px] font-bold border border-slate-200/50">
               {s}
            </span>
         ))}
         <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded font-mono text-[10px] font-bold border border-indigo-100/50">System Architecture</span>
         <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded font-mono text-[10px] font-bold border border-indigo-100/50">CI/CD Pipelines</span>
         <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded font-mono text-[10px] font-bold border border-indigo-100/50">Git Workflows</span>
      </div>
    </section>

    <section className="mb-6">
      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-450 border-b border-slate-200 pb-1 mb-2.5">03 / Key Projects</h3>
      <div className="space-y-4">
         {data.projects_json?.map((p: any, i: number) => (
            <div key={i}>
               <div className="flex justify-between items-baseline">
                  <h4 className="text-sm font-bold text-slate-900">{p.name}</h4>
                  <span className="text-[10px] font-mono text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">{p.tech_stack}</span>
               </div>
               <p className="text-xs text-slate-605 mt-1 leading-relaxed">{p.description}</p>
               <div className="grid grid-cols-2 gap-x-4 text-[10px] text-slate-500 mt-1.5 font-medium">
                  <div className="flex items-center gap-1.5">⚡ Optimized performance and reduced page rendering cycles by 30%.</div>
                  <div className="flex items-center gap-1.5">🛠️ Maintained 95%+ code coverage using comprehensive modern unit tests.</div>
               </div>
            </div>
         ))}
      </div>
    </section>

    <section className="mb-6">
      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-450 border-b border-slate-200 pb-1 mb-2.5">04 / Experience</h3>
      <div className="space-y-4">
         {data.experience_json?.map((exp: any, i: number) => (
            <div key={i}>
               <div className="flex justify-between items-baseline font-bold text-slate-900 text-xs">
                  <span>{exp.company} — {exp.role}</span>
                  <span className="font-mono text-slate-500 font-normal">{exp.duration}</span>
               </div>
               <p className="text-xs text-slate-600 leading-relaxed mt-1">{exp.desc}</p>
            </div>
         ))}
         {(!data.experience_json || data.experience_json.length === 0 || data.experience_type === 'FRESHER') && (
            <div className="text-xs text-slate-500 italic">
               fresher software architect. Completed intensive bootcamps focused on distributed systems, enterprise databases, and clean code principles. Ready to contribute code immediately.
            </div>
         )}
      </div>
    </section>

    <section className="mb-6">
      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-450 border-b border-slate-200 pb-1 mb-2.5">05 / Education</h3>
      <div className="space-y-3">
         {data.education_json?.sort((a: any, b: any) => (b.year || 0) - (a.year || 0)).map((edu: any, i: number) => (
            <div key={i} className="flex justify-between items-baseline text-xs">
               <div>
                  <span className="font-bold text-slate-900">{edu.level === 'Degree' ? 'Bachelor of Technology in CS / IT' : edu.level}</span>
                  <span className="text-slate-500 text-[11px]"> ({edu.board || edu.school})</span>
               </div>
               <div className="text-right font-mono">
                  <span className="font-bold text-slate-800">{edu.year}</span>
                  <span className="text-slate-400"> | CGPA {edu.percentage || edu.cgpa || edu.grade}</span>
               </div>
            </div>
         ))}
      </div>
    </section>
  </div>
);

const ClassicATSTemplate = ({ data, summary, photo }: any) => (
  <div id="resume-content" className="bg-white p-12 text-slate-900 font-serif leading-relaxed w-[210mm] min-h-[297mm] mx-auto shadow-sm">
    <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-8">
      <div className="flex-1">
        <h1 className="text-4xl font-black uppercase tracking-tight mb-2">{data.full_name}</h1>
        <div className="text-xs space-y-1 text-slate-600">
          <p>{data.email} • {data.contact}</p>
          <p>{data.address}</p>
          <div className="flex gap-3">
             {data.social_links_json?.linkedin && <span>LinkedIn: {data.social_links_json.linkedin}</span>}
             {data.social_links_json?.github && <span>GitHub: {data.social_links_json.github}</span>}
          </div>
        </div>
      </div>
      {photo && (
        <img src={photo} crossOrigin="anonymous" className="w-24 h-24 rounded shadow-sm grayscale ml-6 object-cover" />
      )}
    </div>

    <section className="mb-8">
      <h3 className="text-sm font-black uppercase tracking-widest border-b border-slate-200 mb-3">Professional Summary</h3>
      <p className="text-xs leading-relaxed italic">{summary}</p>
    </section>

    <section className="mb-8">
      <h3 className="text-sm font-black uppercase tracking-widest border-b border-slate-200 mb-3">Core Expertise</h3>
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs">
        {data.skills_json?.map((s: string) => (
          <span key={s} className="font-bold">• {s}</span>
        ))}
      </div>
    </section>

    <section className="mb-8">
      <h3 className="text-sm font-black uppercase tracking-widest border-b border-slate-200 mb-3">Work Experience</h3>
      <div className="space-y-4">
        {data.experience_json?.map((exp: any, i: number) => (
          <div key={i} className="text-xs">
            <div className="flex justify-between font-black uppercase">
              <span>{exp.company}</span>
              <span>{exp.duration}</span>
            </div>
            <p className="font-bold text-slate-600 italic mb-1">{exp.role}</p>
            <p className="text-slate-500">{exp.desc}</p>
          </div>
        ))}
        {data.experience_type === 'FRESHER' && <p className="text-xs text-slate-400 italic">No formal work experience (Fresher status)</p>}
      </div>
    </section>

    <section className="mb-8">
      <h3 className="text-sm font-black uppercase tracking-widest border-b border-slate-200 mb-3">Education</h3>
      <div className="space-y-3">
        {data.education_json?.sort((a: any, b: any) => (b.year || 0) - (a.year || 0)).map((edu: any, i: number) => (
          <div key={i} className="text-xs">
            <div className="flex justify-between font-black">
              <span>{edu.level === 'Degree' ? edu.board : edu.school}</span>
              <span>{edu.year}</span>
            </div>
            <p>{edu.level === 'Degree' ? 'Bachelor Degree' : edu.level} • {edu.percentage || edu.cgpa || edu.grade}</p>
          </div>
        ))}
      </div>
    </section>

    <section>
      <h3 className="text-sm font-black uppercase tracking-widest border-b border-slate-200 mb-3">Key Projects</h3>
      <div className="space-y-4">
        {data.projects_json?.map((p: any, i: number) => (
          <div key={i} className="text-xs">
             <p className="font-black uppercase mb-1">{p.name}</p>
             <p className="text-slate-600">{p.description}</p>
             <div className="flex gap-2 mt-1">
                {p.tech_stack?.split(',').map((t: string) => (
                  <span key={t} className="text-[10px] font-bold text-slate-400">#{t.trim()}</span>
                ))}
             </div>
          </div>
        ))}
      </div>
    </section>
  </div>
);

const AcademicLatexTemplate = ({ data, summary }: any) => (
  <div id="resume-content" className="bg-white p-[10mm] text-[#000000] font-serif w-[210mm] min-h-[297mm] mx-auto shadow-sm leading-[1.2]">
    {/* Header */}
    <div className="text-center mb-4">
      <h1 className="text-[24pt] font-bold uppercase mb-1">{data.full_name}</h1>
      <div className="text-[10pt] flex items-center justify-center gap-2 flex-wrap">
        <span>{data.contact}</span>
        <span>•</span>
        <a href={`mailto:${data.email}`} className="text-blue-700 underline">{data.email}</a>
        <span>•</span>
        <span>{data.address?.split(',').pop()?.trim() || 'Location'}</span>
      </div>
      <div className="text-[10pt] flex items-center justify-center gap-2 mt-1">
        {data.social_links_json?.github && <a href={data.social_links_json.github} className="text-blue-700 underline">github.com/{data.social_links_json.github.split('/').pop()}</a>}
        {data.social_links_json?.github && data.social_links_json?.linkedin && <span>•</span>}
        {data.social_links_json?.linkedin && <a href={data.social_links_json.linkedin} className="text-blue-700 underline">linkedin.com/in/{data.social_links_json.linkedin.split('/').pop()}</a>}
      </div>
    </div>

    {/* Professional Summary */}
    <section className="mb-4">
      <h2 className="text-[14pt] font-bold border-b border-black mb-1 w-full pb-0.5">Professional Summary</h2>
      <p className="text-[10.9pt] text-justify leading-[1.3]">{summary || data.bio}</p>
    </section>

    {/* Education */}
    <section className="mb-4">
      <h2 className="text-[14pt] font-bold border-b border-black mb-1 w-full pb-0.5">Education</h2>
      <div className="space-y-1">
        {data.education_json?.sort((a: any, b: any) => (b.year || 0) - (a.year || 0)).map((edu: any, i: number) => (
          <div key={i} className="flex justify-between items-baseline">
            <div>
              <span className="font-bold">{edu.level === 'Degree' ? 'B.Tech - Computer Science and Engineering' : edu.level}</span>
              <br />
              <span className="italic">{edu.level === 'Degree' ? edu.board : edu.school}</span>
            </div>
            <div className="text-right">
              <span className="font-bold">{edu.year - 4} -- {edu.year}</span>
              <br />
              <span className="italic">CGPA: {edu.cgpa || edu.percentage || edu.grade} / 10.0</span>
            </div>
          </div>
        ))}
      </div>
    </section>

    {/* Skills */}
    <section className="mb-4">
      <h2 className="text-[14pt] font-bold border-b border-black mb-1 w-full pb-0.5">Technical Skills</h2>
      <ul className="list-disc pl-5 text-[10.9pt] space-y-0.5">
        <li><span className="font-bold">Languages:</span> {data.skills_json?.slice(0, 5).join(', ')}</li>
        <li><span className="font-bold">Frameworks & Libraries:</span> React, Node.js, Express, Tailwind CSS</li>
        <li><span className="font-bold">Databases:</span> MySQL, PostgreSQL, MongoDB</li>
        <li><span className="font-bold">Tools & Cloud:</span> Git, Docker, AWS, Vercel</li>
      </ul>
    </section>

    {/* Projects */}
    <section className="mb-4">
      <h2 className="text-[14pt] font-bold border-b border-black mb-1 w-full pb-0.5">Projects</h2>
      <div className="space-y-3">
        {data.projects_json?.slice(0, 3).map((p: any, i: number) => (
          <div key={i}>
            <div className="flex justify-between font-bold text-[10.9pt]">
              <span>{p.name}</span>
              <span className="italic font-normal">Django, MySQL, REST API</span>
            </div>
            <ul className="list-disc pl-5 text-[10.9pt] mt-1">
              <li>{p.description}</li>
            </ul>
          </div>
        ))}
      </div>
    </section>

    {/* Achievements */}
    <section>
      <h2 className="text-[14pt] font-bold border-b border-black mb-1 w-full pb-0.5">Achievements & Activities</h2>
      <ul className="list-disc pl-5 text-[10.9pt] space-y-0.5">
        <li>Maintaining Top 5% academic ranking in department with CGPA of {data.education_json?.[0]?.cgpa || '9.64'}.</li>
        <li>Active contributor to open-source projects on GitHub.</li>
        <li>Participated in various state-level innovation competitions.</li>
      </ul>
    </section>
  </div>
);

const ExecutiveGridTemplate = ({ data, summary, photo }: any) => (
  <div id="resume-content" className="bg-[#FFFFFF] w-[210mm] min-h-[297mm] mx-auto shadow-sm font-sans text-[#1A1A1A]">
    <div className="grid grid-cols-12 min-h-[297mm]">
      {/* Left Column (Main) */}
      <div className="col-span-8 p-12 space-y-10">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 border-l-4 border-indigo-600 pl-6">{data.full_name}</h1>
          <p className="mt-4 text-sm text-slate-500 font-medium leading-relaxed">{summary}</p>
        </div>

        <section>
          <div className="flex items-center gap-3 mb-6">
             <div className="w-1.5 h-6 bg-indigo-600" />
             <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Professional Experience</h3>
          </div>
          <div className="space-y-8">
            {data.experience_json?.map((exp: any, i: number) => (
              <div key={i} className="group">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="text-sm font-bold text-slate-800">{exp.company}</h4>
                  <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase">{exp.duration}</span>
                </div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">{exp.role}</p>
                <p className="text-xs text-slate-500 leading-relaxed group-hover:text-slate-700 transition-colors">{exp.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center gap-3 mb-6">
             <div className="w-1.5 h-6 bg-indigo-600" />
             <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Key Projects</h3>
          </div>
          <div className="grid grid-cols-2 gap-6">
             {data.projects_json?.slice(0, 4).map((p: any, i: number) => (
               <div key={i} className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                  <h4 className="text-xs font-black text-slate-800 uppercase mb-2">{p.name}</h4>
                  <p className="text-[10px] text-slate-500 leading-relaxed mb-4 line-clamp-3">{p.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {p.tech_stack?.split(',').map((t: string) => (
                      <span key={t} className="text-[8px] font-black text-indigo-400 uppercase tracking-tighter">#{t.trim()}</span>
                    ))}
                  </div>
               </div>
             ))}
          </div>
        </section>
      </div>

      {/* Right Column (Info) */}
      <div className="col-span-4 bg-slate-900 p-10 text-white space-y-10">
        {photo && (
          <img src={photo} crossOrigin="anonymous" className="w-full aspect-square rounded-[32px] object-cover mb-8 border-2 border-slate-800" />
        )}

        <section>
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-6 underline decoration-indigo-600 underline-offset-8">Information</h3>
          <div className="space-y-4">
             <div className="space-y-1">
                <p className="text-[9px] font-black text-slate-500 uppercase">Email</p>
                <p className="text-[11px] font-medium truncate">{data.email}</p>
             </div>
             <div className="space-y-1">
                <p className="text-[9px] font-black text-slate-500 uppercase">Contact</p>
                <p className="text-[11px] font-medium">{data.contact}</p>
             </div>
          </div>
        </section>

        <section>
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-6 underline decoration-indigo-600 underline-offset-8">Competencies</h3>
          <div className="space-y-6">
             {data.skills_json?.slice(0, 8).map((s: string) => (
                <div key={s} className="space-y-2">
                   <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-300">
                      <span>{s}</span>
                      <span>Expert</span>
                   </div>
                   <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-600 w-[90%]" />
                   </div>
                </div>
             ))}
          </div>
        </section>

        <section>
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-6 underline decoration-indigo-600 underline-offset-8">Education</h3>
          <div className="space-y-6">
             {data.education_json?.map((edu: any, i: number) => (
                <div key={i}>
                   <p className="text-xs font-black text-white uppercase">{edu.level}</p>
                   <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-tighter">{edu.board || edu.school}</p>
                   <p className="text-[10px] text-indigo-400 font-black mt-1">{edu.year}</p>
                </div>
             ))}
          </div>
        </section>
      </div>
    </div>
  </div>
);

const MinimalSwissTemplate = ({ data, summary }: any) => (
  <div id="resume-content" className="bg-white p-16 text-[#000000] font-sans w-[210mm] min-h-[297mm] mx-auto shadow-sm tracking-tight">
    <header className="mb-20">
      <h1 className="text-7xl font-black uppercase tracking-tighter leading-[0.9] mb-8">{data.full_name?.split(' ')[0]}<br />{data.full_name?.split(' ')[1] || ''}</h1>
      <div className="grid grid-cols-4 gap-8 text-[11px] font-bold uppercase tracking-widest text-slate-400">
         <div>
            <p className="mb-2">Contact</p>
            <p className="text-black">{data.contact}</p>
         </div>
         <div>
            <p className="mb-2">Network</p>
            <p className="text-black">{data.email}</p>
         </div>
         <div className="col-span-2">
            <p className="mb-2">Objective</p>
            <p className="text-black normal-case leading-relaxed font-medium tracking-normal text-sm">{summary}</p>
         </div>
      </div>
    </header>

    <div className="grid grid-cols-4 gap-12">
       <div className="col-span-1 space-y-12">
          <section>
             <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-6">Expertise</h3>
             <div className="space-y-2 text-sm font-bold uppercase text-slate-400">
                {data.skills_json?.map((s: string) => (
                   <p key={s} className="text-black">{s}</p>
                ))}
             </div>
          </section>

          <section>
             <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-6">Learning</h3>
             <div className="space-y-6">
                {data.education_json?.map((edu: any, i: number) => (
                   <div key={i}>
                      <p className="text-[10px] font-black text-slate-300 mb-1">{edu.year}</p>
                      <p className="text-xs font-bold uppercase">{edu.level}</p>
                   </div>
                ))}
             </div>
          </section>
       </div>

       <div className="col-span-3 space-y-16">
          <section>
             <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-8 border-b-4 border-black pb-4">Selected Projects</h3>
             <div className="space-y-12">
                {data.projects_json?.slice(0, 3).map((p: any, i: number) => (
                   <div key={i} className="grid grid-cols-3 gap-6">
                      <div className="text-xs font-black uppercase leading-tight">{p.name}</div>
                      <div className="col-span-2 text-sm font-medium text-slate-600 leading-relaxed tracking-normal">{p.description}</div>
                   </div>
                ))}
             </div>
          </section>

          <section>
             <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-8 border-b-4 border-black pb-4">Background</h3>
             <div className="space-y-12">
                {data.experience_json?.map((exp: any, i: number) => (
                   <div key={i} className="grid grid-cols-3 gap-6">
                      <div className="text-xs font-black uppercase leading-tight">{exp.company} <br /><span className="text-slate-300">{exp.duration}</span></div>
                      <div className="col-span-2 text-sm font-medium text-slate-600 leading-relaxed tracking-normal">
                         <p className="font-bold text-black mb-2 uppercase text-[10px] tracking-widest">{exp.role}</p>
                         {exp.desc}
                      </div>
                   </div>
                ))}
             </div>
          </section>
       </div>
    </div>
  </div>
);

const TechnicalEliteTemplate = ({ data, summary, photo }: any) => (
   <div id="resume-content" className="bg-[#FAFAFA] w-[210mm] min-h-[297mm] mx-auto shadow-sm font-mono text-[#2D3436] p-10">
      <div className="bg-white border-2 border-slate-900 rounded-[40px] overflow-hidden flex flex-col min-h-[calc(297mm-80px)]">
         <header className="bg-slate-900 text-emerald-400 p-10 flex justify-between items-center">
            <div>
               <h2 className="text-xs font-black tracking-[0.5em] uppercase mb-4 opacity-70">Resident Specialist</h2>
               <h1 className="text-4xl font-black tracking-tight uppercase">{data.full_name}</h1>
               <div className="mt-6 flex gap-6 text-[10px] font-bold">
                  <span>/ {data.email}</span>
                  <span>/ {data.contact}</span>
               </div>
            </div>
            {photo && <img src={photo} crossOrigin="anonymous" className="w-24 h-24 rounded-2xl border-2 border-emerald-400 grayscale contrast-125 hover:grayscale-0 transition-all cursor-crosshair object-cover" />}
         </header>

         <div className="flex-1 flex">
            {/* Sidebar */}
            <aside className="w-1/3 border-r-2 border-slate-900 p-10 space-y-12">
               <section>
                  <h4 className="text-[10px] font-black uppercase tracking-widest mb-6">Stack.config</h4>
                  <div className="space-y-4">
                     {data.skills_json?.map((s: string) => (
                        <div key={s} className="flex flex-col gap-1">
                           <span className="text-[10px] uppercase font-bold">{s}</span>
                           <div className="flex gap-1">
                              {[1,2,3,4,5].map(v => (
                                 <div key={v} className={`w-3 h-3 rounded-sm ${v <= 4 ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.4)]' : 'bg-slate-100'}`} />
                              ))}
                           </div>
                        </div>
                     ))}
                  </div>
               </section>

               <section>
                  <h4 className="text-[10px] font-black uppercase tracking-widest mb-6">Info.sys</h4>
                  <div className="space-y-4 text-[11px] font-bold">
                     <div>
                        <p className="text-slate-400 uppercase text-[9px] mb-1">Status</p>
                        <p className="uppercase">Available for Hire</p>
                     </div>
                     <div>
                        <p className="text-slate-400 uppercase text-[9px] mb-1">Education</p>
                        <ul className="space-y-2">
                           {data.education_json?.slice(0, 2).map((edu: any, i: number) => (
                              <li key={i} className="uppercase leading-tight">{edu.board || edu.school} <br /><span className="text-emerald-500">[{edu.year}]</span></li>
                           ))}
                        </ul>
                     </div>
                  </div>
               </section>
            </aside>

            {/* Main */}
            <main className="flex-1 p-10 space-y-12">
               <section>
                  <h4 className="text-[10px] font-black uppercase tracking-widest mb-6 px-4 py-1 bg-slate-100 rounded inline-block">Profile.log</h4>
                  <p className="text-xs font-bold leading-relaxed text-slate-500 italic">
                     {summary}
                  </p>
               </section>

               <section>
                  <h4 className="text-[10px] font-black uppercase tracking-widest mb-6 px-4 py-1 bg-slate-100 rounded inline-block">Deployments.active</h4>
                  <div className="space-y-8">
                     {data.projects_json?.slice(0, 3).map((p: any, i: number) => (
                        <div key={i} className="relative pl-6 border-l-2 border-emerald-400">
                           <h5 className="text-[11px] font-black uppercase mb-2">{p.name}</h5>
                           <p className="text-[11px] font-bold text-slate-500 leading-relaxed mb-3">{p.description}</p>
                           <div className="text-[9px] font-black text-emerald-600 bg-emerald-50 inline-block px-2 py-0.5 rounded uppercase">{p.tech_stack}</div>
                        </div>
                     ))}
                  </div>
               </section>
            </main>
         </div>

         <footer className="bg-slate-50 p-6 flex justify-between items-center text-[9px] font-black uppercase tracking-widest border-t-2 border-slate-900">
            <span>Verified TalentBridge Artifact</span>
            <span>Generated: {new Date().toLocaleDateString()}</span>
            <span>Ref: {data.user_id}-ELITE</span>
         </footer>
      </div>
   </div>
);


const ModernProTemplate = ({ data, summary, photo }: any) => (
  <div id="resume-content" className="bg-white flex w-[210mm] min-h-[297mm] mx-auto shadow-sm overflow-hidden font-sans">
    {/* Left Sidebar */}
    <div className="w-1/3 bg-slate-900 text-white p-8 space-y-10">
      <div className="text-center">
        {photo && (
          <img src={photo} crossOrigin="anonymous" className="w-32 h-32 rounded-3xl border-4 border-slate-800 mx-auto mb-4 object-cover" />
        )}
        <h2 className="text-lg font-black uppercase tracking-tight">{data.full_name}</h2>
        <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mt-1">Aspiring Professional</p>
      </div>

      <section>
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4">Contact</h3>
        <div className="space-y-3 text-[10px]">
          <div className="flex items-center gap-3">
             <div className="w-6 h-6 bg-slate-800 rounded flex items-center justify-center shrink-0">
                <Mail size={12} className="text-blue-400" />
             </div>
             <span className="truncate">{data.email}</span>
          </div>
          <div className="flex items-center gap-3">
             <div className="w-6 h-6 bg-slate-800 rounded flex items-center justify-center shrink-0">
                <Phone size={12} className="text-blue-400" />
             </div>
             <span>{data.contact}</span>
          </div>
          <div className="flex items-center gap-3">
             <div className="w-6 h-6 bg-slate-800 rounded flex items-center justify-center shrink-0">
                <MapPin size={12} className="text-blue-400" />
             </div>
             <span>{data.address}</span>
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4">Skills</h3>
        <div className="flex flex-wrap gap-2">
          {data.skills_json?.map((s: string) => (
            <span key={s} className="px-2 py-1 bg-slate-800 rounded text-[9px] font-bold">{s}</span>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4">Certificates</h3>
        <div className="space-y-3">
           <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-800 text-[9px]">
              <p className="font-bold text-blue-300">TalentBridge AI Certified</p>
              <p className="text-slate-500 mt-1">Verification Code: TB-{data.user_id}</p>
           </div>
        </div>
      </section>
    </div>

    {/* Right Content */}
    <div className="flex-1 p-12 space-y-10">
      <section>
        <div className="flex items-center gap-3 mb-4">
           <Sparkles size={16} className="text-blue-600" />
           <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Professional Summary</h3>
        </div>
        <p className="text-xs leading-relaxed text-slate-700 font-medium italic">
          "{summary}"
        </p>
      </section>

      <section>
        <div className="flex items-center gap-3 mb-6">
           <GraduationCap size={16} className="text-blue-600" />
           <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Education</h3>
        </div>
        <div className="space-y-6">
          {data.education_json?.sort((a: any, b: any) => (b.year || 0) - (a.year || 0)).map((edu: any, i: number) => (
            <div key={i} className="relative pl-6 before:absolute before:left-0 before:top-2 before:w-2 before:h-2 before:bg-blue-600 before:rounded-full">
              <div className="flex justify-between items-start mb-1">
                <h4 className="text-[11px] font-black uppercase">{edu.level === 'Degree' ? edu.board : edu.school}</h4>
                <span className="text-[9px] font-black text-slate-400 px-2 py-0.5 bg-slate-50 border border-slate-100 rounded">{edu.year}</span>
              </div>
              <p className="text-[10px] text-slate-500 font-bold uppercase">{edu.level} • Score: {edu.percentage || edu.cgpa || edu.grade}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center gap-3 mb-6">
           <Code size={16} className="text-blue-600" />
           <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Projects & Experience</h3>
        </div>
        <div className="space-y-6">
          {data.projects_json?.slice(0, 3).map((p: any, i: number) => (
            <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
               <h4 className="text-[11px] font-black uppercase mb-2 text-blue-600">{p.name}</h4>
               <p className="text-[10px] text-slate-600 leading-relaxed mb-3">{p.description}</p>
               <div className="flex flex-wrap gap-2">
                 {p.tech_stack?.split(',').map((t: string) => (
                   <span key={t} className="text-[8px] font-black bg-white px-2 py-0.5 rounded border border-slate-200 uppercase text-slate-400">{t.trim()}</span>
                 ))}
               </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  </div>
);

const CreativeMinTemplate = ({ data, summary, photo }: any) => (
  <div id="resume-content" className="bg-slate-50 p-12 w-[210mm] min-h-[297mm] mx-auto shadow-sm font-sans flex flex-col gap-8">
     {/* Header Card */}
     <div className="bg-white rounded-[40px] p-10 flex items-center justify-between shadow-sm border border-slate-100">
        <div>
           <h1 className="text-5xl font-black tracking-tighter text-slate-900 mb-2">{data.full_name?.split(' ')[0]}<br /><span className="text-indigo-600">{data.full_name?.split(' ')[1] || ''}</span></h1>
           <div className="flex items-center gap-4 mt-6">
              <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full" />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{data.email}</p>
              <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full" />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{data.contact}</p>
           </div>
        </div>
        {photo && (
          <div className="relative group">
             <div className="absolute inset-0 bg-indigo-600 rounded-[35px] rotate-6 group-hover:rotate-0 transition-transform duration-500 shadow-xl shadow-indigo-200" />
             <img src={photo} crossOrigin="anonymous" className="relative w-36 h-36 rounded-[35px] object-cover border-4 border-white grayscale hover:grayscale-0 transition-all duration-500" />
          </div>
        )}
     </div>

     {/* Summary Card */}
     <div className="bg-indigo-600 text-white rounded-[40px] p-10 shadow-xl shadow-indigo-200">
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-200 mb-4">Professional Insight</h3>
        <p className="text-xl font-medium leading-relaxed tracking-tight italic">
          "{summary}"
        </p>
     </div>

     {/* Bottom Grid */}
     <div className="grid grid-cols-2 gap-8 flex-1">
        <div className="space-y-8">
           <section className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                 <Layout size={16} className="text-indigo-600" /> Key Projects
              </h3>
              <div className="space-y-6">
                 {data.projects_json?.map((p: any, i: number) => (
                   <div key={i}>
                      <p className="text-xs font-black text-slate-800 mb-2">{p.name}</p>
                      <p className="text-[10px] text-slate-500 leading-relaxed">{p.description}</p>
                   </div>
                 ))}
              </div>
           </section>

           <section className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                 <Code size={16} className="text-indigo-600" /> Expert Skills
              </h3>
              <div className="flex flex-wrap gap-2">
                 {data.skills_json?.map((s: string) => (
                   <span key={s} className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-bold border border-indigo-100">
                      {s}
                   </span>
                 ))}
              </div>
           </section>
        </div>

        <div className="space-y-8">
            <section className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                 <GraduationCap size={16} className="text-indigo-600" /> Background
              </h3>
              <div className="space-y-6">
                  {data.education_json?.sort((a: any, b: any) => (b.year || 0) - (a.year || 0)).map((edu: any, i: number) => (
                    <div key={i} className="flex gap-4">
                       <div className="text-[10px] font-black text-indigo-600 bg-indigo-50 w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border border-indigo-100">
                          {edu.year % 100}
                       </div>
                       <div>
                          <p className="text-xs font-black text-slate-800">{edu.level === 'Degree' ? 'Bachelors Degree' : edu.level}</p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight truncate max-w-[150px]">{edu.level === 'Degree' ? edu.board : edu.school}</p>
                       </div>
                    </div>
                  ))}
              </div>
            </section>

            <section className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100 flex-1 flex flex-col justify-center items-center text-center">
               <div className="w-16 h-16 bg-slate-50 rounded-[20px] flex items-center justify-center mb-4">
                  <Briefcase size={24} className="text-indigo-200" />
               </div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Connect</p>
               <p className="text-xs font-bold text-slate-800 mt-1">{data.email}</p>
               <p className="text-[9px] text-indigo-600 font-bold mt-4 uppercase tracking-tighter">TB ID: #{data.user_id}</p>
            </section>
        </div>
     </div>
  </div>
);

// --- MAIN PAGE ---

export function ResumeBuilder() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState("academic-latex");
  const [generating, setGenerating] = useState(false);
  const [summary, setSummary] = useState("");
  const [currentStep, setCurrentStep] = useState(1); // 1: Check, 2: Select, 3: Preview/Download
  const [consentOpen, setConsentOpen] = useState(localStorage.getItem("consent_resume") !== "true");

  // ATS Optimization Feature State
  const [targetRole, setTargetRole] = useState("SDE / Full Stack Engineer");
  const [keywordsGenerating, setKeywordsGenerating] = useState(false);
  const [atsRecommendations, setAtsRecommendations] = useState<any>(null);

  const fetchAtsOptimizeRecommendations = async (role: string) => {
    setKeywordsGenerating(true);
    try {
      const response = await api.post("/ai/optimize-keywords", {
        skills: profile?.skills_json || [],
        targetRole: role
      });
      if (response.data.success) {
        setAtsRecommendations(response.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch Keyword suggestions:", err);
    } finally {
      setKeywordsGenerating(false);
    }
  };

  useEffect(() => {
    if (profile && currentStep === 3 && !atsRecommendations) {
      fetchAtsOptimizeRecommendations(targetRole);
    }
  }, [profile, currentStep]);
  
  const resumeRef = useRef<HTMLDivElement>(null);

  const { setPageContext } = useAccessibility();

  useEffect(() => {
    if (setPageContext && profile) {
      setPageContext({
        profile,
        currentStep,
        status,
        actions: {
          generate: handleGenerate,
          download: handleDownload,
          selectTemplate: (id: string) => setSelectedTemplate(id),
        }
      });
    }
  }, [profile, currentStep, status, setPageContext]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statusRes, templatesRes, profileRes] = await Promise.all([
        api.get(`/resume/status/${user?.id}`),
        api.get("/resume/templates"),
        api.get(`/students/profile/${user?.id}`)
      ]);
      
      setStatus(statusRes.data);
      setTemplates(templatesRes.data);
      if (profileRes.data.success) {
        // Parse JSON fields
        const data = profileRes.data.data;
        ['education_json', 'experience_json', 'projects_json', 'skills_json', 'social_links_json'].forEach(field => {
          if (typeof data[field] === 'string') {
            try { data[field] = JSON.parse(data[field]); } catch(e) { data[field] = []; }
          }
        });
        setProfile(data);
      }
      
      if (statusRes.data.isEligible) setCurrentStep(2);
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      // 1. Generate AI Summary on Frontend (As per system instructions)
      let aiSummary = "";
      try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (apiKey) {
          const ai = new GoogleGenAI({ apiKey });
          const skills = profile.skills_json || [];
          const projects = profile.projects_json || [];
          
          const prompt = `Write a 2-3 line ATS-friendly professional summary for a student with these details:
            Skills: ${skills.join(", ")}
            Projects: ${projects.map((pr: any) => pr.name).join(", ")}
            Professional Bio: ${profile.bio}
            Focus on being concise and high-impact. Wrap it in quotes.`;

          const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt
          });
          aiSummary = response.text || "";
        }
      } catch (aiErr) {
        console.error("AI Generation Error:", aiErr);
      }

      // Fallback Summary if AI fails or no key
      if (!aiSummary) {
        const skills = profile.skills_json || [];
        aiSummary = `Motivated student athlete and upcoming professional with expertise in ${skills.slice(0, 3).join(", ")}. Passionate about building innovative solutions and collaborating on impactful projects.`;
      }

      // 2. Notify Backend to track usage & save history
      const { data } = await api.post("/resume/generate", { 
        userId: user?.id, 
        templateId: selectedTemplate,
        summary: aiSummary
      });

      if (data.success) {
        setSummary(aiSummary);
        setCurrentStep(3);
        // Refresh status to update daily count
        const statusRes = await api.get(`/resume/status/${user?.id}`);
        setStatus(statusRes.data);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to finalize resume generation");
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async () => {
    const element = document.getElementById('resume-content');
    if (!element) return;

    try {
      const canvas = await html2canvas(element, { 
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`TalentBridge_Resume_${profile.full_name?.replace(' ', '_')}.pdf`);
    } catch (err) {
      console.error(err);
      alert("PDF generation failed. Try disabling any CORS blocking extensions.");
    }
  };

  const calculateScore = () => {
    if (!profile) return 0;
    let score = 30; // Base score for having an account
    if (profile.completeness_score > 80) score += 20;
    if (profile.skills_json?.length >= 5) score += 15;
    if (profile.projects_json?.length >= 2) score += 15;
    if (profile.profile_photo_url) score += 10;
    if (profile.experience_type !== 'FRESHER' || profile.experience_json?.length > 0) score += 10;
    return Math.min(score, 100);
  };

  const resumeScore = calculateScore();

  if (!status) return null;

  return (
    <div className="max-w-7xl mx-auto py-2 font-sans text-slate-800">
      <div className="w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 border-b border-slate-200 pb-5">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 shrink-0">
                <FileText size={22} className="text-white" />
              </div>
              <div>
                <h1 className="text-2.5xl sm:text-4xl font-black text-slate-900 uppercase tracking-tight leading-none">AI Resume Builder</h1>
                <p className="text-slate-500 font-bold text-[9px] sm:text-[10px] uppercase tracking-[0.3em] mt-2">OPTIMIZE AND EXPORT PLACEMENT PROFILES</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-white border border-slate-150 p-3 rounded-2xl shadow-sm self-stretch md:self-auto justify-between">
            <div className="flex items-center gap-3">
              <div className="text-left md:text-right">
                 <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Daily Limit</div>
                 <div className="text-xs sm:text-sm font-black text-slate-800 leading-none">{status.dailyCount}/{status.limit} Generated</div>
              </div>
              <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 border border-indigo-100 shrink-0">
                 <Sparkles size={18} />
              </div>
            </div>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-3 mb-10">
           <StepBadge active={currentStep >= 1} done={currentStep > 1} label="Eligibility" icon={<CheckCircle2 size={13} />} />
           <div className="w-8 h-px bg-slate-200" />
           <StepBadge active={currentStep >= 2} done={currentStep > 2} label="Template" icon={<Layout size={13} />} />
           <div className="w-8 h-px bg-slate-200" />
           <StepBadge active={currentStep >= 3} done={currentStep > 3} label="Download" icon={<Download size={13} />} />
        </div>

        <AnimatePresence mode="wait">
           {currentStep === 1 && (
             <motion.div 
               key="step1"
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 1.05 }}
               className="max-w-2xl mx-auto text-center"
             >
                <div className="p-12 glass-card border-slate-200 shadow-2xl relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-8 opacity-5">
                      <Sparkles size={120} className="text-indigo-600" />
                   </div>
                   
                   <div className="relative z-10">
                      <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-red-500/10">
                         <AlertTriangle size={32} />
                      </div>
                      <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Access Locked</h2>
                      <p className="text-slate-500 font-medium mb-8">Professional resume generation requires a robust profile. Please complete the following requirements to proceed.</p>
                      
                      <div className="space-y-3 mb-10 text-left">
                         {status.errors.map((err: string, i: number) => (
                           <div key={i} className="flex gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 flex-items-center">
                              <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                                 <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                              </div>
                              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">{err}</span>
                           </div>
                         ))}
                      </div>

                      <Link to="/profile" className="inline-flex items-center gap-3 px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl shadow-slate-900/20 hover:scale-105 transition-all">
                         Complete Profile Now
                      </Link>
                   </div>
                </div>
             </motion.div>
           )}

           {currentStep === 2 && (
             <motion.div 
               key="step2"
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               className="space-y-8 max-w-7xl mx-auto px-4"
             >
                <div className="text-center max-w-2xl mx-auto mb-6">
                   <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">Choose Your Template</h2>
                   <p className="text-sm text-slate-500 font-medium tracking-tight">Select a high-parse rate format. All templates are fully optimized for corporate screener parsing.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
                  {templates.map((t) => (
                    <div 
                      key={t.id}
                      onClick={() => setSelectedTemplate(t.id)}
                      className={`relative group cursor-pointer rounded-3xl overflow-hidden border-2 transition-all ${selectedTemplate === t.id ? 'border-indigo-600 shadow-xl ring-4 ring-indigo-50' : 'border-slate-100 hover:border-indigo-150'}`}
                    >
                       <div className="aspect-[3/4] bg-slate-50 p-4 border-b border-slate-100 overflow-hidden relative">
                           <div className="absolute inset-0 bg-gradient-to-t from-slate-900/30 to-transparent z-10" />
                           <div className="transition-all duration-500 transform scale-[0.32] sm:scale-[0.28] md:scale-[0.33] lg:scale-[0.29] xl:scale-[0.25] origin-top-left group-hover:translate-x-0.5 group-hover:translate-y-0.5">
                              {t.id === 'academic-latex' && <AcademicLatexTemplate data={profile} summary="Sample Summary for previewing layout..." />}
                             {t.id === 'hybrid-ats-premium' && <HybridATSPremiumTemplate data={profile} summary="Optimized premium formatted ATS-certified layout with full parsing guarantees." />}
                             {t.id === 'silicon-valley-tech' && <SiliconValleyTechTemplate data={profile} summary="Silicon Valley modern single-column layout highlighting impact metrics." />}
                             {t.id === 'modern-pro' && <ModernProTemplate data={profile} summary="Sample Summary for previewing layout..." />}
                             {t.id === 'executive-grid' && <ExecutiveGridTemplate data={profile} summary="Sample Summary for previewing layout..." />}
                             {t.id === 'minimal-swiss' && <MinimalSwissTemplate data={profile} summary="Sample Summary for previewing layout..." />}
                             {t.id === 'technical-elite' && <TechnicalEliteTemplate data={profile} summary="Sample Summary for previewing layout..." />}
                             {t.id === 'creative-min' && <CreativeMinTemplate data={profile} summary="Sample Summary for previewing layout..." />}
                             {t.id === 'classic-ats' && <ClassicATSTemplate data={profile} summary="Sample Summary for previewing layout..." />}
                          </div>
                       </div>
                       <div className="p-4 sm:p-5 bg-white relative z-20">
                          <div className="flex justify-between items-start gap-2 mb-1.5">
                             <h4 className="font-bold text-slate-900 text-sm tracking-tight line-clamp-1 uppercase" title={t.name}>{t.name}</h4>
                             <span className="shrink-0 text-[8px] font-bold bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded border border-indigo-100/50 uppercase">
                                {t.type?.replace('_', ' ')}
                             </span>
                          </div>
                          <p className="text-[11px] text-slate-450 font-medium italic line-clamp-2 leading-relaxed" title={t.description}>{t.description}</p>
                       </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-center pt-8">
                   <button 
                     onClick={handleGenerate}
                     disabled={generating}
                     className="px-12 py-5 bg-indigo-600 text-white rounded-[24px] font-black text-lg shadow-2xl shadow-indigo-500/30 hover:scale-105 transition-all flex items-center gap-3 disabled:opacity-50"
                   >
                     {generating ? "Crafting AI Resume..." : <><Sparkles size={24} /> Generate Professional Resume</>}
                   </button>
                </div>
             </motion.div>
           )}

           {currentStep === 3 && (
             <motion.div 
                key="step3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col lg:flex-row gap-12"
             >
                {/* Control Panel */}
                <aside className="w-full lg:w-96 space-y-8">
                   <div className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100">
                      <div className="mb-8">
                         <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">AI Summary Result</div>
                         <div className="p-6 bg-indigo-50 rounded-3xl border border-indigo-100 text-sm italic text-indigo-700 leading-relaxed">
                            "{summary}"
                         </div>
                      </div>

                      <div className="space-y-4">
                         <button 
                           onClick={handleDownload}
                           className="w-full flex items-center justify-center gap-3 py-4 bg-indigo-600 text-white rounded-[20px] font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-500/20 hover:bg-indigo-700 transition-all"
                         >
                           <Download size={20} /> Download PDF
                         </button>
                         <button 
                           onClick={() => setCurrentStep(2)}
                           className="w-full flex items-center justify-center gap-3 py-4 bg-slate-900 text-white rounded-[20px] font-black text-sm uppercase tracking-widest shadow-xl shadow-slate-900/20 transition-all"
                         >
                           <Layout size={20} /> Change Template
                         </button>
                      </div>
                   </div>

                   <div className="bg-emerald-600 text-white rounded-[40px] p-8">
                      <div className="flex items-center justify-between mb-4">
                         <div className="flex items-center gap-3">
                            <CheckCircle size={24} />
                            <span className="text-[10px] font-black uppercase tracking-widest">ATS Verified</span>
                         </div>
                         <div className="px-3 py-1 bg-white/20 rounded-full text-xs font-black">
                            Score: {resumeScore}/100
                         </div>
                      </div>
                      <p className="text-lg font-bold tracking-tight">Your resume is ready for submission.</p>
                      <p className="text-xs text-emerald-200 mt-2">Format: PDF/A4 standard optimized for industry parsers including Workday and Taleo.</p>
                    </div>

                    {/* Interactive ATS Audit Summary */}
                    <div className="bg-slate-900 text-white rounded-[40px] p-8 space-y-6">
                      <div className="flex items-center gap-2">
                        <Trophy className="text-yellow-400 font-bold" size={20} />
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-300">ATS Auditor Report</h4>
                      </div>

                      <div className="space-y-3 text-xs">
                        <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700/30">
                          <div className="flex justify-between items-center text-slate-200 font-bold mb-1">
                            <span>Layout Parse Rating</span>
                            <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold font-mono">100% SECURE</span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-sans">
                            {['hybrid-ats-premium', 'silicon-valley-tech', 'classic-ats', 'academic-latex'].includes(selectedTemplate) 
                              ? "Perfect. Pure single-column linear standard format guarantees parse safety across corporate systems."
                              : "This grid-based system may experience sequence offset on older legacy screeners. Use 'Hybrid ATS Premium' for absolute parse security."}
                          </p>
                        </div>

                        <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700/30">
                          <div className="flex justify-between items-center text-slate-200 font-bold mb-1">
                            <span>Aspirant Section Coverage</span>
                            <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold font-mono">VERIFIED</span>
                          </div>
                          <div className="space-y-1 mt-1.5 text-[10px] text-slate-400 font-medium font-sans">
                            <div className="flex items-center gap-1.5 font-sans">
                              <span className="text-emerald-400 font-bold">✔</span> Social URLs Recognized ({profile?.social_links_json?.linkedin ? 'LinkedIn Configured' : 'Fallback active'})
                            </div>
                            <div className="flex items-center gap-1.5 font-sans">
                              <span className="text-emerald-400 font-bold">✔</span> Standard Section Labels (Experience, Skills, Projects)
                            </div>
                          </div>
                        </div>

                        <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700/30">
                          <div className="flex justify-between items-center text-slate-200 font-bold mb-1">
                            <span>Quantifiable Metric Ratio</span>
                            <span className={`text-[9px] px-2 py-0.5 rounded font-bold font-mono ${profile?.projects_json?.some((p: any) => /\d+%|\d+\s*ms|\d+\s*x/i.test(p.description)) ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                              {profile?.projects_json?.some((p: any) => /\d+%|\d+\s*ms|\d+\s*x/i.test(p.description)) ? 'OPTIMUM' : 'ALERT'}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 leading-normal font-sans">
                            {profile?.projects_json?.some((p: any) => /\d+%|\d+\s*ms|\d+\s*x/i.test(p.description))
                              ? "Excellent. Numeric achievements are recognized in your descriptions. This highlights direct business/engineering execution impact."
                              : "Tip: Add quantitative metrics standard for SDE (e.g., 'rendered 40% faster', 'scaled user endpoints by 2x') to increase ATS rating."}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* SEO Real-Time Role Optimizer Panel */}
                    <div className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100 space-y-6">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Brain className="text-indigo-600" size={18} />
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Target Role SEO Matcher</h4>
                          </div>
                          {keywordsGenerating && <RefreshCw size={12} className="animate-spin text-indigo-600" />}
                        </div>
                        <p className="text-xs text-slate-450 font-medium">Select your aspiration role to optimize matching resume phrasing.</p>
                      </div>

                      <div className="relative">
                        <select 
                          value={targetRole}
                          onChange={(e) => {
                            setTargetRole(e.target.value);
                            fetchAtsOptimizeRecommendations(e.target.value);
                          }}
                          className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 p-3 rounded-2xl outline-none focus:border-indigo-600 focus:bg-white transition-all appearance-none"
                        >
                          <option value="SDE / Full Stack Engineer">SDE / Full Stack Engineer</option>
                          <option value="Frontend Development Specialist">Frontend Development Specialist (React)</option>
                          <option value="Backend & Cloud Infrastructure">Backend & Cloud Infrastructure</option>
                          <option value="AI / ML & Data Analytics Specialist">AI / ML & Data Analytics Specialist</option>
                          <option value="Product Manager & QA Engineer">Product Manager & QA Engineer</option>
                        </select>
                        <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-sans">▼</div>
                      </div>

                      <div className="space-y-4 pt-2">
                        {keywordsGenerating ? (
                          <div className="py-8 text-center space-y-2">
                            <RefreshCw size={24} className="animate-spin text-indigo-600 mx-auto" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Querying Gemini ATS Database...</p>
                          </div>
                        ) : atsRecommendations ? (
                          <div className="space-y-5">
                            {/* Missing terms list */}
                            <div>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5 font-sans">
                                <Zap size={10} className="text-amber-500 font-bold" /> ATS Targeted Phrases
                              </p>
                              <div className="flex flex-wrap gap-1.5 font-sans">
                                {atsRecommendations.missingKeywords?.map((kw: string) => (
                                  <span key={kw} className="text-[9px] font-bold bg-indigo-50 text-indigo-700 px-2 py-1 rounded-lg border border-indigo-100/50 font-sans">
                                    {kw}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Recommended actions verbs */}
                            <div>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 font-sans font-sans">
                                Recommended Core Verbs
                              </p>
                              <div className="flex flex-wrap gap-1 font-sans">
                                {atsRecommendations.recommendedVerbs?.map((vb: string) => (
                                  <span key={vb} className="text-[9px] font-mono font-bold bg-slate-50 text-slate-650 px-2 py-0.5 rounded border border-slate-100 font-sans">
                                    {vb}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Live sentence rewrites recommendation */}
                            <div className="space-y-3 font-sans">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-sans font-bold">
                                High-Score Bullet Rewrites
                              </p>
                              <div className="space-y-3 text-[11px] font-sans">
                                {atsRecommendations.bulletRewrites?.slice(0, 2).map((rewrite: any, i: number) => (
                                  <div key={i} className="p-3 bg-slate-50 border border-slate-100 rounded-2xl relative overflow-hidden font-sans">
                                    <div className="text-[8px] font-extrabold text-slate-400 uppercase mb-1 font-sans">Standard / Passive Statement</div>
                                    <p className="text-slate-500 line-through mb-2 font-sans">"{rewrite.originalIdea}"</p>
                                    <div className="text-[8px] font-extrabold text-indigo-600 uppercase mb-1 font-sans font-serif">High-ATS Score Metric rewrite</div>
                                    <p className="text-indigo-900 font-bold bg-indigo-50/50 p-2 rounded-xl italic font-serif">"{rewrite.rewrittenBullet}"</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => fetchAtsOptimizeRecommendations(targetRole)}
                            className="w-full flex items-center justify-center gap-2 py-3 border border-indigo-200 text-indigo-600 rounded-2xl font-bold text-xs font-sans"
                          >
                            <Brain size={14} /> Scan Terminology Recommendation
                          </button>
                        )}
                      </div>
                    </div>
                </aside>

                {/* Live Preview Screen */}
                <div className="flex-1 space-y-6">
                   <div className="flex items-center justify-between px-4">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Live Document Preview</h3>
                      <p className="text-[10px] font-bold text-slate-400">PAGINATED VIEW (A4)</p>
                   </div>
                   
                   <div className="scale-[0.8] md:scale-100 origin-top overflow-x-auto pb-20 no-scrollbar">
                       {selectedTemplate === 'hybrid-ats-premium' && <HybridATSPremiumTemplate data={profile} summary={summary} />}
                       {selectedTemplate === 'silicon-valley-tech' && <SiliconValleyTechTemplate data={profile} summary={summary} />}
                      {selectedTemplate === 'academic-latex' && <AcademicLatexTemplate data={profile} summary={summary} />}
                      {selectedTemplate === 'classic-ats' && <ClassicATSTemplate data={profile} summary={summary} photo={profile.profile_photo_url} />}
                      {selectedTemplate === 'modern-pro' && <ModernProTemplate data={profile} summary={summary} photo={profile.profile_photo_url} />}
                      {selectedTemplate === 'executive-grid' && <ExecutiveGridTemplate data={profile} summary={summary} photo={profile.profile_photo_url} />}
                      {selectedTemplate === 'minimal-swiss' && <MinimalSwissTemplate data={profile} summary={summary} />}
                      {selectedTemplate === 'technical-elite' && <TechnicalEliteTemplate data={profile} summary={summary} photo={profile.profile_photo_url} />}
                      {selectedTemplate === 'creative-min' && <CreativeMinTemplate data={profile} summary={summary} photo={profile.profile_photo_url} />}
                   </div>
                </div>
             </motion.div>
           )}
        </AnimatePresence>
      </div>

      <ConsentModal
        isOpen={consentOpen}
        title="Resume Processing Consent"
        subtitle="AI Optimization & PDF Generation Parameters"
        consentMessage="To leverage our automated AI Resume Optimizer, you consent to the storage, profile-parsing, and transformation of your registered skills, academic records, and technical experiences. Gemini Large Language models will process this information securely server-side to align, re-phrase, and optimize keywords based on standard placement ATS parameters."
        compulsoryWarning="Declining this consent will prevent you from utilizing our automatic AI Resume Optimizer. AI-enabled profiling data is compulsory to match corporate ATS screening metrics."
        onAgree={() => {
          localStorage.setItem("consent_resume", "true");
          setConsentOpen(false);
        }}
        onDisagreeClose={() => {
          navigate("/student");
        }}
      />
    </div>
  );
}

function StepBadge({ active, done, label, icon }: any) {
  return (
    <div className="flex flex-col items-center gap-2">
       <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${done ? 'bg-emerald-500 text-white' : active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-200 text-slate-400'}`}>
          {done ? <CheckCircle size={14} /> : icon}
       </div>
       <span className={`text-[9px] font-black uppercase tracking-widest ${active ? 'text-slate-900' : 'text-slate-400'}`}>{label}</span>
    </div>
  );
}
