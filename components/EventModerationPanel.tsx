"use client";

import React, { useState } from "react";
import {
  Loader2,
  CheckCircle,
  Edit2,
  Trash2,
  Download,
  Upload,
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { CldUploadWidget } from "next-cloudinary";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

interface Evento {
  id: number;
  name: string;
  description: string;
  tags: string[];
  location: string;
  price: string;
  date: string;
  link: string;
  poster: string;
}

export default function EventModerationPanel() {
  const [sala, setSala] = useState("deskomunal");
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<Evento>>({});

  const [cleanupToken, setCleanupToken] = useState("");
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [cleanupMessage, setCleanupMessage] = useState<string | null>(null);

  const scrapearSala = async () => {
    setLoading(true);
    setEventos([]);

    try {
      const response = await fetch("/api/scrape-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sala }),
      });
      const data = await response.json();

      if (data.eventos) {
        setEventos(
          data.eventos.map((e: any, idx: number) => ({
            ...e,
            id: idx + 1,
          })),
        );
      } else {
        throw new Error("No se encontraron eventos");
      }
    } catch (error) {
      alert("Error al scrapear: " + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const cambiarPoster = (eventoId: number, nuevoPoster: string) => {
    setEventos((prev) =>
      prev.map((e) => (e.id === eventoId ? { ...e, poster: nuevoPoster } : e)),
    );
  };

  const parseFechaEvento = (fechaStr: string): string | null => {
    try {
      // Formato dd/MM/yyyy HH:mm (con hora)
      const ddMMyyyyHHmmMatch = fechaStr.match(
        /(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/,
      );
      if (ddMMyyyyHHmmMatch) {
        const [, dia, mes, año, hora, minuto] = ddMMyyyyHHmmMatch;
        return `${año}-${mes}-${dia}T${hora}:${minuto}:00`;
      }

      // Formato dd/MM/yyyy (sin hora)
      const ddMMyyyyMatch = fechaStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      if (ddMMyyyyMatch) {
        const [, dia, mes, año] = ddMMyyyyMatch;
        return `${año}-${mes}-${dia}T20:00:00`; // Asumimos 20:00 por defecto
      }

      // Formato catalán: "23 gen." o "24 - 25 gen."
      const mesesCat: { [key: string]: string } = {
        "gen.": "01",
        "febr.": "02",
        març: "03",
        "abr.": "04",
        maig: "05",
        juny: "06",
        "jul.": "07",
        "ag.": "08",
        "set.": "09",
        "oct.": "10",
        "nov.": "11",
        "des.": "12",
      };

      const catMatch = fechaStr.match(/(\d{1,2})\s+(\w+\.?)/);
      if (catMatch) {
        const [, dia, mesStr] = catMatch;
        const mes = mesesCat[mesStr];
        if (mes) {
          const año = "2026"; // Asumimos 2026 por ahora
          return `${año}-${mes}-${dia.padStart(2, "0")}T20:00:00`;
        }
      }

      return null;
    } catch (error) {
      console.error("Error parseando fecha:", error);
      return null;
    }
  };

  const aprobarEvento = async (evento: Evento) => {
    try {
      // Convertir fecha a formato ISO
      const fechaISO = parseFechaEvento(evento.date);

      if (!fechaISO) {
        const confirmar = confirm(
          `No se pudo parsear la fecha "${evento.date}". ¿Quieres aprobar el evento de todas formas? Tendrás que editar la fecha manualmente después.`,
        );
        if (!confirmar) return;
      }

      console.log("Poster:", evento.poster);

      const { error } = await supabase.from("events").insert({
        name: evento.name,
        description: evento.description,
        tags: evento.tags,
        location: evento.location,
        address: null,
        map_link: null,
        price: evento.price,
        date: fechaISO, // Fecha en formato ISO
        link: evento.link,
        poster: evento.poster,
        validated: true,
        completed: false,
        created_by: "scraper@atbcn.com",
      });

      if (error) throw error;

      alert(`✓ Evento "${evento.name}" aprobado y guardado`);
      setEventos((prev) => prev.filter((e) => e.id !== evento.id));
    } catch (error) {
      alert("Error al aprobar: " + (error as Error).message);
    }
  };

  const handleCleanupPastEvents = async () => {
    if (!cleanupToken.trim()) {
      alert(
        "Introduce el token de administrador antes de ejecutar la limpieza.",
      );
      return;
    }

    if (
      !confirm(
        "CONFIRMACIÓN: quieres eliminar todos los eventos pasados (fecha anterior al inicio de hoy) de la base de datos? Esta acción no se puede deshacer.",
      )
    ) {
      return;
    }

    setCleanupLoading(true);
    setCleanupMessage(null);

    try {
      const response = await fetch("/api/admin/cleanup-events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-cleanup-token": cleanupToken.trim(),
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Error en limpieza");
      }

      setCleanupMessage(
        `Limpieza completada: ${result.deleted ?? 0} eventos pasados eliminados`,
      );
    } catch (error) {
      setCleanupMessage("Error limpieza: " + (error as Error).message);
    } finally {
      setCleanupLoading(false);
    }
  };

  const descartarEvento = (id: number) => {
    setEventos((prev) => prev.filter((e) => e.id !== id));
  };

  const editarEvento = (evento: Evento) => {
    setEditingId(evento.id);
    setEditData(evento);
  };

  const guardarEdicion = () => {
    setEventos((prev) =>
      prev.map((e) =>
        e.id === editingId ? ({ ...e, ...editData } as Evento) : e,
      ),
    );
    setEditingId(null);
  };

  const exportarJSON = () => {
    const json = JSON.stringify(eventos, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `eventos-${sala}-${Date.now()}.json`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Panel de Moderación - ATBCN
          </h1>
          <p className="text-gray-400">
            Scrapea eventos, revísalos y apruébalos para publicar
          </p>
        </div>

        {/* Controls */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm text-gray-400 mb-2">
                Selecciona la sala
              </label>
              <select
                value={sala}
                onChange={(e) => setSala(e.target.value)}
                className="w-full bg-gray-900 border border-gray-600 rounded px-4 py-3 text-white focus:outline-none focus:border-purple-500"
              >
                <option value="deskomunal">La Deskomunal</option>
                <option value="vol">Sala VOL</option>
                <option value="upload">Sala Upload</option>
              </select>
            </div>

            <button
              onClick={scrapearSala}
              disabled={loading}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-semibold py-3 px-8 rounded-lg transition-all flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Scrapeando...
                </>
              ) : (
                "🔍 Scrapear Eventos"
              )}
            </button>

            {eventos.length > 0 && (
              <button
                onClick={exportarJSON}
                className="bg-gray-700 hover:bg-gray-600 text-white py-3 px-6 rounded-lg transition-all flex items-center gap-2"
              >
                <Download size={20} />
                Exportar JSON
              </button>
            )}
          </div>

          <div className="bg-red-800/40 border border-red-600 rounded-lg p-4 mt-4">
            <h2 className="text-lg font-semibold text-red-200 mb-2">
              🚨 Limpieza de eventos pasados (solo admin)
            </h2>
            <p className="text-sm text-red-100 mb-3">
              El endpoint elimina eventos con fecha anterior al inicio de hoy.
              Usa el token secreto de ADMIN_CLEANUP_TOKEN.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
              <div className="md:col-span-2">
                <input
                  type="password"
                  value={cleanupToken}
                  onChange={(e) => setCleanupToken(e.target.value)}
                  placeholder="Token administrador"
                  className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-red-400"
                />
              </div>
              <button
                onClick={handleCleanupPastEvents}
                disabled={cleanupLoading}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-all"
              >
                {cleanupLoading ? "Limpiando..." : "Eliminar pasado"}
              </button>
            </div>
            {cleanupMessage && (
              <p className="text-sm text-white mt-2">{cleanupMessage}</p>
            )}
          </div>
        </div>

        {/* Stats */}
        {eventos.length > 0 && (
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 mb-6">
            <p className="text-gray-300">
              📊 <strong>{eventos.length}</strong> eventos encontrados en{" "}
              <strong>{sala}</strong>
            </p>
          </div>
        )}

        {/* Events Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {eventos.map((evento) => (
            <div
              key={evento.id}
              className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden"
            >
              {/* Poster con opción de cambiar */}
              <div className="w-full h-48 bg-gray-900 overflow-hidden relative">
                {evento.poster ? (
                  <img
                    src={evento.poster}
                    alt={evento.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500">
                    Sin poster
                  </div>
                )}

                {/* Botón para cambiar poster */}
                <div className="absolute top-2 right-2">
                  <CldUploadWidget
                    options={{
                      sources: ["local"],
                      clientAllowedFormats: [
                        "jpg",
                        "png",
                        "gif",
                        "bmp",
                        "svg",
                        "webp",
                      ],
                    }}
                    uploadPreset="atbcnposter"
                    onSuccess={(result) => {
                      if (
                        typeof result?.info === "object" &&
                        result?.info !== null
                      ) {
                        const secureUrl = (result.info as any).secure_url;
                        cambiarPoster(evento.id, secureUrl);
                      }
                    }}
                  >
                    {({ open }) => (
                      <button
                        onClick={() => open()}
                        className="bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-lg flex items-center gap-1 text-xs font-semibold shadow-lg"
                        title="Cambiar poster"
                      >
                        <Upload size={14} />
                        Cambiar
                      </button>
                    )}
                  </CldUploadWidget>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                {editingId === evento.id ? (
                  // Modo edición
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">
                        Título *
                      </label>
                      <input
                        value={editData.name}
                        onChange={(e) =>
                          setEditData({ ...editData, name: e.target.value })
                        }
                        className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white"
                        placeholder="Nombre del evento"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-gray-400 mb-1">
                        Descripción * ({editData.description?.length || 0}/150)
                      </label>
                      <textarea
                        value={editData.description}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            description: e.target.value,
                          })
                        }
                        maxLength={150}
                        className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm resize-none"
                        rows={3}
                        placeholder="Descripción concisa del evento (máx 150 caracteres)"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-gray-400 mb-1">
                        Tags (sin #)
                      </label>
                      <input
                        value={editData.tags?.join(", ")}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            tags: e.target.value
                              .split(",")
                              .map((t) => t.trim()),
                          })
                        }
                        className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                        placeholder="indie, rock, punk (separados por comas)"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">
                          Fecha *
                        </label>
                        <input
                          type="text"
                          value={editData.date}
                          onChange={(e) =>
                            setEditData({ ...editData, date: e.target.value })
                          }
                          className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                          placeholder="dd/mm/yyyy HH:mm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">
                          Precio
                        </label>
                        <input
                          type="text"
                          value={editData.price}
                          onChange={(e) =>
                            setEditData({ ...editData, price: e.target.value })
                          }
                          className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                          placeholder="10€ o 10/12€"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={guardarEdicion}
                        className="flex-1 bg-green-600 hover:bg-green-700 py-2 rounded font-semibold"
                      >
                        Guardar
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="flex-1 bg-gray-600 hover:bg-gray-700 py-2 rounded"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h3 className="text-xl font-bold mb-2 text-white">
                      {evento.name}
                    </h3>

                    {/* Descripción con indicador si está vacía */}
                    <p
                      className={`text-sm mb-4 ${evento.description ? "text-gray-300" : "text-yellow-400 italic"}`}
                    >
                      {evento.description ||
                        "⚠️ Sin descripción - editar para añadir"}
                    </p>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {evento.tags?.map((tag, i) => (
                        <span
                          key={i}
                          className="bg-purple-600/30 text-purple-300 px-3 py-1 rounded-full text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                      <div>
                        <span className="text-gray-400">📍 </span>
                        <span className="text-gray-300">{evento.location}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">📅 </span>
                        <span
                          className={
                            evento.date ? "text-gray-300" : "text-yellow-400"
                          }
                        >
                          {evento.date || "⚠️ Sin fecha"}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">💰 </span>
                        <span
                          className={
                            evento.price ? "text-gray-300" : "text-gray-500"
                          }
                        >
                          {evento.price || "Sin precio"}
                        </span>
                      </div>
                      {evento.link && (
                        <div className="col-span-2">
                          <a
                            href={evento.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-400 hover:text-purple-300 text-xs truncate block"
                          >
                            🔗 {evento.link}
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-4 border-t border-gray-700">
                      <button
                        onClick={() => aprobarEvento(evento)}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded flex items-center justify-center gap-2 transition-colors"
                      >
                        <CheckCircle size={18} />
                        Aprobar
                      </button>
                      <button
                        onClick={() => editarEvento(evento)}
                        className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded flex items-center gap-2 transition-colors"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => descartarEvento(evento.id)}
                        className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded flex items-center gap-2 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {!loading && eventos.length === 0 && (
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-12 text-center">
            <p className="text-gray-400 text-lg mb-2">
              👆 Selecciona una sala y scrapea para empezar
            </p>
            <p className="text-gray-500 text-sm">
              Los eventos aparecerán aquí para que los revises y apruebes
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
