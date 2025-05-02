"use client";

import React, { useEffect, useState, useRef } from "react";
import styles from "./page.module.css";
import { useRouter } from "next/navigation";

interface Attachment {
  attachment_ID: number;
  file_name: string;
  file_url: string;
}

interface Message {
  message_ID: number;
  sender_ID: number;
  receiver_ID: number;
  subject: string;
  body: string;
  sent_at: string;
  is_read: boolean;
  sender_name: string;
  project_title: string | null;
  attachments: Attachment[];
}

const Page = () => {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [groupedCounts, setGroupedCounts] = useState<Record<number, number>>(
    {}
  );
  const [activeTab, setActiveTab] = useState("my");
  const [newMessage, setNewMessage] = useState({
    receiver_ID: "",
    subject: "",
    body: "",
    project_ID: "",
  });
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  //////////Un comment back end call and delte / comment out test data under this /////////////
  /*useEffect(() => {
    const fetchMessages = async () => {
      const token = localStorage.getItem("jwt");
      const response = await fetch("http://localhost:5000/api/messages", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      const counts: Record<number, number> = {};
      data.forEach((msg: Message) => {
        counts[msg.sender_ID] = (counts[msg.sender_ID] || 0) + 1;
      });

      setGroupedCounts(counts);
      setMessages(data);
    };

    fetchMessages();
  }, []);*/

  useEffect(() => {
    // Mock message data for testing
    const mockData: Message[] = [
      {
        message_ID: 1,
        sender_ID: 101,
        receiver_ID: 999,
        subject: "Project Sync",
        body: "Hey, are you available to discuss the ThinkSync project timeline?",
        sent_at: "2025-05-01T09:30:00Z",
        is_read: false,
        sender_name: "Alice Johnson",
        project_title: "ThinkSync",
        attachments: [],
      },
      {
        message_ID: 2,
        sender_ID: 102,
        receiver_ID: 999,
        subject: "Re: Requirements",
        body: "Here are the updated requirements for the AI module.",
        sent_at: "2025-05-01T10:15:00Z",
        is_read: true,
        sender_name: "Bob Smith",
        project_title: "AI Enhancer",
        attachments: [
          {
            attachment_ID: 1,
            file_name: "requirements.pdf",
            file_url: "http://localhost:5000/files/requirements.pdf",
          },
        ],
      },
      {
        message_ID: 3,
        sender_ID: 101,
        receiver_ID: 999,
        subject: "Follow-up",
        body: "Just checking if you received the last document.",
        sent_at: "2025-05-01T11:00:00Z",
        is_read: false,
        sender_name: "Alice Johnson",
        project_title: "ThinkSync",
        attachments: [],
      },
      {
        message_ID: 4,
        sender_ID: 999,
        receiver_ID: 101,
        subject: "RE: Follow-up",
        body: "Yes, I got it. I'll review by this evening.",
        sent_at: "2025-05-01T11:30:00Z",
        is_read: true,
        sender_name: "You",
        project_title: "ThinkSync",
        attachments: [],
      },
    ];

    const counts: Record<number, number> = {};
    mockData.forEach((msg: Message) => {
      counts[msg.sender_ID] = (counts[msg.sender_ID] || 0) + 1;
    });

    setGroupedCounts(counts);
    setMessages(mockData);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length + attachments.length > 5) {
      alert("You can attach up to 5 files.");
      return;
    }
    setAttachments([...attachments, ...selectedFiles]);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("jwt");
    const formData = new FormData();

    Object.entries(newMessage).forEach(([key, value]) => {
      formData.append(key, value);
    });

    attachments.forEach((file) => {
      formData.append("attachments", file);
    });

    const response = await fetch("http://localhost:5000/api/messages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (response.ok) {
      alert("Message sent!");
      setNewMessage({ receiver_ID: "", subject: "", body: "", project_ID: "" });
      setAttachments([]);
      fileInputRef.current?.value && (fileInputRef.current.value = "");
    } else {
      alert("Failed to send message.");
    }
  };

  return (
    <main className={styles.container}>
      <nav className={styles.sidebar}>
        <h2>ThinkSync</h2>
        <h3>Messages</h3>

        <ul>
          <li>
            <button
              type="button"
              onClick={() => {
                setActiveTab("my");
                router.push("/dashboard");
              }}
              className={activeTab === "my" ? styles.active : ""}
            >
              My Projects
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => {
                setActiveTab("shared");
                router.push("/Shared_projects");
              }}
              className={activeTab === "shared" ? styles.active : ""}
            >
              Shared Projects
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => {
                setActiveTab("messager");
                router.push("/messager");
              }}
              className={activeTab === "messager" ? styles.active : ""}
            >
              Messager
            </button>
          </li>
        </ul>
      </nav>

      <section className={styles.mainContent}>
        <header className={styles.heading}>
          <h2>My Messages</h2>
        </header>

        <section className={styles.buttonHeader}>
          <section className={styles.searchContainer}>
            <input
              className={styles.searchInput}
              type="text"
              placeholder="Search Users..."
            />
          </section>
        </section>

        {/*message section  */}
        <section className={styles.messagingContainer}>
          <aside className={styles.userList}>
            <h2 className={styles.inboxTitle}>Inbox</h2>
            <ul className={styles.previewList}>
              {Object.entries(groupedCounts).map(([sender_ID]) => {
                const msg = messages.find(
                  (m) => m.sender_ID === Number(sender_ID)
                );
                if (!msg) return null;

                return (
                  <li
                    key={sender_ID}
                    className={styles.previewItem}
                    onClick={() => setSelectedUser(Number(sender_ID))}
                  >
                    <section className={styles.previewContent}>
                      <strong className={styles.previewName}>
                        {msg.sender_name}
                      </strong>
                      <p className={styles.previewText}>
                        {msg.body.slice(0, 30)}...
                      </p>
                    </section>
                  </li>
                );
              })}
            </ul>
          </aside>

          {selectedUser && (
            <section className={styles.chatWindow}>
              <header className={styles.chatHeader}>
                <h3>
                  Chat with{" "}
                  {
                    messages.find((m) => m.sender_ID === selectedUser)
                      ?.sender_name
                  }
                </h3>
              </header>

              <ul className={styles.chatMessages}>
                {messages
                  .filter(
                    (msg) =>
                      msg.sender_ID === selectedUser ||
                      msg.receiver_ID === selectedUser
                  )
                  .map((msg) => (
                    <li key={msg.message_ID} className={styles.chatBubble}>
                      <article>
                        <p>{msg.body}</p>
                        <time>
                          {new Date(msg.sent_at).toLocaleTimeString()}
                        </time>
                      </article>
                    </li>
                  ))}
              </ul>

              <form className={styles.messageForm} onSubmit={sendMessage}>
                <textarea
                  placeholder="Type a message..."
                  value={newMessage.body}
                  onChange={(e) =>
                    setNewMessage({
                      ...newMessage,
                      body: e.target.value,
                      receiver_ID: String(selectedUser),
                    })
                  }
                  required
                />
                <input
                  className={styles.files}
                  type="file"
                  multiple
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="*"
                />
                <button type="submit">Send</button>
              </form>
            </section>
          )}
        </section>
      </section>
    </main>
  );
};
export default Page;
