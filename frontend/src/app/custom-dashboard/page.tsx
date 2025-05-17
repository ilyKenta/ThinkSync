'use client';

import { useState, useEffect } from 'react';
import styles from './page.module.css';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { ProjectsWidget, MilestonesWidget, FundingWidget } from './widgets';
import AddWidgetButton from './components/AddWidgetButton';
import { useRouter, usePathname } from 'next/navigation';

interface Widget {
    widget_ID: number;
    widget_type: 'projects' | 'milestones' | 'funding';
    position_x: number;
    position_y: number;
    width: number;
    height: number;
}

interface DraggableWidgetProps {
    widget: Widget;
    index: number;
    moveWidget: (dragIndex: number, hoverIndex: number) => void;
    renderWidget: (widget: Widget) => React.ReactNode;
}

const DraggableWidget = ({ widget, index, moveWidget, renderWidget }: DraggableWidgetProps) => {
    const [{ isDragging }, drag] = useDrag({
        type: 'WIDGET',
        item: { index },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    });

    const [, drop] = useDrop({
        accept: 'WIDGET',
        hover: (item: { index: number }) => {
            if (item.index !== index) {
                moveWidget(item.index, index);
                item.index = index;
            }
        },
    });

    const ref = (node: HTMLDivElement | null) => {
        drag(drop(node));
    };

    return (
        <article
            ref={ref}
            className={`${styles.widgetWrapper} ${isDragging ? styles.dragging : ''}`}
            style={{ opacity: isDragging ? 0.5 : 1 }}
        >
            {renderWidget(widget)}
        </article>
    );
};

export default function CustomDashboard() {
    const router = useRouter();
    const pathname = usePathname();
    const [widgets, setWidgets] = useState<Widget[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        console.log('CustomDashboard: Component mounted');
        fetchWidgets();
        fetchUnreadCount();
    }, []);

    const fetchUnreadCount = async () => {
        const token = localStorage.getItem('jwt');
        if (!token) return;
        const res = await fetch(`${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/messages/unread`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
            const data = await res.json();
            setUnreadCount(Array.isArray(data) ? data.length : 0);
        }
    };

    const fetchWidgets = async () => {
        try {
            const token = localStorage.getItem('jwt');
            const response = await fetch(`${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/dashboard/widgets`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) {
                throw new Error(`Failed to fetch widgets: ${response.status}`);
            }
            const data = await response.json();
            setWidgets(data.widgets || []);
        } catch (error) {
            console.error('CustomDashboard: Error fetching widgets:', error);
            setWidgets([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddWidget = async (type: Widget['widget_type']) => {
        try {
            const token = localStorage.getItem('jwt');
            const response = await fetch(`${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/dashboard/widgets`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    widget_type: type,
                    position_x: 0,
                    position_y: widgets.length,
                    width: 1,
                    height: 1
                })
            });
            if (!response.ok) {
                const errorData = await response.json();
                console.error('CustomDashboard: Failed to add widget:', errorData);
                throw new Error('Failed to add widget');
            }
            await fetchWidgets();
        } catch (error) {
            console.error('CustomDashboard: Error adding widget:', error);
        }
    };

    const handleDeleteWidget = async (widgetId: number) => {
        try {
            const token = localStorage.getItem('jwt');
            const response = await fetch(`${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/dashboard/widgets/${widgetId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) throw new Error('Failed to delete widget');
            await fetchWidgets();
        } catch (error) {
            console.error('Error deleting widget:', error);
        }
    };

    const moveWidget = async (dragIndex: number, hoverIndex: number) => {
        const draggedWidget = widgets[dragIndex];
        const newWidgets = [...widgets];
        newWidgets.splice(dragIndex, 1);
        newWidgets.splice(hoverIndex, 0, draggedWidget);
        setWidgets(newWidgets);

        // Update positions in the database
        try {
            const token = localStorage.getItem('jwt');
            const response = await fetch(`${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/dashboard/widgets/${draggedWidget.widget_ID}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    position_x: draggedWidget.position_x,
                    position_y: hoverIndex,
                    width: draggedWidget.width,
                    height: draggedWidget.height
                })
            });

            if (!response.ok) {
                throw new Error('Failed to update widget position');
            }
        } catch (error) {
            console.error('Error updating widget position:', error);
            // Revert the local state if the update fails
            setWidgets(widgets);
        }
    };

    const renderWidget = (widget: Widget) => {
        switch (widget.widget_type) {
            case 'projects':
                return <ProjectsWidget onDelete={() => handleDeleteWidget(widget.widget_ID)} />;
            case 'milestones':
                return <MilestonesWidget onDelete={() => handleDeleteWidget(widget.widget_ID)} />;
            case 'funding':
                return <FundingWidget onDelete={() => handleDeleteWidget(widget.widget_ID)} />;
            default:
                return null;
        }
    };

    if (isLoading) {
        return <main className={styles.loading}>Loading widgets...</main>;
    }

    return (
        <DndProvider backend={HTML5Backend}>
            <main className={styles.container}>
                <nav className={styles.sidebar}>
                    <h2>ThinkSync</h2>
                    <h3>DASHBOARD</h3>

                    <ul>
                        <li>
                            <button
                                type="button"
                                onClick={() => router.push("/researcher-dashboard")}
                                className={pathname === "/researcher-dashboard" ? styles.activeTab : ""}
                            >
                                My Projects
                            </button>
                        </li>
                        <li>
                            <button
                                type="button"
                                onClick={() => router.push("/Shared_projects")}
                                className={pathname === "/Shared_projects" ? styles.activeTab : ""}
                            >
                                Shared Projects
                            </button>
                        </li>
                        <li>
                            <button
                                type="button"
                                onClick={() => router.push("/custom-dashboard")}
                                className={pathname === "/custom-dashboard" ? styles.activeTab : ""}
                            >
                                Custom Dashboard
                            </button>
                        </li>
                        <li>
                            <button
                                type="button"
                                onClick={() => router.push("/messager")}
                                className={pathname === "/messager" ? styles.activeTab : ""}
                            >
                                Messager
                                {unreadCount > 0 && (
                                    <mark
                                        style={{
                                            display: "inline-block",
                                            marginLeft: 8,
                                            minWidth: 20,
                                            height: 20,
                                            borderRadius: "50%",
                                            background: "red",
                                            color: "white",
                                            fontWeight: 600,
                                            fontSize: 12,
                                            textAlign: "center",
                                            lineHeight: "20px",
                                            padding: "0 6px",
                                            verticalAlign: "middle",
                                        }}
                                    >
                                        {unreadCount > 99 ? "99+" : unreadCount}
                                    </mark>
                                )}
                            </button>
                        </li>
                        <li>
                            <button
                                type="button"
                                onClick={() => router.push("/milestones")}
                                className={pathname === "/milestones" ? styles.activeTab : ""}
                            >
                                Milestones
                            </button>
                        </li>
                        <li>
                            <button
                                type="button"
                                onClick={() => router.push("/funding-dashboard")}
                                className={pathname === "/funding-dashboard" ? styles.activeTab : ""}
                            >
                                Funding
                            </button>
                        </li>
                    </ul>
                </nav>

                <section className={styles.mainContent}>
                    <header className={styles.header}>
                        <h1>Custom Dashboard</h1>
                        <AddWidgetButton onAddWidget={handleAddWidget} />
                    </header>
                    <section className={styles.widgetList}>
                        {widgets.map((widget, index) => (
                            <DraggableWidget
                                key={widget.widget_ID}
                                widget={widget}
                                index={index}
                                moveWidget={moveWidget}
                                renderWidget={renderWidget}
                            />
                        ))}
                    </section>
                </section>
            </main>
        </DndProvider>
    );
} 