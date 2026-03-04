"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Person, Relationship } from "@/types";
import { AnimatePresence, motion } from "framer-motion";
import { Filter, Image as ImageIcon, ZoomIn, ZoomOut } from "lucide-react";
import { useDashboard } from "./DashboardContext";
import ExportButton from "./ExportButton";
import FamilyNodeCard from "./FamilyNodeCard";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

interface SpouseData {
  person: Person;
  note?: string | null;
}

export default function FamilyTree({
  personsMap,
  relationships,
  roots,
  canEdit,
}: {
  personsMap: Map<string, Person>;
  relationships: Relationship[];
  roots: Person[];
  canEdit?: boolean;
}) {
  const [showFilters, setShowFilters] = useState(false);
  const [hideSpouses, setHideSpouses] = useState(false);
  const [hideMales, setHideMales] = useState(false);
  const [hideFemales, setHideFemales] = useState(false);

  const { showAvatar, setShowAvatar } = useDashboard();
  const filtersRef = useRef<HTMLDivElement>(null);
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalNode(document.getElementById("tree-toolbar-portal"));

    const handleClickOutside = (event: MouseEvent) => {
      if (
        filtersRef.current &&
        !filtersRef.current.contains(event.target as Node)
      ) {
        setShowFilters(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getTreeData = (personId: string) => {
    const spousesList: SpouseData[] = relationships
      .filter(
        (r) =>
          r.type === "marriage" &&
          (r.person_a === personId || r.person_b === personId)
      )
      .map((r) => {
        const spouseId = r.person_a === personId ? r.person_b : r.person_a;
        return {
          person: personsMap.get(spouseId)!,
          note: r.note,
        };
      })
      .filter((s) => s.person)
      .filter((s) => {
        if (hideSpouses) return false;
        if (hideMales && s.person.gender === "male") return false;
        if (hideFemales && s.person.gender === "female") return false;
        return true;
      });

    const childRels = relationships.filter(
      (r) =>
        (r.type === "biological_child" || r.type === "adopted_child") &&
        r.person_a === personId
    );

    const childrenList = (
      childRels
        .map((r) => personsMap.get(r.person_b))
        .filter(Boolean) as Person[]
    )
      .filter((c) => {
        if (hideMales && c.gender === "male") return false;
        if (hideFemales && c.gender === "female") return false;
        return true;
      })
      .sort((a, b) => {
        const aOrder = a.birth_order ?? Infinity;
        const bOrder = b.birth_order ?? Infinity;
        if (aOrder !== bOrder) return aOrder - bOrder;

        const aYear = a.birth_year ?? Infinity;
        const bYear = b.birth_year ?? Infinity;
        return aYear - bYear;
      });

    return {
      person: personsMap.get(personId)!,
      spouses: spousesList,
      children: childrenList,
    };
  };

  const renderTreeNode = (
    personId: string,
    visited: Set<string> = new Set()
  ): React.ReactNode => {
    if (visited.has(personId)) return null;
    visited.add(personId);

    const data = getTreeData(personId);
    if (!data.person) return null;

    return (
      <li>
        <div className="node-container inline-flex flex-col items-center">
          <div className="flex relative z-10 bg-white rounded-2xl shadow-md border border-stone-200/80">
            <FamilyNodeCard person={data.person} />

            {data.spouses.length > 0 &&
              data.spouses.map((spouseData, idx) => (
                <div key={spouseData.person.id} className="flex relative">
                  <FamilyNodeCard
                    isRingVisible={idx === 0}
                    isPlusVisible={idx > 0}
                    person={spouseData.person}
                    role={
                      spouseData.person.gender === "male" ? "Chồng" : "Vợ"
                    }
                    note={spouseData.note}
                  />
                </div>
              ))}
          </div>
        </div>

        {data.children.length > 0 && (
          <ul>
            {data.children.map((child) => (
              <React.Fragment key={child.id}>
                {renderTreeNode(child.id, new Set(visited))}
              </React.Fragment>
            ))}
          </ul>
        )}
      </li>
    );
  };

  if (roots.length === 0)
    return (
      <div className="text-center p-10 text-stone-500">
        Không tìm thấy dữ liệu.
      </div>
    );

  return (
    <div className="w-full h-full relative">
      <TransformWrapper
        initialScale={1}
        minScale={0.3}
        maxScale={2.5}
        centerOnInit
        limitToBounds={false}
        doubleClick={{ disabled: true }}
        wheel={{
          step: 0.05,
          smoothStep: 0.01,
        }}
        pinch={{
          step: 0.5,
        }}
        panning={{
          velocityDisabled: false,
          velocityEqualToMove: true,
        }}
        zoomAnimation={{
          animationTime: 200,
          animationType: "easeOut",
        }}
      >
        {({ zoomIn, zoomOut, resetTransform, instance }) => (
          <>
            {portalNode &&
              createPortal(
                <div
                  className="flex flex-wrap justify-center items-center gap-2 w-max"
                  ref={filtersRef}
                >
                  <div className="hidden sm:flex items-center bg-white/80 backdrop-blur-md shadow-sm border border-stone-200/60 rounded-full overflow-hidden h-10">
                    <button
                      onClick={() => zoomOut()}
                      className="px-3 h-full hover:bg-stone-100/50 text-stone-600"
                      disabled={instance.transformState.scale <= 0.3}
                    >
                      <ZoomOut className="size-4" />
                    </button>

                    <button
                      onClick={() => resetTransform()}
                      className="px-2 h-full border-x border-stone-200/50 text-xs font-medium min-w-[50px]"
                    >
                      {Math.round(instance.transformState.scale * 100)}%
                    </button>

                    <button
                      onClick={() => zoomIn()}
                      className="px-3 h-full hover:bg-stone-100/50 text-stone-600"
                      disabled={instance.transformState.scale >= 2.5}
                    >
                      <ZoomIn className="size-4" />
                    </button>
                  </div>

                  {canEdit && <ExportButton />}
                </div>,
                portalNode
              )}

            <div
              className="w-full h-full bg-stone-50 overflow-hidden touch-none"
              style={{ touchAction: "none" }}
            >
              <TransformComponent
                wrapperStyle={{
                  width: "100%",
                  height: "100%",
                }}
              >
                <div
                  id="export-container"
                  className="w-max min-w-full mx-auto p-10 css-tree"
                  style={{
                    willChange: "transform",
                    transform: "translateZ(0)",
                  }}
                >
                  <ul>
                    {roots.map((root) => (
                      <React.Fragment key={root.id}>
                        {renderTreeNode(root.id)}
                      </React.Fragment>
                    ))}
                  </ul>
                </div>
              </TransformComponent>
            </div>
          </>
        )}
      </TransformWrapper>
    </div>
  );
}