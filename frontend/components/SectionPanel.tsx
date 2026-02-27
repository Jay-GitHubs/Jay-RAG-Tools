"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  arrayMove,
} from "@dnd-kit/sortable";
import SortableSectionCard from "./SortableSectionCard";
import type { MarkdownSection } from "@/lib/markdownSections";
import type { TrashDetection } from "@/lib/types";

interface SectionPanelProps {
  sections: MarkdownSection[];
  trash: TrashDetection[];
  activePage: number;
  onPageChange: (page: number) => void;
  onDeleteSection: (pageNumber: number) => void;
  syncSource: React.RefObject<string | null>;
  editingSectionPage: number | null;
  onStartEdit: (pageNumber: number) => void;
  onCancelEdit: () => void;
  onEditSection: (pageNumber: number, newRawContent: string) => void;
  onReorderSections: (reordered: MarkdownSection[]) => void;
  highlightQuery?: string;
  highlightCaseSensitive?: boolean;
}

const TRASH_LABELS: Record<string, string> = {
  table_of_contents: "TOC",
  boilerplate: "Boilerplate",
  blank_page: "Blank",
  header_footer: "Header/Footer",
};

export default function SectionPanel({
  sections,
  trash,
  activePage,
  onPageChange,
  onDeleteSection,
  syncSource,
  editingSectionPage,
  onStartEdit,
  onCancelEdit,
  onEditSection,
  onReorderSections,
  highlightQuery,
  highlightCaseSensitive,
}: SectionPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Build trash lookup: page → trash type
  const trashByPage = new Map<number, string>();
  for (const t of trash) {
    trashByPage.set(t.page, TRASH_LABELS[t.trash_type] || t.trash_type);
  }

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = sections.findIndex((s) => s.pageNumber === active.id);
      const newIndex = sections.findIndex((s) => s.pageNumber === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(sections, oldIndex, newIndex);
      onReorderSections(reordered);
    },
    [sections, onReorderSections]
  );

  // IntersectionObserver to detect which section is visible
  useEffect(() => {
    const container = containerRef.current;
    if (!container || sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (syncSource.current === "left") return;

        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio > 0.3) {
            const pageNum = Number(entry.target.getAttribute("data-section"));
            if (!isNaN(pageNum) && pageNum !== activePage) {
              syncSource.current = "right";
              onPageChange(pageNum);
              setTimeout(() => {
                if (syncSource.current === "right") syncSource.current = null;
              }, 100);
            }
          }
        }
      },
      {
        root: container,
        threshold: [0.3],
      }
    );

    sectionRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections, activePage, onPageChange, syncSource]);

  // Scroll to section when PDF navigates
  useEffect(() => {
    if (syncSource.current !== "left") return;
    const el = sectionRefs.current.get(activePage);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [activePage, syncSource]);

  const setSectionRef = useCallback(
    (page: number) => (el: HTMLDivElement | null) => {
      if (el) {
        sectionRefs.current.set(page, el);
      } else {
        sectionRefs.current.delete(page);
      }
    },
    []
  );

  return (
    <div ref={containerRef} className="h-full overflow-y-auto p-4 space-y-4">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sections.map((s) => s.pageNumber)}
          strategy={verticalListSortingStrategy}
        >
          {sections.map((section) => (
            <SortableSectionCard
              key={section.pageNumber}
              section={section}
              isActive={section.pageNumber === activePage}
              trashLabel={trashByPage.get(section.pageNumber)}
              isEditing={editingSectionPage === section.pageNumber}
              onStartEdit={onStartEdit}
              onCancelEdit={onCancelEdit}
              onEditSection={onEditSection}
              onDeleteSection={onDeleteSection}
              setSectionRef={setSectionRef}
              highlightQuery={highlightQuery}
              highlightCaseSensitive={highlightCaseSensitive}
            />
          ))}
        </SortableContext>
      </DndContext>

      {sections.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          No sections found in markdown.
        </div>
      )}
    </div>
  );
}
