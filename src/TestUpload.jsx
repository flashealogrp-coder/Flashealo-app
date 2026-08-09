import { useState } from "react";

export default function TestUpload() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("Esperando archivo...");

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) return alert("Selecciona una foto primero");
    setStatus("1️⃣ Pidiendo permiso al servidor...");

    try {
      // 1. Pedir la URL a nuestra nueva API
      const resURL = await fetch("/api/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, fileType: file.type }),
      });
      
      const data = await resURL.json();
      if (!data.url) throw new Error("Fallo al obtener el ticket de Cloudflare");

      setStatus("2️⃣ Subiendo gigabytes directo a Cloudflare R2...");

      // 2. Subir directamente el archivo al R2 (usando el método PUT)
      const uploadRes = await fetch(data.url, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (uploadRes.ok) {
        setStatus("✅ ¡Éxito! La foto ya está en la nube.");
      } else {
        throw new Error("Cloudflare rechazó la subida (Revisa el CORS en R2)");
      }
    } catch (error) {
      console.error(error);
      setStatus("❌ Error: " + error.message);
    }
  };

  return (
    <div style={{ padding: "20px", border: "2px dashed #007bff", borderRadius: "10px", margin: "20px 0" }}>
      <h2>Prueba de Subida (Flashealo SPORT)</h2>
      <input type="file" accept="image/*" onChange={handleFileChange} />
      <button 
        onClick={handleUpload} 
        style={{ background: "#007bff", color: "white", padding: "10px", border: "none", borderRadius: "5px", cursor: "pointer", marginLeft: "10px" }}
      >
        Subir Foto
      </button>
      <p style={{ marginTop: "15px", fontWeight: "bold" }}>Estado: {status}</p>
    </div>
  );
}