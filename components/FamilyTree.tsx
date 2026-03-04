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

  // Helper function to resolve tree connections for a person
  const getTreeData = (personId: string) => {
    const spousesList: SpouseData[] = relationships
      .filter(
        (r) =>
          r.type === "marriage" &&
          (r.person_a === personId || r.person_b === personId),
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
        r.person_a === personId,
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
        // 1. birth_order ascending (null → pushed to end)
        const aOrder = a.birth_order ?? Infinity;
        const bOrder = b.birth_order ?? Infinity;
        if (aOrder !== bOrder) return aOrder - bOrder;
        // 2. birth_year ascending (null → pushed to end)
        const aYear = a.birth_year ?? Infinity;
        const bYear = b.birth_year ?? Infinity;
        return aYear - bYear;
      });

    // If there is only one spouse, or NO spouse, we can just lump all children together.
    // Standard family trees often combine all children under the main node
    // for simplicity of drawing, especially when dealing with CSS-based trees.
    return {
      person: personsMap.get(personId)!,
      spouses: spousesList,
      children: childrenList,
    };
  };

  // Recursive function for rendering nodes
  // Tracks visited IDs to prevent infinite loops from circular relationships
  const renderTreeNode = (
    personId: string,
    visited: Set<string> = new Set(),
  ): React.ReactNode => {
    if (visited.has(personId)) return null; // cycle guard
    visited.add(personId);

    const data = getTreeData(personId);
    if (!data.person) return null;

    return (
      <li>
        <div className="node-container inline-flex flex-col items-center">
          {/* Main Person & Spouses Row */}
          <div className="flex relative z-10 bg-white rounded-2xl shadow-md border border-stone-200/80 transition-opacity">
            <FamilyNodeCard person={data.person} />

            {data.spouses.length > 0 && (
              <>
                {data.spouses.map((spouseData, idx) => (
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
              </>
            )}
          </div>
        </div>

        {/* Render Children (if any) */}
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
    {/* Thêm touch-none để chặn hành vi vuốt mặc định của mobile, tránh xung đột */}
    <div className="w-full h-full relative touch-none">
      <TransformWrapper
        initialScale={1}
        minScale={0.1}
        maxScale={3}
        centerOnInit={true}
        limitToBounds={false} // Giúp vuốt mượt mà không bị khựng khi chạm viền
        wheel={{ step: 0.1, smoothStep: 0.005 }}
        pinch={{ step: 1 }} // Chỉnh step nhỏ lại để pinch-to-zoom trên điện thoại mượt hơn
        panning={{ velocityDisabled: false }} // Bật quán tính trượt
        doubleClick={{ disabled: false, step: 0.5 }} // Chạm đúp mượt hơn
      >
        {({ zoomIn, zoomOut, resetTransform, instance }) => (
          <>
            {/* Grouped Toolbar (Zoom, Filters, Export) Portaled to Header */}
            {portalNode &&
              createPortal(
                <div
                  className="flex flex-wrap justify-center items-center gap-2 w-max"
                  ref={filtersRef}
                >
                  {/* Zoom Controls - Hidden on mobile, use pinch to zoom */}
                  <div className="hidden sm:flex items-center bg-white/80 backdrop-blur-md shadow-sm border border-stone-200/60 rounded-full overflow-hidden transition-opacity h-10">
                    <button
                      onClick={() => zoomOut()}
                      className="px-3 h-full hover:bg-stone-100/50 text-stone-600 transition-colors disabled:opacity-50"
                      title="Thu nhỏ"
                      disabled={instance.transformState.scale <= 0.1}
                    >
                      <ZoomOut className="size-4" />
                    </button>
                    <button
                      onClick={() => resetTransform()}
                      className="px-2 h-full hover:bg-stone-100/50 text-stone-600 transition-colors text-xs font-medium min-w-[50px] text-center border-x border-stone-200/50"
                      title="Đặt lại"
                    >
                      {Math.round(instance.transformState.scale * 100)}%
                    </button>
                    <button
                      onClick={() => zoomIn()}
                      className="px-3 h-full hover:bg-stone-100/50 text-stone-600 transition-colors disabled:opacity-50"
                      title="Phóng to"
                      disabled={instance.transformState.scale >= 3}
                    >
                      <ZoomIn className="size-4" />
                    </button>
                  </div>

                  {/* Filters */}
                  <div className="relative">
                    <button
                      onClick={() => setShowFilters(!showFilters)}
                      className={`flex items-center gap-2 px-4 h-10 rounded-full font-semibold text-sm shadow-sm border transition-all duration-300 ${
                        showFilters
                          ? "bg-amber-100/90 text-amber-800 border-amber-200"
                          : "bg-white/80 text-stone-600 border-stone-200/60 hover:bg-white hover:text-stone-900 hover:shadow-md backdrop-blur-md"
                      }`}
                    >
                      <Filter className="size-4" />
                      <span className="hidden sm:inline">Lọc hiển thị</span>
                    </button>

                    <AnimatePresence>
                      {showFilters && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          transition={{ duration: 0.15, ease: "easeOut" }}
                          className="absolute top-full right-0 mt-2 w-48 bg-white/95 backdrop-blur-xl shadow-xl border border-stone-200/60 rounded-2xl p-4 flex flex-col gap-3 z-50"
                        >
                          <div className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">
                            HIỂN THỊ
                          </div>
                          <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer hover:text-stone-900 transition-colors select-none">
                            <input
                              type="checkbox"
                              checked={!showAvatar}
                              onChange={(e) => setShowAvatar(!e.target.checked)}
                              className="rounded text-amber-600 focus:ring-amber-500 cursor-pointer size-4"
                            />
                            <ImageIcon className="size-4 text-stone-400" /> Ẩn ảnh đại
                            diện
                          </label>

                          <div className="h-px w-full bg-stone-100 my-1 font-bold text-stone-400 uppercase tracking-wider flex items-center gap-2"></div>
                          <div className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">
                            LỌC DỮ LIỆU
                          </div>
                          <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer hover:text-stone-900 transition-colors select-none">
                            <input
                              type="checkbox"
                              checked={hideSpouses}
                              onChange={(e) => setHideSpouses(e.target.checked)}
                              className="rounded text-amber-600 focus:ring-amber-500 cursor-pointer size-4"
                            />
                            Ẩn dâu/rể
                          </label>
                          <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer hover:text-stone-900 transition-colors select-none">
                            <input
                              type="checkbox"
                              checked={hideMales}
                              onChange={(e) => setHideMales(e.target.checked)}
                              className="rounded text-amber-600 focus:ring-amber-500 cursor-pointer size-4"
                            />
                            Ẩn nam
                          </label>
                          <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer hover:text-stone-900 transition-colors select-none">
                            <input
                              type="checkbox"
                              checked={hideFemales}
                              onChange={(e) => setHideFemales(e.target.checked)}
                              className="rounded text-amber-600 focus:ring-amber-500 cursor-pointer size-4"
                            />
                            Ẩn nữ
                          </label>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Export Button */}
                  {canEdit && <ExportButton />}
                </div>,
                portalNode,
              )}

            <div className="w-full h-full bg-stone-50 cursor-grab active:cursor-grabbing overflow-hidden">
              <TransformComponent 
                wrapperStyle={{ 
                  width: "100%", 
                  height: "100%",
                  willChange: "transform" // Bật GPU Acceleration để render mượt hơn
                }}
              >
                {/* We use a style block to inject the CSS logic for the family tree lines */}
                <style
                  dangerouslySetInnerHTML={{
                    __html: `
                .css-tree ul {
                  padding-top: 30px; 
                  position: relative;
                  display: flex;
                  justify-content: center;
                  padding-left: 0;
                  user-select: none;
                }

                .css-tree li {
                  float: left; text-align: center;
                  list-style-type: none;
                  position: relative;
                  padding: 30px 5px 0 5px;
                }

                /* Connecting lines */
                .css-tree li::before, .css-tree li::after {
                  content: '';
                  position: absolute; top: 0; right: 50%;
                  border-top: 2px solid #d6d3d1;
                  width: 50%; height: 30px;
                }
                .css-tree li::after {
                  right: auto; left: 50%;
                  border-left: 2px solid #d6d3d1;
                }

                /* Remove left-right connectors from elements without siblings */
                .css-tree li:only-child::after {
                  display: none;
                }
                .css-tree li:only-child::before {
                  content: '';
                  position: absolute;
                  top: 0;
                  left: 50%;
                  border-left: 2px solid #d6d3d1;
                  width: 0;
                  height: 30px;
                }

                /* Remove top connector from first child */
                .css-tree ul:first-child > li {
                  padding-top: 0px;
                }
                .css-tree ul:first-child > li::before {
                  display: none;
                }

                /* Remove left connector from first child and right connector from last child */
                .css-tree li:first-child::before, .css-tree li:last-child::after {
                  border: 0 none;
                }

                /* Add back the vertical connector to the last nodes */
                .css-tree li:last-child::before {
                  border-right: 2px solid #d6d3d1;
                  border-radius: 0 12px 0 0;
                }
                .css-tree li:first-child::after {
                  border-radius: 12px 0 0 0;
                }

                /* Downward connectors from parents */
                .css-tree ul ul::before {
                  content: '';
                  position: absolute; top: 0; left: 50%;
                  border-left: 2px solid #d6d3d1;
                  width: 0; height: 30px;
                }
              `,
                  }}
                />

                <div
                  id="export-container"
                  className="w-max min-w-full mx-auto p-10 css-tree"
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