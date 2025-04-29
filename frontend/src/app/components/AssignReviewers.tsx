import React, { useState, useEffect } from "react";
import "./AssignReviewer.css";

type Reviewer = {
  user_ID: string;
  fname: string;
  sname: string;
  department: string;
  acc_role: string;
  qualification?: string;
};

interface AssignReviewerProps {
  projectId: string;
  onClose: () => void;
}

const AssignReviewer: React.FC<AssignReviewerProps> = ({
  projectId,
  onClose,
}) => {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Reviewer[]>([]);
  const [selectedReviewer, setSelectedReviewer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSearch("");
    setResults([]);
    setSelectedReviewer(null);
    setError(null);
    setLoading(false);
    setAssigning(false);
  }, [projectId]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResults([]);
    try {
      const token = localStorage.getItem("jwt");
      if (!token) throw new Error("Not authenticated");

      const res = await fetch("http://localhost:5000/api/reviewers/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          searchTerm: search,
          searchType: "qualification",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Search failed");
      }

      const data = await res.json();
      setResults(data.reviewers || []);
    } catch (err: any) {
      setError(err.message || "Search error");
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedReviewer) return;

    setAssigning(true);
    try {
      const token = localStorage.getItem("jwt");
      if (!token) throw new Error("Not authenticated");

      const res = await fetch("http://localhost:5000/api/reviewers/assign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          project_ID: projectId,
          reviewer_ID: selectedReviewer,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Assignment failed");
      }

      const reviewer = results.find((r) => r.user_ID === selectedReviewer);
      alert(`Reviewer assigned: ${reviewer?.fname} ${reviewer?.sname}`);
      onClose();
    } catch (err: any) {
      alert("Error assigning reviewer: " + (err.message || err));
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="assign-reviewer-container">
        <h2 className="title">Assign Reviewer </h2>
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            className="search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by qualification"
          />
          <button type="submit" disabled={loading} className="search-button">
            {loading ? "Searching..." : "Search"}
          </button>
        </form>

        {error && <p className="error-message">{error}</p>}

        <div className="results-list">
          {results.length === 0 && !loading && (
            <p className="no-results">No results.</p>
          )}
          {results.map((r) => (
            <label key={r.user_ID} className="reviewer-option">
              <input
                type="radio"
                name="reviewer"
                checked={selectedReviewer === r.user_ID}
                onChange={() => setSelectedReviewer(r.user_ID)}
              />
              <span>
                <strong>
                  {r.fname} {r.sname}
                </strong>{" "}
                | {r.acc_role} {r.qualification ? `| ${r.qualification}` : ""}
              </span>
            </label>
          ))}
        </div>

        <div className="action-buttons">
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
        </div>
      </div>
    </div>
  );
};

export default AssignReviewer;
