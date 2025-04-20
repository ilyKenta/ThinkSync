"use client";
import CreateForm from "./createForm";

export default function Page() {
  const handleClose = () => {
    console.log("Modal closed");
  };

  return (
    <CreateForm
      onClose={handleClose}
      onCreate={(projectName: string) => {
        console.log("Create project:", projectName);
      }}
    />
  );
}
