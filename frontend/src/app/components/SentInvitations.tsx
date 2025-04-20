import React, { useState, useEffect } from 'react';

interface SentInvitation {
    invitation_ID: string;
    project_ID: string;
    project_title: string;
    recipient_fname: string;
    recipient_sname: string;
    proposed_role: string;
    status: string;
    current_status: string;
    sent_at: string;
}

const SentInvitations: React.FC = () => {
    const [invitations, setInvitations] = useState<SentInvitation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchInvitations = async () => {
        try {
            const token = localStorage.getItem('jwt');
            if (!token) throw new Error('Not authenticated');

            const response = await fetch('https://thinksyncapi.azurewebsites.net/api/collaborations/invitations/sent', {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to fetch sent invitations');
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

    const handleCancel = async (invitationId: string) => {
        try {
            const token = localStorage.getItem('jwt');
            if (!token) throw new Error('Not authenticated');

            const response = await fetch(`https://thinksyncapi.azurewebsites.net/api/collaborations/invitation/${invitationId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ status: 'cancelled' }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to cancel invitation');
            }

            // Update the local state to reflect the cancellation
            setInvitations(prevInvitations =>
                prevInvitations.map(invitation =>
                    invitation.invitation_ID === invitationId
                        ? { ...invitation, current_status: 'cancelled' }
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

    if (loading) return <main>Loading sent invitations...</main>;
    if (error) return <main style={{ color: 'red' }}>{error}</main>;
    if (invitations.length === 0) return <main>No invitations sent.</main>;

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
                                    To: {invitation.recipient_fname} {invitation.recipient_sname}
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
                                    onClick={() => handleCancel(invitation.invitation_ID)}
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
                                    Cancel Invitation
                                </button>
                            </section>
                        )}
                    </article>
                ))}
            </section>
        </main>
    );
};

export default SentInvitations; 