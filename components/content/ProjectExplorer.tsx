"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ProjectCategory, ProjectRecord, ProjectRegion } from "@/content/site";

const categories: ReadonlyArray<"All" | ProjectCategory> = ["All", "Manufacturing", "Power Generation", "Data Centers", "Recycling"];
const regions: ReadonlyArray<"All" | ProjectRegion> = ["All", "United States", "India", "Southeast Asia", "Africa"];

export function ProjectExplorer({ projects }: { projects: ReadonlyArray<ProjectRecord> }) {
  const [category, setCategory] = useState<(typeof categories)[number]>("All");
  const [region, setRegion] = useState<(typeof regions)[number]>("All");
  const filtered = useMemo(() => projects.filter((project) => {
    const categoryMatch = category === "All" || project.category === category || project.secondaryCategories?.includes(category);
    const regionMatch = region === "All" || project.region === region;
    return categoryMatch && regionMatch;
  }), [projects, category, region]);

  return (
    <>
      <div className="filter-panel" aria-label="Project filters">
        <fieldset>
          <legend>Business unit</legend>
          <div className="filter-row">
            {categories.map((item) => <button key={item} type="button" className="filter-chip" data-active={category === item} onClick={() => setCategory(item)}>{item}</button>)}
          </div>
        </fieldset>
        <fieldset>
          <legend>Region</legend>
          <div className="filter-row">
            {regions.map((item) => <button key={item} type="button" className="filter-chip" data-active={region === item} onClick={() => setRegion(item)}>{item}</button>)}
          </div>
        </fieldset>
      </div>
      <p className="results-count" aria-live="polite">Showing {filtered.length} of {projects.length} projects</p>
      <div className="project-grid">
        {filtered.map((project) => (
          <Link className="project-card" key={project.slug} href={`/projects/${project.slug}`}>
            <div className="project-card__visual" aria-hidden="true"><span>{project.category}</span></div>
            <div className="project-card__body">
              <div className="eyebrow">{project.region} · {project.status}</div>
              <h2>{project.title}</h2>
              <p>{project.summary}</p>
              <div className="card-meta"><span className="pill">{project.location}</span><span className="pill">{project.capacity}</span></div>
              <span className="text-link">View project <span aria-hidden="true">↗</span></span>
            </div>
          </Link>
        ))}
      </div>
      {filtered.length === 0 && <div className="empty-state">No projects match those filters.</div>}
    </>
  );
}
