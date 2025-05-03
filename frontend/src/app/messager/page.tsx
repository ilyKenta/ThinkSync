"use client";

import React, { useEffect, useState, useRef } from "react";
import styles from "./page.module.css";
import { useRouter } from "next/navigation";
import ComposeMessage from './components/ComposeMessage';

interface Attachment {
  attachment_ID: number;
  message_ID: number;
  file_name: string | null;
  file_url: string;
  storage_container?: string;
  blob_name?: string;
  uploaded_at?: string;
}

interface Message {
  message_ID: number;
  sender_ID: number;
  receiver_ID: number;
  subject: string;
  body: string;
  sent_at: string;
  is_read: boolean;
  sender_fname: string;
  sender_sname: string;
  receiver_fname: string;
  receiver_sname: string;
  project_title: string | null;
  attachments: Attachment[];
}

const Page = () => {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [groupedCounts, setGroupedCounts] = useState<Record<number, number>>({});
  const [activeTab, setActiveTab] = useState("my");
  const [newMessage, setNewMessage] = useState({
    receiver_ID: "",
    subject: "",
    body: "",
    project_ID: "",
  });
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCompose, setShowCompose] = useState(false);
  //////////Un comment back end call and delte / comment out test data under this /////////////
  useEffect(() => {
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

      console.log('Fetched messages:', data);

      setGroupedCounts(counts);
      setMessages(data);
    };

    fetchMessages();
  }, []);

  // useEffect(() => {
  //   // Mock message data for testing
  //   const mockData: Message[] = [
  //     {
  //       message_ID: 1,
  //       sender_ID: 101,
  //       receiver_ID: 999,
  //       subject: "Project Sync",
  //       body: "Hey, are you available to discuss the ThinkSync project timeline?",
  //       sent_at: "2025-05-01T09:30:00Z",
  //       is_read: false,
  //       sender_fname: "Alice",
  //       sender_sname: "Johnson",
  //       receiver_fname: "You",
  //       receiver_sname: "",
  //       project_title: "ThinkSync",
  //       attachments: [],
  //     },
  //     {
  //       message_ID: 2,
  //       sender_ID: 102,
  //       receiver_ID: 999,
  //       subject: "Re: Requirements",
  //       body: "Here are the updated requirements for the AI module.",
  //       sent_at: "2025-05-01T10:15:00Z",
  //       is_read: true,
  //       sender_fname: "Bob",
  //       sender_sname: "Smith",
  //       receiver_fname: "You",
  //       receiver_sname: "",
  //       project_title: "AI Enhancer",
  //       attachments: [
  //         {
  //           attachment_ID: 1,
  //           file_name: "requirements.pdf",
  //           file_url: "http://localhost:5000/files/requirements.pdf",
  //         },
  //       ],
  //     },
  //     {
  //       message_ID: 3,
  //       sender_ID: 101,
  //       receiver_ID: 999,
  //       subject: "Follow-up",
  //       body: "Just checking if you received the last document.",
  //       sent_at: "2025-05-01T11:00:00Z",
  //       is_read: false,
  //       sender_fname: "Alice",
  //       sender_sname: "Johnson",
  //       receiver_fname: "You",
  //       receiver_sname: "",
  //       project_title: "ThinkSync",
  //       attachments: [],
  //     },
  //     {
  //       message_ID: 4,
  //       sender_ID: 999,
  //       receiver_ID: 101,
  //       subject: "RE: Follow-up",
  //       body: "Yes, I got it. I'll review by this evening.",
  //       sent_at: "2025-05-01T11:30:00Z",
  //       is_read: true,
  //       sender_fname: "You",
  //       sender_sname: "",
  //       receiver_fname: "Alice",
  //       receiver_sname: "Johnson",
  //       project_title: "ThinkSync",
  //       attachments: [],
  //     },
  //   ];

  //   const counts: Record<number, number> = {};
  //   mockData.forEach((msg: Message) => {
  //     counts[msg.sender_ID] = (counts[msg.sender_ID] || 0) + 1;
  //   });

  //   setGroupedCounts(counts);
  //   setMessages(mockData);
  // }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selectedFiles = Array.from(e.target.files);
    
    // Check file types and sizes
    const validFiles = selectedFiles.filter(file => {
      const fileType = file.type;
      const fileSize = file.size;
      const maxSize = 10 * 1024 * 1024; // 10MB limit
      
      if (fileSize > maxSize) {
        alert(`File ${file.name} is too large. Maximum size is 10MB.`);
        return false;
      }
      
      if (!['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(fileType)) {
        alert(`File ${file.name} is not a supported type. Supported types are: PDF, JPEG, PNG, DOC, DOCX`);
        return false;
      }
      
      return true;
    });

    if (validFiles.length + attachments.length > 5) {
      alert("You can attach up to 5 files.");
      return;
    }
    setAttachments([...attachments, ...validFiles]);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("jwt");
    
    try {
      // First, send the message
      const messageResponse = await fetch("http://localhost:5000/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          receiver_ID: newMessage.receiver_ID,
          subject: newMessage.subject,
          body: newMessage.body,
          project_ID: newMessage.project_ID,
        }),
      });

      if (!messageResponse.ok) {
        throw new Error("Failed to send message");
      }

      const messageData = await messageResponse.json();
      const messageId = messageData.message_ID;

      // Then, upload attachments if any
      if (attachments.length > 0) {
        for (const file of attachments) {
          const formData = new FormData();
          formData.append("file", file);

          const attachmentResponse = await fetch(
            `http://localhost:5000/api/messages/${messageId}/attachments`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
              },
              body: formData,
            }
          );

          if (!attachmentResponse.ok) {
            throw new Error(`Failed to upload attachment: ${file.name}`);
          }
        }
      }

      // Refresh messages after successful send
      const updatedMessages = await fetch("http://localhost:5000/api/messages", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }).then((res) => res.json());

      setMessages(updatedMessages);
      setNewMessage({ receiver_ID: "", subject: "", body: "", project_ID: "" });
      setAttachments([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message. Please try again.");
    }
  };

  const downloadAttachment = async (messageId: number, attachmentId: number, fileName: string) => {
    const token = localStorage.getItem("jwt");
    try {
      const response = await fetch(
        `http://localhost:5000/api/messages/${messageId}/attachments/${attachmentId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to download attachment");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error downloading attachment:", error);
      alert("Failed to download attachment. Please try again.");
    }
  };

  // Group messages by conversation pairs
  const groupedConversations: { [key: string]: Message[] } = {};
  messages.forEach((msg) => {
    // Create a unique key for each conversation pair using a separator that won't conflict with UUIDs
    const conversationKey = [String(msg.sender_ID), String(msg.receiver_ID)]
      .sort()
      .join('|'); // Using pipe as separator since UUIDs use hyphens
    
    if (!groupedConversations[conversationKey]) {
      groupedConversations[conversationKey] = [];
    }
    groupedConversations[conversationKey].push(msg);
  });

  // Get the latest message for each conversation
  const conversationPreviews = Object.entries(groupedConversations).map(([key, msgs]) => {
    const latestMsg = msgs.sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime())[0];
    const currentUserId = localStorage.getItem('user_ID');
    const otherUserId = String(latestMsg.sender_ID) === currentUserId ? String(latestMsg.receiver_ID) : String(latestMsg.sender_ID);
    const otherUserFname = String(latestMsg.sender_ID) === currentUserId ? latestMsg.receiver_fname : latestMsg.sender_fname;
    const otherUserSname = String(latestMsg.sender_ID) === currentUserId ? latestMsg.receiver_sname : latestMsg.sender_sname;
    
    return {
      key,
      latestMsg,
      otherUser: { 
        id: otherUserId, 
        fname: otherUserFname,
        sname: otherUserSname
      }
    };
  });

  // Helper to infer file type from file name
  function getFileType(fileName: string | null | undefined): string {
    if (!fileName || typeof fileName !== 'string') return '';
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (!ext) return '';
    if (ext === 'pdf') return 'pdf';
    if (["jpg", "jpeg", "png", "gif", "bmp", "webp"].includes(ext)) return 'image';
    if (["doc", "docx"].includes(ext)) return 'word';
    return 'other';
  }

  return (
    <main className={styles.container}>
      <nav className={styles.sidebar}>
        <h2>ThinkSync</h2>
        <h3>Messages</h3>

        <menu>
          <li>
            <button
              type="button"
              onClick={() => {
                setActiveTab("my");
                router.push("/researcher-dashboard");
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
        </menu>
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

        <section className={styles.messagingContainer}>
          <aside className={styles.userList}>
            <header className={styles.inboxTitle}>
              <h2>Inbox</h2>
              <button 
                className={styles.composeButton}
                onClick={() => setShowCompose(true)}
              >
                Compose Message
              </button>
            </header>
            <nav className={styles.previewList}>
              {conversationPreviews.length === 0 && (
                <div className={styles.noResults}>No messages yet.</div>
              )}
              {conversationPreviews.map(({ key, latestMsg, otherUser }) => (
                <article
                  key={key}
                  className={styles.previewItem}
                  onClick={() => setSelectedUser(otherUser.id)}
                >
                  <section className={styles.previewContent}>
                    <strong className={styles.previewName}>
                      {otherUser.fname} {otherUser.sname}
                    </strong>
                    <p className={styles.previewText}>
                      {latestMsg.body.slice(0, 30)}...
                    </p>
                  </section>
                </article>
              ))}
            </nav>
          </aside>

          {selectedUser && (
            <section className={styles.chatWindow}>
              <header className={styles.chatHeader}>
                <h3>
                  Chat with{" "}
                  {(() => {
                    const user = conversationPreviews.find(
                      (conv) => conv.otherUser.id === selectedUser
                    )?.otherUser;
                    return user ? `${user.fname} ${user.sname}` : '';
                  })()}
                </h3>
              </header>

              <nav className={styles.chatMessages}>
                {(() => {
                  const currentUserId = localStorage.getItem('user_ID');

                  // Find the conversation that includes both the current user and selected user
                  const conversation = Object.entries(groupedConversations).find(([key]) => {
                    const [user1, user2] = key.split('|');
                    return (user1 === currentUserId && user2 === selectedUser) || 
                           (user1 === selectedUser && user2 === currentUserId);
                  });

                  if (!conversation) {
                    return <div className={styles.noMessages}>No messages in this conversation</div>;
                  }

                  const messages = conversation[1]
                    .sort((a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime());

                  return messages.map((msg) => {
                    const isSelfMessage = String(msg.sender_ID) === String(msg.receiver_ID) && String(msg.sender_ID) === currentUserId;
                    const isSent = String(msg.sender_ID) === currentUserId && !isSelfMessage;
                    return (
                      <article 
                        key={msg.message_ID} 
                        className={`${styles.chatBubble} ${
                          isSelfMessage
                            ? styles.receivedMessage
                            : isSent
                              ? styles.sentMessage
                              : styles.receivedMessage
                        }`}
                      >
                        <header className={styles.messageContent}>
                          <p className={styles.senderName}>
                            {'You'}
                          </p>
                          {msg.subject && (
                            <h4 className={styles.messageSubject}>{msg.subject}</h4>
                          )}
                          {msg.project_title && (
                            <aside className={styles.projectLink}>
                              Project: {msg.project_title}
                            </aside>
                          )}
                        </header>
                        <section>
                          <p>{msg.body}</p>
                          {Array.isArray(msg.attachments) && msg.attachments.filter(
                            (attachment: Attachment) =>
                              attachment &&
                              typeof attachment === 'object' &&
                              attachment.attachment_ID &&
                              attachment.file_name
                          ).length > 0 && (
                            <section className={styles.attachments}>
                              {msg.attachments
                                .filter(
                                  (attachment: Attachment) =>
                                    attachment &&
                                    typeof attachment === 'object' &&
                                    attachment.attachment_ID &&
                                    attachment.file_name
                                )
                                .map((attachment: Attachment) => (
                                  <article key={attachment.attachment_ID} className={styles.attachmentItem}>
                                    <button
                                      onClick={() => downloadAttachment(msg.message_ID, attachment.attachment_ID, attachment.file_name ?? 'file')}
                                      className={`${styles.attachmentLink} ${isSelfMessage || !isSent ? styles.receivedAttachmentLink : styles.sentAttachmentLink}`}
                                    >
                                      {attachment.file_name ?? 'file'}
                                    </button>
                                  </article>
                                ))}
                            </section>
                          )}
                        </section>
                        <footer>
                          <time className={styles.messageTime}>
                            {new Date(msg.sent_at).toLocaleString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </time>
                        </footer>
                      </article>
                    );
                  });
                })()}
              </nav>

              <form className={styles.messageForm} onSubmit={sendMessage}>
                <textarea
                  className={styles.messageBox}
                  placeholder="Type a message..."
                  value={newMessage.body}
                  onChange={(e) =>
                    setNewMessage({
                      ...newMessage,
                      body: e.target.value,
                      receiver_ID: selectedUser,
                    })
                  }
                  required
                />
                <section className={styles.buttonGroup}>
                  <button type="submit">Send</button>
                </section>
              </form>
            </section>
          )}
        </section>
      </section>

      {showCompose && (
        <ComposeMessage onClose={() => setShowCompose(false)} />
      )}
    </main>
  );
};
export default Page;
