"use client";

import React, { useEffect, useState, useRef } from "react";
import styles from "../page.module.css";
import { useRouter } from "next/navigation";
import ComposeMessage from '../components/ComposeMessage';

interface Attachment {
  attachment_ID: number;
  message_ID?: number;
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
  const [showCompose, setShowCompose] = useState(false);
  
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

  useEffect(() => {
    fetchMessages();
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
      await fetchMessages();
    } else {
      alert("Failed to send message.");
    }
  };

  const groupedConversations: { [key: string]: Message[] } = {};
  messages.forEach((msg) => {
    const conversationKey = [String(msg.sender_ID), String(msg.receiver_ID)]
      .sort()
      .join('|');
    if (!groupedConversations[conversationKey]) {
      groupedConversations[conversationKey] = [];
    }
    groupedConversations[conversationKey].push(msg);
  });

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

  const handleSelectUser = async (otherUserId: string) => {
    setSelectedUser(otherUserId);
    const token = localStorage.getItem('jwt');
    await fetch('http://localhost:5000/api/messages/mark-read', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ senderId: otherUserId }),
    });
    await fetchMessages();
  };

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
                router.push("/review-dash");
              }}
              className={activeTab === "my" ? styles.active : ""}
            >
              Assigned proposals
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => {
                setActiveTab("messager");
                router.push("/messager/RevMessage");
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
          <h2>Reviewer Messages</h2>
        </header>

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
              {conversationPreviews.map(({ key, latestMsg, otherUser }) => {
                const currentUserId = localStorage.getItem('user_ID');
                const conversationMsgs = groupedConversations[key] || [];
                const hasUnread = conversationMsgs.some(
                  msg => !msg.is_read && String(msg.receiver_ID) === String(currentUserId)
                );
                return (
                  <article
                    key={key}
                    className={styles.previewItem}
                    onClick={() => handleSelectUser(otherUser.id)}
                  >
                    <section className={styles.previewContent}>
                      <strong className={styles.previewName}>
                        {otherUser.fname} {otherUser.sname}
                        {hasUnread && (
                          <span
                            style={{
                              display: 'inline-block',
                              marginLeft: 8,
                              width: 10,
                              height: 10,
                              borderRadius: '50%',
                              background: 'red',
                              verticalAlign: 'middle'
                            }}
                            aria-label="unread messages"
                          />
                        )}
                      </strong>
                      <p className={styles.previewText}>
                        {latestMsg.body.slice(0, 30)}...
                      </p>
                    </section>
                  </article>
                );
              })}
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
                            {String(msg.sender_ID) === String(currentUserId) ? 'You' : msg.sender_fname}
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
