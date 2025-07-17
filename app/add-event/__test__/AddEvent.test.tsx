/* eslint-disable jest-dom/prefer-in-document */
import { render, screen, fireEvent } from "@testing-library/react";
import dotenv from "dotenv";
import AddEvent from "../page";

dotenv.config({ path: ".env.local" });

// Mock the useGlobalContext hook
jest.mock("../../../context/events.context.tsx", () => ({
  ...jest.requireActual("../../../context/events.context.tsx"),
  useGlobalContext: () => ({
    previewEvent: null,
    setPreviewEvent: jest.fn(),
    showModal: false,
    setShowModal: jest.fn(),
    uploadedPoster: null,
    setUploadedPoster: jest.fn(),
    tags: [],
    setTags: jest.fn(),
    supabase: {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          data: [],
          error: null,
        }),
      }),
      auth: {
        getSession: jest.fn().mockReturnValue({
          data: {
            session: {
              user: {
                email: "test@example.com",
              },
            },
          },
          error: null,
        }),
      },
    },
    createdBy: null,
    setCreatedBy: jest.fn(),
  }),
}));

describe("AddEvent component integration tests", () => {
  test("completes the full form flow successfully", async () => {
    render(<AddEvent />);

    // ===== STEP 1: Name and Description =====
    const nameInput = screen.getByPlaceholderText("nom");
    const descriptionInput = screen.getByPlaceholderText("descripció");

    // Set valid values for step 1 fields
    fireEvent.change(nameInput, { target: { value: "Complete Test Event" } });
    fireEvent.change(descriptionInput, {
      target: { value: "Complete Test Description" },
    });

    // Click the Next button to proceed to step 2
    fireEvent.click(screen.getByText("Següent"));

    // ===== STEP 2: Tags =====
    // Wait for step 2 to be visible
    const addTagButton = await screen.findByText("Afegir tag");

    // Add a tag
    const tagInput = screen.getByPlaceholderText("Màxim 3 tags");
    fireEvent.change(tagInput, { target: { value: "TestTag" } });
    fireEvent.click(addTagButton);

    // Click the Next button to proceed to step 3
    fireEvent.click(screen.getByText("Següent"));

    // ===== STEP 3: Details =====
    // Wait for step 3 to be visible
    const locationInput = await screen.findByPlaceholderText("ubicació");

    const priceInput = screen.getByPlaceholderText("preu");
    const linkInput = screen.getByPlaceholderText("link");

    // Set valid values for step 3 fields
    fireEvent.change(locationInput, {
      target: { value: "Complete Test Location" },
    });
    fireEvent.change(priceInput, { target: { value: "Free" } });
    fireEvent.change(linkInput, { target: { value: "https://test.com" } });

    // Click the Next button to proceed to step 4
    fireEvent.click(screen.getByText("Següent"));

    // ===== STEP 4: Poster (Optional) =====
    // Wait for step 4 to be visible
    await screen.findByText("Afegeix un pòster de l'esdeveniment");

    // Click the Preview button to trigger the preview modal
    // Poster is optional, so no validation error should occur
    fireEvent.click(screen.getByText("Preview"));

    // Test passes if we reach this point without errors
  });
});
