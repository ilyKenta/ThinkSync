'use client';

import { useState } from 'react';
import styles from '../page.module.css';

// Props interface for the AddWidgetButton component
interface AddWidgetButtonProps {
    onAddWidget: (type: 'projects' | 'milestones' | 'funding') => void;
}

// AddWidgetButton component that provides a dropdown menu for adding new widgets
export default function AddWidgetButton({ onAddWidget }: AddWidgetButtonProps) {
    // State to control dropdown visibility
    const [isOpen, setIsOpen] = useState(false);

    // Define available widget types and their display labels
    const widgetTypes = [
        { type: 'projects', label: 'My Projects' },
        { type: 'milestones', label: 'Milestones' },
        { type: 'funding', label: 'Funding' }
    ] as const;

    // Handle widget addition
    const handleAddWidget = (type: 'projects' | 'milestones' | 'funding') => {
        console.log('AddWidgetButton: handleAddWidget called with type:', type);
        try {
            onAddWidget(type);
            console.log('AddWidgetButton: onAddWidget callback completed');
        } catch (error) {
            console.error('AddWidgetButton: Error in onAddWidget callback:', error);
        }
        setIsOpen(false);
    };

    // Toggle dropdown visibility
    const toggleDropdown = () => {
        console.log('AddWidgetButton: Toggling dropdown, current state:', isOpen);
        setIsOpen(!isOpen);
    };

    return (
        <section className={styles.addWidgetContainer}>
            {/* Main button to open dropdown */}
            <button
                className={styles.addWidgetButton}
                onClick={toggleDropdown}
            >
                Add Widget
            </button>
            {/* Dropdown menu with widget options */}
            {isOpen && (
                <section className={styles.widgetDropdown}>
                    {widgetTypes.map(({ type, label }) => (
                        <button
                            key={type}
                            className={styles.widgetOption}
                            onClick={() => handleAddWidget(type)}
                        >
                            {label}
                        </button>
                    ))}
                </section>
            )}
        </section>
    );
} 