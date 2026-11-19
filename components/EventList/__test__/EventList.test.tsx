import { advanceTo, clear } from "jest-date-mock";
import { render, screen, fireEvent } from "@testing-library/react";
import EventList from "../EventList";
import { formattedDate } from "@/lib/utils";
import { EventType } from "@/lib/types";

const makeEvent = (
  id: string,
  date: string,
  location: string,
  tags: string[] = [],
): EventType => ({
  id,
  name: `Event ${id}`,
  date,
  location,
  tags,
  price: "Free",
  description: null,
  address: null,
  map_link: null,
  link: null,
  poster: null,
  validated: true,
  completed: true,
  created_at: "2024-01-01T00:00:00.000Z",
  created_by: "test",
});

const openFilters = () => fireEvent.click(screen.getByTestId("filters-toggle"));

describe("unit tests of the EventList component", () => {
  beforeEach(() => {
    // Set the date to a specific date before each test.
    advanceTo(new Date(2024, 1, 1));
  });

  afterEach(() => {
    // Clear the mocked date after each test.
    clear();
  });

  test("renders only events for the current week", () => {
    // Arrange: 3 events from this simulated current week and 1 from other month.
    const events = [
      { id: "1", date: "2024-02-01T00:00:00.000Z" },
      { id: "2", date: "2024-02-01T00:00:00.000Z" },
      { id: "3", date: "2024-02-01T00:00:00.000Z" },
      { id: "4", date: "2024-03-01T00:00:00.000Z" },
    ];
    // Act: Render the component with the events.
    render(<EventList events={events} />);

    // Assert: Check that only the events for the current week are rendered.
    const eventRows = screen.getAllByTestId("event-row");
    expect(eventRows).toHaveLength(3);
  });

  test("renders date separators for grouped events", () => {
    const events = [
      { id: "1", date: "2024-02-01T10:00:00.000Z" },
      { id: "2", date: "2024-02-01T15:00:00.000Z" },
      { id: "3", date: "2024-02-02T10:00:00.000Z" },
    ];

    render(<EventList events={events} />);

    const firstDateLabel = formattedDate("2024-02-01T00:00:00.000Z", "eeee d");
    const secondDateLabel = formattedDate("2024-02-02T00:00:00.000Z", "eeee d");

    expect(screen.getByText(firstDateLabel)).toBeInTheDocument();
    expect(screen.getByText(secondDateLabel)).toBeInTheDocument();
    const eventRows = screen.getAllByTestId("event-row");
    expect(eventRows).toHaveLength(3);
  });

  test("navigates to the next and previous weeks", () => {
    // Arrange
    const events = [
      { id: "1", date: "2024-01-28T00:00:00.000Z" }, // An event from the last week of January 2024
      { id: "2", date: "2024-02-01T00:00:00.000Z" }, // An event from the first week of February 2024
      { id: "3", date: "2024-02-08T00:00:00.000Z" }, // An event from the second week of February 2024
    ];

    render(<EventList events={events} />);

    // Assert: Check that only the events for the first week are initially rendered.
    let eventRows = screen.getAllByTestId("event-row");
    expect(eventRows).toHaveLength(1); // Adjust this number based on the number of events for the first week.

    // Act: Click the next week button.
    const nextWeekButton = screen.getByTestId("next-week-button");
    fireEvent.click(nextWeekButton);

    // Assert: Check that only the events for the second week are now rendered.
    eventRows = screen.getAllByTestId("event-row");
    expect(eventRows).toHaveLength(1); // Adjust this number based on the number of events for the second week.

    // Act: Click the previous week button.
    const previousWeekButton = screen.getByTestId("previous-week-button");
    fireEvent.click(previousWeekButton);

    // Assert: Check that only the events for the first week are rendered again.
    eventRows = screen.getAllByTestId("event-row");
    expect(eventRows).toHaveLength(1); // Adjust this number based on the number of events for the first week.
  });

  test("renders events for the current week or a message if there are no events", () => {
    // Arrange: set of events for the current week.
    const events = [
      { id: "1", date: "2024-02-01T00:00:00.000Z" },
      { id: "2", date: "2024-02-01T00:00:00.000Z" },
      { id: "3", date: "2024-02-01T00:00:00.000Z" },
    ];

    // Act: Render the component with the events.
    render(<EventList events={events} />);

    // Assert: Check that the correct number of EventRow components are rendered.
    const eventRows = screen.getAllByTestId("event-row");
    expect(eventRows).toHaveLength(events.length);

    // Arrange: Empty set of events.
    const noEvents: never[] = [];

    // Act: Render the component with no events.
    render(<EventList events={noEvents} />);

    // Assert: Check that the correct message is rendered.
    const message = screen.getByText(
      "No hi ha esdeveniments introduïts per a aquesta setmana",
    );
    expect(message).toBeInTheDocument();
  });

  test("keeps filters collapsed until the button is clicked", () => {
    render(<EventList events={[]} />);

    expect(screen.queryByTestId("filters-panel")).not.toBeInTheDocument();

    openFilters();

    expect(screen.getByTestId("filters-panel")).toBeInTheDocument();
  });

  test("filters by venue with partial and accent-insensitive matching", () => {
    const events = [
      makeEvent("1", "2024-02-01T20:00:00.000Z", "Sala Vol"),
      makeEvent("2", "2024-02-01T21:00:00.000Z", "La Deskomunal"),
    ];

    render(<EventList events={events} />);
    openFilters();
    fireEvent.change(screen.getByTestId("filter-location"), {
      target: { value: "vol" },
    });

    expect(screen.getAllByTestId("event-row")).toHaveLength(1);
    expect(screen.getByText("Event 1")).toBeInTheDocument();
  });

  test("filters by tag with several tags selected and unifies case variants", () => {
    const events = [
      makeEvent("1", "2024-02-01T20:00:00.000Z", "Sala Vol", ["indie"]),
      makeEvent("2", "2024-02-01T21:00:00.000Z", "La Deskomunal", ["INDIE"]),
      makeEvent("3", "2024-02-01T22:00:00.000Z", "Sala Vol", ["jazz"]),
    ];

    render(<EventList events={events} />);
    openFilters();
    fireEvent.click(screen.getByTestId("filter-tag-indie"));

    expect(screen.getAllByTestId("event-row")).toHaveLength(2);

    fireEvent.click(screen.getByTestId("filter-tag-jazz"));

    expect(screen.getAllByTestId("event-row")).toHaveLength(3);
  });

  test("jumps to a single day and returns to the week view", () => {
    const events = [
      makeEvent("1", "2024-02-01T20:00:00.000Z", "Sala Vol", ["indie"]),
      makeEvent("2", "2024-02-08T20:00:00.000Z", "La Deskomunal", ["jazz"]),
    ];

    render(<EventList events={events} />);
    expect(screen.getAllByTestId("event-row")).toHaveLength(1);

    openFilters();
    fireEvent.change(screen.getByTestId("filter-date"), {
      target: { value: "2024-02-08" },
    });

    expect(screen.getAllByTestId("event-row")).toHaveLength(1);
    expect(screen.getByText("Event 2")).toBeInTheDocument();
    expect(screen.queryByTestId("next-week-button")).not.toBeInTheDocument();
    expect(screen.getByTestId("back-to-week")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("back-to-week"));

    expect(screen.getAllByTestId("event-row")).toHaveLength(1);
    expect(screen.getByTestId("next-week-button")).toBeInTheDocument();
    expect(screen.queryByTestId("back-to-week")).not.toBeInTheDocument();
  });

  test("combines venue and tag filters and clears them all", () => {
    const events = [
      makeEvent("1", "2024-02-01T20:00:00.000Z", "Sala Vol", ["indie"]),
      makeEvent("2", "2024-02-01T21:00:00.000Z", "Sala Vol", ["jazz"]),
      makeEvent("3", "2024-02-01T22:00:00.000Z", "La Deskomunal", ["indie"]),
    ];

    render(<EventList events={events} />);
    openFilters();
    fireEvent.change(screen.getByTestId("filter-location"), {
      target: { value: "vol" },
    });
    fireEvent.click(screen.getByTestId("filter-tag-indie"));

    expect(screen.getAllByTestId("event-row")).toHaveLength(1);
    expect(screen.getByTestId("filters-active-count")).toHaveTextContent("2");

    fireEvent.click(screen.getByTestId("clear-filters"));

    expect(screen.getAllByTestId("event-row")).toHaveLength(3);
    expect(
      screen.queryByTestId("filters-active-count"),
    ).not.toBeInTheDocument();
  });

  test("shows a specific message when filters return no results", () => {
    render(
      <EventList
        events={[makeEvent("1", "2024-02-01T20:00:00.000Z", "Sala Vol")]}
      />,
    );
    openFilters();
    fireEvent.change(screen.getByTestId("filter-location"), {
      target: { value: "inexistent" },
    });

    expect(screen.getByTestId("filtered-noevents-message")).toHaveTextContent(
      "No hi ha esdeveniments que coincideixin amb els filtres",
    );
  });
});
