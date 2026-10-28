"use client";

import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  BookOpenText,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Clock3,
  FileText,
  Filter,
  Gauge,
  LayoutDashboard,
  LoaderCircle,
  Menu,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";

type Guideline = { id: string; name: string; text: string; added: string };
type Finding = {
  title: string;
  severity: "High" | "Medium" | "Low";
  confidence: number;
  explanation: string;
  evidence: string;
  source: string;
  originalText: string;
  suggestion: string;
};
type Review = {
  id: string;
  title: string;
  content: string;
  status: "Needs edits" | "Approved" | "In review";
  reviewMode?: "ai" | "local-rules";
  createdAt: string;
  findings: Finding[];
};
type Screen = "Dashboard" | "Brand library" | "Review history" | "Analytics";

const storageKeys = { guidelines: "brandguard.guidelines", reviews: "brandguard.reviews" };
const sampleGuideline = {
  name: "Northstar brand rules.md",
  text: [
    "Avoid guarantees and absolute promises.",
    "Do not promise quantified outcomes without substantiation.",
    'Use "workspace" instead of "tool".',
    "Prefer clear, helpful, human language.",
  ].join("\n"),
};
const sampleDraft =
  "Meet the only project tool your team will ever need. Guaranteed to double your productivity overnight.";

const sampleReviews: Review[] = [
  {
    id: "sample-1",
    title: "Spring launch email",
    content: "Meet the only project tool your team will ever need. Guaranteed to double your productivity overnight.",
    status: "Needs edits",
    createdAt: "Today, 10:42 AM",
    findings: [
      {
        title: "Unsupported absolute claim",
        severity: "High",
        confidence: 96,
        explanation: "The copy makes a guarantee that is not supported by approved brand evidence.",
        evidence: "Use specific, supportable claims. Avoid guarantees and absolute promises.",
        source: "Brand Voice Guide.pdf",
        originalText: "the only project tool your team will ever need",
        suggestion: "Meet a project workspace designed to help your team stay focused and organized.",
      },
      {
        title: "Unsubstantiated outcome",
        severity: "Medium",
        confidence: 91,
        explanation: "A quantified productivity result is promised without substantiation.",
        evidence: "Describe practical workflow benefits; do not promise quantified outcomes without substantiation.",
        source: "Messaging Pillars.pdf",
        originalText: "Guaranteed to double your productivity overnight.",
        suggestion: "Bring projects, updates, and next steps together in one workspace.",
      },
    ],
  },
  { id: "sample-2", title: "Product page headline", content: "", status: "Approved", createdAt: "Yesterday", findings: [] },
  {
    id: "sample-3",
    title: "Customer welcome message",
    content: "",
    status: "In review",
    createdAt: "Yesterday",
    findings: [],
  },
];

const shortDate = () =>
  new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(
    new Date(),
  );

export default function Home() {
  const [screen, setScreen] = useState<Screen>("Dashboard");
  const [guidelines, setGuidelines] = useState<Guideline[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNewReview, setShowNewReview] = useState(false);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewContent, setReviewContent] = useState("");
  const [reviewMode, setReviewMode] = useState<"ai" | "local-rules">("ai");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");
  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => {
    const loadWorkspace = async () => {
      await Promise.resolve();
      try {
        const savedGuidelines = localStorage.getItem(storageKeys.guidelines);
        const savedReviews = localStorage.getItem(storageKeys.reviews);
        if (savedGuidelines) setGuidelines(JSON.parse(savedGuidelines) as Guideline[]);
        if (savedReviews) setReviews(JSON.parse(savedReviews) as Review[]);
      } catch (e) {
        console.error("Could not load saved BrandGuard data", e);
        setError("Saved workspace data could not be loaded. Check browser storage and refresh.");
      } finally {
        setHydrated(true);
      }
    };
    void loadWorkspace();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(storageKeys.guidelines, JSON.stringify(guidelines));
  }, [guidelines, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(storageKeys.reviews, JSON.stringify(reviews));
  }, [reviews, hydrated]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const selectedReview = reviews.find((review) => review.id === selectedId);
  const allReviews = useMemo(() => (reviews.length ? reviews : sampleReviews), [reviews]);
  const filteredReviews = allReviews.filter((review) => review.title.toLowerCase().includes(query.toLowerCase()));
  const completedReviews = reviews.filter((review) => review.status !== "In review").length;
  const attentionCount = reviews.filter((review) => review.status === "Needs edits").length;
  const allFindings = reviews.reduce((count, review) => count + review.findings.length, 0);

  const addGuideline = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;
    const invalid = files.find((file) => !/\.(txt|md)$/i.test(file.name));
    if (invalid) {
      setError(`${invalid.name}: upload a .txt or .md file. PDF and Word extraction is not configured yet.`);
      return;
    }
    if (guidelines.length + files.length > 10) {
      setError("A review can use up to 10 sources. Remove a source before adding more.");
      return;
    }
    const oversized = files.find((file) => file.size > 12_000);
    if (oversized) {
      setError(`${oversized.name} is larger than 12 KB. Keep each text source under 12 KB for this MVP.`);
      return;
    }
    try {
      const added: Guideline[] = await Promise.all(
        files.map(async (file) => ({
          id: crypto.randomUUID(),
          name: file.name,
          text: await file.text(),
          added: shortDate(),
        })),
      );
      setGuidelines((current) => [...added, ...current]);
      setToast(`${added.length} guideline${added.length === 1 ? "" : "s"} added to your library`);
    } catch (e) {
      console.error("Guideline upload failed", e);
      setError("Could not read the selected file. Try another text or Markdown document.");
    }
  };

  const addSampleGuideline = () => {
    if (guidelines.some((guideline) => guideline.name === sampleGuideline.name)) {
      setError("The sample brand rules are already in your library.");
      return;
    }
    if (guidelines.length >= 10) {
      setError("A review can use up to 10 sources. Remove a source before adding the sample rules.");
      return;
    }
    setError("");
    setGuidelines((current) => [
      { ...sampleGuideline, id: crypto.randomUUID(), added: shortDate() },
      ...current,
    ]);
    setToast("Sample brand rules added. Choose Local rules scan to try the workflow.");
  };

  const createReview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const response = await fetch(reviewMode === "ai" ? "/api/reviews" : "/api/local-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: reviewTitle.trim(),
          content: reviewContent.trim(),
          guidelines: guidelines.map(({ name, text }) => ({ name, text })),
        }),
      });
      const payload = (await response.json()) as { error?: string; findings?: Finding[] };
      if (!response.ok) throw new Error(payload.error ?? "The review could not be completed.");
      const review: Review = {
        id: crypto.randomUUID(),
        title: reviewTitle.trim(),
        content: reviewContent.trim(),
        status: (payload.findings?.length ?? 0) > 0 ? "Needs edits" : "In review",
        reviewMode,
        createdAt: shortDate(),
        findings: payload.findings ?? [],
      };
      setReviews((current) => [review, ...current]);
      setSelectedId(review.id);
      setShowNewReview(false);
      setReviewTitle("");
      setReviewContent("");
      setScreen("Review history");
      setToast(
        reviewMode === "ai"
          ? "AI review complete. Human approval is still required."
          : "Local rules scan complete. This was not an AI review.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "The review could not be completed.");
    } finally {
      setBusy(false);
    }
  };

  const updateReview = (id: string, change: Partial<Review>) =>
    setReviews((current) => current.map((review) => (review.id === id ? { ...review, ...change } : review)));

  const openReview = (id: string) => {
    const sample = sampleReviews.find((review) => review.id === id);
    if (sample) {
      setReviews((current) => (current.some((review) => review.id === id) ? current : [sample, ...current]));
    }
    setSelectedId(id);
  };

  const applySuggestion = (finding: Finding) => {
    if (!selectedReview) return;
    if (!selectedReview.content.includes(finding.originalText)) {
      setToast("Suggestion not applied: the original wording is no longer in this draft.");
      return;
    }
    const updated = selectedReview.content.replace(finding.originalText, finding.suggestion);
    updateReview(selectedReview.id, { content: updated });
    setToast("Suggested correction added to the draft");
  };

  const decideReview = (status: "Approved" | "Needs edits") => {
    if (!selectedReview) return;
    updateReview(selectedReview.id, { status });
    setToast(status === "Approved" ? "Review approved by human reviewer" : "Changes requested");
  };

  const removeGuideline = (id: string) => {
    setGuidelines((current) => current.filter((item) => item.id !== id));
    setToast("Guideline removed");
  };

  return (
    <div className="app-frame">
      <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
        <a className="brand-lockup" href="#" onClick={() => setScreen("Dashboard")}>
          <span className="brand-mark"><ShieldCheck size={19} strokeWidth={2.2} /></span>
          <span className="brand-word">brandguard<span>AI</span></span>
        </a>
        <div className="workspace-picker">
          <div className="workspace-avatar">N</div>
          <div className="workspace-copy"><strong>Northstar Studio</strong><span>Free workspace</span></div>
          <ChevronDown size={15} />
        </div>
        <p className="nav-caption">WORKSPACE</p>
        <nav className="main-nav" aria-label="Main navigation">
          <NavButton label="Dashboard" active={screen === "Dashboard"} onClick={() => { setScreen("Dashboard"); setSelectedId(null); setMobileNav(false); }} icon={<LayoutDashboard size={17} />} />
          <NavButton label="Brand library" active={screen === "Brand library"} onClick={() => { setScreen("Brand library"); setSelectedId(null); setMobileNav(false); }} icon={<BookOpenText size={17} />} count={guidelines.length || undefined} />
          <NavButton label="Review history" active={screen === "Review history"} onClick={() => { setScreen("Review history"); setSelectedId(null); setMobileNav(false); }} icon={<FileText size={17} />} />
          <NavButton label="Analytics" active={screen === "Analytics"} onClick={() => { setScreen("Analytics"); setSelectedId(null); setMobileNav(false); }} icon={<Gauge size={17} />} />
        </nav>
        <div className="sidebar-bottom">
          <div className="plan-card">
            <div className="plan-icon"><Sparkles size={16} /></div>
            <div><strong>Make every word count</strong><p>Your brand, protected at every touchpoint.</p></div>
            <ArrowUpRight size={14} className="plan-arrow" />
          </div>
          <button className="profile-button">
            <div className="profile-avatar">AM</div>
            <div className="profile-copy"><strong>Alex Morgan</strong><span>Brand manager</span></div>
            <MoreHorizontal size={17} />
          </button>
        </div>
      </aside>
      {mobileNav && <button className="nav-scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}
      <main className="main-panel">
        <header className="topbar">
          <button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMobileNav(true)}><Menu size={19} /></button>
          <div className="breadcrumb"><span>Northstar Studio</span><span className="crumb-slash">/</span><strong>{selectedReview ? "Review details" : screen}</strong></div>
          <div className="topbar-actions"><span className="privacy-chip"><span /> Your workspace is private</span><button className="icon-button" aria-label="Help"><CircleHelp size={18} /></button><button className="icon-button" aria-label="Settings"><Settings2 size={18} /></button></div>
        </header>

        <div className="page-content">
          {error && !showNewReview && <div className="error-banner workspace-error"><ShieldAlert size={17} /><span>{error}</span><button className="icon-button" onClick={() => setError("")} aria-label="Dismiss error"><X size={15} /></button></div>}
          {selectedReview ? (
            <ReviewDetail review={selectedReview} onBack={() => setSelectedId(null)} onApply={applySuggestion} onDecision={decideReview} onContentChange={(content) => updateReview(selectedReview.id, { content })} />
          ) : screen === "Dashboard" ? (
            <Dashboard
              reviews={allReviews.slice(0, 3)}
              completedReviews={completedReviews}
              attentionCount={attentionCount}
              guidelineCount={guidelines.length}
              hasReviews={reviews.length > 0}
              hasApprovedReview={reviews.some((review) => review.status === "Approved")}
              onNew={() => { setError(""); setShowNewReview(true); }}
              onLibrary={() => setScreen("Brand library")}
              onReviews={() => setScreen("Review history")}
              onSelect={openReview}
            />
          ) : screen === "Brand library" ? (
            <BrandLibrary guidelines={guidelines} onUpload={addGuideline} onRemove={removeGuideline} onNew={() => setShowNewReview(true)} onAddSample={addSampleGuideline} />
          ) : screen === "Review history" ? (
            <ReviewHistory reviews={filteredReviews} query={query} onQuery={setQuery} onSelect={openReview} onNew={() => setShowNewReview(true)} />
          ) : (
            <Analytics reviews={allReviews} completedReviews={completedReviews} attentionCount={attentionCount} allFindings={allFindings} />
          )}
        </div>
      </main>

      {showNewReview && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setShowNewReview(false); }}>
          <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className="modal-heading"><div><span className="eyebrow">CONTENT CHECK</span><h2 id="modal-title">Start a new review</h2><p>Check your draft against the latest brand guidance.</p></div><button className="icon-button" onClick={() => setShowNewReview(false)} disabled={busy} aria-label="Close"><X size={18} /></button></div>
            {error && <div className="error-banner"><ShieldAlert size={17} /><span>{error}</span></div>}
            <form onSubmit={createReview} className="review-form">
              <label>Review name<input required maxLength={100} value={reviewTitle} onChange={(event) => setReviewTitle(event.target.value)} placeholder="e.g. Spring launch email" /></label>
              <label>Content to review<textarea required minLength={10} maxLength={12000} value={reviewContent} onChange={(event) => setReviewContent(event.target.value)} placeholder="Paste your draft here..." rows={7} /><span className="field-note">{reviewContent.length.toLocaleString()} / 12,000 characters</span></label>
              <button type="button" className="sample-draft-button" onClick={() => { setReviewTitle((value) => value || "Spring launch email"); setReviewContent(sampleDraft); setError(""); }}><Sparkles size={13} /> Load sample draft</button>
              <fieldset className="review-mode-picker">
                <legend>Choose review engine</legend>
                <button type="button" className={`review-mode-option ${reviewMode === "ai" ? "mode-selected" : ""}`} onClick={() => setReviewMode("ai")} aria-pressed={reviewMode === "ai"}>
                  <span className="mode-radio" />
                  <span><strong>AI review</strong><small>Semantic retrieval + configured LLM</small></span>
                  <Sparkles size={16} />
                </button>
                <button type="button" className={`review-mode-option ${reviewMode === "local-rules" ? "mode-selected" : ""}`} onClick={() => setReviewMode("local-rules")} aria-pressed={reviewMode === "local-rules"}>
                  <span className="mode-radio" />
                  <span><strong>Local rules scan</strong><small>Works without API keys · not an AI review</small></span>
                  <ShieldCheck size={16} />
                </button>
              </fieldset>
              <div className="context-note"><BookOpenText size={16} /><span>{guidelines.length ? `${guidelines.length} brand source${guidelines.length === 1 ? "" : "s"} will be checked against this draft.` : "No brand sources yet. Add guidelines to provide cited evidence to the review."}</span></div>
              <div className="modal-footer"><span><Shield size={15} /> Human approval required</span><button className="button-primary" type="submit" disabled={busy}>{busy ? <><LoaderCircle className="spin" size={16} /> Reviewing...</> : reviewMode === "ai" ? <><Sparkles size={16} /> Run AI review</> : <><ShieldCheck size={16} /> Run local scan</>}</button></div>
            </form>
          </section>
        </div>
      )}
      {toast && <div className="toast"><CheckCircle2 size={17} />{toast}</div>}
    </div>
  );
}

function NavButton({ label, active, icon, count, onClick }: { label: string; active: boolean; icon: React.ReactNode; count?: number; onClick: () => void }) {
  return <button className={`nav-item ${active ? "nav-active" : ""}`} onClick={onClick}>{icon}<span>{label}</span>{count !== undefined && <span className="nav-count">{count}</span>}</button>;
}

function Dashboard({ reviews, completedReviews, attentionCount, guidelineCount, hasReviews, hasApprovedReview, onNew, onLibrary, onReviews, onSelect }: {
  reviews: Review[]; completedReviews: number; attentionCount: number; guidelineCount: number; hasReviews: boolean; hasApprovedReview: boolean;
  onNew: () => void; onLibrary: () => void; onReviews: () => void; onSelect: (id: string) => void;
}) {
  const displayReviews = reviews.length ? reviews : sampleReviews;
  const isSample = !hasReviews;
  const approvalCount = reviews.filter((review) => review.status === "Approved").length;
  const openFindingCount = reviews
    .filter((review) => review.status === "Needs edits")
    .reduce((count, review) => count + review.findings.length, 0);
  const steps = [
    { title: "Add brand rules", description: guidelineCount ? `${guidelineCount} source${guidelineCount === 1 ? "" : "s"} ready` : "Upload your voice guide", done: guidelineCount > 0, onClick: onLibrary },
    { title: "Review a draft", description: hasReviews ? `${reviews.length} review${reviews.length === 1 ? "" : "s"} started` : "Check copy against your rules", done: hasReviews, onClick: onNew },
    { title: "Approve with a human", description: hasApprovedReview ? "Decision recorded" : "You have the final say", done: hasApprovedReview, onClick: onReviews },
  ];
  const activeStep = steps.findIndex((step) => !step.done);
  return (
    <>
      <section className="dashboard-hero">
        <div className="hero-copy">
          <div className="hero-eyebrow"><span /> HACKATHON BUILD <i /> LIVE DEMO</div>
          <h1>Build bold.<br /><em>Ship on-brand.</em></h1>
          <p>Your AI brand-safety copilot for teams shipping at hackathon speed.</p>
          <button className="hero-cta" onClick={onNew}><Sparkles size={16} /> Run your first review <ArrowRight size={15} /></button>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="hero-glow" />
          <div className="hero-orbit hero-orbit-back" />
          <div className="hero-orbit hero-orbit-front" />
          <div className="hero-cube">
            <div className="cube-face cube-front"><ShieldCheck size={43} strokeWidth={1.5} /></div>
            <div className="cube-face cube-back" />
            <div className="cube-face cube-left" />
            <div className="cube-face cube-right" />
            <div className="cube-face cube-top" />
            <div className="cube-face cube-bottom" />
          </div>
          <div className="hero-float hero-float-top"><span><Check size={12} /></span> READY FOR DEMO DAY</div>
          <div className="hero-float hero-float-bottom"><span>AI</span> Human in the loop</div>
          <i className="hero-star hero-star-one" />
          <i className="hero-star hero-star-two" />
        </div>
        <div className="hero-index"><span>01</span> / CREATE · REVIEW · SHIP</div>
      </section>
      <div className="demo-banner"><Sparkles size={15} /><span><strong>Hackathon demo workspace.</strong> Sample activity is shown below. Add your brand rules and run a live review to see the full loop.</span><button onClick={onLibrary}>Load your brand rules <ArrowRight size={14} /></button></div>
      <section className="launchpad" aria-label="BrandGuard setup steps">
        <div className="launchpad-heading"><div><span className="launchpad-kicker">YOUR SHIP-READY CHECKLIST</span><h2>Three steps to on-brand.</h2></div><span className="launchpad-progress">{steps.filter((step) => step.done).length}<i>/</i>3 complete</span></div>
        <div className="launch-steps">{steps.map((step, index) => (
          <button className={`launch-step ${step.done ? "step-done" : index === activeStep ? "step-active" : ""}`} key={step.title} onClick={step.onClick}>
            <span className="step-marker">{step.done ? <Check size={15} /> : `0${index + 1}`}</span>
            <span className="step-copy"><strong>{step.title}</strong><small>{step.description}</small></span>
            <ArrowRight size={15} className="step-arrow" />
          </button>
        ))}</div>
      </section>
      <div className="metrics-grid">
        <MetricCard label="Reviews completed" value={String(isSample ? 24 : completedReviews)} icon={<FileText size={17} />} trend={isSample ? "" : "In your workspace"} trendIcon={<ArrowRight size={14} />} note="" warning={false} sample={isSample} />
        <MetricCard label="Needs attention" value={String(isSample ? 3 : attentionCount)} icon={<ShieldAlert size={17} />} trend={isSample ? "" : "Awaiting edits"} trendIcon={<ArrowRight size={14} />} note="" warning sample={isSample} />
        <MetricCard label="Approved" value={String(isSample ? 18 : approvalCount)} icon={<BadgeCheck size={17} />} trend={isSample ? "" : "Human approved"} trendIcon={<ArrowRight size={14} />} note="" sample={isSample} />
        <MetricCard label="Open findings" value={String(isSample ? 7 : openFindingCount)} icon={<Sparkles size={17} />} trend={isSample ? "" : "Across open reviews"} trendIcon={<ArrowRight size={14} />} note="" sample={isSample} />
      </div>
      <div className="dashboard-grid">
        <section className="surface-card activity-card">
          <div className="section-heading"><div><h2>Recent reviews</h2><p>Your team’s latest content checks</p></div><button className="text-button" onClick={onReviews}>View all <ArrowRight size={15} /></button></div>
          <div className="review-list">
            {displayReviews.slice(0, 4).map((review, index) => <button className="review-row" key={review.id} onClick={() => onSelect(review.id)}>
              <div className={`review-file-icon ${index === 0 ? "file-icon-warm" : ""}`}><FileText size={17} /></div>
              <div className="review-row-main"><strong>{review.title}</strong><span>{review.createdAt} <i /> {review.findings.length} findings</span></div>
              <StatusBadge status={review.status} />
              <ArrowRight size={15} className="row-chevron" />
            </button>)}
          </div>
          <button className="list-footer" onClick={onReviews}>See all reviews <ArrowRight size={15} /></button>
        </section>
        <section className="surface-card brand-health-card">
          <div className="section-heading"><div><h2>Brand health</h2><p>Guidance keeping your work consistent</p></div><button className="icon-button subtle" onClick={onLibrary} aria-label="Open brand library"><MoreHorizontal size={18} /></button></div>
          <div className="health-score"><div className="score-ring"><strong>{guidelineCount ? "Ready" : "Demo"}</strong></div><div><strong className="health-label">{guidelineCount ? "Your library is ready" : "See it in action"}</strong><p>{guidelineCount ? "Your sources are ready to ground a review." : "Add your approved guidance to start."}</p></div></div>
          <div className="health-progress"><span>Guideline coverage</span><strong>{guidelineCount ? `${guidelineCount} source${guidelineCount === 1 ? "" : "s"}` : "Not set up"}</strong><div><i style={{ width: guidelineCount ? "100%" : "12%" }} /></div></div>
          <div className="sources-line"><div className="source-stack"><span>B</span><span>M</span><span>+</span></div><span>{guidelineCount ? `${guidelineCount} active brand source${guidelineCount === 1 ? "" : "s"}` : "Sample sources only"}</span><button onClick={onLibrary}>Manage <ArrowRight size={13} /></button></div>
        </section>
      </div>
      <section className="quick-start">
        <div className="quick-icon"><Sparkles size={19} /></div><div className="quick-copy"><strong>Before your next big send</strong><p>Give every draft a second set of brand-aware eyes.</p></div><div className="quick-actions"><button className="button-secondary" onClick={onLibrary}><BookOpenText size={15} /> Add guidelines</button><button className="button-primary" onClick={onNew}>Review content <ArrowRight size={15} /></button></div>
      </section>
      <p className="demo-footnote"><span><Shield size={13} /></span> AI suggestions never publish automatically. Your team always has the final say.</p>
    </>
  );
}

function MetricCard({ label, value, icon, trend, trendIcon, note, warning = false, sample = false }: { label: string; value: string; icon: React.ReactNode; trend: string; trendIcon: React.ReactNode; note: string; warning?: boolean; sample?: boolean }) {
  return <section className={`metric-card ${sample ? "metric-card-sample" : ""}`}><div className="metric-top"><span>{label}</span><span className={`metric-icon ${warning ? "metric-warning" : ""}`}>{icon}</span></div><div className="metric-bottom"><strong>{value}</strong>{sample ? <span className="metric-sample-label">SAMPLE DATA</span> : <span className={warning ? "trend-warm" : ""}>{trendIcon}{trend}<small>{note}</small></span>}</div></section>;
}

function StatusBadge({ status }: { status: Review["status"] }) {
  const kind = status === "Approved" ? "status-approved" : status === "Needs edits" ? "status-edits" : "status-review";
  return <span className={`status-badge ${kind}`}><i />{status}</span>;
}

function BrandLibrary({ guidelines, onUpload, onRemove, onNew, onAddSample }: { guidelines: Guideline[]; onUpload: (event: ChangeEvent<HTMLInputElement>) => void; onRemove: (id: string) => void; onNew: () => void; onAddSample: () => void }) {
  return <>
    <div className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-dot" /> KNOWLEDGE BASE</div><h1>Your brand’s <em>source of truth.</em></h1><p className="page-subtitle">Give every review the context it needs to keep your voice unmistakably yours.</p></div><label className="button-primary upload-button"><Plus size={17} /> Add guidelines<input type="file" accept=".txt,.md,text/plain,text/markdown" multiple onChange={onUpload} /></label></div>
    <div className="library-intro"><div className="library-intro-icon"><BookOpenText size={20} /></div><div><strong>Ground AI reviews in your approved guidance</strong><p>Upload voice, messaging, terminology, and policy guidelines as plain text or Markdown files.</p></div><span className="supported-format">.TXT&nbsp;&nbsp; .MD</span></div>
    {guidelines.length ? <section className="surface-card library-table-card"><div className="section-heading"><div><h2>Brand sources <span className="heading-count">{guidelines.length}</span></h2><p>These sources are shared with each review request.</p></div><button className="button-secondary compact" onClick={onNew}><Sparkles size={15} /> Test a draft</button></div><div className="document-table"><div className="document-header"><span>DOCUMENT</span><span>ADDED</span><span>STATUS</span><span /></div>{guidelines.map((item) => <div className="document-row" key={item.id}><div className="document-name"><span className="doc-icon"><FileText size={17} /></span><span><strong>{item.name}</strong><small>{item.text.length.toLocaleString()} characters · local workspace</small></span></div><span className="document-date">{item.added}</span><span className="indexed-status"><CheckCircle2 size={14} /> Ready</span><button className="icon-button subtle" onClick={() => onRemove(item.id)} aria-label={`Remove ${item.name}`}><X size={16} /></button></div>)}</div></section> :
      <section className="surface-card empty-library"><div className="empty-art"><div className="empty-sheet"><span /><span /><span /><span /></div><div className="empty-spark"><Sparkles size={18} /></div></div><h2>No brand documents yet</h2><p>Start with your voice and tone guide, messaging pillars, or approved claims. Your review findings will cite this material as evidence.</p><div className="empty-library-actions"><label className="button-primary upload-button"><Upload size={16} /> Upload your first guideline<input type="file" accept=".txt,.md,text/plain,text/markdown" multiple onChange={onUpload} /></label><button className="button-secondary" onClick={onAddSample}><Sparkles size={14} /> Try sample rules</button></div><small>Supports plain text and Markdown · Max 12,000 characters per review source</small></section>}
  </>;
}

function ReviewHistory({ reviews, query, onQuery, onSelect, onNew }: { reviews: Review[]; query: string; onQuery: (value: string) => void; onSelect: (id: string) => void; onNew: () => void }) {
  return <>
    <div className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-dot" /> CONTENT GOVERNANCE</div><h1>Every review, <em>accounted for.</em></h1><p className="page-subtitle">A clear trail from first draft to human decision.</p></div><button className="button-primary" onClick={onNew}><Plus size={17} /> New review</button></div>
    <section className="surface-card history-card"><div className="history-toolbar"><div><h2>Review history <span className="heading-count">{reviews.length}</span></h2><p>Open any review to inspect findings and approval status.</p></div><div className="toolbar-controls"><label className="search-field"><Search size={16} /><input value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Search reviews" /></label><button className="button-secondary compact"><Filter size={15} /> Filter <ChevronDown size={14} /></button></div></div>
      {reviews.length ? <div className="document-table"><div className="history-header"><span>CONTENT</span><span>DATE</span><span>FINDINGS</span><span>DECISION</span><span /></div>{reviews.map((review) => <button className="history-row" key={review.id} onClick={() => onSelect(review.id)}><span className="history-title"><span className="doc-icon"><FileText size={17} /></span><strong>{review.title}</strong></span><span>{review.createdAt}</span><span className={review.findings.some((f) => f.severity === "High") ? "count-high" : ""}>{review.findings.length} {review.findings.length === 1 ? "finding" : "findings"}</span><StatusBadge status={review.status} /><ArrowRight size={15} className="row-chevron" /></button>)}</div> :
        <div className="empty-history"><div><Clock3 size={21} /></div><h3>No matching reviews</h3><p>Run your first brand review to begin building a history.</p><button className="button-secondary compact" onClick={onNew}><Plus size={15} /> Start a review</button></div>}</section>
  </>;
}

function Analytics({ reviews, completedReviews, attentionCount, allFindings }: { reviews: Review[]; completedReviews: number; attentionCount: number; allFindings: number }) {
  const isSample = reviews.every((review) => review.id.startsWith("sample-"));
  const approvedCount = reviews.filter((review) => review.status === "Approved").length;
  const inReviewCount = reviews.filter((review) => review.status === "In review").length;
  const statusCounts = [
    { label: "Approved", count: isSample ? 18 : approvedCount, color: "bar-green" },
    { label: "Needs edits", count: isSample ? 3 : attentionCount, color: "bar-amber" },
    { label: "In review", count: isSample ? 3 : inReviewCount, color: "bar-blue" },
  ];
  const max = Math.max(1, ...statusCounts.map((item) => item.count));
  const findingsCount = isSample ? 38 : allFindings;
  return <>
    <div className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-dot" /> INSIGHTS</div><h1>Consistency you can <em>measure.</em></h1><p className="page-subtitle">A snapshot of how your team keeps content on brand.</p></div><div className="date-filter"><Clock3 size={15} /> Last 30 days <ChevronDown size={14} /></div></div>
    <div className="metrics-grid analytics-metrics"><MetricCard label="Reviews completed" value={String(isSample ? 24 : completedReviews)} icon={<FileText size={17} />} trend={isSample ? "" : "In your workspace"} trendIcon={<ArrowRight size={14} />} note="" sample={isSample} /><MetricCard label="Approved" value={String(isSample ? 18 : approvedCount)} icon={<BadgeCheck size={17} />} trend={isSample ? "" : "Human approved"} trendIcon={<ArrowRight size={14} />} note="" sample={isSample} /><MetricCard label="Needs attention" value={String(isSample ? 3 : attentionCount)} icon={<ShieldAlert size={17} />} trend={isSample ? "" : "Awaiting edits"} trendIcon={<ArrowRight size={14} />} note="" warning sample={isSample} /><MetricCard label="Findings flagged" value={String(findingsCount)} icon={<CheckCircle2 size={17} />} trend={isSample ? "" : "Across reviews"} trendIcon={<ArrowRight size={14} />} note="" sample={isSample} /></div>
    <div className="analytics-grid"><section className="surface-card analytics-chart"><div className="section-heading"><div><h2>Review decisions</h2><p>How content moves through approval</p></div><span className="chart-period">{isSample ? "Example data" : "Your workspace"}</span></div><div className="bar-chart">{statusCounts.map((item) => <div className="bar-row" key={item.label}><span>{item.label}</span><div className="bar-track"><i className={item.color} style={{ width: `${Math.max(7, (item.count / max) * 100)}%` }} /></div><strong>{item.count}</strong></div>)}</div><div className="chart-footnote"><span><i /> {isSample ? "Example metrics for the demo" : "Live data from your browser workspace"}</span><span>{reviews.length} review{reviews.length === 1 ? "" : "s"} shown</span></div></section>
    <section className="surface-card insight-card"><div className="insight-icon"><Sparkles size={18} /></div><span className="eyebrow">A THOUGHTFUL NUDGE</span><h2>Little edits.<br /><em>Lasting consistency.</em></h2><p>Keep your brand guidance up to date. The clearer your sources, the more useful every review becomes.</p><div className="insight-rule" /><div className="insight-stat"><span>Brand library sources</span><strong>Manage in Brand library <ArrowRight size={14} /></strong></div></section></div>
  </>;
}

function ReviewDetail({ review, onBack, onApply, onDecision, onContentChange }: { review: Review; onBack: () => void; onApply: (finding: Finding) => void; onDecision: (status: "Approved" | "Needs edits") => void; onContentChange: (content: string) => void }) {
  const [activeFinding, setActiveFinding] = useState(0);
  const finding = review.findings[activeFinding];
  return <>
    <button className="back-link" onClick={onBack}><ArrowLeft size={15} /> Back to {review.status === "Approved" ? "dashboard" : "reviews"}</button>
    <div className="detail-heading"><div><div className="eyebrow"><span className="eyebrow-dot" /> BRAND REVIEW <span className="crumb-slash">/</span> {review.createdAt}</div><h1>{review.title}</h1><p className="page-subtitle">Review the findings, make any edits, then record your decision.</p><span className={`review-engine-badge ${review.reviewMode === "local-rules" ? "engine-local" : "engine-ai"}`}>{review.reviewMode === "local-rules" ? <><ShieldCheck size={13} /> Local rules scan · not AI</> : <><Sparkles size={13} /> {review.reviewMode === "ai" ? "AI review" : "Sample review"}</>}</span></div><StatusBadge status={review.status} /></div>
    <div className="detail-summary"><div className="summary-item"><span>Findings</span><strong>{review.findings.length}</strong></div><div className="summary-divider" /><div className="summary-item"><span>High severity</span><strong className={review.findings.some((item) => item.severity === "High") ? "text-red" : ""}>{review.findings.filter((item) => item.severity === "High").length}</strong></div><div className="summary-divider" /><div className="summary-item"><span>Human decision</span><strong>{review.status === "Approved" ? "Approved" : review.status === "Needs edits" ? "Changes requested" : "Pending"}</strong></div><span className="human-required"><Shield size={14} /> Human review required</span></div>
    <div className="detail-grid"><section className="surface-card submitted-copy"><div className="section-heading"><div><h2>Submitted content</h2><p>Apply a suggestion to update this working draft.</p></div><span className="draft-label">WORKING DRAFT</span></div><textarea value={review.content} onChange={(event) => onContentChange(event.target.value)} aria-label="Editable review draft" />{review.status !== "Approved" && <div className="draft-actions"><span>Edits are saved in this browser</span><button className="button-secondary compact" onClick={() => onDecision("Needs edits")}>Request changes</button><button className="button-primary compact" onClick={() => onDecision("Approved")}><Check size={15} /> Approve</button></div>}</section>
      <section className="surface-card findings-card"><div className="section-heading"><div><h2>Review findings <span className="heading-count">{review.findings.length}</span></h2><p>Evidence-backed suggestions from your brand sources</p></div><Sparkles size={17} className="findings-spark" /></div>{finding ? <><div className="finding-tabs">{review.findings.map((item, index) => <button key={`${item.title}-${index}`} className={activeFinding === index ? "finding-tab active" : "finding-tab"} onClick={() => setActiveFinding(index)}><span className={`severity-dot severity-${item.severity.toLowerCase()}`} />{item.title}</button>)}</div><div className="finding-detail"><div className="finding-title-line"><h3>{finding.title}</h3><span className={`severity-tag severity-${finding.severity.toLowerCase()}`}>{finding.severity} severity</span></div><p>{finding.explanation}</p><div className="confidence-line"><span>{review.reviewMode === "local-rules" ? "Rule match confidence" : "AI confidence"}</span><strong>{finding.confidence}%</strong></div><div className="confidence-track"><i style={{ width: `${finding.confidence}%` }} /></div><div className="evidence-box"><div className="evidence-heading"><BookOpenText size={14} /><strong>BRAND EVIDENCE</strong></div><blockquote>“{finding.evidence}”</blockquote><span className="evidence-source"><FileText size={13} /> {finding.source}</span></div><div className="suggestion-box"><span className="suggestion-label"><Sparkles size={13} /> SUGGESTED CORRECTION</span><p>{finding.suggestion}</p><button className="button-secondary compact" onClick={() => onApply(finding)}>Apply to draft <ArrowRight size={14} /></button></div></div></> : <div className="no-findings"><div><ShieldCheck size={22} /></div><h3>No brand issues found</h3><p>{review.reviewMode === "local-rules" ? "No supported rules matched this draft. This local scan is not an AI review; check the copy manually as well." : "This content passed its brand review. A human reviewer still needs to record the final decision."}</p></div>}</section></div>
    {review.status === "Approved" && <div className="decision-note"><CheckCircle2 size={17} /> This review has been approved by a human reviewer. AI suggestions are advisory only.</div>}
  </>;
}
