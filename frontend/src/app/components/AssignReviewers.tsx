import React, { useState, useEffect } from "react";
import "./AssignReviewer.css";

type Reviewer = {
  user_ID: string;
  fname: string;
  sname: string;
  department: string;
  acc_role: string;
  qualification?: string;
  research_area?: string;
};

interface AssignReviewerProps {
  projectId: string;
  onClose: () => void;
  onAssignSuccess: () => void;
}

const AssignReviewer: React.FC<AssignReviewerProps> = ({
  projectId,
  onClose,
  onAssignSuccess,
}) => {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Reviewer[]>([]);
  const [selectedReviewer, setSelectedReviewer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{
    search?: string;
    reviewer?: string;
  }>({});

  useEffect(() => {
    setSearch("");
    setResults([]);
    setSelectedReviewer(null);
    setError(null);
    setLoading(false);
    setAssigning(false);
    setValidationErrors({});
  }, [projectId]);

  // Debounce search to prevent too many API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search.trim().length > 0) {
        handleSearch();
      } else {
        setResults([]);
      }
    }, 300); // 300ms delay

    return () => clearTimeout(timer);
  }, [search]);

  const validateForm = () => {
    const errors: typeof validationErrors = {};
    let isValid = true;

    // Validate search input
    if (!search.trim()) {
      errors.search = "Please enter a research area to search";
      isValid = false;
    }

    // Validate reviewer selection
    if (!selectedReviewer) {
      errors.reviewer = "Please select a reviewer";
      isValid = false;
    }

    setValidationErrors(errors);
    return isValid;
  };

  const handleSearch = async () => {
    if (!search.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);
    setValidationErrors({});

    try {
      const token = localStorage.getItem("jwt");
      if (!token) throw new Error("Not authenticated");

      const res = await fetch(`${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/admin/reviewers/search?research_area=${encodeURIComponent(search.trim())}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        }
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Search failed");
      }

      const data = await res.json();
      // Limit results to 5 users
      setResults((data.reviewers || []).slice(0, 5));
    } catch (err: any) {
      setError(err.message || "Search error");
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!validateForm()) {
      return;
    }

    setAssigning(true);
    setError(null);
    try {
      const token = localStorage.getItem("jwt");
      if (!token) throw new Error("Not authenticated");

      const res = await fetch(`${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/admin/projects/${projectId}/assign-reviewer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reviewerId: selectedReviewer
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Assignment failed");
      }

      onAssignSuccess();
      onClose();
    } catch (err: any) {
      setError("Error assigning reviewer: " + (err.message || err));
    } finally {
      setAssigning(false);
    }
  };

  return (
    <section className="modal-overlay">
      <article className="assign-reviewer-container">
        <header>
          <h2 className="title">Assign Reviewer</h2>
        </header>

        <form className="search-form">
          <input
            type="text"
            className={`search-input ${validationErrors.search ? 'input-error' : ''}`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by research area"
            maxLength={100}
          />
          {validationErrors.search && (
            <p className="error-message">{validationErrors.search}</p>
          )}
          {loading && <p className="loading-message">Searching...</p>}
        </form>

        {error && <p className="error-message">{error}</p>}

        <section className="results-list">
          {results.length === 0 && !loading && search.trim() && (
            <p className="no-results">No results found.</p>
          )}
          {results.map((r) => (
            <label key={r.user_ID} className="reviewer-option">
              <input
                type="radio"
                name="reviewer"
                checked={selectedReviewer === r.user_ID}
                onChange={() => {
                  setSelectedReviewer(r.user_ID);
                  setValidationErrors(prev => ({ ...prev, reviewer: undefined }));
                }}
              />
              <article className="reviewer-info">
                <h3 className="reviewer-name">
                  {r.fname} {r.sname}
                </h3>
                <p className="reviewer-details">
                  {r.acc_role} {r.qualification ? `| ${r.qualification}` : ""}
                </p>
                {r.research_area && (
                  <p className="reviewer-research">
                    Research Area: {r.research_area}
                  </p>
                )}
              </article>
            </label>
          ))}
          {validationErrors.reviewer && (
            <p className="error-message">{validationErrors.reviewer}</p>
          )}
        </section>

        <footer className="action-buttons">
          <button onClick={onClose} className="cancel-button">
            Cancel
          </button>
          <button
            onClick={handleAssign}
            disabled={!selectedReviewer || assigning}
            className="assign-button"
          >
            {assigning ? "Assigning..." : "Assign Reviewer"}
          </button>
        </footer>
      </article>
    </section>
  );
};

export default AssignReviewer;
