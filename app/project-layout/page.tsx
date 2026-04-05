import type { Metadata } from "next";
import ProjectLayoutMap from "@/components/ProjectLayoutMap";

export const metadata: Metadata = {
  title: "Project Layout",
  description: "Interactive full-screen project layout with amenities mapping.",
};

export default function ProjectLayoutPage() {
  return <ProjectLayoutMap />;
}
