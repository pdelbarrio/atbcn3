"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { startOfWeek, endOfWeek, addWeeks, subWeeks, format } from "date-fns";
import { formattedDate } from "@/lib/utils";
import { LeftArrow, RightArrow } from "../Buttons";
import {
  IoIosArrowDropleftCircle,
  IoIosArrowDroprightCircle,
} from "react-icons/io";
import { TbSlashes } from "react-icons/tb";
import { EventType } from "@/lib/types";
import EventRow from "../EventRow/EventRow";
import FilterPanel, { FilterState } from "./FilterPanel";

interface Props {
  events: EventType[] | null;
}

const EMPTY_FILTERS: FilterState = { date: "", location: "", tags: [] };

const normalize = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();

const toDayKey = (value: string | Date) => format(new Date(value), "yyyy-MM-dd");

export default function EventList({ events }: Props) {
  const safeEvents = useMemo(() => events ?? [], [events]);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const weekBeforeFilters = useRef(new Date());

  const currentWeekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const currentWeekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });

  const locationOptions = useMemo<string[]>(() => {
    const locations = safeEvents
      .map((event) => event.location)
      .filter((location): location is string => Boolean(location));
    return Array.from(new Set(locations)).sort((a, b) =>
      a.localeCompare(b, "ca"),
    );
  }, [safeEvents]);

  const tagOptions = useMemo(() => {
    const uniqueTags = new Map<string, string>();
    safeEvents.forEach((event) => {
      (event.tags ?? []).forEach((tag) => {
        const key = normalize(tag);
        if (key && !uniqueTags.has(key)) uniqueTags.set(key, tag);
      });
    });
    return Array.from(uniqueTags.values()).sort((a, b) =>
      a.localeCompare(b, "ca"),
    );
  }, [safeEvents]);

  const activeFilterCount =
    (filters.date ? 1 : 0) +
    (filters.location.trim() ? 1 : 0) +
    (filters.tags.length > 0 ? 1 : 0);
  const isFiltering = activeFilterCount > 0;

  const eventsInView = safeEvents.filter((event) => {
    if (isFiltering) {
      if (filters.date && toDayKey(event.date) !== filters.date) return false;

      const locationTerm = filters.location.trim();
      if (
        locationTerm &&
        !normalize(event.location ?? "").includes(normalize(locationTerm))
      ) {
        return false;
      }

      if (filters.tags.length > 0) {
        const eventTagKeys = (event.tags ?? []).map(normalize);
        if (
          !filters.tags.some((tag) => eventTagKeys.includes(normalize(tag)))
        ) {
          return false;
        }
      }

      return true;
    }

    const eventDate = new Date(event.date);
    return eventDate >= currentWeekStart && eventDate <= currentWeekEnd;
  });

  const eventsSorted = [...eventsInView].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const groupedEvents = eventsSorted.reduce(
    (groups: Record<string, EventType[]>, event) => {
      const dayKey = toDayKey(event.date);
      if (!groups[dayKey]) {
        groups[dayKey] = [];
      }
      groups[dayKey].push(event);
      return groups;
    },
    {},
  );

  const groupedEventEntries = Object.entries(groupedEvents);

  const isFirstWeek =
    currentWeekStart.getTime() ===
    startOfWeek(new Date(), { weekStartsOn: 1 }).getTime();

  const nextWeek = () => {
    setCurrentWeek(addWeeks(currentWeek, 1));
  };

  const previousWeek = () => {
    setCurrentWeek(subWeeks(currentWeek, 1));
  };

  const applyFilters = (next: FilterState) => {
    if (!isFiltering) weekBeforeFilters.current = currentWeek;
    setFilters(next);
  };

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
    setCurrentWeek(weekBeforeFilters.current);
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [currentWeek, filters]);

  const emptyMessage = !events
    ? "No s'han pogut carregar els esdeveniments"
    : isFiltering
      ? "No hi ha esdeveniments que coincideixin amb els filtres"
      : "No hi ha esdeveniments introduïts per a aquesta setmana";

  const filterSummary = [
    filters.date ? formattedDate(`${filters.date}T00:00:00`, "d MMM") : "",
    filters.location.trim(),
    ...filters.tags,
  ]
    .filter(Boolean)
    .join(" · ");

  const filterPanel = (
    <FilterPanel
      filters={filters}
      locations={locationOptions}
      tags={tagOptions}
      activeCount={activeFilterCount}
      onApply={applyFilters}
    />
  );

  return (
    <>
      <div className="px-4 justify-between flex items-center gap-2 bg-card dark:bg-gradient-dark dark:border dark:border-glow rounded-lg shadow-lg overflow-hidden mb-3 text-center py-2">
        {isFiltering ? (
          <>
            <div className="min-w-0">
              <p className="text-text text-xs md:text-base dark:text-glow font-bold">
                Resultats
              </p>
              <p className="max-w-[45vw] truncate text-xs opacity-70">
                {filterSummary}
              </p>
            </div>
            <button
              type="button"
              data-testid="clear-filters-results"
              onClick={clearFilters}
              className="whitespace-nowrap text-xs font-bold uppercase tracking-wide text-text dark:text-glow hover:opacity-70"
            >
              Treu filtres
            </button>
            {filterPanel}
          </>
        ) : (
          <>
            <div>
              {isFirstWeek ? (
                ""
              ) : (
                <div
                  className="hover:cursor-pointer p-1 mr-2"
                  onClick={previousWeek}
                >
                  <IoIosArrowDropleftCircle className="w-8 h-8 text-btvgray dark:text-glow" />
                </div>
              )}
            </div>
            <p className="text-text text-xs md:text-base dark:text-glow font-bold mr-2">
              del {formattedDate(currentWeekStart.toISOString(), "d MMMM")} al{" "}
              {formattedDate(currentWeekEnd.toISOString(), "d MMMM, yyyy")}
            </p>
            <div className="flex items-center gap-2">
              {filterPanel}
              <div onClick={nextWeek} className="hover:cursor-pointer p-1">
                <IoIosArrowDroprightCircle className="w-8 h-8 text-btvgray dark:text-glow" />
              </div>
            </div>
          </>
        )}
      </div>

      <div
        data-testid={isFiltering ? "filtered-events" : undefined}
        className={isFiltering ? "pb-20" : undefined}
      >
        {eventsInView.length > 0 ? (
          <div suppressHydrationWarning>
            {groupedEventEntries.map(([dayKey, groupEvents]) => (
              <div key={dayKey} className="mb-4">
                <div className="mb-2">
                  <div className="flex items-center text-left text-sm md:text-base font-bold text-text dark:text-glow uppercase tracking-wide">
                    <TbSlashes />
                    {formattedDate(
                      `${dayKey}T00:00:00`,
                      isFiltering ? "eeee d 'de' MMMM" : "eeee d",
                    )}
                  </div>
                </div>
                <div className="space-y-3">
                  {groupEvents.map((event: EventType) => (
                    <EventRow event={event} key={event.id} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            data-testid="noevents-message"
            className="bg-card dark:bg-gradient-dark dark:border dark:border-glow rounded-lg shadow-lg overflow-hidden mb-3"
          >
            <p
              data-testid={
                isFiltering ? "filtered-noevents-message" : undefined
              }
              className="text-center p-10 text-text dark:text-glow font-bold"
            >
              {emptyMessage}
            </p>
          </div>
        )}
      </div>

      {!isFiltering && (
        <div className="max-w-screen-sm mx-auto px-4 pb-20">
          <div className="flex justify-between py-4">
            <div>
              {isFirstWeek ? (
                ""
              ) : (
                <button
                  data-testid="previous-week-button"
                  className=" text-gray-800 font-bold sm:p-1 dark:bg-glow rounded-full"
                  onClick={previousWeek}
                  disabled={isFirstWeek}
                >
                  <LeftArrow />
                </button>
              )}
            </div>
            <div>
              <button
                data-testid="next-week-button"
                className="text-gray-800 font-bold sm:p-1 dark:bg-glow rounded-full"
                onClick={nextWeek}
              >
                <RightArrow />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
