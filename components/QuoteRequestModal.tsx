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
import {
  Alignment,
  Fit,
  Layout,
  useRive,
} from "@rive-app/react-canvas";
import Image from "next/image";
import { gsap } from "gsap";
import { AnimatePresence, motion } from "framer-motion";
import {
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
import { cn } from "@/lib/utils";

type QuoteRequestModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

type FormState = {
  fullName: string;
  email: string;
  phone: string;
  apartmentType: string;
  budget: string;
  moveInTimeline: string;
  message: string;
  consent: boolean;
};

const apartmentTypes = ["1 BHK", "2 BHK", "3 BHK", "4 BHK"] as const;
const budgetRanges = [
  "Under 90L",
  "90L - 1.2Cr",
  "1.2Cr - 1.8Cr",
  "1.8Cr+",
] as const;
const moveInOptions = [
  "Immediate",
  "Within 3 months",
  "Within 6 months",
  "Just exploring",
] as const;

const initialFormState: FormState = {
  fullName: "",
  email: "",
  phone: "",
  apartmentType: "2 BHK",
  budget: "1.2Cr - 1.8Cr",
  moveInTimeline: "Within 6 months",
  message: "",
  consent: true,
};

const cursorGlowDefaults: CSSProperties = {
  ["--glow-x" as string]: "50%",
  ["--glow-y" as string]: "50%",
  ["--glow-opacity" as string]: "0",
} as CSSProperties;

export default function QuoteRequestModal({
  isOpen,
  onClose,
}: QuoteRequestModalProps) {
  const modalRef = useRef<HTMLDivElement | null>(null);
  const submitButtonRef = useRef<HTMLButtonElement | null>(null);
  const [form, setForm] = useState<FormState>(initialFormState);
  const [submitState, setSubmitState] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [feedbackMessage, setFeedbackMessage] = useState("");

  const minVisitDate = useMemo(() => {
    return new Date().toISOString().split("T")[0];
  }, []);

  const { RiveComponent } = useRive({
    src: "/286-565-addis-ababa.riv",
    autoplay: true,
    layout: new Layout({
      fit: Fit.Cover,
      alignment: Alignment.Center,
    }),
  });

  const isFormComplete = Boolean(
    form.fullName.trim() &&
      form.email.trim() &&
      form.phone.trim() &&
      form.apartmentType &&
      form.budget &&
      form.consent,
  );

  useEffect(() => {
    if (!isOpen) return;

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
  }, [isOpen, submitState]);

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

  const updateForm = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleClose = () => {
    if (submitState !== "submitting") onClose();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isFormComplete) {
      setSubmitState("error");
      setFeedbackMessage("Please fill the key details so we can prepare your quote.");
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

      const result = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(result.message || "Unable to send your request right now.");
      }

      setSubmitState("success");
      setFeedbackMessage("Our sales team has your request and will contact you shortly.");
      setForm(initialFormState);
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
          className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5 lg:p-8"
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
            className="relative z-10 grid h-[min(90vh,860px)] w-full max-w-[1260px] overflow-hidden rounded-[30px] border border-white/10 bg-[#08090c]/95 text-white shadow-[0_30px_120px_rgba(0,0,0,0.55)] backdrop-blur-2xl lg:grid-cols-[minmax(380px,0.88fr)_minmax(0,1.12fr)]"
          >
            <div className="relative h-[300px] overflow-hidden border-b border-white/10 bg-[#0b0d12] lg:h-full lg:border-b-0 lg:border-r">
              <div
                data-quote-glow
                className="absolute -left-14 top-8 h-56 w-56 rounded-full bg-[#c9a96b]/18 blur-3xl"
              />
              <div
                data-quote-glow
                className="absolute right-[-20px] top-1/4 h-64 w-64 rounded-full bg-white/8 blur-3xl"
              />
              <div
                data-quote-glow
                className="absolute bottom-[-30px] left-1/3 h-52 w-52 rounded-full bg-[#b08d57]/18 blur-3xl"
              />

              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_36%),linear-gradient(180deg,rgba(8,9,12,0.1),rgba(8,9,12,0.72)_65%,rgba(8,9,12,0.96))]" />

              <div data-quote-item className="absolute inset-0 opacity-90">
                <img src={'/Road night view.webp'} alt="Form Left Image - Trifecta" className="object-cover object-right w-full h-full"/>
              </div>
            </div>

            <div className="relative h-full overflow-y-auto bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))]">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(201,169,107,0.12),transparent_26%)]" />

              <button
                type="button"
                onClick={handleClose}
                className="absolute right-5 top-5 z-20 rounded-full border border-white/10 bg-white/[0.05] p-2.5 text-white/70 transition hover:bg-white/[0.09] hover:text-white"
                aria-label="Close quote popup"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="relative z-10 px-6 py-7 sm:px-7 lg:px-8">
                {submitState === "success" ? (
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex min-h-[560px] flex-col items-center justify-center px-6 text-center"
                  >
                    <div className="rounded-full border border-[#d6bc88]/30 bg-[#d6bc88]/12 p-4 text-[#e7d2a7]">
                      <CheckCircle2 className="h-10 w-10" />
                    </div>

                    <h3 className="mt-6 font-[var(--font-sora)] text-3xl text-white">
                      Request received
                    </h3>

                    <p className="mt-3 max-w-md text-sm leading-7 text-white/60">
                      {feedbackMessage}
                    </p>

                    <button
                      type="button"
                      onClick={handleClose}
                      className="mt-8 rounded-full border border-white/10 bg-white/[0.05] px-6 py-3 text-sm font-medium text-white transition hover:bg-white/[0.08]"
                    >
                      Close Form
                    </button>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-7">
                    <div
                      data-quote-item
                      className="max-w-xl space-y-3 pr-14"
                    >
                      <div className="text-[11px] uppercase tracking-[0.26em] text-[#d6bc88]">
                        Request a Quote
                      </div>
                      <p
                        id="quote-modal-title"
                        className="font-[var(--font-sora)] text-[2rem] font-semibold leading-[1.1] text-white"
                      >
                        A more private way
                        <br />
                        to discover your next home.
                      </p>
                      <p className="max-w-lg text-[14px] leading-7 text-white/60">
                        Enter a few essentials and our team will share a tailored
                        apartment quote with relevant availability.
                      </p>
                    </div>

                    <div className="grid gap-x-5 gap-y-5 md:grid-cols-2">
                      <FormField
                        data-quote-item
                        icon={<User2 className="h-4 w-4" />}
                        label="Full Name"
                      >
                        <LuxuryInput
                          value={form.fullName}
                          onChange={(event) => updateForm("fullName", event.target.value)}
                          placeholder="Enter your full name"
                        />
                      </FormField>

                      <FormField
                        data-quote-item
                        icon={<Phone className="h-4 w-4" />}
                        label="Phone Number"
                      >
                        <LuxuryInput
                          value={form.phone}
                          onChange={(event) => updateForm("phone", event.target.value)}
                          placeholder="+91 98765 43210"
                          type="tel"
                        />
                      </FormField>

                      <FormField
                        data-quote-item
                        icon={<Mail className="h-4 w-4" />}
                        label="Email Address"
                      >
                        <LuxuryInput
                          value={form.email}
                          onChange={(event) => updateForm("email", event.target.value)}
                          placeholder="you@example.com"
                          type="email"
                        />
                      </FormField>

                      <FormField
                        data-quote-item
                        icon={<CalendarDays className="h-4 w-4" />}
                        label="Site Visit"
                      >
                        <GlowSurface className="rounded-[18px] border border-white/10 bg-white/[0.04] transition focus-within:border-[#d6bc88]/55 focus-within:bg-white/[0.06]">
                          <input
                            min={minVisitDate}
                            type="date"
                            className="relative z-10 h-[56px] w-full bg-transparent px-4 text-[14px] text-white outline-none [color-scheme:dark]"
                          />
                        </GlowSurface>
                      </FormField>
                    </div>

                    <div data-quote-item className="space-y-3">
                      <SectionHeading
                        title="Apartment Interest"
                        description="Choose the residence type that best matches your requirement."
                      />
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        {apartmentTypes.map((option) => (
                          <OptionCard
                            key={option}
                            label={option}
                            isActive={form.apartmentType === option}
                            onClick={() => updateForm("apartmentType", option)}
                            icon={<Home className="h-3.5 w-3.5" />}
                          />
                        ))}
                      </div>
                    </div>

                    <div data-quote-item className="space-y-3">
                      <SectionHeading
                        title="Budget Window"
                        description="This helps us share options that are relevant and realistic."
                      />
                      <div className="grid gap-3 sm:grid-cols-2">
                        {budgetRanges.map((option) => (
                          <OptionCard
                            key={option}
                            label={option}
                            isActive={form.budget === option}
                            onClick={() => updateForm("budget", option)}
                            compact
                          />
                        ))}
                      </div>
                    </div>

                    <div data-quote-item className="space-y-3">
                      <SectionHeading
                        title="Move-In Timeline"
                        description="Useful for prioritizing immediate and possession-ready inventory."
                      />
                      <div className="flex flex-wrap gap-2.5">
                        {moveInOptions.map((option) => (
                          <ChipButton
                            key={option}
                            label={option}
                            isActive={form.moveInTimeline === option}
                            onClick={() => updateForm("moveInTimeline", option)}
                          />
                        ))}
                      </div>
                    </div>

                    <FormField
                      data-quote-item
                      icon={<MessageSquare className="h-4 w-4" />}
                      label="Message"
                    >
                      <LuxuryTextarea
                        value={form.message}
                        onChange={(event) => updateForm("message", event.target.value)}
                        rows={4}
                        placeholder="Tell us about floor preference, vastu, view, or any specific requirement."
                      />
                    </FormField>

                    <motion.label
                      data-quote-item
                      whileHover={{ scale: 1.005 }}
                      className="flex cursor-pointer items-start gap-3 pt-1"
                    >
                      <input
                        checked={form.consent}
                        onChange={(event) => updateForm("consent", event.target.checked)}
                        type="checkbox"
                        className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent text-[#d6bc88]"
                      />
                      <span className="text-[12px] leading-6 text-white/58">
                        I agree to be contacted about inventory, pricing, and site
                        visits.
                      </span>
                    </motion.label>

                    {feedbackMessage ? (
                      <div
                        data-quote-item
                        className={cn(
                          "rounded-[18px] border px-4 py-3 text-sm",
                          submitState === "error"
                            ? "border-rose-400/20 bg-rose-400/10 text-rose-200"
                            : "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
                        )}
                      >
                        {feedbackMessage}
                      </div>
                    ) : null}

                    <div
                      data-quote-item
                      className="flex flex-col gap-4 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="text-[11px] uppercase tracking-[0.24em] text-white/34">
                        Private apartment inquiry
                      </div>

                      <motion.button
                        ref={submitButtonRef}
                        whileTap={{ scale: 0.985 }}
                        type="submit"
                        disabled={!isFormComplete || submitState === "submitting"}
                        className="inline-flex min-w-[230px] items-center justify-center gap-2 rounded-full border border-[#d6bc88]/35 bg-[linear-gradient(135deg,#d8bf91_0%,#b8935c_45%,#e3cfaa_100%)] px-6 py-3.5 text-sm font-semibold text-[#0b0c0f] shadow-[0_18px_40px_rgba(0,0,0,0.35)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {submitState === "submitting" ? (
                          <>
                            <LoaderCircle className="h-6 w-6 text-white animate-spin" />
                            
                          </>
                        ) : (
                          <>
                            <Home className="h-4 w-4" />
                            Get My Quote
                          </>
                        )}
                      </motion.button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function LuxuryInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <GlowSurface className="rounded-[18px] border border-white/10 bg-white/[0.04] transition focus-within:border-[#d6bc88]/55 focus-within:bg-white/[0.06]">
      <input
        {...props}
        className={cn(
          "relative z-10 h-[56px] w-full bg-transparent px-4 text-[14px] text-white outline-none placeholder:text-white/30",
          props.className,
        )}
      />
    </GlowSurface>
  );
}

function LuxuryTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <GlowSurface className="rounded-[20px] border border-white/10 bg-white/[0.04] transition focus-within:border-[#d6bc88]/55 focus-within:bg-white/[0.06]">
      <textarea
        {...props}
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

function FormField({
  children,
  icon,
  label,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
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
    </div>
  );
}

function SectionHeading({
  title,
  description,
}: {
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
    </div>
  );
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