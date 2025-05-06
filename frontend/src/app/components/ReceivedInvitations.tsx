import React, { useState, useEffect } from 'react';

interface Invitation {
    invitation_ID: string;
    project_ID: string;
    project_title: string;
    sender_fname: string;
    sender_sname: string;
    proposed_role: string;
    status: string;
    current_status: string;
    sent_at: string;
}

const ReceivedInvitations: React.FC = () => {
    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchInvitations = async () => {
        try {
            const token = localStorage.getItem('jwt');
            if (!token) throw new Error('Not authenticated');

            const response = await fetch(`${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/collaborations/invitations/received`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to fetch invitations');
            }

            const data = await response.json();
            setInvitations(data.invitations);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInvitations();
    }, []);

    const handleResponse = async (invitationId: string, status: 'accepted' | 'declined') => {
        try {
            const token = localStorage.getItem('jwt');
            if (!token) throw new Error('Not authenticated');

            const response = await fetch(`${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/collaborations/invitation/${invitationId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ status }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || `Failed to ${status} invitation`);
            }

            // Update the local state to reflect the response
            setInvitations(prevInvitations =>
                prevInvitations.map(invitation =>
                    invitation.invitation_ID === invitationId
                        ? { ...invitation, current_status: status }
                        : invitation
                )
            );
        } catch (err: any) {
            setError(err.message);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'accepted':
                return '#4CAF50';
            case 'declined':
                return '#f44336';
            case 'cancelled':
                return '#9e9e9e';
            case 'expired':
                return '#ff9800';
            default:
                return '#2196F3';
        }
    };

    if (loading) return <main>Loading invitations...</main>;
    if (error) return <main style={{ color: 'red' }}>{error}</main>;
    if (invitations.length === 0) return <main>No invitations received.</main>;

    return (
        <main className="invitations-container">
            <section className="invitations-list">
                {invitations.map((invitation) => (
                    <article
                        key={invitation.invitation_ID}
                        className="invitation-card"
                        style={{
                            border: '1px solid #eee',
                            borderRadius: '8px',
                            padding: '12px',
                            marginBottom: '10px',
                            backgroundColor: '#fff',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                        }}
                    >
                        <section style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'flex-start',
                            marginBottom: '8px'
                        }}>
                            <section style={{ flex: 1 }}>
                                <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem' }}>{invitation.project_title}</h4>
                                <p style={{ fontSize: '0.9rem', color: '#666' }}>
                                    From: {invitation.sender_fname} {invitation.sender_sname}
                                </p>
                            </section>
                            <p style={{
                                padding: '3px 6px',
                                borderRadius: '4px',
                                backgroundColor: getStatusColor(invitation.current_status),
                                color: 'white',
                                fontSize: '0.8rem',
                                marginLeft: '8px'
                            }}>
                                {invitation.current_status.charAt(0).toUpperCase() + invitation.current_status.slice(1)}
                            </p>
                        </section>
                        <section style={{ 
                            fontSize: '0.8rem', 
                            color: '#888',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <p>{invitation.proposed_role}</p>
                            <time>{formatDate(invitation.sent_at)}</time>
                        </section>
                        {invitation.current_status.toLowerCase() === 'pending' && (
                            <section style={{ 
                                marginTop: '8px', 
                                display: 'flex', 
                                justifyContent: 'flex-end',
                                gap: '8px'
                            }}>
                                <button
                                    onClick={() => handleResponse(invitation.invitation_ID, 'accepted')}
                                    style={{
                                        backgroundColor: '#4CAF50',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        padding: '4px 8px',
                                        fontSize: '0.8rem',
                                        cursor: 'pointer',
                                        transition: 'background-color 0.2s'
                                    }}
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.backgroundColor = '#388E3C';
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.backgroundColor = '#4CAF50';
                                    }}
                                >
                                    Accept
                                </button>
                                <button
                                    onClick={() => handleResponse(invitation.invitation_ID, 'declined')}
                                    style={{
                                        backgroundColor: '#f44336',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        padding: '4px 8px',
                                        fontSize: '0.8rem',
                                        cursor: 'pointer',
                                        transition: 'background-color 0.2s'
                                    }}
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.backgroundColor = '#d32f2f';
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.backgroundColor = '#f44336';
                                    }}
                                >
                                    Decline
                                </button>
                            </section>
                        )}
                    </article>
                ))}
            </section>
            <style jsx>{`
                .invitations-container {
                    height: 100%;
                    overflow: hidden;
                }
                .invitations-list {
                    height: 100%;
                    overflow-y: auto;
                    padding: 10px;
                }
                .invitation-card {
                    transition: transform 0.2s;
                }
                .invitation-card:hover {
                    transform: translateY(-2px);
                }
            `}</style>
        </main>
    );
};

export default ReceivedInvitations; 