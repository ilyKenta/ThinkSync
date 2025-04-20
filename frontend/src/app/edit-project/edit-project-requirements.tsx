"use client";

import EditReqForm from "./editReqForm";
import { useState } from "react";

export default function Page({ projectId, requirements, onClose, onEdit, projectData }: any) {
  // You can get projectId and requirements from props, router, or fetch them here
  const [showForm, setShowForm] = useState(true);

  return (
    <>
      {showForm && (
        <EditReqForm
          projectId={projectId}
          projectData={projectData}
          requirements={requirements}
          onClose={() => {
            setShowForm(false);
            if (onClose) onClose();
          }}
          onEdit={onEdit}
        />
      )}
    </>
  );
}
