"use client";

import React, { useState, useRef } from 'react';
import styles from '../page.module.css';

interface User {
  user_ID: number;
  sname: string;
  fname: string;
}

interface Project {
  project_ID: number;
  title: string;
  owner_fname: string;
  owner_sname: string;
}

interface ComposeMessageProps {
  onClose: () => void;
}

const ComposeMessage: React.FC<ComposeMessageProps> = ({ onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserResults, setShowUserResults] = useState(false);
  const [projectQuery, setProjectQuery] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showProjectResults, setShowProjectResults] = useState(false);
  const [message, setMessage] = useState({
    subject: '',
    body: '',
  });
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const userInputRef = useRef<HTMLInputElement>(null);
  const projectInputRef = useRef<HTMLInputElement>(null);

  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setUsers([]);
      return;
    }
    try {
      const token = localStorage.getItem('jwt');
      const response = await fetch(`http://localhost:5000/api/messages/search-users?query=${query}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      console.log('User search results:', data);
      setUsers(data);
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  const searchProjects = async (query: string) => {
    if (query.length < 2) {
      setProjects([]);
      return;
    }
    try {
      const token = localStorage.getItem('jwt');
      const response = await fetch(`http://localhost:5000/api/messages/search-projects?query=${query}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      console.log('Project search results:', data);
      setProjects(data);
    } catch (error) {
      console.error('Error searching projects:', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selectedFiles = Array.from(e.target.files);
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
      'application/xml',
      'text/xml',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/bmp',
      'image/webp',
      'image/svg+xml',
      'image/tiff',
      'image/x-icon',
      'image/heic',
      'image/heif',
    ];
    const maxSize = 50 * 1024 * 1024; // 50MB
    const validFiles = selectedFiles.filter(file => {
      if (!allowedTypes.includes(file.type)) {
        alert(`File ${file.name} is not an allowed type. Allowed types: PDF, DOCX, XML, and images.`);
        return false;
      }
      if (file.size > maxSize) {
        alert(`File ${file.name} is too large. Maximum size is 50MB.`);
        return false;
      }
      return true;
    });
    if (attachments.length + validFiles.length > 5) {
      alert('You can attach up to 5 files.');
      return;
    }
    setAttachments([...attachments, ...validFiles]);
  };

  const handleUserInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setShowUserResults(true);
    setSelectedUser(null);
    searchUsers(e.target.value);
  };

  const handleUserInputFocus = () => {
    if (users.length > 0) setShowUserResults(true);
  };

  const handleUserInputBlur = () => {
    setTimeout(() => setShowUserResults(false), 150); // allow click event to register
  };

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    setSearchQuery(user.fname + ' ' + user.sname);
    setShowUserResults(false);
    setUsers([]);
  };

  const handleProjectInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProjectQuery(e.target.value);
    setShowProjectResults(true);
    setSelectedProject(null);
    searchProjects(e.target.value);
  };

  const handleProjectInputFocus = () => {
    if (projects.length > 0) setShowProjectResults(true);
  };

  const handleProjectInputBlur = () => {
    setTimeout(() => setShowProjectResults(false), 150);
  };

  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project);
    setProjectQuery(project.title);
    setShowProjectResults(false);
    setProjects([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) {
      alert('Please select a recipient');
      return;
    }

    try {
      const token = localStorage.getItem('jwt');
      const formData = new FormData();
      formData.append('receiver_ID', selectedUser.user_ID.toString());
      formData.append('subject', message.subject);
      formData.append('body', message.body);
      if (selectedProject) {
        formData.append('project_ID', selectedProject.project_ID.toString());
      }
      attachments.forEach(file => {
        formData.append('attachments', file);
      });

      const response = await fetch('http://localhost:5000/api/messages', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        alert('Message sent successfully!');
        onClose();
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    }
  };

  return (
    <dialog className={styles.composeModal} open>
      <article className={styles.composeContent}>
        <header>
          <h2>Compose Message</h2>
        </header>
        <form onSubmit={handleSubmit}>
          <fieldset className={styles.formGroup}>
            <legend>Recipient</legend>
            <section className={styles.searchContainer}>
              <input
                type="text"
                value={searchQuery}
                onChange={handleUserInputChange}
                onFocus={handleUserInputFocus}
                onBlur={handleUserInputBlur}
                placeholder="Search users..."
                autoComplete="off"
                ref={userInputRef}
              />
              {showUserResults && searchQuery.length >= 2 && users.length === 0 && (
                <p className={styles.noResults}>No results found</p>
              )}
              {showUserResults && users.length > 0 && (
                <ul className={styles.searchResultsList}>
                  {users.map((user) => (
                    <li
                      key={user.user_ID}
                      className={selectedUser?.user_ID === user.user_ID ? styles.selectedResult : ''}
                    >
                      <button
                        type="button"
                        className={styles.resultButton}
                        onClick={() => handleUserSelect(user)}
                      >
                        {user.fname} {user.sname}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {selectedUser && (
                <mark className={styles.selectedDisplay}>
                  Selected: {selectedUser.fname} {selectedUser.sname}
                </mark>
              )}
            </section>
          </fieldset>

          <fieldset className={styles.formGroup}>
            <legend>Project (optional)</legend>
            <section className={styles.searchContainer}>
              <input
                type="text"
                value={projectQuery}
                onChange={handleProjectInputChange}
                onFocus={handleProjectInputFocus}
                onBlur={handleProjectInputBlur}
                placeholder="Search projects..."
                autoComplete="off"
                ref={projectInputRef}
              />
              {showProjectResults && projectQuery.length >= 2 && projects.length === 0 && (
                <p className={styles.noResults}>No results found</p>
              )}
              {showProjectResults && projects.length > 0 && (
                <ul className={styles.searchResultsList}>
                  {projects.map((project) => (
                    <li
                      key={project.project_ID}
                      className={selectedProject?.project_ID === project.project_ID ? styles.selectedResult : ''}
                    >
                      <button
                        type="button"
                        className={styles.resultButton}
                        onClick={() => handleProjectSelect(project)}
                      >
                        {project.title} <em className={styles.projectOwner}>by {project.owner_fname} {project.owner_sname}</em>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {selectedProject && (
                <mark className={styles.selectedDisplay}>
                  Linked: {selectedProject.title}
                </mark>
              )}
            </section>
          </fieldset>

          <fieldset className={styles.formGroup}>
            <legend>Subject</legend>
            <input
              type="text"
              value={message.subject}
              onChange={(e) => setMessage({ ...message, subject: e.target.value })}
              required
            />
          </fieldset>

          <fieldset className={styles.formGroup}>
            <legend>Message</legend>
            <textarea
              value={message.body}
              onChange={(e) => setMessage({ ...message, body: e.target.value })}
              required
            />
          </fieldset>

          <fieldset className={styles.formGroup}>
            <legend>Attachments</legend>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
              accept=".pdf, .docx, .xml, .jpg, .jpeg, .png, .gif, .bmp, .webp, .svg+xml, .tiff, .x-icon, .heic, .heif"
            />
            {attachments.length > 0 && (
              <ul className={styles.attachmentList}>
                {attachments.map((file, index) => (
                  <li key={index}>{file.name}</li>
                ))}
              </ul>
            )}
          </fieldset>

          <section className={styles.buttonGroup}>
            <button type="submit">Send</button>
            <button type="button" onClick={onClose}>Cancel</button>
          </section>
        </form>
      </article>
    </dialog>
  );
};

export default ComposeMessage; 