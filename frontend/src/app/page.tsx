"use client";
import styles from "./page.module.css";
import { useRouter } from "next/navigation";
import { useReducer, useRef } from "react";
import ScrollIndicator from "./ScrollIndicator";

export default function Home() {
  const router = useRouter();

  // Section refs for smooth scrolling
  const featuresRef = useRef<HTMLElement | null>(null);
  const howItWorksRef = useRef<HTMLElement | null>(null);

  const handleRedirect = () => {
    router.push("/login");
  };

  const scrollToFeatures = () => {
    featuresRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  const scrollToHowItWorks = () => {
    howItWorksRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <button
          onClick={() => (window.location.href = "/")}
          className={styles.logo}
        >
          ThinkSync
        </button>
        <nav className={styles.nav} aria-label="Main navigation">
          <button className={styles.loginButton} onClick={handleRedirect}>
            login
          </button>
          <button className={styles.signupButton} onClick={handleRedirect}>
            sign up
          </button>
        </nav>
      </header>
      <section className={styles.hero}>
        <article className={styles.textBlock}>
          <h2>Connect, Collaborate, Manage Resources with Ease</h2>
          <p>
            A web platform designed to help university researchers find
            partners, share resources, and track project progress
          </p>
          <button className={styles.cta} onClick={scrollToFeatures}>
            Learn more ↓
          </button>
        </article>
        <figure className={styles.imageBlock}>
          <figcaption hidden>Decorative Glass Card</figcaption>
          <aside className={styles.glassCard}></aside>
        </figure>
      </section>
      <ScrollIndicator />

      {/* Key Features Section */}
      <section
        ref={featuresRef}
        style={{ background: "#e8eaeb", padding: "3rem 0" }}
        aria-labelledby="key-features-title"
      >
        <h2
          id="key-features-title"
          style={{
            textAlign: "center",
            marginBottom: "2.5rem",
            fontWeight: 700,
          }}
        >
          Key Features
        </h2>
        <ul
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "2rem",
            listStyle: "none",
            padding: 0,
            margin: 0,
          }}
          aria-label="Feature cards"
        >
          {[{
            icon: "👥",
            title: "Find Research Partners",
            desc: "Connect with other researchers based on interests, skills, and project needs."
          }, {
            icon: "📄",
            title: "Share Resources",
            desc: "Easily share documents, data, and other research materials with your collaborators."
          }, {
            icon: "📊",
            title: "Track Progress",
            desc: "Monitor project milestones, deadlines, and contributions from team members."
          }].map((feature) => (
            <li
              key={feature.title}
              style={{
                background: "#fff",
                borderRadius: 12,
                boxShadow: "0 2px 12px #0001",
                padding: "2rem",
                minWidth: 240,
                maxWidth: 340,
                flex: "1 1 260px",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
              }}
            >
              <strong style={{ fontSize: 32, color: "#b2e0e6", marginBottom: 8 }}>
                {feature.icon}
              </strong>
              <strong>{feature.title}</strong>
              <p style={{ marginTop: 8, color: "#222", fontSize: 15 }}>
                {feature.desc}
              </p>
            </li>
          ))}
        </ul>
        <section style={{ textAlign: "center", marginTop: "2rem" }}>
          <button className={styles.cta} onClick={scrollToHowItWorks}>
            How it works ↓
          </button>
        </section>
      </section>

      {/* How It Works Section */}
      <section ref={howItWorksRef} style={{ padding: "3rem 0 2rem 0" }} aria-labelledby="how-it-works-title">
        <h2
          id="how-it-works-title"
          style={{
            textAlign: "center",
            marginBottom: "2.5rem",
            fontWeight: 700,
          }}
        >
          How It Works
        </h2>
        <ol style={{ maxWidth: 540, margin: "0 auto", padding: 0, listStyle: "none" }}>
          {[
            {
              title: "Create Your Profile",
              description:
                "Sign up and create a detailed profile highlighting your research interests and expertise.",
            },
            {
              title: "Connect with Researchers",
              description:
                "Search for and connect with other researchers who share your interests or have complementary skills.",
            },
            {
              title: "Collaborate on Projects",
              description:
                "Create project spaces, invite collaborators, and work together efficiently.",
            },
            {
              title: "Track and Share Progress",
              description:
                "Monitor project milestones, share resources, and keep everyone updated on progress.",
            },
          ].map((step, idx) => (
            <li
              key={step.title}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 20,
                marginBottom: 28,
              }}
            >
              <strong
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  background: "#b2e0e6",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 18,
                  marginRight: 8,
                  flexShrink: 0,
                }}
                aria-label={`Step ${idx + 1}`}
              >
                {idx + 1}
              </strong>
              <article style={{ flex: 1 }}>
                <strong style={{ fontSize: 18 }}>{step.title}</strong>
                <p style={{ color: "#444", fontSize: 15, marginTop: 2 }}>
                  {step.description}
                </p>
              </article>
            </li>
          ))}
        </ol>
      </section>

      {/* Footer */}
      <footer
        style={{
          background: "#10131a",
          color: "#b2e0e6",
          textAlign: "center",
          padding: "1.5rem 0 1rem 0",
          fontSize: 15,
        }}
      >
        &copy; {new Date().getFullYear()} ThinkSync. All rights reserved.
      </footer>
    </main>
  );
}
