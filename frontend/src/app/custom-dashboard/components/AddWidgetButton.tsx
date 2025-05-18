'use client';

import { useState } from 'react';
import styles from '../page.module.css';

interface AddWidgetButtonProps {
    onAddWidget: (type: 'projects' | 'milestones' | 'funding') => void;
}

export default function AddWidgetButton({ onAddWidget }: AddWidgetButtonProps) {
    const [isOpen, setIsOpen] = useState(false);

    const widgetTypes = [
        { type: 'projects', label: 'My Projects' },
        { type: 'milestones', label: 'Milestones' },
        { type: 'funding', label: 'Funding' }
    ] as const;

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

    const toggleDropdown = () => {
        console.log('AddWidgetButton: Toggling dropdown, current state:', isOpen);
        setIsOpen(!isOpen);
    };

    return (
        <section className={styles.addWidgetContainer}>
            <button
                className={styles.addWidgetButton}
                onClick={toggleDropdown}
            >
                Add Widget
            </button>
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