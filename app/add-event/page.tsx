"use client";

import { useGlobalContext } from "@/context/events.context";
import { EventFormErrors, EventFormType } from "@/lib/types";
import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn, eventSchema } from "@/lib/utils";
import DatePicker from "react-datepicker";
import { ca } from "date-fns/locale";
import { CldUploadWidget } from "next-cloudinary";
import { AnimatePresence } from "framer-motion";
import PreviewModal from "@/components/PreviewModal/PreviewModal";
import Image from "next/image";
import { toast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

/**
 * AddEvent component - Multi-step form for creating new events
 *
 * This component provides a step-by-step interface for users to create events
 * with validation at each step before proceeding to the next.
 */
export default function AddEvent() {
  // Step navigation state
  const [currentStep, setCurrentStep] = useState<string>("step1");

  // Form field states
  const [name, setName] = useState<string>("");
  const [nameLength, setNameLength] = useState<number>(0);
  const [description, setDescription] = useState<string>("");
  const [descriptionLength, setDescriptionLength] = useState<number>(0);
  const [inputTag, setInputTag] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const [price, setPrice] = useState<string>("");
  const [link, setLink] = useState<string>("");
  const [date, setDate] = useState<Date | null>(new Date());

  // Error handling states
  const [errors, setErrors] = useState<EventFormErrors>({});
  const [stepErrors, setStepErrors] = useState<{ [key: string]: string }>({});

  // User data states
  const [bannedUsers, setBannedUsers] = useState([]);

  const {
    setPreviewEvent,
    showModal,
    setShowModal,
    uploadedPoster,
    setUploadedPoster,
    tags,
    supabase,
    setTags,
    setCreatedBy,
    createdBy,
  } = useGlobalContext();

  /**
   * Fetch banned users from the database on component mount
   */
  useEffect(() => {
    const fetchBannedUsers = async () => {
      try {
        const { data, error } = await supabase.from("banned_users").select("*");

        if (error) {
          throw new Error(error.message);
        }
        // Process the fetched data here
        setBannedUsers(data as any);
      } catch (error) {
        console.error("Error fetching banned users:", error);
      }
    };

    fetchBannedUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Fetch user session to get the current user's email
   */
  useEffect(() => {
    async function fetchSession() {
      const session = await supabase.auth.getSession();

      if (session.data.session?.user.email) {
        setCreatedBy(session.data.session?.user.email);
      } else {
        setCreatedBy("unknown user");
      }
    }
    fetchSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Opens the preview modal after checking if the user is banned
   * If the user is banned, shows a toast notification with the reason
   * Otherwise, triggers form submission which handles validation and shows the modal
   */
  const openModal = async () => {
    const reasonIsBanned = isBannedUser(bannedUsers, createdBy);

    if (reasonIsBanned) {
      toast({
        style: {
          backgroundColor: "#fc0606",
          color: "#000000",
        },
        description: (
          <code className="text-black">{`usuari banejat\nmotiu: ${reasonIsBanned}. Contacta amb atbcnapp@gmail.com`}</code>
        ),
      });

      return;
    }

    // Trigger form submission which will handle validation and showing the modal
    handleSubmit(new Event("submit") as any);
  };

  /**
   * Checks if the current user is banned
   * @param bannedUsers - Array of banned users
   * @param createdBy - Email of the current user
   * @returns The reason for the ban if the user is banned, false otherwise
   */
  function isBannedUser(bannedUsers: any, createdBy: any) {
    for (let i = 0; i < bannedUsers.length; i++) {
      if (bannedUsers[i].mail === createdBy) {
        return bannedUsers[i].reason; // El usuario está baneado por este motivo
      }
    }
    return false; // El usuario no está baneado
  }

  /**
   * Handles form submission
   * Validates all steps before showing the preview modal
   * If validation fails, navigates to the first invalid step
   * @param e - Form submission event
   */
  const handleSubmit = async (e: any) => {
    e.preventDefault();

    // Validate all steps before showing the preview modal
    const step1Valid = await validateStep("step1");
    const step2Valid = await validateStep("step2");
    const step3Valid = await validateStep("step3");

    if (step1Valid && step2Valid && step3Valid) {
      // All steps are valid, show the preview modal
      const formattedDate = date ? date.toISOString() : null;
      const eventDetails = {
        name: name,
        description: description,
        tags: tags,
        location: location,
        price: price,
        date: formattedDate,
        link: link,
        poster: uploadedPoster,
        created_by: createdBy,
      };
      setPreviewEvent(eventDetails);
      setShowModal(true);
    } else {
      // If any step is invalid, navigate to the first invalid step
      if (!step1Valid) {
        setCurrentStep("step1");
      } else if (!step2Valid) {
        setCurrentStep("step2");
      } else if (!step3Valid) {
        setCurrentStep("step3");
      }
      setShowModal(false);
    }
  };

  /**
   * Validates the entire form using Yup schema
   * @param values - Form values to validate
   * @returns Object containing validation errors, if any
   */
  const validateForm = async (values: EventFormType) => {
    try {
      await eventSchema.validate(values, { abortEarly: false });
      return {};
    } catch (error: any) {
      const errors: EventFormErrors = {};
      let tagLength = 0;
      error.inner.forEach((e: any) => {
        if (
          e.path === "tags[0]" ||
          e.path === "tags[1]" ||
          e.path === "tags[2]"
        ) {
          tagLength++;
          if (tagLength === 1) {
            errors.tags = [e.message];
          }
        } else {
          errors[e.path] = e.message;
        }
      });
      return errors;
    }
  };

  const handleTagsChange = (e: any) => {
    const { value } = e.target;
    setInputTag(value);
  };

  const handleAddTag = (e: any) => {
    e.preventDefault();
    const trimmedInput = inputTag.trim();

    if (trimmedInput.length && !tags.includes(trimmedInput)) {
      setTags((prevState) => [...prevState, trimmedInput]);
      setInputTag("");
    }
  };

  const deleteTag = (index: number) => {
    setTags((prevState) => prevState.filter((tag, i) => i !== index));
  };

  // Define step fields mapping for validation
  const stepFieldsMap = {
    step1: ["name", "description"],
    step2: ["tags"],
    step3: ["location", "price", "link"],
  };

  /**
   * Validates a specific step in the form
   * @param step - The step identifier (step1, step2, step3)
   * @returns Promise<boolean> - Whether the step is valid
   */
  const validateStep = async (step: string): Promise<boolean> => {
    try {
      // Clear previous step errors
      setStepErrors({});

      // Get fields for current step
      const fields = stepFieldsMap[step as keyof typeof stepFieldsMap] || [];

      // Validate each field in the step
      for (const field of fields) {
        await eventSchema.validateAt(field, {
          name,
          description,
          tags,
          location,
          price,
          link,
          date,
        });
      }

      return true;
    } catch (error: any) {
      // Set field-specific error
      const errors: EventFormErrors = {};
      error.inner
        ? error.inner.forEach((e: any) => {
            errors[e.path] = e.message;
          })
        : (errors[error.path] = error.message);
      setErrors(errors);

      // Set step-specific error message
      setStepErrors((prev) => ({
        ...prev,
        [step]: error.message,
      }));

      // Show toast notification
      toast({
        style: {
          backgroundColor: "#fc0606",
          color: "#000000",
        },
        description: <code className="text-black">{error.message}</code>,
      });

      return false;
    }
  };

  // Define step sequence for navigation
  const stepSequence = ["step1", "step2", "step3", "step4"];

  /**
   * Navigate to the next step in the form
   * Validates the current step before proceeding
   */
  const goToNextStep = async () => {
    const currentIndex = stepSequence.indexOf(currentStep);

    // Handle final step (preview)
    if (currentStep === "step4") {
      // Validate all previous steps before showing the preview modal
      const step1Valid = await validateStep("step1");
      const step2Valid = await validateStep("step2");
      const step3Valid = await validateStep("step3");

      // Poster is optional, no validation needed

      if (step1Valid && step2Valid && step3Valid) {
        // All steps are valid, show the preview modal
        const formattedDate = date ? date.toISOString() : null;
        const eventDetails = {
          name,
          description,
          tags,
          location,
          price,
          date: formattedDate,
          link,
          poster: uploadedPoster,
          created_by: createdBy,
        };
        setPreviewEvent(eventDetails);
        setShowModal(true);
      } else {
        // Navigate to the first invalid step
        if (!step1Valid) {
          setCurrentStep("step1");
        } else if (!step2Valid) {
          setCurrentStep("step2");
        } else if (!step3Valid) {
          setCurrentStep("step3");
        }
      }
      return;
    }

    // For other steps, validate current step before proceeding
    if (await validateStep(currentStep)) {
      const nextStep = stepSequence[currentIndex + 1];
      if (nextStep) {
        setCurrentStep(nextStep);
      }
    }
  };

  /**
   * Navigate to the previous step in the form
   */
  const goToPreviousStep = () => {
    const currentIndex = stepSequence.indexOf(currentStep);
    const prevStep = stepSequence[currentIndex - 1];

    if (prevStep) {
      setCurrentStep(prevStep);
    }
  };

  return (
    <div className="flex items-center justify-center pb-20">
      <div className="w-full max-w-md">
        <form
          onSubmit={handleSubmit}
          className="bg-background text-text p-8 rounded-md dark:bg-black dark:border dark:border-glow"
        >
          <div className="mb-6" aria-live="polite">
            {/* Step information mapping */}
            {(() => {
              const stepInfo = {
                step1: { number: "1", title: "Nom i descripció", progress: 25 },
                step2: { number: "2", title: "Tags", progress: 50 },
                step3: {
                  number: "3",
                  title: "Ubicació, preu, data i enllaç",
                  progress: 75,
                },
                step4: { number: "4", title: "Pòster", progress: 100 },
              };
              const info = stepInfo[currentStep as keyof typeof stepInfo];

              return (
                <>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">
                      Pas {info.number} de 4
                    </span>
                    <span className="text-sm font-medium">{info.title}</span>
                  </div>
                  <div
                    className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700"
                    role="progressbar"
                    aria-valuenow={info.progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className="bg-card dark:bg-glow h-2.5 rounded-full"
                      style={{ width: `${info.progress}%` }}
                    ></div>
                  </div>
                </>
              );
            })()}

            {/* Error message display */}
            {stepErrors[currentStep] && (
              <div
                className="mt-2 p-2 bg-red-100 border border-red-400 text-red-700 rounded"
                role="alert"
              >
                <p className="text-sm">{stepErrors[currentStep]}</p>
              </div>
            )}
          </div>

          <Tabs
            value={currentStep}
            onValueChange={setCurrentStep}
            className="w-full"
          >
            <TabsList className="grid grid-cols-4 mb-8 w-full">
              <TabsTrigger value="step1" disabled={currentStep !== "step1"}>
                Nom
              </TabsTrigger>
              <TabsTrigger value="step2" disabled={currentStep !== "step2"}>
                Tags
              </TabsTrigger>
              <TabsTrigger value="step3" disabled={currentStep !== "step3"}>
                Detalls
              </TabsTrigger>
              <TabsTrigger value="step4" disabled={currentStep !== "step4"}>
                Pòster
              </TabsTrigger>
            </TabsList>

            <TabsContent value="step1" className="space-y-4">
              <div className="mb-4">
                <Input
                  data-testid="event-name"
                  type="text"
                  placeholder="nom"
                  id="name"
                  className="w-full border border-primary dark:border-glow p-2 rounded-md"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setNameLength(e.target.value.length);
                  }}
                />
                {(errors as EventFormErrors).name && (
                  <span className="text-red-500 font-bold italic text-xs">
                    {(errors as EventFormErrors).name}
                  </span>
                )}
                <span className="block text-right text-gray-400 text-xs">
                  {nameLength}/50
                </span>
                {(errors as EventFormErrors).name && (
                  <span className="text-red-500 font-bold italic text-xs">
                    {(errors as EventFormErrors).name}
                  </span>
                )}
              </div>

              <div className="mb-4">
                <Textarea
                  data-testid="event-description"
                  id="description"
                  placeholder="descripció"
                  className="w-full border border-primary dark:border-glow p-2 rounded-md"
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    setDescriptionLength(e.target.value.length);
                  }}
                />
                {(errors as EventFormErrors).description && (
                  <span className="text-red-500 font-bold italic text-xs">
                    {(errors as EventFormErrors).description}
                  </span>
                )}
                <span className="block text-right text-gray-400 text-xs">
                  {descriptionLength}/150
                </span>
              </div>

              <div className="flex justify-end mt-6">
                <Button
                  type="button"
                  onClick={goToNextStep}
                  className="bg-card dark:bg-glow text-black dark:text-black font-bold p-2 px-4 rounded"
                >
                  Següent
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="step2" className="space-y-4">
              <div className="flex flex-col justify-center mb-4">
                <div className="flex flex-wrap items-start min-h-12 w-100 px-2 border border-primary dark:border-glow rounded-md font-thin">
                  <ul className="flex flex-wrap p-0 mt-8">
                    {tags?.map((tag, index) => (
                      <li
                        key={index}
                        data-testid="event-tags"
                        className="inline-flex items-center justify-center h-8 px-3 text-sm font-medium text-white dark:text-glow dark:border dark:border-glow bg-gray-800 dark:bg-black rounded-md mr-2 mb-2"
                      >
                        <span className="mb-1">{tag}</span>
                        <span
                          onClick={() => deleteTag(index)}
                          className="block w-4 h-4 leading-4 text-center text-xs text-gray-800 bg-white dark:text-glow dark:bg-black dark:border dark:border-glow rounded-full cursor-pointer ml-2"
                        >
                          X
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Input
                    value={inputTag}
                    placeholder="Màxim 3 tags"
                    onChange={handleTagsChange}
                    className="w-full min-w-1/2 border-none rounded-md py-4 px-2 mb-2 mt-2"
                  />
                  <button
                    onClick={handleAddTag}
                    className="bg-card dark:bg-glow text-black dark:text-black font-bold p-2 px-4 rounded ml-auto mb-2"
                  >
                    Afegir tag
                  </button>
                </div>
                {(errors as EventFormErrors).tags && (
                  <span className="text-red-500 font-bold italic text-xs">
                    {(errors as EventFormErrors).tags}
                  </span>
                )}
              </div>

              <div className="flex justify-between mt-6">
                <Button
                  type="button"
                  onClick={goToPreviousStep}
                  className="bg-card dark:bg-glow text-black dark:text-black font-bold p-2 px-4 rounded"
                >
                  Anterior
                </Button>
                <Button
                  type="button"
                  onClick={goToNextStep}
                  className="bg-card dark:bg-glow text-black dark:text-black font-bold p-2 px-4 rounded"
                >
                  Següent
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="step3" className="space-y-4">
              <div className="mb-4">
                <Input
                  data-testid="event-location"
                  type="text"
                  placeholder="ubicació"
                  id="location"
                  className="w-full border border-primary dark:border-glow p-2 rounded-md"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
                {(errors as EventFormErrors).location && (
                  <span className="text-red-500 font-bold italic text-xs">
                    {(errors as EventFormErrors).location}
                  </span>
                )}
              </div>
              <div className="flex mb-4 gap-4">
                <div className="w-1/2 text-left">
                  <div>
                    <Input
                      data-testid="event-price"
                      type="text"
                      placeholder="preu"
                      id="price"
                      className="w-full border border-primary dark:border-glow p-2 rounded-md"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                    />
                  </div>

                  {(errors as EventFormErrors).price && (
                    <span className="text-red-500 font-bold italic text-xs">
                      {(errors as EventFormErrors).price}
                    </span>
                  )}
                </div>

                <div className="flex w-1/2 text-right">
                  <DatePicker
                    data-testid="event-date"
                    className="w-full border border-primary dark:border-glow p-2 rounded-md"
                    minDate={new Date()}
                    showTimeSelect
                    selected={date}
                    onChange={(date) => setDate(date)}
                    timeFormat="HH:mm"
                    timeIntervals={15}
                    dateFormat="dd/MM/yy HH:mm"
                    locale={ca}
                    placeholderText="Seleccionar data"
                  />
                </div>
              </div>

              <div className="mb-4 mt-2">
                <Input
                  data-testid="event-link"
                  type="text"
                  placeholder="link"
                  id="link"
                  className="w-full border border-primary dark:border-glow p-2 rounded-md"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                />
                {(errors as EventFormErrors).link && (
                  <span className="text-red-500 font-bold italic text-xs">
                    {(errors as EventFormErrors).link}
                  </span>
                )}
              </div>

              <div className="flex justify-between mt-6">
                <Button
                  type="button"
                  onClick={goToPreviousStep}
                  className="bg-card dark:bg-glow text-black dark:text-black font-bold p-2 px-4 rounded"
                >
                  Anterior
                </Button>
                <Button
                  type="button"
                  onClick={goToNextStep}
                  className="bg-card dark:bg-glow text-black dark:text-black font-bold p-2 px-4 rounded"
                >
                  Següent
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="step4" className="space-y-4">
              <div className="w-full border border-primary dark:border-glow p-2 rounded-md text-center bg-card dark:bg-glow text-black dark:text-black font-bold">
                {uploadedPoster && (
                  <Image
                    alt="preview"
                    className="uploaded"
                    src={uploadedPoster}
                    width={200}
                    height={250}
                  />
                )}
                {uploadedPoster ? null : (
                  <CldUploadWidget
                    options={{
                      sources: ["local"],
                      clientAllowedFormats: [
                        "jpg",
                        "png",
                        "gif",
                        "bmp",
                        "svg",
                        "webp",
                      ],
                    }}
                    uploadPreset="atbcnposter"
                    onSuccess={(result, { widget }) => {
                      if (
                        typeof result?.info === "object" &&
                        result?.info !== null
                      ) {
                        setUploadedPoster(result?.info?.secure_url);
                      }
                      widget.close();
                    }}
                  >
                    {({ open }) => {
                      function handleOnClick() {
                        open();
                      }
                      return (
                        <button onClick={handleOnClick}>
                          Afegeix un pòster de l&apos;esdeveniment
                        </button>
                      );
                    }}
                  </CldUploadWidget>
                )}
              </div>

              <div className="flex justify-between mt-6">
                <Button
                  type="button"
                  onClick={goToPreviousStep}
                  className="bg-card dark:bg-glow text-black dark:text-black font-bold p-2 px-4 rounded"
                >
                  Anterior
                </Button>
                <Button
                  data-testid="preview-button"
                  type="button"
                  className="bg-card dark:bg-glow text-black dark:text-black font-bold p-2 px-4 rounded"
                  onClick={goToNextStep}
                >
                  Preview
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </form>
      </div>
      <AnimatePresence initial={false} mode="wait" onExitComplete={() => null}>
        {showModal && Object.keys(errors).length === 0 && (
          <PreviewModal data-testid="preview-modal" />
        )}
      </AnimatePresence>
    </div>
  );
}
