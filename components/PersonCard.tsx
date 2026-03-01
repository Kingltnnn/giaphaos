"use client";

import { Person } from "@/types";
import { formatDisplayDate } from "@/utils/dateHelpers";
import Image from "next/image";
import { useDashboard } from "./DashboardContext";
import DefaultAvatar from "./DefaultAvatar";
import { FemaleIcon, MaleIcon } from "./GenderIcons";

interface PersonCardProps {
  person: Person;
}

export default function PersonCard({ person }: PersonCardProps) {
  const { setMemberModalId } = useDashboard();

  const isDeceased = person.is_deceased;

  const getGenderStyle = (gender: string) => {
    if (gender === "male") return "bg-sky-100 text-sky-600";
    if (gender === "female") return "bg-rose-100 text-rose-600";
    return "bg-stone-100 text-stone-600";
  };

  return (
    <button
      onClick={() => setMemberModalId(person.id)}
      className={`group block relative bg-white/60 p-2 sm:p-2.5 rounded-xl shadow-sm border border-stone-200/60 hover:border-amber-300 hover:shadow-md hover:bg-white/90 transition-all duration-300 overflow-hidden
        ${isDeceased ? "opacity-80 grayscale-[0.3]" : ""}`}
    >
      <div className="flex items-center space-x-3 relative z-10">
        <div className="relative">
          <div
            className={`h-10 w-10 sm:h-12 sm:w-12 rounded-full flex items-center justify-center text-sm font-bold text-white overflow-hidden shrink-0 shadow-md ring-2 ring-white transition-transform duration-300 group-hover:scale-105
            ${person.gender === "male" ? "bg-linear-to-br from-sky-400 to-sky-700" : person.gender === "female" ? "bg-linear-to-br from-rose-400 to-rose-700" : "bg-linear-to-br from-stone-400 to-stone-600"}`}
          >
            {person.avatar_url ? (
              <Image
                unoptimized
                src={person.avatar_url}
                alt={person.full_name}
                width={48}
                height={48}
                className="h-full w-full object-cover"
              />
            ) : (
              <DefaultAvatar gender={person.gender} />
            )}
          </div>
          {/* Gender Indicator Icon */}
          <div
            className={`absolute -bottom-0.5 -right-0.5 size-4 rounded-full ring-1 ring-white shadow-xs flex items-center justify-center ${getGenderStyle(person.gender)}`}
          >
            {person.gender === "male" ? (
              <MaleIcon className="size-3" />
            ) : person.gender === "female" ? (
              <FemaleIcon className="size-3" />
            ) : null}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-sm text-left font-bold text-stone-900 group-hover:text-amber-700 transition-colors truncate mb-0.5">
            {person.full_name}
          </h3>
          <p className="text-[11px] font-medium text-stone-500 truncate flex items-center gap-1">
            <svg
              className="size-3 shrink-0 text-stone-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span className="truncate">
              {formatDisplayDate(
                person.birth_year,
                person.birth_month,
                person.birth_day,
              )}
              {isDeceased &&
                ` → ${formatDisplayDate(person.death_year, person.death_month, person.death_day)}`}
            </span>
          </p>
          {(isDeceased ||
            person.is_in_law ||
            person.birth_order != null ||
            person.generation != null) && (
            <div className="flex flex-wrap items-center gap-1 shrink-0 mt-1">
              {isDeceased && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-stone-100 text-stone-500 uppercase tracking-widest border border-stone-200/60 shadow-xs">
                  Đã mất
                </span>
              )}
              {person.is_in_law && (
                <span
                  className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest shadow-xs border ${
                    person.gender === "male"
                      ? "bg-sky-50 text-sky-700 border-sky-200/60"
                      : person.gender === "female"
                        ? "bg-rose-50 text-rose-700 border-rose-200/60"
                        : "bg-stone-50 text-stone-700 border-stone-200/60"
                  }`}
                >
                  {person.gender === "male"
                    ? "Rể"
                    : person.gender === "female"
                      ? "Dâu"
                      : "Khách"}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
