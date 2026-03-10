"use client";

import { useState, useEffect, useRef } from "react";
import * as d3 from "d3";

type ProficiencyLevel = "learning" | "familiar" | "expert";

interface Person {
  id: string;
  name: string;
  role: string;
}

interface Skill {
  id: string;
  name: string;
  category: string;
}

interface Connection {
  id: string;
  personId: string;
  skillId: string;
  proficiency: string; // Stored as string to match CSV/JSON, cast to ProficiencyLevel when needed
}

const SEED_PEOPLE: Person[] = [
  { id: "p1", name: "Alice", role: "Frontend Engineer" },
  { id: "p2", name: "Bob", role: "Full-Stack Engineer" },
  { id: "p3", name: "Carol", role: "Backend Engineer" },
  { id: "p4", name: "Dan", role: "Designer" },
  { id: "p5", name: "Eva", role: "DevOps Engineer" },
];

const SEED_SKILLS: Skill[] = [
  { id: "s1", name: "React", category: "Frontend" },
  { id: "s2", name: "TypeScript", category: "Frontend" },
  { id: "s3", name: "Node.js", category: "Backend" },
  { id: "s4", name: "PostgreSQL", category: "Backend" },
  { id: "s5", name: "Docker", category: "DevOps" },
  { id: "s6", name: "Figma", category: "Design" },
  { id: "s7", name: "CSS", category: "Frontend" },
  { id: "s8", name: "GraphQL", category: "Backend" },
  { id: "s9", name: "CI/CD", category: "DevOps" },
  { id: "s10", name: "Next.js", category: "Frontend" },
];

const SEED_CONNECTIONS: Connection[] = [
  { id: "c1", personId: "p1", skillId: "s1", proficiency: "expert" },
  { id: "c2", personId: "p1", skillId: "s2", proficiency: "expert" },
  { id: "c3", personId: "p1", skillId: "s10", proficiency: "familiar" },
  { id: "c4", personId: "p1", skillId: "s7", proficiency: "familiar" },
  { id: "c5", personId: "p1", skillId: "s6", proficiency: "learning" },
  { id: "c6", personId: "p2", skillId: "s1", proficiency: "familiar" },
  { id: "c7", personId: "p2", skillId: "s3", proficiency: "expert" },
  { id: "c8", personId: "p2", skillId: "s2", proficiency: "familiar" },
  { id: "c9", personId: "p2", skillId: "s4", proficiency: "learning" },
  { id: "c10", personId: "p2", skillId: "s10", proficiency: "expert" },
  { id: "c11", personId: "p3", skillId: "s3", proficiency: "expert" },
  { id: "c12", personId: "p3", skillId: "s4", proficiency: "expert" },
  { id: "c13", personId: "p3", skillId: "s8", proficiency: "expert" },
  { id: "c14", personId: "p3", skillId: "s5", proficiency: "familiar" },
  { id: "c15", personId: "p3", skillId: "s2", proficiency: "learning" },
  { id: "c16", personId: "p4", skillId: "s6", proficiency: "expert" },
  { id: "c17", personId: "p4", skillId: "s7", proficiency: "familiar" },
  { id: "c18", personId: "p4", skillId: "s1", proficiency: "learning" },
  { id: "c19", personId: "p5", skillId: "s5", proficiency: "expert" },
  { id: "c20", personId: "p5", skillId: "s9", proficiency: "expert" },
  { id: "c21", personId: "p5", skillId: "s3", proficiency: "familiar" },
  { id: "c22", personId: "p5", skillId: "s4", proficiency: "familiar" },
];

const STORAGE_KEY = "skill_matrix_v1";
const PROFICIENCY: ProficiencyLevel[] = ["learning", "familiar", "expert"];

const PROF_COLORS: Record<string, { edge: string; badge: string; text: string; dot: string }> = {
  learning: { edge: "#F59E0B", badge: "#FEF3C7", text: "#92400E", dot: "#F59E0B" },
  familiar:  { edge: "#3B82F6", badge: "#DBEAFE", text: "#1E40AF", dot: "#3B82F6" },
  expert:    { edge: "#10B981", badge: "#D1FAE5", text: "#065F46", dot: "#10B981" },
};

const CAT_COLORS: Record<string, string> = {
  Frontend: "#6366F1",
  Backend:  "#F43F5E",
  DevOps:   "#F97316",
  Design:   "#EC4899",
  Other:    "#8B5CF6",
};

const C = {
  bg: "#F8F7F4",
  canvas: "#FAFAF8",
  panel: "#FFFFFF",
  border: "#E5E3DC",
  borderStrong: "#C8C4BA",
  text: "#1A1814",
  textMid: "#6B6760",
  textMuted: "#A09D97",
  personFill: "#FFFFFF",
  personStroke: "#1A1814",
  skillFill: "#1A1814",
  skillText: "#FFFFFF",
  selected: "#1A1814",
  hover: "#F0EDE8",
  surface: "#F3F1EC",
};

let _uid = 1000;
const uid = () => `x${++_uid}`;

function loadData(): { people: Person[]; skills: Skill[]; connections: Connection[] } | null {
  try { const r = localStorage.getItem(STORAGE_KEY); if (r) return JSON.parse(r); } catch {}
  return null;
}
function saveData(people: Person[], skills: Skill[], connections: Connection[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ people, skills, connections })); } catch {}
}

function ProfBadge({ level, small }: { level: string; small?: boolean }) {
  const c = PROF_COLORS[level];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: small ? 4 : 5,
      background: c.badge, color: c.text,
      padding: small ? "2px 6px" : "3px 9px",
      borderRadius: 20, fontSize: small ? 10 : 11,
      fontFamily: "'DM Mono', monospace", fontWeight: 500,
      letterSpacing: "0.02em",
    }}>
      <span style={{ width: small ? 5 : 6, height: small ? 5 : 6, borderRadius: "50%", background: c.dot, display: "inline-block", flexShrink: 0 }} />
      {level}
    </span>
  );
}

function CatTag({ cat }: { cat: string }) {
  const color = CAT_COLORS[cat] ?? CAT_COLORS.Other;
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: 4,
      fontSize: 10, fontFamily: "'DM Mono', monospace", fontWeight: 500,
      color: color, border: `1px solid ${color}22`,
      background: `${color}12`, letterSpacing: "0.05em",
    }}>{cat}</span>
  );
}

function Modal({ title, onClose, children, width = 400 }: { title: string; onClose: () => void; children: React.ReactNode; width?: number }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000, background: "rgba(26,24,20,0.45)",
      backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: C.panel, borderRadius: 16, padding: "28px 32px",
        width: "100%", maxWidth: width,
        border: `1px solid ${C.border}`,
        boxShadow: "0 32px 80px rgba(0,0,0,0.18)",
        animation: "smModalIn 0.22s cubic-bezier(0.34,1.4,0.64,1)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <span style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 18, fontWeight: 700, color: C.text }}>{title}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", fontSize: 18, lineHeight: 1 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [focus, setFocus] = useState(false);
  return <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
    onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
    style={{
      width: "100%", background: C.surface, border: `1.5px solid ${focus ? C.text : C.border}`,
      borderRadius: 8, color: C.text, padding: "9px 12px", fontFamily: "'Outfit', sans-serif",
      fontSize: 14, outline: "none", boxSizing: "border-box", transition: "border-color 0.15s",
    }} />;
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={{
      width: "100%", background: C.surface, border: `1.5px solid ${C.border}`,
      borderRadius: 8, color: value ? C.text : C.textMuted, padding: "9px 12px",
      fontFamily: "'Outfit', sans-serif", fontSize: 14, outline: "none", cursor: "pointer",
      appearance: "none", boxSizing: "border-box",
    }}>
      <option value="">— select —</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function Btn({ children, onClick, variant = "primary", disabled, full }: { children: React.ReactNode; onClick: () => void; variant?: "primary" | "ghost" | "danger"; disabled?: boolean; full?: boolean }) {
  const styles = {
    primary: { background: C.text, color: "#FFF", border: "none" },
    ghost:   { background: "transparent", color: C.textMid, border: `1.5px solid ${C.border}` },
    danger:  { background: "transparent", color: "#EF4444", border: "1.5px solid #FECACA" },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{
      ...styles[variant], borderRadius: 8, padding: "9px 18px",
      fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 600,
      cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.45 : 1,
      transition: "all 0.15s", width: full ? "100%" : undefined,
    }}
      onMouseEnter={e => !disabled && (e.currentTarget.style.opacity = "0.8")}
      onMouseLeave={e => (e.currentTarget.style.opacity = disabled ? "0.45" : "1")}
    >{children}</button>
  );
}

interface SimNode {
  id: string;
  nodeType: "person" | "skill";
  name: string;
  role?: string;
  category?: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface SimLink {
  source: string | SimNode;
  target: string | SimNode;
  id: string;
  proficiency: string;
}

interface UseGraphProps {
  people: Person[];
  skills: Skill[];
  connections: Connection[];
  width: number;
  height: number;
  selectedId: string | null;
  selectedType: "person" | "skill" | null;
  onNodeClick: (id: string | null, type: "person" | "skill" | null) => void;
}

function useGraph({ people, skills, connections, width, height, selectedId, selectedType, onNodeClick }: UseGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const posRef = useRef<Record<string, { x: number; y: number }>>({});
  const simRef = useRef<any>(null);

  useEffect(() => {
    if (!svgRef.current || width < 10) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const simNodes: SimNode[] = [
      ...people.map(p => {
        const prev = posRef.current[p.id];
        return { ...p, nodeType: "person" as const, x: prev?.x ?? width * 0.3 + (Math.random() - 0.5) * 250, y: prev?.y ?? height / 2 + (Math.random() - 0.5) * 200 };
      }),
      ...skills.map(s => {
        const prev = posRef.current[s.id];
        return { ...s, nodeType: "skill" as const, x: prev?.x ?? width * 0.7 + (Math.random() - 0.5) * 250, y: prev?.y ?? height / 2 + (Math.random() - 0.5) * 200 };
      }),
    ];
    
    const simLinks: SimLink[] = connections.map(c => ({
      ...c, source: c.personId, target: c.skillId,
    }));

    const sim = d3.forceSimulation(simNodes)
      .force("link", d3.forceLink(simLinks).id((d: any) => d.id).distance(115).strength(0.4))
      .force("charge", d3.forceManyBody().strength(-320))
      .force("center", d3.forceCenter(width / 2, height / 2).strength(0.04))
      .force("collide", d3.forceCollide(50));
    simRef.current = sim;

    const g = svg.append("g");

    const zoom = d3.zoom().scaleExtent([0.15, 3]).on("zoom", (e: any) => g.attr("transform", e.transform));
    svg.call(zoom);
    svg.on("click", (e: any) => { if (e.target === svgRef.current) onNodeClick(null, null); });

    const linkG = g.append("g");
    const linkSel = linkG.selectAll("g.link")
      .data(simLinks, (d: any) => d.id).enter().append("g").attr("class", "link");

    linkSel.append("line")
      .attr("stroke-width", 2)
      .attr("stroke", (d: any) => PROF_COLORS[d.proficiency].edge)
      .attr("stroke-opacity", 0.6);

    linkSel.append("text")
      .attr("text-anchor", "middle").attr("dy", -5)
      .attr("font-size", "9.5px").attr("font-family", "'DM Mono', monospace")
      .attr("fill", (d: any) => PROF_COLORS[d.proficiency].text).attr("pointer-events", "none")
      .attr("font-weight", "500")
      .text((d: any) => d.proficiency);

    const nodeG = g.append("g");
    const nodeSel = nodeG.selectAll("g.node")
      .data(simNodes, (d: any) => d.id)
      .enter().append("g").attr("class", "node")
      .style("cursor", "pointer")
      .call(
        d3.drag()
          .on("start", (e: any, d: any) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
          .on("drag", (e: any, d: any) => { d.fx = e.x; d.fy = e.y; }) // e.x is correct in d3 v6+
          .on("end", (e: any, d: any) => { if (!e.active) sim.alphaTarget(0); posRef.current[d.id] = { x: e.x, y: e.y }; })
      )
      .on("click", (e: any, d: any) => { e.stopPropagation(); onNodeClick(d.id, d.nodeType); });

    const personSel = nodeSel.filter((d: any) => d.nodeType === "person");
    personSel.append("circle").attr("r", 28).attr("fill", C.personFill)
      .attr("stroke", C.personStroke).attr("stroke-width", 2);
    personSel.append("text").attr("text-anchor", "middle").attr("dy", "-6px")
      .attr("font-size", "13px").attr("font-family", "'Fraunces', Georgia, serif").attr("font-weight", "700")
      .attr("fill", C.text).attr("pointer-events", "none")
      .text((d: any) => d.name?.[0] || "?");
    personSel.append("text").attr("text-anchor", "middle").attr("dy", "9px")
      .attr("font-size", "8.5px").attr("font-family", "'DM Mono', monospace")
      .attr("fill", C.textMid).attr("pointer-events", "none")
      .text((d: any) => d.name?.slice(0, 7) || "");

    const skillSel = nodeSel.filter((d: any) => d.nodeType === "skill");
    skillSel.append("rect").attr("x", -28).attr("y", -18).attr("width", 56).attr("height", 36)
      .attr("rx", 8).attr("fill", (d: any) => CAT_COLORS[d.category ?? "Other"] ?? CAT_COLORS.Other);
    skillSel.append("text").attr("text-anchor", "middle").attr("dy", "0.35em")
      .attr("font-size", "10px").attr("font-family", "'Outfit', sans-serif").attr("font-weight", "700")
      .attr("fill", "#FFF").attr("pointer-events", "none")
      .text((d: any) => d.name.length > 9 ? d.name.slice(0, 8) + "…" : d.name);

    sim.on("tick", () => {
      linkSel.select("line")
        .attr("x1", (d: any) => (d.source as SimNode).x!).attr("y1", (d: any) => (d.source as SimNode).y!)
        .attr("x2", (d: any) => (d.target as SimNode).x!).attr("y2", (d: any) => (d.target as SimNode).y!);
      linkSel.select("text")
        .attr("x", (d: any) => ((d.source as SimNode).x! + (d.target as SimNode).x!) / 2)
        .attr("y", (d: any) => ((d.source as SimNode).y! + (d.target as SimNode).y!) / 2);
      nodeSel.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
      simNodes.forEach(n => { if (n.x && n.y) posRef.current[n.id] = { x: n.x, y: n.y }; });
    });

    return () => {
      sim.stop();
    };
  }, [people, skills, connections, width, height]);

  return svgRef;
}

interface DetailPanelProps {
  selectedId: string;
  selectedType: "person" | "skill";
  people: Person[];
  skills: Skill[];
  connections: Connection[];
  onClose: () => void;
  onUpdate: (id: string, type: "person" | "skill", patch: Partial<Person | Skill>) => void;
  onDelete: (id: string, type: "person" | "skill") => void;
  onDeleteConnection: (id: string) => void;
}

function DetailPanel({ selectedId, selectedType, people, skills, connections, onClose, onUpdate, onDelete, onDeleteConnection }: DetailPanelProps) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editSub, setEditSub] = useState("");

  const person = selectedType === "person" ? people.find(p => p.id === selectedId) : null;
  const skill  = selectedType === "skill"  ? skills.find(s => s.id === selectedId) : null;
  const node   = person ?? skill;

  useEffect(() => {
    setEditing(false);
    if (person) { setEditName(person.name); setEditSub(person.role); }
    if (skill)  { setEditName(skill.name);  setEditSub(skill.category); }
  }, [selectedId]);

  if (!node) return null;

  const myConns = person
    ? connections.filter(c => c.personId === selectedId)
    : connections.filter(c => c.skillId === selectedId);

  const handleSave = () => {
    if (!editName.trim()) return;
    if (person) onUpdate(selectedId, "person", { name: editName.trim(), role: editSub.trim() });
    if (skill)  onUpdate(selectedId, "skill",  { name: editName.trim(), category: editSub.trim() });
    setEditing(false);
  };

  const title = person ? person.name : skill!.name;
  const sub   = person ? person.role : skill!.category;

  return (
    <div style={{
      position: "absolute", right: 0, top: 0, bottom: 0, width: 300,
      background: C.panel, borderLeft: `1px solid ${C.border}`,
      display: "flex", flexDirection: "column", zIndex: 10,
      animation: "smSlideIn 0.25s cubic-bezier(0.22,1,0.36,1)",
    }}>
      {/* Header */}
      <div style={{ padding: "20px 20px 16px", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>
              {selectedType === "person" ? "👤 Person" : "⬜ Skill"}
            </div>
            {editing ? (
              <>
                <Input value={editName} onChange={setEditName} placeholder="Name" />
                <div style={{ marginTop: 8 }}>
                  <Input value={editSub} onChange={setEditSub} placeholder={person ? "Role" : "Category"} />
                </div>
              </>
            ) : (
              <>
                <div style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 700, color: C.text, wordBreak: "break-word" }}>{title}</div>
                <div style={{ marginTop: 4 }}>
                  {person ? <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 12, color: C.textMid }}>{sub}</span>
                          : <CatTag cat={sub} />}
                </div>
              </>
            )}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", fontSize: 16, marginLeft: 8 }}>✕</button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>
          {person ? "Skills" : "Team Members"} ({myConns.length})
        </div>
        {myConns.length === 0 && (
          <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, color: C.textMuted, padding: "12px 0" }}>None yet.</div>
        )}
        {myConns.map(c => {
          const other = person ? skills.find(s => s.id === c.skillId) : people.find(p => p.id === c.personId);
          return (
            <div key={c.id} style={{
              display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
              background: C.surface, borderRadius: 8, marginBottom: 6, border: `1px solid ${C.border}`,
            }}>
              {skill && <div style={{ width: 8, height: 8, borderRadius: "50%", background: PROF_COLORS[c.proficiency].dot, flexShrink: 0 }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 600, color: C.text }}>{other?.name ?? "?"}</div>
                <ProfBadge level={c.proficiency} small />
              </div>
              {skill && <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 11, color: C.textMuted }}>{(other as Person)?.role}</span>}
              {person && <CatTag cat={(other as Skill)?.category ?? "Other"} />}
              <button onClick={() => onDeleteConnection(c.id)} title="Remove"
                style={{ background: "none", border: "none", color: "transparent", cursor: "pointer", fontSize: 13, flexShrink: 0, transition: "color 0.1s" }}
                onMouseEnter={e => e.currentTarget.style.color = "#EF4444"}
                onMouseLeave={e => e.currentTarget.style.color = "transparent"}
              >✕</button>
            </div>
          );
        })}
      </div>

      <div style={{ padding: "12px 20px 20px", borderTop: `1px solid ${C.border}`, display: "flex", flexDirection: "column", gap: 8 }}>
        {editing
          ? <div style={{ display: "flex", gap: 8 }}>
              <Btn onClick={handleSave} full>Save</Btn>
              <Btn variant="ghost" onClick={() => setEditing(false)}>Cancel</Btn>
            </div>
          : <Btn onClick={() => setEditing(true)} full>Edit</Btn>
        }
        <Btn variant="danger" onClick={() => {
          if (window.confirm(`Are you sure you want to delete ${node.name}? This cannot be undone.`)) {
            onDelete(selectedId, selectedType);
          }
        }} full>Delete</Btn>
      </div>
    </div>
  );
}

export default function App() {
  const saved = loadData();
  const [people, setPeople]           = useState(saved?.people ?? SEED_PEOPLE);
  const [skills, setSkills]           = useState(saved?.skills ?? SEED_SKILLS);
  const [connections, setConnections] = useState(saved?.connections ?? SEED_CONNECTIONS);

  const [selectedId, setSelectedId]     = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<"person" | "skill" | null>(null);

  const [modal, setModal] = useState<"person" | "skill" | "connection" | null>(null);

  const [fName, setFName] = useState("");
  const [fRole, setFRole] = useState("");
  const [fCat, setFCat]   = useState("");
  const [fPerson, setFPerson] = useState("");
  const [fSkill, setFSkill]   = useState("");
  const [fProf, setFProf]     = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 800, h: 600 });

  useEffect(() => {
    const obs = new ResizeObserver(e => {
      const r = e[0].contentRect;
      setDims({ w: r.width, h: r.height });
    });
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => { saveData(people, skills, connections); }, [people, skills, connections]);

  const svgRef = useGraph({
    people, skills, connections,
    width: dims.w, height: dims.h,
    selectedId, selectedType,
    onNodeClick: (id, type) => { setSelectedId(id); setSelectedType(type); },
  });

  const closeModal = () => { setModal(null); setFName(""); setFRole(""); setFCat(""); setFPerson(""); setFSkill(""); setFProf(""); };

  const addPerson = () => {
    if (!fName.trim()) return;
    setPeople(p => [...p, { id: uid(), name: fName.trim(), role: fRole.trim() }]);
    closeModal();
  };
  const addSkill = () => {
    if (!fName.trim()) return;
    setSkills(s => [...s, { id: uid(), name: fName.trim(), category: fCat.trim() || "Other" }]);
    closeModal();
  };
  const addConnection = () => {
    if (!fPerson || !fSkill || !fProf) return;
    if (connections.find(c => c.personId === fPerson && c.skillId === fSkill)) return;
    setConnections(c => [...c, { id: uid(), personId: fPerson, skillId: fSkill, proficiency: fProf }]);
    closeModal();
  };

  const updateNode = (id: string, type: "person" | "skill", patch: Partial<Person | Skill>) => {
    if (type === "person") setPeople(p => p.map(n => n.id === id ? { ...n, ...patch } : n));
    if (type === "skill")  setSkills(s => s.map(n => n.id === id ? { ...n, ...patch } : n));
  };
  const deleteNode = (id: string, type: "person" | "skill") => {
    if (type === "person") { setPeople(p => p.filter(n => n.id !== id)); setConnections(c => c.filter(x => x.personId !== id)); }
    if (type === "skill")  { setSkills(s => s.filter(n => n.id !== id)); setConnections(c => c.filter(x => x.skillId !== id)); }
    setSelectedId(null); setSelectedType(null);
  };
  const deleteConnection = (id: string) => setConnections(c => c.filter(x => x.id !== id));

  const panelOpen = selectedId !== null;

  const catOptions = ["Frontend", "Backend", "DevOps", "Design", "Other"].map(c => ({ value: c, label: c }));

  return (
    <>
      <style>{`        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${C.bg}; color: ${C.text}; font-family: 'Outfit', sans-serif; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 2px; }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: C.bg }}>

        <div style={{ height: 54, borderBottom: `1px solid ${C.border}`, background: C.panel, display: "flex", alignItems: "center", padding: "0 20px", gap: 10, flexShrink: 0, zIndex: 20 }}>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 17, fontWeight: 900, color: C.text, letterSpacing: "-0.02em", marginRight: "auto" }}>
            skill<span style={{ color: CAT_COLORS.Frontend }}>matrix</span>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 400, color: C.textMuted, marginLeft: 10 }}>
              {people.length}p · {skills.length}s · {connections.length}c
            </span>
          </div>

          <div style={{ display: "flex", gap: 10, marginRight: 12 }}>
            {PROFICIENCY.map(p => <ProfBadge key={p} level={p} small />)}
          </div>

          <Btn variant="ghost" onClick={() => setModal("connection")}>+ Connection</Btn>
          <Btn variant="ghost" onClick={() => setModal("skill")}>+ Skill</Btn>
          <Btn onClick={() => setModal("person")}>+ Person</Btn>
        </div>

        <div ref={containerRef} style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          <svg ref={svgRef} width={dims.w} height={dims.h} style={{ display: "block", background: C.canvas }} />

          {selectedId && selectedType && (
            <DetailPanel
              selectedId={selectedId} selectedType={selectedType}
              people={people} skills={skills} connections={connections}
              onClose={() => { setSelectedId(null); setSelectedType(null); }}
              onUpdate={updateNode} onDelete={deleteNode} onDeleteConnection={deleteConnection}
            />
          )}
        </div>
      </div>

      {modal === "person" && (
        <Modal title="Add Person" onClose={closeModal}>
          <Field label="Name"><Input value={fName} onChange={setFName} placeholder="e.g. Jordan" /></Field>
          <Field label="Role"><Input value={fRole} onChange={setFRole} placeholder="e.g. ML Engineer" /></Field>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={closeModal}>Cancel</Btn>
            <Btn onClick={addPerson} disabled={!fName.trim()}>Add Person</Btn>
          </div>
        </Modal>
      )}

      {modal === "skill" && (
        <Modal title="Add Skill" onClose={closeModal}>
          <Field label="Skill Name"><Input value={fName} onChange={setFName} placeholder="e.g. Kubernetes" /></Field>
          <Field label="Category"><Select value={fCat} onChange={setFCat} options={catOptions} /></Field>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={closeModal}>Cancel</Btn>
            <Btn onClick={addSkill} disabled={!fName.trim()}>Add Skill</Btn>
          </div>
        </Modal>
      )}

      {modal === "connection" && (
        <Modal title="Add Connection" onClose={closeModal}>
          <Field label="Person"><Select value={fPerson} onChange={setFPerson} options={people.map(p => ({ value: p.id, label: `${p.name} — ${p.role}` }))} /></Field>
          <Field label="Skill"><Select value={fSkill} onChange={setFSkill} options={skills.map(s => ({ value: s.id, label: `${s.name} (${s.category})` }))} /></Field>
          <Field label="Proficiency"><Select value={fProf} onChange={setFProf} options={PROFICIENCY.map(p => ({ value: p, label: p }))} /></Field>
          {fPerson && fSkill && connections.find(c => c.personId === fPerson && c.skillId === fSkill) && (
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#EF4444", marginBottom: 12 }}>This connection already exists.</div>
          )}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={closeModal}>Cancel</Btn>
            <Btn onClick={addConnection} disabled={!fPerson || !fSkill || !fProf || !!connections.find(c => c.personId === fPerson && c.skillId === fSkill)}>Add Connection</Btn>
          </div>
        </Modal>
      )}
    </>
  );
}
