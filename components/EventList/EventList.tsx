"use client";

import React, { useState, useEffect, useMemo } from "react";
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
import FilterPanel from "./FilterPanel";

interface Props {
  events: EventType[];
}

const normalize = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();

export default function EventList({ events }: any) {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const currentWeekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const currentWeekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });

  const locationOptions = useMemo<string[]>(() => {
    const locations: string[] = events
      .map((event: EventType) => event.location)
      .filter((location: string) => Boolean(location));
    return Array.from(new Set<string>(locations)).sort((a, b) =>
      a.localeCompare(b, "ca"),
    );
  }, [events]);

  const tagOptions = useMemo(() => {
    const uniqueTags = new Map<string, string>();
    events.forEach((event: EventType) => {
      (event.tags ?? []).forEach((tag) => {
        const key = normalize(tag);
        if (key && !uniqueTags.has(key)) uniqueTags.set(key, tag);
      });
    });
    return Array.from(uniqueTags.values()).sort((a, b) =>
      a.localeCompare(b, "ca"),
    );
  }, [events]);

  const activeFilterCount =
    (selectedDate ? 1 : 0) +
    (locationFilter.trim() ? 1 : 0) +
    (selectedTags.length > 0 ? 1 : 0);

  const eventsInView = events.filter((event: EventType) => {
    const eventDate = new Date(event.date);

    if (selectedDate) {
      if (format(eventDate, "yyyy-MM-dd") !== selectedDate) return false;
    } else if (eventDate < currentWeekStart || eventDate > currentWeekEnd) {
      return false;
    }

    const locationTerm = locationFilter.trim();
    if (
      locationTerm &&
      !normalize(event.location).includes(normalize(locationTerm))
    ) {
      return false;
    }

    if (selectedTags.length > 0) {
      const eventTagKeys = (event.tags ?? []).map(normalize);
      if (!selectedTags.some((tag) => eventTagKeys.includes(normalize(tag)))) {
        return false;
      }
    }

    return true;
  });

  const eventsSorted = [...eventsInView].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const groupedEvents = eventsSorted.reduce(
    (groups: Record<string, EventType[]>, event) => {
      const dayKey = format(new Date(event.date), "yyyy-MM-dd");
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

  const backToWeek = () => {
    if (selectedDate) {
      setCurrentWeek(new Date(`${selectedDate}T00:00:00`));
    }
    setSelectedDate("");
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((current) =>
      current.includes(tag)
        ? current.filter((item) => item !== tag)
        : [...current, tag],
    );
  };

  const clearFilters = () => {
    setSelectedDate("");
    setLocationFilter("");
    setSelectedTags([]);
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [currentWeek, selectedDate, locationFilter, selectedTags]);

  const emptyMessage = selectedDate
    ? "No hi ha esdeveniments per a aquest dia"
    : activeFilterCount > 0
      ? "No hi ha esdeveniments que coincideixin amb els filtres"
      : "No hi ha esdeveniments introduïts per a aquesta setmana";

  return (
    <>
      <div className="px-4 justify-between flex items-center bg-card dark:bg-gradient-dark dark:border dark:border-glow rounded-lg shadow-lg overflow-hidden mb-3 text-center py-2">
        {selectedDate ? (
          <>
            <button
              type="button"
              data-testid="back-to-week"
              onClick={backToWeek}
              className="flex items-center hover:cursor-pointer p-1 mr-2 text-text dark:text-glow"
            >
              <IoIosArrowDropleftCircle className="w-7 h-7 text-btvgray dark:text-glow" />
              <span className="text-xs font-bold">Setmana</span>
            </button>
            <p className="text-text text-xs md:text-base dark:text-glow font-bold">
              {formattedDate(
                `${selectedDate}T00:00:00.000Z`,
                "eeee d 'de' MMMM",
              )}
            </p>
            <div className="w-20" />
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
            <div onClick={nextWeek} className="hover:cursor-pointer p-1">
              <IoIosArrowDroprightCircle className="w-8 h-8 text-btvgray dark:text-glow" />
            </div>
          </>
        )}
      </div>

      <FilterPanel
        selectedDate={selectedDate}
        onSelectedDateChange={setSelectedDate}
        location={locationFilter}
        onLocationChange={setLocationFilter}
        locations={locationOptions}
        selectedTags={selectedTags}
        onToggleTag={toggleTag}
        tags={tagOptions}
        onClear={clearFilters}
        activeCount={activeFilterCount}
      />

      <div>
        {eventsInView.length > 0 ? (
          <div suppressHydrationWarning>
            {groupedEventEntries.map(([dayKey, groupEvents]) => (
              <div key={dayKey} className="mb-4">
                <div className="mb-2">
                  <div className="flex items-center text-left text-sm md:text-base font-bold text-text dark:text-glow uppercase tracking-wide">
                    <TbSlashes />
                    {formattedDate(`${dayKey}T00:00:00.000Z`, "eeee d")}
                  </div>
                </div>
                <div className="space-y-3">
                  {groupEvents.map((event: EventType) => (
                    <EventRow
                      data-testid="event-row"
                      event={event}
                      key={event.id}
                    />
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
                activeFilterCount > 0 ? "filtered-noevents-message" : undefined
              }
              className="text-center p-10 text-text dark:text-glow font-bold"
            >
              {emptyMessage}
            </p>
          </div>
        )}
      </div>

      {!selectedDate && (
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
