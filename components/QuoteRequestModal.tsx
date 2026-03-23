"use client";

import {
  type CSSProperties,
  type FormEvent,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { gsap } from "gsap";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Home,
  LoaderCircle,
  Mail,
  MessageSquare,
  Phone,
  User2,
  X,
} from "lucide-react";
import {
  apartmentTypes,
  budgetRanges,
  contactFieldSchemas,
  quoteRequestSchema,
  moveInOptions,
  type QuoteRequestPayload,
} from "@/lib/contact-schema";
import { cn } from "@/lib/utils";

type QuoteRequestModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

type FormState = QuoteRequestPayload;
type FieldName = keyof FormState;
type FieldErrors = Partial<Record<FieldName, string>>;

const formSteps = [
  {
    eyebrow: "Step 1",
    title: "Identity",
    description: "Share your contact details so our team can tailor the conversation.",
  },
  {
    eyebrow: "Step 2",
    title: "Preferences",
    description: "Tell us what kind of home and budget range you want to explore.",
  },
  {
    eyebrow: "Step 3",
    title: "Confirm",
    description: "Add any final notes, review your selections, and send the request.",
  },
] as const;

const initialFormState: FormState = {
  fullName: "",
  email: "",
  phone: "",
  apartmentType: "2 BHK",
  budget: "1.2Cr - 1.8Cr",
  moveInTimeline: "Within 6 months",
  siteVisitDate: "",
  message: "",
  consent: true,
};

const cursorGlowDefaults: CSSProperties = {
  ["--glow-x" as string]: "50%",
  ["--glow-y" as string]: "50%",
  ["--glow-opacity" as string]: "0",
} as CSSProperties;

const fieldsByStep: FieldName[][] = [
  ["fullName", "email", "phone", "siteVisitDate"],
  ["apartmentType", "budget", "moveInTimeline"],
  ["message", "consent"],
];

export default function QuoteRequestModal({
  isOpen,
  onClose,
}: QuoteRequestModalProps) {
  const modalRef = useRef<HTMLDivElement | null>(null);
  const submitButtonRef = useRef<HTMLButtonElement | null>(null);
  const submitIntentRef = useRef(false);
  const [form, setForm] = useState<FormState>(initialFormState);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [submitState, setSubmitState] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [feedbackMessage, setFeedbackMessage] = useState("");

  const minVisitDate = useMemo(() => {
    return new Date().toISOString().split("T")[0];
  }, []);

  const isFormComplete = quoteRequestSchema.safeParse(form).success;

  const progressValue = ((currentStep + 1) / formSteps.length) * 100;

  useEffect(() => {
    if (!isOpen) {
      submitIntentRef.current = false;
      setCurrentStep(0);
      setFieldErrors({});
      setSubmitState("idle");
      setFeedbackMessage("");
      setForm(initialFormState);
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    const context = gsap.context(() => {
      gsap.fromTo(
        "[data-quote-glow]",
        { opacity: 0, scale: 0.9 },
        {
          opacity: 1,
          scale: 1,
          duration: 1.2,
          ease: "power3.out",
          stagger: 0.08,
        },
      );

      gsap.fromTo(
        "[data-quote-item]",
        { opacity: 0, y: 24 },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          ease: "power3.out",
          stagger: 0.05,
          delay: 0.05,
        },
      );
    }, modalRef);

    return () => context.revert();
  }, [currentStep, isOpen, submitState]);

  useEffect(() => {
    if (!isOpen || !submitButtonRef.current) return;

    const button = submitButtonRef.current;

    const onPointerMove = (event: MouseEvent) => {
      const bounds = button.getBoundingClientRect();
      const offsetX = event.clientX - (bounds.left + bounds.width / 2);
      const offsetY = event.clientY - (bounds.top + bounds.height / 2);

      gsap.to(button, {
        x: offsetX * 0.06,
        y: offsetY * 0.08,
        duration: 0.25,
        ease: "power2.out",
      });
    };

    const onPointerLeave = () => {
      gsap.to(button, {
        x: 0,
        y: 0,
        duration: 0.35,
        ease: "power3.out",
      });
    };

    button.addEventListener("mousemove", onPointerMove);
    button.addEventListener("mouseleave", onPointerLeave);

    return () => {
      button.removeEventListener("mousemove", onPointerMove);
      button.removeEventListener("mouseleave", onPointerLeave);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    const root = modalRef.current;
    const targets = Array.from(
      root.querySelectorAll<HTMLElement>("[data-cursor-glow]"),
    );
    const radius = 180;

    const updateGlow = (clientX: number, clientY: number) => {
      targets.forEach((element) => {
        const rect = element.getBoundingClientRect();
        const nearestX = Math.max(rect.left, Math.min(clientX, rect.right));
        const nearestY = Math.max(rect.top, Math.min(clientY, rect.bottom));
        const dx = clientX - nearestX;
        const dy = clientY - nearestY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const strength = Math.max(0, 1 - distance / radius);

        element.style.setProperty("--glow-x", `${clientX - rect.left}px`);
        element.style.setProperty("--glow-y", `${clientY - rect.top}px`);
        element.style.setProperty("--glow-opacity", strength.toFixed(3));
      });
    };

    const clearGlow = () => {
      targets.forEach((element) => {
        element.style.setProperty("--glow-opacity", "0");
      });
    };

    const onPointerMove = (event: PointerEvent) => {
      updateGlow(event.clientX, event.clientY);
    };

    root.addEventListener("pointermove", onPointerMove);
    root.addEventListener("pointerleave", clearGlow);

    return () => {
      root.removeEventListener("pointermove", onPointerMove);
      root.removeEventListener("pointerleave", clearGlow);
      clearGlow();
    };
  }, [isOpen]);

  const setFieldError = (field: FieldName, message?: string) => {
    setFieldErrors((current) => ({
      ...current,
      [field]: message,
    }));
  };

  const validateField = <K extends FieldName>(
    field: K,
    value: FormState[K] = form[field],
  ) => {
    const result = contactFieldSchemas[field].safeParse(value);
    setFieldError(field, result.success ? undefined : result.error.issues[0]?.message);
    return result.success;
  };

  const validateFields = (fields: FieldName[]) => {
    const nextErrors: FieldErrors = {};
    const clearedErrors = Object.fromEntries(
      fields.map((field) => [field, undefined]),
    ) as FieldErrors;
    let isValid = true;

    for (const field of fields) {
      const result = contactFieldSchemas[field].safeParse(form[field]);

      if (!result.success) {
        isValid = false;
        nextErrors[field] = result.error.issues[0]?.message;
      }
    }

    setFieldErrors((current) => ({
      ...current,
      ...clearedErrors,
      ...nextErrors,
    }));

    return {
      isValid,
      firstError: Object.values(nextErrors)[0],
    };
  };

  const handleFieldBlur =
    <K extends FieldName>(field: K) =>
    () => {
      validateField(field);
    };

  const updateForm = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));

    if (fieldErrors[key]) {
      void validateField(key, value);
    } else if (submitState === "error") {
      setFieldError(key, undefined);
    }

    if (submitState === "error") {
      setSubmitState("idle");
      setFeedbackMessage("");
    }
  };

  const handleClose = () => {
    if (submitState !== "submitting") onClose();
  };

  const validateStep = (step: number) => {
    const { isValid, firstError } = validateFields(fieldsByStep[step] ?? []);

    if (!isValid) {
      setSubmitState("error");
      setFeedbackMessage(firstError || "Please review the highlighted fields.");
      return false;
    }

    return true;
  };

  const goToStep = (step: number) => {
    if (submitState === "submitting") return;
    submitIntentRef.current = false;
    setFeedbackMessage("");
    setSubmitState("idle");
    setCurrentStep(step);
  };

  const handleNextStep = () => {
    if (!validateStep(currentStep)) return;
    goToStep(Math.min(currentStep + 1, formSteps.length - 1));
  };

  const handlePreviousStep = () => {
    goToStep(Math.max(currentStep - 1, 0));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const isFinalStep = currentStep === formSteps.length - 1;
    const hasSubmitIntent = submitIntentRef.current;
    submitIntentRef.current = false;

    if (!isFinalStep || !hasSubmitIntent) {
      return;
    }

    const submissionCheck = quoteRequestSchema.safeParse(form);

    if (!submissionCheck.success) {
      const nextErrors: FieldErrors = {};

      for (const issue of submissionCheck.error.issues) {
        const field = issue.path[0];

        if (typeof field === "string" && !(field in nextErrors)) {
          nextErrors[field as FieldName] = issue.message;
        }
      }

      setFieldErrors((current) => ({
        ...current,
        ...nextErrors,
      }));
      setSubmitState("error");
      setFeedbackMessage(
        Object.values(nextErrors)[0] || "Please review the highlighted fields.",
      );
      return;
    }

    try {
      setSubmitState("submitting");
      setFeedbackMessage("");

      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const result = (await response.json()) as {
        message?: string;
        errors?: Partial<Record<FieldName, string[]>>;
      };

      if (!response.ok) {
        if (result.errors) {
          const nextErrors: FieldErrors = {};

          for (const [field, messages] of Object.entries(result.errors)) {
            if (messages?.[0]) {
              nextErrors[field as FieldName] = messages[0];
            }
          }

          setFieldErrors((current) => ({
            ...current,
            ...nextErrors,
          }));
        }

        throw new Error(result.message || "Unable to send your request right now.");
      }

      setSubmitState("success");
      setFeedbackMessage("Our sales team has your request and will contact you shortly.");
      setForm(initialFormState);
      setCurrentStep(0);
      submitIntentRef.current = false;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Something went wrong while sending your request.";
      setSubmitState("error");
      setFeedbackMessage(message);
    }
  };

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className="fixed inset-0 z-120 flex items-center justify-center p-3 sm:p-5 lg:p-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.button
            type="button"
            aria-label="Close quote request popup"
            className="absolute inset-0 bg-[rgba(4,6,10,0.78)] backdrop-blur-[14px]"
            onClick={handleClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="quote-modal-title"
            initial={{ opacity: 0, scale: 0.96, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 20 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 grid w-full max-w-295 overflow-hidden rounded-[30px] border border-white/10 bg-[#08090c]/95 text-white shadow-[0_30px_120px_rgba(0,0,0,0.55)] backdrop-blur-2xl lg:max-h-[90vh] lg:grid-cols-[minmax(280px,0.72fr)_minmax(0,1fr)]"
          >
            <div className="relative h-55 overflow-hidden border-b border-white/10 bg-[#0b0d12] lg:h-auto lg:min-h-full lg:border-b-0 lg:border-r">
              <div
                data-quote-glow
                className="absolute -left-14 top-8 h-56 w-56 rounded-full bg-[#c9a96b]/18 blur-3xl"
              />
              <div
                data-quote-glow
                className="absolute -right-5 top-1/4 h-64 w-64 rounded-full bg-white/8 blur-3xl"
              />
              <div
                data-quote-glow
                className="absolute -bottom-7.5 left-1/3 h-52 w-52 rounded-full bg-[#b08d57]/18 blur-3xl"
              />

              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_36%),linear-gradient(180deg,rgba(8,9,12,0.06),rgba(8,9,12,0.62)_54%,rgba(8,9,12,0.96))]" />

              <div data-quote-item className="absolute inset-0 opacity-90">
                <Image
                  src="/Road night view.webp"
                  alt="Form Left Image - Trifecta"
                  fill
                  className="object-cover object-right"
                  sizes="(max-width: 1024px) 100vw, 38vw"
                />
              </div>

            </div>

            <div className="relative flex h-full flex-col overflow-y-auto bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))]">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(201,169,107,0.12),transparent_26%)]" />

              <button
                type="button"
                onClick={handleClose}
                className="absolute right-5 top-5 z-20 rounded-full border border-white/10 bg-white/5 p-2.5 text-white/70 transition hover:bg-white/9 hover:text-white"
                aria-label="Close quote popup"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="relative z-10 flex h-full flex-col px-6 py-6 sm:px-7 lg:px-8">
                {submitState === "success" ? (
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-1 flex-col items-center justify-center px-6 text-center"
                  >
                    <div className="rounded-full border border-[#d6bc88]/30 bg-[#d6bc88]/12 p-4 text-[#e7d2a7]">
                      <CheckCircle2 className="h-10 w-10" />
                    </div>

                    <h3 className="mt-6 font-(--font-sora) text-3xl text-white">
                      Request received
                    </h3>

                    <p className="mt-3 max-w-md text-sm leading-7 text-white/60">
                      {feedbackMessage}
                    </p>

                    <button
                      type="button"
                      onClick={handleClose}
                      className="mt-8 rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-white transition hover:bg-white/8"
                    >
                      Close Form
                    </button>
                  </motion.div>
                ) : (
                  <>
                    <div data-quote-item className="pr-14">
                      <div className="text-[11px] uppercase tracking-[0.26em] text-[#d6bc88]">
                        Request a Quote
                      </div>
                      <p
                        id="quote-modal-title"
                        className="mt-3 font-(--font-sora)text-[1.7rem]  leading-[1.08] text-white"
                      >
                        Quick quote request
                      </p>
                      <p className="mt-2 max-w-2xl text-[14px] leading-7 text-white/60">
                        Complete the form in a few short steps.
                      </p>
                    </div>

                    <div data-quote-item className="mt-5 text-sm text-white/62">
                      {Math.round(progressValue)}% completed
                    </div>

                    <div
                      data-quote-item
                      className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/8"
                    >
                      <motion.div
                        className="h-full rounded-full bg-[linear-gradient(90deg,#f2dfb3_0%,#caa164_55%,#f1ddaf_100%)]"
                        initial={false}
                        animate={{ width: `${progressValue}%` }}
                        transition={{ duration: 0.35, ease: "easeOut" }}
                      />
                    </div>

                    {feedbackMessage ? (
                      <div
                        data-quote-item
                        className={cn(
                          "mt-4 rounded-[18px] border px-4 py-3 text-sm",
                          submitState === "error"
                            ? "border-rose-400/20 bg-rose-400/10 text-rose-200"
                            : "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
                        )}
                      >
                        {feedbackMessage}
                      </div>
                    ) : null}

                    <form
                      onSubmit={handleSubmit}
                      className="mt-5 flex min-h-0 flex-1 flex-col"
                    >

                      <div className="min-h-0 flex-1">
                        <div className="relative flex flex-col rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.18)] sm:p-6">
                          <div className="min-h-0 flex-1">
                            <AnimatePresence mode="wait">
                              <motion.div
                                key={currentStep}
                                initial={{ opacity: 0, x: 18 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -18 }}
                                transition={{ duration: 0.22, ease: "easeOut" }}
                                className="h-full"
                              >
                                {currentStep === 0 ? (
                                  <div className="grid h-full gap-4 md:grid-cols-2">
                                    <FormField
                                      data-quote-item
                                      error={fieldErrors.fullName}
                                      icon={<User2 className="h-4 w-4" />}
                                      label="Full Name"
                                    >
                                      <LuxuryInput
                                        invalid={Boolean(fieldErrors.fullName)}
                                        onBlur={handleFieldBlur("fullName")}
                                        value={form.fullName}
                                        onChange={(event) => updateForm("fullName", event.target.value)}
                                        placeholder="Enter your full name"
                                      />
                                    </FormField>

                                    <FormField
                                      data-quote-item
                                      error={fieldErrors.phone}
                                      icon={<Phone className="h-4 w-4" />}
                                      label="Phone Number"
                                    >
                                      <LuxuryInput
                                        invalid={Boolean(fieldErrors.phone)}
                                        onBlur={handleFieldBlur("phone")}
                                        value={form.phone}
                                        onChange={(event) => updateForm("phone", event.target.value)}
                                        placeholder="+91 98765 43210"
                                        type="tel"
                                      />
                                    </FormField>

                                    <FormField
                                      data-quote-item
                                      error={fieldErrors.email}
                                      icon={<Mail className="h-4 w-4" />}
                                      label="Email Address"
                                    >
                                      <LuxuryInput
                                        invalid={Boolean(fieldErrors.email)}
                                        onBlur={handleFieldBlur("email")}
                                        value={form.email}
                                        onChange={(event) => updateForm("email", event.target.value)}
                                        placeholder="you@example.com"
                                        type="email"
                                      />
                                    </FormField>

                                    <FormField
                                      data-quote-item
                                      error={fieldErrors.siteVisitDate}
                                      icon={<CalendarDays className="h-4 w-4" />}
                                      label="Site Visit"
                                    >
                                      <LuxuryInput
                                        invalid={Boolean(fieldErrors.siteVisitDate)}
                                        onBlur={handleFieldBlur("siteVisitDate")}
                                        min={minVisitDate}
                                        type="date"
                                        value={form.siteVisitDate}
                                        onChange={(event) => updateForm("siteVisitDate", event.target.value)}
                                        className="schema-dark"
                                      />
                                    </FormField>

                                  </div>
                                ) : null}

                                {currentStep === 1 ? (
                                  <div className="grid h-full gap-5">
                                    <div className="space-y-3">
                                      <SectionHeading
                                        error={fieldErrors.apartmentType}
                                        title="Apartment Interest"
                                        description="Choose the residence type that best matches your requirement."
                                      />
                                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                        {apartmentTypes.map((option) => (
                                          <OptionCard
                                            key={option}
                                            label={option}
                                            isActive={form.apartmentType === option}
                                            onClick={() => {
                                              updateForm("apartmentType", option);
                                              void validateField("apartmentType", option);
                                            }}
                                            icon={<Home className="h-3.5 w-3.5" />}
                                          />
                                        ))}
                                      </div>
                                    </div>

                                    <div className="space-y-3">
                                      <SectionHeading
                                        error={fieldErrors.budget}
                                        title="Budget Window"
                                        description="This helps us share options that are relevant and realistic."
                                      />
                                      <div className="grid gap-3 sm:grid-cols-2">
                                        {budgetRanges.map((option) => (
                                          <OptionCard
                                            key={option}
                                            label={option}
                                            isActive={form.budget === option}
                                            onClick={() => {
                                              updateForm("budget", option);
                                              void validateField("budget", option);
                                            }}
                                            compact
                                          />
                                        ))}
                                      </div>
                                    </div>

                                    <div className="space-y-3">
                                      <SectionHeading
                                        error={fieldErrors.moveInTimeline}
                                        title="Move-In Timeline"
                                        description="Useful for prioritizing immediate and possession-ready inventory."
                                      />
                                      <div className="flex flex-wrap gap-2.5">
                                        {moveInOptions.map((option) => (
                                          <ChipButton
                                            key={option}
                                            label={option}
                                            isActive={form.moveInTimeline === option}
                                            onClick={() => {
                                              updateForm("moveInTimeline", option);
                                              void validateField("moveInTimeline", option);
                                            }}
                                          />
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                ) : null}

                                {currentStep === 2 ? (
                                  <div className="space-y-5">
                                    <FormField
                                      data-quote-item
                                      error={fieldErrors.message}
                                      icon={<MessageSquare className="h-4 w-4" />}
                                      label="Message"
                                    >
                                      <LuxuryTextarea
                                        invalid={Boolean(fieldErrors.message)}
                                        onBlur={handleFieldBlur("message")}
                                        value={form.message}
                                        onChange={(event) => updateForm("message", event.target.value)}
                                        rows={6}
                                        placeholder="Tell us about floor preference, vastu, view, or any specific requirement."
                                      />
                                    </FormField>

                                    <div className="space-y-2.5">
                                      <GlowSurface
                                        className={cn(
                                          "rounded-[20px] border bg-white/3 px-4 py-4",
                                          fieldErrors.consent
                                            ? "border-rose-400/30" 
                                            : "border-white/10",
                                        )}
                                      >
                                      <motion.label
                                        whileHover={{ scale: 1.005 }}
                                        className="relative z-10 flex cursor-pointer items-start gap-3"
                                      >
                                        <input
                                          checked={form.consent}
                                          onChange={(event) => {
                                            updateForm("consent", event.target.checked);
                                            void validateField("consent", event.target.checked);
                                          }}
                                          type="checkbox"
                                          className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent text-[#d6bc88]"
                                        />
                                        <span>
                                          <span className="block text-sm font-medium text-white">
                                            Permission to contact you
                                          </span>
                                          <span className="mt-1 block text-[12px] leading-6 text-white/58">
                                            I agree to be contacted about apartments,
                                            pricing, and site visits.
                                          </span>
                                        </span>
                                      </motion.label>
                                      </GlowSurface>
                                      {fieldErrors.consent ? (
                                        <FieldError message={fieldErrors.consent} />
                                      ) : null}
                                    </div>

                                    <GlowSurface className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.03))] p-5">
                                      <div className="relative z-10">
                                        <div className="text-[11px] uppercase tracking-[0.24em] text-[#d6bc88]">
                                          Review
                                        </div>
                                        <h4 className="mt-2 font-[var(--font-sora)] text-lg text-white">
                                          Your request snapshot
                                        </h4>
                                        <div className="mt-4 space-y-3">
                                          <SummaryRow label="Name" value={form.fullName || "Not added"} />
                                          <SummaryRow label="Email" value={form.email || "Not added"} />
                                          <SummaryRow label="Phone" value={form.phone || "Not added"} />
                                          <SummaryRow label="Apartment" value={form.apartmentType} />
                                          <SummaryRow label="Budget" value={form.budget} />
                                          <SummaryRow label="Timeline" value={form.moveInTimeline} />
                                          <SummaryRow label="Visit" value={form.siteVisitDate || "Flexible"} />
                                        </div>
                                      </div>
                                    </GlowSurface>
                                  </div>
                                ) : null}
                              </motion.div>
                            </AnimatePresence>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 flex flex-col gap-4 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="text-[11px] uppercase tracking-[0.24em] text-white/34">
                          Private apartment inquiry
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                          {currentStep > 0 ? (
                            <motion.button
                              whileTap={{ scale: 0.985 }}
                              type="button"
                              onClick={handlePreviousStep}
                              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-medium text-white transition hover:bg-white/[0.08]"
                            >
                              <ArrowLeft className="h-4 w-4" />
                              Previous
                            </motion.button>
                          ) : null}

                          {currentStep < formSteps.length - 1 ? (
                            <motion.button
                              key="continue-step"
                              whileTap={{ scale: 0.985 }}
                              type="button"
                              onClick={(event) => {
                                event.preventDefault();
                                submitIntentRef.current = false;
                                handleNextStep();
                              }}
                              className="inline-flex min-w-[190px] items-center justify-center gap-2 rounded-full border border-[#d6bc88]/35 bg-[linear-gradient(135deg,#d8bf91_0%,#b8935c_45%,#e3cfaa_100%)] px-6 py-3.5 text-sm font-semibold text-[#0b0c0f] shadow-[0_18px_40px_rgba(0,0,0,0.35)] transition hover:brightness-105"
                            >
                              Continue
                              <ArrowRight className="h-4 w-4" />
                            </motion.button>
                          ) : (
                            <motion.button
                              key="submit-step"
                              ref={submitButtonRef}
                              whileTap={{ scale: 0.985 }}
                              type="submit"
                              onClick={() => {
                                submitIntentRef.current = true;
                              }}
                              disabled={!isFormComplete || submitState === "submitting"}
                              className="inline-flex min-w-[230px] items-center justify-center gap-2 rounded-full border border-[#d6bc88]/35 bg-[linear-gradient(135deg,#d8bf91_0%,#b8935c_45%,#e3cfaa_100%)] px-6 py-3.5 text-sm font-semibold text-[#0b0c0f] shadow-[0_18px_40px_rgba(0,0,0,0.35)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {submitState === "submitting" ? (
                                <>
                                  <LoaderCircle className="h-5 w-5 animate-spin" />
                                  Sending request
                                </>
                              ) : (
                                <>
                                  <Home className="h-4 w-4" />
                                  Get My Quote
                                </>
                              )}
                            </motion.button>
                          )}
                        </div>
                      </div>
                    </form>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function LuxuryInput({
  invalid = false,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
}) {
  return (
    <GlowSurface
      className={cn(
        "rounded-[18px] border bg-white/[0.04] transition focus-within:bg-white/[0.06]",
        invalid
          ? "border-rose-400/30 focus-within:border-rose-300/60"
          : "border-white/10 focus-within:border-[#d6bc88]/55",
      )}
    >
      <input
        {...props}
        aria-invalid={invalid}
        className={cn(
          "relative z-10 h-[56px] w-full bg-transparent px-4 text-[14px] text-white outline-none placeholder:text-white/30",
          props.className,
        )}
      />
    </GlowSurface>
  );
}

function LuxuryTextarea({
  invalid = false,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  invalid?: boolean;
}) {
  return (
    <GlowSurface
      className={cn(
        "rounded-[20px] border bg-white/[0.04] transition focus-within:bg-white/[0.06]",
        invalid
          ? "border-rose-400/30 focus-within:border-rose-300/60"
          : "border-white/10 focus-within:border-[#d6bc88]/55",
      )}
    >
      <textarea
        {...props}
        aria-invalid={invalid}
        className={cn(
          "relative z-10 w-full bg-transparent px-4 py-4 text-[14px] leading-7 text-white outline-none placeholder:text-white/30",
          props.className,
        )}
      />
    </GlowSurface>
  );
}

function GlowSurface({
  children,
  className,
  style,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-cursor-glow
      {...props}
      style={{ ...cursorGlowDefaults, ...style }}
      className={cn("relative overflow-hidden", className)}
    >
      <GlowBorder />
      {children}
    </div>
  );
}

function GlowBorder() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-[var(--glow-opacity)] transition-opacity duration-150"
      style={{
        padding: "1px",
        background:
          "radial-gradient(160px circle at var(--glow-x) var(--glow-y), rgba(214,188,136,0.95), rgba(214,188,136,0.42) 28%, rgba(214,188,136,0.1) 48%, transparent 68%)",
        WebkitMask:
          "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
        WebkitMaskComposite: "xor",
        maskComposite: "exclude",
      }}
    />
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="grid grid-cols-[minmax(88px,120px)_minmax(0,1fr)] items-start gap-3 border-b border-white/8 pb-3 text-sm last:border-b-0 last:pb-0">
      <span className="text-white/42">{label}</span>
      <span className="min-w-0 break-words text-right text-white">{value}</span>
    </div>
  );
}

function FormField({
  children,
  error,
  icon,
  label,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  error?: string;
  icon: ReactNode;
  label: string;
}) {
  return (
    <div {...props} className={cn("space-y-2.5", props.className)}>
      <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-white/44">
        <span className="text-[#d6bc88]">{icon}</span>
        {label}
      </div>
      {children}
      {error ? <FieldError message={error} /> : null}
    </div>
  );
}

function SectionHeading({
  error,
  title,
  description,
}: {
  error?: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <h3 className="font-[var(--font-sora)] text-[15px] font-semibold text-white">
        {title}
      </h3>
      <p className="mt-1 max-w-xl text-[13px] leading-6 text-white/55">
        {description}
      </p>
      {error ? <FieldError className="mt-2" message={error} /> : null}
    </div>
  );
}

function FieldError({
  message,
  className,
}: {
  message: string;
  className?: string;
}) {
  return <p className={cn("text-xs text-rose-300", className)}>{message}</p>;
}

function OptionCard({
  icon,
  isActive,
  label,
  onClick,
  compact = false,
}: {
  icon?: ReactNode;
  isActive: boolean;
  label: string;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <motion.button
      data-cursor-glow
      style={cursorGlowDefaults}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.985 }}
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex items-center justify-center gap-2.5 overflow-hidden rounded-[18px] border px-3.5 py-3 text-left transition",
        isActive
          ? "border-[#d6bc88]/40 bg-[linear-gradient(135deg,rgba(214,188,136,0.18),rgba(255,255,255,0.06))] text-white shadow-[0_12px_30px_rgba(0,0,0,0.22)]"
          : "border-white/10 bg-white/[0.03] text-white/72 hover:border-white/16 hover:bg-white/[0.05]",
        compact ? "min-h-[56px]" : "min-h-[58px]",
      )}
    >
      <GlowBorder />

      {icon ? (
        <span
          className={cn(
            "relative z-10 rounded-full p-1.5",
            isActive
              ? "bg-[#d6bc88]/16 text-[#e7d2a7]"
              : "bg-white/[0.06] text-white/55",
          )}
        >
          {icon}
        </span>
      ) : null}

      <span className="relative z-10 text-[12.5px] font-medium tracking-[0.01em] text-current">
        {label}
      </span>
    </motion.button>
  );
}

function ChipButton({
  isActive,
  label,
  onClick,
}: {
  isActive: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      data-cursor-glow
      style={cursorGlowDefaults}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.985 }}
      type="button"
      onClick={onClick}
      className={cn(
        "relative overflow-hidden rounded-full border px-4 py-2.5 text-[12px] leading-none transition",
        isActive
          ? "border-[#d6bc88]/35 bg-[#d6bc88]/14 text-[#f3e3bf]"
          : "border-white/10 bg-white/[0.03] text-white/68 hover:border-white/16 hover:bg-white/[0.05]",
      )}
    >
      <GlowBorder />
      <span className="relative z-10">{label}</span>
    </motion.button>
  );
}
