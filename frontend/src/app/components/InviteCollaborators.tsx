import React, { useState, useEffect, useCallback } from "react";
import "./InviteCollaborators.css";

type Collaborator = {
  user_ID: string;
  fname: string;
  sname: string;
  department: string;
  acc_role: string;
  res_area?: string;
  qualification?: string;
};

interface InviteCollaboratorsProps {
  projectId: string;
  projectTitle: string;
  projectDescription: string;
  onClose: () => void;
}

const InviteCollaborators: React.FC<InviteCollaboratorsProps> = ({
  projectId,
  projectTitle,
  projectDescription,
  onClose,
}) => {
  const [search, setSearch] = useState("");
  const [searchType, setSearchType] = useState("name");
  const [results, setResults] = useState<Collaborator[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  // Reset state when the component mounts or projectId changes
  useEffect(() => {
    setSearch("");
    setSearchType("name");
    setResults([]);
    setSelected([]);
    setLoading(false);
    setError(null);
    setInviteLoading(false);
  }, [projectId]);

  // Validate search input based on search type
  const validateSearch = (value: string, type: string): boolean => {
    if (!value.trim()) return false;

    switch (type) {
      case "name":
        // Allow letters, spaces, and basic punctuation for names
        return /^[a-zA-Z\s\-']{2,50}$/.test(value.trim());
      case "skill":
        // Allow letters, numbers, spaces, and basic punctuation for skills
        return /^[a-zA-Z0-9\s\-_.,&()]{2,50}$/.test(value.trim());
      case "position":
        // Allow letters, spaces, and basic punctuation for positions
        return /^[a-zA-Z\s\-_.,&()]{2,50}$/.test(value.trim());
      default:
        return false;
    }
  };

  const handleSearch = useCallback(async (searchTerm: string, type: string) => {
    if (!validateSearch(searchTerm, type)) {
      setError(`Please enter a valid ${type} (2-50 characters, no special characters)`);
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("jwt");
      if (!token) throw new Error("Not authenticated");

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/collaborations/search`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ searchTerm: searchTerm.trim(), searchType: type }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Search failed");
      }

      const data = await res.json();
      // Limit results to 5 users
      setResults((data.collaborators || []).slice(0, 5));
    } catch (err: any) {
      setError(err.message || "Search error");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle search input changes with debounce
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setError(null);

    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Set new timeout for search
    const timeout = setTimeout(() => {
      if (value.trim()) {
        handleSearch(value, searchType);
      } else {
        setResults([]);
      }
    }, 300); // 300ms debounce

    setSearchTimeout(timeout);
  };

  const handleSelect = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };

  const handleInvite = async () => {
    setInviteLoading(true);
    try {
      const token = localStorage.getItem("jwt");
      if (!token) throw new Error("Not authenticated");

      for (const userId of selected) {
        const res = await fetch(`${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/collaborations/invite`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            project_ID: projectId,
            recipient_ID: userId,
            proposed_role: "Collaborator",
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to send invitation");
        }
      }

      alert(
        `Invitations sent to: ${results
          .filter((u) => selected.includes(u.user_ID))
          .map((u) => u.fname + " " + u.sname)
          .join(", ")}\n\nProject: ${projectTitle}\n${projectDescription}`
      );
      setSelected([]);
      setResults([]);
      setSearch("");
      onClose();
    } catch (err: any) {
      setError("Error sending invitations: " + (err.message || err));
    } finally {
      setInviteLoading(false);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  return (
    <section className="modal-overlay">
      <section 
        className="invite-container"
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-collaborators-title"
      >
        <header>
          <h2 className="title" id="invite-collaborators-title">Invite Collaborators</h2>
        </header>

        <section className="search-form">
          <select
            className="search-input"
            value={searchType}
            onChange={(e) => {
              setSearchType(e.target.value);
              if (search.trim()) {
                handleSearch(search, e.target.value);
              }
            }}
          >
            <option value="name">Name</option>
            <option value="skill">Skill set</option>
            <option value="position">Position</option>
          </select>
          <input
            className="search-input"
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={`Search by ${searchType}`}
            maxLength={50}
          />
        </section>
        {error && <p className="error-message">{error}</p>}
        {loading && <p className="loading-message">Searching...</p>}

        <section className="results-container">
          {results.length === 0 && !loading && search.trim() && <p>No results found.</p>}
          {results.map((u) => (
            <section className="user-entry" key={u.user_ID} data-testid="user-section">
              <input
                type="checkbox"
                checked={selected.includes(u.user_ID)}
                onChange={() => handleSelect(u.user_ID)}
                data-testid="user-checkbox"
              />
              <p data-testid="user-info">
                <strong>
                  {u.fname} {u.sname}
                </strong>{" "}
                | {u.acc_role} | {u.res_area || ""}
                {u.qualification ? ` | ${u.qualification}` : ""}
              </p>
            </section>
          ))}
        </section>
        <footer className="action-buttons">
          <button onClick={onClose} className="cancel-button">
            Cancel
          </button>

          <button
            onClick={handleInvite}
            disabled={selected.length === 0 || inviteLoading}
            className="invite-button"
          >
            {inviteLoading ? "Sending..." : "Send Invitation"}
          </button>
        </footer>
      </section>
    </section>
  );
};

export default InviteCollaborators;
