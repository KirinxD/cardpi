"use client";

/**
 * Botón que descarga un JSON. Vive en un Client Component porque las Server
 * Components no pueden recibir handlers de eventos (onClick, onSubmit...).
 */
export default function ExportJsonButton({
  data,
  filename,
  label = "EXPORTAR JSON",
  className = "pixel-button",
}: {
  data: unknown;
  filename: string;
  label?: string;
  className?: string;
}) {
  const handleExport = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button type="button" onClick={handleExport} className={className}>
      {label}
    </button>
  );
}
